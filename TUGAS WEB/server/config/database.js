// ============================================================
// config/database.js — Konfigurasi SQLite (Auto-setup & Universal)
// ============================================================

const path = require('path');
const fs   = require('fs');
require('dotenv').config();

let bcrypt;
try {
    bcrypt = require('bcryptjs');
} catch {
    bcrypt = require('bcrypt');
}

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
 * Helper untuk menambahkan kolom baru secara aman jika belum ada
 */
async function addColumnIfNotExists(table, column, definition) {
    try {
        const columns = await db.all(`PRAGMA table_info(${table})`);
        const exists = columns.some(c => c.name.toLowerCase() === column.toLowerCase());
        if (!exists) {
            await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
            console.log(`ℹ️ Kolom baru ditambahkan: ${table}.${column}`);
        }
    } catch (err) {
        console.warn(`Peringatan saat menambahkan kolom ${table}.${column}:`, err.message);
    }
}

/**
 * Seed admin pertama jika belum ada akun dengan role admin
 */
async function seedInitialAdmin() {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminUsername = process.env.ADMIN_USERNAME;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminUsername || !adminPassword) {
            return;
        }

        const existingAdmin = await db.get("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (existingAdmin) {
            return; // Sudah ada admin, tidak perlu seed lagi
        }

        // Cek apakah email atau username sudah terdaftar sebagai user biasa
        const cleanEmail = adminEmail.trim().toLowerCase();
        const cleanUsername = adminUsername.trim().toLowerCase();

        const existingUser = await db.get(
            "SELECT id FROM users WHERE email = ? OR username = ?",
            [cleanEmail, cleanUsername]
        );

        if (existingUser) {
            // Promosikan ke admin
            await db.run(
                "UPDATE users SET role = 'admin', is_active = 1 WHERE id = ?",
                [existingUser.id]
            );
            console.log(`👑 User '${cleanUsername}' dipromosikan menjadi Admin pertama.`);
        } else {
            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
            const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

            await db.run(
                `INSERT INTO users (username, email, password_hash, role, is_active, full_name)
                 VALUES (?, ?, ?, 'admin', 1, 'Administrator')`,
                [cleanUsername, cleanEmail, passwordHash]
            );
            console.log(`👑 Akun Admin pertama berhasil dibuat: ${cleanUsername} (${cleanEmail})`);
        }
    } catch (err) {
        console.error('❌ Gagal melakukan seed admin:', err.message);
    }
}

/**
 * Inisialisasi struktur tabel database secara otomatis saat server mulai.
 */
async function initDb() {
    try {
        // Aktifkan Foreign Keys
        await db.exec('PRAGMA foreign_keys = ON;');

        // 1. Buat tabel users dasar jika belum ada
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

        // 2. Tambah kolom baru ke users jika belum ada
        await addColumnIfNotExists('users', 'role', "TEXT NOT NULL DEFAULT 'user'");
        await addColumnIfNotExists('users', 'is_active', "INTEGER NOT NULL DEFAULT 1");
        await addColumnIfNotExists('users', 'full_name', "TEXT");
        await addColumnIfNotExists('users', 'bio', "TEXT");
        await addColumnIfNotExists('users', 'last_login_at', "DATETIME");

        // 3. Buat tabel-tabel fitur baru
        await db.exec(`
            -- Bookmarks
            CREATE TABLE IF NOT EXISTS bookmarks (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER NOT NULL,
                book_id    INTEGER NOT NULL,
                title      TEXT NOT NULL,
                cover      TEXT,
                authors    TEXT,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, book_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);

            -- Reading History
            CREATE TABLE IF NOT EXISTS reading_history (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id      INTEGER NOT NULL,
                book_id      INTEGER NOT NULL,
                title        TEXT NOT NULL,
                cover        TEXT,
                authors      TEXT,
                last_read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                read_count   INTEGER NOT NULL DEFAULT 1,
                UNIQUE(user_id, book_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_history_user ON reading_history(user_id);

            -- Reading Status
            CREATE TABLE IF NOT EXISTS reading_status (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER NOT NULL,
                book_id    INTEGER NOT NULL,
                title      TEXT NOT NULL,
                cover      TEXT,
                status     TEXT NOT NULL CHECK(status IN ('want', 'reading', 'finished')),
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, book_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_reading_status_user ON reading_status(user_id, status);

            -- Collections
            CREATE TABLE IF NOT EXISTS collections (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL,
                name        TEXT NOT NULL,
                description TEXT,
                created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id);

            -- Collection Items
            CREATE TABLE IF NOT EXISTS collection_items (
                collection_id INTEGER NOT NULL,
                book_id       INTEGER NOT NULL,
                title         TEXT NOT NULL,
                cover         TEXT,
                added_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (collection_id, book_id),
                FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
            );

            -- Reviews
            CREATE TABLE IF NOT EXISTS reviews (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER NOT NULL,
                book_id    INTEGER NOT NULL,
                book_title TEXT NOT NULL,
                rating     INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                content    TEXT,
                status     TEXT NOT NULL DEFAULT 'visible' CHECK(status IN ('visible', 'hidden')),
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, book_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_reviews_book ON reviews(book_id, status);
            CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);

            -- Featured Books
            CREATE TABLE IF NOT EXISTS featured_books (
                book_id    INTEGER PRIMARY KEY,
                title      TEXT NOT NULL,
                cover      TEXT,
                authors    TEXT,
                note       TEXT,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_by INTEGER,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            );

            -- Hidden Books
            CREATE TABLE IF NOT EXISTS hidden_books (
                book_id    INTEGER PRIMARY KEY,
                title      TEXT,
                reason     TEXT,
                created_by INTEGER,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            );

            -- Announcements
            CREATE TABLE IF NOT EXISTS announcements (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                title      TEXT NOT NULL,
                content    TEXT NOT NULL,
                is_active  INTEGER NOT NULL DEFAULT 1,
                created_by INTEGER,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            );

            -- Audit Logs
            CREATE TABLE IF NOT EXISTS audit_logs (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id    INTEGER,
                action      TEXT NOT NULL,
                target_type TEXT NOT NULL,
                target_id   TEXT,
                detail      TEXT,
                created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
        `);

        // 4. Seed admin jika env tersedia dan belum ada admin
        await seedInitialAdmin();

        console.log(`✅ Database SQLite terhubung (${engineName})`);
        console.log(`📁 File database: ${dbPath}`);
    } catch (error) {
        console.error('❌ Gagal inisialisasi database SQLite:', error.message);
        throw error;
    }
}

module.exports = { db, initDb, dbPath };
