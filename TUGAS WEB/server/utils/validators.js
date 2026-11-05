// ============================================================
// utils/validators.js — Validasi & Sanitasi Input Terpusat
// ============================================================

const validator = require('validator');

/**
 * Validasi input login
 */
function validateLoginInput(email, password) {
    const errors = [];

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

    if (!password || typeof password !== 'string') {
        errors.push('Password wajib diisi');
    } else {
        if (password.length < 8) {
            errors.push('Password minimal 8 karakter');
        }
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
 */
function validateRegisterInput(username, email, password) {
    const errors = [];

    if (!username || typeof username !== 'string') {
        errors.push('Username wajib diisi');
    } else {
        const trimmedUsername = username.trim();
        if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
            errors.push('Username harus antara 3-50 karakter');
        }
        if (!validator.matches(trimmedUsername, /^[a-zA-Z0-9_-]+$/)) {
            errors.push('Username hanya boleh mengandung huruf, angka, underscore, dan strip');
        }
    }

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

    if (!password || typeof password !== 'string') {
        errors.push('Password wajib diisi');
    } else {
        if (password.length < 8) {
            errors.push('Password minimal 8 karakter');
        }
        if (password.length > 128) {
            errors.push('Password terlalu panjang');
        }
        if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
            errors.push('Password harus mengandung kombinasi huruf dan angka');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Validasi ID buku Gutendex (angka bulat positif)
 */
function validateBookId(id) {
    const num = parseInt(id, 10);
    return !isNaN(num) && num > 0 && String(num) === String(id).trim();
}

/**
 * Validasi status baca ('want', 'reading', 'finished')
 */
function validateReadingStatus(status) {
    const valid = ['want', 'reading', 'finished'];
    return typeof status === 'string' && valid.includes(status.trim().toLowerCase());
}

/**
 * Validasi rating review (integer 1 - 5)
 */
function validateRating(rating) {
    const num = parseInt(rating, 10);
    return !isNaN(num) && num >= 1 && num <= 5;
}

/**
 * Sanitasi string untuk mencegah XSS
 */
function sanitize(str) {
    if (typeof str !== 'string') return '';
    return validator.escape(validator.trim(str));
}

module.exports = {
    validateLoginInput,
    validateRegisterInput,
    validateBookId,
    validateReadingStatus,
    validateRating,
    sanitize,
};
