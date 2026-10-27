// ============================================================
// utils/validators.js — Fungsi validasi & sanitasi input
// ============================================================
// Semua validasi input dilakukan di sini untuk menjaga
// controller tetap bersih (Separation of Concerns)
// ============================================================

const validator = require('validator');

/**
 * Validasi input login
 * @param {string} email    - Email dari request body
 * @param {string} password - Password dari request body
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateLoginInput(email, password) {
    const errors = [];

    // --- Validasi Email ---
    if (!email || typeof email !== 'string') {
        errors.push('Email wajib diisi');
    } else {
        // Trim & lowercase untuk konsistensi
        const trimmedEmail = email.trim().toLowerCase();

        if (!validator.isEmail(trimmedEmail)) {
            errors.push('Format email tidak valid');
        }

        // Batas panjang email (RFC 5321: maks 254 karakter)
        if (trimmedEmail.length > 254) {
            errors.push('Email terlalu panjang');
        }
    }

    // --- Validasi Password ---
    if (!password || typeof password !== 'string') {
        errors.push('Password wajib diisi');
    } else {
        // Minimal 8 karakter (standar keamanan umum)
        if (password.length < 8) {
            errors.push('Password minimal 8 karakter');
        }

        // Batas maksimal untuk mencegah DoS via bcrypt (maks 72 bytes)
        if (password.length > 128) {
            errors.push('Password terlalu panjang');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Validasi input register
 * @param {string} username - Username dari request body
 * @param {string} email    - Email dari request body
 * @param {string} password - Password dari request body
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateRegisterInput(username, email, password) {
    const errors = [];

    // --- Validasi Username ---
    if (!username || typeof username !== 'string') {
        errors.push('Username wajib diisi');
    } else {
        const trimmedUsername = username.trim();

        if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
            errors.push('Username harus antara 3-50 karakter');
        }

        // Hanya huruf, angka, underscore, dan strip
        if (!validator.matches(trimmedUsername, /^[a-zA-Z0-9_-]+$/)) {
            errors.push('Username hanya boleh mengandung huruf, angka, underscore, dan strip');
        }
    }

    // --- Validasi Email ---
    if (!email || typeof email !== 'string') {
        errors.push('Email wajib diisi');
    } else {
        const trimmedEmail = email.trim().toLowerCase();

        if (!validator.isEmail(trimmedEmail)) {
            errors.push('Format email tidak valid');
        }

        if (trimmedEmail.length > 254) {
            errors.push('Email terlalu panjang');
        }
    }

    // --- Validasi Password ---
    if (!password || typeof password !== 'string') {
        errors.push('Password wajib diisi');
    } else {
        if (password.length < 8) {
            errors.push('Password minimal 8 karakter');
        }

        if (password.length > 128) {
            errors.push('Password terlalu panjang');
        }

        // Minimal: harus ada huruf dan angka
        if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
            errors.push('Password harus mengandung huruf dan angka');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Sanitasi string untuk mencegah XSS
 * @param {string} str - String yang akan disanitasi
 * @returns {string}
 */
function sanitize(str) {
    if (typeof str !== 'string') return '';
    return validator.escape(validator.trim(str));
}

module.exports = {
    validateLoginInput,
    validateRegisterInput,
    sanitize,
};
