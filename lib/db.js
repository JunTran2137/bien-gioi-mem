// @ts-check
const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

/** @type {import('better-sqlite3').Database | null} */
let _db = null;

function getDb() {
  if (!_db) {
    const dbPath = process.env.DATABASE_PATH || './data/db.sqlite';
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

function initDatabase() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      uid         TEXT PRIMARY KEY,
      email       TEXT UNIQUE NOT NULL,
      name        TEXT NOT NULL,
      avatar      TEXT,
      group_id    TEXT,
      total_score INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS groups (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL UNIQUE,
      total_score  INTEGER DEFAULT 0,
      member_count INTEGER DEFAULT 0,
      created_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quiz_sessions (
      id           TEXT PRIMARY KEY,
      room_code    TEXT NOT NULL,
      status       TEXT DEFAULT 'waiting',
      started_at   TEXT,
      ended_at     TEXT
    );

    CREATE TABLE IF NOT EXISTS quiz_scores (
      session_id TEXT,
      uid        TEXT,
      score      INTEGER DEFAULT 0,
      PRIMARY KEY (session_id, uid)
    );

    CREATE TABLE IF NOT EXISTS debate_sessions (
      id         TEXT PRIMARY KEY,
      room_code  TEXT NOT NULL,
      status     TEXT DEFAULT 'waiting',
      topic_id   TEXT,
      started_at TEXT,
      ended_at   TEXT
    );

    CREATE TABLE IF NOT EXISTS debate_votes (
      session_id  TEXT,
      voter_uid   TEXT,
      voted_group TEXT,
      PRIMARY KEY (session_id, voter_uid)
    );

    CREATE INDEX IF NOT EXISTS idx_users_group ON users(group_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_sessions_ended ON quiz_sessions(ended_at);
    CREATE INDEX IF NOT EXISTS idx_debate_sessions_ended ON debate_sessions(ended_at);
  `);
}

function recountGroupMembers() {
  const db = getDb();
  db.exec(`
    UPDATE groups
    SET member_count = (SELECT COUNT(*) FROM users WHERE users.group_id = groups.id)
  `);
}

module.exports = { getDb, initDatabase, recountGroupMembers };
