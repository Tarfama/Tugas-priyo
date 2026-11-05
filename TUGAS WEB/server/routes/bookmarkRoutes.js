// ============================================================
// routes/bookmarkRoutes.js
// ============================================================

const express = require('express');
const router  = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');
const { getBookmarks, addBookmark, removeBookmark } = require('../controllers/bookmarkController');

router.use(verifyToken);

router.get('/', getBookmarks);
router.post('/', addBookmark);
router.delete('/:bookId', removeBookmark);

module.exports = router;
