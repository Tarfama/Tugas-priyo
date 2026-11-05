// ============================================================
// controllers/profileController.js — Manajemen Profil & Akun Pengguna
// ============================================================

let bcrypt;
try {
    bcrypt = require('bcryptjs');
} catch {
    bcrypt = require('bcrypt');
}

const { db } = require('../config/database');
const { sanitize } = require('../utils/validators');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// PUT /api/auth/profile — Ubah full_name, bio, username
async function updateProfile(req, res) {
    try {
        const userId = req.user.id;
        const { full_name, bio, username } = req.body;

        const updates = [];
        const params  = [];

        if (username !== undefined) {
            const cleanUsername = sanitize(username).toLowerCase().trim();
            if (cleanUsername.length < 3 || cleanUsername.length > 50) {
                return errorResponse(res, 'Username harus antara 3-50 karakter', 400);
            }
            if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
                return errorResponse(res, 'Username hanya boleh huruf, angka, underscore, dan strip', 400);
            }

            // Cek keunikan username
            const duplicate = await db.get(
                'SELECT id FROM users WHERE username = ? AND id != ?',
                [cleanUsername, userId]
            );
            if (duplicate) {
                return errorResponse(res, 'Username sudah digunakan oleh pengguna lain', 409);
            }

            updates.push('username = ?');
            params.push(cleanUsername);
        }

        if (full_name !== undefined) {
            const cleanFullName = full_name ? sanitize(full_name).trim().slice(0, 100) : null;
            updates.push('full_name = ?');
            params.push(cleanFullName);
        }

        if (bio !== undefined) {
            const cleanBio = bio ? sanitize(bio).trim().slice(0, 500) : null;
            updates.push('bio = ?');
            params.push(cleanBio);
        }

        if (updates.length === 0) {
            return errorResponse(res, 'Tidak ada data yang diperbarui', 400);
        }

        updates.push("updated_at = datetime('now')");
        params.push(userId);

        await db.run(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        const updatedUser = await db.get(
            `SELECT id, username, email, role, is_active, full_name, bio, created_at, updated_at
             FROM users WHERE id = ?`,
            [userId]
        );

        return successResponse(res, 'Profil berhasil diperbarui', updatedUser);
    } catch (err) {
        console.error('[updateProfile Error]', err);
        return errorResponse(res, 'Gagal memperbarui profil', 500);
    }
}

// PUT /api/auth/password — Ubah kata sandi
async function updatePassword(req, res) {
    try {
        const userId = req.user.id;
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return errorResponse(res, 'Password saat ini dan password baru wajib diisi', 400);
        }

        if (new_password.length < 8) {
            return errorResponse(res, 'Password baru minimal 8 karakter', 400);
        }
        if (new_password.length > 128) {
            return errorResponse(res, 'Password baru terlalu panjang', 400);
        }
        if (!/[a-zA-Z]/.test(new_password) || !/\d/.test(new_password)) {
            return errorResponse(res, 'Password baru harus mengandung kombinasi huruf dan angka', 400);
        }

        // Ambil hash password lama
        const user = await db.get('SELECT password_hash FROM users WHERE id = ?', [userId]);
        if (!user) {
            return errorResponse(res, 'User tidak ditemukan', 404);
        }

        const isMatch = await bcrypt.compare(current_password, user.password_hash);
        if (!isMatch) {
            return errorResponse(res, 'Password saat ini tidak sesuai', 400);
        }

        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
        const newHash    = await bcrypt.hash(new_password, saltRounds);

        await db.run(
            "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
            [newHash, userId]
        );

        return successResponse(res, 'Password berhasil diubah. Silakan gunakan password baru pada login berikutnya.');
    } catch (err) {
        console.error('[updatePassword Error]', err);
        return errorResponse(res, 'Gagal memperbarui password', 500);
    }
}

// DELETE /api/auth/account — Hapus akun dan seluruh data terkait
async function deleteAccount(req, res) {
    try {
        const userId = req.user.id;
        const { password } = req.body;

        if (!password) {
            return errorResponse(res, 'Konfirmasi password diperlukan untuk menghapus akun', 400);
        }

        const user = await db.get('SELECT password_hash, role FROM users WHERE id = ?', [userId]);
        if (!user) {
            return errorResponse(res, 'User tidak ditemukan', 404);
        }

        // Jika akun adalah admin, pastikan bukan admin terakhir
        if (user.role === 'admin') {
            const adminCount = await db.get(
                "SELECT COUNT(id) AS total FROM users WHERE role = 'admin' AND is_active = 1"
            );
            if (adminCount && adminCount.total <= 1) {
                return errorResponse(res, 'Tidak dapat menghapus akun. Harus tersisa minimal satu Administrator aktif.', 400);
            }
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return errorResponse(res, 'Password konfirmasi salah', 400);
        }

        // Hapus akun (CASCADE akan menghapus bookmarks, history, status, collections, reviews)
        await db.run('DELETE FROM users WHERE id = ?', [userId]);

        return successResponse(res, 'Akun Anda dan seluruh data terkait telah berhasil dihapus secara permanen.');
    } catch (err) {
        console.error('[deleteAccount Error]', err);
        return errorResponse(res, 'Gagal menghapus akun', 500);
    }
}

// GET /api/me/stats — Ringkasan statistik aktivitas user
async function getUserStats(req, res) {
    try {
        const userId = req.user.id;

        // Total bookmark
        const bCount = await db.get(
            'SELECT COUNT(id) AS total FROM bookmarks WHERE user_id = ?',
            [userId]
        );

        // Total selesai dibaca
        const fCount = await db.get(
            "SELECT COUNT(id) AS total FROM reading_status WHERE user_id = ? AND status = 'finished'",
            [userId]
        );

        // Total sedang dibaca
        const rCount = await db.get(
            "SELECT COUNT(id) AS total FROM reading_status WHERE user_id = ? AND status = 'reading'",
            [userId]
        );

        // Total ulasan
        const rvCount = await db.get(
            'SELECT COUNT(id) AS total FROM reviews WHERE user_id = ?',
            [userId]
        );

        // Buku terakhir dibaca
        const lastRead = await db.get(
            `SELECT book_id, title, cover, last_read_at
             FROM reading_history
             WHERE user_id = ?
             ORDER BY last_read_at DESC
             LIMIT 1`,
            [userId]
        );

        return successResponse(res, 'Statistik pengguna berhasil dimuat', {
            total_bookmarks: bCount ? Number(bCount.total) : 0,
            total_finished: fCount ? Number(fCount.total) : 0,
            total_reading: rCount ? Number(rCount.total) : 0,
            total_reviews: rvCount ? Number(rvCount.total) : 0,
            last_read_book: lastRead || null,
        });
    } catch (err) {
        console.error('[getUserStats Error]', err);
        return errorResponse(res, 'Gagal memuat statistik pengguna', 500);
    }
}

module.exports = {
    updateProfile,
    updatePassword,
    deleteAccount,
    getUserStats,
};
