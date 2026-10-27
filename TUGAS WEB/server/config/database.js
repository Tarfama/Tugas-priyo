// ============================================================
// config/database.js — Konfigurasi koneksi MySQL dengan Connection Pool
// ============================================================
// Menggunakan mysql2/promise untuk mendukung async/await
// Connection Pool digunakan agar koneksi dipakai ulang (efisien)
// ============================================================

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host:     process.env.DB_HOST || 'localhost',
    port:     parseInt(process.env.DB_PORT, 10) || 3306,
    user:     process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'myperpus_db',

    // --- Pool Settings ---
    waitForConnections: true,   // Antri jika semua koneksi sedang dipakai
    connectionLimit:    10,     // Maks 10 koneksi simultan
    queueLimit:         0,      // Tidak ada batas antrian

    // --- Keamanan: nonaktifkan multi-statement untuk cegah SQL injection ---
    multipleStatements: false,
});

// Test koneksi saat startup
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database MySQL terhubung berhasil');
        connection.release();
    } catch (error) {
        console.error('❌ Gagal terhubung ke database:', error.message);
        process.exit(1); // Hentikan server jika DB tidak tersedia
    }
}

module.exports = { pool, testConnection };
