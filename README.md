# 📚 MYPERPUS — Perpustakaan Digital (Laravel 12)

Aplikasi perpustakaan digital interaktif dengan fitur lengkap untuk dua peran (**User** dan **Administrator**), dibangun dengan **Laravel 12**, **Laravel Sanctum**, dan database **SQLite** (*Zero-Setup*).

---

## 📁 Struktur Proyek

```text
.
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/   # Auth, Profile, Bookmark, History, Collection, Review, Admin
│   │   └── Middleware/        # EnsureUserIsActive, RequireAdmin, SecurityHeaders
│   ├── Models/                # Eloquent Models (User, Bookmark, Review, dll.)
│   ├── Providers/             # Rate limiter & service provider
│   └── Support/               # Trait ApiResponse (format JSON & paginasi konsisten)
├── bootstrap/                 # Konfigurasi routing, middleware, & exception JSON API
├── config/                    # Konfigurasi Laravel & Sanctum
├── database/
│   ├── migrations/            # Skema tabel users, aktivitas user, & fitur admin
│   ├── seeders/               # DatabaseSeeder (auto-seed Admin dari .env)
│   └── database.sqlite        # File database SQLite lokal
├── public/
│   ├── css/                   # Stylesheet terpusat (style.css, auth.css, admin.css, dll.)
│   └── js/                    # Script frontend (api.js, navbar-dropdown.js, admin-common.js, dll.)
├── resources/views/
│   ├── admin/                 # Blade views panel Admin (index, users, reviews, featured, hidden, announcements, logs)
│   └── *.blade.php            # Blade views User (index, explore, detail, library, login, register, profile)
├── routes/
│   ├── api.php                # 52 endpoint REST API
│   └── web.php                # Routing halaman web Blade
└── tests/Feature/             # Pengujian end-to-end API & Blade
```

---

## 🚀 Cara Menjalankan

1. **Siapkan `.env`** (salin dari `.env.example` bila belum ada):
   ```powershell
   copy .env.example .env
   php artisan key:generate
   ```
   *(Opsional) Isi `ADMIN_EMAIL`, `ADMIN_USERNAME`, dan `ADMIN_PASSWORD` di `.env` untuk membuat akun admin pertama.*

2. **Jalankan Migrasi & Seeder:**
   ```powershell
   php artisan migrate --seed
   ```

3. **Jalankan Server Lokal:**
   ```powershell
   php artisan serve
   ```
   *(Jika PHP dari XAMPP belum ada di PATH, gunakan `C:\xampp\php\php.exe artisan serve`)*

4. **Akses Aplikasi:**
   - **Beranda:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
   - **Login / Register:** [http://127.0.0.1:8000/login](http://127.0.0.1:8000/login)
   - **Dashboard Admin:** [http://127.0.0.1:8000/admin](http://127.0.0.1:8000/admin)

---

## 🧪 Pengujian Otomatis

```powershell
php artisan test --filter=MyperpusApiTest
```
