<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AuditLog;
use App\Models\Bookmark;
use App\Models\FeaturedBook;
use App\Models\HiddenBook;
use App\Models\Review;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    use ApiResponse;

    private function recordAudit(int $adminId, string $action, string $targetType, mixed $targetId = null, mixed $detail = null): void
    {
        AuditLog::create([
            'admin_id'    => $adminId,
            'action'      => $action,
            'target_type' => $targetType,
            'target_id'   => $targetId !== null ? (string) $targetId : null,
            'detail'      => is_array($detail) ? json_encode($detail) : ($detail !== null ? (string) $detail : null),
            'created_at'  => now(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // 1. DASHBOARD STATS
    // ─────────────────────────────────────────────────────────────
    public function stats(): JsonResponse
    {
        $totalUsers    = User::count();
        $newUsers7Days = User::where('created_at', '>=', now()->subDays(7))->count();
        $totalBookmarks= Bookmark::count();
        $totalReviews  = Review::count();
        $totalHidden   = HiddenBook::count();
        $totalFeatured = FeaturedBook::count();

        $topBookmarked = Bookmark::select('book_id', 'title', 'cover', DB::raw('COUNT(user_id) as bookmark_count'))
            ->groupBy('book_id', 'title', 'cover')
            ->orderByDesc('bookmark_count')
            ->limit(5)
            ->get();

        $topReviewed = Review::select('book_id', 'book_title as title', DB::raw('COUNT(id) as review_count'), DB::raw('AVG(rating) as avg_rating'))
            ->groupBy('book_id', 'book_title')
            ->orderByDesc('review_count')
            ->limit(5)
            ->get()
            ->map(fn ($r) => [
                'book_id'      => $r->book_id,
                'title'        => $r->title,
                'review_count' => (int) $r->review_count,
                'avg_rating'   => $r->avg_rating ? round((float) $r->avg_rating, 1) : 0,
            ]);

        $recentLogs = AuditLog::with('admin:id,username')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn ($l) => [
                'id'             => $l->id,
                'action'         => $l->action,
                'target_type'    => $l->target_type,
                'target_id'      => $l->target_id,
                'detail'         => $l->detail,
                'created_at'     => $l->created_at,
                'admin_username' => $l->admin?->username ?? 'System',
            ]);

        return $this->success('Statistik admin berhasil dimuat', [
            'overview' => [
                'total_users'          => $totalUsers,
                'new_users_7_days'     => $newUsers7Days,
                'total_bookmarks'      => $totalBookmarks,
                'total_reviews'        => $totalReviews,
                'total_hidden_books'   => $totalHidden,
                'total_featured_books' => $totalFeatured,
            ],
            'top_bookmarked' => $topBookmarked,
            'top_reviewed'   => $topReviewed,
            'recent_logs'    => $recentLogs,
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // 2. MANAJEMEN PENGGUNA
    // ─────────────────────────────────────────────────────────────
    public function users(Request $request): JsonResponse
    {
        [$page, $limit, $offset] = $this->parsePagination($request, 10, 50);

        $query = User::query();

        $q = $request->query('q');
        if (is_string($q) && trim($q) !== '') {
            $term = '%' . trim($q) . '%';
            $query->where(function ($sub) use ($term) {
                $sub->where('username', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhere('full_name', 'like', $term);
            });
        }

        $role = $request->query('role');
        if (in_array($role, ['user', 'admin'], true)) {
            $query->where('role', $role);
        }

        $status = $request->query('status');
        if ($status !== null && $status !== '') {
            $query->where('is_active', (int) $status === 1);
        }

        $total = (clone $query)->count();
        $rows  = $query->orderByDesc('created_at')
            ->offset($offset)
            ->limit($limit)
            ->get(['id', 'username', 'email', 'role', 'is_active', 'full_name', 'bio', 'last_login_at', 'created_at']);

        return $this->paginated('Daftar pengguna berhasil dimuat', $rows, $total, $page, $limit);
    }

    public function updateUser(Request $request, string $id): JsonResponse
    {
        $adminId      = $request->user()->id;
        $targetUserId = filter_var($id, FILTER_VALIDATE_INT);

        if (!$targetUserId || $targetUserId <= 0) {
            return $this->error('ID pengguna tidak valid', 400);
        }

        $targetUser = User::find($targetUserId);
        if (!$targetUser) {
            return $this->error('Pengguna tidak ditemukan', 404);
        }

        $role     = $request->input('role');
        $isActive = $request->input('is_active');

        if ($targetUserId === $adminId) {
            if (($role && $role !== 'admin') || ($isActive !== null && (int) $isActive === 0)) {
                return $this->error('Anda tidak dapat menurunkan atau menonaktifkan akun Anda sendiri', 400);
            }
        }

        $willDemoteOrDeactivate =
            ($role && $role !== 'admin' && $targetUser->role === 'admin') ||
            ($isActive !== null && (int) $isActive === 0 && $targetUser->role === 'admin');

        if ($willDemoteOrDeactivate) {
            $otherActiveAdmins = User::where('role', 'admin')
                ->where('is_active', true)
                ->where('id', '!=', $targetUserId)
                ->count();

            if ($otherActiveAdmins < 1) {
                return $this->error('Aksi ditolak. Harus selalu tersisa minimal satu Administrator aktif.', 400);
            }
        }

        $updates = [];
        if (in_array($role, ['user', 'admin'], true)) {
            $updates['role'] = $role;
        }
        if ($isActive !== null) {
            $updates['is_active'] = (int) $isActive === 1;
        }

        if (empty($updates)) {
            return $this->error('Tidak ada data perubahan yang diberikan', 400);
        }

        $targetUser->update($updates);
        $targetUser->refresh();

        $this->recordAudit($adminId, 'UPDATE_USER', 'user', $targetUserId, [
            'changes'         => $updates,
            'target_username' => $targetUser->username,
        ]);

        return $this->success('Status pengguna berhasil diperbarui', [
            'id'        => $targetUser->id,
            'username'  => $targetUser->username,
            'email'     => $targetUser->email,
            'role'      => $targetUser->role,
            'is_active' => $targetUser->is_active ? 1 : 0,
            'full_name' => $targetUser->full_name,
        ]);
    }

    public function deleteUser(Request $request, string $id): JsonResponse
    {
        $adminId      = $request->user()->id;
        $targetUserId = filter_var($id, FILTER_VALIDATE_INT);

        if (!$targetUserId || $targetUserId <= 0) {
            return $this->error('ID pengguna tidak valid', 400);
        }

        if ($targetUserId === $adminId) {
            return $this->error('Anda tidak dapat menghapus akun Anda sendiri dari dashboard', 400);
        }

        $targetUser = User::find($targetUserId);
        if (!$targetUser) {
            return $this->error('Pengguna tidak ditemukan', 404);
        }

        if ($targetUser->role === 'admin') {
            $otherActiveAdmins = User::where('role', 'admin')
                ->where('is_active', true)
                ->where('id', '!=', $targetUserId)
                ->count();

            if ($otherActiveAdmins < 1) {
                return $this->error('Tidak dapat menghapus. Harus tersisa minimal satu Administrator aktif.', 400);
            }
        }

        $deletedUsername = $targetUser->username;
        $targetUser->tokens()->delete();
        $targetUser->delete();

        $this->recordAudit($adminId, 'DELETE_USER', 'user', $targetUserId, [
            'deleted_username' => $deletedUsername,
        ]);

        return $this->success("Pengguna {$deletedUsername} berhasil dihapus.");
    }

    // ─────────────────────────────────────────────────────────────
    // 3. MODERASI ULASAN
    // ─────────────────────────────────────────────────────────────
    public function reviews(Request $request): JsonResponse
    {
        [$page, $limit, $offset] = $this->parsePagination($request, 10, 50);

        $query  = Review::with('user:id,username,email');
        $status = $request->query('status');

        if (in_array($status, ['visible', 'hidden'], true)) {
            $query->where('status', $status);
        }

        $total = (clone $query)->count();
        $rows  = $query->orderByDesc('created_at')
            ->offset($offset)
            ->limit($limit)
            ->get()
            ->map(fn (Review $r) => [
                'id'         => $r->id,
                'user_id'    => $r->user_id,
                'book_id'    => $r->book_id,
                'book_title' => $r->book_title,
                'rating'     => $r->rating,
                'content'    => $r->content,
                'status'     => $r->status,
                'created_at' => $r->created_at,
                'updated_at' => $r->updated_at,
                'username'   => $r->user?->username ?? 'Anonim',
                'email'      => $r->user?->email ?? '',
            ]);

        return $this->paginated('Daftar ulasan admin berhasil dimuat', $rows, $total, $page, $limit);
    }

    public function updateReview(Request $request, string $id): JsonResponse
    {
        $reviewId = filter_var($id, FILTER_VALIDATE_INT);
        $status   = $request->input('status');

        if (!$reviewId || $reviewId <= 0) {
            return $this->error('ID ulasan tidak valid', 400);
        }
        if (!in_array($status, ['visible', 'hidden'], true)) {
            return $this->error("Status ulasan harus 'visible' atau 'hidden'", 400);
        }

        $review = Review::find($reviewId);
        if (!$review) {
            return $this->error('Ulasan tidak ditemukan', 404);
        }

        $review->update(['status' => $status]);

        $this->recordAudit($request->user()->id, 'MODERATE_REVIEW', 'review', $reviewId, [
            'new_status' => $status,
            'book_id'    => $review->book_id,
        ]);

        return $this->success("Status ulasan berhasil diubah menjadi {$status}", [
            'id'     => $reviewId,
            'status' => $status,
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // 4. BUKU PILIHAN (FEATURED BOOKS)
    // ─────────────────────────────────────────────────────────────
    public function featuredIndex(): JsonResponse
    {
        $rows = FeaturedBook::with('creator:id,username')
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (FeaturedBook $fb) => [
                'book_id'    => $fb->book_id,
                'title'      => $fb->title,
                'cover'      => $fb->cover,
                'authors'    => $fb->authors,
                'note'       => $fb->note,
                'sort_order' => $fb->sort_order,
                'created_at' => $fb->created_at,
                'added_by'   => $fb->creator?->username ?? 'Admin',
            ]);

        return $this->success('Daftar buku pilihan berhasil dimuat', $rows);
    }

    public function featuredStore(Request $request): JsonResponse
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
        $cleanNote    = $request->filled('note') ? mb_substr(trim(strip_tags((string) $request->input('note'))), 0, 255) : null;
        $sortOrder    = (int) $request->input('sort_order', 0);

        FeaturedBook::updateOrCreate(
            ['book_id' => $bookId],
            [
                'title'      => $cleanTitle,
                'cover'      => $cleanCover,
                'authors'    => $cleanAuthors,
                'note'       => $cleanNote,
                'sort_order' => $sortOrder,
                'created_by' => $request->user()->id,
                'created_at' => now(),
            ]
        );

        $this->recordAudit($request->user()->id, 'ADD_FEATURED_BOOK', 'book', $bookId, ['title' => $cleanTitle]);

        return $this->success('Buku berhasil dijadikan buku pilihan', ['book_id' => $bookId], 201);
    }

    public function featuredUpdate(Request $request, string $bookId): JsonResponse
    {
        $bId = filter_var($bookId, FILTER_VALIDATE_INT);
        if (!$bId || $bId <= 0) {
            return $this->error('ID buku tidak valid', 400);
        }

        $fb = FeaturedBook::find($bId);
        if (!$fb) {
            return $this->error('Buku pilihan tidak ditemukan', 404);
        }

        $cleanNote = $request->has('note')
            ? mb_substr(trim(strip_tags((string) $request->input('note'))), 0, 255)
            : $fb->note;
        $sortOrder = (int) $request->input('sort_order', $fb->sort_order);

        $fb->update(['note' => $cleanNote, 'sort_order' => $sortOrder]);

        $this->recordAudit($request->user()->id, 'UPDATE_FEATURED_BOOK', 'book', $bId, ['sort_order' => $sortOrder]);

        return $this->success('Buku pilihan berhasil diperbarui');
    }

    public function featuredDestroy(Request $request, string $bookId): JsonResponse
    {
        $bId = filter_var($bookId, FILTER_VALIDATE_INT);
        if (!$bId || $bId <= 0) {
            return $this->error('ID buku tidak valid', 400);
        }

        $deleted = FeaturedBook::where('book_id', $bId)->delete();
        if ($deleted === 0) {
            return $this->error('Buku tidak ditemukan dalam daftar pilihan', 404);
        }

        $this->recordAudit($request->user()->id, 'REMOVE_FEATURED_BOOK', 'book', $bId);

        return $this->success('Buku dihapus dari daftar pilihan');
    }

    // ─────────────────────────────────────────────────────────────
    // 5. SEMBUNYIKAN BUKU (HIDDEN BOOKS)
    // ─────────────────────────────────────────────────────────────
    public function hiddenIndex(): JsonResponse
    {
        $rows = HiddenBook::with('creator:id,username')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (HiddenBook $hb) => [
                'book_id'    => $hb->book_id,
                'title'      => $hb->title,
                'reason'     => $hb->reason,
                'created_at' => $hb->created_at,
                'hidden_by'  => $hb->creator?->username ?? 'Admin',
            ]);

        return $this->success('Daftar buku tersembunyi berhasil dimuat', $rows);
    }

    public function hiddenStore(Request $request): JsonResponse
    {
        $bookId = filter_var($request->input('book_id'), FILTER_VALIDATE_INT);
        if (!$bookId || $bookId <= 0) {
            return $this->error('ID buku tidak valid', 400);
        }

        $cleanTitle  = $request->filled('title') ? mb_substr(trim(strip_tags((string) $request->input('title'))), 0, 255) : 'Buku #' . $bookId;
        $cleanReason = $request->filled('reason') ? mb_substr(trim(strip_tags((string) $request->input('reason'))), 0, 255) : 'Tidak sesuai kebijakan konten';

        HiddenBook::updateOrCreate(
            ['book_id' => $bookId],
            [
                'title'      => $cleanTitle,
                'reason'     => $cleanReason,
                'created_by' => $request->user()->id,
                'created_at' => now(),
            ]
        );

        $this->recordAudit($request->user()->id, 'HIDE_BOOK', 'book', $bookId, ['reason' => $cleanReason]);

        return $this->success('Buku berhasil disembunyikan dari katalog publik', ['book_id' => $bookId], 201);
    }

    public function hiddenDestroy(Request $request, string $bookId): JsonResponse
    {
        $bId = filter_var($bookId, FILTER_VALIDATE_INT);
        if (!$bId || $bId <= 0) {
            return $this->error('ID buku tidak valid', 400);
        }

        $deleted = HiddenBook::where('book_id', $bId)->delete();
        if ($deleted === 0) {
            return $this->error('Buku tidak ditemukan di daftar tersembunyi', 404);
        }

        $this->recordAudit($request->user()->id, 'UNHIDE_BOOK', 'book', $bId);

        return $this->success('Buku berhasil dikembalikan ke katalog publik');
    }

    // ─────────────────────────────────────────────────────────────
    // 6. PENGUMUMAN (ANNOUNCEMENTS)
    // ─────────────────────────────────────────────────────────────
    public function announcementsIndex(): JsonResponse
    {
        $rows = Announcement::with('creator:id,username')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Announcement $a) => [
                'id'         => $a->id,
                'title'      => $a->title,
                'content'    => $a->content,
                'is_active'  => $a->is_active ? 1 : 0,
                'created_at' => $a->created_at,
                'author'     => $a->creator?->username ?? 'Admin',
            ]);

        return $this->success('Daftar pengumuman berhasil dimuat', $rows);
    }

    public function announcementsStore(Request $request): JsonResponse
    {
        $title   = $request->input('title');
        $content = $request->input('content');

        if (!$title || !is_string($title) || !$content || !is_string($content)) {
            return $this->error('Judul dan isi pengumuman wajib diisi', 400);
        }

        $cleanTitle   = mb_substr(trim(strip_tags($title)), 0, 150);
        $cleanContent = mb_substr(trim(strip_tags($content)), 0, 2000);
        $isActive     = $request->has('is_active') ? ((int) $request->input('is_active') === 1) : true;

        $ann = Announcement::create([
            'title'      => $cleanTitle,
            'content'    => $cleanContent,
            'is_active'  => $isActive,
            'created_by' => $request->user()->id,
            'created_at' => now(),
        ]);

        $this->recordAudit($request->user()->id, 'CREATE_ANNOUNCEMENT', 'announcement', $ann->id, ['title' => $cleanTitle]);

        return $this->success('Pengumuman berhasil dibuat', [
            'id'        => $ann->id,
            'title'     => $cleanTitle,
            'is_active' => $isActive ? 1 : 0,
        ], 201);
    }

    public function announcementsUpdate(Request $request, string $id): JsonResponse
    {
        $annId = filter_var($id, FILTER_VALIDATE_INT);
        if (!$annId || $annId <= 0) {
            return $this->error('ID pengumuman tidak valid', 400);
        }

        $ann = Announcement::find($annId);
        if (!$ann) {
            return $this->error('Pengumuman tidak ditemukan', 404);
        }

        $updates = [];
        if ($request->filled('title') && is_string($request->input('title'))) {
            $updates['title'] = mb_substr(trim(strip_tags($request->input('title'))), 0, 150);
        }
        if ($request->filled('content') && is_string($request->input('content'))) {
            $updates['content'] = mb_substr(trim(strip_tags($request->input('content'))), 0, 2000);
        }
        if ($request->has('is_active')) {
            $updates['is_active'] = (int) $request->input('is_active') === 1;
        }

        if (empty($updates)) {
            return $this->error('Tidak ada data perubahan', 400);
        }

        $ann->update($updates);
        $this->recordAudit($request->user()->id, 'UPDATE_ANNOUNCEMENT', 'announcement', $annId);

        return $this->success('Pengumuman berhasil diperbarui');
    }

    public function announcementsDestroy(Request $request, string $id): JsonResponse
    {
        $annId = filter_var($id, FILTER_VALIDATE_INT);
        if (!$annId || $annId <= 0) {
            return $this->error('ID pengumuman tidak valid', 400);
        }

        $deleted = Announcement::where('id', $annId)->delete();
        if ($deleted === 0) {
            return $this->error('Pengumuman tidak ditemukan', 404);
        }

        $this->recordAudit($request->user()->id, 'DELETE_ANNOUNCEMENT', 'announcement', $annId);

        return $this->success('Pengumuman berhasil dihapus');
    }

    // ─────────────────────────────────────────────────────────────
    // 7. AUDIT LOGS
    // ─────────────────────────────────────────────────────────────
    public function logs(Request $request): JsonResponse
    {
        [$page, $limit, $offset] = $this->parsePagination($request, 15, 50);

        $total = AuditLog::count();
        $rows  = AuditLog::with('admin:id,username,email')
            ->orderByDesc('created_at')
            ->offset($offset)
            ->limit($limit)
            ->get()
            ->map(fn (AuditLog $l) => [
                'id'             => $l->id,
                'action'         => $l->action,
                'target_type'    => $l->target_type,
                'target_id'      => $l->target_id,
                'detail'         => $l->detail,
                'created_at'     => $l->created_at,
                'admin_username' => $l->admin?->username ?? 'System',
                'admin_email'    => $l->admin?->email ?? '',
            ]);

        return $this->paginated('Log aktivitas berhasil dimuat', $rows, $total, $page, $limit);
    }

    // ─────────────────────────────────────────────────────────────
    // 8. ENDPOINT PUBLIK (KATALOG & PENGUMUMAN)
    // ─────────────────────────────────────────────────────────────
    public function publicFeatured(): JsonResponse
    {
        $rows = FeaturedBook::orderBy('sort_order')
            ->orderByDesc('created_at')
            ->limit(12)
            ->get(['book_id', 'title', 'cover', 'authors', 'note', 'sort_order']);

        return $this->success('Buku pilihan berhasil dimuat', $rows);
    }

    public function publicHidden(): JsonResponse
    {
        $ids = HiddenBook::pluck('book_id');
        return $this->success('Daftar buku tersembunyi', $ids);
    }

    public function publicAnnouncements(): JsonResponse
    {
        $rows = Announcement::where('is_active', true)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get(['id', 'title', 'content', 'created_at']);

        return $this->success('Pengumuman aktif', $rows);
    }
}
