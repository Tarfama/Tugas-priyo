// ============================================================
// middleware/authMiddleware.js — Middleware Verifikasi JWT & Role
// ============================================================

const jwt    = require('jsonwebtoken');
const { db } = require('../config/database');
require('dotenv').config();

/**
 * Middleware: Verifikasi JWT Token
 * - Mengekstrak token dari header Authorization: Bearer <token>
 * - Memverifikasi validitas token JWT
 * - Memeriksa status akun (is_active) langsung dari database
 */
async function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Akses ditolak. Token tidak ditemukan.',
            });
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({
                success: false,
                message: 'Format token tidak valid. Gunakan: Bearer <token>',
            });
        }

        const token = parts[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_dev_key_ganti_di_produksi');

        // Cek langsung status user terbaru di database (jangan hanya percaya token lama)
        const user = await db.get(
            'SELECT id, username, email, role, is_active FROM users WHERE id = ?',
            [decoded.id]
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User pemilik token ini sudah tidak ada.',
            });
        }

        if (Number(user.is_active) !== 1) {
            return res.status(403).json({
                success: false,
                message: 'Akun Anda telah dinonaktifkan oleh Administrator.',
            });
        }

        // Lampirkan data user ke request
        req.user = {
            id:        user.id,
            username:  user.username,
            email:     user.email,
            role:      user.role || 'user',
            is_active: user.is_active,
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token sudah kedaluwarsa. Silakan login ulang.',
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Token tidak valid.',
        });
    }
}

/**
 * Middleware: Memeriksa apakah user adalah Admin
 * Wajib dijalankan SETELAH verifyToken.
 * Membaca role dan is_active terbaru dari database.
 */
async function requireAdmin(req, res, next) {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Autentikasi diperlukan.',
            });
        }

        // Ambil data fresh dari database untuk memastikan role dan status aktif
        const freshUser = await db.get(
            'SELECT role, is_active FROM users WHERE id = ?',
            [req.user.id]
        );

        if (!freshUser || Number(freshUser.is_active) !== 1) {
            return res.status(403).json({
                success: false,
                message: 'Akun Anda tidak aktif atau tidak ditemukan.',
            });
        }

        if (freshUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Akses terlarang. Halaman atau aksi ini hanya untuk Administrator.',
            });
        }

        req.user.role = freshUser.role;
        next();
    } catch (error) {
        console.error('[requireAdmin Error]', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat memverifikasi hak akses admin.',
        });
    }
}

/**
 * Helper untuk mencatat log audit aksi admin
 */
async function recordAuditLog(adminId, action, targetType, targetId = null, detail = null) {
    try {
        const detailStr = detail && typeof detail === 'object' ? JSON.stringify(detail) : (detail ? String(detail) : null);
        await db.run(
            `INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail)
             VALUES (?, ?, ?, ?, ?)`,
            [adminId, action, targetType, targetId ? String(targetId) : null, detailStr]
        );
    } catch (err) {
        console.error('[Audit Log Error]', err.message);
    }
}

module.exports = {
    verifyToken,
    requireAdmin,
    recordAuditLog,
};
