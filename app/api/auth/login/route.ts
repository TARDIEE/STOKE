import { NextResponse } from "next/server";
import { q1 } from "@/lib/server/db";
import { createSession, publicUser, verifyPassword, type DbUser } from "@/lib/server/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  const row = await q1<DbUser & { pass_salt: string; pass_hash: string }>("SELECT * FROM users WHERE email = ?", email);
  if (!row || !verifyPassword(password, row.pass_salt, row.pass_hash)) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }
  await createSession(row.id);
  return NextResponse.json({ user: publicUser(row) });
}
