-- ============================================================
-- Migration: Membuat tabel `users` untuk autentikasi
-- Database : MySQL 8.x
-- Jalankan : mysql -u root -p myperpus_db < 001_create_users_table.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS myperpus_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE myperpus_db;

CREATE TABLE IF NOT EXISTS users (
    -- Primary key auto-increment
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,

    -- Username unik (min 3 karakter, maks 50)
    username    VARCHAR(50)     NOT NULL,

    -- Email unik dan wajib valid
    email       VARCHAR(255)    NOT NULL,

    -- Password hash (bcrypt menghasilkan ~60 karakter)
    -- JANGAN PERNAH simpan plain-text password!
    password_hash VARCHAR(255)  NOT NULL,

    -- Timestamp otomatis
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Constraints
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_username (username),
    UNIQUE KEY uq_users_email (email),

    -- Index untuk mempercepat pencarian login
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
