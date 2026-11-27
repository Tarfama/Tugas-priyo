<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReadingHistory;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HistoryController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/history
     */
    public function index(Request $request): JsonResponse
    {
        $rows = ReadingHistory::where('user_id', $request->user()->id)
            ->orderByDesc('last_read_at')
            ->limit(50)
            ->get(['id', 'book_id', 'title', 'cover', 'authors', 'last_read_at', 'read_count']);

        return $this->success('Riwayat bacaan berhasil dimuat', $rows);
    }

    /**
     * POST /api/history
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

        $userId       = $request->user()->id;
        $cleanTitle   = mb_substr(trim(strip_tags($title)), 0, 255);
        $cleanCover   = is_string($request->input('cover')) ? trim($request->input('cover')) : '';
        $cleanAuthors = is_string($request->input('authors')) ? mb_substr(trim(strip_tags($request->input('authors'))), 0, 255) : '';

        $existing = ReadingHistory::where('user_id', $userId)->where('book_id', $bookId)->first();

        if ($existing) {
            $existing->update([
                'title'        => $cleanTitle,
                'cover'        => $cleanCover,
                'authors'      => $cleanAuthors,
                'last_read_at' => now(),
                'read_count'   => $existing->read_count + 1,
            ]);
        } else {
            ReadingHistory::create([
                'user_id'      => $userId,
                'book_id'      => $bookId,
                'title'        => $cleanTitle,
                'cover'        => $cleanCover,
                'authors'      => $cleanAuthors,
                'last_read_at' => now(),
                'read_count'   => 1,
            ]);
        }

        return $this->success('Riwayat bacaan berhasil diperbarui', ['book_id' => $bookId], 201);
    }

    /**
     * DELETE /api/history/{bookId}
     */
    public function destroyItem(Request $request, string $bookId): JsonResponse
    {
        $bId = filter_var($bookId, FILTER_VALIDATE_INT);
        if (!$bId || $bId <= 0) {
            return $this->error('ID buku tidak valid', 400);
        }

        $deleted = ReadingHistory::where('user_id', $request->user()->id)
            ->where('book_id', $bId)
            ->delete();

        return $this->success('Riwayat berhasil dihapus', [
            'deleted' => $deleted > 0,
            'book_id' => $bId,
        ]);
    }

    /**
     * DELETE /api/history
     */
    public function clearAll(Request $request): JsonResponse
    {
        $deleted = ReadingHistory::where('user_id', $request->user()->id)->delete();

        return $this->success('Seluruh riwayat bacaan berhasil dibersihkan', [
            'total_deleted' => $deleted,
        ]);
    }
}
