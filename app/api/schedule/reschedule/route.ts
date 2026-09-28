import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { rescheduleMissed } from "@/lib/server/schedule";

/** Push missed (past-due, open) calendar plan items forward. */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const moved = await rescheduleMissed(user.id, Date.now());
  return NextResponse.json({ ok: true, moved });
}
