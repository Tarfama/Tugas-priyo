// ============================================================
// app.js — Entry point server Express
// ============================================================
// Server utama yang menghubungkan semua modul:
//   - Keamanan (Helmet, CORS, Rate Limiting)
//   - Parsing body JSON
//   - Route autentikasi
//   - Koneksi database
// ============================================================

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
const authRoutes = require('./routes/authRoutes');

const app = express();

// ─────────────────────────────────────────────────────────────
// MIDDLEWARE KEAMANAN
// ─────────────────────────────────────────────────────────────

// 1. Helmet — Set HTTP security headers (XSS protection, dll)
app.use(helmet());

// 2. CORS — Izinkan akses dari frontend
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',   // Ganti '*' dengan domain frontend di produksi
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 3. Rate Limiting — Mencegah brute-force attack pada login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 menit
    max:      10,               // Maks 10 percobaan login per IP per 15 menit
    message: {
        success: false,
        message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.',
    },
    standardHeaders: true,
    legacyHeaders:   false,
});

// 4. Rate Limiting umum — Semua endpoint
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max:      100,
    standardHeaders: true,
    legacyHeaders:   false,
});

app.use(generalLimiter);

// ─────────────────────────────────────────────────────────────
// BODY PARSER
// ─────────────────────────────────────────────────────────────

// Parse JSON body (dengan batas ukuran 10KB untuk keamanan)
app.use(express.json({ limit: '10kb' }));

// Parse URL-encoded body
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─────────────────────────────────────────────────────────────
// SERVE STATIC FILES (Frontend)
// ─────────────────────────────────────────────────────────────

// Melayani file-file frontend (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '..')));

// ─────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────

// Terapkan rate limiter khusus pada endpoint login
app.use('/api/auth/login', loginLimiter);

// Mount semua route autentikasi di /api/auth
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server berjalan dengan baik',
        timestamp: new Date().toISOString(),
    });
});

// ─────────────────────────────────────────────────────────────
// 404 HANDLER
// ─────────────────────────────────────────────────────────────

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint tidak ditemukan',
    });
});

// ─────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────────────────────

app.use((err, req, res, _next) => {
    console.error('[GLOBAL ERROR]', err);

    // Jangan bocorkan detail error di produksi
    const message = process.env.NODE_ENV === 'production'
        ? 'Terjadi kesalahan server'
        : err.message;

    res.status(500).json({
        success: false,
        message,
    });
});

// ─────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

async function startServer() {
    // Test koneksi database sebelum menjalankan server
    await testConnection();

    app.listen(PORT, () => {
        console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
        console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

startServer();
