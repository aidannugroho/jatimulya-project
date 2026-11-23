import {
  checkLoginRateLimit,
  clearFailedLogin,
  createSession,
  json,
  noteFailedLogin,
  setSessionCookie,
  verifyPassword,
} from "../../lib/admin.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Permintaan tidak valid" }, 400);
  }

  const rate = await checkLoginRateLimit(env, request);
  if (rate === false) {
    return json({ ok: false, error: "Terlalu banyak percobaan. Coba lagi dalam 10 menit." }, 429);
  }

  const password = String(body.password || "");
  const valid = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);
  if (!valid) {
    await noteFailedLogin(env, request, rate);
    const raw = String(env.ADMIN_PASSWORD_HASH || "");
    return json(
      {
        ok: false,
        error: "Kata sandi salah",
        debug: { hasHash: Boolean(raw), length: raw.length, prefix: raw.slice(0, 12) },
      },
      401
    );
  }

  await clearFailedLogin(env, request);
  const token = await createSession(env, request);
  return json(
    { ok: true },
    200,
    { "set-cookie": setSessionCookie(token) }
  );
}
