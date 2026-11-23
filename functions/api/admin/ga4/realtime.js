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
    const report = await runRealtimeReport(env, {
      dimensions: options.dimensions || ["pagePath", "eventName"],
      metrics: options.metrics || ["activeUsers", "screenPageViews"],
      // Laporan realtime sudah di-scope ke property GA4 (satu stream untuk host produksi).
      // hostName bukan dimensi realtime yang valid, jadi filter ini dilewati di sini.
      dimensionFilters: (options.dimensionFilters || []).filter(
        (filter) => filter.dimensionName !== "hostName"
      ),
      limit: options.limit || 50,
    });
    return json({ ok: true, rows: flattenReport(report) });
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
