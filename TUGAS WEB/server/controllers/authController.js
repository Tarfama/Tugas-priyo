// ============================================================
// controllers/authController.js — Logika Bisnis Autentikasi (SQLite)
// ============================================================

let bcrypt;
try {
    bcrypt = require('bcryptjs');
} catch {
    bcrypt = require('bcrypt');
}

const jwt    = require('jsonwebtoken');
const { db } = require('../config/database');
const {
    validateLoginInput,
    validateRegisterInput,
    sanitize,
} = require('../utils/validators');

require('dotenv').config();

// ─────────────────────────────────────────────────────────────
// 1. REGISTER — Membuat akun user baru
// ─────────────────────────────────────────────────────────────
async function register(req, res) {
    try {
        const { username, email, password, full_name } = req.body;

        const validation = validateRegisterInput(username, email, password);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Validasi gagal',
                errors:  validation.errors,
            });
        }

        const cleanUsername = sanitize(username).toLowerCase();
        const cleanEmail    = email.trim().toLowerCase();
        const cleanFullName = full_name ? sanitize(full_name).trim() : null;

        const existingUser = await db.get(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [cleanUsername, cleanEmail]
        );

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Username atau email sudah terdaftar',
            });
        }

        const saltRounds   = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const result = await db.run(
            `INSERT INTO users (username, email, password_hash, role, is_active, full_name)
             VALUES (?, ?, ?, 'user', 1, ?)`,
            [cleanUsername, cleanEmail, passwordHash, cleanFullName]
        );

        return res.status(201).json({
            success: true,
            message: 'Registrasi berhasil! Silakan login.',
            data: {
                id:        result.lastID,
                username:  cleanUsername,
                email:     cleanEmail,
                role:      'user',
                full_name: cleanFullName,
            },
        });
    } catch (error) {
        console.error('[REGISTER ERROR]', error);

        if (
            (error.message && error.message.includes('UNIQUE constraint failed')) ||
            error.code === 'SQLITE_CONSTRAINT'
        ) {
            return res.status(409).json({
                success: false,
                message: 'Username atau email sudah terdaftar',
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server. Silakan coba lagi.',
        });
    }
}

// ─────────────────────────────────────────────────────────────
// 2. LOGIN — Autentikasi user dan berikan JWT token + role
// ─────────────────────────────────────────────────────────────
async function login(req, res) {
    try {
        const { email, password } = req.body;

        const validation = validateLoginInput(email, password);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Validasi gagal',
                errors:  validation.errors,
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const user = await db.get(
            'SELECT id, username, email, password_hash, role, is_active, full_name FROM users WHERE email = ?',
            [cleanEmail]
        );

        // Generic error message jika tidak ditemukan
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email atau password salah',
            });
        }

        // Cek apakah akun aktif
        if (Number(user.is_active) !== 1) {
            return res.status(403).json({
                success: false,
                message: 'Akun Anda telah dinonaktifkan oleh Administrator.',
            });
        }

        // Verifikasi password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Email atau password salah',
            });
        }

        // Catat waktu login terakhir
        try {
            await db.run("UPDATE users SET last_login_at = datetime('now') WHERE id = ?", [user.id]);
        } catch (e) {
            // Abaikan kegagalan update login time agar login tetap sukses
        }

        const tokenPayload = {
            id:       user.id,
            username: user.username,
            email:    user.email,
            role:     user.role || 'user',
        };

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET || 'default_secret_dev_key_ganti_di_produksi',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        return res.status(200).json({
            success: true,
            message: 'Login berhasil!',
            data: {
                user: {
                    id:        user.id,
                    username:  user.username,
                    email:     user.email,
                    role:      user.role || 'user',
                    full_name: user.full_name || user.username,
                },
                token,
                expiresIn: process.env.JWT_EXPIRES_IN || '24h',
            },
        });
    } catch (error) {
        console.error('[LOGIN ERROR]', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server. Silakan coba lagi.',
        });
    }
}

// ─────────────────────────────────────────────────────────────
// 3. GET PROFILE — Mengambil data user yang sedang login
// ─────────────────────────────────────────────────────────────
async function getProfile(req, res) {
    try {
        const userId = req.user.id;

        const user = await db.get(
            `SELECT id, username, email, role, is_active, full_name, bio, last_login_at, created_at
             FROM users WHERE id = ?`,
            [userId]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan',
            });
        }

        return res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        console.error('[PROFILE ERROR]', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server. Silakan coba lagi.',
        });
    }
}

module.exports = { register, login, getProfile };
