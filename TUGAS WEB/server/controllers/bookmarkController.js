// ============================================================
// controllers/bookmarkController.js — Manajemen Bookmark Terikat Akun
// ============================================================

const { db } = require('../config/database');
const { validateBookId, sanitize } = require('../utils/validators');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// GET /api/bookmarks
async function getBookmarks(req, res) {
    try {
        const userId = req.user.id;
        const rows = await db.all(
            `SELECT id, book_id, title, cover, authors, created_at
             FROM bookmarks
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [userId]
        );

        return successResponse(res, 'Daftar bookmark berhasil dimuat', rows);
    } catch (err) {
        console.error('[getBookmarks Error]', err);
        return errorResponse(res, 'Gagal memuat bookmark', 500);
    }
}

// POST /api/bookmarks
async function addBookmark(req, res) {
    try {
        const userId = req.user.id;
        const { book_id, title, cover, authors } = req.body;

        if (!validateBookId(book_id)) {
            return errorResponse(res, 'ID buku tidak valid', 400);
        }
        if (!title || typeof title !== 'string' || !title.trim()) {
            return errorResponse(res, 'Judul buku wajib diisi', 400);
        }

        const cleanTitle   = sanitize(title);
        const cleanCover   = typeof cover === 'string' ? cover.trim() : '';
        const cleanAuthors = typeof authors === 'string' ? sanitize(authors) : '';

        // Insert or ignore if exists
        const result = await db.run(
            `INSERT INTO bookmarks (user_id, book_id, title, cover, authors)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(user_id, book_id) DO UPDATE SET
                title = excluded.title,
                cover = excluded.cover,
                authors = excluded.authors`,
            [userId, parseInt(book_id, 10), cleanTitle, cleanCover, cleanAuthors]
        );

        return successResponse(res, 'Buku berhasil ditambahkan ke bookmark', {
            id: result.lastID,
            book_id: parseInt(book_id, 10),
            title: cleanTitle
        }, 201);
    } catch (err) {
        console.error('[addBookmark Error]', err);
        return errorResponse(res, 'Gagal menyimpan bookmark', 500);
    }
}

// DELETE /api/bookmarks/:bookId
async function removeBookmark(req, res) {
    try {
        const userId = req.user.id;
        const { bookId } = req.params;

        if (!validateBookId(bookId)) {
            return errorResponse(res, 'ID buku tidak valid', 400);
        }

        const result = await db.run(
            'DELETE FROM bookmarks WHERE user_id = ? AND book_id = ?',
            [userId, parseInt(bookId, 10)]
        );

        return successResponse(res, 'Bookmark berhasil dihapus', {
            deleted: result.changes > 0,
            book_id: parseInt(bookId, 10)
        });
    } catch (err) {
        console.error('[removeBookmark Error]', err);
        return errorResponse(res, 'Gagal menghapus bookmark', 500);
    }
}

module.exports = {
    getBookmarks,
    addBookmark,
    removeBookmark,
};
