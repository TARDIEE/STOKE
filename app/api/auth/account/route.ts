import { NextResponse } from "next/server";
import { batch, q1 } from "@/lib/server/db";
import { cookies } from "next/headers";
import { COOKIE, currentUser, verifyPassword } from "@/lib/server/auth";
import { createHash } from "crypto";

/**
 * DELETE /api/auth/account — permanently delete the account and ALL its data.
 * Requires the current password. Nothing is recoverable after this.
 */
export async function DELETE(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    const body = await req.json().catch(() => null);
    const password = String(body?.password ?? "");
    if (!password) return NextResponse.json({ error: "Enter your password to confirm." }, { status: 400 });

    const row = await q1<{ pass_salt: string; pass_hash: string }>(
      "SELECT pass_salt, pass_hash FROM users WHERE id = ?",
      user.id
    );
    if (!row || !verifyPassword(password, row.pass_salt, row.pass_hash)) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 403 });
    }

    const id = user.id;
    await batch([
      { sql: "DELETE FROM review_logs WHERE user_id = ?", args: [id] },
      { sql: "DELETE FROM reviews WHERE user_id = ?", args: [id] },
      { sql: "DELETE FROM cards WHERE user_id = ?", args: [id] },
      { sql: "DELETE FROM chapters WHERE user_id = ?", args: [id] },
      { sql: "DELETE FROM subjects WHERE user_id = ?", args: [id] },
      { sql: "DELETE FROM study_sessions WHERE user_id = ?", args: [id] },
      { sql: "DELETE FROM tasks WHERE user_id = ?", args: [id] },
      { sql: "DELETE FROM schedule WHERE user_id = ?", args: [id] },
      { sql: "DELETE FROM ai_questions WHERE user_id = ?", args: [id] },
      { sql: "DELETE FROM pomo_settings WHERE user_id = ?", args: [id] },
      { sql: "DELETE FROM auth_sessions WHERE user_id = ?", args: [id] },
      { sql: "DELETE FROM users WHERE id = ?", args: [id] },
    ]);

    // Drop the session token row too (belt and suspenders), then the cookie.
    try {
      const token = (await cookies()).get(COOKIE)?.value;
      if (token) {
        const th = createHash("sha256").update(token).digest("hex");
        await batch([{ sql: "DELETE FROM auth_sessions WHERE token_hash = ?", args: [th] }]);
      }
    } catch {
      /* account rows are already gone */
    }
    (await cookies()).delete(COOKIE);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("delete account failed:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
