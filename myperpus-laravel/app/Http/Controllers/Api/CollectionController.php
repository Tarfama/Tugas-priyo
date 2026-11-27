<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use App\Models\CollectionItem;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CollectionController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/collections
     */
    public function index(Request $request): JsonResponse
    {
        $collections = Collection::where('user_id', $request->user()->id)
            ->withCount('items as total_books')
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'description', 'created_at']);

        return $this->success('Koleksi berhasil dimuat', $collections);
    }

    /**
     * GET /api/collections/{id}
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $colId = filter_var($id, FILTER_VALIDATE_INT);
        if (!$colId || $colId <= 0) {
            return $this->error('ID koleksi tidak valid', 400);
        }

        $collection = Collection::where('id', $colId)
            ->where('user_id', $request->user()->id)
            ->first(['id', 'name', 'description', 'created_at']);

        if (!$collection) {
            return $this->error('Koleksi tidak ditemukan', 404);
        }

        $items = CollectionItem::where('collection_id', $colId)
            ->orderByDesc('added_at')
            ->get(['book_id', 'title', 'cover', 'added_at']);

        return $this->success('Detail koleksi berhasil dimuat', [
            'id'          => $collection->id,
            'name'        => $collection->name,
            'description' => $collection->description,
            'created_at'  => $collection->created_at,
            'items'       => $items,
        ]);
    }

    /**
     * POST /api/collections
     */
    public function store(Request $request): JsonResponse
    {
        $name = $request->input('name');
        if (!$name || !is_string($name) || !trim($name)) {
            return $this->error('Nama koleksi wajib diisi', 400);
        }

        $cleanName = trim(strip_tags($name));
        if (mb_strlen($cleanName) > 60) {
            return $this->error('Nama koleksi maksimal 60 karakter', 400);
        }

        $cleanDesc = $request->filled('description') && is_string($request->input('description'))
            ? mb_substr(trim(strip_tags($request->input('description'))), 0, 500)
            : null;

        $collection = Collection::create([
            'user_id'     => $request->user()->id,
            'name'        => $cleanName,
            'description' => $cleanDesc,
            'created_at'  => now(),
        ]);

        return $this->success('Koleksi berhasil dibuat', [
            'id'          => $collection->id,
            'name'        => $collection->name,
            'description' => $collection->description,
        ], 201);
    }

    /**
     * PUT /api/collections/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $colId = filter_var($id, FILTER_VALIDATE_INT);
        if (!$colId || $colId <= 0) {
            return $this->error('ID koleksi tidak valid', 400);
        }

        $name = $request->input('name');
        if (!$name || !is_string($name) || !trim($name)) {
            return $this->error('Nama koleksi wajib diisi', 400);
        }

        $cleanName = trim(strip_tags($name));
        if (mb_strlen($cleanName) > 60) {
            return $this->error('Nama koleksi maksimal 60 karakter', 400);
        }

        $collection = Collection::where('id', $colId)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$collection) {
            return $this->error('Koleksi tidak ditemukan atau tidak ada perubahan', 404);
        }

        $cleanDesc = $request->has('description') && is_string($request->input('description'))
            ? mb_substr(trim(strip_tags($request->input('description'))), 0, 500)
            : null;

        $collection->update([
            'name'        => $cleanName,
            'description' => $cleanDesc,
        ]);

        return $this->success('Koleksi berhasil diperbarui', [
            'id'          => $collection->id,
            'name'        => $cleanName,
            'description' => $cleanDesc,
        ]);
    }

    /**
     * DELETE /api/collections/{id}
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $colId = filter_var($id, FILTER_VALIDATE_INT);
        if (!$colId || $colId <= 0) {
            return $this->error('ID koleksi tidak valid', 400);
        }

        $deleted = Collection::where('id', $colId)
            ->where('user_id', $request->user()->id)
            ->delete();

        if ($deleted === 0) {
            return $this->error('Koleksi tidak ditemukan', 404);
        }

        return $this->success('Koleksi berhasil dihapus', ['id' => $colId]);
    }

    /**
     * POST /api/collections/{id}/items
     */
    public function addItem(Request $request, string $id): JsonResponse
    {
        $colId  = filter_var($id, FILTER_VALIDATE_INT);
        $bookId = filter_var($request->input('book_id'), FILTER_VALIDATE_INT);
        $title  = $request->input('title');

        if (!$colId || $colId <= 0) {
            return $this->error('ID koleksi tidak valid', 400);
        }
        if (!$bookId || $bookId <= 0) {
            return $this->error('ID buku tidak valid', 400);
        }
        if (!$title || !is_string($title) || !trim($title)) {
            return $this->error('Judul buku wajib diisi', 400);
        }

        $owner = Collection::where('id', $colId)
            ->where('user_id', $request->user()->id)
            ->exists();

        if (!$owner) {
            return $this->error('Koleksi tidak ditemukan', 404);
        }

        $cleanTitle = mb_substr(trim(strip_tags($title)), 0, 255);
        $cleanCover = is_string($request->input('cover')) ? trim($request->input('cover')) : '';

        CollectionItem::updateOrInsert(
            ['collection_id' => $colId, 'book_id' => $bookId],
            ['title' => $cleanTitle, 'cover' => $cleanCover, 'added_at' => now()]
        );

        return $this->success('Buku berhasil dimasukkan ke koleksi', [
            'collection_id' => $colId,
            'book_id'       => $bookId,
        ], 201);
    }

    /**
     * DELETE /api/collections/{id}/items/{bookId}
     */
    public function removeItem(Request $request, string $id, string $bookId): JsonResponse
    {
        $colId = filter_var($id, FILTER_VALIDATE_INT);
        $bId   = filter_var($bookId, FILTER_VALIDATE_INT);

        if (!$colId || $colId <= 0 || !$bId || $bId <= 0) {
            return $this->error('Parameter tidak valid', 400);
        }

        $owner = Collection::where('id', $colId)
            ->where('user_id', $request->user()->id)
            ->exists();

        if (!$owner) {
            return $this->error('Koleksi tidak ditemukan', 404);
        }

        $deleted = CollectionItem::where('collection_id', $colId)
            ->where('book_id', $bId)
            ->delete();

        return $this->success('Buku berhasil dikeluarkan dari koleksi', [
            'deleted'       => $deleted > 0,
            'collection_id' => $colId,
            'book_id'       => $bId,
        ]);
    }
}
