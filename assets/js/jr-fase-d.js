/* ============================================================
   Jatimulya Residence — Fase D: analitik & animasi
   - Mengirim event ke GTM/GA4 lewat window.dataLayer.
   - Animasi masuk elemen saat masuk viewport (IntersectionObserver).
   Tanpa dependensi eksternal; aman kalau JS dimatikan.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 1. Event analitik ---------- */
  var dataLayer = (window.dataLayer = window.dataLayer || []);

  function track(name, params) {
    var data = { event: name };
    if (params) {
      for (var key in params) {
        if (
          Object.prototype.hasOwnProperty.call(params, key) &&
          params[key] !== "" &&
          params[key] !== null &&
          params[key] !== undefined
        ) {
          data[key] = params[key];
        }
      }
    }
    dataLayer.push(data);
  }

  /* Biar bisa dipanggil manual dari console: jrTrack('event', {...}) */
  window.jrTrack = track;

  function locationOf(el) {
    var section = el.closest ? el.closest("section[id]") : null;
    if (section) return section.id;
    var labelled = el.getAttribute ? el.getAttribute("data-jr-loc") : null;
    if (labelled) return labelled;
    var host = el.closest ? el.closest("[id]") : null;
    if (host && host.id && host.id !== "masthead") return host.id;
    return document.title.split(/[—|]/)[0].trim() || "lain";
  }

  document.addEventListener("click", function (e) {
    var target = e.target;
    if (!target || !target.closest) return;

    /* Tombol simulasi KPR dan pemilih tipe unit */
    var dpBtn = target.closest(".jr-dp-btn");
    if (dpBtn) {
      track("kpr_dp_pilih", { dp: dpBtn.getAttribute("data-dp") || "" });
      return;
    }

    var unitBtn = target.closest(".jr-btn-unit");
    if (unitBtn) {
      track("unit_pilih", { tipe_unit: unitBtn.getAttribute("data-unit") || "" });
      return;
    }

    if (target.closest("#jr-survei-wa")) {
      var tipe = document.getElementById("jr-survei-tipe");
      track("survei_jadwal", { tipe_unit: tipe ? tipe.value : "" });
      return;
    }

    if (target.closest("#jr-kalk-wa")) {
      track("kpr_wa_klik", {});
      return;
    }

    var link = target.closest("a[href]");
    if (!link) return;

    var href = link.getAttribute("href") || "";
    var where = locationOf(link);
    var explicit = link.getAttribute("data-jr-track");

    if (explicit) {
      track(explicit, { link_location: where });
      return;
    }
    if (/wa\.me|api\.whatsapp\.com|whatsapp\.com\/send/i.test(href)) {
      track("wa_klik", { link_location: where });
    } else if (/^tel:/i.test(href)) {
      track("telepon_klik", { link_location: where });
    } else if (/instagram\.com/i.test(href)) {
      track("instagram_klik", { link_location: where });
    } else if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|openstreetmap\.org/i.test(href)) {
      track("peta_klik", { link_location: where });
    } else if (/\/brosur/i.test(href)) {
      track("brosur_klik", { link_location: where });
    }
  });

  /* Form konsultasi: event saat dikirim dan saat sukses.
     jr-fase-b.js memancarkan "jr:form-sukses" setelah Formspree OK. */
  document.addEventListener(
    "submit",
    function (e) {
      if (!e.target || e.target.id !== "jr-contact-form") return;
      var fd = new FormData(e.target);
      track("form_kirim", {
        tipe_unit: fd.get("tipe") || "",
        sumber: "form-kontak",
      });
    },
    true
  );

  document.addEventListener("jr:form-sukses", function () {
    track("form_sukses", { sumber: "form-kontak" });
  });

  /* Slider harga KPR: kirim sekali per jeda, bukan tiap geser */
  var hargaInput = document.getElementById("jr-harga");
  if (hargaInput) {
    var hargaTimer = null;
    hargaInput.addEventListener("input", function () {
      clearTimeout(hargaTimer);
      hargaTimer = setTimeout(function () {
        track("kpr_hitung", { harga: parseInt(hargaInput.value, 10) || 0 });
      }, 900);
    });
  }

  /* Kedalaman gulir: 25/50/75/90 persen, masing-masing sekali */
  var depthMarks = [25, 50, 75, 90];
  var depthSent = {};
  var depthTimer = null;

  function checkDepth() {
    depthTimer = null;
    var doc = document.documentElement;
    var scrollable =
      Math.max(doc.scrollHeight, document.body.scrollHeight) - window.innerHeight;
    if (scrollable <= 0) return;
    var percent = Math.round((window.scrollY / scrollable) * 100);
    depthMarks.forEach(function (mark) {
      if (!depthSent[mark] && percent >= mark) {
        depthSent[mark] = true;
        track("scroll_kedalaman", { persen: mark });
      }
    });
  }

  window.addEventListener(
    "scroll",
    function () {
      if (depthTimer) return;
      depthTimer = setTimeout(checkDepth, 180);
    },
    { passive: true }
  );

  /* ---------- 2. Animasi masuk ---------- */
  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!reduceMotion && "IntersectionObserver" in window) {
    var revealSelector = [
      ".jr-card",
      ".jr-review-card",
      ".jr-video",
      ".jr-faq details",
      ".jr-step-card",
      ".jr-kalkulator",
      ".jr-kontak-grid",
      ".jr-map",
    ].join(",");

    var revealNodes = document.querySelectorAll(revealSelector);

    if (revealNodes.length) {
      var revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("jr-reveal-in");
            revealObserver.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -6% 0px", threshold: 0.05 }
      );

      Array.prototype.forEach.call(revealNodes, function (el) {
        if (!el.offsetParent) return;

        var parent = el.parentElement;
        var key = parent ? Array.prototype.indexOf.call(parent.children, el) : 0;
        var delay = Math.min(key, 3) * 70;
        el.style.setProperty("--jr-delay", delay + "ms");
        el.classList.add("jr-reveal");
        revealObserver.observe(el);
      });

      /* Jaring aman: kalau observer tidak pernah jalan (mis. dicetak),
         tampilkan semua setelah 5 detik. */
      setTimeout(function () {
        Array.prototype.forEach.call(
          document.querySelectorAll(".jr-reveal:not(.jr-reveal-in)"),
          function (el) {
            el.classList.add("jr-reveal-in");
          }
        );
      }, 5000);
    }
  }
})();
