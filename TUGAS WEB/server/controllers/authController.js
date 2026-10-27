// ============================================================
// controllers/authController.js — Logika bisnis autentikasi
// ============================================================
// Controller ini menangani:
//   1. POST /api/auth/register — Registrasi user baru
//   2. POST /api/auth/login    — Login & mendapat JWT token
//   3. GET  /api/auth/profile  — Mengambil data profil (dilindungi)
//
// PRINSIP KEAMANAN:
//   ✅ Password di-hash dengan bcrypt (salt rounds = 12)
//   ✅ Parameterized queries mencegah SQL Injection
//   ✅ Generic error message agar tidak membocorkan info user
//   ✅ Input divalidasi dan disanitasi sebelum diproses
// ============================================================

const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const { pool } = require('../config/database');
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
        const { username, email, password } = req.body;

        // --- Langkah 1: Validasi input ---
        const validation = validateRegisterInput(username, email, password);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Validasi gagal',
                errors:  validation.errors,
            });
        }

        // --- Langkah 2: Sanitasi & normalisasi input ---
        const cleanUsername = sanitize(username).toLowerCase();
        const cleanEmail   = email.trim().toLowerCase();

        // --- Langkah 3: Cek apakah username/email sudah terdaftar ---
        // Menggunakan parameterized query (?) untuk mencegah SQL Injection
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [cleanUsername, cleanEmail]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username atau email sudah terdaftar',
            });
        }

        // --- Langkah 4: Hash password dengan bcrypt ---
        // Salt rounds = 12 memberikan keseimbangan keamanan & performa
        // JANGAN PERNAH simpan password plain-text!
        const saltRounds  = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // --- Langkah 5: Simpan user baru ke database ---
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [cleanUsername, cleanEmail, passwordHash]
        );

        // --- Langkah 6: Response sukses ---
        return res.status(201).json({
            success: true,
            message: 'Registrasi berhasil! Silakan login.',
            data: {
                id:       result.insertId,
                username: cleanUsername,
                email:    cleanEmail,
            },
        });
    } catch (error) {
        console.error('[REGISTER ERROR]', error);

        // Handle duplicate entry (MySQL error code 1062)
        if (error.code === 'ER_DUP_ENTRY') {
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
// 2. LOGIN — Autentikasi user dan berikan JWT token
// ─────────────────────────────────────────────────────────────
async function login(req, res) {
    try {
        const { email, password } = req.body;

        // --- Langkah 1: Validasi input ---
        const validation = validateLoginInput(email, password);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Validasi gagal',
                errors:  validation.errors,
            });
        }

        // --- Langkah 2: Normalisasi email ---
        const cleanEmail = email.trim().toLowerCase();

        // --- Langkah 3: Cari user di database berdasarkan email ---
        // Parameterized query (?) mencegah SQL Injection
        const [rows] = await pool.execute(
            'SELECT id, username, email, password_hash FROM users WHERE email = ?',
            [cleanEmail]
        );

        // PENTING: Gunakan GENERIC error message!
        // Jangan beri tahu apakah email yang salah atau password yang salah,
        // karena itu bisa dimanfaatkan attacker untuk enumerasi akun.
        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email atau password salah',
            });
        }

        const user = rows[0];

        // --- Langkah 4: Verifikasi password dengan bcrypt.compare() ---
        // bcrypt.compare() membandingkan plain-text password dengan hash
        // secara aman (timing-safe comparison)
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            // GENERIC error message — sama dengan jika email tidak ditemukan
            return res.status(401).json({
                success: false,
                message: 'Email atau password salah',
            });
        }

        // --- Langkah 5: Buat JWT Token ---
        const tokenPayload = {
            id:       user.id,
            username: user.username,
            email:    user.email,
        };

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        // --- Langkah 6: Response sukses dengan token ---
        return res.status(200).json({
            success: true,
            message: 'Login berhasil!',
            data: {
                user: {
                    id:       user.id,
                    username: user.username,
                    email:    user.email,
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
        // req.user sudah diisi oleh middleware verifyToken
        const userId = req.user.id;

        const [rows] = await pool.execute(
            'SELECT id, username, email, created_at FROM users WHERE id = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan',
            });
        }

        return res.status(200).json({
            success: true,
            data: rows[0],
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
