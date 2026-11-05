// ============================================================
// controllers/adminController.js — Fitur Khusus Administrator
// ============================================================

const { db } = require('../config/database');
const { recordAuditLog } = require('../middleware/authMiddleware');
const { validateBookId, sanitize } = require('../utils/validators');
const { successResponse, errorResponse, parsePagination, paginatedResponse } = require('../utils/responseHelper');

// ─────────────────────────────────────────────────────────────
// 1. DASHBOARD & STATISTIK
// ─────────────────────────────────────────────────────────────
// GET /api/admin/stats
async function getAdminStats(req, res) {
    try {
        // Total user & user baru 7 hari
        const totalUsers = await db.get('SELECT COUNT(id) AS total FROM users');
        const newUsers7Days = await db.get(
            "SELECT COUNT(id) AS total FROM users WHERE created_at >= datetime('now', '-7 days')"
        );

        // Total bookmark & review
        const totalBookmarks = await db.get('SELECT COUNT(id) AS total FROM bookmarks');
        const totalReviews   = await db.get('SELECT COUNT(id) AS total FROM reviews');
        const totalHidden    = await db.get('SELECT COUNT(book_id) AS total FROM hidden_books');
        const totalFeatured  = await db.get('SELECT COUNT(book_id) AS total FROM featured_books');

        // 5 Buku paling banyak di-bookmark
        const topBookmarked = await db.all(
            `SELECT book_id, title, cover, COUNT(user_id) AS bookmark_count
             FROM bookmarks
             GROUP BY book_id
             ORDER BY bookmark_count DESC
             LIMIT 5`
        );

        // 5 Buku dengan ulasan terbanyak
        const topReviewed = await db.all(
            `SELECT book_id, book_title AS title, COUNT(id) AS review_count, AVG(rating) AS avg_rating
             FROM reviews
             GROUP BY book_id
             ORDER BY review_count DESC
             LIMIT 5`
        );

        // Aktivitas 7 hari terakhir (gabungan registrasi, bookmark, ulasan)
        const recentLogs = await db.all(
            `SELECT al.id, al.action, al.target_type, al.target_id, al.detail, al.created_at,
                    u.username AS admin_username
             FROM audit_logs al
             LEFT JOIN users u ON al.admin_id = u.id
             ORDER BY al.created_at DESC
             LIMIT 10`
        );

        return successResponse(res, 'Statistik admin berhasil dimuat', {
            overview: {
                total_users: totalUsers ? Number(totalUsers.total) : 0,
                new_users_7_days: newUsers7Days ? Number(newUsers7Days.total) : 0,
                total_bookmarks: totalBookmarks ? Number(totalBookmarks.total) : 0,
                total_reviews: totalReviews ? Number(totalReviews.total) : 0,
                total_hidden_books: totalHidden ? Number(totalHidden.total) : 0,
                total_featured_books: totalFeatured ? Number(totalFeatured.total) : 0,
            },
            top_bookmarked: topBookmarked,
            top_reviewed: topReviewed.map(r => ({
                ...r,
                avg_rating: r.avg_rating ? Number(Number(r.avg_rating).toFixed(1)) : 0
            })),
            recent_logs: recentLogs,
        });
    } catch (err) {
        console.error('[getAdminStats Error]', err);
        return errorResponse(res, 'Gagal memuat statistik admin', 500);
    }
}

// ─────────────────────────────────────────────────────────────
// 2. MANAJEMEN PENGGUNA
// ─────────────────────────────────────────────────────────────
// GET /api/admin/users?q=&role=&status=&page=
async function getUsersList(req, res) {
    try {
        const { q, role, status } = req.query;
        const { page, limit, offset } = parsePagination(req.query, 10, 50);

        let whereClauses = [];
        let params       = [];

        if (q && typeof q === 'string' && q.trim()) {
            whereClauses.push('(username LIKE ? OR email LIKE ? OR full_name LIKE ?)');
            const search = `%${q.trim()}%`;
            params.push(search, search, search);
        }

        if (role && (role === 'user' || role === 'admin')) {
            whereClauses.push('role = ?');
            params.push(role);
        }

        if (status !== undefined && status !== '') {
            const isActiveNum = parseInt(status, 10) === 1 ? 1 : 0;
            whereClauses.push('is_active = ?');
            params.push(isActiveNum);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Hitung total
        const countRow = await db.get(
            `SELECT COUNT(id) AS total FROM users ${whereSql}`,
            params
        );
        const total = countRow ? Number(countRow.total) : 0;

        // Ambil data
        const rows = await db.all(
            `SELECT id, username, email, role, is_active, full_name, bio, last_login_at, created_at
             FROM users
             ${whereSql}
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return paginatedResponse(res, 'Daftar pengguna berhasil dimuat', rows, total, page, limit);
    } catch (err) {
        console.error('[getUsersList Error]', err);
        return errorResponse(res, 'Gagal memuat daftar pengguna', 500);
    }
}

// PATCH /api/admin/users/:id (Ubah role atau is_active)
async function updateUserStatus(req, res) {
    try {
        const adminId = req.user.id;
        const targetUserId = parseInt(req.params.id, 10);
        const { role, is_active } = req.body;

        if (isNaN(targetUserId) || targetUserId <= 0) {
            return errorResponse(res, 'ID pengguna tidak valid', 400);
        }

        const targetUser = await db.get('SELECT id, username, email, role, is_active FROM users WHERE id = ?', [targetUserId]);
        if (!targetUser) {
            return errorResponse(res, 'Pengguna tidak ditemukan', 404);
        }

        // ATURAN KRITIS: Admin tidak boleh menurunkan atau menonaktifkan dirinya sendiri
        if (targetUserId === adminId) {
            if ((role && role !== 'admin') || (is_active !== undefined && Number(is_active) === 0)) {
                return errorResponse(res, 'Anda tidak dapat menurunkan atau menonaktifkan akun Anda sendiri', 400);
            }
        }

        // ATURAN KRITIS: Harus tersisa minimal satu admin aktif
        if ((role && role !== 'admin' && targetUser.role === 'admin') ||
            (is_active !== undefined && Number(is_active) === 0 && targetUser.role === 'admin')) {
            const activeAdmins = await db.get(
                "SELECT COUNT(id) AS total FROM users WHERE role = 'admin' AND is_active = 1 AND id != ?",
                [targetUserId]
            );
            if (!activeAdmins || activeAdmins.total < 1) {
                return errorResponse(res, 'Aksi ditolak. Harus selalu tersisa minimal satu Administrator aktif.', 400);
            }
        }

        const updates = [];
        const params  = [];

        if (role && (role === 'user' || role === 'admin')) {
            updates.push('role = ?');
            params.push(role);
        }

        if (is_active !== undefined) {
            const activeVal = Number(is_active) === 1 ? 1 : 0;
            updates.push('is_active = ?');
            params.push(activeVal);
        }

        if (updates.length === 0) {
            return errorResponse(res, 'Tidak ada data perubahan yang diberikan', 400);
        }

        updates.push("updated_at = datetime('now')");
        params.push(targetUserId);

        await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

        await recordAuditLog(
            adminId,
            'UPDATE_USER',
            'user',
            targetUserId,
            { changes: req.body, target_username: targetUser.username }
        );

        const updated = await db.get(
            'SELECT id, username, email, role, is_active, full_name FROM users WHERE id = ?',
            [targetUserId]
        );

        return successResponse(res, 'Status pengguna berhasil diperbarui', updated);
    } catch (err) {
        console.error('[updateUserStatus Error]', err);
        return errorResponse(res, 'Gagal memperbarui pengguna', 500);
    }
}

// DELETE /api/admin/users/:id
async function deleteUserByAdmin(req, res) {
    try {
        const adminId = req.user.id;
        const targetUserId = parseInt(req.params.id, 10);

        if (isNaN(targetUserId) || targetUserId <= 0) {
            return errorResponse(res, 'ID pengguna tidak valid', 400);
        }

        if (targetUserId === adminId) {
            return errorResponse(res, 'Anda tidak dapat menghapus akun Anda sendiri dari dashboard', 400);
        }

        const targetUser = await db.get('SELECT id, username, role FROM users WHERE id = ?', [targetUserId]);
        if (!targetUser) {
            return errorResponse(res, 'Pengguna tidak ditemukan', 404);
        }

        if (targetUser.role === 'admin') {
            const activeAdmins = await db.get(
                "SELECT COUNT(id) AS total FROM users WHERE role = 'admin' AND is_active = 1 AND id != ?",
                [targetUserId]
            );
            if (!activeAdmins || activeAdmins.total < 1) {
                return errorResponse(res, 'Tidak dapat menghapus. Harus tersisa minimal satu Administrator aktif.', 400);
            }
        }

        await db.run('DELETE FROM users WHERE id = ?', [targetUserId]);

        await recordAuditLog(
            adminId,
            'DELETE_USER',
            'user',
            targetUserId,
            { deleted_username: targetUser.username }
        );

        return successResponse(res, `Pengguna ${targetUser.username} berhasil dihapus.`);
    } catch (err) {
        console.error('[deleteUserByAdmin Error]', err);
        return errorResponse(res, 'Gagal menghapus pengguna', 500);
    }
}

// ─────────────────────────────────────────────────────────────
// 3. MODERASI ULASAN
// ─────────────────────────────────────────────────────────────
// GET /api/admin/reviews?status=&page=
async function getAdminReviews(req, res) {
    try {
        const { status } = req.query;
        const { page, limit, offset } = parsePagination(req.query, 10, 50);

        let whereClause = '';
        let params      = [];

        if (status && (status === 'visible' || status === 'hidden')) {
            whereClause = 'WHERE r.status = ?';
            params.push(status);
        }

        const countRow = await db.get(`SELECT COUNT(id) AS total FROM reviews r ${whereClause}`, params);
        const total    = countRow ? Number(countRow.total) : 0;

        const rows = await db.all(
            `SELECT r.id, r.user_id, r.book_id, r.book_title, r.rating, r.content, r.status,
                    r.created_at, r.updated_at, u.username, u.email
             FROM reviews r
             JOIN users u ON r.user_id = u.id
             ${whereClause}
             ORDER BY r.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return paginatedResponse(res, 'Daftar ulasan admin berhasil dimuat', rows, total, page, limit);
    } catch (err) {
        console.error('[getAdminReviews Error]', err);
        return errorResponse(res, 'Gagal memuat ulasan', 500);
    }
}

// PATCH /api/admin/reviews/:id (Ubah status: 'visible' / 'hidden')
async function updateReviewStatus(req, res) {
    try {
        const adminId  = req.user.id;
        const reviewId = parseInt(req.params.id, 10);
        const { status } = req.body;

        if (isNaN(reviewId) || reviewId <= 0) {
            return errorResponse(res, 'ID ulasan tidak valid', 400);
        }

        if (status !== 'visible' && status !== 'hidden') {
            return errorResponse(res, "Status ulasan harus 'visible' atau 'hidden'", 400);
        }

        const review = await db.get('SELECT id, book_id, user_id FROM reviews WHERE id = ?', [reviewId]);
        if (!review) {
            return errorResponse(res, 'Ulasan tidak ditemukan', 404);
        }

        await db.run(
            "UPDATE reviews SET status = ?, updated_at = datetime('now') WHERE id = ?",
            [status, reviewId]
        );

        await recordAuditLog(
            adminId,
            'MODERATE_REVIEW',
            'review',
            reviewId,
            { new_status: status, book_id: review.book_id }
        );

        return successResponse(res, `Status ulasan berhasil diubah menjadi ${status}`, {
            id: reviewId,
            status,
        });
    } catch (err) {
        console.error('[updateReviewStatus Error]', err);
        return errorResponse(res, 'Gagal memperbarui status ulasan', 500);
    }
}

// ─────────────────────────────────────────────────────────────
// 4. BUKU PILIHAN (FEATURED BOOKS)
// ─────────────────────────────────────────────────────────────
// GET /api/admin/featured
async function getAdminFeaturedBooks(req, res) {
    try {
        const rows = await db.all(
            `SELECT fb.book_id, fb.title, fb.cover, fb.authors, fb.note, fb.sort_order, fb.created_at,
                    u.username AS added_by
             FROM featured_books fb
             LEFT JOIN users u ON fb.created_by = u.id
             ORDER BY fb.sort_order ASC, fb.created_at DESC`
        );
        return successResponse(res, 'Daftar buku pilihan berhasil dimuat', rows);
    } catch (err) {
        console.error('[getAdminFeaturedBooks Error]', err);
        return errorResponse(res, 'Gagal memuat buku pilihan', 500);
    }
}

// POST /api/admin/featured
async function addFeaturedBook(req, res) {
    try {
        const adminId = req.user.id;
        const { book_id, title, cover, authors, note, sort_order } = req.body;

        if (!validateBookId(book_id)) {
            return errorResponse(res, 'ID buku tidak valid', 400);
        }
        if (!title || typeof title !== 'string' || !title.trim()) {
            return errorResponse(res, 'Judul buku wajib diisi', 400);
        }

        const bId        = parseInt(book_id, 10);
        const cleanTitle = sanitize(title);
        const cleanCover = typeof cover === 'string' ? cover.trim() : '';
        const cleanAuth  = typeof authors === 'string' ? sanitize(authors) : '';
        const cleanNote  = note ? sanitize(note).slice(0, 255) : null;
        const sortVal    = parseInt(sort_order, 10) || 0;

        await db.run(
            `INSERT INTO featured_books (book_id, title, cover, authors, note, sort_order, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(book_id) DO UPDATE SET
                title = excluded.title,
                cover = excluded.cover,
                authors = excluded.authors,
                note = excluded.note,
                sort_order = excluded.sort_order`,
            [bId, cleanTitle, cleanCover, cleanAuth, cleanNote, sortVal, adminId]
        );

        await recordAuditLog(adminId, 'ADD_FEATURED_BOOK', 'book', bId, { title: cleanTitle });

        return successResponse(res, 'Buku berhasil dijadikan buku pilihan', { book_id: bId }, 201);
    } catch (err) {
        console.error('[addFeaturedBook Error]', err);
        return errorResponse(res, 'Gagal menambahkan buku pilihan', 500);
    }
}

// PUT /api/admin/featured/:bookId
async function updateFeaturedBook(req, res) {
    try {
        const adminId = req.user.id;
        const { bookId } = req.params;
        const { note, sort_order } = req.body;

        if (!validateBookId(bookId)) {
            return errorResponse(res, 'ID buku tidak valid', 400);
        }

        const bId = parseInt(bookId, 10);
        const cleanNote = note !== undefined ? sanitize(note).slice(0, 255) : null;
        const sortVal   = parseInt(sort_order, 10) || 0;

        const result = await db.run(
            'UPDATE featured_books SET note = ?, sort_order = ? WHERE book_id = ?',
            [cleanNote, sortVal, bId]
        );

        if (result.changes === 0) {
            return errorResponse(res, 'Buku pilihan tidak ditemukan', 404);
        }

        await recordAuditLog(adminId, 'UPDATE_FEATURED_BOOK', 'book', bId, { sort_order: sortVal });

        return successResponse(res, 'Buku pilihan berhasil diperbarui');
    } catch (err) {
        console.error('[updateFeaturedBook Error]', err);
        return errorResponse(res, 'Gagal memperbarui buku pilihan', 500);
    }
}

// DELETE /api/admin/featured/:bookId
async function deleteFeaturedBook(req, res) {
    try {
        const adminId = req.user.id;
        const { bookId } = req.params;

        if (!validateBookId(bookId)) {
            return errorResponse(res, 'ID buku tidak valid', 400);
        }

        const bId = parseInt(bookId, 10);
        const result = await db.run('DELETE FROM featured_books WHERE book_id = ?', [bId]);

        if (result.changes === 0) {
            return errorResponse(res, 'Buku tidak ditemukan dalam daftar pilihan', 404);
        }

        await recordAuditLog(adminId, 'REMOVE_FEATURED_BOOK', 'book', bId);

        return successResponse(res, 'Buku dihapus dari daftar pilihan');
    } catch (err) {
        console.error('[deleteFeaturedBook Error]', err);
        return errorResponse(res, 'Gagal menghapus buku pilihan', 500);
    }
}

// ─────────────────────────────────────────────────────────────
// 5. SEMBUNYIKAN BUKU (HIDDEN BOOKS)
// ─────────────────────────────────────────────────────────────
// GET /api/admin/hidden
async function getAdminHiddenBooks(req, res) {
    try {
        const rows = await db.all(
            `SELECT hb.book_id, hb.title, hb.reason, hb.created_at,
                    u.username AS hidden_by
             FROM hidden_books hb
             LEFT JOIN users u ON hb.created_by = u.id
             ORDER BY hb.created_at DESC`
        );
        return successResponse(res, 'Daftar buku tersembunyi berhasil dimuat', rows);
    } catch (err) {
        console.error('[getAdminHiddenBooks Error]', err);
        return errorResponse(res, 'Gagal memuat buku tersembunyi', 500);
    }
}

// POST /api/admin/hidden
async function addHiddenBook(req, res) {
    try {
        const adminId = req.user.id;
        const { book_id, title, reason } = req.body;

        if (!validateBookId(book_id)) {
            return errorResponse(res, 'ID buku tidak valid', 400);
        }

        const bId         = parseInt(book_id, 10);
        const cleanTitle  = title ? sanitize(title) : 'Buku #' + bId;
        const cleanReason = reason ? sanitize(reason).slice(0, 255) : 'Tidak sesuai kebijakan konten';

        await db.run(
            `INSERT INTO hidden_books (book_id, title, reason, created_by)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(book_id) DO UPDATE SET
                title = excluded.title,
                reason = excluded.reason`,
            [bId, cleanTitle, cleanReason, adminId]
        );

        await recordAuditLog(adminId, 'HIDE_BOOK', 'book', bId, { reason: cleanReason });

        return successResponse(res, 'Buku berhasil disembunyikan dari katalog publik', { book_id: bId }, 201);
    } catch (err) {
        console.error('[addHiddenBook Error]', err);
        return errorResponse(res, 'Gagal menyembunyikan buku', 500);
    }
}

// DELETE /api/admin/hidden/:bookId (Kembalikan buku agar terlihat lagi)
async function removeHiddenBook(req, res) {
    try {
        const adminId = req.user.id;
        const { bookId } = req.params;

        if (!validateBookId(bookId)) {
            return errorResponse(res, 'ID buku tidak valid', 400);
        }

        const bId = parseInt(bookId, 10);
        const result = await db.run('DELETE FROM hidden_books WHERE book_id = ?', [bId]);

        if (result.changes === 0) {
            return errorResponse(res, 'Buku tidak ditemukan di daftar tersembunyi', 404);
        }

        await recordAuditLog(adminId, 'UNHIDE_BOOK', 'book', bId);

        return successResponse(res, 'Buku berhasil dikembalikan ke katalog publik');
    } catch (err) {
        console.error('[removeHiddenBook Error]', err);
        return errorResponse(res, 'Gagal mengembalikan buku', 500);
    }
}

// ─────────────────────────────────────────────────────────────
// 6. PENGUMUMAN (ANNOUNCEMENTS)
// ─────────────────────────────────────────────────────────────
// GET /api/admin/announcements
async function getAdminAnnouncements(req, res) {
    try {
        const rows = await db.all(
            `SELECT a.id, a.title, a.content, a.is_active, a.created_at,
                    u.username AS author
             FROM announcements a
             LEFT JOIN users u ON a.created_by = u.id
             ORDER BY a.created_at DESC`
        );
        return successResponse(res, 'Daftar pengumuman berhasil dimuat', rows);
    } catch (err) {
        console.error('[getAdminAnnouncements Error]', err);
        return errorResponse(res, 'Gagal memuat pengumuman', 500);
    }
}

// POST /api/admin/announcements
async function createAnnouncement(req, res) {
    try {
        const adminId = req.user.id;
        const { title, content, is_active } = req.body;

        if (!title || !content) {
            return errorResponse(res, 'Judul dan isi pengumuman wajib diisi', 400);
        }

        const cleanTitle   = sanitize(title).slice(0, 150);
        const cleanContent = sanitize(content).slice(0, 2000);
        const activeVal    = is_active !== undefined ? (Number(is_active) === 1 ? 1 : 0) : 1;

        const result = await db.run(
            'INSERT INTO announcements (title, content, is_active, created_by) VALUES (?, ?, ?, ?)',
            [cleanTitle, cleanContent, activeVal, adminId]
        );

        await recordAuditLog(adminId, 'CREATE_ANNOUNCEMENT', 'announcement', result.lastID, { title: cleanTitle });

        return successResponse(res, 'Pengumuman berhasil dibuat', {
            id: result.lastID,
            title: cleanTitle,
            is_active: activeVal,
        }, 201);
    } catch (err) {
        console.error('[createAnnouncement Error]', err);
        return errorResponse(res, 'Gagal membuat pengumuman', 500);
    }
}

// PUT /api/admin/announcements/:id
async function updateAnnouncement(req, res) {
    try {
        const adminId = req.user.id;
        const id      = parseInt(req.params.id, 10);
        const { title, content, is_active } = req.body;

        if (isNaN(id) || id <= 0) {
            return errorResponse(res, 'ID pengumuman tidak valid', 400);
        }

        const updates = [];
        const params  = [];

        if (title) {
            updates.push('title = ?');
            params.push(sanitize(title).slice(0, 150));
        }
        if (content) {
            updates.push('content = ?');
            params.push(sanitize(content).slice(0, 2000));
        }
        if (is_active !== undefined) {
            updates.push('is_active = ?');
            params.push(Number(is_active) === 1 ? 1 : 0);
        }

        if (updates.length === 0) {
            return errorResponse(res, 'Tidak ada data perubahan', 400);
        }

        params.push(id);
        const result = await db.run(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`, params);

        if (result.changes === 0) {
            return errorResponse(res, 'Pengumuman tidak ditemukan', 404);
        }

        await recordAuditLog(adminId, 'UPDATE_ANNOUNCEMENT', 'announcement', id);

        return successResponse(res, 'Pengumuman berhasil diperbarui');
    } catch (err) {
        console.error('[updateAnnouncement Error]', err);
        return errorResponse(res, 'Gagal memperbarui pengumuman', 500);
    }
}

// DELETE /api/admin/announcements/:id
async function deleteAnnouncement(req, res) {
    try {
        const adminId = req.user.id;
        const id      = parseInt(req.params.id, 10);

        if (isNaN(id) || id <= 0) {
            return errorResponse(res, 'ID pengumuman tidak valid', 400);
        }

        const result = await db.run('DELETE FROM announcements WHERE id = ?', [id]);
        if (result.changes === 0) {
            return errorResponse(res, 'Pengumuman tidak ditemukan', 404);
        }

        await recordAuditLog(adminId, 'DELETE_ANNOUNCEMENT', 'announcement', id);

        return successResponse(res, 'Pengumuman berhasil dihapus');
    } catch (err) {
        console.error('[deleteAnnouncement Error]', err);
        return errorResponse(res, 'Gagal menghapus pengumuman', 500);
    }
}

// ─────────────────────────────────────────────────────────────
// 7. AUDIT LOGS
// ─────────────────────────────────────────────────────────────
// GET /api/admin/logs?page=
async function getAuditLogs(req, res) {
    try {
        const { page, limit, offset } = parsePagination(req.query, 15, 50);

        const countRow = await db.get('SELECT COUNT(id) AS total FROM audit_logs');
        const total    = countRow ? Number(countRow.total) : 0;

        const rows = await db.all(
            `SELECT al.id, al.action, al.target_type, al.target_id, al.detail, al.created_at,
                    u.username AS admin_username, u.email AS admin_email
             FROM audit_logs al
             LEFT JOIN users u ON al.admin_id = u.id
             ORDER BY al.created_at DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        return paginatedResponse(res, 'Log aktivitas berhasil dimuat', rows, total, page, limit);
    } catch (err) {
        console.error('[getAuditLogs Error]', err);
        return errorResponse(res, 'Gagal memuat log aktivitas', 500);
    }
}

// ─────────────────────────────────────────────────────────────
// 8. ENDPOINT PUBLIK (KATALOG & PENGUMUMAN)
// ─────────────────────────────────────────────────────────────
// GET /api/catalog/featured (Publik)
async function getPublicFeaturedBooks(req, res) {
    try {
        const rows = await db.all(
            `SELECT book_id, title, cover, authors, note, sort_order
             FROM featured_books
             ORDER BY sort_order ASC, created_at DESC
             LIMIT 12`
        );
        return successResponse(res, 'Buku pilihan berhasil dimuat', rows);
    } catch (err) {
        console.error('[getPublicFeaturedBooks Error]', err);
        return errorResponse(res, 'Gagal memuat buku pilihan', 500);
    }
}

// GET /api/catalog/hidden (Publik — daftar ID buku yang harus difilter di frontend)
async function getPublicHiddenBooks(req, res) {
    try {
        const rows = await db.all('SELECT book_id FROM hidden_books');
        const hiddenIds = rows.map(r => r.book_id);
        return successResponse(res, 'Daftar buku tersembunyi', hiddenIds);
    } catch (err) {
        console.error('[getPublicHiddenBooks Error]', err);
        return errorResponse(res, 'Gagal memuat daftar buku tersembunyi', 500);
    }
}

// GET /api/announcements/active (Publik)
async function getPublicActiveAnnouncements(req, res) {
    try {
        const rows = await db.all(
            `SELECT id, title, content, created_at
             FROM announcements
             WHERE is_active = 1
             ORDER BY created_at DESC
             LIMIT 5`
        );
        return successResponse(res, 'Pengumuman aktif', rows);
    } catch (err) {
        console.error('[getPublicActiveAnnouncements Error]', err);
        return errorResponse(res, 'Gagal memuat pengumuman', 500);
    }
}

module.exports = {
    // Admin Endpoints
    getAdminStats,
    getUsersList,
    updateUserStatus,
    deleteUserByAdmin,
    getAdminReviews,
    updateReviewStatus,
    getAdminFeaturedBooks,
    addFeaturedBook,
    updateFeaturedBook,
    deleteFeaturedBook,
    getAdminHiddenBooks,
    addHiddenBook,
    removeHiddenBook,
    getAdminAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    getAuditLogs,

    // Public Endpoints
    getPublicFeaturedBooks,
    getPublicHiddenBooks,
    getPublicActiveAnnouncements,
};
