// ============================================================
// js/library.js — Manajemen Halaman Library (Dual Mode: User vs Tamu)
// ============================================================

const tabs   = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("aktif"));
        panels.forEach(p => p.classList.add("hidden"));

        tab.classList.add("aktif");
        const targetId = tab.dataset.target;
        const targetEl = document.getElementById(targetId);
        if (targetEl) targetEl.classList.remove("hidden");

        // Muat data sesuai tab
        if (targetId === "bookmark")     muatBookmark();
        if (targetId === "history")      muatHistory();
        if (targetId === "status-baca")  muatStatusBaca();
        if (targetId === "koleksi")      muatKoleksi();
    });
});

function aman(teks) {
    return String(teks || '').replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function formatTanggal(waktu) {
    return new Date(waktu).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

const loggedIn = typeof API !== 'undefined' && API.isLoggedIn();

// ─────────────────────────────────────────────────────────────
// 1. TAB BOOKMARK
// ─────────────────────────────────────────────────────────────
const bookmarkList    = document.getElementById("bookmark-list");
const bookmarkKosong  = document.getElementById("bookmark-kosong");
const bookmarkLoading = document.getElementById("bookmark-loading");

async function muatBookmark() {
    bookmarkList.innerHTML = "";
    bookmarkKosong.classList.add("hidden");

    if (loggedIn) {
        bookmarkLoading.classList.remove("hidden");
        try {
            const res = await API.get('/api/bookmarks');
            const data = res.data || [];
            bookmarkLoading.classList.add("hidden");

            if (data.length === 0) {
                bookmarkKosong.classList.remove("hidden");
                return;
            }

            bookmarkList.innerHTML = data.map(b => `
                <div class="book-card-wrap" style="position: relative;">
                    <a href="detail.html?id=${b.book_id}" class="book">
                        <img src="${aman(b.cover)}" alt="${aman(b.title)}" onerror="this.src=''; this.style.background='#e2e8f0';">
                        <p>${aman(b.title)}</p>
                    </a>
                    <button class="btn-hapus-item" data-id="${b.book_id}" style="margin-top: 6px; width: 100%; padding: 4px; font-size: 12px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; border-radius: 4px; cursor: pointer;">
                        Hapus Bookmark
                    </button>
                </div>
            `).join("");

            bookmarkList.querySelectorAll('.btn-hapus-item').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const bId = btn.dataset.id;
                    try {
                        await API.delete(`/api/bookmarks/${bId}`);
                        API.showToast('Bookmark berhasil dihapus', 'info');
                        muatBookmark();
                    } catch (err) {
                        API.showToast(err.message, 'error');
                    }
                });
            });
        } catch (err) {
            bookmarkLoading.classList.add("hidden");
            bookmarkKosong.textContent = "Gagal memuat bookmark: " + err.message;
            bookmarkKosong.classList.remove("hidden");
        }
    } else {
        // Mode Tamu (localStorage)
        const daftar = JSON.parse(localStorage.getItem("bookmark")) || [];
        if (daftar.length === 0) {
            bookmarkKosong.classList.remove("hidden");
            return;
        }

        bookmarkList.innerHTML = daftar.map(b => `
            <a href="detail.html?id=${b.id}" class="book">
                <img src="${aman(b.cover)}" alt="${aman(b.judul)}" onerror="this.src=''; this.style.background='#e2e8f0';">
                <p>${aman(b.judul)}</p>
            </a>
        `).join("");
    }
}

// ─────────────────────────────────────────────────────────────
// 2. TAB HISTORY
// ─────────────────────────────────────────────────────────────
const historyList      = document.getElementById("history-list");
const historyKosong    = document.getElementById("history-kosong");
const historyLoading   = document.getElementById("history-loading");
const tombolHapusSemua = document.getElementById("hapus-semua");

async function muatHistory() {
    historyList.innerHTML = "";
    historyKosong.classList.add("hidden");

    if (loggedIn) {
        historyLoading.classList.remove("hidden");
        try {
            const res = await API.get('/api/history');
            const data = res.data || [];
            historyLoading.classList.add("hidden");

            if (data.length === 0) {
                historyKosong.classList.remove("hidden");
                tombolHapusSemua.classList.add("hidden");
                return;
            }

            tombolHapusSemua.classList.remove("hidden");
            historyList.innerHTML = data.map(h => `
                <li class="history-item">
                    <img src="${aman(h.cover)}" alt="${aman(h.title)}" onerror="this.style.display='none';">
                    <div class="history-info">
                        <h3><a href="detail.html?id=${h.book_id}">${aman(h.title)}</a></h3>
                        <p>Dibaca: ${formatTanggal(h.last_read_at)} ${h.read_count > 1 ? `(${h.read_count}x dibaca)` : ''}</p>
                    </div>
                    <button class="btn-hapus" data-id="${h.book_id}">Hapus</button>
                </li>
            `).join("");

            historyList.querySelectorAll('.btn-hapus').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const bId = btn.dataset.id;
                    try {
                        await API.delete(`/api/history/${bId}`);
                        muatHistory();
                    } catch (err) {
                        API.showToast(err.message, 'error');
                    }
                });
            });
        } catch (err) {
            historyLoading.classList.add("hidden");
            historyKosong.textContent = "Gagal memuat riwayat: " + err.message;
            historyKosong.classList.remove("hidden");
        }
    } else {
        // Mode Tamu (localStorage)
        const daftar = JSON.parse(localStorage.getItem("history")) || [];
        if (daftar.length === 0) {
            historyKosong.classList.remove("hidden");
            tombolHapusSemua.classList.add("hidden");
            return;
        }

        tombolHapusSemua.classList.remove("hidden");
        historyList.innerHTML = daftar.map(h => `
            <li class="history-item">
                <img src="${aman(h.cover)}" alt="${aman(h.judul)}" onerror="this.style.display='none';">
                <div class="history-info">
                    <h3><a href="detail.html?id=${h.id}">${aman(h.judul)}</a></h3>
                    <p>Dibaca: ${formatTanggal(h.waktu)}</p>
                </div>
                <button class="btn-hapus" data-id="${h.id}">Hapus</button>
            </li>
        `).join("");

        historyList.querySelectorAll('.btn-hapus').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                let list = JSON.parse(localStorage.getItem("history")) || [];
                list = list.filter(item => String(item.id) !== String(id));
                localStorage.setItem("history", JSON.stringify(list));
                muatHistory();
            });
        });
    }
}

tombolHapusSemua.addEventListener("click", async () => {
    if (!confirm('Yakin ingin menghapus semua riwayat bacaan?')) return;
    if (loggedIn) {
        try {
            await API.delete('/api/history');
            API.showToast('Seluruh riwayat dibersihkan', 'info');
            muatHistory();
        } catch (err) {
            API.showToast(err.message, 'error');
        }
    } else {
        localStorage.removeItem("history");
        muatHistory();
    }
});

// ─────────────────────────────────────────────────────────────
// 3. TAB STATUS BACA (Want, Reading, Finished)
// ─────────────────────────────────────────────────────────────
const statusList    = document.getElementById("status-list");
const statusKosong  = document.getElementById("status-kosong");
const statusLoading = document.getElementById("status-loading");
let statusFilterAktif = "all";

// Setup Filter Buttons
document.querySelectorAll(".btn-filter-status").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".btn-filter-status").forEach(b => b.classList.remove("aktif"));
        btn.classList.add("aktif");
        statusFilterAktif = btn.dataset.status;
        muatStatusBaca();
    });
});

async function muatStatusBaca() {
    statusList.innerHTML = "";
    statusKosong.classList.add("hidden");

    if (!loggedIn) {
        statusKosong.innerHTML = `Fitur Status Baca hanya untuk pengguna terdaftar. <a href="login.html" style="color:#2563eb; font-weight:600;">Masuk di sini</a>`;
        statusKosong.classList.remove("hidden");
        return;
    }

    statusLoading.classList.remove("hidden");
    try {
        const url = statusFilterAktif === "all" ? '/api/reading-status' : `/api/reading-status?status=${statusFilterAktif}`;
        const res = await API.get(url);
        const data = res.data || [];
        statusLoading.classList.add("hidden");

        if (data.length === 0) {
            statusKosong.textContent = "Belum ada buku pada status bacaan ini.";
            statusKosong.classList.remove("hidden");
            return;
        }

        const labelStatus = {
            want: "Ingin Dibaca",
            reading: "Sedang Dibaca",
            finished: "Selesai Dibaca"
        };

        statusList.innerHTML = data.map(b => `
            <a href="detail.html?id=${b.book_id}" class="book">
                <img src="${aman(b.cover)}" alt="${aman(b.title)}" onerror="this.src=''; this.style.background='#e2e8f0';">
                <p>${aman(b.title)}</p>
                <span class="tag" style="display:inline-block; margin-top:4px; font-size:11px; background:#e0f2fe; color:#0369a1; border-color:#bae6fd;">
                    ${labelStatus[b.status] || b.status}
                </span>
            </a>
        `).join("");
    } catch (err) {
        statusLoading.classList.add("hidden");
        statusKosong.textContent = "Gagal memuat status baca: " + err.message;
        statusKosong.classList.remove("hidden");
    }
}

// ─────────────────────────────────────────────────────────────
// 4. TAB KOLEKSI / RAK
// ─────────────────────────────────────────────────────────────
const koleksiContainer = document.getElementById("koleksi-container");
const koleksiKosong    = document.getElementById("koleksi-kosong");
const koleksiLoading   = document.getElementById("koleksi-loading");
const btnTambahRak     = document.getElementById("btn-tambah-rak");

btnTambahRak.addEventListener("click", async () => {
    if (!loggedIn) {
        alert("Silakan masuk terlebih dahulu untuk membuat rak koleksi.");
        return;
    }
    const nama = prompt("Masukkan nama rak / koleksi buku:");
    if (!nama || !nama.trim()) return;
    const desc = prompt("Deskripsi singkat (opsional):") || "";

    try {
        await API.post('/api/collections', { name: nama.trim(), description: desc.trim() });
        API.showToast('Koleksi baru berhasil dibuat', 'success');
        muatKoleksi();
    } catch (err) {
        API.showToast(err.message, 'error');
    }
});

async function muatKoleksi() {
    koleksiContainer.innerHTML = "";
    koleksiKosong.classList.add("hidden");

    if (!loggedIn) {
        koleksiKosong.innerHTML = `Fitur Rak Koleksi hanya untuk pengguna terdaftar. <a href="login.html" style="color:#2563eb; font-weight:600;">Masuk di sini</a>`;
        koleksiKosong.classList.remove("hidden");
        return;
    }

    koleksiLoading.classList.remove("hidden");
    try {
        const res = await API.get('/api/collections');
        const collections = res.data || [];
        koleksiLoading.classList.add("hidden");

        if (collections.length === 0) {
            koleksiKosong.textContent = "Anda belum memiliki rak koleksi buku.";
            koleksiKosong.classList.remove("hidden");
            return;
        }

        // Tampilkan setiap koleksi secara accordion/kartu
        for (const col of collections) {
            const detailRes = await API.get(`/api/collections/${col.id}`);
            const detail = detailRes.data;
            const items = detail.items || [];

            const card = document.createElement("div");
            card.style.cssText = "background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);";

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <h3 style="font-size: 18px; color: #1e293b; margin-bottom: 4px;">📁 ${aman(detail.name)}</h3>
                        <p style="font-size: 13px; color: #64748b;">${aman(detail.description || 'Tidak ada deskripsi')} • <strong>${items.length} buku</strong></p>
                    </div>
                    <button class="btn-hapus-rak" data-id="${detail.id}" style="padding: 4px 10px; font-size: 12px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; border-radius: 4px; cursor: pointer;">
                        Hapus Rak
                    </button>
                </div>

                <div class="book-grid" style="grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px;">
                    ${items.length === 0 ? '<p style="color:#94a3b8; font-style:italic; font-size:13px;">Belum ada buku di rak ini.</p>' : items.map(b => `
                        <div style="text-align: center;">
                            <a href="detail.html?id=${b.book_id}" style="text-decoration:none; color:inherit;">
                                <img src="${aman(b.cover)}" alt="${aman(b.title)}" style="width: 100%; height: 180px; object-fit: cover; border-radius: 6px;" onerror="this.src=''; this.style.background='#cbd5e1';">
                                <p style="font-size: 12px; margin-top: 4px; font-weight: 500; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${aman(b.title)}</p>
                            </a>
                            <button class="btn-keluarkan-buku" data-col="${detail.id}" data-id="${b.book_id}" style="margin-top: 4px; font-size: 11px; color: #ef4444; background: none; border: none; cursor: pointer; text-decoration: underline;">
                                Keluarkan
                            </button>
                        </div>
                    `).join("")}
                </div>
            `;

            // Handler Hapus Rak
            card.querySelector('.btn-hapus-rak').addEventListener('click', async () => {
                if (!confirm(`Hapus rak "${detail.name}" beserta daftar isinya?`)) return;
                try {
                    await API.delete(`/api/collections/${detail.id}`);
                    API.showToast('Rak berhasil dihapus', 'info');
                    muatKoleksi();
                } catch (err) {
                    API.showToast(err.message, 'error');
                }
            });

            // Handler Keluarkan Buku
            card.querySelectorAll('.btn-keluarkan-buku').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const colId = btn.dataset.col;
                    const bId   = btn.dataset.id;
                    try {
                        await API.delete(`/api/collections/${colId}/items/${bId}`);
                        API.showToast('Buku dikeluarkan dari rak', 'info');
                        muatKoleksi();
                    } catch (err) {
                        API.showToast(err.message, 'error');
                    }
                });
            });

            koleksiContainer.appendChild(card);
        }
    } catch (err) {
        koleksiLoading.classList.add("hidden");
        koleksiKosong.textContent = "Gagal memuat koleksi: " + err.message;
        koleksiKosong.classList.remove("hidden");
    }
}

// Inisialisasi awal pada tab default (Bookmark)
muatBookmark();
