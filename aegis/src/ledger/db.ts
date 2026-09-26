import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = process.env.AEGIS_DB_PATH ?? path.join(DATA_DIR, "aegis.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS runs (
  seq                  INTEGER PRIMARY KEY AUTOINCREMENT,
  id                   TEXT    NOT NULL UNIQUE,
  created_at           TEXT    NOT NULL,
  agent                TEXT    NOT NULL,
  channel              TEXT    NOT NULL,
  decision             TEXT    NOT NULL CHECK (decision IN ('ALLOW','FLAG','BLOCK')),
  released             INTEGER NOT NULL,
  blocked_before_agent INTEGER NOT NULL,
  reason               TEXT    NOT NULL,
  input                TEXT    NOT NULL,
  reasoning            TEXT,
  output               TEXT,
  input_gate           TEXT    NOT NULL,
  output_gate          TEXT,
  judge_model          TEXT    NOT NULL,
  mocked               INTEGER NOT NULL,
  latency_ms           INTEGER NOT NULL,
  input_tokens         INTEGER,
  output_tokens        INTEGER,
  use_class            TEXT,
  primary_article      TEXT,
  compliance_score     REAL,
  prev_hash            TEXT    NOT NULL,
  hash                 TEXT    NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS runs_created_at ON runs (created_at DESC);
CREATE INDEX IF NOT EXISTS runs_decision   ON runs (decision);
CREATE INDEX IF NOT EXISTS runs_agent      ON runs (agent);
`;

type Global = typeof globalThis & { __aegisDb?: Database.Database };

function open(): Database.Database {
  mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const db = new Database(DB_FILE);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

function migrate(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(runs)").all() as Array<{ name: string }>;
  const names = new Set(columns.map((column) => column.name));
  if (!names.has("browser")) db.exec("ALTER TABLE runs ADD COLUMN browser TEXT");
  if (!names.has("customer")) db.exec("ALTER TABLE runs ADD COLUMN customer TEXT");
  if (!names.has("alert")) db.exec("ALTER TABLE runs ADD COLUMN alert TEXT");

  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id         TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      status     TEXT NOT NULL,
      summary    TEXT NOT NULL,
      output     TEXT
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      id           TEXT PRIMARY KEY,
      created_at   TEXT NOT NULL,
      plan_id      TEXT NOT NULL,
      email        TEXT NOT NULL,
      status       TEXT NOT NULL,
      checkout_url TEXT,
      note         TEXT
    );
    CREATE TABLE IF NOT EXISTS handoffs (
      id          TEXT PRIMARY KEY,
      created_at  TEXT NOT NULL,
      task        TEXT NOT NULL,
      status      TEXT NOT NULL,
      prompt      TEXT NOT NULL,
      session_url TEXT,
      note        TEXT
    );
    CREATE TABLE IF NOT EXISTS feedback (
      id         TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      event_id   TEXT,
      event_name TEXT,
      event_url  TEXT,
      rating     INTEGER NOT NULL,
      message    TEXT NOT NULL,
      status     TEXT NOT NULL,
      note       TEXT
    );
    CREATE TABLE IF NOT EXISTS agent_usage (
      id                 TEXT PRIMARY KEY,
      created_at         TEXT NOT NULL,
      run_id             TEXT,
      agent              TEXT NOT NULL,
      provider           TEXT NOT NULL,
      model              TEXT,
      prompt_tokens      INTEGER NOT NULL,
      completion_tokens  INTEGER NOT NULL,
      note               TEXT
    );
  `);
}

/** One connection per process. Survives Next.js hot reloads via globalThis. */
export function getDb(): Database.Database {
  const g = globalThis as Global;
  if (!g.__aegisDb) {
    g.__aegisDb = open();
  }
  migrate(g.__aegisDb);
  return g.__aegisDb;
}

export const DB_PATH = DB_FILE;
