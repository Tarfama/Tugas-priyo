// ============================================================
// controllers/historyController.js — Manajemen Riwayat Bacaan Terikat Akun
// ============================================================

const { db } = require('../config/database');
const { validateBookId, sanitize } = require('../utils/validators');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// GET /api/history
async function getHistory(req, res) {
    try {
        const userId = req.user.id;
        const rows = await db.all(
            `SELECT id, book_id, title, cover, authors, last_read_at, read_count
             FROM reading_history
             WHERE user_id = ?
             ORDER BY last_read_at DESC
             LIMIT 50`,
            [userId]
        );

        return successResponse(res, 'Riwayat bacaan berhasil dimuat', rows);
    } catch (err) {
        console.error('[getHistory Error]', err);
        return errorResponse(res, 'Gagal memuat riwayat', 500);
    }
}

// POST /api/history — Upsert riwayat dan naikkan read_count
async function recordHistory(req, res) {
    try {
        const userId = req.user.id;
        const { book_id, title, cover, authors } = req.body;

        if (!validateBookId(book_id)) {
            return errorResponse(res, 'ID buku tidak valid', 400);
        }
        if (!title || typeof title !== 'string' || !title.trim()) {
            return errorResponse(res, 'Judul buku wajib diisi', 400);
        }

        const bId          = parseInt(book_id, 10);
        const cleanTitle   = sanitize(title);
        const cleanCover   = typeof cover === 'string' ? cover.trim() : '';
        const cleanAuthors = typeof authors === 'string' ? sanitize(authors) : '';

        // Upsert SQLite
        await db.run(
            `INSERT INTO reading_history (user_id, book_id, title, cover, authors, last_read_at, read_count)
             VALUES (?, ?, ?, ?, ?, datetime('now'), 1)
             ON CONFLICT(user_id, book_id) DO UPDATE SET
                title        = excluded.title,
                cover        = excluded.cover,
                authors      = excluded.authors,
                last_read_at = datetime('now'),
                read_count   = reading_history.read_count + 1`,
            [userId, bId, cleanTitle, cleanCover, cleanAuthors]
        );

        return successResponse(res, 'Riwayat bacaan berhasil diperbarui', { book_id: bId }, 201);
    } catch (err) {
        console.error('[recordHistory Error]', err);
        return errorResponse(res, 'Gagal mencatat riwayat', 500);
    }
}

// DELETE /api/history/:bookId
async function removeHistoryItem(req, res) {
    try {
        const userId = req.user.id;
        const { bookId } = req.params;

        if (!validateBookId(bookId)) {
            return errorResponse(res, 'ID buku tidak valid', 400);
        }

        const result = await db.run(
            'DELETE FROM reading_history WHERE user_id = ? AND book_id = ?',
            [userId, parseInt(bookId, 10)]
        );

        return successResponse(res, 'Riwayat berhasil dihapus', {
            deleted: result.changes > 0,
            book_id: parseInt(bookId, 10)
        });
    } catch (err) {
        console.error('[removeHistoryItem Error]', err);
        return errorResponse(res, 'Gagal menghapus riwayat', 500);
    }
}

// DELETE /api/history (Hapus semua riwayat milik user)
async function clearAllHistory(req, res) {
    try {
        const userId = req.user.id;
        const result = await db.run(
            'DELETE FROM reading_history WHERE user_id = ?',
            [userId]
        );

        return successResponse(res, 'Seluruh riwayat bacaan berhasil dibersihkan', {
            total_deleted: result.changes
        });
    } catch (err) {
        console.error('[clearAllHistory Error]', err);
        return errorResponse(res, 'Gagal membersihkan riwayat', 500);
    }
}

module.exports = {
    getHistory,
    recordHistory,
    removeHistoryItem,
    clearAllHistory,
};
