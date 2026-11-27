<?php

use Illuminate\Support\Facades\Route;

// Halaman Pengguna (mendukung URL bersih maupun .html agar link lama tetap jalan)
Route::view('/', 'index');
Route::view('/index.html', 'index');

Route::view('/explore', 'explore');
Route::view('/explore.html', 'explore');

Route::view('/detail', 'detail');
Route::view('/detail.html', 'detail');

Route::view('/library', 'library');
Route::view('/library.html', 'library');

Route::view('/login', 'login');
Route::view('/login.html', 'login');

Route::view('/register', 'register');
Route::view('/register.html', 'register');

Route::view('/profile', 'profile');
Route::view('/profile.html', 'profile');

// Halaman Admin (Blade)
Route::prefix('admin')->group(function () {
    Route::view('/', 'admin.index');
    Route::view('/index.html', 'admin.index');

    Route::view('/users', 'admin.users');
    Route::view('/users.html', 'admin.users');

    Route::view('/reviews', 'admin.reviews');
    Route::view('/reviews.html', 'admin.reviews');

    Route::view('/featured', 'admin.featured');
    Route::view('/featured.html', 'admin.featured');

    Route::view('/hidden', 'admin.hidden');
    Route::view('/hidden.html', 'admin.hidden');

    Route::view('/announcements', 'admin.announcements');
    Route::view('/announcements.html', 'admin.announcements');

    Route::view('/logs', 'admin.logs');
    Route::view('/logs.html', 'admin.logs');
});
