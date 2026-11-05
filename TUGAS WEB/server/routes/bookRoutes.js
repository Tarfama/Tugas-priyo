// ============================================================
// routes/bookRoutes.js
// ============================================================

const express = require('express');
const router  = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');
const { getBookUserData } = require('../controllers/bookUserController');
const { getBookReviews, submitReview } = require('../controllers/reviewController');

// 1. GET /api/books/:bookId/me (Protected)
router.get('/:bookId/me', verifyToken, getBookUserData);

// 2. Reviews per book
// GET /api/books/:bookId/reviews (Publik)
router.get('/:bookId/reviews', getBookReviews);

// POST /api/books/:bookId/reviews (Protected)
router.post('/:bookId/reviews', verifyToken, submitReview);

module.exports = router;
