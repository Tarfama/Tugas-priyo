<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    use ApiResponse;

    /**
     * POST /api/auth/register
     */
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'username'  => ['required', 'string', 'min:3', 'max:50', 'regex:/^[a-zA-Z0-9_-]+$/'],
            'email'     => ['required', 'string', 'email', 'max:254'],
            'password'  => ['required', 'string', 'min:8', 'max:128', 'regex:/^(?=.*[a-zA-Z])(?=.*\d).+$/'],
            'full_name' => ['nullable', 'string', 'max:100'],
        ], [
            'username.required' => 'Username wajib diisi',
            'username.min'      => 'Username harus antara 3-50 karakter',
            'username.max'      => 'Username harus antara 3-50 karakter',
            'username.regex'    => 'Username hanya boleh mengandung huruf, angka, underscore, dan strip',
            'email.required'    => 'Email wajib diisi',
            'email.email'       => 'Format email tidak valid',
            'password.required' => 'Password wajib diisi',
            'password.min'      => 'Password minimal 8 karakter',
            'password.regex'    => 'Password harus mengandung kombinasi huruf dan angka',
        ]);

        if ($validator->fails()) {
            return $this->error('Validasi gagal', 400, $validator->errors()->all());
        }

        $cleanUsername = strtolower(trim(strip_tags($request->input('username'))));
        $cleanEmail    = strtolower(trim($request->input('email')));
        $cleanFullName = $request->filled('full_name')
            ? trim(strip_tags($request->input('full_name')))
            : null;

        $exists = User::where('username', $cleanUsername)
            ->orWhere('email', $cleanEmail)
            ->exists();

        if ($exists) {
            return $this->error('Username atau email sudah terdaftar', 409);
        }

        $user = User::create([
            'username'  => $cleanUsername,
            'name'      => $cleanFullName ?: $cleanUsername,
            'full_name' => $cleanFullName,
            'email'     => $cleanEmail,
            'password'  => Hash::make($request->input('password')),
            'role'      => 'user',
            'is_active' => true,
        ]);

        return $this->success('Registrasi berhasil! Silakan login.', [
            'id'        => $user->id,
            'username'  => $user->username,
            'email'     => $user->email,
            'role'      => $user->role,
            'full_name' => $user->full_name,
        ], 201);
    }

    /**
     * POST /api/auth/login
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email'    => ['required', 'string', 'email', 'max:254'],
            'password' => ['required', 'string', 'min:8', 'max:128'],
        ], [
            'email.required'    => 'Email wajib diisi',
            'email.email'       => 'Format email tidak valid',
            'password.required' => 'Password wajib diisi',
            'password.min'      => 'Password minimal 8 karakter',
        ]);

        if ($validator->fails()) {
            return $this->error('Validasi gagal', 400, $validator->errors()->all());
        }

        $cleanEmail = strtolower(trim($request->input('email')));
        $user = User::where('email', $cleanEmail)->first();

        // Generic error message agar tidak membocorkan keberadaan email
        if (!$user || !Hash::check($request->input('password'), $user->password)) {
            return $this->error('Email atau password salah', 401);
        }

        if (!$user->is_active) {
            return $this->error('Akun Anda telah dinonaktifkan oleh Administrator.', 403);
        }

        $user->update(['last_login_at' => now()]);

        $token = $user->createToken('myperpus-auth')->plainTextToken;

        return $this->success('Login berhasil!', [
            'user' => [
                'id'        => $user->id,
                'username'  => $user->username,
                'email'     => $user->email,
                'role'      => $user->role ?: 'user',
                'full_name' => $user->full_name ?: $user->username,
            ],
            'token'     => $token,
            'expiresIn' => '24h',
        ]);
    }

    /**
     * GET /api/auth/profile
     */
    public function profile(Request $request): JsonResponse
    {
        $user = $request->user();

        return $this->success('Profil berhasil dimuat', [
            'id'            => $user->id,
            'username'      => $user->username,
            'email'         => $user->email,
            'role'          => $user->role ?: 'user',
            'is_active'     => $user->is_active ? 1 : 0,
            'full_name'     => $user->full_name,
            'bio'           => $user->bio,
            'last_login_at' => $user->last_login_at,
            'created_at'    => $user->created_at,
        ]);
    }

    /**
     * POST /api/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()?->currentAccessToken();
        if ($token) {
            $token->delete();
        }

        return $this->success('Logout berhasil.');
    }
}
