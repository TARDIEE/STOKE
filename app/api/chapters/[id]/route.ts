import { NextResponse } from "next/server";
import { batch, q, run } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

const EDITABLE = ["name", "description", "notes"] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const fields: string[] = [];
  const vals: unknown[] = [];
  for (const k of EDITABLE) {
    if (typeof body?.[k] === "string") { fields.push(`${k} = ?`); vals.push(body[k]); }
  }
  if (fields.length) {
    vals.push(user.id, id);
    await run(`UPDATE chapters SET ${fields.join(", ")} WHERE user_id = ? AND id = ?`, ...vals);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;
  const cardIds = await q<{ id: string }>("SELECT id FROM cards WHERE user_id = ? AND chapter_id = ?", user.id, id);
  const stmts: { sql: string; args: unknown[] }[] = [];
  for (const c of cardIds) {
    stmts.push({ sql: "DELETE FROM reviews WHERE card_id = ?", args: [c.id] });
    stmts.push({ sql: "DELETE FROM review_logs WHERE card_id = ? AND user_id = ?", args: [c.id, user.id] });
  }
  stmts.push({ sql: "DELETE FROM cards WHERE user_id = ? AND chapter_id = ?", args: [user.id, id] });
  stmts.push({ sql: "UPDATE study_sessions SET chapter_id = NULL WHERE user_id = ? AND chapter_id = ?", args: [user.id, id] });
  stmts.push({ sql: "DELETE FROM ai_questions WHERE user_id = ? AND chapter_id = ?", args: [user.id, id] });
  stmts.push({ sql: "DELETE FROM schedule WHERE user_id = ? AND chapter_id = ?", args: [user.id, id] });
  stmts.push({ sql: "DELETE FROM chapters WHERE user_id = ? AND id = ?", args: [user.id, id] });
  await batch(stmts);
  return NextResponse.json({ ok: true });
}
