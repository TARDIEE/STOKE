import { batch, q, q1, run } from "./db";
import { uid } from "./util";

export interface ScheduleItem {
  id: string;
  day: string;
  kind: "learn" | "review" | "revision";
  chapterId: string;
  subjectId: string;
  title: string;
  status: "open" | "done";
  completedAt: number | null;
}

export function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dayStr(ts: number) {
  return dayKey(ts);
}

export function addDays(day: string, n: number) {
  const d = new Date(day + "T12:00:00");
  d.setDate(d.getDate() + n);
  return dayStr(d.getTime());
}

export function daysLeft(examDate: number, now: number) {
  return Math.max(0, Math.ceil((examDate - now) / 86400000));
}

function toItem(r: Record<string, unknown>): ScheduleItem {
  return {
    id: String(r.id), day: String(r.day), kind: (r.kind === "review" || r.kind === "revision" ? r.kind : "learn") as ScheduleItem["kind"],
    chapterId: String(r.chapter_id || ""), subjectId: String(r.subject_id || ""),
    title: String(r.title), status: r.status as "open" | "done",
    completedAt: (r.completed_at as number | null) ?? null,
  };
}

/**
 * Spread the student's chapters across the days left until the exam.
 *
 * A real study day covers ~3 DIFFERENT subjects (hardest first), not one chapter:
 *  - First pass: up to 3 new chapters per day, each from a different subject,
 *    highest-weight (highest-yield) chapters first.
 *  - Spaced reviews: every learned chapter automatically returns after
 *    +1, +4, +11 and +25 days (expanding intervals — the core of spaced
 *    repetition), capped at 4 items per day.
 *  - The final stretch (up to 7 days) is reserved for full revision + mocks.
 */
export async function generateSchedule(userId: string, now: number): Promise<ScheduleItem[]> {
  const user = await q1<{ exam_date: number }>("SELECT exam_date FROM users WHERE id = ?", userId);
  const left = daysLeft(Number(user?.exam_date) || 0, now);
  if (!left) return [];

  const PER_DAY_TARGET = 3;
  const PER_DAY_MAX = 4;
  const REVIEW_OFFSETS = [1, 4, 11, 25];

  await run("DELETE FROM schedule WHERE user_id = ?", userId);
  const chapters = await q(
    `SELECT ch.*, s.created_at AS sub_created FROM chapters ch LEFT JOIN subjects s ON s.id = ch.subject_id
     WHERE ch.user_id = ? ORDER BY s.created_at, ch.ord`,
    userId
  );
  const subjects = await q("SELECT * FROM subjects WHERE user_id = ? ORDER BY created_at", userId);
  const subName = new Map(subjects.map((s) => [String(s.id), String(s.name)]));
  if (!chapters.length) return [];

  const revisionDays = Math.min(7, Math.max(1, Math.floor(left * 0.15)));
  const learnDays = Math.max(1, left - revisionDays);
  const today = dayStr(now);

  // Queue chapters per subject, highest weight first (hard subjects first).
  const queues = new Map<string, Record<string, unknown>[]>();
  for (const c of chapters) {
    const sid = String(c.subject_id);
    if (!queues.has(sid)) queues.set(sid, []);
    queues.get(sid)!.push(c);
  }
  for (const qq of queues.values()) qq.sort((a, b) => Number(b.weight ?? 3) - Number(a.weight ?? 3));

  type Placed = { kind: "learn" | "review"; chapterId: string; subjectId: string; title: string };
  const days: Placed[][] = Array.from({ length: learnDays }, () => []);
  const learnOffset = new Map<string, number>();
  const titleOf = (c: Record<string, unknown>) => {
    const s = subName.get(String(c.subject_id)) ?? "";
    return `Learn: ${s ? s + " · " : ""}${String(c.name)}`;
  };

  // First pass: deal up to 3 chapters/day from distinct subjects, hardest first.
  let remaining = chapters.length;
  for (let d = 0; d < learnDays && remaining > 0; d++) {
    const order = [...queues.entries()]
      .filter(([, qq]) => qq.length > 0)
      .sort((a, b) => Number(b[1][0].weight ?? 3) - Number(a[1][0].weight ?? 3));
    const slots = Math.min(PER_DAY_TARGET, order.length, remaining);
    for (let k = 0; k < slots; k++) {
      const [, qq] = order[k];
      const c = qq.shift()!;
      remaining--;
      days[d].push({ kind: "learn", chapterId: String(c.id), subjectId: String(c.subject_id), title: titleOf(c) });
      if (!learnOffset.has(String(c.id))) learnOffset.set(String(c.id), d);
    }
  }
  // If chapters outnumber the days, pack the overflow onto the last days.
  if (remaining > 0) {
    const flat = [...queues.values()].flat();
    let d = learnDays - 1;
    for (const c of flat) {
      while (d >= 0 && days[d].length >= PER_DAY_MAX) d--;
      if (d < 0) d = learnDays - 1;
      days[d].push({ kind: "learn", chapterId: String(c.id), subjectId: String(c.subject_id), title: titleOf(c) });
      if (!learnOffset.has(String(c.id))) learnOffset.set(String(c.id), d);
    }
  }

  // Spaced reviews: each learned chapter returns at expanding intervals.
  for (const [chapterId, o] of learnOffset) {
    const c = chapters.find((x) => String(x.id) === chapterId)!;
    const s = subName.get(String(c.subject_id)) ?? "";
    for (const off of REVIEW_OFFSETS) {
      const d = o + off;
      if (d >= learnDays) continue;
      if (days[d].length >= PER_DAY_MAX) continue;
      if (days[d].some((x) => x.chapterId === chapterId)) continue;
      days[d].push({
        kind: "review", chapterId, subjectId: String(c.subject_id),
        title: `Review: ${s ? s + " · " : ""}${String(c.name)}`,
      });
    }
  }

  const base = Date.now();
  let i = 0;
  const stmts: { sql: string; args: unknown[] }[] = [];
  days.forEach((items, dayOffset) => {
    for (const p of items) {
      stmts.push({
        sql: "INSERT INTO schedule (id, user_id, day, kind, chapter_id, subject_id, title, status, created_at, completed_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        args: [uid(), userId, addDays(today, dayOffset), p.kind, p.chapterId, p.subjectId, p.title, "open", base + i, null],
      });
      i++;
    }
  });
  for (let r = 0; r < revisionDays; r++) {
    stmts.push({
      sql: "INSERT INTO schedule (id, user_id, day, kind, chapter_id, subject_id, title, status, created_at, completed_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      args: [uid(), userId, addDays(today, learnDays + r), "revision", "", "",
        r === revisionDays - 1 ? "Final revision + mock test" : "Full-course revision + weak areas",
        "open", base + 10000 + r, null],
    });
  }
  await batch(stmts);
  return listSchedule(userId);
}

export async function listSchedule(userId: string): Promise<ScheduleItem[]> {
  return (await q("SELECT * FROM schedule WHERE user_id = ? ORDER BY day, created_at", userId)).map(toItem);
}

/**
 * Push missed (past-due, still open) schedule items forward: they are
 * re-dealt from tomorrow onward, max 4 per day, preserving priority order.
 * Returns the number of items moved.
 */
export async function rescheduleMissed(userId: string, now: number): Promise<number> {
  const today = dayStr(now);
  const missed = await q(
    "SELECT * FROM schedule WHERE user_id = ? AND day < ? AND status = 'open' ORDER BY day, created_at",
    userId, today
  );
  if (!missed.length) return 0;
  const upcoming = await q<{ day: string; n: number }>(
    "SELECT day, COUNT(*) AS n FROM schedule WHERE user_id = ? AND day >= ? AND status = 'open' GROUP BY day",
    userId, today
  );
  const load = new Map(upcoming.map((u) => [u.day, u.n]));
  const stmts: { sql: string; args: unknown[] }[] = [];
  let offset = 1;
  for (const m of missed) {
    // find the next day with fewer than 4 open items (a full 3–4 subject day)
    let guard = 0;
    while ((load.get(addDays(today, offset)) ?? 0) >= 4 && guard < 365) offset++;
    const target = addDays(today, offset);
    stmts.push({ sql: "UPDATE schedule SET day = ? WHERE id = ?", args: [target, String(m.id)] });
    load.set(target, (load.get(target) ?? 0) + 1);
    offset++;
    guard++;
  }
  await batch(stmts);
  return missed.length;
}

/**
 * Move one schedule item to another day. Moving it removes it from its old
 * (far) day — nothing is duplicated. When a LEARN item moves, its spaced
 * review siblings for the same chapter shift by the same number of days so
 * the expanding intervals (+1/+4/+11/+25) stay intact.
 */
export async function moveScheduleItem(userId: string, id: string, targetDay: string): Promise<number> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDay)) return 0;
  const item = await q1("SELECT * FROM schedule WHERE user_id = ? AND id = ?", userId, id);
  if (!item) return 0;
  const fromDay = String(item.day);
  if (fromDay === targetDay) return 0;
  const deltaDays = Math.round((new Date(targetDay + "T12:00:00").getTime() - new Date(fromDay + "T12:00:00").getTime()) / 86400000);
  const stmts: { sql: string; args: unknown[] }[] = [
    { sql: "UPDATE schedule SET day = ? WHERE user_id = ? AND id = ?", args: [targetDay, userId, id] },
  ];
  if (item.kind === "learn" && item.chapter_id) {
    // Shift this chapter's spaced reviews by the same delta, keeping them after the learn day.
    const sibs = await q("SELECT * FROM schedule WHERE user_id = ? AND kind = 'review' AND chapter_id = ? AND id != ?", userId, String(item.chapter_id), id);
    for (const s of sibs) {
      const shifted = addDays(String(s.day), deltaDays);
      stmts.push({ sql: "UPDATE schedule SET day = ? WHERE id = ?", args: [shifted < addDays(targetDay, 1) ? addDays(targetDay, 1) : shifted, String(s.id)] });
    }
  }
  await batch(stmts);
  return 1;
}

export async function missedCount(userId: string, now: number): Promise<number> {
  const row = await q1<{ n: number }>(
    "SELECT COUNT(*) AS n FROM schedule WHERE user_id = ? AND day < ? AND status = 'open'",
    userId, dayStr(now)
  );
  return row?.n ?? 0;
}
