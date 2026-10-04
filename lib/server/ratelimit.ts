// Tiny in-memory rate limiter for auth endpoints (brute-force protection).
// Single-instance safe (one Node process serves all traffic on our hosts).
// For multi-instance deployments, replace with a shared store (Redis/DB).

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Returns null when allowed, or retry-after seconds when limited. */
export function checkRateLimit(key: string, max: number, windowMs: number): number | null {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  b.count++;
  if (b.count > max) return Math.ceil((b.resetAt - now) / 1000);
  return null;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 64);
  return "direct";
}
