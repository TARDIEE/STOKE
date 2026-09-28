import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

const GRADES = ["again", "hard", "good", "easy"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const grade = String(body?.grade ?? "");
  const r = body?.review as Record<string, number | string | null> | undefined;
  if (!GRADES.includes(grade) || !r) return NextResponse.json({ error: "Invalid grade." }, { status: 400 });

  const db = getDb();
  const owns = db.prepare("SELECT id FROM cards WHERE user_id = ? AND id = ?").get(user.id, id);
  if (!owns) return NextResponse.json({ error: "Card not found." }, { status: 404 });

  const t = db.transaction(() => {
    db.prepare(
      `INSERT INTO reviews (card_id, user_id, last_reviewed_at, next_review_at, interval_days, ease, reps, lapses, correct, incorrect, total_reviews, state)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(card_id) DO UPDATE SET user_id=excluded.user_id, last_reviewed_at=excluded.last_reviewed_at, next_review_at=excluded.next_review_at, interval_days=excluded.interval_days, ease=excluded.ease, reps=excluded.reps, lapses=excluded.lapses, correct=excluded.correct, incorrect=excluded.incorrect, total_reviews=excluded.total_reviews, state=excluded.state`
    ).run(
      id, user.id,
      typeof r.lastReviewedAt === "number" ? r.lastReviewedAt : null,
      Number(r.nextReviewAt), Number(r.intervalDays), Number(r.ease),
      Number(r.reps), Number(r.lapses), Number(r.correct),
      Number(r.incorrect), Number(r.totalReviews), String(r.state)
    );
    db.prepare("INSERT INTO review_logs (id, user_id, card_id, at, grade) VALUES (?,?,?,?,?)").run(
      String(body?.logId ?? `${Date.now()}`), user.id, id, Date.now(), grade
    );
  });
  t();
  return NextResponse.json({ ok: true });
}
