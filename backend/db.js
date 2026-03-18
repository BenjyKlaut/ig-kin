// backend/db.js
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

async function initDb(options = {}) {
  // options.dbPath override sinon variable d'env sinon fallback dans le dossier courant
  const dbPath =
    options.dbPath || process.env.DB_PATH || path.resolve(__dirname, "data.db");

  // s'assurer que le répectoire existe
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = await open({ filename: dbPath, driver: sqlite3.Database });

  await db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      matricule TEXT UNIQUE,
      password_hash TEXT,
      display_name TEXT,
      role TEXT,
      created_at TEXT
    );

    -- Drop and recreate reports table to ensure schema is correct
    DROP TABLE IF EXISTS reports;
    CREATE TABLE reports (
      id TEXT PRIMARY KEY,
      author_id TEXT,
      numero_rapport TEXT NOT NULL,
      district TEXT NOT NULL,
      commune TEXT NOT NULL,
      quartier TEXT,
      date_faits TEXT NOT NULL,
      situation TEXT,
      details_situation TEXT,
      resume TEXT,
      contenu TEXT,
      degats TEXT,
      mesures_prises TEXT,
      created_at TEXT,
      FOREIGN KEY(author_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      report_id TEXT,
      action TEXT,
      action_data TEXT,
      ip_address TEXT,
      created_at TEXT
    );
  `);

  // Saisir un utilisateur de démonstration si aucun n'existe.
  const row = await db.get("SELECT COUNT(1) as c FROM users");
  if (!row || row.c === 0) {
    const pwdHash = await bcrypt.hash("password123", 10);
    const id = uuidv4();
    await db.run(
      "INSERT INTO users(id, matricule, password_hash, display_name, role, created_at) VALUES (?,?,?,?,?,?)",
      id,
      "AGENT001",
      pwdHash,
      "Agent Demo",
      "agent",
      new Date().toISOString(),
    );
    console.log("Seeded demo user: matricule=AGENT001 password=password123");
  }

  return db;
}

module.exports = initDb;
