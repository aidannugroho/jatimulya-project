import { getAdminSession, json } from "../../lib/admin.js";

export async function onRequestGet({ request, env }) {
  const session = await getAdminSession(env, request);
  return json({ ok: Boolean(session), authenticated: Boolean(session) });
}
