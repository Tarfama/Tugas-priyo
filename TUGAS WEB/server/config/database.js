// ============================================================
// config/database.js — Konfigurasi SQLite (Auto-setup & Universal)
// ============================================================
// Database tersimpan dalam satu file lokal (myperpus.sqlite).
// Keunggulan untuk project & teman Anda:
//   ✅ TIDAK PERLU install XAMPP / MySQL / server database apapun.
//   ✅ Database & tabel users otomatis dibuat saat server dijalankan.
//   ✅ Mendukung built-in `node:sqlite` (Node.js 22+) tanpa modul eksternal,
//      serta fallback ke `sqlite3` jika menggunakan Node.js versi lama.
// ============================================================

const path = require('path');
const fs   = require('fs');
require('dotenv').config();

// Lokasi penyimpanan database SQLite
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'myperpus.sqlite');

// Pastikan folder penyimpanan (server/data) ada
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

let db;
let engineName = '';

// Deteksi & inisialisasi driver SQLite
try {
    // 1. Coba gunakan built-in SQLite dari Node.js (v22.5.0+)
    const { DatabaseSync } = require('node:sqlite');
    const syncDb = new DatabaseSync(dbPath);
    engineName = 'Node.js built-in (node:sqlite)';

    db = {
        async get(sql, params = []) {
            const stmt = syncDb.prepare(sql);
            return stmt.get(...params);
        },
        async all(sql, params = []) {
            const stmt = syncDb.prepare(sql);
            return stmt.all(...params);
        },
        async run(sql, params = []) {
            const stmt = syncDb.prepare(sql);
            const info = stmt.run(...params);
            return {
                lastID: Number(info.lastInsertRowid),
                changes: Number(info.changes),
            };
        },
        async exec(sql) {
            syncDb.exec(sql);
        },
    };
} catch {
    // 2. Fallback untuk Node.js versi di bawah 22 (menggunakan package sqlite3)
    const sqlite3 = require('sqlite3').verbose();
    const rawDb = new sqlite3.Database(dbPath);
    engineName = 'sqlite3 (npm package)';

    db = {
        get(sql, params = []) {
            return new Promise((resolve, reject) => {
                rawDb.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
            });
        },
        all(sql, params = []) {
            return new Promise((resolve, reject) => {
                rawDb.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
            });
        },
        run(sql, params = []) {
            return new Promise(function (resolve, reject) {
                rawDb.run(sql, params, function (err) {
                    if (err) return reject(err);
                    resolve({ lastID: this.lastID, changes: this.changes });
                });
            });
        },
        exec(sql) {
            return new Promise((resolve, reject) => {
                rawDb.exec(sql, (err) => err ? reject(err) : resolve());
            });
        },
    };
}

/**
 * Inisialisasi struktur tabel database secara otomatis saat server mulai.
 * Teman Anda tidak perlu repot import file SQL manual!
 */
async function initDb() {
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                username      TEXT    NOT NULL UNIQUE,
                email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT    NOT NULL,
                created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
            CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
        `);

        console.log(`✅ Database SQLite terhubung (${engineName})`);
        console.log(`📁 File database: ${dbPath}`);
    } catch (error) {
        console.error('❌ Gagal inisialisasi database SQLite:', error.message);
        throw error;
    }
}

module.exports = { db, initDb, dbPath };
