import { NextResponse } from "next/server";
import { run } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Subject name is required." }, { status: 400 });
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  await run(
    "INSERT INTO subjects (id, user_id, name, description, color, created_at) VALUES (?,?,?,?,?,?)",
    id,
    user.id,
    name,
    String(body?.description ?? ""),
    String(body?.color ?? "#7C3AED"),
    Date.now()
  );
  return NextResponse.json({ ok: true });
}
