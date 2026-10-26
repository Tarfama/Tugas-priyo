// Tiga daftar di halaman Home
const listPopuler = document.getElementById("list-populer");
const listAdventure = document.getElementById("list-adventure");
const listRomance = document.getElementById("list-romance");

// supaya judul yang berisi tanda kutip tidak merusak HTML
function aman(teks) {
    return String(teks).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

// buat 4 kartu buku di dalam sebuah wadah
function isiDaftar(wadah, buku) {
    wadah.innerHTML = buku.slice(0, 4).map(b => `
        <a href="detail.html?id=${b.id}" class="book">
            <img src="${aman(b.formats["image/jpeg"] || "")}" alt="${aman(b.title)}">
            <p>${aman(b.title)}</p>
        </a>
    `).join("");
}

async function ambil(url, wadah) {
    wadah.textContent = "Memuat...";
    try {
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error("HTTP " + res.status);
        }

        const data = await res.json();
        isiDaftar(wadah, data.results);
    } catch (err) {
        wadah.textContent = "Gagal memuat buku: " + err.message;
        console.error(err);
    }
}

// dijalankan satu per satu supaya server tidak kewalahan
async function muat() {
    await ambil("https://gutendex.com/books?languages=en", listPopuler);
    await ambil("https://gutendex.com/books?languages=en&topic=adventure", listAdventure);
    await ambil("https://gutendex.com/books?languages=en&topic=romance", listRomance);
}
muat();