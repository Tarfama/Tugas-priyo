// ============================================================
// routes/catalogRoutes.js — Endpoint Publik Katalog & Pengumuman
// ============================================================

const express = require('express');
const router  = express.Router();

const {
    getPublicFeaturedBooks,
    getPublicHiddenBooks,
} = require('../controllers/adminController');

router.get('/featured', getPublicFeaturedBooks);
router.get('/hidden',   getPublicHiddenBooks);

module.exports = router;
