# 📚 MYPERPUS — Perpustakaan Digital & Sistem Manajemen Lengkap

Aplikasi perpustakaan digital interaktif dengan fitur lengkap untuk dua peran (**User** dan **Administrator**), didukung oleh **Gutendex API** untuk katalog buku dan database **SQLite (Zero-Setup & Portable)** untuk aktivitas pengguna.

---

## 🌟 Fitur Utama

### 1. 👥 Pengguna / Pembaca (User)
- **Katalog & Eksplorasi Buku:** Mengambil ribuan novel dan buku klasik gratis langsung dari Gutenberg via Gutendex API.
- **Pencarian Cepat:** Pencarian real-time dengan live dropdown suggestions.
- **Data Terikat Akun (Sinkron Otomatis):**
  - **Bookmark:** Simpan buku favorit ke akun cloud SQLite.
  - **Riwayat Bacaan:** Otomatis mencatat waktu membaca dan frekuensi dibaca saat tombol *Baca Sekarang* diklik.
  - **Status Membaca:** Kelompokkan buku menjadi *Ingin Dibaca*, *Sedang Dibaca*, atau *Selesai Dibaca*.
  - **Koleksi / Rak Buku Pribadi:** Buat rak kustom (misal: "Novel Favorit", "Puisi Pilihan") dan kelola isinya.
- **Ulasan & Rating Bintang:** Beri rating (1–5 bintang) dan ulasan teks pada setiap buku. User dapat mengubah atau menghapus ulasannya sendiri.
- **Dukungan Mode Tamu (Guest Mode):** Pengunjung yang belum login tetap dapat membaca serta menyimpan bookmark dan history sementara di `localStorage`.
- **Auto-Sync:** Saat pertama kali login/register, data bookmark dan history dari `localStorage` otomatis digabungkan (*merged*) ke database akun.
- **Manajemen Profil:** Halaman profil (`profile.html`) untuk melihat ringkasan statistik bacaan, mengubah username/nama/bio, memperbarui kata sandi, hingga penghapusan akun permanen (*danger zone*).

### 2. ⚡ Administrator (Admin Dashboard)
- **Dashboard Statistik Sistem (`/admin/index.html`):** Total pengguna, pengguna baru 7 hari terakhir, total bookmark, total ulasan, serta 5 buku paling banyak di-bookmark dan diulas.
- **Manajemen Pengguna (`/admin/users.html`):** Pencarian, filter status, pengubahan peran (User/Admin), aktivasi/nonaktifkan akun, dan hapus akun. Dilengkapi proteksi keamanan: admin tidak dapat menonaktifkan dirinya sendiri dan sistem selalu menjamin minimal tersisa satu admin aktif.
- **Moderasi Ulasan (`/admin/reviews.html`):** Sembunyikan (*hide*) ulasan yang tidak pantas agar tidak tampil ke publik, atau hapus ulasan secara permanen.
- **Buku Pilihan / Featured (`/admin/featured.html`):** Cari buku langsung dari Gutendex lalu tambahkan ke daftar rekomendasi pilihan editor di halaman depan lengkap dengan nomor urut dan catatan singkat.
- **Sembunyikan Buku (`/admin/hidden.html`):** Blokir buku tertentu dari katalog publik (otomatis terfilter dari Home, Explore, Pencarian, dan halaman detail menampilkan pesan *Buku tidak tersedia*).
- **Pengumuman Beranda (`/admin/announcements.html`):** Buat banner pengumuman dinamis yang tampil di atas halaman utama untuk seluruh pengunjung.
- **Audit Logs (`/admin/logs.html`):** Riwayat *read-only* setiap aksi perubahan data penting yang dilakukan oleh admin.

---

## 🛠️ Tech Stack & Konvensi

| Komponen | Pilihan Teknologi |
| :--- | :--- |
| **Frontend** | HTML5 murni, CSS3 kustom, Vanilla JavaScript (ES6+), tanpa framework & build step |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite via wrapper dual-engine (`node:sqlite` di Node 22+ & fallback `sqlite3`) |
| **Keamanan** | JWT (`jsonwebtoken`), `bcryptjs`, Helmet CSP, CORS, Express-Rate-Limit (terpisah) |
| **Katalog Buku** | Gutendex API (`https://gutendex.com/books`) |

---

## 🚀 Panduan Menjalankan Aplikasi

### 1. Prasyarat
- Pastikan telah menginstal **Node.js** (v18 atau lebih baru).

### 2. Instalasi Dependensi
Buka Terminal / Command Prompt:
```bash
cd "TUGAS WEB/server"
npm install
```

### 3. Konfigurasi Environment (`.env`)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi konfigurasi (atau gunakan default untuk pengujian lokal):
```env
PORT=3000
NODE_ENV=development
DB_PATH=data/myperpus.sqlite
JWT_SECRET=super_secret_jwt_key_myperpus_2026_keamanan_terjamin
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=12

# Kredensial Akun Administrator Pertama (Auto-Seed)
ADMIN_EMAIL=admin@myperpus.local
ADMIN_USERNAME=admin
ADMIN_PASSWORD=AdminPassword123!
```

### 4. Menjalankan Server
```bash
npm start
# atau mode development:
npm run dev
```

### 5. Akses Halaman Web
- **Beranda Utama:** [http://localhost:3000](http://localhost:3000)
- **Halaman Login:** [http://localhost:3000/login.html](http://localhost:3000/login.html)
- **Halaman Register:** [http://localhost:3000/register.html](http://localhost:3000/register.html)
- **Dashboard Admin:** [http://localhost:3000/admin/index.html](http://localhost:3000/admin/index.html) (Masuk dengan akun admin di atas)

---

## 📡 Ringkasan Daftar Endpoint REST API

### 🔐 Autentikasi & Profil (`/api/auth`, `/api/me`)
- `POST /api/auth/register`: Mendaftar akun baru
- `POST /api/auth/login`: Autentikasi login & dapatkan JWT token
- `GET /api/auth/profile`: Data profil akun login
- `PUT /api/auth/profile`: Memperbarui username, nama lengkap, atau bio
- `PUT /api/auth/password`: Mengubah password (wajib password lama)
- `DELETE /api/auth/account`: Menghapus akun permanen beserta seluruh data
- `GET /api/me/stats`: Statistik ringkas aktivitas membaca user

### 📚 Fitur Pengguna Terikat Akun
- `GET /api/bookmarks` | `POST /api/bookmarks` | `DELETE /api/bookmarks/:bookId`: Kelola bookmark
- `GET /api/history` | `POST /api/history` | `DELETE /api/history/:bookId` | `DELETE /api/history`: Riwayat bacaan
- `GET /api/reading-status` | `PUT /api/reading-status/:bookId`: Status membaca (`want`, `reading`, `finished`)
- `GET /api/collections` | `POST /api/collections` | `PUT /api/collections/:id` | `DELETE /api/collections/:id`: Rak koleksi buku
- `POST /api/collections/:id/items` | `DELETE /api/collections/:id/items/:bookId`: Kelola isi rak buku
- `GET /api/books/:bookId/me`: Ringkasan status buku lengkap untuk pengguna dalam 1 kali round-trip
- `POST /api/sync/local`: Menggabungkan bookmark & history lokal ke akun database

### 💬 Ulasan & Rating (`/api/books/:bookId/reviews`, `/api/reviews`)
- `GET /api/books/:bookId/reviews`: Mengambil ulasan publik per buku beserta rata-rata bintang (paginasi)
- `POST /api/books/:bookId/reviews`: Mengirim atau memperbarui ulasan (1 ulasan per user per buku)
- `DELETE /api/reviews/:id`: Menghapus ulasan milik sendiri atau oleh admin
- `GET /api/me/reviews`: Daftar seluruh ulasan yang pernah ditulis user

### 🌐 Katalog Publik & Pengumuman
- `GET /api/catalog/featured`: Mengambil daftar buku rekomendasi editor
- `GET /api/catalog/hidden`: Mengambil daftar ID buku yang diblokir/disembunyikan
- `GET /api/announcements/active`: Mengambil pengumuman aktif untuk banner beranda

### ⚡ Dashboard Administrator (`/api/admin/*` — Dilindungi `requireAdmin`)
- `GET /api/admin/stats`: Statistik overview sistem
- `GET /api/admin/users`: Daftar pengguna (filter query, role, status, paginasi)
- `PATCH /api/admin/users/:id`: Ubah role atau status aktif/nonaktif
- `DELETE /api/admin/users/:id`: Hapus pengguna
- `GET /api/admin/reviews`: Daftar seluruh ulasan untuk moderasi
- `PATCH /api/admin/reviews/:id`: Ubah status ulasan (`visible` / `hidden`)
- `GET /api/admin/featured` | `POST` | `PUT` | `DELETE`: Kelola buku pilihan
- `GET /api/admin/hidden` | `POST` | `DELETE`: Sembunyikan atau pulihkan buku
- `GET /api/admin/announcements` | `POST` | `PUT` | `DELETE`: Kelola pengumuman
- `GET /api/admin/logs`: Audit trail aktivitas administrator
