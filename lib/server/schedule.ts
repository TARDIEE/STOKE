import { getDb } from "./db";
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
export function generateSchedule(userId: string, now: number): ScheduleItem[] {
  const db = getDb();
  const user = db.prepare("SELECT exam_date FROM users WHERE id = ?").get(userId) as { exam_date: number };
  const left = daysLeft(Number(user?.exam_date) || 0, now);
  if (!left) return [];

  const PER_DAY_TARGET = 3;
  const PER_DAY_MAX = 4;
  const REVIEW_OFFSETS = [1, 4, 11, 25];

  const t = db.transaction(() => {
    db.prepare("DELETE FROM schedule WHERE user_id = ?").run(userId);
    const chapters = db.prepare(
      `SELECT ch.*, s.created_at AS sub_created FROM chapters ch LEFT JOIN subjects s ON s.id = ch.subject_id
       WHERE ch.user_id = ? ORDER BY s.created_at, ch.ord`
    ).all(userId) as Record<string, unknown>[];
    const subjects = db.prepare("SELECT * FROM subjects WHERE user_id = ? ORDER BY created_at").all(userId) as Record<string, unknown>[];
    const subName = new Map(subjects.map((s) => [String(s.id), String(s.name)]));
    if (!chapters.length) return;

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
    for (const q of queues.values()) q.sort((a, b) => Number(b.weight ?? 3) - Number(a.weight ?? 3));

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
        .filter(([, q]) => q.length > 0)
        .sort((a, b) => Number(b[1][0].weight ?? 3) - Number(a[1][0].weight ?? 3));
      const slots = Math.min(PER_DAY_TARGET, order.length, remaining);
      for (let k = 0; k < slots; k++) {
        const [, q] = order[k];
        const c = q.shift()!;
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

    const ins = db.prepare(
      "INSERT INTO schedule (id, user_id, day, kind, chapter_id, subject_id, title, status, created_at, completed_at) VALUES (?,?,?,?,?,?,?,?,?,?)"
    );
    const base = Date.now();
    let i = 0;
    days.forEach((items, dayOffset) => {
      for (const p of items) {
        ins.run(uid(), userId, addDays(today, dayOffset), p.kind, p.chapterId, p.subjectId, p.title, "open", base + i, null);
        i++;
      }
    });
    for (let r = 0; r < revisionDays; r++) {
      ins.run(uid(), userId, addDays(today, learnDays + r), "revision", "", "",
        r === revisionDays - 1 ? "Final revision + mock test" : "Full-course revision + weak areas",
        "open", base + 10000 + r, null);
    }
  });
  t();
  return listSchedule(userId);
}

export function listSchedule(userId: string): ScheduleItem[] {
  return (getDb().prepare("SELECT * FROM schedule WHERE user_id = ? ORDER BY day, created_at").all(userId) as Record<string, unknown>[]).map(toItem);
}

/**
 * Push missed (past-due, still open) schedule items forward: they are
 * re-dealt from tomorrow onward, max 4 per day, preserving priority order.
 * Returns the number of items moved.
 */
export function rescheduleMissed(userId: string, now: number): number {
  const db = getDb();
  const today = dayStr(now);
  const missed = db.prepare(
    "SELECT * FROM schedule WHERE user_id = ? AND day < ? AND status = 'open' ORDER BY day, created_at"
  ).all(userId, today) as Record<string, unknown>[];
  if (!missed.length) return 0;
  const upcoming = db.prepare(
    "SELECT day, COUNT(*) AS n FROM schedule WHERE user_id = ? AND day >= ? AND status = 'open' GROUP BY day"
  ).all(userId, today) as { day: string; n: number }[];
  const load = new Map(upcoming.map((u) => [u.day, u.n]));
  const upd = db.prepare("UPDATE schedule SET day = ? WHERE id = ?");
  const t = db.transaction(() => {
    let offset = 1;
    for (const m of missed) {
      // find the next day with fewer than 4 open items (a full 3–4 subject day)
      let guard = 0;
      while ((load.get(addDays(today, offset)) ?? 0) >= 4 && guard < 365) offset++;
      const target = addDays(today, offset);
      upd.run(target, String(m.id));
      load.set(target, (load.get(target) ?? 0) + 1);
      offset++;
      guard++;
    }
  });
  t();
  return missed.length;
}

/**
 * Move one schedule item to another day. Moving it removes it from its old
 * (far) day — nothing is duplicated. When a LEARN item moves, its spaced
 * review siblings for the same chapter shift by the same number of days so
 * the expanding intervals (+1/+4/+11/+25) stay intact.
 */
export function moveScheduleItem(userId: string, id: string, targetDay: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDay)) return 0;
  const db = getDb();
  const item = db.prepare("SELECT * FROM schedule WHERE user_id = ? AND id = ?").get(userId, id) as Record<string, unknown> | undefined;
  if (!item) return 0;
  const fromDay = String(item.day);
  if (fromDay === targetDay) return 0;
  const deltaDays = Math.round((new Date(targetDay + "T12:00:00").getTime() - new Date(fromDay + "T12:00:00").getTime()) / 86400000);
  const t = db.transaction(() => {
    db.prepare("UPDATE schedule SET day = ? WHERE user_id = ? AND id = ?").run(targetDay, userId, id);
    if (item.kind === "learn" && item.chapter_id) {
      // Shift this chapter's spaced reviews by the same delta, keeping them after the learn day.
      const sibs = db.prepare(
        "SELECT * FROM schedule WHERE user_id = ? AND kind = 'review' AND chapter_id = ? AND id != ?"
      ).all(userId, String(item.chapter_id), id) as Record<string, unknown>[];
      const upd = db.prepare("UPDATE schedule SET day = ? WHERE id = ?");
      for (const s of sibs) {
        const shifted = addDays(String(s.day), deltaDays);
        upd.run(shifted < addDays(targetDay, 1) ? addDays(targetDay, 1) : shifted, String(s.id));
      }
    }
  });
  t();
  return 1;
}

export function missedCount(userId: string, now: number): number {
  const row = getDb().prepare(
    "SELECT COUNT(*) AS n FROM schedule WHERE user_id = ? AND day < ? AND status = 'open'"
  ).get(userId, dayStr(now)) as { n: number };
  return row.n;
}
