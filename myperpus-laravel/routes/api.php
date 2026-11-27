<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookmarkController;
use App\Http\Controllers\Api\BookUserController;
use App\Http\Controllers\Api\CollectionController;
use App\Http\Controllers\Api\HistoryController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ReadingStatusController;
use App\Http\Controllers\Api\ReviewController;
use Illuminate\Support\Facades\Route;

// Health Check
Route::get('/health', function () {
    return response()->json([
        'success'   => true,
        'message'   => 'Server MYPERPUS (Laravel) berjalan dengan baik',
        'timestamp' => now()->toIso8601String(),
    ]);
});

// ── Autentikasi Publik ──────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth');

    // Protected Auth & Profile
    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::get('/profile', [AuthController::class, 'profile']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::put('/profile', [ProfileController::class, 'updateProfile']);
        Route::put('/password', [ProfileController::class, 'updatePassword']);
        Route::delete('/account', [ProfileController::class, 'deleteAccount']);
    });
});

// ── Endpoint Publik Katalog & Pengumuman ────────────────────
Route::get('/catalog/featured', [AdminController::class, 'publicFeatured']);
Route::get('/catalog/hidden', [AdminController::class, 'publicHidden']);
Route::get('/announcements/active', [AdminController::class, 'publicAnnouncements']);
Route::get('/books/{bookId}/reviews', [ReviewController::class, 'bookReviews']);

// ── Fitur User Terikat Akun (Wajib Login & Aktif) ───────────
Route::middleware(['auth:sanctum', 'active', 'throttle:write'])->group(function () {
    // Bookmark
    Route::get('/bookmarks', [BookmarkController::class, 'index']);
    Route::post('/bookmarks', [BookmarkController::class, 'store']);
    Route::delete('/bookmarks/{bookId}', [BookmarkController::class, 'destroy']);

    // History
    Route::get('/history', [HistoryController::class, 'index']);
    Route::post('/history', [HistoryController::class, 'store']);
    Route::delete('/history/{bookId}', [HistoryController::class, 'destroyItem']);
    Route::delete('/history', [HistoryController::class, 'clearAll']);

    // Status Baca
    Route::get('/reading-status', [ReadingStatusController::class, 'index']);
    Route::put('/reading-status/{bookId}', [ReadingStatusController::class, 'upsert']);

    // Koleksi / Rak Buku
    Route::get('/collections', [CollectionController::class, 'index']);
    Route::post('/collections', [CollectionController::class, 'store']);
    Route::get('/collections/{id}', [CollectionController::class, 'show']);
    Route::put('/collections/{id}', [CollectionController::class, 'update']);
    Route::delete('/collections/{id}', [CollectionController::class, 'destroy']);
    Route::post('/collections/{id}/items', [CollectionController::class, 'addItem']);
    Route::delete('/collections/{id}/items/{bookId}', [CollectionController::class, 'removeItem']);

    // Ringkasan per buku & Ulasan
    Route::get('/books/{bookId}/me', [BookUserController::class, 'me']);
    Route::post('/books/{bookId}/reviews', [ReviewController::class, 'submitReview']);
    Route::delete('/reviews/{id}', [ReviewController::class, 'destroy']);

    // Sinkronisasi lokal
    Route::post('/sync/local', [BookUserController::class, 'syncLocal']);

    // Statistik & ulasan milik user
    Route::get('/me/stats', [ProfileController::class, 'stats']);
    Route::get('/me/reviews', [ReviewController::class, 'myReviews']);
});

// ── Fitur Khusus Administrator ──────────────────────────────
Route::prefix('admin')
    ->middleware(['auth:sanctum', 'active', 'admin', 'throttle:admin'])
    ->group(function () {
        Route::get('/stats', [AdminController::class, 'stats']);

        Route::get('/users', [AdminController::class, 'users']);
        Route::patch('/users/{id}', [AdminController::class, 'updateUser']);
        Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);

        Route::get('/reviews', [AdminController::class, 'reviews']);
        Route::patch('/reviews/{id}', [AdminController::class, 'updateReview']);

        Route::get('/featured', [AdminController::class, 'featuredIndex']);
        Route::post('/featured', [AdminController::class, 'featuredStore']);
        Route::put('/featured/{bookId}', [AdminController::class, 'featuredUpdate']);
        Route::delete('/featured/{bookId}', [AdminController::class, 'featuredDestroy']);

        Route::get('/hidden', [AdminController::class, 'hiddenIndex']);
        Route::post('/hidden', [AdminController::class, 'hiddenStore']);
        Route::delete('/hidden/{bookId}', [AdminController::class, 'hiddenDestroy']);

        Route::get('/announcements', [AdminController::class, 'announcementsIndex']);
        Route::post('/announcements', [AdminController::class, 'announcementsStore']);
        Route::put('/announcements/{id}', [AdminController::class, 'announcementsUpdate']);
        Route::delete('/announcements/{id}', [AdminController::class, 'announcementsDestroy']);

        Route::get('/logs', [AdminController::class, 'logs']);
    });
