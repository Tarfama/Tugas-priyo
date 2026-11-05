// ============================================================
// controllers/readingStatusController.js — Status Bacaan Buku
// ============================================================

const { db } = require('../config/database');
const { validateBookId, validateReadingStatus, sanitize } = require('../utils/validators');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// GET /api/reading-status?status=want|reading|finished
async function getReadingStatusList(req, res) {
    try {
        const userId = req.user.id;
        const { status } = req.query;

        let query = 'SELECT id, book_id, title, cover, status, updated_at FROM reading_status WHERE user_id = ?';
        const params = [userId];

        if (status && validateReadingStatus(status)) {
            query += ' AND status = ?';
            params.push(status.toLowerCase().trim());
        }

        query += ' ORDER BY updated_at DESC';

        const rows = await db.all(query, params);
        return successResponse(res, 'Daftar status bacaan berhasil dimuat', rows);
    } catch (err) {
        console.error('[getReadingStatusList Error]', err);
        return errorResponse(res, 'Gagal memuat status bacaan', 500);
    }
}

// PUT /api/reading-status/:bookId (Set atau update status, jika status null/empty bisa dihapus)
async function setReadingStatus(req, res) {
    try {
        const userId = req.user.id;
        const { bookId } = req.params;
        const { status, title, cover } = req.body;

        if (!validateBookId(bookId)) {
            return errorResponse(res, 'ID buku tidak valid', 400);
        }

        const bId = parseInt(bookId, 10);

        // Jika status kosong atau 'none', hapus statusnya
        if (!status || status === 'none') {
            await db.run('DELETE FROM reading_status WHERE user_id = ? AND book_id = ?', [userId, bId]);
            return successResponse(res, 'Status bacaan berhasil dihapus', { book_id: bId, status: null });
        }

        if (!validateReadingStatus(status)) {
            return errorResponse(res, "Status harus salah satu dari: 'want', 'reading', atau 'finished'", 400);
        }

        const cleanStatus = status.trim().toLowerCase();
        const cleanTitle  = title ? sanitize(title) : 'Buku #' + bId;
        const cleanCover  = typeof cover === 'string' ? cover.trim() : '';

        await db.run(
            `INSERT INTO reading_status (user_id, book_id, title, cover, status, updated_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'))
             ON CONFLICT(user_id, book_id) DO UPDATE SET
                status = excluded.status,
                title = CASE WHEN excluded.title IS NOT NULL AND excluded.title != '' THEN excluded.title ELSE reading_status.title END,
                cover = CASE WHEN excluded.cover IS NOT NULL AND excluded.cover != '' THEN excluded.cover ELSE reading_status.cover END,
                updated_at = datetime('now')`,
            [userId, bId, cleanTitle, cleanCover, cleanStatus]
        );

        return successResponse(res, 'Status bacaan berhasil diperbarui', {
            book_id: bId,
            status: cleanStatus
        });
    } catch (err) {
        console.error('[setReadingStatus Error]', err);
        return errorResponse(res, 'Gagal memperbarui status bacaan', 500);
    }
}

module.exports = {
    getReadingStatusList,
    setReadingStatus,
};
