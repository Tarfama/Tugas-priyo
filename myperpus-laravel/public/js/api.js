/**
 * ============================================================
 * js/api.js — Helper Tunggal Pemanggilan API MYPERPUS
 * ============================================================
 * Fitur:
 * - Menambahkan header Authorization: Bearer <token> otomatis
 * - Menangani error 401 (Auto-logout jika token invalid/expired)
 * - Helper toast UI terpusat
 * - Idempoten & mudah digunakan di semua halaman
 * ============================================================
 */

const API = (function () {
    'use strict';

    function getToken() {
        return localStorage.getItem('token');
    }

    function getUser() {
        try {
            const raw = localStorage.getItem('user');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function isLoggedIn() {
        return !!getToken() && !!getUser();
    }

    function isAdmin() {
        const u = getUser();
        return u && u.role === 'admin';
    }

    function showToast(message, type = 'info') {
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.textContent = message;

        // Gaya inline dinamis untuk berbagai tipe toast
        if (type === 'error') {
            toast.style.background = '#dc2626';
        } else if (type === 'success') {
            toast.style.background = '#16a34a';
        } else {
            toast.style.background = '#1e293b';
        }

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    function logout(silent = false) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!silent) {
            showToast('Sesi Anda telah berakhir. Silakan login kembali.', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 800);
        }
    }

    async function request(endpoint, options = {}) {
        const headers = options.headers || {};
        const token   = getToken();

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }

        options.headers = headers;

        try {
            const res = await fetch(endpoint, options);

            // Jika token tidak valid / kedaluwarsa
            if (res.status === 401 && !endpoint.includes('/api/auth/login') && !endpoint.includes('/api/auth/register')) {
                logout();
                throw new Error('Sesi berakhir');
            }

            const data = await res.json().catch(() => ({
                success: false,
                message: 'Gagal memproses respons server'
            }));

            if (!res.ok) {
                const errMsg = data.message || (data.errors ? data.errors.join(', ') : 'Terjadi kesalahan');
                throw new Error(errMsg);
            }

            return data;
        } catch (err) {
            if (err.message !== 'Sesi berakhir' && !options.silentError) {
                // Tampilkan toast hanya jika bukan mode silent
                // console.warn('[API Request Failed]', endpoint, err.message);
            }
            throw err;
        }
    }

    return {
        getToken,
        getUser,
        isLoggedIn,
        isAdmin,
        showToast,
        logout,
        get:    (url, opts)       => request(url, { method: 'GET', ...opts }),
        post:   (url, body, opts) => request(url, { method: 'POST', body, ...opts }),
        put:    (url, body, opts) => request(url, { method: 'PUT', body, ...opts }),
        patch:  (url, body, opts) => request(url, { method: 'PATCH', body, ...opts }),
        delete: (url, opts)       => request(url, { method: 'DELETE', ...opts }),
    };
})();
