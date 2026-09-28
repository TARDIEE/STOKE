import { NextResponse } from "next/server";
import { batch, run } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

const EDITABLE = ["subject_id", "chapter_id", "front", "back", "notes"] as const;
const BODY_KEY: Record<string, string> = {
  subject_id: "subjectId", chapter_id: "chapterId", front: "front", back: "back", notes: "notes",
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const fields: string[] = [];
  const vals: unknown[] = [];
  for (const col of EDITABLE) {
    const v = body?.[BODY_KEY[col]];
    if (typeof v === "string") { fields.push(`${col} = ?`); vals.push(v); }
  }
  if (Array.isArray(body?.tags)) { fields.push("tags = ?"); vals.push(JSON.stringify(body.tags)); }
  if (fields.length) {
    vals.push(user.id, id);
    await run(`UPDATE cards SET ${fields.join(", ")} WHERE user_id = ? AND id = ?`, ...vals);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;
  await batch([
    { sql: "DELETE FROM reviews WHERE card_id = ?", args: [id] },
    { sql: "DELETE FROM review_logs WHERE card_id = ? AND user_id = ?", args: [id, user.id] },
    { sql: "DELETE FROM cards WHERE user_id = ? AND id = ?", args: [user.id, id] },
  ]);
  return NextResponse.json({ ok: true });
}
