// ===== Elemen halaman =====
const genreList = document.getElementById("genre-list");
const exploreList = document.getElementById("explore-list");
const kosong = document.getElementById("explore-kosong");
const urutkan = document.getElementById("urutkan");

let books = [];            // diisi dari API
let genreAktif = "Semua";
const JUMLAH_AWAL = 12;
let jumlahTampil = JUMLAH_AWAL;
const btnLagi = document.getElementById("btn-lagi");
// kata pencarian dari alamat: explore.html?q=austen
const kataCari = new URLSearchParams(window.location.search).get("q");
if (kataCari) {
    document.querySelector(".explore h1").textContent = "Hasil pencarian: " + kataCari;
}

// ===== Ambil data dari API =====
async function ambilBuku() {
    kosong.textContent = "Memuat buku...";
    kosong.classList.remove("hidden");

    try {
        let url = "https://gutendex.com/books?languages=en";
        if (kataCari) {
            url += "&search=" + encodeURIComponent(kataCari);
        }

        const res = await fetch(url);

        if (!res.ok) {
            throw new Error("HTTP " + res.status);
        }

        const data = await res.json();

        books = data.results.map(b => ({
            id: b.id,
            judul: b.title,
            cover: b.formats["image/jpeg"] || "",
            genres: ambilGenre(b),
            populer: b.download_count
        }));

        kosong.textContent = kataCari
            ? "Buku tidak ditemukan."
            : "Belum ada buku di genre ini.";

        buatGenre();
        tampilkan();
    } catch (err) {
        kosong.textContent = "Gagal memuat buku: " + err.message;
    }
}

// "Category: Romance" -> "Romance"
function ambilGenre(b) {
    const daftar = b.bookshelves
        .filter(s => s.startsWith("Category: "))
        .map(s => s.replace("Category: ", ""))
        .filter(g => g !== "Novels");
    return daftar.length > 0 ? daftar : ["Lainnya"];
}

function aman(teks) {
    return String(teks).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

// ===== 1. Tombol genre =====
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

// ===== 2. Tampilkan buku =====
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
            <img src="${aman(b.cover)}" alt="${aman(b.judul)}">
            <p>${aman(b.judul)}</p>
            <span>${aman(b.genres.slice(0, 2).join(", "))}</span>
        </a>
    `).join("");

    kosong.classList.toggle("hidden", hasil.length > 0);
    btnLagi.classList.toggle("hidden", hasil.length <= jumlahTampil);
}

// ===== Jalankan =====
urutkan.addEventListener("change", () => {
    jumlahTampil = JUMLAH_AWAL;
    tampilkan();
});

btnLagi.addEventListener("click", () => {
    jumlahTampil += 12;
    tampilkan();
});

ambilBuku();