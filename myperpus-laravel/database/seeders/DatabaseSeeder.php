<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $adminEmail    = env('ADMIN_EMAIL');
        $adminUsername = env('ADMIN_USERNAME');
        $adminPassword = env('ADMIN_PASSWORD');

        if (!$adminEmail || !$adminUsername || !$adminPassword) {
            return;
        }

        // Seed hanya berjalan jika belum ada admin
        if (User::where('role', 'admin')->exists()) {
            return;
        }

        $cleanEmail    = strtolower(trim($adminEmail));
        $cleanUsername = strtolower(trim($adminUsername));

        $existing = User::where('email', $cleanEmail)
            ->orWhere('username', $cleanUsername)
            ->first();

        if ($existing) {
            $existing->update([
                'role'      => 'admin',
                'is_active' => true,
            ]);
            return;
        }

        User::create([
            'username'  => $cleanUsername,
            'name'      => 'Administrator',
            'full_name' => 'Administrator',
            'email'     => $cleanEmail,
            'password'  => Hash::make($adminPassword),
            'role'      => 'admin',
            'is_active' => true,
        ]);
    }
}
