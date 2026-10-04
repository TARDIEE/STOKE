import { NextResponse } from "next/server";
import { q1 } from "@/lib/server/db";
import { createSession, publicUser, verifyPassword, type DbUser } from "@/lib/server/auth";
import { checkRateLimit, clientIp } from "@/lib/server/ratelimit";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

    const retryAfter = checkRateLimit(`login:${clientIp(req)}:${email}`, 10, 10 * 60_000);
    if (retryAfter) {
      return NextResponse.json(
        { error: "Too many attempts. Try again in a few minutes." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const row = await q1<DbUser & { pass_salt: string; pass_hash: string }>("SELECT * FROM users WHERE email = ?", email);
    if (!row || !verifyPassword(password, row.pass_salt, row.pass_hash)) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }
    await createSession(row.id);
    return NextResponse.json({ user: publicUser(row) });
  } catch (e) {
    console.error("login failed:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
