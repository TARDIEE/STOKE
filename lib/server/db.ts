import { createClient, type Client } from "@libsql/client";
import path from "path";
import fs from "fs";

/**
 * Database: Turso (libSQL) in production, local SQLite file in dev.
 * Set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN on Vercel — without them the app
 * falls back to data/stoke.db, which Vercel's filesystem wipes on every deploy.
 */

function client(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  return createClient({ url: writableFileUrl() });
}

/** Local SQLite file. Vercel's filesystem is read-only except /tmp, so fall
 *  back there instead of crashing (still ephemeral — set TURSO_* for real persistence). */
function writableFileUrl(): string {
  const dir = path.join(process.cwd(), "data");
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return `file:${path.join(dir, "stoke.db")}`;
  } catch {
    return "file:/tmp/stoke.db";
  }
}

/** Which database backend is in use (shown by /api/health). */
export function dbKind(): "turso" | "file" {
  return process.env.TURSO_DATABASE_URL ? "turso" : "file";
}

/**
 * True when data cannot survive: serverless platforms (Vercel) wipe local
 * files on every request, so each request can land on a different EMPTY
 * database — logins die instantly. Admin fix: set TURSO_* env vars.
 */
export function isEphemeral(): boolean {
  return !process.env.TURSO_DATABASE_URL && process.env.VERCEL === "1";
}

const globalForDb = globalThis as unknown as { __stokeClient?: Client };
export function getDb(): Client {
  if (!globalForDb.__stokeClient) globalForDb.__stokeClient = client();
  return globalForDb.__stokeClient;
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
  "ALTER TABLE chapters ADD COLUMN weight INTEGER NOT NULL DEFAULT 3",
  "ALTER TABLE study_sessions ADD COLUMN label TEXT NOT NULL DEFAULT 'learn'",
  "ALTER TABLE ai_questions ADD COLUMN chapter_name TEXT NOT NULL DEFAULT ''",
];

let migrated: Promise<void> | null = null;

async function migrate() {
  if (!migrated) {
    migrated = (async () => {
      const db = getDb();
      // Split schema: libsql executes one statement per call.
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
  const r = await getDb().execute({ sql, args: args as never[] });
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
  await getDb().execute({ sql, args: args as never[] });
}

/** Run several writes atomically. */
export async function batch(stmts: { sql: string; args: unknown[] }[]): Promise<void> {
  if (!stmts.length) return;
  await migrate();
  await getDb().batch(
    stmts.map((s) => ({ sql: s.sql, args: s.args as (string | number | boolean | null)[] }))
  );
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
