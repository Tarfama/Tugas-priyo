// ============================================================
// routes/profileRoutes.js — Profil & Statistik User (/api/me, /api/auth)
// ============================================================

const express = require('express');
const router  = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');
const {
    updateProfile,
    updatePassword,
    deleteAccount,
    getUserStats,
} = require('../controllers/profileController');

// Dipasang di /api/auth
// PUT /api/auth/profile
router.put('/profile', verifyToken, updateProfile);

// PUT /api/auth/password
router.put('/password', verifyToken, updatePassword);

// DELETE /api/auth/account
router.delete('/account', verifyToken, deleteAccount);

module.exports = {
    profileAuthRouter: router,
    getUserStatsHandler: getUserStats,
};
