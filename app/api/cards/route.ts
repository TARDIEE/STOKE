import { NextResponse } from "next/server";
import { batch, run } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  const subjectId = String(body?.subjectId ?? "");
  const front = String(body?.front ?? "").trim();
  const back = String(body?.back ?? "").trim();
  if (!id || !subjectId || !front || !back) {
    return NextResponse.json({ error: "Question, answer and subject are required." }, { status: 400 });
  }
  await batch([
    {
      sql: "INSERT INTO cards (id, user_id, subject_id, chapter_id, front, back, tags, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
      args: [
        id, user.id, subjectId, String(body?.chapterId ?? ""),
        front, back,
        JSON.stringify(Array.isArray(body?.tags) ? body.tags : []),
        String(body?.notes ?? ""), Date.now(),
      ],
    },
    {
      sql: "INSERT INTO reviews (card_id, user_id, last_reviewed_at, next_review_at, interval_days, ease, reps, lapses, correct, incorrect, total_reviews, state) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      args: [id, user.id, null, Date.now(), 0, 2.5, 0, 0, 0, 0, 0, "new"],
    },
  ]);
  return NextResponse.json({ ok: true });
}
