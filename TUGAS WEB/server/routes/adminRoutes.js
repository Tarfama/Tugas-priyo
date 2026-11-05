// ============================================================
// routes/adminRoutes.js — Route Khusus Administrator (/api/admin)
// ============================================================

const express = require('express');
const router  = express.Router();

const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const {
    getAdminStats,
    getUsersList,
    updateUserStatus,
    deleteUserByAdmin,
    getAdminReviews,
    updateReviewStatus,
    getAdminFeaturedBooks,
    addFeaturedBook,
    updateFeaturedBook,
    deleteFeaturedBook,
    getAdminHiddenBooks,
    addHiddenBook,
    removeHiddenBook,
    getAdminAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    getAuditLogs,
} = require('../controllers/adminController');

// SEMUA ROUTE ADMIN WAJIB: verifyToken + requireAdmin
router.use(verifyToken);
router.use(requireAdmin);

// 1. Dashboard Stats
router.get('/stats', getAdminStats);

// 2. Users Management
router.get('/users', getUsersList);
router.patch('/users/:id', updateUserStatus);
router.delete('/users/:id', deleteUserByAdmin);

// 3. Review Moderation
router.get('/reviews', getAdminReviews);
router.patch('/reviews/:id', updateReviewStatus);

// 4. Featured Books
router.get('/featured', getAdminFeaturedBooks);
router.post('/featured', addFeaturedBook);
router.put('/featured/:bookId', updateFeaturedBook);
router.delete('/featured/:bookId', deleteFeaturedBook);

// 5. Hidden Books
router.get('/hidden', getAdminHiddenBooks);
router.post('/hidden', addHiddenBook);
router.delete('/hidden/:bookId', removeHiddenBook);

// 6. Announcements
router.get('/announcements', getAdminAnnouncements);
router.post('/announcements', createAnnouncement);
router.put('/announcements/:id', updateAnnouncement);
router.delete('/announcements/:id', deleteAnnouncement);

// 7. Audit Logs
router.get('/logs', getAuditLogs);

module.exports = router;
