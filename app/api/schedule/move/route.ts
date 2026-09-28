import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { moveScheduleItem } from "@/lib/server/schedule";

/** Move one chapter plan item to another day (removes it from the old day). */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const moved = await moveScheduleItem(user.id, String(body?.id ?? ""), String(body?.day ?? ""));
  if (!moved) return NextResponse.json({ error: "Could not move that item." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
