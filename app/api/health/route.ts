import { NextResponse } from "next/server";
import { dbKind, isEphemeral, q, storageKind } from "@/lib/server/db";

/** Liveness + database diagnostics. If this fails, the DB backend is down. */
export async function GET() {
  try {
    await q("SELECT 1 AS ok");
    const ephemeral = isEphemeral();
    return NextResponse.json({
      ok: !ephemeral,
      db: dbKind(),
      storage: storageKind(),
      ephemeral,
      hint: ephemeral
        ? "Accounts cannot persist: set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN env vars, then redeploy."
        : undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database unreachable.";
    // Turso 400 = the URL/token values are malformed or mismatched.
    const hint = /status 400/i.test(msg)
      ? "Turso rejected the connection values. Re-copy the EXACT libsql:// URL from the Turso dashboard (no edits, no trailing slash) and create a fresh token for that same database, then update both env vars and redeploy."
      : "Set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN env vars (see .env.example).";
    return NextResponse.json(
      { ok: false, db: dbKind(), error: msg, hint },
      { status: 503 }
    );
  }
}
