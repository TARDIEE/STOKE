import { batch, q } from "./db";
import { uid } from "./util";
import { listSchedule } from "./schedule";

export type Quadrant = "q1" | "q2" | "q3" | "q4";
export type TaskKind = "review" | "learn" | "preview" | "custom";

export interface PlanItem {
  id: string;
  kind: TaskKind;
  refId: string;
  refSubject: string;
  title: string;
  detail: string;
  note: string;
  quadrant: Quadrant;
  status: "open" | "done";
  source: "auto" | "custom";
  count: number;
  completedAt: number | null;
}

export const QUADRANT_META: Record<Quadrant, { title: string; sub: string }> = {
  q1: { title: "Do now", sub: "Overdue & missed — most important" },
  q2: { title: "Do today", sub: "Due today & new learning" },
  q3: { title: "Quick / soon", sub: "Short relearns & tomorrow's preview" },
  q4: { title: "Later", sub: "Upcoming — stays until due" },
};

export const MAX_PER_QUADRANT = 2;

function dayStr(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function rowToItem(r: Record<string, unknown>): PlanItem {
  return {
    id: String(r.id),
    kind: r.kind as TaskKind,
    refId: String(r.ref_id || ""),
    refSubject: String(r.ref_subject || ""),
    title: String(r.title),
    detail: String(r.detail || ""),
    note: String(r.note || ""),
    quadrant: r.quadrant as Quadrant,
    status: r.status as "open" | "done",
    source: r.source as "auto" | "custom",
    count: Number(r.count || 0),
    completedAt: (r.completed_at as number | null) ?? null,
  };
}

interface Cand {
  kind: TaskKind;
  refId: string;
  refSubject: string;
  title: string;
  detail: string;
  note: string;
  quadrant: Quadrant;
  count: number;
  score: number;
}

/**
 * Build today's to-do list from spaced-repetition state.
 *
 * Priority order (Ebbinghaus forgetting curve + SM-2 retrieval practice):
 *  1. Missed low-priority items from yesterday escalate to Q1 (spacing accountability).
 *  2. Short relearning items due within hours (10-min "again" cards) — Q1.
 *  3. Overdue reviews, oldest first — Q1.
 *  4. Reviews due today — Q2.
 *  5. Brand-new chapters to learn today — Q2.
 *  6. Reviews due tomorrow (preview) — Q3.
 *  7. Upcoming reviews stay parked in Q4 until they come due — never pulled early.
 * Max 2 tasks per quadrant (8 total) to respect working-memory limits.
 */
export async function ensureTodayPlan(userId: string, now: number, force = false): Promise<PlanItem[]> {
  const today = dayStr(now);
  const existing = await q("SELECT * FROM tasks WHERE user_id = ? AND day = ? ORDER BY created_at", userId, today);
  if (existing.length && !force) return existing.map(rowToItem);

  // Keep completed + custom tasks; rebuild open auto tasks.
  await batch([
    { sql: "DELETE FROM tasks WHERE user_id = ? AND day = ? AND status = 'open' AND source = 'auto'", args: [userId, today] },
  ]);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const t0 = startOfToday.getTime();
  const tomorrowEnd = t0 + 2 * 24 * 3600_000;

  const subjects = await q("SELECT * FROM subjects WHERE user_id = ?", userId);
  const chapters = await q("SELECT * FROM chapters WHERE user_id = ?", userId);
  const cards = await q("SELECT * FROM cards WHERE user_id = ?", userId);
  const reviews = await q("SELECT * FROM reviews WHERE user_id = ?", userId);
  const revByCard = new Map(reviews.map((r) => [String(r.card_id), r]));
  const subName = new Map(subjects.map((s) => [String(s.id), String(s.name)]));
  const chRow = new Map(chapters.map((c) => [String(c.id), c]));

  const groupTitle = (chapterId: string, subjectId: string) => {
    const ch = chapterId ? chRow.get(chapterId) : undefined;
    const s = subName.get(subjectId) ?? "General";
    return ch ? `${s} · ${String(ch.name)}` : s;
  };

  // Group cards by chapter for scheduling.
  const byChapter = new Map<string, { chapterId: string; subjectId: string; cardIds: string[] }>();
  for (const c of cards) {
    const key = String(c.chapter_id || `sub:${c.subject_id}`);
    const g = byChapter.get(key) ?? { chapterId: String(c.chapter_id || ""), subjectId: String(c.subject_id), cardIds: [] };
    g.cardIds.push(String(c.id));
    byChapter.set(key, g);
  }

  const cands: Cand[] = [];

  // Yesterday's unfinished business: least-important (q3/q4) items missed
  // for a day escalate to the most important zone (q1).
  const y = new Date(t0 - 24 * 3600_000);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
  const missed = await q("SELECT * FROM tasks WHERE user_id = ? AND day = ? AND status = 'open'", userId, yesterday);
  for (const m of missed) {
    const wasLow = m.quadrant === "q3" || m.quadrant === "q4";
    cands.push({
      kind: (m.kind as TaskKind) || "review",
      refId: String(m.ref_id || ""),
      refSubject: String(m.ref_subject || ""),
      title: String(m.title),
      detail: String(m.detail || ""),
      note: wasLow ? "Missed yesterday — escalated" : "Carried over from yesterday",
      quadrant: "q1",
      count: Number(m.count || 0),
      score: 200,
    });
  }

  for (const g of byChapter.values()) {
    const revs = g.cardIds.map((id) => revByCard.get(id)).filter(Boolean) as Record<string, unknown>[];
    if (!revs.length) continue;
    const overdue = revs.filter((r) => Number(r.next_review_at) <= now);
    const relearnSoon = revs.filter((r) => r.state === "relearning" && Number(r.next_review_at) <= now + 6 * 3600_000);
    const dueToday = revs.filter((r) => Number(r.next_review_at) > now && Number(r.next_review_at) < t0 + 24 * 3600_000);
    const dueTomorrow = revs.filter((r) => Number(r.next_review_at) >= t0 + 24 * 3600_000 && Number(r.next_review_at) < tomorrowEnd);
    const upcoming = revs.filter((r) => Number(r.next_review_at) >= tomorrowEnd && Number(r.next_review_at) < t0 + 8 * 24 * 3600_000);
    const allNew = revs.length > 0 && revs.every((r) => Number(r.total_reviews) === 0);
    const title = groupTitle(g.chapterId, g.subjectId);

    if (relearnSoon.length) {
      cands.push({
        kind: "review", refId: g.chapterId, refSubject: g.subjectId,
        title: `Quick relearn: ${title}`, detail: `${relearnSoon.length} card${relearnSoon.length > 1 ? "s" : ""} due within hours`,
        note: "10-minute relearning", quadrant: "q1", count: relearnSoon.length, score: 150,
      });
    }
    if (overdue.length) {
      const oldest = Math.min(...overdue.map((r) => Number(r.next_review_at)));
      const daysLate = Math.max(0, Math.floor((now - oldest) / 86400000));
      cands.push({
        kind: "review", refId: g.chapterId, refSubject: g.subjectId,
        title, detail: `${overdue.length} overdue review${overdue.length > 1 ? "s" : ""}${daysLate ? ` · ${daysLate}d late` : ""}`,
        note: daysLate ? `${daysLate} day${daysLate > 1 ? "s" : ""} overdue` : "Overdue",
        quadrant: "q1", count: overdue.length, score: 100 + daysLate * 10,
      });
    }
    if (dueToday.length) {
      cands.push({
        kind: "review", refId: g.chapterId, refSubject: g.subjectId,
        title, detail: `${dueToday.length} review${dueToday.length > 1 ? "s" : ""} due today`,
        note: "Due today", quadrant: "q2", count: dueToday.length, score: 60,
      });
    }
    if (allNew) {
      cands.push({
        kind: "learn", refId: g.chapterId, refSubject: g.subjectId,
        title: `Learn: ${title}`, detail: `${revs.length} new card${revs.length > 1 ? "s" : ""} · start with a 25-min session`,
        note: "New chapter", quadrant: "q2", count: revs.length, score: 50,
      });
    }
    if (dueTomorrow.length) {
      cands.push({
        kind: "preview", refId: g.chapterId, refSubject: g.subjectId,
        title: `Preview for tomorrow: ${title}`, detail: `${dueTomorrow.length} card${dueTomorrow.length > 1 ? "s" : ""} coming due`,
        note: "Due tomorrow", quadrant: "q3", count: dueTomorrow.length, score: 20,
      });
    }
    if (upcoming.length) {
      const soonest = Math.min(...upcoming.map((r) => Number(r.next_review_at)));
      const inDays = Math.max(2, Math.round((soonest - now) / 86400000));
      cands.push({
        kind: "preview", refId: g.chapterId, refSubject: g.subjectId,
        title, detail: `${upcoming.length} card${upcoming.length > 1 ? "s" : ""} due in ~${inDays}d — parked until due`,
        note: "Stays until due", quadrant: "q4", count: upcoming.length, score: 5,
      });
    }
  }

  // The calendar schedule: today's + missed chapter items, so students who
  // learn chapters (not just flashcards) always get a plan.
  const covered = new Set(cands.map((c) => `${c.kind}:${c.refId}`));
  let sched: Awaited<ReturnType<typeof listSchedule>> = [];
  try {
    sched = await listSchedule(userId);
  } catch { /* offline — cards-only plan */ }
  for (const s of sched) {
    if (s.status !== "open") continue;
    const isPast = s.day < today;
    if (!isPast && s.day !== today) continue;
    const kind: TaskKind = s.kind === "learn" ? "learn" : "review";
    if (s.chapterId && covered.has(`${kind}:${s.chapterId}`)) continue;
    cands.push({
      kind,
      refId: s.chapterId,
      refSubject: s.subjectId,
      title: s.title,
      detail: isPast ? `Scheduled ${s.day} · missed` : "On today's calendar",
      note: isPast ? "Missed — still open" : s.kind === "revision" ? "Revision day" : "Scheduled today",
      quadrant: isPast ? "q1" : "q2",
      count: 0,
      score: isPast ? 120 : 55,
    });
    if (s.chapterId) covered.add(`${kind}:${s.chapterId}`);
  }

  // Chapters with no cards and nothing scheduled: suggest starting them
  // (otherwise a chapter-only student stares at an empty plan).
  for (const ch of chapters) {
    const cid = String(ch.id);
    if (cards.some((c) => String(c.chapter_id) === cid)) continue;
    if (cands.some((c) => c.refId === cid)) continue;
    const sid = String(ch.subject_id);
    cands.push({
      kind: "learn",
      refId: cid,
      refSubject: sid,
      title: `Learn: ${groupTitle(cid, sid)}`,
      detail: "New chapter · start with a 25-min session",
      note: "New chapter",
      quadrant: "q2",
      count: 0,
      score: 40,
    });
  }

  // Max 2 per quadrant → 8 total. Highest score wins each zone.
  const picked: Cand[] = [];
  (["q1", "q2", "q3", "q4"] as Quadrant[]).forEach((q) => {
    const inQ = cands.filter((c) => c.quadrant === q).sort((a, b) => b.score - a.score);
    // Don't duplicate a chapter already picked in a higher zone.
    for (const c of inQ) {
      if (picked.length >= 8) break;
      if (picked.filter((p) => p.quadrant === q).length >= MAX_PER_QUADRANT) break;
      if (c.refId && picked.some((p) => p.refId === c.refId && p.kind === c.kind)) continue;
      picked.push(c);
    }
  });

  const base = Date.now();
  await batch(
    picked.map((c, i) => ({
      sql: "INSERT INTO tasks (id, user_id, day, kind, ref_id, ref_subject, title, detail, note, quadrant, status, source, count, created_at, completed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      args: [uid(), userId, today, c.kind, c.refId, c.refSubject, c.title, c.detail, c.note, c.quadrant, "open", "auto", c.count, base + i, null],
    }))
  );

  return (await q("SELECT * FROM tasks WHERE user_id = ? AND day = ? ORDER BY created_at", userId, today)).map(rowToItem);
}

/** Groups due tomorrow — the "keep for tomorrow" list. */
export async function tomorrowPreview(userId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const t0 = startOfToday.getTime();
  const lo = t0 + 24 * 3600_000, hi = t0 + 2 * 24 * 3600_000;
  const rows = await q(
    `SELECT c.chapter_id AS chapterId, c.subject_id AS subjectId, s.name AS subjectName, ch.name AS chapterName, COUNT(*) AS n
     FROM reviews r JOIN cards c ON c.id = r.card_id
     LEFT JOIN subjects s ON s.id = c.subject_id LEFT JOIN chapters ch ON ch.id = c.chapter_id
     WHERE r.user_id = ? AND r.next_review_at >= ? AND r.next_review_at < ?
     GROUP BY c.chapter_id, c.subject_id ORDER BY n DESC`,
    userId, lo, hi
  );
  return rows.map((r) => ({
    title: r.chapterName ? `${r.subjectName} · ${r.chapterName}` : String(r.subjectName ?? "General"),
    count: Number(r.n),
  }));
}

/** What the student already studied today (completions + focus time). */
export async function studiedToday(userId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const t0 = startOfToday.getTime();
  const doneRow = await q<{ n: number }>("SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND day = ? AND status = 'done'", userId, dayStr(Date.now()));
  const done = doneRow[0]?.n ?? 0;
  const sess = await q("SELECT * FROM study_sessions WHERE user_id = ? AND start >= ? AND kind = 'focus' ORDER BY start DESC", userId, t0);
  const revRow = await q<{ n: number }>("SELECT COUNT(*) AS n FROM review_logs WHERE user_id = ? AND at >= ?", userId, t0);
  const reviews = revRow[0]?.n ?? 0;
  const focusSec = sess.reduce((a, s) => a + Number(s.duration_sec), 0);
  return {
    tasksDone: done,
    reviewsDone: reviews,
    focusSec,
    pomodoros: sess.filter((s) => s.completed === 1).length,
  };
}
