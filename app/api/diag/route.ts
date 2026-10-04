import { NextResponse } from "next/server";

/**
 * Remote diagnostics for hosted environments (no panel access needed).
 * Reports runtime, driver availability and filesystem writability.
 * Never exposes secrets — only booleans and short error snippets.
 */
export async function GET() {
  const out: Record<string, unknown> = {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
  };

  try {
    await import("node:sqlite");
    out.nodeSqlite = true;
  } catch (e) {
    out.nodeSqlite = false;
    out.nodeSqliteError = String(e).slice(0, 200);
  }

  try {
    await import("@libsql/client");
    out.libsqlImport = true;
  } catch (e) {
    out.libsqlImport = false;
    out.libsqlError = String(e).slice(0, 300);
  }

  try {
    const fs = await import("fs");
    const path = await import("path");
    const os = await import("os");
    const checks: Record<string, boolean> = {};
    for (const [name, dir] of [
      ["dataDir", path.join(process.cwd(), "data")],
      ["tmpDir", os.tmpdir()],
    ] as const) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        fs.accessSync(dir, fs.constants.W_OK);
        checks[name] = true;
      } catch {
        checks[name] = false;
      }
    }
    out.writable = checks;
  } catch (e) {
    out.writableError = String(e).slice(0, 200);
  }

  out.tursoConfigured = !!process.env.TURSO_DATABASE_URL;

  try {
    const db = await import("@/lib/server/db");
    const rows = await db.q<{ ok: number }>("SELECT 1 AS ok");
    out.query = rows.length > 0 ? "ok" : "empty";
    out.storage = db.storageKind();
    out.ephemeral = db.isEphemeral();
  } catch (e) {
    out.query = "failed";
    out.queryError = String(e instanceof Error ? e.message : e).slice(0, 300);
  }

  return NextResponse.json(out);
}
