import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { currentUser, publicUser } from "@/lib/server/auth";

const b = (v: unknown) => v === 1;

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const db = getDb();
  const subjects = db.prepare("SELECT * FROM subjects WHERE user_id = ? ORDER BY created_at").all(user.id);
  const chapters = db.prepare("SELECT * FROM chapters WHERE user_id = ? ORDER BY ord, created_at").all(user.id);
  const cardRows = db.prepare("SELECT * FROM cards WHERE user_id = ? ORDER BY created_at DESC").all(user.id) as Record<string, unknown>[];
  const reviewRows = db.prepare("SELECT * FROM reviews WHERE user_id = ?").all(user.id) as Record<string, unknown>[];
  const logRows = db.prepare("SELECT * FROM review_logs WHERE user_id = ? ORDER BY at DESC LIMIT 2000").all(user.id);
  const sessionRows = db.prepare("SELECT * FROM study_sessions WHERE user_id = ? ORDER BY start DESC LIMIT 1000").all(user.id);
  const pomo = db.prepare("SELECT * FROM pomo_settings WHERE user_id = ?").get(user.id) as Record<string, number>;

  return NextResponse.json({
    user: { ...publicUser(user), streakMinSessions: 1 },
    subjects: (subjects as Record<string, unknown>[]).map((s) => ({
      id: s.id, name: s.name, description: s.description, color: s.color, createdAt: s.created_at,
    })),
    chapters: (chapters as Record<string, unknown>[]).map((c) => ({
      id: c.id, subjectId: c.subject_id, name: c.name, description: c.description,
      notes: c.notes, order: c.ord, weight: Number(c.weight ?? 3), createdAt: c.created_at,
    })),
    cards: cardRows.map((c) => ({
      id: c.id, subjectId: c.subject_id, chapterId: c.chapter_id, front: c.front, back: c.back,
      tags: JSON.parse(String(c.tags || "[]")), notes: c.notes, createdAt: c.created_at,
    })),
    reviews: Object.fromEntries(reviewRows.map((r) => [r.card_id, {
      cardId: r.card_id, lastReviewedAt: r.last_reviewed_at ?? null, nextReviewAt: r.next_review_at,
      intervalDays: r.interval_days, ease: r.ease, reps: r.reps, lapses: r.lapses,
      correct: r.correct, incorrect: r.incorrect, totalReviews: r.total_reviews, state: r.state,
    }])),
    logs: (logRows as Record<string, unknown>[]).map((l) => ({ id: l.id, cardId: l.card_id, at: l.at, grade: l.grade })),
    sessions: (sessionRows as Record<string, unknown>[]).map((s) => ({
      id: s.id, subjectId: s.subject_id ?? null, chapterId: s.chapter_id ?? null,
      start: s.start, end: s.end, durationSec: s.duration_sec,
      kind: s.kind, completed: b(s.completed),
      label: s.label === "reread" ? "reread" : "learn",
    })),
    pomo: {
      focusMin: pomo.focus_min, shortMin: pomo.short_min, longMin: pomo.long_min,
      sessionsBeforeLong: pomo.sessions_before_long, autoStartBreaks: b(pomo.auto_start_breaks),
      autoStartFocus: b(pomo.auto_start_focus), sound: b(pomo.sound),
      vibration: b(pomo.vibration), notifications: b(pomo.notifications),
    },
  });
}
