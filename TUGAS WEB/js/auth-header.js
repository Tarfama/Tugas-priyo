// ============================================================
// js/auth-header.js — Kelola tampilan header berdasarkan status login
// ============================================================
// Script ini dijalankan di semua halaman untuk menampilkan
// tombol Login atau nama user di header.
// ============================================================

(function () {
    const profileArea = document.getElementById('profile-area');
    if (!profileArea) return;

    const token    = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
        try {
            const user = JSON.parse(userData);

            // Tampilkan nama user dan tombol logout
            profileArea.innerHTML = `
                <span class="user-greeting">Halo, <strong>${escapeHtml(user.username)}</strong></span>
                <button class="btn-logout-header" id="btn-logout">Logout</button>
            `;

            // Handle logout
            document.getElementById('btn-logout').addEventListener('click', () => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
            });
        } catch {
            // Data rusak, hapus dan tampilkan login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }

    // Sanitasi teks untuk mencegah XSS
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
})();
