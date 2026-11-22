/* ============================================================
   Jatimulya Residence — pencarian header
   Pencarian statis: daftar halaman/section populer disaring
   di browser, tanpa server.
   ============================================================ */
(function () {
  "use strict";

  var PAGES = [
    {
      t: "Beranda",
      d: "Rumah cluster 2 lantai di Tambun Selatan, Bekasi.",
      u: "/",
      k: "beranda home cluster jatimulya residence rumah bekasi tambun selatan",
    },
    {
      t: "Tipe A & Tipe B",
      d: "LT 60/LB 58 (2 kamar tidur) dan LT 75/LB 72 (3 kamar tidur: 2 atas, 1 bawah), 2 kamar mandi.",
      u: "/#tipe-unit",
      k: "tipe a tipe b unit denah lt lb lantai kamar tidur kamar mandi 60 58 75 72",
    },
    {
      t: "Harga rumah Rp700–900 juta",
      d: "Rentang harga unit dan penyesuaian desain.",
      u: "/#tipe-unit",
      k: "harga biaya rupiah juta 700 800 900 budget murah",
    },
    {
      t: "Simulasi DP & cicilan",
      d: "Kalkulator DP dan cicilan KPR dengan tenor 12 bulan.",
      u: "/#jr-kalkulator",
      k: "simulasi dp cicilan kalkulator kpr tenor 12 bulan hitung angsuran",
    },
    {
      t: "Cara pesan rumah",
      d: "Empat langkah dari konsultasi sampai serah terima.",
      u: "/#cara-pesan",
      k: "cara pesan beli booking langkah konsultasi survei akad serah terima",
    },
    {
      t: "Portofolio Grand Wisma Residence",
      d: "Video dokumentasi proyek yang sudah selesai.",
      u: "/#portofolio",
      k: "portofolio video grand wisma residence proyek dokumentasi gwr",
    },
    {
      t: "Ulasan Google Maps",
      d: "Baca ulasan pelanggan apa adanya.",
      u: "/#ulasan",
      k: "ulasan review testimoni google maps rating bintang",
    },
    {
      t: "Pertanyaan yang sering ditanyakan",
      d: "FAQ soal indent, desain, pembayaran, dan KPR.",
      u: "/#faq",
      k: "faq pertanyaan sering ditanyakan indent desain pembayaran kpr sertifikat",
    },
    {
      t: "Kontak & konsultasi",
      d: "Form konsultasi, WhatsApp, dan alamat kantor pemasaran.",
      u: "/kontak/",
      k: "kontak hubungi whatsapp wa telepon kantor konsultasi form",
    },
    {
      t: "Lokasi & peta",
      d: "Jl. Waru Raya No.7, Jatimulya, Tambun Selatan.",
      u: "/kontak/#jr-kontak",
      k: "lokasi alamat peta maps waru raya jatimulya tambun selatan bekasi 17510",
    },
    {
      t: "Layanan",
      d: "Konsultasi, desain, KPR, dan pendampingan akad.",
      u: "/layanan/",
      k: "layanan konsultasi desain finishing kpr akad dokumen pendampingan",
    },
    {
      t: "Tentang Kami",
      d: "Latar belakang developer dan proyek sebelumnya.",
      u: "/tentang-kami/",
      k: "tentang kami profil developer pengalaman grand wisma",
    },
    {
      t: "Kenapa memilih Jatimulya Residence",
      d: "Pengalaman, kepercayaan, harga, dan desain fleksibel.",
      u: "/tentang-kami/#kenapa-memilih",
      k: "kenapa memilih alasan kelebihan pengalaman kepercayaan harga desain",
    },
    {
      t: "Galeri",
      d: "Video promo dan dokumentasi proyek.",
      u: "/tentang-kami/#galeri",
      k: "galeri foto video dokumentasi promo",
    },
    {
      t: "Brosur",
      d: "Ringkasan tipe, simulasi DP, dan kontak.",
      u: "/brosur",
      k: "brosur unduh download ringkasan tipe simulasi pdf",
    },
  ];

  function normalize(value) {
    return (value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  PAGES.forEach(function (item) {
    item.titleNorm = normalize(item.t);
    item.descNorm = normalize(item.d);
    item.haystack = normalize(item.t + " " + item.d + " " + item.k);
  });

  function scoreOf(item, tokens, query) {
    var total = 0;
    var matched = 0;

    tokens.forEach(function (token) {
      var hit = 0;
      if (item.titleNorm.indexOf(token) === 0) {
        hit += 18;
      } else if (item.titleNorm.indexOf(token) !== -1) {
        hit += 12;
      }
      if (item.descNorm.indexOf(token) !== -1) {
        hit += 6;
      }
      if (item.haystack.indexOf(token) !== -1) {
        hit += 4;
      }
      if (hit > 0) {
        matched += 1;
      }
      total += hit;
    });

    if (!matched) {
      return 0;
    }
    if (matched < tokens.length) {
      total -= 8;
    }
    if (item.titleNorm === query) {
      total += 20;
    } else if (item.titleNorm.indexOf(query) === 0) {
      total += 10;
    }
    return total;
  }

  function search(query) {
    var q = normalize(query);
    if (q.length < 2) {
      return [];
    }

    var tokens = q.split(" ").filter(Boolean);
    return PAGES.map(function (item, index) {
      return { item: item, score: scoreOf(item, tokens, q), order: index };
    })
      .filter(function (entry) {
        return entry.score > 0;
      })
      .sort(function (a, b) {
        return b.score - a.score || a.order - b.order;
      })
      .slice(0, 6)
      .map(function (entry) {
        return entry.item;
      });
  }

  function init(root) {
    var form = root.querySelector("[data-jr-search-form]");
    var input = root.querySelector("[data-jr-search-input]");
    var panel = root.querySelector("[data-jr-search-panel]");
    var list = root.querySelector("[data-jr-search-list]");
    var status = root.querySelector("[data-jr-search-status]");

    if (!form || !input || !panel || !list) {
      return;
    }

    var options = [];
    var active = -1;

    function close() {
      panel.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      active = -1;
    }

    function setActive(index) {
      if (!options.length) {
        return;
      }
      active = (index + options.length) % options.length;
      options.forEach(function (option, i) {
        option.classList.toggle("is-active", i === active);
        option.setAttribute("aria-selected", i === active ? "true" : "false");
      });
      input.setAttribute("aria-activedescendant", options[active].id);
      if (options[active].scrollIntoView) {
        options[active].scrollIntoView({ block: "nearest" });
      }
    }

    function go(option) {
      if (!option) {
        return;
      }
      close();
      window.location.href = option.getAttribute("href");
    }

    function render(query) {
      var found = search(query);
      options = [];
      active = -1;
      list.textContent = "";
      input.removeAttribute("aria-activedescendant");

      if (!normalize(query) || normalize(query).length < 2) {
        if (status) {
          status.textContent = "";
        }
        close();
        return;
      }

      if (!found.length) {
        if (status) {
          status.textContent =
            'Tidak ada hasil untuk "' +
            query +
            '". Coba kata lain seperti "harga", "KPR", atau "lokasi".';
        }
        panel.hidden = false;
        input.setAttribute("aria-expanded", "true");
        return;
      }

      if (status) {
        status.textContent = "";
      }

      found.forEach(function (item, index) {
        var row = document.createElement("li");
        row.setAttribute("role", "none");

        var link = document.createElement("a");
        link.id = panel.id + "-opt-" + index;
        link.href = item.u;
        link.tabIndex = -1;
        link.setAttribute("role", "option");
        link.setAttribute("aria-selected", "false");

        var title = document.createElement("span");
        title.className = "jr-search-item-title";
        title.textContent = item.t;

        var desc = document.createElement("span");
        desc.className = "jr-search-item-desc";
        desc.textContent = item.d;

        link.appendChild(title);
        link.appendChild(desc);
        link.addEventListener("mouseenter", function () {
          setActive(index);
        });
        link.addEventListener("click", function () {
          close();
        });

        row.appendChild(link);
        list.appendChild(row);
        options.push(link);
      });

      panel.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    input.addEventListener("input", function () {
      render(input.value);
    });

    input.addEventListener("focus", function () {
      if (normalize(input.value).length >= 2) {
        render(input.value);
      }
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (panel.hidden) {
          render(input.value);
        }
        if (options.length) {
          setActive(active < 0 ? 0 : active + 1);
        }
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (panel.hidden) {
          render(input.value);
        }
        if (options.length) {
          setActive(active < 0 ? options.length - 1 : active - 1);
        }
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (panel.hidden) {
          render(input.value);
        }
        if (options.length) {
          go(options[active < 0 ? 0 : active]);
        }
      } else if (event.key === "Escape") {
        close();
      }
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (panel.hidden) {
        render(input.value);
      }
      if (options.length) {
        go(options[active < 0 ? 0 : active]);
      }
    });

    document.addEventListener("click", function (event) {
      if (!root.contains(event.target)) {
        close();
      }
    });
  }

  document.querySelectorAll("[data-jr-search]").forEach(init);
})();
