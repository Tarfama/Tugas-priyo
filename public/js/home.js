// ============================================================
// js/home.js — Beranda MYPERPUS (Pengumuman, Terakhir Dibaca, Pilihan Editor)
// ============================================================

const listPopuler   = document.getElementById("list-populer");
const listAdventure = document.getElementById("list-adventure");
const listRomance   = document.getElementById("list-romance");

let daftarBukuTersembunyi = [];

function aman(teks) {
    return String(teks || '').replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function isiDaftar(wadah, buku) {
    if (!wadah) return;
    // Filter buku yang disembunyikan oleh admin
    const filtered = (buku || []).filter(b => !daftarBukuTersembunyi.includes(b.id));

    wadah.innerHTML = filtered.slice(0, 4).map(b => `
        <a href="detail.html?id=${b.id}" class="book">
            <img src="${aman(b.formats ? b.formats["image/jpeg"] : b.cover)}" alt="${aman(b.title || b.judul)}" onerror="this.src=''; this.style.background='#cbd5e1';">
            <p>${aman(b.title || b.judul)}</p>
        </a>
    `).join("");
}

async function ambil(url, wadah) {
    wadah.textContent = "Memuat...";
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        isiDaftar(wadah, data.results);
    } catch (err) {
        wadah.textContent = "Gagal memuat buku: " + err.message;
        console.error(err);
    }
}

// 1. Muat Pengumuman Aktif
async function muatPengumuman() {
    const banner = document.getElementById("banner-pengumuman");
    const judulEl = document.getElementById("pengumuman-judul");
    const kontenEl = document.getElementById("pengumuman-konten");

    try {
        const res = await fetch('/api/announcements/active');
        if (!res.ok) return;
        const data = await res.json();
        const list = data.data || [];

        if (list.length > 0) {
            const utama = list[0];
            judulEl.textContent  = utama.title;
            kontenEl.textContent = utama.content;
            banner.classList.remove("hidden");
        }
    } catch (e) {}
}

// 2. Muat Buku Tersembunyi (Hidden Books) dari server
async function muatDaftarTersembunyi() {
    try {
        const res = await fetch('/api/catalog/hidden');
        if (res.ok) {
            const data = await res.json();
            daftarBukuTersembunyi = data.data || [];
        }
    } catch (e) {}
}

// 3. Muat Buku Terakhir Dibaca (Khusus User Login)
async function muatTerakhirDibaca() {
    const section = document.getElementById("section-terakhir-dibaca");
    const list    = document.getElementById("list-terakhir-dibaca");

    const loggedIn = typeof API !== 'undefined' && API.isLoggedIn();
    if (!loggedIn) {
        // Cek localStorage tamu
        const historyLocal = JSON.parse(localStorage.getItem("history")) || [];
        if (historyLocal.length > 0) {
            section.classList.remove("hidden");
            list.innerHTML = historyLocal.slice(0, 4).map(b => `
                <a href="detail.html?id=${b.id}" class="book">
                    <img src="${aman(b.cover)}" alt="${aman(b.judul)}" onerror="this.src=''; this.style.background='#cbd5e1';">
                    <p>${aman(b.judul)}</p>
                </a>
            `).join("");
        }
        return;
    }

    try {
        const res = await API.get('/api/history', { silentError: true });
        const items = res.data || [];
        if (items.length > 0) {
            section.classList.remove("hidden");
            list.innerHTML = items.slice(0, 4).map(b => `
                <a href="detail.html?id=${b.book_id}" class="book">
                    <img src="${aman(b.cover)}" alt="${aman(b.title)}" onerror="this.src=''; this.style.background='#cbd5e1';">
                    <p>${aman(b.title)}</p>
                </a>
            `).join("");
        }
    } catch (e) {}
}

// 4. Muat Pilihan Admin (Featured Books)
async function muatPilihanAdmin() {
    const section = document.getElementById("section-pilihan-admin");
    const list    = document.getElementById("list-pilihan-admin");

    try {
        const res = await fetch('/api/catalog/featured');
        if (!res.ok) return;
        const data = await res.json();
        const items = data.data || [];

        if (items.length > 0) {
            section.classList.remove("hidden");
            list.innerHTML = items.slice(0, 4).map(b => `
                <a href="detail.html?id=${b.book_id}" class="book">
                    <img src="${aman(b.cover)}" alt="${aman(b.title)}" onerror="this.src=''; this.style.background='#cbd5e1';">
                    <p>${aman(b.title)}</p>
                    ${b.note ? `<span class="tag" style="margin-top:4px; font-size:11px; background:#fef3c7; color:#92400e; border-color:#fde68a;">${aman(b.note)}</span>` : ''}
                </a>
            `).join("");
        }
    } catch (e) {}
}

// Eksekusi Berurutan
async function muatSemua() {
    await muatPengumuman();
    await muatDaftarTersembunyi();
    await muatTerakhirDibaca();
    await muatPilihanAdmin();

    // Katalog Gutendex
    await ambil("https://gutendex.com/books?languages=en", listPopuler);
    await ambil("https://gutendex.com/books?languages=en&topic=adventure", listAdventure);
    await ambil("https://gutendex.com/books?languages=en&topic=romance", listRomance);
}

muatSemua();
