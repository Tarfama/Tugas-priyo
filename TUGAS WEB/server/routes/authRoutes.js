// ============================================================
// routes/authRoutes.js — Definisi route autentikasi
// ============================================================

const express = require('express');
const router  = express.Router();

const { register, login, getProfile } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// ── Public Routes (tidak perlu login) ──────────────────────
router.post('/register', register);   // POST /api/auth/register
router.post('/login',    login);       // POST /api/auth/login

// ── Protected Routes (perlu JWT token) ─────────────────────
router.get('/profile', verifyToken, getProfile);  // GET /api/auth/profile

module.exports = router;
