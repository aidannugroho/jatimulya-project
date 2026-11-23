(function () {
  "use strict";

  var HOST_FILTER = "jatimulya-project.pages.dev";
  var app = document.getElementById("jr-admin-app");
  var loginCard = document.getElementById("jr-login-card");

  function $(id) { return document.getElementById(id); }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function status(el, message, kind) {
    if (!el) return;
    el.textContent = message || "";
    el.className = "jr-status" + (kind ? " " + kind : "");
  }

  async function api(path, options) {
    var res = await fetch(path, Object.assign({
      credentials: "same-origin",
      headers: { "accept": "application/json" },
    }, options || {}));
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok && !data.error) data.error = "HTTP " + res.status;
    return data;
  }

  function dateOffset(days) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function normalizeDateInput(el, fallbackDays) {
    if (!el) return;
    var v = el.value;
    if (v === "30daysAgo" || v === "7daysAgo" || v === "today" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      el.value = dateOffset(fallbackDays);
    }
  }

  /* ---------- login / session ---------- */

  async function checkSession() {
    var data = await api("/api/admin/session");
    if (data.authenticated) {
      showApp();
    } else if (loginCard) {
      loginCard.hidden = false;
    }
  }

  function showApp() {
    if (loginCard) loginCard.hidden = true;
    if (app) app.hidden = false;
    loadChart();
    loadInsight();
    loadLeads();
    loadPresets();
  }

  if ($("jr-login-form")) {
    $("jr-login-form").addEventListener("submit", async function (event) {
      event.preventDefault();
      var button = this.querySelector("button[type=submit]");
      button.disabled = true;
      status($("jr-login-status"), "Memeriksa kata sandi…");
      try {
        var data = await api("/api/admin/login", {
          method: "POST",
          headers: { "content-type": "application/json", "accept": "application/json" },
          body: JSON.stringify({ password: $("jr-password").value }),
        });
        if (!data.ok) {
          status($("jr-login-status"), data.error || "Gagal masuk.", "err");
          return;
        }
        $("jr-password").value = "";
        status($("jr-login-status"), "Berhasil masuk.", "ok");
        showApp();
      } catch (error) {
        status($("jr-login-status"), "Koneksi gagal: " + error.message, "err");
      } finally {
        button.disabled = false;
      }
    });
  }

  if ($("jr-logout")) {
    $("jr-logout").addEventListener("click", async function () {
      await api("/api/admin/logout", { method: "POST" });
      if (app) app.hidden = true;
      if (loginCard) loginCard.hidden = false;
    });
  }

  /* ---------- tabs ---------- */

  document.querySelectorAll(".jr-tabs button[data-tab]").forEach(function (button) {
    button.addEventListener("click", function () {
      document.querySelectorAll(".jr-tabs button[data-tab]").forEach(function (b) {
        b.classList.toggle("active", b === button);
        b.setAttribute("aria-selected", b === button ? "true" : "false");
      });
      document.querySelectorAll(".jr-panel[data-panel]").forEach(function (panel) {
        panel.hidden = panel.dataset.panel !== button.dataset.tab;
      });
    });
  });

  /* ---------- grafik keseluruhan ---------- */

  function number(value) {
    return new Intl.NumberFormat("id-ID").format(Number(value || 0));
  }

  function chartSvg(series, metric) {
    var width = 720;
    var height = 240;
    var pad = { top: 18, right: 20, bottom: 36, left: 48 };
    var innerWidth = width - pad.left - pad.right;
    var innerHeight = height - pad.top - pad.bottom;
    var values = series.map(function (item) { return Number(item.value || 0); });
    var max = Math.max(1, Math.ceil(Math.max.apply(null, values) * 1.1));
    var points = values.map(function (value, i) {
      return {
        x: pad.left + (series.length === 1 ? innerWidth / 2 : (i / (series.length - 1)) * innerWidth),
        y: pad.top + innerHeight - (value / max) * innerHeight,
      };
    });
    var line = points.map(function (p) { return p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" ");
    var baseY = pad.top + innerHeight;
    var area = "M" + points[0].x.toFixed(1) + "," + baseY +
      " L" + points.map(function (p) { return p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" L") +
      " L" + points[points.length - 1].x.toFixed(1) + "," + baseY + " Z";
    var gridValues = [0, 0.25, 0.5, 0.75, 1];
    var grid = gridValues.map(function (ratio) {
      var y = pad.top + innerHeight - ratio * innerHeight;
      return '<line class="chart-grid" x1="' + pad.left + '" y1="' + y.toFixed(1) +
        '" x2="' + (width - pad.right) + '" y2="' + y.toFixed(1) + '"></line>' +
        '<text class="chart-label" x="' + (pad.left - 8) + '" y="' + (y + 4).toFixed(1) +
        '" text-anchor="end">' + number(Math.round(max * ratio)) + "</text>";
    }).join("");
    var labelIndexes = [0, Math.floor((series.length - 1) / 2), series.length - 1]
      .filter(function (value, i, list) { return list.indexOf(value) === i; });
    var labels = labelIndexes.map(function (i) {
      return '<text class="chart-label" x="' + points[i].x.toFixed(1) + '" y="' + (height - 10) +
        '" text-anchor="' + (i === 0 ? "start" : i === series.length - 1 ? "end" : "middle") + '">' +
        esc(series[i].date.slice(5)) + "</text>";
    }).join("");
    var dots = points.map(function (p, i) {
      return '<circle class="chart-dot" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="2.5">' +
        "<title>" + esc(series[i].date) + ": " + number(series[i].value) + "</title></circle>";
    }).join("");
    return '<svg viewBox="0 0 ' + width + " " + height + '" xmlns="http://www.w3.org/2000/svg" aria-label="' +
      esc("Grafik " + metric + " harian") + '">' +
      "<title>" + esc("Grafik " + metric + " harian") + "</title>" +
      grid + '<path class="chart-area" d="' + area + '"></path>' +
      '<polyline class="chart-line" points="' + line + '"></polyline>' + dots + labels + "</svg>";
  }

  async function loadChart() {
    var days = $("chart-days") ? $("chart-days").value : "30";
    var metric = $("chart-metric") ? $("chart-metric").value : "leads";
    status($("jr-chart-status"), "Memuat grafik…");
    try {
      var data = await api("/api/admin/chart?days=" + encodeURIComponent(days) + "&metric=" + encodeURIComponent(metric));
      if (!data.ok) throw new Error(data.error || "Gagal memuat grafik");
      var series = data.series || [];
      $("jr-chart").innerHTML = series.length
        ? chartSvg(series, metric)
        : '<p class="jr-muted">Tidak ada data pada rentang ini.</p>';
      var peak = series.reduce(function (best, item) {
        return Number(item.value) > Number(best.value) ? item : best;
      }, series[0] || { date: "-", value: 0 });
      $("jr-chart-summary").innerHTML = [
        ["Total", number(data.total)],
        ["Rata-rata / hari", number(series.length ? Math.round(data.total / series.length) : 0)],
        ["Puncak", number(peak.value) + " · " + esc(String(peak.date).slice(5))],
      ].map(function (item) {
        return "<div><strong>" + item[1] + "</strong><span>" + esc(item[0]) + "</span></div>";
      }).join("");
      status($("jr-chart-status"), "Sumber: " + data.source + " · " + data.startDate + " s/d " + data.endDate + ".", "ok");
    } catch (error) {
      status($("jr-chart-status"), error.message, "err");
    }
  }

  if ($("chart-run")) $("chart-run").addEventListener("click", loadChart);

  /* ---------- insight ---------- */

  async function loadInsight() {
    status($("jr-insight-status"), "Memuat insight…");
    try {
      var data = await api("/api/admin/insight");
      if (!data.ok) throw new Error(data.error || "Gagal memuat insight");
      var s = data.summary || {};
      $("jr-insight-stats").innerHTML = [
        ["Total lead", s.total],
        ["Hari ini", s.today],
        ["7 hari terakhir", s.last7],
        ["Tren 7 hari", (s.trendPct > 0 ? "+" : "") + s.trendPct + "%"],
        ["Perlu tindak lanjut", s.newFollowUp],
        ["Email gagal", s.emailFailed],
      ].map(function (item) {
        return '<div class="jr-stat"><strong>' + esc(item[1]) + "</strong><span>" + esc(item[0]) + "</span></div>";
      }).join("");
      $("jr-insight-list").innerHTML = (data.insights || []).map(function (item) {
        return '<div class="jr-insight ' + esc(item.level) + '"><strong>' + esc(item.title) + "</strong><div>" + esc(item.detail) + "</div></div>";
      }).join("");
      status($("jr-insight-status"), "Diperbarui. Mode: " + data.mode + ".", "ok");
    } catch (error) {
      status($("jr-insight-status"), error.message, "err");
    }
  }

  /* ---------- leads ---------- */

  var leadState = { offset: 0, limit: 25, total: 0 };

  function leadQuery() {
    var p = new URLSearchParams();
    var q = $("lead-q").value.trim();
    if (q) p.set("q", q);
    if ($("lead-from").value) p.set("dateFrom", $("lead-from").value);
    if ($("lead-to").value) p.set("dateTo", $("lead-to").value);
    if ($("lead-tipe").value) p.set("tipe", $("lead-tipe").value);
    if ($("lead-email").value) p.set("emailStatus", $("lead-email").value);
    if ($("lead-follow").value) p.set("followUp", $("lead-follow").value);
    if ($("lead-source").value) p.set("source", $("lead-source").value);
    p.set("limit", leadState.limit);
    p.set("offset", leadState.offset);
    return p.toString();
  }

  async function loadLeads() {
    status($("lead-status"), "Memuat lead…");
    try {
      var data = await api("/api/admin/leads?" + leadQuery());
      if (!data.ok) throw new Error(data.error || "Gagal memuat lead");
      leadState.total = Number(data.total || 0);
      var rows = data.rows || [];
      $("lead-rows").innerHTML = rows.length
        ? rows.map(function (row) {
            var statusOptions = ["baru", "dihubungi", "survei", "booking", "ditutup"];
            return "<tr>" +
              "<td>" + esc(String(row.created_at).replace("T", " ").slice(0, 16)) + "</td>" +
              "<td>" + esc(row.nama) + "</td>" +
              "<td>" + esc(row.whatsapp) + "</td>" +
              "<td>" + esc(row.tipe) + "</td>" +
              "<td>" + esc(row.message) + "</td>" +
              "<td>" + esc(row.source_page) + "</td>" +
              "<td><span class='jr-badge " + esc(row.email_status) + "'>" + esc(row.email_status) + "</span></td>" +
              "<td><select class='jr-input' data-lead-id='" + esc(row.id) + "' aria-label='Status tindak lanjut " + esc(row.nama) + "'>" +
                statusOptions.map(function (o) {
                  return "<option value='" + o + "'" + (o === row.follow_up_status ? " selected" : "") + ">" + o + "</option>";
                }).join("") +
              "</select></td>" +
            "</tr>";
          }).join("")
        : '<tr><td colspan="8" class="jr-muted">Belum ada lead yang cocok dengan filter.</td></tr>';
      var start = leadState.total ? leadState.offset + 1 : 0;
      var end = Math.min(leadState.offset + leadState.limit, leadState.total);
      $("lead-page-info").textContent = start + "–" + end + " dari " + leadState.total;
      $("lead-prev").disabled = leadState.offset === 0;
      $("lead-next").disabled = end >= leadState.total;
      status($("lead-status"), leadState.total + " lead ditemukan.", "ok");
    } catch (error) {
      status($("lead-status"), error.message, "err");
    }
  }

  if ($("lead-apply")) {
    $("lead-apply").addEventListener("click", function () {
      leadState.offset = 0;
      loadLeads();
    });
  }
  if ($("lead-reset")) {
    $("lead-reset").addEventListener("click", function () {
      ["lead-q", "lead-from", "lead-to"].forEach(function (id) { $(id).value = ""; });
      ["lead-tipe", "lead-email", "lead-follow", "lead-source"].forEach(function (id) { $(id).value = ""; });
      leadState.offset = 0;
      loadLeads();
    });
  }
  if ($("lead-prev")) {
    $("lead-prev").addEventListener("click", function () {
      leadState.offset = Math.max(0, leadState.offset - leadState.limit);
      loadLeads();
    });
  }
  if ($("lead-next")) {
    $("lead-next").addEventListener("click", function () {
      leadState.offset += leadState.limit;
      loadLeads();
    });
  }
  if ($("lead-rows")) {
    $("lead-rows").addEventListener("change", async function (event) {
      var select = event.target.closest("select[data-lead-id]");
      if (!select) return;
      var data = await api("/api/admin/leads/" + encodeURIComponent(select.dataset.leadId), {
        method: "PATCH",
        headers: { "content-type": "application/json", "accept": "application/json" },
        body: JSON.stringify({ followUp: select.value }),
      });
      if (data.ok) {
        status($("lead-status"), "Status lead diperbarui.", "ok");
        loadInsight();
      } else {
        status($("lead-status"), data.error || "Gagal memperbarui status.", "err");
      }
    });
  }

  /* ---------- GA4 report ---------- */

  function baseGaQuery(prefix) {
    var dimensions = $(prefix + "-dims") ? $(prefix + "-dims").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean) : ["pagePath"];
    var metrics = $(prefix + "-metrics") ? $(prefix + "-metrics").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean) : ["totalUsers"];
    return {
      startDate: $(prefix + "-start").value,
      endDate: $(prefix + "-end").value,
      dimensions: dimensions,
      metrics: metrics,
      dimensionFilters: [{ dimensionName: "hostName", operator: "EQUAL", value: HOST_FILTER }],
      orderBys: [{ metric: { metricName: metrics[0] }, desc: true }],
      limit: $(prefix + "-limit") ? Number($(prefix + "-limit").value) || 25 : 25,
      metricMode: "unique",
    };
  }

  function renderTable(headEl, bodyEl, rows) {
    if (!rows.length) {
      headEl.innerHTML = "";
      bodyEl.innerHTML = '<tr><td class="jr-muted">Tidak ada data untuk filter ini.</td></tr>';
      return;
    }
    var keys = Object.keys(rows[0]);
    headEl.innerHTML = keys.map(function (k) { return "<th>" + esc(k) + "</th>"; }).join("");
    bodyEl.innerHTML = rows.map(function (row) {
      return "<tr>" + keys.map(function (k) {
        var value = row[k];
        if (k.indexOf("jr_") === 0 || typeof value === "number") {
          return "<td>" + esc(typeof value === "number" && value < 1 && k.indexOf("rate") > -1 ? (value * 100).toFixed(1) + "%" : value) + "</td>";
        }
        return "<td>" + esc(value) + "</td>";
      }).join("") + "</tr>";
    }).join("");
  }

  function intentQuery() {
    var options = baseGaQuery("ga");
    options.metricMode = $("ga-mode").value;
    var page = $("ga-page").value.trim();
    if (page) options.dimensionFilters.push({ dimensionName: "pagePath", operator: "EQUAL", value: page });
    if ($("ga-event").value) options.dimensionFilters.push({ dimensionName: "eventName", operator: "EQUAL", value: $("ga-event").value });
    if ($("ga-min-engage").value !== "") options.minEngagementRate = Number($("ga-min-engage").value);
    if ($("ga-min-value").value !== "") options.minJrValue = Number($("ga-min-value").value);
    options.sortByDerived = "jr_value";
    return options;
  }

  async function runIntent() {
    status($("ga-status"), "Mengambil data GA4…");
    try {
      var data = await api("/api/admin/ga4", {
        method: "POST",
        headers: { "content-type": "application/json", "accept": "application/json" },
        body: JSON.stringify(intentQuery()),
      });
      if (!data.ok) {
        status($("ga-status"), data.error + (data.hint ? " — " + data.hint : ""), "err");
        return;
      }
      renderTable($("ga-head"), $("ga-rows"), data.rows || []);
      status($("ga-status"), (data.rows || []).length + " baris. Filter host: " + HOST_FILTER + ". Mode: " + data.metadata.metricMode + ".", "ok");
    } catch (error) {
      status($("ga-status"), "Koneksi gagal: " + error.message, "err");
    }
  }

  if ($("ga-run-intent")) $("ga-run-intent").addEventListener("click", runIntent);

  if ($("ga-realtime")) {
    $("ga-realtime").addEventListener("click", async function () {
      status($("ga-status"), "Mengambil data realtime…");
      try {
        var data = await api("/api/admin/ga4/realtime", {
          method: "POST",
          headers: { "content-type": "application/json", "accept": "application/json" },
          body: JSON.stringify({
            // Realtime API tidak menerima pagePath/hostName; pakai unifiedScreenName.
            dimensions: ["unifiedScreenName"],
            metrics: ["activeUsers", "screenPageViews"],
            limit: 50,
          }),
        });
        if (!data.ok) throw new Error(data.error || "Gagal memuat realtime");
        renderTable($("ga-head"), $("ga-rows"), data.rows || []);
        status($("ga-status"), "Realtime: " + (data.rows || []).length + " baris.", "ok");
      } catch (error) {
        status($("ga-status"), error.message, "err");
      }
    });
  }

  if ($("trafik-run")) {
    $("trafik-run").addEventListener("click", async function () {
      status($("trafik-status"), "Mengambil data organik…");
      var query = {
        startDate: $("trafik-start").value,
        endDate: $("trafik-end").value,
        dimensions: ["sessionDefaultChannelGroup"],
        metrics: ["totalUsers", "sessions", "screenPageViews", "engagedSessions", "keyEvents"],
        dimensionFilters: [{ dimensionName: "hostName", operator: "EQUAL", value: HOST_FILTER }],
        orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
        limit: 25,
        metricMode: "unique",
      };
      if ($("trafik-channel").value) {
        query.dimensionFilters.push({ dimensionName: "sessionDefaultChannelGroup", operator: "EQUAL", value: $("trafik-channel").value });
      }
      try {
        var data = await api("/api/admin/ga4", {
          method: "POST",
          headers: { "content-type": "application/json", "accept": "application/json" },
          body: JSON.stringify(query),
        });
        if (!data.ok) {
          status($("trafik-status"), data.error + (data.hint ? " — " + data.hint : ""), "err");
          return;
        }
        renderTable($("trafik-head"), $("trafik-rows"), data.rows || []);
        status($("trafik-status"), "Mode user unik. Filter host: " + HOST_FILTER + ".", "ok");
      } catch (error) {
        status($("trafik-status"), "Koneksi gagal: " + error.message, "err");
      }
    });
  }

  /* ---------- presets ---------- */

  async function loadPresets() {
    try {
      var data = await api("/api/admin/presets");
      if (!data.ok) return;
      $("preset-list").innerHTML = (data.presets || []).length
        ? data.presets.map(function (p) {
            return '<span class="jr-chip"><button type="button" class="jr-btn secondary small" data-preset-load="' + esc(p.id) + '" style="border:0;background:transparent;min-height:0;padding:0">' + esc(p.name) + "</button> <button type='button' data-preset-delete='" + esc(p.id) + "' aria-label='Hapus " + esc(p.name) + "'>✕</button></span>";
          }).join("")
        : '<span class="jr-muted">Belum ada preset tersimpan.</span>';
    } catch (error) {
      status($("preset-status"), error.message, "err");
    }
  }

  if ($("ga-preset-save")) {
    $("ga-preset-save").addEventListener("click", async function () {
      var name = window.prompt("Nama preset filter:");
      if (!name) return;
      var data = await api("/api/admin/presets", {
        method: "POST",
        headers: { "content-type": "application/json", "accept": "application/json" },
        body: JSON.stringify({ name: name, query: intentQuery() }),
      });
      status($("ga-status"), data.ok ? "Preset tersimpan: " + name : (data.error || "Gagal menyimpan preset."), data.ok ? "ok" : "err");
      loadPresets();
    });
  }

  if ($("preset-list")) {
    $("preset-list").addEventListener("click", async function (event) {
      var loadId = event.target.getAttribute("data-preset-load");
      var deleteId = event.target.getAttribute("data-preset-delete");
      if (!loadId && !deleteId) return;
      var data = await api("/api/admin/presets" + (deleteId ? "?id=" + encodeURIComponent(deleteId) : ""), {
        method: deleteId ? "DELETE" : "GET",
      });
      if (deleteId) {
        status($("preset-status"), data.ok ? "Preset dihapus." : (data.error || "Gagal menghapus."), data.ok ? "ok" : "err");
        loadPresets();
        return;
      }
      var preset = (data.presets || []).find(function (p) { return p.id === loadId; });
      if (!preset) return;
      var q = preset.query || {};
      if (q.startDate) $("ga-start").value = q.startDate;
      if (q.endDate) $("ga-end").value = q.endDate;
      if (q.metricMode) $("ga-mode").value = q.metricMode;
      if (q.dimensions) $("ga-dims").value = q.dimensions.join(",");
      if (q.metrics) $("ga-metrics").value = q.metrics.join(",");
      if (q.minEngagementRate !== undefined) $("ga-min-engage").value = q.minEngagementRate;
      if (q.minJrValue !== undefined) $("ga-min-value").value = q.minJrValue;
      var nonHost = (q.dimensionFilters || []).filter(function (f) { return f.dimensionName !== "hostName"; });
      $("ga-page").value = "";
      $("ga-event").value = "";
      nonHost.forEach(function (f) {
        if (f.dimensionName === "pagePath") $("ga-page").value = f.value;
        if (f.dimensionName === "eventName") $("ga-event").value = f.value;
      });
      document.querySelector('.jr-tabs button[data-tab="intent"]').click();
      status($("ga-status"), "Preset \"" + preset.name + "\" dimuat. Klik Jalankan laporan.", "ok");
    });
  }

  /* ---------- init ---------- */

  normalizeDateInput($("ga-start"), -30);
  normalizeDateInput($("ga-end"), 0);
  normalizeDateInput($("trafik-start"), -30);
  normalizeDateInput($("trafik-end"), 0);
  checkSession();
})();
