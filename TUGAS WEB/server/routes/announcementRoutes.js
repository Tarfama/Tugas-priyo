// ============================================================
// routes/announcementRoutes.js — Endpoint Publik Pengumuman Aktif
// ============================================================

const express = require('express');
const router  = express.Router();

const { getPublicActiveAnnouncements } = require('../controllers/adminController');

router.get('/active', getPublicActiveAnnouncements);

module.exports = router;
