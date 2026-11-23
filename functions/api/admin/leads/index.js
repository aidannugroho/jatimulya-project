import { json, requireAdmin } from "../../../lib/admin.js";

const SORTABLE = {
  created_at: "created_at",
  nama: "nama",
  whatsapp: "whatsapp",
  tipe: "tipe",
  follow_up_status: "follow_up_status",
};

function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, "\\$&");
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const p = url.searchParams;
  const where = [];
  const binds = [];

  const q = (p.get("q") || "").trim();
  if (q) {
    const like = `%${escapeLike(q)}%`;
    where.push("(nama LIKE ? ESCAPE '\\' OR whatsapp LIKE ? ESCAPE '\\' OR tipe LIKE ? ESCAPE '\\' OR message LIKE ? ESCAPE '\\')");
    binds.push(like, like, like, like);
  }
  const from = (p.get("dateFrom") || "").trim();
  const to = (p.get("dateTo") || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    where.push("substr(created_at, 1, 10) >= ?");
    binds.push(from);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    where.push("substr(created_at, 1, 10) <= ?");
    binds.push(to);
  }
  for (const [param, column] of [
    ["tipe", "tipe"],
    ["emailStatus", "email_status"],
    ["followUp", "follow_up_status"],
    ["source", "source_page"],
  ]) {
    const value = (p.get(param) || "").trim();
    if (value) {
      where.push(`${column} = ?`);
      binds.push(value);
    }
  }

  const sqlWhere = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const sortKey = SORTABLE[p.get("sort") || "created_at"] || "created_at";
  const dir = (p.get("dir") || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
  const limit = Math.min(Math.max(Number(p.get("limit") || 25), 1), 200);
  const offset = Math.max(Number(p.get("offset") || 0), 0);

  try {
    const sql = `SELECT id, created_at, nama, whatsapp, tipe, message, source_page, email_status, email_error, follow_up_status FROM leads ${sqlWhere} ORDER BY ${sortKey} ${dir} LIMIT ? OFFSET ?`;
    const rows = await env.JR_LEADS_DB.prepare(sql)
      .bind(...binds, limit, offset)
      .all();
    const count = await env.JR_LEADS_DB.prepare(
      `SELECT COUNT(*) AS total FROM leads ${sqlWhere}`
    )
      .bind(...binds)
      .first();

    return json({
      ok: true,
      rows: rows.results || [],
      total: Number(count?.total || 0),
      limit,
      offset,
    });
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500);
  }
}
