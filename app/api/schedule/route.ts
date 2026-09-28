import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { dayKey, daysLeft, generateSchedule, listSchedule, missedCount } from "@/lib/server/schedule";

/**
 * Calendar data: the exam deadline, the day-by-day chapter plan for the
 * requested month, per-day study stats, and how many plan items were missed.
 */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const db = getDb();
  const url = new URL(req.url);
  const now = Date.now();

  const row = db.prepare("SELECT exam_id, exam_name, exam_date FROM users WHERE id = ?").get(user.id) as {
    exam_id: string; exam_name: string; exam_date: number;
  };
  const exam = row?.exam_date ? { id: row.exam_id, name: row.exam_name, date: Number(row.exam_date), daysLeft: daysLeft(Number(row.exam_date), now) } : null;

  const monthParam = url.searchParams.get("month"); // YYYY-MM
  const base = monthParam ? new Date(monthParam + "-01T12:00:00") : new Date();
  const y = base.getFullYear(), mo = base.getMonth();

  // Auto-build the chapter plan the first time an exam with a date exists.
  let items = listSchedule(user.id);
  if (exam && items.length === 0) items = generateSchedule(user.id, now);

  if (url.searchParams.get("all") === "1") {
    const byDay: Record<string, typeof items> = {};
    for (const i of items) {
      (byDay[i.day] ??= []).push(i);
    }
    return NextResponse.json({ exam, plan: byDay });
  }

  const inMonth = items.filter((i) => {
    const d = new Date(i.day + "T12:00:00");
    return d.getFullYear() === y && d.getMonth() === mo;
  });

  // Per-day study activity for the heatmap.
  const sessions = db.prepare("SELECT * FROM study_sessions WHERE user_id = ? AND kind = 'focus'").all(user.id) as Record<string, unknown>[];
  const logs = db.prepare("SELECT at FROM review_logs WHERE user_id = ?").all(user.id) as { at: number }[];
  const perDay: Record<string, { sec: number; pomos: number; reviews: number }> = {};
  for (const s of sessions) {
    const k = dayKey(Number(s.start));
    const e = perDay[k] ?? { sec: 0, pomos: 0, reviews: 0 };
    e.sec += Number(s.duration_sec);
    if (s.completed === 1) e.pomos++;
    perDay[k] = e;
  }
  for (const l of logs) {
    const k = dayKey(Number(l.at));
    const e = perDay[k] ?? { sec: 0, pomos: 0, reviews: 0 };
    e.reviews++;
    perDay[k] = e;
  }

  const byDay: Record<string, typeof inMonth> = {};
  for (const i of inMonth) {
    (byDay[i.day] ??= []).push(i);
  }

  return NextResponse.json({
    exam,
    serverNow: now,
    month: `${y}-${String(mo + 1).padStart(2, "0")}`,
    plan: byDay,
    perDay,
    missed: missedCount(user.id, now),
    totalPlanned: items.length,
    totalDone: items.filter((i) => i.status === "done").length,
  });
}
