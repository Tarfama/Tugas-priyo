// ============================================================
// js/auth.js — Script Frontend Login & Register dengan Sinkronisasi
// ============================================================

const API_BASE = '/api/auth';

function showMessage(type, message) {
    const el = document.getElementById('auth-message');
    if (!el) return;

    el.textContent  = message;
    el.className    = `auth-message ${type}`;
    el.classList.remove('hidden');

    setTimeout(() => el.classList.add('hidden'), 6000);
}

function showFieldError(fieldId, message) {
    const errorEl = document.getElementById(`${fieldId}-error`);
    const inputEl = document.getElementById(fieldId);

    if (errorEl) errorEl.textContent = message;
    if (inputEl) inputEl.classList.add('input-error');
}

function clearFieldErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
}

function setLoading(btn, isLoading) {
    const textEl    = btn.querySelector('.btn-text');
    const loadingEl = btn.querySelector('.btn-loading');

    btn.disabled = isLoading;
    if (textEl)    textEl.classList.toggle('hidden', isLoading);
    if (loadingEl) loadingEl.classList.toggle('hidden', !isLoading);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Password toggle
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

// Helper sinkronisasi data lokal ke database setelah login
async function sinkronkanDataLokal(token) {
    try {
        const localBookmarks = JSON.parse(localStorage.getItem('bookmark')) || [];
        const localHistory   = JSON.parse(localStorage.getItem('history')) || [];

        if (localBookmarks.length === 0 && localHistory.length === 0) {
            return;
        }

        const res = await fetch('/api/sync/local', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                bookmarks: localBookmarks,
                history: localHistory
            })
        });

        if (res.ok) {
            // Bersihkan data lokal agar tidak duplikat dengan akun
            localStorage.removeItem('bookmark');
            localStorage.removeItem('history');
            console.log('✅ Sinkronisasi bookmark dan history lokal selesai.');
        }
    } catch (err) {
        console.warn('Gagal sinkronisasi data lokal:', err);
    }
}

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
        }

        if (hasError) return;

        setLoading(btn, true);

        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                localStorage.setItem('token', data.data.token);
                localStorage.setItem('user',  JSON.stringify(data.data.user));

                // Jalankan sinkronisasi data lokal jika ada
                await sinkronkanDataLokal(data.data.token);

                showMessage('success', '✅ Login berhasil! Mengalihkan...');

                setTimeout(() => {
                    // Jika admin, arahkan ke dashboard admin
                    if (data.data.user && data.data.user.role === 'admin') {
                        window.location.href = 'admin/index.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                }, 800);
            } else {
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
            showFieldError('password', 'Harus mengandung kombinasi huruf dan angka');
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
                }, 1200);
            } else {
                const msg = data.errors ? data.errors.join(', ') : (data.message || 'Registrasi gagal');
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
