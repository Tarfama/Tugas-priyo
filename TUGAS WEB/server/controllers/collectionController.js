// ============================================================
// controllers/collectionController.js — Rak / Koleksi Buku Pribadi
// ============================================================

const { db } = require('../config/database');
const { validateBookId, sanitize } = require('../utils/validators');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// GET /api/collections — Ambil semua koleksi milik user beserta jumlah buku
async function getCollections(req, res) {
    try {
        const userId = req.user.id;
        const collections = await db.all(
            `SELECT c.id, c.name, c.description, c.created_at,
                    COUNT(ci.book_id) AS total_books
             FROM collections c
             LEFT JOIN collection_items ci ON c.id = ci.collection_id
             WHERE c.user_id = ?
             GROUP BY c.id
             ORDER BY c.created_at DESC`,
            [userId]
        );

        return successResponse(res, 'Koleksi berhasil dimuat', collections);
    } catch (err) {
        console.error('[getCollections Error]', err);
        return errorResponse(res, 'Gagal memuat koleksi', 500);
    }
}

// GET /api/collections/:id — Ambil satu koleksi dengan daftar buku di dalamnya
async function getCollectionDetail(req, res) {
    try {
        const userId = req.user.id;
        const colId  = parseInt(req.params.id, 10);

        if (isNaN(colId) || colId <= 0) {
            return errorResponse(res, 'ID koleksi tidak valid', 400);
        }

        const collection = await db.get(
            'SELECT id, name, description, created_at FROM collections WHERE id = ? AND user_id = ?',
            [colId, userId]
        );

        if (!collection) {
            return errorResponse(res, 'Koleksi tidak ditemukan', 404);
        }

        const items = await db.all(
            `SELECT book_id, title, cover, added_at
             FROM collection_items
             WHERE collection_id = ?
             ORDER BY added_at DESC`,
            [colId]
        );

        return successResponse(res, 'Detail koleksi berhasil dimuat', {
            ...collection,
            items,
        });
    } catch (err) {
        console.error('[getCollectionDetail Error]', err);
        return errorResponse(res, 'Gagal memuat detail koleksi', 500);
    }
}

// POST /api/collections — Buat koleksi baru
async function createCollection(req, res) {
    try {
        const userId = req.user.id;
        const { name, description } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return errorResponse(res, 'Nama koleksi wajib diisi', 400);
        }

        const cleanName = sanitize(name).trim();
        const cleanDesc = description ? sanitize(description).trim() : null;

        if (cleanName.length > 60) {
            return errorResponse(res, 'Nama koleksi maksimal 60 karakter', 400);
        }

        const result = await db.run(
            'INSERT INTO collections (user_id, name, description) VALUES (?, ?, ?)',
            [userId, cleanName, cleanDesc]
        );

        return successResponse(res, 'Koleksi berhasil dibuat', {
            id: result.lastID,
            name: cleanName,
            description: cleanDesc,
        }, 201);
    } catch (err) {
        console.error('[createCollection Error]', err);
        return errorResponse(res, 'Gagal membuat koleksi', 500);
    }
}

// PUT /api/collections/:id — Ubah nama/deskripsi koleksi
async function updateCollection(req, res) {
    try {
        const userId = req.user.id;
        const colId  = parseInt(req.params.id, 10);
        const { name, description } = req.body;

        if (isNaN(colId) || colId <= 0) {
            return errorResponse(res, 'ID koleksi tidak valid', 400);
        }

        if (!name || typeof name !== 'string' || !name.trim()) {
            return errorResponse(res, 'Nama koleksi wajib diisi', 400);
        }

        const cleanName = sanitize(name).trim();
        const cleanDesc = description !== undefined ? sanitize(description).trim() : null;

        const result = await db.run(
            'UPDATE collections SET name = ?, description = ? WHERE id = ? AND user_id = ?',
            [cleanName, cleanDesc, colId, userId]
        );

        if (result.changes === 0) {
            return errorResponse(res, 'Koleksi tidak ditemukan atau tidak ada perubahan', 404);
        }

        return successResponse(res, 'Koleksi berhasil diperbarui', {
            id: colId,
            name: cleanName,
            description: cleanDesc,
        });
    } catch (err) {
        console.error('[updateCollection Error]', err);
        return errorResponse(res, 'Gagal memperbarui koleksi', 500);
    }
}

// DELETE /api/collections/:id — Hapus koleksi
async function deleteCollection(req, res) {
    try {
        const userId = req.user.id;
        const colId  = parseInt(req.params.id, 10);

        if (isNaN(colId) || colId <= 0) {
            return errorResponse(res, 'ID koleksi tidak valid', 400);
        }

        const result = await db.run(
            'DELETE FROM collections WHERE id = ? AND user_id = ?',
            [colId, userId]
        );

        if (result.changes === 0) {
            return errorResponse(res, 'Koleksi tidak ditemukan', 404);
        }

        return successResponse(res, 'Koleksi berhasil dihapus', { id: colId });
    } catch (err) {
        console.error('[deleteCollection Error]', err);
        return errorResponse(res, 'Gagal menghapus koleksi', 500);
    }
}

// POST /api/collections/:id/items — Tambah buku ke koleksi
async function addItemToCollection(req, res) {
    try {
        const userId = req.user.id;
        const colId  = parseInt(req.params.id, 10);
        const { book_id, title, cover } = req.body;

        if (isNaN(colId) || colId <= 0) {
            return errorResponse(res, 'ID koleksi tidak valid', 400);
        }
        if (!validateBookId(book_id)) {
            return errorResponse(res, 'ID buku tidak valid', 400);
        }
        if (!title || typeof title !== 'string' || !title.trim()) {
            return errorResponse(res, 'Judul buku wajib diisi', 400);
        }

        // Pastikan koleksi benar milik user yang request
        const owner = await db.get(
            'SELECT id FROM collections WHERE id = ? AND user_id = ?',
            [colId, userId]
        );
        if (!owner) {
            return errorResponse(res, 'Koleksi tidak ditemukan', 404);
        }

        const bId        = parseInt(book_id, 10);
        const cleanTitle = sanitize(title);
        const cleanCover = typeof cover === 'string' ? cover.trim() : '';

        await db.run(
            `INSERT INTO collection_items (collection_id, book_id, title, cover)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(collection_id, book_id) DO UPDATE SET
                title = excluded.title,
                cover = excluded.cover`,
            [colId, bId, cleanTitle, cleanCover]
        );

        return successResponse(res, 'Buku berhasil dimasukkan ke koleksi', {
            collection_id: colId,
            book_id: bId,
        }, 201);
    } catch (err) {
        console.error('[addItemToCollection Error]', err);
        return errorResponse(res, 'Gagal menambahkan buku ke koleksi', 500);
    }
}

// DELETE /api/collections/:id/items/:bookId — Hapus buku dari koleksi
async function removeItemFromCollection(req, res) {
    try {
        const userId = req.user.id;
        const colId  = parseInt(req.params.id, 10);
        const { bookId } = req.params;

        if (isNaN(colId) || colId <= 0 || !validateBookId(bookId)) {
            return errorResponse(res, 'Parameter tidak valid', 400);
        }

        // Verifikasi kepemilikan koleksi
        const owner = await db.get(
            'SELECT id FROM collections WHERE id = ? AND user_id = ?',
            [colId, userId]
        );
        if (!owner) {
            return errorResponse(res, 'Koleksi tidak ditemukan', 404);
        }

        const result = await db.run(
            'DELETE FROM collection_items WHERE collection_id = ? AND book_id = ?',
            [colId, parseInt(bookId, 10)]
        );

        return successResponse(res, 'Buku berhasil dikeluarkan dari koleksi', {
            deleted: result.changes > 0,
            collection_id: colId,
            book_id: parseInt(bookId, 10),
        });
    } catch (err) {
        console.error('[removeItemFromCollection Error]', err);
        return errorResponse(res, 'Gagal menghapus buku dari koleksi', 500);
    }
}

module.exports = {
    getCollections,
    getCollectionDetail,
    createCollection,
    updateCollection,
    deleteCollection,
    addItemToCollection,
    removeItemFromCollection,
};
