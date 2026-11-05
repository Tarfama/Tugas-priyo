// ============================================================
// routes/reviewRoutes.js
// ============================================================

const express = require('express');
const router  = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');
const { deleteReview, getMyReviews } = require('../controllers/reviewController');

// GET /api/me/reviews
router.get('/me/reviews', verifyToken, getMyReviews);

// DELETE /api/reviews/:id
router.delete('/reviews/:id', verifyToken, deleteReview);

module.exports = router;
