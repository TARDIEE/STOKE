import { q1, run } from "./db";

/**
 * Premium gating for AI generation. Codes come from PREMIUM_CODES
 * (comma-separated). In non-production a built-in STOKE-LOCAL code works
 * so development and demos never get locked out.
 */
export async function isPremium(userId: string): Promise<boolean> {
  const r = await q1<{ is_premium: number }>("SELECT is_premium FROM users WHERE id = ?", userId);
  return Number(r?.is_premium) === 1;
}

export function validPremiumCode(code: string): boolean {
  const clean = String(code ?? "").trim();
  if (!clean) return false;
  const fromEnv = (process.env.PREMIUM_CODES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromEnv.includes(clean)) return true;
  if (process.env.NODE_ENV !== "production" && clean === "STOKE-LOCAL") return true;
  return false;
}

export async function grantPremium(userId: string): Promise<void> {
  await run("UPDATE users SET is_premium = 1 WHERE id = ?", userId);
}
