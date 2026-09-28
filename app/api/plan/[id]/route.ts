import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const done = body?.status === "done";
  getDb()
    .prepare("UPDATE tasks SET status = ?, completed_at = ? WHERE user_id = ? AND id = ?")
    .run(done ? "done" : "open", done ? Date.now() : null, user.id, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;
  getDb().prepare("DELETE FROM tasks WHERE user_id = ? AND id = ?").run(user.id, id);
  return NextResponse.json({ ok: true });
}
