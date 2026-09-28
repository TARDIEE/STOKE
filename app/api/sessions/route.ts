import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  getDb()
    .prepare(
      "INSERT INTO study_sessions (id, user_id, subject_id, chapter_id, start, end, duration_sec, kind, completed, label) VALUES (?,?,?,?,?,?,?,?,?,?)"
    )
    .run(
      id, user.id,
      body?.subjectId ? String(body.subjectId) : null,
      body?.chapterId ? String(body.chapterId) : null,
      Number(body?.start ?? Date.now()), Number(body?.end ?? Date.now()),
      Number(body?.durationSec ?? 0),
      body?.kind === "short" || body?.kind === "long" ? body.kind : "focus",
      body?.completed === false ? 0 : 1,
      body?.label === "reread" ? "reread" : "learn"
    );
  return NextResponse.json({ ok: true });
}
