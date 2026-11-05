// ============================================================
// controllers/bookUserController.js — Ringkasan Per Buku & Sinkronisasi
// ============================================================

const { db } = require('../config/database');
const { validateBookId, sanitize } = require('../utils/validators');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// GET /api/books/:bookId/me
// Mengembalikan status bookmark, status baca, ulasan milik user,
// dan koleksi yang memuat buku tersebut (1 round-trip)
async function getBookUserData(req, res) {
    try {
        const userId = req.user.id;
        const { bookId } = req.params;

        if (!validateBookId(bookId)) {
            return errorResponse(res, 'ID buku tidak valid', 400);
        }

        const bId = parseInt(bookId, 10);

        // 1. Cek Bookmark
        const bookmark = await db.get(
            'SELECT id, created_at FROM bookmarks WHERE user_id = ? AND book_id = ?',
            [userId, bId]
        );

        // 2. Cek Status Baca
        const statusRow = await db.get(
            'SELECT status, updated_at FROM reading_status WHERE user_id = ? AND book_id = ?',
            [userId, bId]
        );

        // 3. Cek Review Pribadi
        const review = await db.get(
            `SELECT id, rating, content, status, created_at, updated_at
             FROM reviews
             WHERE user_id = ? AND book_id = ?`,
            [userId, bId]
        );

        // 4. Koleksi user yang memuat buku ini
        const collections = await db.all(
            `SELECT c.id, c.name
             FROM collections c
             JOIN collection_items ci ON c.id = ci.collection_id
             WHERE c.user_id = ? AND ci.book_id = ?`,
            [userId, bId]
        );

        return successResponse(res, 'Data user untuk buku berhasil dimuat', {
            book_id: bId,
            is_bookmarked: !!bookmark,
            bookmark_date: bookmark ? bookmark.created_at : null,
            reading_status: statusRow ? statusRow.status : null,
            my_review: review || null,
            in_collections: collections || [],
        });
    } catch (err) {
        console.error('[getBookUserData Error]', err);
        return errorResponse(res, 'Gagal memuat status buku', 500);
    }
}

// POST /api/sync/local
// Menggabungkan data bookmark & history dari localStorage ke database
// Idempoten, batasi maksimal 50 item per kategori
async function syncLocalStorage(req, res) {
    try {
        const userId = req.user.id;
        const { bookmarks, history } = req.body;

        let syncedBookmarks = 0;
        let syncedHistory = 0;

        // 1. Sync Bookmarks
        if (Array.isArray(bookmarks)) {
            const list = bookmarks.slice(0, 50);
            for (const item of list) {
                if (!item || !item.id) continue;
                const bId = parseInt(item.id, 10);
                if (isNaN(bId) || bId <= 0) continue;

                const title   = sanitize(item.judul || item.title || 'Buku #' + bId);
                const cover   = typeof item.cover === 'string' ? item.cover.trim() : '';
                const authors = typeof item.penulis === 'string' ? sanitize(item.penulis) : '';

                try {
                    await db.run(
                        `INSERT INTO bookmarks (user_id, book_id, title, cover, authors)
                         VALUES (?, ?, ?, ?, ?)
                         ON CONFLICT(user_id, book_id) DO NOTHING`,
                        [userId, bId, title, cover, authors]
                    );
                    syncedBookmarks++;
                } catch (e) {
                    // Abaikan kegagalan per-item
                }
            }
        }

        // 2. Sync History
        if (Array.isArray(history)) {
            const list = history.slice(0, 50);
            for (const item of list) {
                if (!item || !item.id) continue;
                const bId = parseInt(item.id, 10);
                if (isNaN(bId) || bId <= 0) continue;

                const title   = sanitize(item.judul || item.title || 'Buku #' + bId);
                const cover   = typeof item.cover === 'string' ? item.cover.trim() : '';
                const authors = typeof item.penulis === 'string' ? sanitize(item.penulis) : '';

                try {
                    await db.run(
                        `INSERT INTO reading_history (user_id, book_id, title, cover, authors, last_read_at, read_count)
                         VALUES (?, ?, ?, ?, ?, datetime('now'), 1)
                         ON CONFLICT(user_id, book_id) DO UPDATE SET
                            title = excluded.title,
                            cover = excluded.cover`,
                        [userId, bId, title, cover, authors]
                    );
                    syncedHistory++;
                } catch (e) {
                    // Abaikan kegagalan per-item
                }
            }
        }

        return successResponse(res, 'Sinkronisasi data lokal selesai', {
            bookmarks_synced: syncedBookmarks,
            history_synced: syncedHistory,
        });
    } catch (err) {
        console.error('[syncLocalStorage Error]', err);
        return errorResponse(res, 'Gagal melakukan sinkronisasi data lokal', 500);
    }
}

module.exports = {
    getBookUserData,
    syncLocalStorage,
};
