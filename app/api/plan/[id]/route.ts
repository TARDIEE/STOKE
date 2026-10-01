import { NextResponse } from "next/server";
import { q1, run } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

function isDay(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * PATCH /api/plan/:id — toggle done/open, or edit the task.
 * Editing title/note/day converts an auto task into a custom one so later
 * Auto-adjust rebuilds (which clear open auto tasks) never wipe user edits.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const existing = await q1<{ source: string; day: string }>(
    "SELECT source, day FROM tasks WHERE user_id = ? AND id = ?",
    user.id, id
  );
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (typeof body?.status === "string") {
    const done = body.status === "done";
    await run(
      "UPDATE tasks SET status = ?, completed_at = ? WHERE user_id = ? AND id = ?",
      done ? "done" : "open",
      done ? Date.now() : null,
      user.id,
      id
    );
    return NextResponse.json({ ok: true });
  }

  const sets: string[] = [];
  const args: unknown[] = [];
  if (typeof body?.title === "string" && body.title.trim()) {
    sets.push("title = ?");
    args.push(body.title.trim().slice(0, 200));
  }
  if (typeof body?.note === "string") {
    sets.push("note = ?");
    args.push(String(body.note).slice(0, 200));
  }
  if (isDay(body?.day)) {
    sets.push("day = ?");
    args.push(body.day);
  }
  if (!sets.length) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  // Edited tasks become custom so Auto-adjust never deletes them.
  sets.push("source = 'custom'");
  await run(`UPDATE tasks SET ${sets.join(", ")} WHERE user_id = ? AND id = ?`, ...args, user.id, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;
  await run("DELETE FROM tasks WHERE user_id = ? AND id = ?", user.id, id);
  return NextResponse.json({ ok: true });
}
