/**
 * ============================================================
 * admin/js/admin-common.js — Autentikasi & Shell Admin Terpusat
 * ============================================================
 */

(function () {
    'use strict';

    // 1. Verifikasi Ketat: Harus Login dan Berperan Admin
    const token = localStorage.getItem('token');
    let user = null;
    try {
        user = JSON.parse(localStorage.getItem('user'));
    } catch (e) {}

    if (!token || !user || user.role !== 'admin') {
        alert('Akses Ditolak: Anda harus login sebagai Administrator untuk membuka halaman ini.');
        window.location.href = '../login.html';
        return;
    }

    // Pasang info admin di topbar jika elemen tersedia
    window.addEventListener('DOMContentLoaded', () => {
        const adminNameEl = document.getElementById('admin-display-name');
        if (adminNameEl && user) {
            adminNameEl.textContent = user.full_name || user.username;
        }

        const logoutBtn = document.getElementById('admin-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '../login.html';
            });
        }
    });
})();

// Helper format tanggal Indonesia
function formatTglWaktu(isoString) {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function aman(teks) {
    return String(teks || '').replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
