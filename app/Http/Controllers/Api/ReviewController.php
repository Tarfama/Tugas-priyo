<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/books/{bookId}/reviews (Publik, paginasi)
     */
    public function bookReviews(Request $request, string $bookId): JsonResponse
    {
        $bId = filter_var($bookId, FILTER_VALIDATE_INT);
        if (!$bId || $bId <= 0) {
            return $this->error('ID buku tidak valid', 400);
        }

        [$page, $limit, $offset] = $this->parsePagination($request, 10, 50);

        $baseQuery = Review::where('book_id', $bId)->where('status', 'visible');
        $total     = (clone $baseQuery)->count();
        $avgRaw    = (clone $baseQuery)->avg('rating');
        $avg       = $avgRaw ? round((float) $avgRaw, 1) : 0;

        $reviews = $baseQuery->with('user:id,username,full_name')
            ->orderByDesc('created_at')
            ->offset($offset)
            ->limit($limit)
            ->get()
            ->map(function (Review $r) {
                return [
                    'id'         => $r->id,
                    'user_id'    => $r->user_id,
                    'rating'     => $r->rating,
                    'content'    => $r->content,
                    'created_at' => $r->created_at,
                    'updated_at' => $r->updated_at,
                    'username'   => $r->user?->username ?? 'Anonim',
                    'full_name'  => $r->user?->full_name,
                ];
            });

        return $this->paginated('Ulasan buku berhasil dimuat', $reviews, $total, $page, $limit, [
            'stats' => [
                'average_rating' => $avg,
                'total_reviews'  => $total,
            ],
        ]);
    }

    /**
     * POST /api/books/{bookId}/reviews
     */
    public function submitReview(Request $request, string $bookId): JsonResponse
    {
        $bId = filter_var($bookId, FILTER_VALIDATE_INT);
        if (!$bId || $bId <= 0) {
            return $this->error('ID buku tidak valid', 400);
        }

        $rating = filter_var($request->input('rating'), FILTER_VALIDATE_INT);
        if (!$rating || $rating < 1 || $rating > 5) {
            return $this->error('Rating harus berupa angka antara 1 sampai 5', 400);
        }

        $content = $request->input('content', '');
        $cleanContent = '';
        if (is_string($content)) {
            $trimmed = trim($content);
            if (mb_strlen($trimmed) > 1000) {
                return $this->error('Konten ulasan maksimal 1000 karakter', 400);
            }
            $cleanContent = strip_tags($trimmed);
        }

        $cleanTitle = $request->filled('book_title') && is_string($request->input('book_title'))
            ? mb_substr(trim(strip_tags($request->input('book_title'))), 0, 255)
            : 'Buku #' . $bId;

        $review = Review::updateOrCreate(
            ['user_id' => $request->user()->id, 'book_id' => $bId],
            [
                'book_title' => $cleanTitle,
                'rating'     => $rating,
                'content'    => $cleanContent,
                'status'     => 'visible',
            ]
        );

        return $this->success('Ulasan Anda berhasil disimpan', [
            'id'      => $review->id,
            'book_id' => $bId,
            'rating'  => $rating,
            'content' => $cleanContent,
        ], 201);
    }

    /**
     * DELETE /api/reviews/{id}
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $reviewId = filter_var($id, FILTER_VALIDATE_INT);
        if (!$reviewId || $reviewId <= 0) {
            return $this->error('ID ulasan tidak valid', 400);
        }

        $review = Review::find($reviewId);
        if (!$review) {
            return $this->error('Ulasan tidak ditemukan', 404);
        }

        $user = $request->user();
        if ($review->user_id !== $user->id && $user->role !== 'admin') {
            return $this->error('Anda tidak memiliki hak untuk menghapus ulasan ini', 403);
        }

        $review->delete();

        return $this->success('Ulasan berhasil dihapus', ['id' => $reviewId]);
    }

    /**
     * GET /api/me/reviews
     */
    public function myReviews(Request $request): JsonResponse
    {
        $rows = Review::where('user_id', $request->user()->id)
            ->orderByDesc('updated_at')
            ->get(['id', 'book_id', 'book_title', 'rating', 'content', 'status', 'created_at', 'updated_at']);

        return $this->success('Daftar ulasan saya berhasil dimuat', $rows);
    }
}
