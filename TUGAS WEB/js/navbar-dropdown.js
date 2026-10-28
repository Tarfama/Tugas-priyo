/**
 * ============================================================
 * js/navbar-dropdown.js
 * Komponen Navbar Profile Menu & Interactive Dropdown
 * ============================================================
 * 
 * Tanggung Jawab:
 * 1. Memeriksa status autentikasi dari localStorage (JWT & data user).
 * 2. Merender komponen Profile Avatar & Dropdown jika sudah login,
 *    atau tombol "Masuk" & "Daftar" jika masih sebagai tamu.
 * 3. Menangani interaktivitas:
 *    - Buka / Tutup dropdown saat avatar diklik (toggle).
 *    - Click Outside Handler: Menutup dropdown saat klik di luar menu.
 *    - Keyboard Accessibility: Menutup dropdown saat tombol ESC ditekan.
 *    - Logout Handler: Pembersihan sesi dan redirect ke halaman login.
 * ============================================================
 */

(function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────
    // 1. MANAJEMEN STATE SESI (Auth Management)
    // ─────────────────────────────────────────────────────────────

    /**
     * Mengambil dan memvalidasi data sesi user dari localStorage
     * @returns {{ token: string, user: { id: number, username: string, email: string } } | null}
     */
    function getSession() {
        const token = localStorage.getItem('token');
        const userJson = localStorage.getItem('user');

        if (!token || !userJson) {
            return null;
        }

        try {
            const user = JSON.parse(userJson);
            return { token, user };
        } catch (err) {
            console.error('[Session Error] Format data user rusak:', err);
            // Bersihkan data yang corrupt
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return null;
        }
    }

    /**
     * Menghapus sesi user dan mengalihkan halaman (Logout)
     */
    function performLogout() {
        // 1. Hapus token dan data sesi dari storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // 2. Beri notifikasi visual (toast)
        showToast('👋 Anda telah berhasil logout.');

        // 3. Alihkan halaman ke Login setelah jeda singkat
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 600);
    }

    // ─────────────────────────────────────────────────────────────
    // 2. UTILITAS TAMPILAN
    // ─────────────────────────────────────────────────────────────

    /**
     * Mencegah serangan XSS dengan meng-escape string HTML
     * @param {string} str 
     * @returns {string}
     */
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Menghasilkan inisial dari nama/username (Maksimal 2 huruf)
     * Contoh: "priyo" -> "P", "Priyo Utomo" -> "PU"
     * @param {string} name 
     * @returns {string}
     */
    function getInitials(name) {
        if (!name) return 'U';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) {
            return parts[0].charAt(0).toUpperCase();
        }
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    /**
     * Menampilkan pesan toast sementara di sudut layar
     * @param {string} message 
     */
    function showToast(message) {
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. RENDER KOMPONEN NAVBAR
    // ─────────────────────────────────────────────────────────────

    function initNavbarProfile() {
        // Cari kontainer profile di navbar (mendukung #profile-area atau .profile)
        const profileContainer = document.getElementById('profile-area') || document.querySelector('.profile');
        if (!profileContainer) return;

        const session = getSession();

        // JIKA BELUM LOGIN: Render tombol Masuk & Daftar
        if (!session) {
            profileContainer.innerHTML = `
                <div class="guest-auth-buttons">
                    <a href="login.html" class="btn-nav-login">Masuk</a>
                    <a href="register.html" class="btn-nav-register">Daftar</a>
                </div>
            `;
            return;
        }

        // JIKA SUDAH LOGIN: Render Avatar Trigger Button & Dropdown Menu
        const user = session.user;
        const username = escapeHtml(user.username || 'User');
        const email = escapeHtml(user.email || 'user@example.com');
        const initials = getInitials(user.username);

        profileContainer.innerHTML = `
            <div class="profile-menu-container" id="profile-menu-wrapper">
                <!-- Trigger Button (Avatar + Nama + Chevron) -->
                <button 
                    type="button" 
                    class="profile-trigger-btn" 
                    id="profile-trigger-btn"
                    aria-expanded="false" 
                    aria-haspopup="true"
                    aria-label="Menu Profil Pengguna"
                >
                    <div class="profile-avatar-circle" aria-hidden="true">${initials}</div>
                    <span class="profile-trigger-name">${username}</span>
                    <svg class="profile-chevron" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>

                <!-- Dropdown Menu Card -->
                <div class="profile-dropdown-menu" id="profile-dropdown-menu" role="menu" aria-label="Menu Opsi Akun">
                    <!-- Info Singkat User -->
                    <div class="dropdown-user-header">
                        <div class="dropdown-avatar-large" aria-hidden="true">${initials}</div>
                        <div class="dropdown-user-details">
                            <span class="dropdown-user-fullname">${username}</span>
                            <span class="dropdown-user-email">${email}</span>
                            <span class="dropdown-badge">
                                <span class="dropdown-badge-dot"></span>
                                Member Aktif
                            </span>
                        </div>
                    </div>

                    <div class="dropdown-divider"></div>

                    <!-- Item Menu Navigasi -->
                    <ul class="dropdown-nav-list" role="none">
                        <li role="none">
                            <a href="library.html" class="dropdown-item" role="menuitem">
                                <span class="dropdown-item-icon">📚</span>
                                <span>Koleksi Buku Saya</span>
                            </a>
                        </li>
                        <li role="none">
                            <a href="explore.html" class="dropdown-item" role="menuitem">
                                <span class="dropdown-item-icon">🔍</span>
                                <span>Jelajahi Novel</span>
                            </a>
                        </li>
                        <li role="none">
                            <a href="#settings" class="dropdown-item" role="menuitem" id="menu-settings">
                                <span class="dropdown-item-icon">⚙️</span>
                                <span>Pengaturan Akun</span>
                            </a>
                        </li>
                    </ul>

                    <div class="dropdown-divider"></div>

                    <!-- Tombol Logout -->
                    <button type="button" class="dropdown-item logout" id="btn-dropdown-logout" role="menuitem">
                        <span class="dropdown-item-icon">🚪</span>
                        <span>Keluar (Logout)</span>
                    </button>
                </div>
            </div>
        `;

        // ─────────────────────────────────────────────────────────────
        // 4. EVENT HANDLER: TOGGLE, CLICK OUTSIDE, ESC, & LOGOUT
        // ─────────────────────────────────────────────────────────────

        const wrapper = document.getElementById('profile-menu-wrapper');
        const triggerBtn = document.getElementById('profile-trigger-btn');
        const dropdownMenu = document.getElementById('profile-dropdown-menu');
        const logoutBtn = document.getElementById('btn-dropdown-logout');
        const settingsBtn = document.getElementById('menu-settings');

        /**
         * Membuka dropdown menu
         */
        function openDropdown() {
            dropdownMenu.classList.add('show');
            triggerBtn.classList.add('active');
            triggerBtn.setAttribute('aria-expanded', 'true');
        }

        /**
         * Menutup dropdown menu
         */
        function closeDropdown() {
            dropdownMenu.classList.remove('show');
            triggerBtn.classList.remove('active');
            triggerBtn.setAttribute('aria-expanded', 'false');
        }

        /**
         * Toggle status buka/tutup dropdown
         */
        function toggleDropdown(e) {
            e.stopPropagation(); // Cegah event bubbling ke document
            const isOpen = dropdownMenu.classList.contains('show');
            if (isOpen) {
                closeDropdown();
            } else {
                openDropdown();
            }
        }

        // --- Event A: Klik Trigger Avatar ---
        triggerBtn.addEventListener('click', toggleDropdown);

        // --- Event B: Click Outside Handler ---
        // Jika user mengklik elemen mana saja di luar wrapper, tutup dropdown
        document.addEventListener('click', (event) => {
            if (!wrapper.contains(event.target)) {
                closeDropdown();
            }
        });

        // --- Event C: Keyboard Accessibility (Tutup dengan tombol ESC) ---
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' || event.key === 'Esc') {
                if (dropdownMenu.classList.contains('show')) {
                    closeDropdown();
                    triggerBtn.focus(); // Kembalikan fokus ke trigger button untuk a11y
                }
            }
        });

        // --- Event D: Tombol Logout ---
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            performLogout();
        });

        // --- Event E: Pengaturan Dummy Info ---
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                closeDropdown();
                showToast('⚙️ Halaman Pengaturan Akun akan segera hadir!');
            });
        }
    }

    // Jalankan saat DOM sudah siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavbarProfile);
    } else {
        initNavbarProfile();
    }
})();
