<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MyperpusApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_and_blade_pages_render(): void
    {
        $this->getJson('/api/health')->assertOk()->assertJsonPath('success', true);

        foreach (['/', '/index.html', '/explore.html', '/detail.html', '/library.html', '/login.html', '/register.html', '/profile.html', '/admin/index.html'] as $page) {
            $this->get($page)->assertOk();
        }
    }

    public function test_user_auth_bookmarks_collections_reviews_and_admin_rbac(): void
    {
        // 1. Register user
        $reg = $this->postJson('/api/auth/register', [
            'username' => 'budi_test',
            'email'    => 'budi@example.com',
            'password' => 'Password123',
        ]);
        $reg->assertStatus(201)->assertJsonPath('success', true);

        // 2. Login user
        $login = $this->postJson('/api/auth/login', [
            'email'    => 'budi@example.com',
            'password' => 'Password123',
        ]);
        $login->assertOk()->assertJsonPath('data.user.role', 'user');
        $token = $login->json('data.token');
        $headers = ['Authorization' => 'Bearer ' . $token];

        // 3. Profile
        $this->getJson('/api/auth/profile', $headers)->assertOk()->assertJsonPath('data.username', 'budi_test');

        // 4. Regular user blocked from admin API (403)
        $this->getJson('/api/admin/stats', $headers)->assertStatus(403);

        // 5. Bookmark + History + Reading Status + Collection + Review
        $this->postJson('/api/bookmarks', [
            'book_id' => 1342,
            'title'   => 'Pride and Prejudice',
            'cover'   => 'https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg',
            'authors' => 'Jane Austen',
        ], $headers)->assertStatus(201);

        $this->postJson('/api/history', [
            'book_id' => 1342,
            'title'   => 'Pride and Prejudice',
        ], $headers)->assertStatus(201);

        $this->putJson('/api/reading-status/1342', [
            'status' => 'reading',
            'title'  => 'Pride and Prejudice',
        ], $headers)->assertOk();

        $col = $this->postJson('/api/collections', ['name' => 'Favorit'], $headers)->assertStatus(201);
        $colId = $col->json('data.id');
        $this->postJson("/api/collections/{$colId}/items", [
            'book_id' => 1342,
            'title'   => 'Pride and Prejudice',
        ], $headers)->assertStatus(201);

        $this->postJson('/api/books/1342/reviews', [
            'rating'     => 5,
            'content'    => 'Buku klasik yang luar biasa!',
            'book_title' => 'Pride and Prejudice',
        ], $headers)->assertStatus(201);

        $this->getJson('/api/books/1342/me', $headers)
            ->assertOk()
            ->assertJsonPath('data.is_bookmarked', true)
            ->assertJsonPath('data.reading_status', 'reading');

        $this->getJson('/api/books/1342/reviews')
            ->assertOk()
            ->assertJsonPath('stats.total_reviews', 1)
            ->assertJsonPath('stats.average_rating', 5);

        // 6. Admin access & actions
        $admin = User::create([
            'username'  => 'admin_test',
            'name'      => 'Admin Test',
            'full_name' => 'Admin Test',
            'email'     => 'admin_test@example.com',
            'password'  => Hash::make('AdminPass123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $adminLogin = $this->postJson('/api/auth/login', [
            'email'    => 'admin_test@example.com',
            'password' => 'AdminPass123',
        ])->assertOk();
        $adminHeaders = ['Authorization' => 'Bearer ' . $adminLogin->json('data.token')];

        // Reset in-memory auth guard cache antar-user dalam satu test PHPUnit
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/admin/stats', $adminHeaders)
            ->assertOk()
            ->assertJsonPath('data.overview.total_bookmarks', 1);

        $this->postJson('/api/admin/announcements', [
            'title'   => 'Selamat Datang',
            'content' => 'Versi Laravel aktif!',
        ], $adminHeaders)->assertStatus(201);

        $this->getJson('/api/announcements/active')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }
}
