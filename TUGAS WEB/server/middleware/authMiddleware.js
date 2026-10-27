// ============================================================
// middleware/authMiddleware.js — Middleware verifikasi JWT
// ============================================================
// Digunakan pada route-route yang memerlukan autentikasi.
// Memverifikasi token dari header Authorization: Bearer <token>
// ============================================================

const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Middleware: Verifikasi JWT Token
 * Mengekstrak token dari header, memvalidasi, dan menyimpan
 * data user di req.user agar bisa diakses handler berikutnya.
 */
function verifyToken(req, res, next) {
    try {
        // --- 1. Ambil header Authorization ---
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Akses ditolak. Token tidak ditemukan.',
            });
        }

        // --- 2. Ekstrak token dari format "Bearer <token>" ---
        const parts = authHeader.split(' ');

        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({
                success: false,
                message: 'Format token tidak valid. Gunakan: Bearer <token>',
            });
        }

        const token = parts[1];

        // --- 3. Verifikasi dan decode token ---
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Simpan payload user ke request object
        req.user = {
            id:       decoded.id,
            username: decoded.username,
            email:    decoded.email,
        };

        // Lanjut ke handler berikutnya
        next();
    } catch (error) {
        // Token expired
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token sudah kedaluwarsa. Silakan login ulang.',
            });
        }

        // Token tidak valid / dimanipulasi
        return res.status(401).json({
            success: false,
            message: 'Token tidak valid.',
        });
    }
}

module.exports = { verifyToken };
