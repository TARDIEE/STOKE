import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const fields: string[] = [];
  const vals: unknown[] = [];
  if (typeof body?.name === "string") { fields.push("name = ?"); vals.push(body.name); }
  if (typeof body?.description === "string") { fields.push("description = ?"); vals.push(body.description); }
  if (typeof body?.color === "string") { fields.push("color = ?"); vals.push(body.color); }
  if (fields.length) {
    vals.push(user.id, id);
    getDb().prepare(`UPDATE subjects SET ${fields.join(", ")} WHERE user_id = ? AND id = ?`).run(...vals);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;
  const db = getDb();
  const t = db.transaction(() => {
    const cardIds = db.prepare("SELECT id FROM cards WHERE user_id = ? AND subject_id = ?").all(user.id, id) as { id: string }[];
    const delRev = db.prepare("DELETE FROM reviews WHERE card_id = ?");
    const delLog = db.prepare("DELETE FROM review_logs WHERE card_id = ? AND user_id = ?");
    for (const c of cardIds) { delRev.run(c.id); delLog.run(c.id, user.id); }
    db.prepare("DELETE FROM cards WHERE user_id = ? AND subject_id = ?").run(user.id, id);
    db.prepare("DELETE FROM chapters WHERE user_id = ? AND subject_id = ?").run(user.id, id);
    db.prepare("UPDATE study_sessions SET subject_id = NULL, chapter_id = NULL WHERE user_id = ? AND subject_id = ?").run(user.id, id);
    db.prepare("DELETE FROM subjects WHERE user_id = ? AND id = ?").run(user.id, id);
  });
  t();
  return NextResponse.json({ ok: true });
}
