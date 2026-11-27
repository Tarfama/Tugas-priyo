<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReadingStatus;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReadingStatusController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/reading-status?status=want|reading|finished
     */
    public function index(Request $request): JsonResponse
    {
        $query = ReadingStatus::where('user_id', $request->user()->id);

        $status = $request->query('status');
        if (is_string($status) && in_array(strtolower(trim($status)), ['want', 'reading', 'finished'], true)) {
            $query->where('status', strtolower(trim($status)));
        }

        $rows = $query->orderByDesc('updated_at')
            ->get(['id', 'book_id', 'title', 'cover', 'status', 'updated_at']);

        return $this->success('Daftar status bacaan berhasil dimuat', $rows);
    }

    /**
     * PUT /api/reading-status/{bookId}
     */
    public function upsert(Request $request, string $bookId): JsonResponse
    {
        $bId = filter_var($bookId, FILTER_VALIDATE_INT);
        if (!$bId || $bId <= 0) {
            return $this->error('ID buku tidak valid', 400);
        }

        $userId = $request->user()->id;
        $status = $request->input('status');

        if (!$status || $status === 'none') {
            ReadingStatus::where('user_id', $userId)->where('book_id', $bId)->delete();
            return $this->success('Status bacaan berhasil dihapus', ['book_id' => $bId, 'status' => null]);
        }

        $cleanStatus = is_string($status) ? strtolower(trim($status)) : '';
        if (!in_array($cleanStatus, ['want', 'reading', 'finished'], true)) {
            return $this->error("Status harus salah satu dari: 'want', 'reading', atau 'finished'", 400);
        }

        $cleanTitle = $request->filled('title')
            ? mb_substr(trim(strip_tags($request->input('title'))), 0, 255)
            : 'Buku #' . $bId;
        $cleanCover = is_string($request->input('cover')) ? trim($request->input('cover')) : '';

        ReadingStatus::updateOrCreate(
            ['user_id' => $userId, 'book_id' => $bId],
            [
                'title'      => $cleanTitle,
                'cover'      => $cleanCover,
                'status'     => $cleanStatus,
                'updated_at' => now(),
            ]
        );

        return $this->success('Status bacaan berhasil diperbarui', [
            'book_id' => $bId,
            'status'  => $cleanStatus,
        ]);
    }
}
