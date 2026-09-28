import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dir = path.join(process.cwd(), "data");
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const globalForDb = globalThis as unknown as { __stokeDb?: Database.Database };

function init(): Database.Database {
  const db = new Database(path.join(dir, "stoke.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
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
    CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
    CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON study_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_logs_user ON review_logs(user_id);
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'review',
      ref_id TEXT NOT NULL DEFAULT '', ref_subject TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '',
      quadrant TEXT NOT NULL DEFAULT 'q2', status TEXT NOT NULL DEFAULT 'open',
      source TEXT NOT NULL DEFAULT 'auto', count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL, completed_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_user_day ON tasks(user_id, day);
    CREATE TABLE IF NOT EXISTS schedule (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'learn',
      chapter_id TEXT NOT NULL DEFAULT '', subject_id TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open',
      created_at INTEGER NOT NULL, completed_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_schedule_user_day ON schedule(user_id, day);
    CREATE TABLE IF NOT EXISTS ai_questions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day TEXT NOT NULL, chapter_id TEXT NOT NULL DEFAULT '', subject_id TEXT NOT NULL DEFAULT '',
      chapter_name TEXT NOT NULL DEFAULT '',
      front TEXT NOT NULL, back TEXT NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_aiq_user_day ON ai_questions(user_id, day);
  `);
  // Lightweight migrations for databases created before these columns/tables existed.
  const cols = (t: string) => new Set(
    (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((c) => c.name)
  );
  try {
    const u = cols("users");
    if (!u.has("exam_id")) db.exec("ALTER TABLE users ADD COLUMN exam_id TEXT NOT NULL DEFAULT ''");
    if (!u.has("exam_name")) db.exec("ALTER TABLE users ADD COLUMN exam_name TEXT NOT NULL DEFAULT ''");
    if (!u.has("exam_date")) db.exec("ALTER TABLE users ADD COLUMN exam_date INTEGER NOT NULL DEFAULT 0");
    const ch = cols("chapters");
    if (!ch.has("weight")) db.exec("ALTER TABLE chapters ADD COLUMN weight INTEGER NOT NULL DEFAULT 3");
    try {
      const ss = db.prepare("PRAGMA table_info(study_sessions)").all() as { name: string }[];
      if (!ss.some((c) => c.name === "label")) db.exec("ALTER TABLE study_sessions ADD COLUMN label TEXT NOT NULL DEFAULT 'learn'");
    } catch { /* ignore */ }
    if (!u.has("focus_goal")) db.exec("ALTER TABLE users ADD COLUMN focus_goal INTEGER NOT NULL DEFAULT 120");
    if (!u.has("ai_key")) db.exec("ALTER TABLE users ADD COLUMN ai_key TEXT NOT NULL DEFAULT ''");
    try {
      const aq = db.prepare("PRAGMA table_info(ai_questions)").all() as { name: string }[];
      if (aq.length && !aq.some((c) => c.name === "chapter_name")) db.exec("ALTER TABLE ai_questions ADD COLUMN chapter_name TEXT NOT NULL DEFAULT ''");
    } catch { /* ignore */ }
  } catch { /* ignore migration errors */ }
  return db;
}

export function getDb(): Database.Database {
  if (!globalForDb.__stokeDb) globalForDb.__stokeDb = init();
  return globalForDb.__stokeDb;
}

/** Delete all study data for a user (keeps the account). Fresh start, no demo data. */
export function resetUserData(userId: string) {
  const db = getDb();
  const t = db.transaction(() => {
    db.prepare("DELETE FROM review_logs WHERE user_id=?").run(userId);
    db.prepare("DELETE FROM reviews WHERE user_id=?").run(userId);
    db.prepare("DELETE FROM cards WHERE user_id=?").run(userId);
    db.prepare("DELETE FROM chapters WHERE user_id=?").run(userId);
    db.prepare("DELETE FROM subjects WHERE user_id=?").run(userId);
    db.prepare("DELETE FROM study_sessions WHERE user_id=?").run(userId);
    db.prepare("DELETE FROM tasks WHERE user_id=?").run(userId);
    db.prepare("DELETE FROM schedule WHERE user_id=?").run(userId);
    db.prepare("DELETE FROM ai_questions WHERE user_id=?").run(userId);
    db.prepare("DELETE FROM pomo_settings WHERE user_id=?").run(userId);
    db.prepare("INSERT INTO pomo_settings (user_id) VALUES (?)").run(userId);
  });
  t();
}
