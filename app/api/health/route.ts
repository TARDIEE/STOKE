import { NextResponse } from "next/server";
import { dbKind, isEphemeral, q } from "@/lib/server/db";

/** Liveness + database diagnostics. If this fails, the DB backend is down. */
export async function GET() {
  try {
    await q("SELECT 1 AS ok");
    const ephemeral = isEphemeral();
    return NextResponse.json({
      ok: !ephemeral,
      db: dbKind(),
      ephemeral,
      hint: ephemeral
        ? "Accounts cannot persist: set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN env vars, then redeploy."
        : undefined,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        db: dbKind(),
        error: e instanceof Error ? e.message : "Database unreachable.",
        hint: "Set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN env vars (see .env.example).",
      },
      { status: 503 }
    );
  }
}
