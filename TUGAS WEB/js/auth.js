// ============================================================
// js/auth.js — Script frontend untuk Login & Register
// ============================================================
// Menangani:
//   - Form submission dengan fetch API
//   - Validasi input di sisi client (UX)
//   - Toggle visibility password
//   - Penyimpanan JWT token di localStorage
//   - Redirect setelah login berhasil
// ============================================================

// --- Konfigurasi ---
const API_BASE = '/api/auth';  // Base URL API (relative, karena di-serve oleh Express)

// ─────────────────────────────────────────────────────────────
// UTILITAS
// ─────────────────────────────────────────────────────────────

/**
 * Tampilkan pesan notifikasi di halaman
 * @param {'success'|'error'} type - Tipe pesan
 * @param {string} message - Isi pesan
 */
function showMessage(type, message) {
    const el = document.getElementById('auth-message');
    if (!el) return;

    el.textContent  = message;
    el.className    = `auth-message ${type}`;
    el.classList.remove('hidden');

    // Auto-hide setelah 5 detik
    setTimeout(() => el.classList.add('hidden'), 5000);
}

/**
 * Tampilkan error di bawah field input
 * @param {string} fieldId - ID field input
 * @param {string} message - Pesan error
 */
function showFieldError(fieldId, message) {
    const errorEl = document.getElementById(`${fieldId}-error`);
    const inputEl = document.getElementById(fieldId);

    if (errorEl) errorEl.textContent = message;
    if (inputEl) inputEl.classList.add('input-error');
}

/**
 * Hapus semua error field
 */
function clearFieldErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
}

/**
 * Toggle state loading pada tombol
 * @param {HTMLButtonElement} btn - Element tombol
 * @param {boolean} isLoading - Apakah sedang loading
 */
function setLoading(btn, isLoading) {
    const textEl    = btn.querySelector('.btn-text');
    const loadingEl = btn.querySelector('.btn-loading');

    btn.disabled = isLoading;
    if (textEl)    textEl.classList.toggle('hidden', isLoading);
    if (loadingEl) loadingEl.classList.toggle('hidden', !isLoading);
}

/**
 * Validasi format email sederhana (client-side)
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─────────────────────────────────────────────────────────────
// TOGGLE PASSWORD VISIBILITY
// ─────────────────────────────────────────────────────────────

document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = '🙈';
        } else {
            input.type = 'password';
            btn.textContent = '👁️';
        }
    });
});

// ─────────────────────────────────────────────────────────────
// FORM LOGIN
// ─────────────────────────────────────────────────────────────

const loginForm = document.getElementById('login-form');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFieldErrors();

        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const btn      = document.getElementById('btn-login');

        // --- Validasi client-side ---
        let hasError = false;

        if (!email) {
            showFieldError('email', 'Email wajib diisi');
            hasError = true;
        } else if (!isValidEmail(email)) {
            showFieldError('email', 'Format email tidak valid');
            hasError = true;
        }

        if (!password) {
            showFieldError('password', 'Password wajib diisi');
            hasError = true;
        } else if (password.length < 8) {
            showFieldError('password', 'Password minimal 8 karakter');
            hasError = true;
        }

        if (hasError) return;

        // --- Kirim ke API ---
        setLoading(btn, true);

        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                // Simpan token dan data user di localStorage
                localStorage.setItem('token',    data.data.token);
                localStorage.setItem('user',     JSON.stringify(data.data.user));

                showMessage('success', '✅ Login berhasil! Mengalihkan...');

                // Redirect ke halaman utama setelah 1 detik
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                // Tampilkan error dari server (generic message)
                showMessage('error', data.message || 'Email atau password salah');
            }
        } catch (err) {
            console.error('Login error:', err);
            showMessage('error', 'Gagal terhubung ke server. Coba lagi nanti.');
        } finally {
            setLoading(btn, false);
        }
    });
}

// ─────────────────────────────────────────────────────────────
// FORM REGISTER
// ─────────────────────────────────────────────────────────────

const registerForm = document.getElementById('register-form');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFieldErrors();

        const username        = document.getElementById('username').value.trim();
        const email           = document.getElementById('email').value.trim();
        const password        = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const btn             = document.getElementById('btn-register');

        // --- Validasi client-side ---
        let hasError = false;

        if (!username) {
            showFieldError('username', 'Username wajib diisi');
            hasError = true;
        } else if (username.length < 3) {
            showFieldError('username', 'Username minimal 3 karakter');
            hasError = true;
        } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            showFieldError('username', 'Hanya huruf, angka, underscore, dan strip');
            hasError = true;
        }

        if (!email) {
            showFieldError('email', 'Email wajib diisi');
            hasError = true;
        } else if (!isValidEmail(email)) {
            showFieldError('email', 'Format email tidak valid');
            hasError = true;
        }

        if (!password) {
            showFieldError('password', 'Password wajib diisi');
            hasError = true;
        } else if (password.length < 8) {
            showFieldError('password', 'Password minimal 8 karakter');
            hasError = true;
        } else if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
            showFieldError('password', 'Harus mengandung huruf dan angka');
            hasError = true;
        }

        if (!confirmPassword) {
            showFieldError('confirm-password', 'Konfirmasi password wajib diisi');
            hasError = true;
        } else if (password !== confirmPassword) {
            showFieldError('confirm-password', 'Password tidak cocok');
            hasError = true;
        }

        if (hasError) return;

        // --- Kirim ke API ---
        setLoading(btn, true);

        try {
            const res = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                showMessage('success', '✅ Registrasi berhasil! Mengalihkan ke login...');

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            } else {
                const msg = data.errors
                    ? data.errors.join(', ')
                    : (data.message || 'Registrasi gagal');
                showMessage('error', msg);
            }
        } catch (err) {
            console.error('Register error:', err);
            showMessage('error', 'Gagal terhubung ke server. Coba lagi nanti.');
        } finally {
            setLoading(btn, false);
        }
    });
}
