import { json, requireAdmin } from "../../../lib/admin.js";
import { getMetadata } from "../../../lib/ga4.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;

  try {
    const metadata = await getMetadata(env);
    return json({ ok: true, dimensions: metadata.dimensions || [], metrics: metadata.metrics || [] });
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
