<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bookmark;
use App\Models\Collection;
use App\Models\ReadingHistory;
use App\Models\ReadingStatus;
use App\Models\Review;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookUserController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/books/{bookId}/me
     */
    public function me(Request $request, string $bookId): JsonResponse
    {
        $bId = filter_var($bookId, FILTER_VALIDATE_INT);
        if (!$bId || $bId <= 0) {
            return $this->error('ID buku tidak valid', 400);
        }

        $userId = $request->user()->id;

        $bookmark = Bookmark::where('user_id', $userId)
            ->where('book_id', $bId)
            ->first(['id', 'created_at']);

        $statusRow = ReadingStatus::where('user_id', $userId)
            ->where('book_id', $bId)
            ->first(['status', 'updated_at']);

        $review = Review::where('user_id', $userId)
            ->where('book_id', $bId)
            ->first(['id', 'rating', 'content', 'status', 'created_at', 'updated_at']);

        $collections = Collection::where('user_id', $userId)
            ->whereHas('items', fn ($q) => $q->where('book_id', $bId))
            ->get(['id', 'name']);

        return $this->success('Data user untuk buku berhasil dimuat', [
            'book_id'        => $bId,
            'is_bookmarked'  => (bool) $bookmark,
            'bookmark_date'  => $bookmark?->created_at,
            'reading_status' => $statusRow?->status,
            'my_review'      => $review,
            'in_collections' => $collections,
        ]);
    }

    /**
     * POST /api/sync/local
     */
    public function syncLocal(Request $request): JsonResponse
    {
        $userId          = $request->user()->id;
        $bookmarks       = $request->input('bookmarks', []);
        $history         = $request->input('history', []);
        $syncedBookmarks = 0;
        $syncedHistory   = 0;

        if (is_array($bookmarks)) {
            foreach (array_slice($bookmarks, 0, 50) as $item) {
                if (!is_array($item) || empty($item['id'])) {
                    continue;
                }
                $bId = filter_var($item['id'], FILTER_VALIDATE_INT);
                if (!$bId || $bId <= 0) {
                    continue;
                }

                $title   = mb_substr(trim(strip_tags((string) ($item['judul'] ?? $item['title'] ?? 'Buku #' . $bId))), 0, 255);
                $cover   = is_string($item['cover'] ?? null) ? trim($item['cover']) : '';
                $authors = is_string($item['penulis'] ?? null) ? mb_substr(trim(strip_tags($item['penulis'])), 0, 255) : '';

                Bookmark::firstOrCreate(
                    ['user_id' => $userId, 'book_id' => $bId],
                    ['title' => $title, 'cover' => $cover, 'authors' => $authors, 'created_at' => now()]
                );
                $syncedBookmarks++;
            }
        }

        if (is_array($history)) {
            foreach (array_slice($history, 0, 50) as $item) {
                if (!is_array($item) || empty($item['id'])) {
                    continue;
                }
                $bId = filter_var($item['id'], FILTER_VALIDATE_INT);
                if (!$bId || $bId <= 0) {
                    continue;
                }

                $title   = mb_substr(trim(strip_tags((string) ($item['judul'] ?? $item['title'] ?? 'Buku #' . $bId))), 0, 255);
                $cover   = is_string($item['cover'] ?? null) ? trim($item['cover']) : '';
                $authors = is_string($item['penulis'] ?? null) ? mb_substr(trim(strip_tags($item['penulis'])), 0, 255) : '';

                ReadingHistory::updateOrCreate(
                    ['user_id' => $userId, 'book_id' => $bId],
                    ['title' => $title, 'cover' => $cover, 'authors' => $authors, 'last_read_at' => now()]
                );
                $syncedHistory++;
            }
        }

        return $this->success('Sinkronisasi data lokal selesai', [
            'bookmarks_synced' => $syncedBookmarks,
            'history_synced'   => $syncedHistory,
        ]);
    }
}
