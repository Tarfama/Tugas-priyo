-- ============================================================
-- Migration: Schema tabel `users` (SQLite)
-- CATATAN: Server sudah otomatis membuat tabel ini saat dijalankan (auto-init)!
-- File ini disediakan sebagai dokumentasi/referensi schema.
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    -- Primary key auto increment pada SQLite
    id            INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Username unik (case-sensitive)
    username      TEXT    NOT NULL UNIQUE,

    -- Email unik (case-insensitive berkat COLLATE NOCASE)
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,

    -- Password hash (bcrypt hash ~60 karakter)
    -- JANGAN PERNAH simpan plain-text password!
    password_hash TEXT    NOT NULL,

    -- Timestamp otomatis
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk mempercepat query pencarian login
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
