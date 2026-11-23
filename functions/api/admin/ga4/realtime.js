import { json, requireAdmin } from "../../../lib/admin.js";
import { flattenReport, runRealtimeReport } from "../../../lib/ga4.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;

  let options = {};
  try {
    options = (await request.json()) || {};
  } catch {
    // body opsional
  }

  try {
    // Realtime API memakai schema berbeda dari Data API: `pagePath`/`hostName` tidak valid.
    const validDimensions = new Set([
      "unifiedScreenName", "eventName", "country", "browser", "deviceCategory", "dateHourMinute",
    ]);
    let dimensions = (options.dimensions || ["unifiedScreenName"])
      .map((name) => (name === "pagePath" ? "unifiedScreenName" : name))
      .filter((name) => validDimensions.has(name));
    let metrics = (options.metrics || ["activeUsers", "screenPageViews"])
      .filter((name) => ["activeUsers", "screenPageViews", "eventCount"].includes(name));
    if (!metrics.length) metrics = ["activeUsers", "screenPageViews"];
    if (metrics.includes("activeUsers") || metrics.includes("screenPageViews")) {
      dimensions = dimensions.filter((name) => name !== "eventName");
    }
    if (!dimensions.length) dimensions = ["unifiedScreenName"];
    if (dimensions.includes("eventName") && !metrics.includes("eventCount")) metrics = ["eventCount"];

    const report = await runRealtimeReport(env, {
      dimensions,
      metrics,
      // Laporan realtime sudah di-scope ke property GA4 (satu stream untuk host produksi).
      // hostName bukan dimensi realtime yang valid, jadi filter ini dilewati di sini.
      dimensionFilters: (options.dimensionFilters || []).filter(
        (filter) => filter.dimensionName !== "hostName"
      ),
      limit: options.limit || 50,
    });
    return json({ ok: true, rows: flattenReport(report), dimensions, metrics });
  } catch (error) {
    return json(
      {
        ok: false,
        configured: Boolean(env.GA4_SERVICE_ACCOUNT_JSON),
        error: String(error?.message || error),
      },
      503
    );
  }
}
