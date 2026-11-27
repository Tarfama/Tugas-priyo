<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bookmark;
use App\Models\ReadingHistory;
use App\Models\ReadingStatus;
use App\Models\Review;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class ProfileController extends Controller
{
    use ApiResponse;

    /**
     * PUT /api/auth/profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'username'  => ['sometimes', 'required', 'string', 'min:3', 'max:50', 'regex:/^[a-zA-Z0-9_-]+$/'],
            'full_name' => ['nullable', 'string', 'max:100'],
            'bio'       => ['nullable', 'string', 'max:500'],
        ], [
            'username.min'   => 'Username harus antara 3-50 karakter',
            'username.max'   => 'Username harus antara 3-50 karakter',
            'username.regex' => 'Username hanya boleh huruf, angka, underscore, dan strip',
        ]);

        if ($validator->fails()) {
            return $this->error($validator->errors()->first(), 400, $validator->errors()->all());
        }

        $updates = [];

        if ($request->has('username')) {
            $cleanUsername = strtolower(trim(strip_tags($request->input('username'))));
            $duplicate = User::where('username', $cleanUsername)
                ->where('id', '!=', $user->id)
                ->exists();

            if ($duplicate) {
                return $this->error('Username sudah digunakan oleh pengguna lain', 409);
            }
            $updates['username'] = $cleanUsername;
        }

        if ($request->has('full_name')) {
            $cleanName = $request->input('full_name')
                ? mb_substr(trim(strip_tags($request->input('full_name'))), 0, 100)
                : null;
            $updates['full_name'] = $cleanName;
            if ($cleanName) {
                $updates['name'] = $cleanName;
            }
        }

        if ($request->has('bio')) {
            $updates['bio'] = $request->input('bio')
                ? mb_substr(trim(strip_tags($request->input('bio'))), 0, 500)
                : null;
        }

        if (empty($updates)) {
            return $this->error('Tidak ada data yang diperbarui', 400);
        }

        $user->update($updates);
        $user->refresh();

        return $this->success('Profil berhasil diperbarui', [
            'id'         => $user->id,
            'username'   => $user->username,
            'email'      => $user->email,
            'role'       => $user->role,
            'is_active'  => $user->is_active ? 1 : 0,
            'full_name'  => $user->full_name,
            'bio'        => $user->bio,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
        ]);
    }

    /**
     * PUT /api/auth/password
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'current_password' => ['required', 'string'],
            'new_password'     => ['required', 'string', 'min:8', 'max:128', 'regex:/^(?=.*[a-zA-Z])(?=.*\d).+$/'],
        ], [
            'current_password.required' => 'Password saat ini dan password baru wajib diisi',
            'new_password.required'     => 'Password saat ini dan password baru wajib diisi',
            'new_password.min'          => 'Password baru minimal 8 karakter',
            'new_password.max'          => 'Password baru terlalu panjang',
            'new_password.regex'        => 'Password baru harus mengandung kombinasi huruf dan angka',
        ]);

        if ($validator->fails()) {
            return $this->error($validator->errors()->first(), 400, $validator->errors()->all());
        }

        $user = $request->user();

        if (!Hash::check($request->input('current_password'), $user->password)) {
            return $this->error('Password saat ini tidak sesuai', 400);
        }

        $user->update([
            'password' => Hash::make($request->input('new_password')),
        ]);

        return $this->success('Password berhasil diubah. Silakan gunakan password baru pada login berikutnya.');
    }

    /**
     * DELETE /api/auth/account
     */
    public function deleteAccount(Request $request): JsonResponse
    {
        $password = $request->input('password');
        if (!$password || !is_string($password)) {
            return $this->error('Konfirmasi password diperlukan untuk menghapus akun', 400);
        }

        $user = $request->user();

        if ($user->role === 'admin') {
            $activeAdminCount = User::where('role', 'admin')->where('is_active', true)->count();
            if ($activeAdminCount <= 1) {
                return $this->error('Tidak dapat menghapus akun. Harus tersisa minimal satu Administrator aktif.', 400);
            }
        }

        if (!Hash::check($password, $user->password)) {
            return $this->error('Password konfirmasi salah', 400);
        }

        $user->tokens()->delete();
        $user->delete();

        return $this->success('Akun Anda dan seluruh data terkait telah berhasil dihapus secara permanen.');
    }

    /**
     * GET /api/me/stats
     */
    public function stats(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $totalBookmarks = Bookmark::where('user_id', $userId)->count();
        $totalFinished  = ReadingStatus::where('user_id', $userId)->where('status', 'finished')->count();
        $totalReading   = ReadingStatus::where('user_id', $userId)->where('status', 'reading')->count();
        $totalReviews   = Review::where('user_id', $userId)->count();
        $lastRead       = ReadingHistory::where('user_id', $userId)
            ->orderByDesc('last_read_at')
            ->first(['book_id', 'title', 'cover', 'last_read_at']);

        return $this->success('Statistik pengguna berhasil dimuat', [
            'total_bookmarks' => $totalBookmarks,
            'total_finished'  => $totalFinished,
            'total_reading'   => $totalReading,
            'total_reviews'   => $totalReviews,
            'last_read_book'  => $lastRead,
        ]);
    }
}
