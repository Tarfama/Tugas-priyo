// ===== Ganti tab =====
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("aktif"));
        panels.forEach(p => p.classList.add("hidden"));

        tab.classList.add("aktif");
        document.getElementById(tab.dataset.target).classList.remove("hidden");
    });
});

// ===== Fungsi bantu =====
function aman(teks) {
    return String(teks).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function ambilData(kunci) {
    return JSON.parse(localStorage.getItem(kunci)) || [];
}

// ===== Bookmark =====
const bookmarkList = document.getElementById("bookmark-list");
const bookmarkKosong = document.getElementById("bookmark-kosong");

function tampilkanBookmark() {
    const daftar = ambilData("bookmark");

    bookmarkList.innerHTML = daftar.map(b => `
        <a href="detail.html?id=${b.id}" class="book">
            <img src="${aman(b.cover)}" alt="${aman(b.judul)}">
            <p>${aman(b.judul)}</p>
        </a>
    `).join("");

    bookmarkKosong.classList.toggle("hidden", daftar.length > 0);
}

// ===== History =====
const historyList = document.getElementById("history-list");
const historyKosong = document.getElementById("history-kosong");
const tombolHapusSemua = document.getElementById("hapus-semua");

function formatTanggal(waktu) {
    return new Date(waktu).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function tampilkanHistory() {
    const daftar = ambilData("history");

    historyList.innerHTML = daftar.map(h => `
        <li class="history-item">
            <img src="${aman(h.cover)}" alt="${aman(h.judul)}">
            <div class="history-info">
                <h3><a href="detail.html?id=${h.id}">${aman(h.judul)}</a></h3>
                <p>Dibaca: ${formatTanggal(h.waktu)}</p>
            </div>
            <button class="btn-hapus" data-id="${h.id}">Hapus</button>
        </li>
    `).join("");

    historyKosong.classList.toggle("hidden", daftar.length > 0);
    tombolHapusSemua.classList.toggle("hidden", daftar.length === 0);
}

// hapus satu
historyList.addEventListener("click", e => {
    if (e.target.classList.contains("btn-hapus")) {
        const id = e.target.dataset.id;
        const daftar = ambilData("history").filter(h => String(h.id) !== String(id));
        localStorage.setItem("history", JSON.stringify(daftar));
        tampilkanHistory();
    }
});

// hapus semua
tombolHapusSemua.addEventListener("click", () => {
    localStorage.removeItem("history");
    tampilkanHistory();
});

// ===== Jalankan =====
tampilkanBookmark();
tampilkanHistory();