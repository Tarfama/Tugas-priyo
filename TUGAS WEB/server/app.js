// ============================================================
// app.js — Entry point server Express (MYPERPUS Full Features)
// ============================================================

const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const path      = require('path');
require('dotenv').config();

const { initDb } = require('./config/database');
const { verifyToken } = require('./middleware/authMiddleware');

// Router imports
const authRoutes         = require('./routes/authRoutes');
const bookmarkRoutes     = require('./routes/bookmarkRoutes');
const historyRoutes      = require('./routes/historyRoutes');
const readingStatusRoutes= require('./routes/readingStatusRoutes');
const collectionRoutes   = require('./routes/collectionRoutes');
const bookRoutes         = require('./routes/bookRoutes');
const syncRoutes         = require('./routes/syncRoutes');
const reviewRoutes       = require('./routes/reviewRoutes');
const adminRoutes        = require('./routes/adminRoutes');
const catalogRoutes      = require('./routes/catalogRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const { profileAuthRouter, getUserStatsHandler } = require('./routes/profileRoutes');

const app = express();

// ─────────────────────────────────────────────────────────────
// MIDDLEWARE KEAMANAN
// ─────────────────────────────────────────────────────────────

// 1. Helmet — Set HTTP security headers dengan CSP yang tepat untuk Gutendex & Gutenberg cover
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: [
                "'self'",
                "data:",
                "blob:",
                "https://www.gutenberg.org",
                "http://www.gutenberg.org",
                "https://*.gutenberg.org"
            ],
            connectSrc: [
                "'self'",
                "https://gutendex.com"
            ],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. CORS — Izinkan GET, POST, PUT, PATCH, DELETE, OPTIONS
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 3. Rate Limiting Terpisah
// A. Auth Limiter (Login & Register)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30, // Maks 30 percobaan per 15 menit
    message: {
        success: false,
        message: 'Terlalu banyak percobaan autentikasi. Coba lagi dalam 15 menit.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// B. Write Limiter (Bookmark, Ulasan, Koleksi, Status)
const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: {
        success: false,
        message: 'Aktivitas pengiriman data terlalu tinggi. Coba lagi sebentar lagi.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// C. Admin Limiter
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
});

// D. Rate Limiting Umum (Untuk GET dan read queries)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1500,
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(generalLimiter);

// ─────────────────────────────────────────────────────────────
// BODY PARSER
// ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// ─────────────────────────────────────────────────────────────
// SERVE STATIC FILES (Frontend)
// ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..')));

// ─────────────────────────────────────────────────────────────
// MOUNT API ROUTES
// ─────────────────────────────────────────────────────────────

// Autentikasi dasar (login, register, get profile)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/auth', profileAuthRouter); // update profile, password, delete account

// Fitur User Terikat Akun
app.use('/api/bookmarks', writeLimiter, bookmarkRoutes);
app.use('/api/history',   writeLimiter, historyRoutes);
app.use('/api/reading-status', writeLimiter, readingStatusRoutes);
app.use('/api/collections', writeLimiter, collectionRoutes);
app.use('/api/books', bookRoutes); // book/:id/me & book/:id/reviews
app.use('/api/sync', syncRoutes);  // /api/sync/local
app.use('/api', reviewRoutes);      // /api/me/reviews, /api/reviews/:id

// Statistik profil user: GET /api/me/stats
app.get('/api/me/stats', verifyToken, getUserStatsHandler);

// Admin Routes (dilindungi requireAdmin)
app.use('/api/admin', adminLimiter, adminRoutes);

// Endpoint Publik Katalog & Pengumuman
app.use('/api/catalog', catalogRoutes);
app.use('/api/announcements', announcementRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server MYPERPUS berjalan dengan baik',
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
    const message = process.env.NODE_ENV === 'production'
        ? 'Terjadi kesalahan server'
        : (err.message || 'Terjadi kesalahan server');

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
    await initDb();

    app.listen(PORT, () => {
        console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
        console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
