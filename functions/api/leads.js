import { json } from "../lib/admin.js";

function clean(value, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function sourcePage(request) {
  const referer = request.headers.get("referer");
  if (!referer) return "/kontak/";
  try {
    return new URL(referer).pathname || "/kontak/";
  } catch {
    return "/kontak/";
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "Format form tidak valid" }, 400);
  }

  const lead = {
    nama: clean(form.get("nama"), 120),
    whatsapp: clean(form.get("whatsapp"), 40),
    tipe: clean(form.get("tipe"), 80) || "Belum yakin",
    message: clean(form.get("message"), 4000),
    formName: clean(form.get("form-name"), 80) || "kontak-jatimulya",
    subject: clean(form.get("_subject"), 160) || "Konsultasi Gratis - Jatimulya Residence",
    source: sourcePage(request),
  };

  if (!lead.nama || !lead.whatsapp) {
    return json({ ok: false, error: "Nama dan WhatsApp wajib diisi" }, 400);
  }

  const createdAt = new Date().toISOString();
  try {
    const result = await env.JR_LEADS_DB.prepare(
      `INSERT INTO leads
        (created_at, nama, whatsapp, tipe, message, source_page, form_name, subject, email_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        createdAt,
        lead.nama,
        lead.whatsapp,
        lead.tipe,
        lead.message,
        lead.source,
        lead.formName,
        lead.subject,
        "pending"
      )
      .run();

    let emailStatus = "sent";
    let emailError = null;
    try {
      const formId = env.FORMSPREE_FORM_ID || "mvkareqn";
      const forwarded = await fetch(`https://formspree.io/f/${formId}`, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: form,
      });
      if (!forwarded.ok) throw new Error(`Formspree ${forwarded.status}`);
    } catch (error) {
      emailStatus = "failed";
      emailError = String(error?.message || error).slice(0, 300);
    }

    await env.JR_LEADS_DB.prepare(
      "UPDATE leads SET email_status = ?, email_error = ? WHERE id = ?"
    )
      .bind(emailStatus, emailError, result.meta?.last_row_id || null)
      .run();

    return json({ ok: true, id: result.meta?.last_row_id || null, emailStatus });
  } catch (error) {
    return json(
      { ok: false, error: "Gagal menyimpan lead", detail: String(error?.message || error).slice(0, 200) },
      500
    );
  }
}
