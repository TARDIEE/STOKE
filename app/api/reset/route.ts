import { NextResponse } from "next/server";
import { resetUserData } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  await resetUserData(user.id);
  return NextResponse.json({ ok: true });
}
