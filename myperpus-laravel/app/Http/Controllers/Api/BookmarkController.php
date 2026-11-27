<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bookmark;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookmarkController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/bookmarks
     */
    public function index(Request $request): JsonResponse
    {
        $rows = Bookmark::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get(['id', 'book_id', 'title', 'cover', 'authors', 'created_at']);

        return $this->success('Daftar bookmark berhasil dimuat', $rows);
    }

    /**
     * POST /api/bookmarks
     */
    public function store(Request $request): JsonResponse
    {
        $bookId = filter_var($request->input('book_id'), FILTER_VALIDATE_INT);
        $title  = $request->input('title');

        if (!$bookId || $bookId <= 0) {
            return $this->error('ID buku tidak valid', 400);
        }
        if (!$title || !is_string($title) || !trim($title)) {
            return $this->error('Judul buku wajib diisi', 400);
        }

        $cleanTitle   = mb_substr(trim(strip_tags($title)), 0, 255);
        $cleanCover   = is_string($request->input('cover')) ? trim($request->input('cover')) : '';
        $cleanAuthors = is_string($request->input('authors')) ? mb_substr(trim(strip_tags($request->input('authors'))), 0, 255) : '';

        $bookmark = Bookmark::updateOrCreate(
            ['user_id' => $request->user()->id, 'book_id' => $bookId],
            [
                'title'      => $cleanTitle,
                'cover'      => $cleanCover,
                'authors'    => $cleanAuthors,
                'created_at' => now(),
            ]
        );

        return $this->success('Buku berhasil ditambahkan ke bookmark', [
            'id'      => $bookmark->id,
            'book_id' => $bookmark->book_id,
            'title'   => $bookmark->title,
        ], 201);
    }

    /**
     * DELETE /api/bookmarks/{bookId}
     */
    public function destroy(Request $request, string $bookId): JsonResponse
    {
        $bId = filter_var($bookId, FILTER_VALIDATE_INT);
        if (!$bId || $bId <= 0) {
            return $this->error('ID buku tidak valid', 400);
        }

        $deleted = Bookmark::where('user_id', $request->user()->id)
            ->where('book_id', $bId)
            ->delete();

        return $this->success('Bookmark berhasil dihapus', [
            'deleted' => $deleted > 0,
            'book_id' => $bId,
        ]);
    }
}
