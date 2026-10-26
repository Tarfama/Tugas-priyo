// ===== Pencarian di navbar dengan saran (dipakai semua halaman) =====
const kolomCari = document.querySelector(".search input");

if (kolomCari) {
    const wadahCari = kolomCari.parentElement;

    // kotak saran dibuat lewat JavaScript, HTML tidak perlu diubah
    const kotakSaran = document.createElement("ul");
    kotakSaran.className = "saran hidden";
    wadahCari.appendChild(kotakSaran);

    let timer = null;          // jeda sebelum mencari
    let permintaanKe = 0;      // supaya hasil lama tidak menimpa hasil baru
    let pilihan = -1;          // saran yang sedang disorot (panah)

    function aman(teks) {
        return String(teks).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    }

    // "Austen, Jane" -> "Jane Austen"
    function rapikanNama(nama) {
        const bagian = nama.split(", ");
        return bagian.length === 2 ? bagian[1] + " " + bagian[0] : nama;
    }

    function tutupSaran() {
        kotakSaran.classList.add("hidden");
        kotakSaran.innerHTML = "";
        pilihan = -1;
    }

    function keHasil(kata) {
        window.location.href = "explore.html?q=" + encodeURIComponent(kata);
    }

    // tampilkan daftar saran
    function tampilkanSaran(kata, buku) {
        if (buku.length === 0) {
            kotakSaran.innerHTML = '<li class="saran-info">Buku tidak ditemukan</li>';
            kotakSaran.classList.remove("hidden");
            return;
        }

        const item = buku.slice(0, 6).map(b => {
            const penulis = b.authors[0] ? rapikanNama(b.authors[0].name) : "Penulis tidak diketahui";
            return `
                <li class="saran-item" data-href="detail.html?id=${b.id}">
                    <span class="saran-judul">${aman(b.title)}</span>
                    <span class="saran-penulis">${aman(penulis)}</span>
                </li>
            `;
        }).join("");

        kotakSaran.innerHTML = item + `
            <li class="saran-item saran-semua" data-kata="${aman(kata)}">
                Lihat semua hasil untuk "${aman(kata)}"
            </li>
        `;
        kotakSaran.classList.remove("hidden");
        pilihan = -1;
    }

    // cari ke API
    async function cariSaran(kata) {
        const ini = ++permintaanKe;
        try {
            const res = await fetch(
                "https://gutendex.com/books?languages=en&search=" + encodeURIComponent(kata)
            );
            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = await res.json();

            // abaikan kalau sudah ada pencarian yang lebih baru
            if (ini !== permintaanKe) return;
            tampilkanSaran(kata, data.results);
        } catch (err) {
            if (ini !== permintaanKe) return;
            kotakSaran.innerHTML = '<li class="saran-info">Gagal memuat saran</li>';
            kotakSaran.classList.remove("hidden");
        }
    }

    // saat mengetik
    kolomCari.addEventListener("input", () => {
        const kata = kolomCari.value.trim();
        clearTimeout(timer);

        if (kata.length < 2) {
            permintaanKe++;
            tutupSaran();
            return;
        }

        // tunggu 300 ms setelah berhenti mengetik, supaya API tidak dibanjiri
                // tampilkan "Mencari..." langsung, jawaban API menyusul
        kotakSaran.innerHTML = '<li class="saran-info">Mencari...</li>';
        kotakSaran.classList.remove("hidden");

        // tunggu 300 ms setelah berhenti mengetik, supaya API tidak dibanjiri
        timer = setTimeout(() => cariSaran(kata), 300);
    });

    // klik saran
    kotakSaran.addEventListener("click", e => {
        const item = e.target.closest(".saran-item");
        if (!item) return;

        if (item.dataset.href) {
            window.location.href = item.dataset.href;
        } else if (item.dataset.kata) {
            keHasil(item.dataset.kata);
        }
    });

    // sorot saran dengan panah
    function sorot() {
        const semua = kotakSaran.querySelectorAll(".saran-item");
        semua.forEach((el, i) => el.classList.toggle("sorot", i === pilihan));
    }

    kolomCari.addEventListener("keydown", e => {
        const semua = kotakSaran.querySelectorAll(".saran-item");

        if (e.key === "ArrowDown" && semua.length > 0) {
            e.preventDefault();
            pilihan = (pilihan + 1) % semua.length;
            sorot();
        } else if (e.key === "ArrowUp" && semua.length > 0) {
            e.preventDefault();
            pilihan = (pilihan - 1 + semua.length) % semua.length;
            sorot();
        } else if (e.key === "Escape") {
            tutupSaran();
        } else if (e.key === "Enter") {
            // kalau ada saran yang disorot, buka saran itu
            if (pilihan >= 0 && semua[pilihan]) {
                semua[pilihan].click();
                return;
            }
            // kalau tidak, ke halaman hasil di Explore
            const kata = kolomCari.value.trim();
            if (kata) keHasil(kata);
        }
    });

    // klik di luar kotak pencarian -> saran tertutup
    document.addEventListener("click", e => {
        if (!wadahCari.contains(e.target)) {
            tutupSaran();
        }
    });

    // isi kolom dengan kata yang sedang dicari (di halaman hasil)
    const kataSekarang = new URLSearchParams(window.location.search).get("q");
    if (kataSekarang) {
        kolomCari.value = kataSekarang;
    }
}