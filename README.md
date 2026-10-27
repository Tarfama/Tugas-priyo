# 📚 MYPERPUS — Digital Library & Secure Auth System

Aplikasi perpustakaan digital interaktif yang dilengkapi modul autentikasi (**Login & Register**) yang aman, modular, dan berstandar produksi dengan database **SQLite (Zero Setup)**.

---

## ✨ Fitur Utama

### 📖 Perpustakaan Digital (Frontend)
- **Katalog Buku Dinamis:** Menampilkan novel terpopuler, kategori *Adventure*, dan *Romance* menggunakan Gutendex API.
- **Pencarian Buku Real-time:** Fitur pencarian buku dengan dropdown saran cepat (*live search suggestions*).
- **Halaman Detail & Library:** Informasi lengkap setiap buku beserta status koleksi.
- **Header Dinamis:** Otomatis menampilkan status login user (*"Halo, [username]"* & tombol Logout).

### 🔐 Modul Autentikasi Aman (Backend)
- **Zero-Setup Database:** Menggunakan **SQLite** (`myperpus.sqlite`). Tidak memerlukan instalasi XAMPP, MySQL, atau konfigurasi database manual. File database dan tabel otomatis terbuat saat server pertama kali dijalankan.
- **Password Hashing:** Menggunakan algoritma **bcrypt** (salt rounds 12). Plain-text password tidak pernah tersimpan di database.
- **Perlindungan SQL Injection:** Seluruh kueri database menggunakan *parameterized queries* (`?`).
- **Pencegahan User Enumeration:** Menggunakan pesan error generic (*"Email atau password salah"*) untuk menjaga privasi data pengguna.
- **Brute-Force Protection:** Rate limiting membatasi percobaan login maksimal 10 kali per IP per 15 menit.
- **Sesi JWT (JSON Web Token):** Autentikasi berbasis stateless token yang aman dengan masa berlaku 24 jam.
- **HTTP Security Headers:** Menggunakan **Helmet.js** untuk mengamankan aplikasi dari berbagai celah web umum (XSS, clickjacking, MIME sniffing).

---

## 🛠️ Tech Stack

| Layer | Teknologi |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Modern Flexbox & Grid), Vanilla JavaScript (ES6+) |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite (`node:sqlite` bawaan Node 22+ / `sqlite3` fallback) |
| **Autentikasi** | JSON Web Token (`jsonwebtoken`), `bcryptjs` |
| **Keamanan** | `helmet`, `cors`, `express-rate-limit`, `validator` |

---

## 📁 Struktur Direktori

```text
secure_login_module/
├── README.md                  # Dokumentasi proyek
├── .gitignore                 # Konfigurasi file yang diabaikan git
└── TUGAS WEB/
    ├── index.html             # Halaman beranda utama
    ├── explore.html           # Halaman jelajah buku
    ├── library.html           # Halaman koleksi buku
    ├── detail.html            # Halaman detail buku
    ├── login.html             # Halaman formulir login
    ├── register.html          # Halaman pendaftaran akun
    ├── css/
    │   ├── style.css          # Styling utama perpustakaan
    │   ├── auth.css           # Styling form login & register
    │   ├── explore.css
    │   ├── lbry.css
    │   └── detil.css
    ├── js/
    │   ├── home.js            # Fetch data buku dari API
    │   ├── search.js          # Logika live search
    │   ├── auth.js            # Handler formulir login & register
    │   ├── auth-header.js     # Pengatur status sesi user di header
    │   ├── detail.js
    │   ├── explore.js
    │   └── library.js
    └── server/                # Backend API (Node.js + Express)
        ├── app.js             # Entry point server
        ├── package.json       # Daftar dependensi npm
        ├── .env               # Variabel environment default
        ├── .env.example       # Template environment variables
        ├── config/
        │   └── database.js    # Koneksi & auto-init SQLite
        ├── controllers/
        │   └── authController.js # Logika bisnis login, register & profile
        ├── middleware/
        │   └── authMiddleware.js # Middleware proteksi route dengan JWT
        ├── routes/
        │   └── authRoutes.js  # Definisi endpoint REST API
        ├── utils/
        │   └── validators.js  # Sanitasi & validasi input
        ├── data/              # Folder database SQLite (otomatis dibuat)
        │   └── myperpus.sqlite
        └── migrations/
            └── 001_create_users_table.sql # Referensi DDL schema
```

---

## 🚀 Panduan Menjalankan di Komputer Lokal

Pastikan Anda sudah menginstal **[Node.js](https://nodejs.org/)** (versi 18 atau lebih baru).

### 1. Masuk ke Folder Server
Buka Terminal / Command Prompt / PowerShell:
```bash
cd "TUGAS WEB/server"
```

### 2. Install Dependensi
```bash
npm install
```

### 3. Jalankan Server
```bash
npm start
```
*Atau mode development (dengan auto-restart):*
```bash
npm run dev
```

### 4. Buka di Browser
- **Website Utama:** [http://localhost:3000](http://localhost:3000)
- **Halaman Login:** [http://localhost:3000/login.html](http://localhost:3000/login.html)
- **Halaman Register:** [http://localhost:3000/register.html](http://localhost:3000/register.html)

> 💡 **Catatan:** Tidak perlu membuat database manual. File `myperpus.sqlite` beserta tabel `users` akan dibuat secara otomatis saat perintah `npm start` pertama kali dijalankan.

---

## 📡 Dokumentasi Endpoint REST API

### 1. Register User Baru
- **URL:** `POST /api/auth/register`
- **Request Body (JSON):**
  ```json
  {
    "username": "userbaru",
    "email": "user@example.com",
    "password": "Password123"
  }
  ```
- **Response 201 Created (Sukses):**
  ```json
  {
    "success": true,
    "message": "Registrasi berhasil! Silakan login.",
    "data": {
      "id": 1,
      "username": "userbaru",
      "email": "user@example.com"
    }
  }
  ```

### 2. Login
- **URL:** `POST /api/auth/login`
- **Request Body (JSON):**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123"
  }
  ```
- **Response 200 OK (Sukses):**
  ```json
  {
    "success": true,
    "message": "Login berhasil!",
    "data": {
      "user": {
        "id": 1,
        "username": "userbaru",
        "email": "user@example.com"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "24h"
    }
  }
  ```
- **Response 401 Unauthorized (Gagal):**
  ```json
  {
    "success": false,
    "message": "Email atau password salah"
  }
  ```

### 3. Profile Pengguna (Protected Route)
- **URL:** `GET /api/auth/profile`
- **Headers:** `Authorization: Bearer <token_jwt>`
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "username": "userbaru",
      "email": "user@example.com",
      "created_at": "2026-10-27 22:00:29"
    }
  }
  ```

---

## 🌐 Panduan Upload ke GitHub & Hosting Online

### A. Upload Source Code ke GitHub
```bash
git init
git add .
git commit -m "feat: inisialisasi myperpus dengan secure auth module"
git branch -M main
git remote add origin https://github.com/USERNAME_ANDA/NAMA_REPO.git
git push -u origin main
```

### B. Hosting Online Gratis di [Render.com](https://render.com/)
1. Login ke **Render.com** menggunakan akun GitHub.
2. Klik **New +** > **Web Service** > pilih repository project ini.
3. Masukkan pengaturan:
   - **Root Directory:** `TUGAS WEB/server`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node app.js`
   - **Instance Type:** `Free`
4. Di bagian **Environment Variables**, tambahkan:
   - `JWT_SECRET` = `kunci_acak_rahasia_anda`
   - `NODE_ENV` = `production`
5. Klik **Deploy Web Service**. Website beserta backend login akan aktif dan bisa diakses publik secara online 24/7!

---

## 📄 Lisensi
Proyek ini dibuat untuk keperluan tugas akademik dan pengembangan web full-stack. Bebas digunakan dan dimodifikasi untuk tujuan pembelajaran.
