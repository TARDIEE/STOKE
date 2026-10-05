import path from "path";
import fs from "fs";
import os from "os";
import type { Client } from "@libsql/client";

/**
 * Database: Turso (libSQL) in production, local SQLite file in dev.
 * Set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN on Vercel — without them the app
 * falls back to data/stoke.db, which Vercel's filesystem wipes on every deploy.
 *
 * File mode prefers Node's built-in SQLite (node:sqlite): zero native
 * binaries, so FTP uploads and locked-down shared hosting can't break it.
 * libSQL remains for Turso (remote protocol) and as an old-Node fallback.
 */

/** Minimal surface our query helpers need, regardless of driver. */
export interface DbIface {
  execute(sql: string, args?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  batch(stmts: { sql: string; args: unknown[] }[]): Promise<void>;
}

let usingMemoryFallback = false;

async function createNodeSqlite(file: string | null): Promise<DbIface> {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(file ?? ":memory:");
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  if (file == null) usingMemoryFallback = true;
  return {
    async execute(sql: string, args: unknown[] = []) {
      const stmt = db.prepare(sql);
      const head = sql.trimStart().slice(0, 6).toUpperCase();
      if (head === "SELECT") return { rows: stmt.all(...args) };
      stmt.run(...args);
      return { rows: [] };
    },
    async batch(stmts: { sql: string; args: unknown[] }[]) {
      db.exec("BEGIN");
      try {
        for (const s of stmts) db.prepare(s.sql).run(...s.args);
        db.exec("COMMIT");
      } catch (e) {
        try {
          db.exec("ROLLBACK");
        } catch {
          /* ignore */
        }
        throw e;
      }
    },
  };
}

function libsqlIface(client: Client): DbIface {
  return {
    execute: async (sql: string, args: unknown[] = []) => {
      const r = await client.execute({ sql, args: args as never[] });
      return { rows: r.rows as unknown as Record<string, unknown>[] };
    },
    batch: async (stmts: { sql: string; args: unknown[] }[]) => {
      await client.batch(
        stmts.map((s) => ({ sql: s.sql, args: s.args as never[] }))
      );
    },
  };
}

/**
 * Writable SQLite location, first working wins:
 *  1. ./data/stoke.db (project dir — persists on real disks/VPS/shared hosting)
 *  2. OS temp dir (survives as long as the machine does, may vanish on reboot)
 *  3. null → in-memory database (always works, dies with the process)
 */
function pickFile(): string | null {
  const candidates = [
    path.join(process.cwd(), "data", "stoke.db"),
    path.join(os.tmpdir(), "stoke.db"),
  ];
  for (const file of candidates) {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.accessSync(path.dirname(file), fs.constants.W_OK);
      // Prove the file itself is openable (not just the directory).
      fs.closeSync(fs.openSync(/*turbopackIgnore: true*/ file, "a"));
      return file;
    } catch {
      continue;
    }
  }
  return null;
}

/** Which database backend is in use (shown by /api/health). */
export function dbKind(): "turso" | "file" {
  return process.env.TURSO_DATABASE_URL ? "turso" : "file";
}

/**
 * True when data cannot survive: serverless platforms (Vercel) wipe local
 * files on every request, so each request can land on a different EMPTY
 * database — logins die instantly. Admin fix: set TURSO_* env vars.
 * Also true when we fell back to in-memory storage (read-only disk).
 */
export function isEphemeral(): boolean {
  return (!process.env.TURSO_DATABASE_URL && process.env.VERCEL === "1") || usingMemoryFallback;
}

/** Which storage backend actually got used (shown by /api/health). */
export function storageKind(): "turso" | "file" | "memory" {
  if (process.env.TURSO_DATABASE_URL) return "turso";
  return usingMemoryFallback ? "memory" : "file";
}

const globalForDb = globalThis as unknown as { __stokeDb?: DbIface; __stokeDbPromise?: Promise<DbIface> };
export async function getDb(): Promise<DbIface> {
  if (globalForDb.__stokeDb) return globalForDb.__stokeDb;
  if (!globalForDb.__stokeDbPromise) {
    globalForDb.__stokeDbPromise = (async (): Promise<DbIface> => {
      // Turso stays on libsql (it speaks the remote protocol).
      if (process.env.TURSO_DATABASE_URL) {
        const { createClient } = await import("@libsql/client");
        const db = libsqlIface(
          createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
        );
        globalForDb.__stokeDb = db;
        return db;
      }
      // File mode: dependency-free node:sqlite first (immune to broken or
      // blocked native binaries on shared hosting); libsql file as fallback.
      const file = pickFile();
      try {
        const db = await createNodeSqlite(file);
        globalForDb.__stokeDb = db;
        return db;
      } catch (e) {
        console.error("node:sqlite unavailable, falling back to libsql:", e);
        const { createClient } = await import("@libsql/client");
        if (!file) usingMemoryFallback = true;
        const db = libsqlIface(createClient({ url: file ? `file:${file}` : "file::memory:?cache=shared" }));
        globalForDb.__stokeDb = db;
        return db;
      }
    })();
  }
  return globalForDb.__stokeDbPromise;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    pass_salt TEXT NOT NULL, pass_hash TEXT NOT NULL,
    onboarded INTEGER NOT NULL DEFAULT 0, focus_preset TEXT NOT NULL DEFAULT '25/5',
    reminders INTEGER NOT NULL DEFAULT 1, morning TEXT NOT NULL DEFAULT '08:00',
    evening TEXT NOT NULL DEFAULT '19:00', frequency TEXT NOT NULL DEFAULT 'twice',
    theme TEXT NOT NULL DEFAULT 'light', created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT '#7C3AED',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '', ord INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL, chapter_id TEXT NOT NULL DEFAULT '',
    front TEXT NOT NULL, back TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '[]',
    notes TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reviews (
    card_id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_reviewed_at INTEGER, next_review_at INTEGER NOT NULL,
    interval_days REAL NOT NULL DEFAULT 0, ease REAL NOT NULL DEFAULT 2.5,
    reps INTEGER NOT NULL DEFAULT 0, lapses INTEGER NOT NULL DEFAULT 0,
    correct INTEGER NOT NULL DEFAULT 0, incorrect INTEGER NOT NULL DEFAULT 0,
    total_reviews INTEGER NOT NULL DEFAULT 0, state TEXT NOT NULL DEFAULT 'new'
  );
  CREATE TABLE IF NOT EXISTS review_logs (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id TEXT NOT NULL, at INTEGER NOT NULL, grade TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS study_sessions (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id TEXT, chapter_id TEXT, start INTEGER NOT NULL, end INTEGER NOT NULL,
    duration_sec INTEGER NOT NULL, kind TEXT NOT NULL DEFAULT 'focus', completed INTEGER NOT NULL DEFAULT 1,
    label TEXT NOT NULL DEFAULT 'learn'
  );
  CREATE TABLE IF NOT EXISTS pomo_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    focus_min INTEGER NOT NULL DEFAULT 25, short_min INTEGER NOT NULL DEFAULT 5,
    long_min INTEGER NOT NULL DEFAULT 15, sessions_before_long INTEGER NOT NULL DEFAULT 4,
    auto_start_breaks INTEGER NOT NULL DEFAULT 0, auto_start_focus INTEGER NOT NULL DEFAULT 0,
    sound INTEGER NOT NULL DEFAULT 1, vibration INTEGER NOT NULL DEFAULT 0, notifications INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'review',
    ref_id TEXT NOT NULL DEFAULT '', ref_subject TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '',
    quadrant TEXT NOT NULL DEFAULT 'q2', status TEXT NOT NULL DEFAULT 'open',
    source TEXT NOT NULL DEFAULT 'auto', count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL, completed_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS schedule (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'learn',
    chapter_id TEXT NOT NULL DEFAULT '', subject_id TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL, completed_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS ai_questions (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day TEXT NOT NULL, chapter_id TEXT NOT NULL DEFAULT '', subject_id TEXT NOT NULL DEFAULT '',
    chapter_name TEXT NOT NULL DEFAULT '',
    front TEXT NOT NULL, back TEXT NOT NULL, created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
  CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON study_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_logs_user ON review_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_user_day ON tasks(user_id, day);
  CREATE INDEX IF NOT EXISTS idx_schedule_user_day ON schedule(user_id, day);
  CREATE INDEX IF NOT EXISTS idx_aiq_user_day ON ai_questions(user_id, day);
`;

// Migrations for columns added after tables were created.
const MIGRATIONS = [
  "ALTER TABLE users ADD COLUMN exam_id TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE users ADD COLUMN exam_name TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE users ADD COLUMN exam_date INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE users ADD COLUMN focus_goal INTEGER NOT NULL DEFAULT 120",
  "ALTER TABLE users ADD COLUMN ai_key TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE users ADD COLUMN country TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE users ADD COLUMN is_premium INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE chapters ADD COLUMN weight INTEGER NOT NULL DEFAULT 3",
  "ALTER TABLE chapters ADD COLUMN topics TEXT NOT NULL DEFAULT '[]'",
  "CREATE TABLE IF NOT EXISTS topic_progress (user_id TEXT NOT NULL, key TEXT NOT NULL, learned TEXT NOT NULL DEFAULT '[]', solved TEXT NOT NULL DEFAULT '[]', updated_at INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, key))",
  "ALTER TABLE study_sessions ADD COLUMN label TEXT NOT NULL DEFAULT 'learn'",
  "ALTER TABLE ai_questions ADD COLUMN chapter_name TEXT NOT NULL DEFAULT ''",
];

let migrated: Promise<void> | null = null;

async function migrate() {
  if (!migrated) {
    migrated = (async () => {
      const db = await getDb();
      // Split schema: drivers execute one statement per call.
      for (const stmt of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) {
        await db.execute(stmt);
      }
      for (const stmt of MIGRATIONS) {
        try {
          await db.execute(stmt);
        } catch {
          // column already exists
        }
      }
    })();
  }
  return migrated;
}

type Row = Record<string, unknown>;

/** SELECT many. */
export async function q<T = Row>(sql: string, ...args: unknown[]): Promise<T[]> {
  await migrate();
  const r = await (await getDb()).execute(sql, args);
  return r.rows as unknown as T[];
}

/** SELECT one. */
export async function q1<T = Row>(sql: string, ...args: unknown[]): Promise<T | undefined> {
  const rows = await q<T>(sql, ...args);
  return rows[0];
}

/** INSERT/UPDATE/DELETE. */
export async function run(sql: string, ...args: unknown[]): Promise<void> {
  await migrate();
  await (await getDb()).execute(sql, args);
}

/** Run several writes atomically. */
export async function batch(stmts: { sql: string; args: unknown[] }[]): Promise<void> {
  if (!stmts.length) return;
  await migrate();
  await (await getDb()).batch(stmts);
}

/** Delete all study data for a user (keeps the account). Fresh start, no demo data. */
export async function resetUserData(userId: string) {
  await batch([
    { sql: "DELETE FROM review_logs WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM reviews WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM cards WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM chapters WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM subjects WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM study_sessions WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM tasks WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM schedule WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM ai_questions WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM pomo_settings WHERE user_id = ?", args: [userId] },
    { sql: "INSERT INTO pomo_settings (user_id) VALUES (?)", args: [userId] },
  ]);
}
