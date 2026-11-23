import { json, requireAdmin } from "../../lib/admin.js";
import { flattenReport, runReport } from "../../lib/ga4.js";

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

function rangeFromRequest(url) {
  const now = new Date();
  const requestedDays = Number(url.searchParams.get("days") || 30);
  const days = Math.min(90, Math.max(7, Number.isFinite(requestedDays) ? Math.round(requestedDays) : 30));
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
  return { startDate: isoDay(startDate), endDate: isoDay(endDate), days };
}

function blankSeries(startDate, endDate) {
  const series = [];
  const cursor = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");
  while (cursor <= end) {
    series.push({ date: isoDay(cursor), value: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return series;
}

function applyValues(series, rows, dateKey, valueKey) {
  const index = new Map(series.map((item, i) => [item.date, i]));
  rows.forEach((row) => {
    let day = String(row[dateKey] || "");
    if (/^\d{8}$/.test(day)) day = `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`;
    const position = index.get(day);
    if (position !== undefined) series[position].value = Number(row[valueKey] || 0);
  });
  return series;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const requestedMetric = url.searchParams.get("metric") || "leads";
  const metric = ["leads", "users", "keyEvents"].includes(requestedMetric) ? requestedMetric : "leads";
  const { startDate, endDate, days } = rangeFromRequest(url);

  try {
    let series;
    let source;

    if (metric === "leads") {
      const result = await env.JR_LEADS_DB.prepare(
        "SELECT date(created_at) AS day, COUNT(*) AS total FROM leads WHERE date(created_at) BETWEEN ? AND ? GROUP BY day ORDER BY day"
      ).bind(startDate, endDate).all();
      series = applyValues(blankSeries(startDate, endDate), result.results || [], "day", "total");
      source = "D1 leads";
    } else {
      const host = env.ALLOWED_HOST || "jatimulya-project.pages.dev";
      const report = await runReport(env, {
        startDate,
        endDate,
        dimensions: ["date"],
        metrics: [metric === "users" ? "totalUsers" : "keyEvents"],
        dimensionFilters: [{ dimensionName: "hostName", operator: "EQUAL", value: host }],
        limit: 100,
      });
      const rows = flattenReport(report);
      const valueKey = metric === "users" ? "totalUsers" : "keyEvents";
      const fallbackKey = metric === "keyEvents" && rows.length && rows[0].conversions !== undefined ? "conversions" : valueKey;
      series = applyValues(blankSeries(startDate, endDate), rows, "date", fallbackKey);
      source = `GA4 ${valueKey}`;
    }

    const total = series.reduce((sum, item) => sum + item.value, 0);
    return json({
      ok: true,
      metric,
      startDate,
      endDate,
      days,
      source,
      host: env.ALLOWED_HOST || "jatimulya-project.pages.dev",
      total,
      series,
    });
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500);
  }
}
