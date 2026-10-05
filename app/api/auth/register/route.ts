import { NextResponse } from "next/server";
import { q1, run } from "@/lib/server/db";
import { createSession, hashPassword, publicUser, type DbUser } from "@/lib/server/auth";
import { checkRateLimit, clientIp } from "@/lib/server/ratelimit";
import { uid } from "@/lib/server/util";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    return await register(req);
  } catch (e) {
    console.error("register failed:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

async function register(req: Request) {
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  // Name is required — registration cannot proceed without it.
  if (!name) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

  const retryAfter = checkRateLimit(`register:${clientIp(req)}`, 10, 60 * 60_000);
  if (retryAfter) {
    return NextResponse.json(
      { error: "Too many accounts created. Try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const taken = await q1("SELECT id FROM users WHERE email = ?", email);
  if (taken) return NextResponse.json({ error: "An account with this email already exists. Try logging in." }, { status: 409 });

  const id = uid();
  const { salt, hash } = hashPassword(password);
  await run(
    "INSERT INTO users (id, name, email, pass_salt, pass_hash, created_at) VALUES (?,?,?,?,?,?)",
    id,
    name,
    email,
    salt,
    hash,
    Date.now()
  );
  await run("INSERT INTO pomo_settings (user_id) VALUES (?)", id);
  await createSession(id);

  const user = (await q1<DbUser>("SELECT id, name, email, onboarded, focus_preset, reminders, morning, evening, frequency, theme, exam_id, exam_name, exam_date, focus_goal, country, (CASE WHEN ai_key != '' THEN 1 ELSE 0 END) AS has_ai_key FROM users WHERE id = ?", id)) as DbUser;
  return NextResponse.json({ user: publicUser(user) });
}
