// ============================================================
// js/explore.js — Jelajah Buku (Filter Hidden Books)
// ============================================================

const genreList   = document.getElementById("genre-list");
const exploreList = document.getElementById("explore-list");
const kosong      = document.getElementById("explore-kosong");
const urutkan     = document.getElementById("urutkan");
const btnLagi     = document.getElementById("btn-lagi");

let books = [];
let genreAktif = "Semua";
const JUMLAH_AWAL = 12;
let jumlahTampil = JUMLAH_AWAL;
let daftarBukuTersembunyi = [];

const kataCari = new URLSearchParams(window.location.search).get("q");
if (kataCari) {
    const titleEl = document.querySelector(".explore h1");
    if (titleEl) titleEl.textContent = "Hasil pencarian: " + kataCari;
}

async function muatDaftarTersembunyi() {
    try {
        const res = await fetch('/api/catalog/hidden');
        if (res.ok) {
            const data = await res.json();
            daftarBukuTersembunyi = data.data || [];
        }
    } catch (e) {}
}

async function ambilBuku() {
    kosong.textContent = "Memuat buku...";
    kosong.classList.remove("hidden");

    await muatDaftarTersembunyi();

    try {
        let url = "https://gutendex.com/books?languages=en";
        if (kataCari) {
            url += "&search=" + encodeURIComponent(kataCari);
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();

        // Filter buku yang disembunyikan admin
        const rawResults = (data.results || []).filter(b => !daftarBukuTersembunyi.includes(b.id));

        books = rawResults.map(b => ({
            id: b.id,
            judul: b.title,
            cover: b.formats["image/jpeg"] || "",
            genres: ambilGenre(b),
            populer: b.download_count
        }));

        kosong.textContent = kataCari ? "Buku tidak ditemukan." : "Belum ada buku di genre ini.";
        buatGenre();
        tampilkan();
    } catch (err) {
        kosong.textContent = "Gagal memuat buku: " + err.message;
    }
}

function ambilGenre(b) {
    const daftar = (b.bookshelves || [])
        .filter(s => s.startsWith("Category: "))
        .map(s => s.replace("Category: ", ""))
        .filter(g => g !== "Novels");
    return daftar.length > 0 ? daftar : ["Lainnya"];
}

function aman(teks) {
    return String(teks || '').replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function buatGenre() {
    const hitung = {};
    books.forEach(b => b.genres.forEach(g => {
        hitung[g] = (hitung[g] || 0) + 1;
    }));

    const teratas = Object.keys(hitung)
        .sort((a, b) => hitung[b] - hitung[a])
        .slice(0, 8);

    const semuaGenre = ["Semua", ...teratas];

    genreList.innerHTML = "";
    semuaGenre.forEach(g => {
        const btn = document.createElement("button");
        btn.className = "genre-btn" + (g === genreAktif ? " aktif" : "");
        btn.textContent = g;
        btn.addEventListener("click", () => {
            genreAktif = g;
            jumlahTampil = JUMLAH_AWAL;
            buatGenre();
            tampilkan();
        });
        genreList.appendChild(btn);
    });
}

function tampilkan() {
    let hasil = books.filter(b => genreAktif === "Semua" || b.genres.includes(genreAktif));

    const urutan = urutkan.value;
    if (urutan === "popular") {
        hasil.sort((a, b) => b.populer - a.populer);
    } else if (urutan === "az") {
        hasil.sort((a, b) => a.judul.localeCompare(b.judul));
    }

    const tampil = hasil.slice(0, jumlahTampil);

    exploreList.innerHTML = tampil.map(b => `
        <a href="detail.html?id=${b.id}" class="book">
            <img src="${aman(b.cover)}" alt="${aman(b.judul)}" onerror="this.src=''; this.style.background='#cbd5e1';">
            <p>${aman(b.judul)}</p>
            <span>${aman(b.genres.slice(0, 2).join(", "))}</span>
        </a>
    `).join("");

    kosong.classList.toggle("hidden", hasil.length > 0);
    if (btnLagi) btnLagi.classList.toggle("hidden", hasil.length <= jumlahTampil);
}

if (urutkan) {
    urutkan.addEventListener("change", () => {
        jumlahTampil = JUMLAH_AWAL;
        tampilkan();
    });
}

if (btnLagi) {
    btnLagi.addEventListener("click", () => {
        jumlahTampil += 12;
        tampilkan();
    });
}

ambilBuku();
