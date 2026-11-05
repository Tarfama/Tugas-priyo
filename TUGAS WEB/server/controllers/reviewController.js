// ============================================================
// controllers/reviewController.js — Ulasan & Rating Buku
// ============================================================

const { db } = require('../config/database');
const { validateBookId, validateRating, sanitize } = require('../utils/validators');
const { successResponse, errorResponse, parsePagination, paginatedResponse } = require('../utils/responseHelper');

// GET /api/books/:bookId/reviews (Publik, paginasi, hanya status = 'visible')
async function getBookReviews(req, res) {
    try {
        const { bookId } = req.params;
        if (!validateBookId(bookId)) {
            return errorResponse(res, 'ID buku tidak valid', 400);
        }

        const bId = parseInt(bookId, 10);
        const { page, limit, offset } = parsePagination(req.query, 10, 50);

        // Hitung rata-rata dan total ulasan yang visible
        const stats = await db.get(
            `SELECT COUNT(id) AS total_reviews,
                    AVG(rating) AS average_rating
             FROM reviews
             WHERE book_id = ? AND status = 'visible'`,
            [bId]
        );

        const total = stats ? Number(stats.total_reviews) : 0;
        const avg   = stats && stats.average_rating ? Number(stats.average_rating.toFixed(1)) : 0;

        // Ambil daftar review
        const reviews = await db.all(
            `SELECT r.id, r.user_id, r.rating, r.content, r.created_at, r.updated_at,
                    u.username, u.full_name
             FROM reviews r
             JOIN users u ON r.user_id = u.id
             WHERE r.book_id = ? AND r.status = 'visible'
             ORDER BY r.created_at DESC
             LIMIT ? OFFSET ?`,
            [bId, limit, offset]
        );

        const totalPages = Math.ceil(total / limit) || 1;

        return res.status(200).json({
            success: true,
            message: 'Ulasan buku berhasil dimuat',
            data: reviews,
            stats: {
                average_rating: avg,
                total_reviews: total,
            },
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        });
    } catch (err) {
        console.error('[getBookReviews Error]', err);
        return errorResponse(res, 'Gagal memuat ulasan buku', 500);
    }
}

// POST /api/books/:bookId/reviews (Autentikasi, Upsert 1 ulasan per user per buku)
async function submitReview(req, res) {
    try {
        const userId = req.user.id;
        const { bookId } = req.params;
        const { rating, content, book_title } = req.body;

        if (!validateBookId(bookId)) {
            return errorResponse(res, 'ID buku tidak valid', 400);
        }
        if (!validateRating(rating)) {
            return errorResponse(res, 'Rating harus berupa angka antara 1 sampai 5', 400);
        }

        const bId = parseInt(bookId, 10);
        const intRating = parseInt(rating, 10);
        const cleanTitle = book_title ? sanitize(book_title) : 'Buku #' + bId;

        let cleanContent = '';
        if (content && typeof content === 'string') {
            const trimmed = content.trim();
            if (trimmed.length > 1000) {
                return errorResponse(res, 'Konten ulasan maksimal 1000 karakter', 400);
            }
            cleanContent = sanitize(trimmed);
        }

        // Upsert review (status default 'visible')
        const result = await db.run(
            `INSERT INTO reviews (user_id, book_id, book_title, rating, content, status, updated_at)
             VALUES (?, ?, ?, ?, ?, 'visible', datetime('now'))
             ON CONFLICT(user_id, book_id) DO UPDATE SET
                rating = excluded.rating,
                content = excluded.content,
                book_title = excluded.book_title,
                status = 'visible',
                updated_at = datetime('now')`,
            [userId, bId, cleanTitle, intRating, cleanContent]
        );

        return successResponse(res, 'Ulasan Anda berhasil disimpan', {
            id: result.lastID,
            book_id: bId,
            rating: intRating,
            content: cleanContent,
        }, 201);
    } catch (err) {
        console.error('[submitReview Error]', err);
        return errorResponse(res, 'Gagal menyimpan ulasan', 500);
    }
}

// DELETE /api/reviews/:id (Hanya pemilik ulasan atau admin yang boleh hapus)
async function deleteReview(req, res) {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const reviewId = parseInt(req.params.id, 10);

        if (isNaN(reviewId) || reviewId <= 0) {
            return errorResponse(res, 'ID ulasan tidak valid', 400);
        }

        const review = await db.get('SELECT id, user_id FROM reviews WHERE id = ?', [reviewId]);
        if (!review) {
            return errorResponse(res, 'Ulasan tidak ditemukan', 404);
        }

        // Verifikasi izin
        if (review.user_id !== userId && userRole !== 'admin') {
            return errorResponse(res, 'Anda tidak memiliki hak untuk menghapus ulasan ini', 403);
        }

        await db.run('DELETE FROM reviews WHERE id = ?', [reviewId]);

        return successResponse(res, 'Ulasan berhasil dihapus', { id: reviewId });
    } catch (err) {
        console.error('[deleteReview Error]', err);
        return errorResponse(res, 'Gagal menghapus ulasan', 500);
    }
}

// GET /api/me/reviews (Daftar semua ulasan yang ditulis oleh user yang sedang login)
async function getMyReviews(req, res) {
    try {
        const userId = req.user.id;
        const rows = await db.all(
            `SELECT id, book_id, book_title, rating, content, status, created_at, updated_at
             FROM reviews
             WHERE user_id = ?
             ORDER BY updated_at DESC`,
            [userId]
        );

        return successResponse(res, 'Daftar ulasan saya berhasil dimuat', rows);
    } catch (err) {
        console.error('[getMyReviews Error]', err);
        return errorResponse(res, 'Gagal memuat ulasan Anda', 500);
    }
}

module.exports = {
    getBookReviews,
    submitReview,
    deleteReview,
    getMyReviews,
};
