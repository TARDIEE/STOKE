import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { createSession, hashPassword, publicUser, type DbUser } from "@/lib/server/auth";
import { uid } from "@/lib/server/util";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  // Name is required — registration cannot proceed without it.
  if (!name) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

  const db = getDb();
  const taken = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (taken) return NextResponse.json({ error: "An account with this email already exists. Try logging in." }, { status: 409 });

  const id = uid();
  const { salt, hash } = hashPassword(password);
  db.prepare(
    "INSERT INTO users (id, name, email, pass_salt, pass_hash, created_at) VALUES (?,?,?,?,?,?)"
  ).run(id, name, email, salt, hash, Date.now());
  db.prepare("INSERT INTO pomo_settings (user_id) VALUES (?)").run(id);
  await createSession(id);

  const user = db.prepare("SELECT id, name, email, onboarded, focus_preset, reminders, morning, evening, frequency, theme, exam_id, exam_name, exam_date, focus_goal, (CASE WHEN ai_key != '' THEN 1 ELSE 0 END) AS has_ai_key FROM users WHERE id = ?").get(id) as DbUser;
  return NextResponse.json({ user: publicUser(user) });
}
