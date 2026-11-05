// ============================================================
// routes/historyRoutes.js
// ============================================================

const express = require('express');
const router  = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');
const { getHistory, recordHistory, removeHistoryItem, clearAllHistory } = require('../controllers/historyController');

router.use(verifyToken);

router.get('/', getHistory);
router.post('/', recordHistory);
router.delete('/:bookId', removeHistoryItem);
router.delete('/', clearAllHistory);

module.exports = router;
