import { clearSessionCookie, destroySession, json } from "../../lib/admin.js";

export async function onRequestPost({ request, env }) {
  await destroySession(env, request);
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
}
