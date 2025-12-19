(function () {
  const SUPPORT_WA = "https://wa.me/6288291988913";

  const toast = document.getElementById("toast");
  const toastText = document.getElementById("toastText");
  const toastSupport = document.getElementById("toastSupport");
  const toastClose = document.getElementById("toastClose");
  const mtErrorEl = document.getElementById("mtError");
  const form = document.getElementById("loginForm");

  const KEY = "fib_login_guard_final_v1";
  const MAX_TRIES = 5;
  const LOCK_MS = 60 * 60 * 1000; // 1 jam

  function now() { return Date.now(); }

  function readState() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
    catch { return {}; }
  }
  function writeState(s) { localStorage.setItem(KEY, JSON.stringify(s)); }

  function showToast(msg, type) {
    if (!toast || !toastText) return;
    toastText.textContent = msg;
    toast.className = "toast " + (type || "");
    toast.style.display = "block";
    if (toastSupport) toastSupport.href = SUPPORT_WA;
  }

  function hideToast() {
    if (!toast) return;
    toast.style.display = "none";
  }

  if (toastClose) toastClose.addEventListener("click", hideToast);

  function normalizeError(raw) {
    const e = String(raw || "").toLowerCase();

    // Salah voucher / typo / invalid
    if (
      e.includes("invalid") ||
      e.includes("incorrect") ||
      e.includes("wrong") ||
      e.includes("username or password") ||
      e.includes("no valid") ||
      e.includes("not found") ||
      e.includes("authentication failed")
    ) {
      return { text: "Salah kode voucher. Coba cek lagi lalu login.", type: "danger" };
    }

    // Voucher sedang dipakai / hanya 1 HP / already logged in
    if (
      e.includes("already") ||
      e.includes("logged") ||
      e.includes("session") ||
      e.includes("active") ||
      e.includes("simultaneous") ||
      e.includes("shared") ||
      e.includes("limit reached")
    ) {
      return {
        text: "Kode voucher hanya bisa dipakai 1 hape / sedang aktif. Matikan WiFi di perangkat sebelumnya lalu coba lagi.",
        type: "warn"
      };
    }

    // Default error
    if (e.trim()) {
      return { text: "Gagal login. Cek kode voucher atau hubungi support.", type: "danger" };
    }
    return null;
  }

  function guardCheck() {
    const s = readState();
    const lockedUntil = Number(s.lockedUntil || 0);

    if (lockedUntil && now() < lockedUntil) {
      const mins = Math.ceil((lockedUntil - now()) / 60000);
      showToast(Terlalu banyak percobaan. Ditangguhkan. Coba lagi sekitar ${mins} menit., "warn");

      // Auto arahkan ke WA Support setelah 3 detik
      setTimeout(() => {
        const txt = encodeURIComponent("Halo Support, saya ditangguhkan saat login hotspot. Mohon bantu ya.");
        window.location.href = SUPPORT_WA + "?text=" + txt;
      }, 3000);

      return false;
    }
    return true;
  }

  function recordFail() {
    const s = readState();
    const tries = Number(s.tries || 0) + 1;

    if (tries >= MAX_TRIES) {
      const lockedUntil = now() + LOCK_MS;
      writeState({ tries: 0, lockedUntil });

      showToast("Terlalu banyak percobaan (5x). Ditangguhkan 1 jam. Menghubungkan ke Support...", "warn");

      setTimeout(() => {
        const txt = encodeURIComponent("Halo Support, saya gagal login 5x (kode voucher). Mohon bantu cek ya.");
        window.location.href = SUPPORT_WA + "?text=" + txt;
      }, 2500);

      return;
    }

    writeState({ tries, lockedUntil: 0 });
  }

  // Saat load: cek error Mikrotik lalu tampilkan popup ramah
  const rawErr = mtErrorEl ? mtErrorEl.textContent : "";
  const mapped = normalizeError(rawErr);

  if (mapped) {
    showToast(mapped.text, mapped.type);
    recordFail();
  } else {
    // kalau tak ada error, cek apakah sedang terkunci
    guardCheck();
  }

  // Saat submit: kalau lock, stop
  if (form) {
    form.addEventListener("submit", function (e) {
      if (!guardCheck()) {
        e.preventDefault();
        return;
      }
      // kalau login gagal, halaman reload dengan $(error) dan dihitung recordFail() saat load.
    });
  }
})();