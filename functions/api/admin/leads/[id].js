import { json, requireAdmin } from "../../../lib/admin.js";

const ALLOWED = new Set(["baru", "dihubungi", "survei", "booking", "ditutup"]);

export async function onRequestPatch(context) {
  const { request, env, params } = context;
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: "ID tidak valid" }, 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Permintaan tidak valid" }, 400);
  }
  const status = String(body.followUp || body.follow_up_status || "");
  if (!ALLOWED.has(status)) return json({ ok: false, error: "Status tidak dikenal" }, 400);

  try {
    const result = await env.JR_LEADS_DB.prepare(
      "UPDATE leads SET follow_up_status = ? WHERE id = ?"
    )
      .bind(status, id)
      .run();
    if (!result.meta?.changes) return json({ ok: false, error: "Lead tidak ditemukan" }, 404);
    return json({ ok: true, id, followUp: status });
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500);
  }
}
