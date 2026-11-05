// ============================================================
// routes/collectionRoutes.js
// ============================================================

const express = require('express');
const router  = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');
const {
    getCollections,
    getCollectionDetail,
    createCollection,
    updateCollection,
    deleteCollection,
    addItemToCollection,
    removeItemFromCollection,
} = require('../controllers/collectionController');

router.use(verifyToken);

router.get('/', getCollections);
router.post('/', createCollection);
router.get('/:id', getCollectionDetail);
router.put('/:id', updateCollection);
router.delete('/:id', deleteCollection);

router.post('/:id/items', addItemToCollection);
router.delete('/:id/items/:bookId', removeItemFromCollection);

module.exports = router;
