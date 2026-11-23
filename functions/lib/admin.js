const SESSION_COOKIE = "jr_admin_session";
const SESSION_TTL = 60 * 60 * 24;

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

export function randomHex(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  const clean = (hex || "").replace(/[^0-9a-f]/gi, "");
  const out = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hashPassword(password, encoded) {
  const parts = String(encoded || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") {
    throw new Error("Format ADMIN_PASSWORD_HASH tidak valid");
  }
  const iterations = Number(parts[1]);
  const salt = hexToBytes(parts[2]);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256
  );
  return bytesToHex(bits);
}

export async function verifyPassword(password, encoded) {
  try {
    const expected = String(encoded).split("$")[3] || "";
    return timingSafeEqual(await hashPassword(password, encoded), expected);
  } catch {
    return false;
  }
}

export function clientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function setSessionCookie(token, maxAge = SESSION_TTL) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function readCookie(request) {
  const raw = request.headers.get("cookie") || "";
  const match = raw.match(/(?:^|;\s*)jr_admin_session=([^;]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export async function createSession(env, request) {
  const token = randomHex(32);
  const now = Date.now();
  await env.JR_ADMIN_KV.put(
    `session:${token}`,
    JSON.stringify({ createdAt: now, expiresAt: now + SESSION_TTL * 1000, ip: clientIp(request) }),
    { expirationTtl: SESSION_TTL }
  );
  return token;
}

export async function destroySession(env, request) {
  const token = readCookie(request);
  if (token) await env.JR_ADMIN_KV.delete(`session:${token}`);
}

export async function getAdminSession(env, request) {
  const token = readCookie(request);
  if (!token) return null;
  const raw = await env.JR_ADMIN_KV.get(`session:${token}`);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (!session.expiresAt || session.expiresAt < Date.now()) {
      await env.JR_ADMIN_KV.delete(`session:${token}`);
      return null;
    }
    return { token, ...session };
  } catch {
    return null;
  }
}

export async function requireAdmin(env, request) {
  const session = await getAdminSession(env, request);
  if (!session) {
    return { response: json({ ok: false, error: "Sesi berakhir. Silakan login ulang." }, 401) };
  }
  return { session };
}

export async function checkLoginRateLimit(env, request) {
  const key = `login:fail:${clientIp(request)}`;
  const raw = await env.JR_ADMIN_KV.get(key);
  const state = raw ? JSON.parse(raw) : { count: 0, resetAt: Date.now() + 10 * 60 * 1000 };
  if (state.resetAt < Date.now()) {
    state.count = 0;
    state.resetAt = Date.now() + 10 * 60 * 1000;
  }
  if (state.count >= 5) return false;
  return state;
}

export async function noteFailedLogin(env, request, state) {
  if (!state || typeof state !== "object") return;
  state.count += 1;
  await env.JR_ADMIN_KV.put(`login:fail:${clientIp(request)}`, JSON.stringify(state), {
    expirationTtl: 600,
  });
}

export async function clearFailedLogin(env, request) {
  await env.JR_ADMIN_KV.delete(`login:fail:${clientIp(request)}`);
}
