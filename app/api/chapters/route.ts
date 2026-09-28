import { NextResponse } from "next/server";
import { q1, run } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  const subjectId = String(body?.subjectId ?? "");
  const name = String(body?.name ?? "").trim();
  if (!id || !subjectId || !name) return NextResponse.json({ error: "Chapter name is required." }, { status: 400 });
  const count = (await q1<{ n: number }>("SELECT COUNT(*) AS n FROM chapters WHERE user_id = ? AND subject_id = ?", user.id, subjectId))?.n ?? 0;
  const weight = Math.max(1, Math.min(5, Number(body?.weight ?? 3)));
  await run(
    "INSERT INTO chapters (id, user_id, subject_id, name, description, notes, ord, weight, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    id,
    user.id,
    subjectId,
    name,
    String(body?.description ?? ""),
    String(body?.notes ?? ""),
    count,
    weight,
    Date.now()
  );
  return NextResponse.json({ ok: true });
}
