// ============================================================
// routes/syncRoutes.js
// ============================================================

const express = require('express');
const router  = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');
const { syncLocalStorage } = require('../controllers/bookUserController');

router.post('/local', verifyToken, syncLocalStorage);

module.exports = router;
