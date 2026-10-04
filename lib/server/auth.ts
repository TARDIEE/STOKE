import { cookies, headers } from "next/headers";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { q1, run } from "./db";

export const COOKIE = "stoke_session";
const THIRTY_DAYS = 30 * 24 * 3600;

/**
 * Secure cookies are silently dropped by browsers over plain HTTP — which
 * made login look "successful" but never stick on http:// hosts. Detect the
 * actual request scheme (proxy header, else the Referer browsers always send
 * same-origin) and only mark Secure on real HTTPS. COOKIE_SECURE=1/0 forces it.
 */
export async function sessionCookieSecure(): Promise<boolean> {
  if (process.env.COOKIE_SECURE === "1") return true;
  if (process.env.COOKIE_SECURE === "0") return false;
  try {
    const h = await headers();
    const proto = (h.get("x-forwarded-proto") ?? "").split(",")[0].trim().toLowerCase();
    const ref = h.get("referer") ?? h.get("origin") ?? "";
    if (proto === "http" || ref.startsWith("http://")) return false;
    if (proto === "https" || ref.startsWith("https://")) return true;
  } catch {
    /* fall through to the default */
  }
  return process.env.NODE_ENV === "production";
}

export function hashPassword(pw: string, salt = randomBytes(16).toString("hex")) {
  return { salt, hash: scryptSync(pw, salt, 64).toString("hex") };
}

export function verifyPassword(pw: string, salt: string, hash: string) {
  try {
    const h = scryptSync(pw, salt, 64);
    const e = Buffer.from(hash, "hex");
    return h.length === e.length && timingSafeEqual(h, e);
  } catch {
    return false;
  }
}

export interface DbUser {
  id: string;
  name: string;
  email: string;
  onboarded: number;
  focus_preset: string;
  reminders: number;
  morning: string;
  evening: string;
  frequency: string;
  theme: string;
  exam_id: string;
  exam_name: string;
  exam_date: number;
  focus_goal: number;
  /** AI key presence only — the key itself is never sent to the client */
  has_ai_key: number;
}

export async function currentUser(): Promise<DbUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const th = createHash("sha256").update(token).digest("hex");
  const row = await q1<DbUser>(
    "SELECT u.id, u.name, u.email, u.onboarded, u.focus_preset, u.reminders, u.morning, u.evening, u.frequency, u.theme, u.exam_id, u.exam_name, u.exam_date, u.focus_goal, (CASE WHEN u.ai_key != '' THEN 1 ELSE 0 END) AS has_ai_key FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?",
    th,
    Date.now()
  );
  return row ?? null;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const th = createHash("sha256").update(token).digest("hex");
  const now = Date.now();
  await run(
    "INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at) VALUES (?,?,?,?)",
    th,
    userId,
    now,
    now + THIRTY_DAYS * 1000
  );
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
    secure: await sessionCookieSecure(),
  });
}

export async function destroySession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (token) {
    const th = createHash("sha256").update(token).digest("hex");
    await run("DELETE FROM auth_sessions WHERE token_hash = ?", th);
  }
  (await cookies()).delete(COOKIE);
}

export function publicUser(u: DbUser) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    onboarded: u.onboarded === 1,
    focusPreset: u.focus_preset,
    reminders: u.reminders === 1,
    morning: u.morning,
    evening: u.evening,
    frequency: u.frequency as "daily" | "twice" | "custom",
    theme: u.theme as "light" | "dark" | "system",
    examId: u.exam_id || "",
    examName: u.exam_name || "",
    examDate: Number(u.exam_date) || 0,
    focusGoal: Number(u.focus_goal) || 120,
    hasAiKey: u.has_ai_key === 1,
  };
}
