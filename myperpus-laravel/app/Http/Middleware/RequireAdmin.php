<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Autentikasi diperlukan.',
            ], 401);
        }

        // Baca role dan is_active terbaru langsung dari database
        $fresh = User::select('role', 'is_active')->find($user->id);

        if (!$fresh || !$fresh->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda tidak aktif atau tidak ditemukan.',
            ], 403);
        }

        if ($fresh->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Akses terlarang. Halaman atau aksi ini hanya untuk Administrator.',
            ], 403);
        }

        return $next($request);
    }
}
