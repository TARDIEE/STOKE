import { NextResponse } from "next/server";
import { currentUser, destroySession, publicUser } from "@/lib/server/auth";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: publicUser(user) });
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
