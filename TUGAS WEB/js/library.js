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

// ===== Hapus history =====
const list = document.getElementById("history-list");
const kosong = document.getElementById("history-kosong");

function cekKosong() {
    const adaIsi = list.children.length > 0;
    kosong.classList.toggle("hidden", adaIsi);
}

// hapus satu
list.addEventListener("click", e => {
    if (e.target.classList.contains("btn-hapus")) {
        e.target.closest(".history-item").remove();
        cekKosong();
    }
});

// hapus semua
document.getElementById("hapus-semua").addEventListener("click", () => {
    list.innerHTML = "";
    cekKosong();
});