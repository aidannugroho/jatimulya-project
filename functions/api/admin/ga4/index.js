import { json, requireAdmin } from "../../../lib/admin.js";
import { deriveRows, flattenReport, runReport } from "../../../lib/ga4.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;

  let options;
  try {
    options = await request.json();
  } catch {
    return json({ ok: false, error: "Permintaan tidak valid" }, 400);
  }

  try {
    const report = await runReport(env, options);
    let rows = deriveRows(flattenReport(report), options.metricMode || "unique");

    if (options.minEngagementRate !== undefined && options.minEngagementRate !== "") {
      const min = Number(options.minEngagementRate);
      rows = rows.filter((row) => row.jr_engagement_rate >= min);
    }
    if (options.minKeyEventRate !== undefined && options.minKeyEventRate !== "") {
      const min = Number(options.minKeyEventRate);
      rows = rows.filter((row) => row.jr_key_event_rate >= min);
    }
    if (options.minJrValue !== undefined && options.minJrValue !== "") {
      const min = Number(options.minJrValue);
      rows = rows.filter((row) => row.jr_value >= min);
    }
    if (options.sortByDerived) {
      const key = options.sortByDerived;
      rows.sort((a, b) => Number(b[key] || 0) - Number(a[key] || 0));
    }

    return json({
      ok: true,
      rows,
      rowCount: rows.length,
      quota: report.propertyQuota || null,
      metadata: {
        metricMode: options.metricMode || "unique",
        hostFilter: "jatimulya-project.pages.dev",
        derivedFiltersApplied: [
          options.minEngagementRate ? "minEngagementRate" : null,
          options.minKeyEventRate ? "minKeyEventRate" : null,
          options.minJrValue ? "minJrValue" : null,
        ].filter(Boolean),
      },
    });
  } catch (error) {
    const message = String(error?.message || error);
    const configured = Boolean(env.GA4_SERVICE_ACCOUNT_JSON);
    return json(
      {
        ok: false,
        configured,
        error: message,
        hint: configured
          ? "Periksa akses Viewer service account pada property GA4."
          : "Service account GA4 belum dipasang sebagai secret GA4_SERVICE_ACCOUNT_JSON.",
      },
      configured ? 502 : 503
    );
  }
}
