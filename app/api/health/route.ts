import { NextResponse } from "next/server";
import { dbKind, q } from "@/lib/server/db";

/** Liveness + database diagnostics. If this fails, the DB backend is down. */
export async function GET() {
  try {
    await q("SELECT 1 AS ok");
    return NextResponse.json({ ok: true, db: dbKind() });
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
