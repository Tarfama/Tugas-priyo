-- ============================================================
-- 002_user_and_admin_features.sql
-- Dokumentasi migrasi skema lengkap MYPERPUS (User & Admin)
-- Database: SQLite 3 / Node:SQLite
-- ============================================================

PRAGMA foreign_keys = ON;

-- 1. Penambahan kolom pada tabel users
-- ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
-- ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
-- ALTER TABLE users ADD COLUMN full_name TEXT;
-- ALTER TABLE users ADD COLUMN bio TEXT;
-- ALTER TABLE users ADD COLUMN last_login_at DATETIME;

-- 2. Tabel Bookmarks
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

-- 3. Tabel Reading History
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

-- 4. Tabel Reading Status ('want', 'reading', 'finished')
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

-- 5. Tabel Collections (Rak / Kategori Pribadi)
CREATE TABLE IF NOT EXISTS collections (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id);

-- 6. Tabel Collection Items
CREATE TABLE IF NOT EXISTS collection_items (
    collection_id INTEGER NOT NULL,
    book_id       INTEGER NOT NULL,
    title         TEXT NOT NULL,
    cover         TEXT,
    added_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection_id, book_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

-- 7. Tabel Reviews & Ratings
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

-- 8. Tabel Featured Books (Buku Pilihan Admin)
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

-- 9. Tabel Hidden Books (Buku yang disembunyikan admin)
CREATE TABLE IF NOT EXISTS hidden_books (
    book_id    INTEGER PRIMARY KEY,
    title      TEXT,
    reason     TEXT,
    created_by INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 10. Tabel Announcements (Pengumuman)
CREATE TABLE IF NOT EXISTS announcements (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    content    TEXT NOT NULL,
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 11. Tabel Audit Logs
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
