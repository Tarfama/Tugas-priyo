// ============================================================
// routes/readingStatusRoutes.js
// ============================================================

const express = require('express');
const router  = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');
const { getReadingStatusList, setReadingStatus } = require('../controllers/readingStatusController');

router.use(verifyToken);

router.get('/', getReadingStatusList);
router.put('/:bookId', setReadingStatus);

module.exports = router;
