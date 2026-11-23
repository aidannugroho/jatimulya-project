import { json, requireAdmin } from "../../lib/admin.js";

const KEY = "admin:ga4-presets";

async function read(env) {
  const raw = await env.JR_ADMIN_KV.get(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;
  return json({ ok: true, presets: await read(env) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Permintaan tidak valid" }, 400);
  }
  const name = String(body.name || "").trim().slice(0, 80);
  const query = body.query;
  if (!name || !query || typeof query !== "object") {
    return json({ ok: false, error: "Nama dan konfigurasi filter wajib diisi" }, 400);
  }
  const presets = await read(env);
  const preset = {
    id: String(crypto.randomUUID ? crypto.randomUUID() : Date.now()),
    name,
    query,
    createdAt: new Date().toISOString(),
  };
  presets.unshift(preset);
  await env.JR_ADMIN_KV.put(KEY, JSON.stringify(presets.slice(0, 30)));
  return json({ ok: true, preset, presets: presets.slice(0, 30) });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const presets = (await read(env)).filter((item) => item.id !== id);
  await env.JR_ADMIN_KV.put(KEY, JSON.stringify(presets));
  return json({ ok: true, presets });
}
