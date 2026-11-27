// ============================================================
// js/detail.js — Logika Halaman Detail Buku (Dual Mode: Tamu & User)
// ============================================================

const pesan = document.getElementById("pesan");
const isi   = document.getElementById("isi");

const params = new URLSearchParams(window.location.search);
const id     = params.get("id");

let bukuDataGlobal = null;
let userBookStatus = null; // Dari GET /api/books/:id/me jika login

// Cek apakah buku disembunyikan oleh admin
async function cekBukuTersembunyi(bookId) {
    try {
        const res = await fetch('/api/catalog/hidden');
        if (res.ok) {
            const data = await res.json();
            if (data.data && Array.isArray(data.data) && data.data.includes(parseInt(bookId, 10))) {
                return true;
            }
        }
    } catch (e) {}
    return false;
}

// 1. Ambil data buku dari Gutendex
async function ambilBuku() {
    if (!id) {
        pesan.textContent = "Buku tidak dipilih. Pilih buku dari halaman Explore.";
        return;
    }

    const isHidden = await cekBukuTersembunyi(id);
    if (isHidden) {
        pesan.innerHTML = `<span style="color:#dc2626; font-weight:bold;">⚠️ Buku tidak tersedia.</span><br><small style="color:#64748b;">Buku ini telah dinonaktifkan atau disembunyikan oleh Administrator.</small>`;
        return;
    }

    try {
        const res = await fetch("https://gutendex.com/books/" + encodeURIComponent(id));

        if (res.status === 404) {
            pesan.textContent = "Buku tidak ditemukan.";
            return;
        }
        if (!res.ok) {
            throw new Error("HTTP " + res.status);
        }

        const buku = await res.json();
        bukuDataGlobal = buku;
        await tampilkan(buku);
    } catch (err) {
        pesan.textContent = "Gagal memuat buku. Coba refresh halaman.";
    }
}

function rapikanNama(nama) {
    if (!nama) return "";
    const bagian = nama.split(", ");
    return bagian.length === 2 ? bagian[1] + " " + bagian[0] : nama;
}

function isiTag(wadah, daftar, kosongTeks) {
    if (!wadah) return;
    wadah.innerHTML = "";
    if (!daftar || daftar.length === 0) {
        wadah.textContent = kosongTeks;
        return;
    }
    daftar.forEach(teks => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = teks;
        wadah.appendChild(span);
    });
}

function namaBahasa(kode) {
    const kamus = {
        en: "Inggris (English)",
        id: "Indonesia",
        fr: "Prancis (French)",
        de: "Jerman (German)",
        es: "Spanyol (Spanish)",
        it: "Italia (Italian)",
        nl: "Belanda (Dutch)",
        pt: "Portugis (Portuguese)",
        la: "Latin",
        zh: "Mandarin (Chinese)",
        ja: "Jepang (Japanese)"
    };
    return kamus[kode] || kode.toUpperCase();
}

function aman(teks) {
    return String(teks || '').replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

// 2. Render tampilan utama buku
async function tampilkan(buku) {
    document.title = buku.title + " - MYPERPUS";
    document.getElementById("judul").textContent = buku.title;

    const penulis = (buku.authors || []).map(a => rapikanNama(a.name)).join(", ");
    document.getElementById("penulis").textContent = penulis || "Penulis tidak diketahui";

    const cover = document.getElementById("cover");
    cover.src = buku.formats["image/jpeg"] || "";
    cover.alt = "Cover " + buku.title;
    cover.onerror = () => { cover.style.display = "none"; };

    let sinopsis = "Sinopsis belum tersedia.";
    if (buku.summaries && buku.summaries.length > 0) {
        sinopsis = buku.summaries[0]
            .replace("(This is an automatically generated summary.)", "")
            .trim();
    }
    document.getElementById("sinopsis-teks").textContent = sinopsis;

    const genre = (buku.bookshelves || [])
        .filter(s => s.startsWith("Category: "))
        .map(s => s.replace("Category: ", ""));
    isiTag(document.getElementById("genre-list"), genre, "-");

    isiTag(document.getElementById("subjek-list"), (buku.subjects || []).slice(0, 6), "-");

    document.getElementById("bahasa").textContent = (buku.languages || []).map(namaBahasa).join(", ") || "-";
    document.getElementById("hak-cipta").textContent = buku.copyright === false ? "Domain Publik (Bebas)" : (buku.copyright ? "Dilindungi Hak Cipta" : "Tidak Diketahui");
    document.getElementById("unduhan").textContent = (buku.download_count || 0).toLocaleString("id-ID") + " kali";

    // Tombol baca
    const linkBaca =
        buku.formats["text/html"] ||
        buku.formats["text/html; charset=utf-8"] ||
        buku.formats["application/epub+zip"] ||
        buku.formats["text/plain; charset=utf-8"];

    const btnBaca = document.getElementById("btn-baca");
    if (linkBaca) {
        btnBaca.href = linkBaca;
    } else {
        btnBaca.textContent = "Belum bisa dibaca";
        btnBaca.classList.add("mati");
    }

    // Siapkan interaksi bookmark, history, status, koleksi, dan review
    await inisialisasiInteraksi(buku);

    pesan.classList.add("hidden");
    isi.classList.remove("hidden");
}

// 3. Manajemen Interaksi (Dual Mode: Tamu via localStorage vs User via API)
async function inisialisasiInteraksi(buku) {
    const loggedIn = typeof API !== 'undefined' && API.isLoggedIn();
    const btnBookmark = document.getElementById("btn-bookmark");
    const btnBaca     = document.getElementById("btn-baca");
    const selectStatus= document.getElementById("select-reading-status");
    const userPanel   = document.getElementById("user-actions-panel");

    // A. Catat History saat tombol Baca diklik
    btnBaca.addEventListener("click", async () => {
        const authors = (buku.authors || []).map(a => rapikanNama(a.name)).join(", ");
        if (loggedIn) {
            try {
                await API.post('/api/history', {
                    book_id: buku.id,
                    title: buku.title,
                    cover: buku.formats["image/jpeg"] || "",
                    authors
                }, { silentError: true });
            } catch (e) {}
        } else {
            let daftar = JSON.parse(localStorage.getItem("history")) || [];
            daftar = daftar.filter(h => String(h.id) !== String(buku.id));
            daftar.unshift({
                id: buku.id,
                judul: buku.title,
                cover: buku.formats["image/jpeg"] || "",
                penulis: authors,
                waktu: Date.now()
            });
            localStorage.setItem("history", JSON.stringify(daftar.slice(0, 30)));
        }
    });

    // B. Bookmark Handler
    if (loggedIn) {
        // Ambil data status terikat akun lewat 1 call: GET /api/books/:id/me
        try {
            const res = await API.get(`/api/books/${buku.id}/me`);
            userBookStatus = res.data;

            // Render status bookmark
            updateBookmarkButtonUI(userBookStatus.is_bookmarked);

            // Render status baca
            if (userBookStatus.reading_status) {
                selectStatus.value = userBookStatus.reading_status;
            }

            // Render informasi koleksi
            renderKoleksiInfo(userBookStatus.in_collections);
        } catch (e) {
            console.warn('Gagal memuat status user untuk buku:', e);
        }

        btnBookmark.addEventListener("click", async () => {
            const isCurrentlyBookmarked = btnBookmark.classList.contains("tersimpan");
            try {
                if (isCurrentlyBookmarked) {
                    await API.delete(`/api/bookmarks/${buku.id}`);
                    updateBookmarkButtonUI(false);
                    API.showToast('Bookmark berhasil dihapus', 'info');
                } else {
                    const authors = (buku.authors || []).map(a => rapikanNama(a.name)).join(", ");
                    await API.post('/api/bookmarks', {
                        book_id: buku.id,
                        title: buku.title,
                        cover: buku.formats["image/jpeg"] || "",
                        authors
                    });
                    updateBookmarkButtonUI(true);
                    API.showToast('Ditambahkan ke bookmark', 'success');
                }
            } catch (err) {
                API.showToast(err.message, 'error');
            }
        });

        // C. Status Baca Handler
        selectStatus.addEventListener("change", async () => {
            const val = selectStatus.value;
            try {
                await API.put(`/api/reading-status/${buku.id}`, {
                    status: val,
                    title: buku.title,
                    cover: buku.formats["image/jpeg"] || ""
                });
                API.showToast('Status baca diperbarui', 'success');
            } catch (err) {
                API.showToast(err.message, 'error');
            }
        });

        // D. Setup Modal Koleksi
        setupModalKoleksi(buku);

    } else {
        // Mode Tamu (localStorage)
        if (userPanel) userPanel.style.display = 'none';

        function updateLocalBookmarkUI() {
            const bookmarks = JSON.parse(localStorage.getItem("bookmark")) || [];
            const sudah = bookmarks.some(b => String(b.id) === String(buku.id));
            updateBookmarkButtonUI(sudah);
        }

        btnBookmark.addEventListener("click", () => {
            let bookmarks = JSON.parse(localStorage.getItem("bookmark")) || [];
            const index = bookmarks.findIndex(b => String(b.id) === String(buku.id));
            const authors = (buku.authors || []).map(a => rapikanNama(a.name)).join(", ");

            if (index > -1) {
                bookmarks.splice(index, 1);
            } else {
                bookmarks.push({
                    id: buku.id,
                    judul: buku.title,
                    cover: buku.formats["image/jpeg"] || "",
                    penulis: authors
                });
            }
            localStorage.setItem("bookmark", JSON.stringify(bookmarks));
            updateLocalBookmarkUI();
        });

        updateLocalBookmarkUI();
    }

    // E. Setup Reviews & Rating
    await setupReviewSection(buku, loggedIn);
}

function updateBookmarkButtonUI(isSaved) {
    const btnBookmark = document.getElementById("btn-bookmark");
    if (!btnBookmark) return;
    btnBookmark.textContent = isSaved ? "Hapus dari Bookmark" : "Tambah ke Bookmark";
    btnBookmark.classList.toggle("tersimpan", isSaved);
}

function renderKoleksiInfo(collections) {
    const p = document.getElementById("buku-termuat-koleksi");
    if (!p) return;
    if (collections && collections.length > 0) {
        const names = collections.map(c => `<b>${aman(c.name)}</b>`).join(", ");
        p.innerHTML = `Termuat di rak: ${names}`;
    } else {
        p.textContent = "Belum dimasukkan ke rak/koleksi manapun.";
    }
}

// 4. Modal Koleksi
function setupModalKoleksi(buku) {
    const btnOpen  = document.getElementById("btn-open-collection-modal");
    const modal    = document.getElementById("modal-koleksi");
    const btnClose = document.getElementById("btn-tutup-modal-koleksi");
    const listEl   = document.getElementById("modal-koleksi-list");
    const inputNew = document.getElementById("input-koleksi-baru");
    const btnNew   = document.getElementById("btn-buat-koleksi-baru");

    if (!btnOpen || !modal) return;

    btnOpen.addEventListener("click", async () => {
        modal.classList.remove("hidden");
        await muatDaftarKoleksiDiModal();
    });

    btnClose.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.add("hidden");
    });

    btnNew.addEventListener("click", async () => {
        const name = inputNew.value.trim();
        if (!name) return;
        try {
            await API.post('/api/collections', { name });
            inputNew.value = '';
            API.showToast('Koleksi baru dibuat', 'success');
            await muatDaftarKoleksiDiModal();
        } catch (err) {
            API.showToast(err.message, 'error');
        }
    });

    async function muatDaftarKoleksiDiModal() {
        listEl.innerHTML = '<p style="color:#64748b;">Memuat koleksi...</p>';
        try {
            const res = await API.get('/api/collections');
            const allCollections = res.data || [];

            // Ambil koleksi yang memuat buku ini
            const meRes = await API.get(`/api/books/${buku.id}/me`);
            const checkedIds = (meRes.data.in_collections || []).map(c => c.id);
            renderKoleksiInfo(meRes.data.in_collections);

            if (allCollections.length === 0) {
                listEl.innerHTML = '<p style="font-size:13px; color:#64748b;">Anda belum memiliki koleksi. Buat koleksi pertama di bawah!</p>';
                return;
            }

            listEl.innerHTML = allCollections.map(c => {
                const isChecked = checkedIds.includes(c.id) ? 'checked' : '';
                return `
                    <label style="display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 14px; cursor: pointer;">
                        <input type="checkbox" class="chk-collection" data-id="${c.id}" ${isChecked}>
                        <span>${aman(c.name)}</span>
                    </label>
                `;
            }).join("");

            // Handler centang / tidak centang
            listEl.querySelectorAll('.chk-collection').forEach(chk => {
                chk.addEventListener('change', async () => {
                    const colId = chk.dataset.id;
                    try {
                        if (chk.checked) {
                            await API.post(`/api/collections/${colId}/items`, {
                                book_id: buku.id,
                                title: buku.title,
                                cover: buku.formats["image/jpeg"] || ""
                            });
                            API.showToast('Buku ditambahkan ke koleksi', 'success');
                        } else {
                            await API.delete(`/api/collections/${colId}/items/${buku.id}`);
                            API.showToast('Buku dihapus dari koleksi', 'info');
                        }
                        // Refresh info
                        const fresh = await API.get(`/api/books/${buku.id}/me`);
                        renderKoleksiInfo(fresh.data.in_collections);
                    } catch (err) {
                        chk.checked = !chk.checked; // Revert
                        API.showToast(err.message, 'error');
                    }
                });
            });
        } catch (err) {
            listEl.innerHTML = `<p style="color:#dc2626;">Gagal memuat: ${aman(err.message)}</p>`;
        }
    }
}

// 5. Setup Reviews & Rating
async function setupReviewSection(buku, loggedIn) {
    const formUlasan   = document.getElementById("form-ulasan");
    const guestPrompt  = document.getElementById("review-guest-prompt");
    const listEl       = document.getElementById("review-list");
    const kosongEl     = document.getElementById("review-kosong");
    const statAvg      = document.getElementById("stat-avg-rating");
    const statTotal    = document.getElementById("stat-total-reviews");
    const statStars    = document.getElementById("stat-stars");
    const btnHapus     = document.getElementById("btn-hapus-ulasan");
    const ratingTopEl  = document.getElementById("rating-rata-wrap");

    if (!loggedIn) {
        if (formUlasan) formUlasan.style.display = 'none';
        if (guestPrompt) guestPrompt.classList.remove('hidden');
    } else {
        if (guestPrompt) guestPrompt.style.display = 'none';
    }

    // Load Reviews
    async function muatUlasan() {
        try {
            const res = await fetch(`/api/books/${buku.id}/reviews`);
            if (!res.ok) throw new Error();
            const data = await res.json();

            const avg   = data.stats ? data.stats.average_rating : 0;
            const total = data.stats ? data.stats.total_reviews : 0;

            if (statAvg)   statAvg.textContent = avg.toFixed(1);
            if (statTotal) statTotal.textContent = `Berdasarkan ${total} ulasan`;
            if (statStars) statStars.textContent = '⭐'.repeat(Math.round(avg)) || '☆☆☆☆☆';

            if (ratingTopEl && total > 0) {
                ratingTopEl.innerHTML = `⭐ <strong>${avg.toFixed(1)}</strong> / 5.0 (${total} ulasan)`;
            }

            const reviews = data.data || [];
            if (reviews.length === 0) {
                kosongEl.classList.remove("hidden");
                listEl.innerHTML = "";
            } else {
                kosongEl.classList.add("hidden");
                listEl.innerHTML = reviews.map(r => `
                    <div style="padding: 12px 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <strong>${aman(r.full_name || r.username)}</strong>
                            <span style="color: #f59e0b; font-size: 13px;">${'⭐'.repeat(r.rating)}</span>
                        </div>
                        <p style="font-size: 14px; color: #334155; margin: 4px 0;">${aman(r.content || '(Tidak ada komentar tertulis)')}</p>
                        <small style="font-size: 11px; color: #94a3b8;">${new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</small>
                    </div>
                `).join("");
            }

            // Jika user login, cek ulasan miliknya
            if (loggedIn && userBookStatus && userBookStatus.my_review) {
                const my = userBookStatus.my_review;
                document.getElementById("input-rating").value = my.rating;
                document.getElementById("input-komentar").value = my.content || '';
                document.getElementById("judul-form-ulasan").textContent = "Ubah Ulasan Anda";
                btnHapus.classList.remove("hidden");
                btnHapus.dataset.id = my.id;
            }
        } catch (e) {
            console.warn('Gagal memuat ulasan:', e);
        }
    }

    if (formUlasan && loggedIn) {
        formUlasan.addEventListener("submit", async (e) => {
            e.preventDefault();
            const rating  = document.getElementById("input-rating").value;
            const content = document.getElementById("input-komentar").value;

            try {
                await API.post(`/api/books/${buku.id}/reviews`, {
                    rating: parseInt(rating, 10),
                    content,
                    book_title: buku.title
                });
                API.showToast('Ulasan berhasil dikirim!', 'success');
                // Refresh status user
                const meRes = await API.get(`/api/books/${buku.id}/me`);
                userBookStatus = meRes.data;
                await muatUlasan();
            } catch (err) {
                API.showToast(err.message, 'error');
            }
        });

        btnHapus.addEventListener("click", async () => {
            const revId = btnHapus.dataset.id;
            if (!revId) return;
            if (!confirm('Yakin ingin menghapus ulasan Anda?')) return;
            try {
                await API.delete(`/api/reviews/${revId}`);
                API.showToast('Ulasan Anda telah dihapus', 'info');
                document.getElementById("input-komentar").value = '';
                document.getElementById("input-rating").value = '5';
                document.getElementById("judul-form-ulasan").textContent = "Tulis Ulasan Anda";
                btnHapus.classList.add("hidden");
                if (userBookStatus) userBookStatus.my_review = null;
                await muatUlasan();
            } catch (err) {
                API.showToast(err.message, 'error');
            }
        });
    }

    await muatUlasan();
}

// Jalankan
ambilBuku();
