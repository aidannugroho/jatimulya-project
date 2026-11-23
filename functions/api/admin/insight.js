import { json, requireAdmin } from "../../lib/admin.js";

function pct(now, prev) {
  if (!prev) return now > 0 ? 100 : 0;
  return Math.round(((now - prev) / prev) * 100);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;

  try {
    const db = env.JR_LEADS_DB;
    const [summary, today, last7, prev7, emailFail, followUp, topTipe, pageStats] = await Promise.all([
      db.prepare("SELECT COUNT(*) AS total FROM leads").first(),
      db.prepare("SELECT COUNT(*) AS total FROM leads WHERE date(created_at) = date('now')").first(),
      db.prepare("SELECT COUNT(*) AS total FROM leads WHERE created_at >= datetime('now','-7 days')").first(),
      db.prepare(
        "SELECT COUNT(*) AS total FROM leads WHERE created_at >= datetime('now','-14 days') AND created_at < datetime('now','-7 days')"
      ).first(),
      db.prepare("SELECT COUNT(*) AS total FROM leads WHERE email_status = 'failed'").first(),
      db.prepare("SELECT COUNT(*) AS total FROM leads WHERE follow_up_status = 'baru'").first(),
      db.prepare(
        "SELECT tipe, COUNT(*) AS total FROM leads GROUP BY tipe ORDER BY total DESC LIMIT 5"
      ).all(),
      db.prepare(
        "SELECT source_page, COUNT(*) AS total FROM leads GROUP BY source_page ORDER BY total DESC LIMIT 10"
      ).all(),
    ]);

    const total = Number(summary?.total || 0);
    const n7 = Number(last7?.total || 0);
    const p7 = Number(prev7?.total || 0);
    const trend = pct(n7, p7);
    const insights = [];

    if (n7 === 0) {
      insights.push({
        level: "tinggi",
        title: "Belum ada lead masuk 7 hari terakhir",
        detail: "Periksa form kontak, proxy /api/leads, dan notifikasi WhatsApp. Pastikan tautan form masih aktif di halaman kontak.",
      });
    } else if (trend <= -20) {
      insights.push({
        level: "tinggi",
        title: `Lead turun ${Math.abs(trend)}% dibanding 7 hari sebelumnya`,
        detail: "Bandingkan page_view halaman kontak dan Pilih Rumah Anda di panel GA4. Jika traffic turun, periksa indeksasi dan tautan internal.",
      });
    } else if (trend >= 20) {
      insights.push({
        level: "baik",
        title: `Lead naik ${trend}% dibanding 7 hari sebelumnya`,
        detail: "Pertahankan sumber traffic teratas dan pastikan tim menindaklanjuti lead baru dalam 1x24 jam.",
      });
    } else {
      insights.push({
        level: "info",
        title: "Lead stabil dalam 7 hari terakhir",
        detail: "Belum ada lonjakan atau penurunan tajam. Fokus ke perbaikan kualitas tindak lanjut.",
      });
    }

    const failed = Number(emailFail?.total || 0);
    if (failed > 0) {
      insights.push({
        level: "sedang",
        title: `${failed} notifikasi email gagal dikirim`,
        detail: "Data lead tetap aman tersimpan di D1. Periksa kuota Formspree Free atau ganti endpoint notifikasi bila volume meningkat.",
      });
    }

    const newFollow = Number(followUp?.total || 0);
    if (newFollow > 0) {
      insights.push({
        level: newFollow >= 10 ? "tinggi" : "sedang",
        title: `${newFollow} lead belum ditindaklanjuti`,
        detail: "Update status lead di tabel Lead & Booking. Prioritaskan lead dengan tipe dan WhatsApp lengkap.",
      });
    }

    const top = topTipe?.results?.[0];
    if (top) {
      insights.push({
        level: "info",
        title: `Tipe paling diminati: ${top.tipe}`,
        detail: `${Number(top.total)} lead memilih tipe ini. Siapkan stok dan materi brosur yang relevan.`,
      });
    }

    const pickPage = (pageStats?.results || []).find(
      (row) => row.source_page === "/pilih-rumah-anda/"
    );
    insights.push({
      level: "info",
      title: pickPage
        ? `Halaman Pilih Rumah Anda menyumbang ${Number(pickPage.total)} lead`
        : "Halaman Pilih Rumah Anda belum menyumbang lead",
      detail: pickPage
        ? `Halaman Pilih Rumah Anda menyumbang ${Number(pickPage.total)} lead.`
        : "Halaman baru sudah aktif. Pantau page_view dan tautan internal pada 7 hari ke depan.",
    });

    return json({
      ok: true,
      mode: "rule-based",
      summary: {
        total,
        today: Number(today?.total || 0),
        last7: n7,
        prev7: p7,
        trendPct: trend,
        emailFailed: failed,
        newFollowUp: newFollow,
      },
      topTipe: topTipe?.results || [],
      pageStats: pageStats?.results || [],
      insights,
    });
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500);
  }
}
