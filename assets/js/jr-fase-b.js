/* ============================================================
   Jatimulya Residence — Fase B: Konversi (JS)
   Form 2 langkah (Formspree), kalkulator DP, pemilih tipe,
   jadwal survei, sticky CTA mobile.
   ============================================================ */
(function () {
  "use strict";

  var FORM_ENDPOINT = "https://formspree.io/f/mvkareqn";
  var WA_NUMBER = "6278777502532";

  /* ---------- 2-step contact form ---------- */
  var form = document.getElementById("jr-contact-form");
  if (form) {
    var steps = form.querySelectorAll(".jr-form-step");
    var progress = document.getElementById("jr-progress-fill");
    var status = document.getElementById("jr-form-status");
    var submitBtn = form.querySelector(".jr-btn-submit");

    function showStep(n) {
      steps.forEach(function (s) {
        s.classList.toggle("jr-form-step-active", s.dataset.step === String(n));
      });
      if (progress) {
        progress.style.width = n === 1 ? "50%" : "100%";
      }
    }

    form.querySelectorAll(".jr-btn-next").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showStep(2);
      });
    });
    form.querySelectorAll(".jr-btn-prev").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showStep(1);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      submitBtn.disabled = true;
      submitBtn.textContent = "Mengirim...";
      status.style.display = "none";

      fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: fd,
      })
        .then(function (res) {
          if (res.ok) {
            status.className = "jr-form-status ok";
            status.textContent =
              "Terima kasih! Pesan kamu telah dikirim. Kami akan segera menghubungi kamu via WhatsApp.";
            status.style.display = "block";
            form.reset();
            showStep(1);
            document.dispatchEvent(new CustomEvent("jr:form-sukses"));
          } else {
            throw new Error("gagal");
          }
        })
        .catch(function () {
          status.className = "jr-form-status err";
          status.textContent =
            "Gagal mengirim. Coba lagi atau chat langsung via WhatsApp di bawah.";
          status.style.display = "block";
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = "Kirim Konsultasi";
        });
    });
  }

  /* ---------- Kalkulator DP (tenor 12 bulan, DP default 10%) ---------- */
  var hargaInp = document.getElementById("jr-harga");
  if (hargaInp) {
    var hargaVal = document.getElementById("jr-harga-val");
    var dpBtns = document.querySelectorAll(".jr-dp-btn");
    var dpVal = document.getElementById("jr-dp-val");
    var cicilanVal = document.getElementById("jr-cicilan");
    var sisaVal = document.getElementById("jr-sisa");
    var kalkWa = document.getElementById("jr-kalk-wa");

    var harga = 800000000;
    var dpPct = 10;

    function fmt(n) {
      return Math.round(n).toLocaleString("id-ID");
    }

    function update() {
      var dp = (harga * dpPct) / 100;
      var sisa = harga - dp;
      var cic = sisa / 12;
      hargaVal.textContent = "Rp " + fmt(harga);
      dpVal.textContent = "DP " + dpPct + "%: Rp " + fmt(dp);
      cicilanVal.textContent = "Rp " + fmt(cic);
      sisaVal.textContent = "Rp " + fmt(sisa);
    }

    hargaInp.addEventListener("input", function () {
      harga = parseInt(this.value, 10) || 800000000;
      update();
    });

    dpBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        dpBtns.forEach(function (x) {
          x.classList.remove("active");
        });
        b.classList.add("active");
        dpPct = parseInt(b.dataset.dp, 10) || 10;
        update();
      });
    });

    update();

    if (kalkWa) {
      kalkWa.addEventListener("click", function () {
        var dp = (harga * dpPct) / 100;
        var sisa = harga - dp;
        var cic = sisa / 12;
        var txt =
          "Halo min, saya mau simulasi DP Jatimulya Residence:\n" +
          "Harga: Rp " +
          fmt(harga) +
          "\n" +
          "DP " +
          dpPct +
          "%: Rp " +
          fmt(dp) +
          "\n" +
          "Cicilan/bln (12 bln): Rp " +
          fmt(cic) +
          "\n" +
          "Bisa info lebih lanjut?";
        location.href = "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(txt);
      });
    }
  }

  /* ---------- Pemilih tipe unit -> WhatsApp ---------- */
  document.querySelectorAll(".jr-btn-unit").forEach(function (b) {
    b.addEventListener("click", function () {
      var unit = b.dataset.unit;
      var spec = unit === "A" ? "LT 60 m² / LB 58 m², 2KT 2KM" : "LT 75 m² / LB 72 m², 3KT (2 atas, 1 bawah), 2KM";
      var txt =
        "Halo min, saya tertarik Jatimulya Residence Tipe " +
        unit +
        " (" +
        spec +
        "), bisa info harga & jadwal survei?";
      location.href = "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(txt);
    });
  });

  /* ---------- Jadwal survei lokasi -> WhatsApp ---------- */
  var surveiBtn = document.getElementById("jr-survei-wa");
  if (surveiBtn) {
    surveiBtn.addEventListener("click", function () {
      var tgl = document.getElementById("jr-survei-date").value;
      var tipe = document.getElementById("jr-survei-tipe").value;
      var txt =
        "Halo min, saya mau jadwalkan survei lokasi Jatimulya Residence:\n" +
        "Tanggal: " +
        (tgl || "belum diisi") +
        "\n" +
        "Tipe: " +
        tipe +
        "\n" +
        "Bisa konfirmasi jam?";
      location.href = "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(txt);
    });
  }

  /* ---------- Sticky CTA mobile: hilang saat di hero (atas halaman) ---------- */
  var sticky = document.getElementById("jr-sticky-cta");
  if (sticky) {
    var stickyPending = false;

    function applySticky() {
      stickyPending = false;
      var show = window.innerWidth < 783 && window.scrollY > 260;
      sticky.style.display = show ? "flex" : "none";
    }

    /* Terapkan langsung, lalu ulangi di frame berikutnya untuk berjaga-jaga
       kalau event scroll datang sebelum posisi terbaru diterapkan. */
    function toggleSticky() {
      applySticky();
      if (stickyPending || typeof window.requestAnimationFrame !== "function") return;
      stickyPending = true;
      window.requestAnimationFrame(applySticky);
    }

    window.addEventListener("scroll", toggleSticky, { passive: true });
    window.addEventListener("resize", toggleSticky);
    toggleSticky();
  }
})();
