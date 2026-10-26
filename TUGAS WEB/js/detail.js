// ===== Elemen halaman =====
const pesan = document.getElementById("pesan");
const isi = document.getElementById("isi");

// ===== 1. Ambil id dari URL: detail.html?id=1342 =====
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

// ===== 2. Ambil data buku dari API =====
async function ambilBuku() {
    if (!id) {
        pesan.textContent = "Buku tidak dipilih. Pilih buku dari halaman Explore.";
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
        tampilkan(buku);
    } catch (err) {
        pesan.textContent = "Gagal memuat buku. Coba refresh halaman.";
    }
}

// ===== Fungsi bantu =====

// "Austen, Jane" -> "Jane Austen"
function rapikanNama(nama) {
    const bagian = nama.split(", ");
    return bagian.length === 2 ? bagian[1] + " " + bagian[0] : nama;
}

// buat label kecil (tag) di dalam sebuah wadah
function isiTag(wadah, daftar, kosongTeks) {
    wadah.innerHTML = "";
    if (daftar.length === 0) {
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

// ===== 3. Isi halaman dengan data buku =====
function tampilkan(buku) {
    // judul dan penulis
    document.title = buku.title + " - Myperpus";
    document.getElementById("judul").textContent = buku.title;

    const penulis = buku.authors.map(a => rapikanNama(a.name)).join(", ");
    document.getElementById("penulis").textContent = penulis || "Penulis tidak diketahui";

    // cover
    const cover = document.getElementById("cover");
    cover.src = buku.formats["image/jpeg"] || "";
    cover.alt = "Cover " + buku.title;
    cover.onerror = () => { cover.style.display = "none"; };

    // sinopsis (dari summaries, kalau ada)
    let sinopsis = "Sinopsis belum tersedia.";
    if (buku.summaries && buku.summaries.length > 0) {
        sinopsis = buku.summaries[0]
            .replace("(This is an automatically generated summary.)", "")
            .trim();
    }
    document.getElementById("sinopsis-teks").textContent = sinopsis;

    // genre dari bookshelves "Category: ..."
    const genre = buku.bookshelves
        .filter(s => s.startsWith("Category: "))
        .map(s => s.replace("Category: ", ""));
    isiTag(document.getElementById("genre-list"), genre, "-");

    // subjek (maksimal 6)
    isiTag(document.getElementById("subjek-list"), buku.subjects.slice(0, 6), "-");

    // jumlah unduhan
    document.getElementById("unduhan").textContent =
        buku.download_count.toLocaleString("id-ID") + " kali";

    // tombol baca: pilih format yang tersedia
    const linkBaca =
        buku.formats["text/html"] ||
        buku.formats["text/html; charset=utf-8"] ||
        buku.formats["application/epub+zip"] ||
        buku.formats["text/plain; charset=utf-8"];

    const btn = document.getElementById("btn-baca");
    if (linkBaca) {
        btn.href = linkBaca;
    } else {
        btn.textContent = "Belum bisa dibaca";
        btn.classList.add("mati");
    }
    //menyimpan buku
    siapkanBookmark(buku);
    siapkanHistory(buku);

    // tampilkan isi, sembunyikan pesan
    pesan.classList.add("hidden");
    isi.classList.remove("hidden");

    // ===== History (dicatat saat tombol Baca Novel diklik) =====
    function siapkanHistory(buku) {
        document.getElementById("btn-baca").addEventListener("click", () => {
            let daftar = JSON.parse(localStorage.getItem("history")) || [];

            // buang catatan lama buku yang sama, supaya tidak dobel
            daftar = daftar.filter(h => String(h.id) !== String(buku.id));

            // taruh di paling atas (yang terbaru)
            daftar.unshift({
                id: buku.id,
                judul: buku.title,
                cover: buku.formats["image/jpeg"] || "",
                waktu: Date.now()
            });

            // simpan maksimal 30 buku
            daftar = daftar.slice(0, 30);

            localStorage.setItem("history", JSON.stringify(daftar));
        });
    }

    // ===== Bookmark (disimpan di localStorage) =====
    function ambilBookmark() {
        return JSON.parse(localStorage.getItem("bookmark")) || [];
    }

    function siapkanBookmark(buku) {
        const btn = document.getElementById("btn-bookmark");

        function perbaruiTombol() {
            const sudah = ambilBookmark().some(b => String(b.id) === String(buku.id));
            btn.textContent = sudah ? "Hapus dari Bookmark" : "Tambah ke Bookmark";
            btn.classList.toggle("tersimpan", sudah);
        }

        btn.addEventListener("click", () => {
            let daftar = ambilBookmark();
            const sudah = daftar.some(b => String(b.id) === String(buku.id));

            if (sudah) {
                daftar = daftar.filter(b => String(b.id) !== String(buku.id));
            } else {
                daftar.push({
                    id: buku.id,
                    judul: buku.title,
                    cover: buku.formats["image/jpeg"] || ""
                });
            }

            localStorage.setItem("bookmark", JSON.stringify(daftar));
            perbaruiTombol();
        });

        perbaruiTombol();
    }

}

// ===== Jalankan =====
ambilBuku();
