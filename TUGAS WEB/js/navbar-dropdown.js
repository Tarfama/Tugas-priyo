/**
 * ============================================================
 * js/navbar-dropdown.js — Profile Menu, Navigasi User & Admin
 * ============================================================
 */

(function () {
    'use strict';

    function getSession() {
        const token = localStorage.getItem('token');
        const userJson = localStorage.getItem('user');

        if (!token || !userJson) return null;

        try {
            return { token, user: JSON.parse(userJson) };
        } catch {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return null;
        }
    }

    function performLogout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (typeof API !== 'undefined' && API.showToast) {
            API.showToast('👋 Anda telah berhasil logout.', 'info');
        }
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 500);
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function getInitials(name) {
        if (!name) return 'U';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) {
            return parts[0].charAt(0).toUpperCase();
        }
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    function initNavbarProfile() {
        const profileContainer = document.getElementById('profile-area') || document.querySelector('.profile');
        if (!profileContainer) return;

        const session = getSession();

        // 1. TAMU (GUEST)
        if (!session) {
            profileContainer.innerHTML = `
                <div class="guest-auth-buttons">
                    <a href="login.html" class="btn-nav-login">Masuk</a>
                    <a href="register.html" class="btn-nav-register">Daftar</a>
                </div>
            `;
            return;
        }

        // 2. USER LOGIN / ADMIN
        const user = session.user;
        const username = escapeHtml(user.username || 'User');
        const email = escapeHtml(user.email || 'user@example.com');
        const initials = getInitials(user.full_name || user.username);
        const isAdmin = user.role === 'admin';

        // Badge peran
        const badgeHtml = isAdmin
            ? `<span class="dropdown-badge" style="background:#fee2e2; color:#b91c1c;">
                 <span class="dropdown-badge-dot" style="background:#ef4444;"></span> Administrator
               </span>`
            : `<span class="dropdown-badge">
                 <span class="dropdown-badge-dot"></span> Member Aktif
               </span>`;

        // Item khusus admin
        const adminItemHtml = isAdmin
            ? `<li role="none">
                 <a href="admin/index.html" class="dropdown-item" role="menuitem" style="color:#2563eb; font-weight:600;">
                     <span class="dropdown-item-icon">⚡</span>
                     <span>Dashboard Admin</span>
                 </a>
               </li>`
            : '';

        profileContainer.innerHTML = `
            <div class="profile-menu-container" id="profile-menu-wrapper">
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

                <div class="profile-dropdown-menu" id="profile-dropdown-menu" role="menu" aria-label="Menu Opsi Akun">
                    <div class="dropdown-user-header">
                        <div class="dropdown-avatar-large" aria-hidden="true">${initials}</div>
                        <div class="dropdown-user-details">
                            <span class="dropdown-user-fullname">${escapeHtml(user.full_name || username)}</span>
                            <span class="dropdown-user-email">${email}</span>
                            ${badgeHtml}
                        </div>
                    </div>

                    <div class="dropdown-divider"></div>

                    <ul class="dropdown-nav-list" role="none">
                        ${adminItemHtml}
                        <li role="none">
                            <a href="profile.html" class="dropdown-item" role="menuitem">
                                <span class="dropdown-item-icon">👤</span>
                                <span>Profil & Akun Saya</span>
                            </a>
                        </li>
                        <li role="none">
                            <a href="library.html" class="dropdown-item" role="menuitem">
                                <span class="dropdown-item-icon">📚</span>
                                <span>Koleksi Buku & Rak</span>
                            </a>
                        </li>
                        <li role="none">
                            <a href="explore.html" class="dropdown-item" role="menuitem">
                                <span class="dropdown-item-icon">🔍</span>
                                <span>Jelajahi Buku</span>
                            </a>
                        </li>
                    </ul>

                    <div class="dropdown-divider"></div>

                    <button type="button" class="dropdown-item logout" id="btn-dropdown-logout" role="menuitem">
                        <span class="dropdown-item-icon">🚪</span>
                        <span>Keluar (Logout)</span>
                    </button>
                </div>
            </div>
        `;

        const wrapper = document.getElementById('profile-menu-wrapper');
        const triggerBtn = document.getElementById('profile-trigger-btn');
        const dropdownMenu = document.getElementById('profile-dropdown-menu');
        const logoutBtn = document.getElementById('btn-dropdown-logout');

        function openDropdown() {
            dropdownMenu.classList.add('show');
            triggerBtn.classList.add('active');
            triggerBtn.setAttribute('aria-expanded', 'true');
        }

        function closeDropdown() {
            dropdownMenu.classList.remove('show');
            triggerBtn.classList.remove('active');
            triggerBtn.setAttribute('aria-expanded', 'false');
        }

        triggerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.contains('show') ? closeDropdown() : openDropdown();
        });

        document.addEventListener('click', (event) => {
            if (!wrapper.contains(event.target)) {
                closeDropdown();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' || event.key === 'Esc') {
                if (dropdownMenu.classList.contains('show')) {
                    closeDropdown();
                    triggerBtn.focus();
                }
            }
        });

        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            performLogout();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavbarProfile);
    } else {
        initNavbarProfile();
    }
})();
