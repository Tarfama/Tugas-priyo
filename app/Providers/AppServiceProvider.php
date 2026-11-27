<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Rate limiter autentikasi (login & register)
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinutes(15, 30)
                ->by($request->ip())
                ->response(function () {
                    return response()->json([
                        'success' => false,
                        'message' => 'Terlalu banyak percobaan autentikasi. Coba lagi dalam 15 menit.',
                    ], 429);
                });
        });

        // Rate limiter endpoint tulis (bookmark, history, ulasan, koleksi)
        RateLimiter::for('write', function (Request $request) {
            return Limit::perMinutes(15, 300)
                ->by($request->user()?->id ?: $request->ip())
                ->response(function () {
                    return response()->json([
                        'success' => false,
                        'message' => 'Aktivitas pengiriman data terlalu tinggi. Coba lagi sebentar lagi.',
                    ], 429);
                });
        });

        // Rate limiter endpoint admin
        RateLimiter::for('admin', function (Request $request) {
            return Limit::perMinutes(15, 600)
                ->by($request->user()?->id ?: $request->ip());
        });
    }
}
