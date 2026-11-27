<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak. Token tidak valid atau tidak ditemukan.',
            ], 401);
        }

        // Baca status terbaru dari database
        $fresh = User::select('id', 'is_active', 'role')->find($user->id);

        if (!$fresh || !$fresh->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda telah dinonaktifkan oleh Administrator.',
            ], 403);
        }

        return $next($request);
    }
}
