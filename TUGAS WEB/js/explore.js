// ===== Data contoh (nanti diganti data dari API) =====
const books = [
    { id: 1, judul: "Man who looks back", cover: "novel1.jpg", genre: "Drama",    tanggal: "2026-10-01" },
    { id: 2, judul: "Judul novel dua",    cover: "novel2.jpg", genre: "Fantasi",  tanggal: "2026-09-15" },
    { id: 3, judul: "Judul novel tiga",   cover: "novel3.jpg", genre: "Romantis", tanggal: "2026-08-20" },
    { id: 4, judul: "Judul novel empat",  cover: "novel4.jpg", genre: "Drama",    tanggal: "2026-07-05" },
    { id: 5, judul: "Judul novel lima",   cover: "novel5.jpg", genre: "Fantasi",  tanggal: "2026-10-10" },
    { id: 6, judul: "Judul novel enam",   cover: "novel6.jpg", genre: "Misteri",  tanggal: "2026-06-30" }
];

// ===== Elemen halaman =====
const genreList = document.getElementById("genre-list");
const exploreList = document.getElementById("explore-list");
const kosong = document.getElementById("explore-kosong");
const urutkan = document.getElementById("urutkan");

let genreAktif = "Semua";

// ===== 1. Buat tombol genre dari data buku =====
function buatGenre() {
    // ambil genre unik dari semua buku
    const semuaGenre = ["Semua", ...new Set(books.map(b => b.genre))];

    genreList.innerHTML = "";
    semuaGenre.forEach(g => {
        const btn = document.createElement("button");
        btn.className = "genre-btn" + (g === genreAktif ? " aktif" : "");
        btn.textContent = g;
        btn.addEventListener("click", () => {
            genreAktif = g;
            buatGenre();     // perbarui tombol yang aktif
            tampilkan();     // perbarui daftar buku
        });
        genreList.appendChild(btn);
    });
}

// ===== 2. Tampilkan buku sesuai genre dan urutan =====
function tampilkan() {
    // filter genre
    let hasil = books.filter(b => genreAktif === "Semua" || b.genre === genreAktif);

    // urutkan
    const urutan = urutkan.value;
    if (urutan === "terbaru") {
        hasil.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    } else if (urutan === "az") {
        hasil.sort((a, b) => a.judul.localeCompare(b.judul));
    } else if (urutan === "za") {
        hasil.sort((a, b) => b.judul.localeCompare(a.judul));
    }

    // buat kartu
    exploreList.innerHTML = hasil.map(b => `
        <a href="detail.html?id=${b.id}" class="book">
            <img src="${b.cover}" alt="${b.judul}">
            <p>${b.judul}</p>
            <span>${b.genre}</span>
        </a>
    `).join("");

    kosong.classList.toggle("hidden", hasil.length > 0);
}

// ===== Jalankan =====
urutkan.addEventListener("change", tampilkan);
buatGenre();
tampilkan();