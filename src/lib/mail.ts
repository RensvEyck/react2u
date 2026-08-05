// Notificatiemail bij binnenkomende inzendingen.
//
// Bewust zonder SDK: de Resend-API is één POST, dat is geen dependency waard.
//
// Twee regels die hier hard gelden:
//  1. Ontbreekt de configuratie, dan doet dit niets. Geen fout, geen log-spam.
//     De inzending staat dan al in Supabase en is zichtbaar in het Postvak IN —
//     de mail is een extra, geen voorwaarde.
//  2. Een mislukte mail mag een inzending nooit laten mislukken. Alles hier
//     vangt zijn eigen fouten af; de aanroeper hoeft niets te doen.
//
// Let op het afzenderadres: react2u.nl staat op DMARC p=reject. Verstuur je
// namens een domein waarvoor Resend geen geverifieerde SPF/DKIM heeft, dan
// wordt de mail geweigerd — niet als spam bezorgd. Gebruik het (sub)domein dat
// je in Resend hebt geverifieerd.

const ENDPOINT = "https://api.resend.com/emails";
const TIMEOUT_MS = 8000;

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

type Field = { label: string; value: string | null | undefined };

function render(title: string, intro: string, fields: Field[], body?: string | null) {
  const rows = fields
    .filter((f) => f.value)
    .map(
      (f) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#666;font-size:14px;white-space:nowrap;vertical-align:top">${esc(f.label)}</td>` +
        `<td style="padding:6px 0;font-size:14px;color:#1c1a4e">${esc(String(f.value))}</td></tr>`
    )
    .join("");

  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px">
  <h2 style="margin:0 0 4px;font-size:18px;color:#312e82">${esc(title)}</h2>
  <p style="margin:0 0 16px;font-size:14px;color:#666">${esc(intro)}</p>
  <table style="border-collapse:collapse;margin-bottom:16px">${rows}</table>
  ${body ? `<div style="white-space:pre-line;background:#fafafd;border-radius:10px;padding:14px;font-size:14px;line-height:1.6;color:#333">${esc(body)}</div>` : ""}
  <p style="margin:20px 0 0;font-size:13px;color:#888">Behandel deze inzending in het <a href="${esc(adminUrl())}" style="color:#e75387">Postvak IN</a>.</p>
</div>`;
}

function adminUrl() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "https://react2u.nl";
  return `${base.replace(/\/$/, "")}/admin/postvak-in`;
}

async function send(subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_TO;
  const from = process.env.NOTIFY_FROM;
  if (!key || !to || !from) return; // niet geconfigureerd — stil overslaan

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: to.split(",").map((s) => s.trim()).filter(Boolean),
        subject,
        html,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      // Alleen loggen. De inzending is al opgeslagen; hier stoppen zou de
      // bezoeker een foutmelding geven voor iets wat wél gelukt is.
      console.error("[mail] Resend gaf %s: %s", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("[mail] versturen mislukt:", err);
  }
}

export async function notifyContactMessage(m: {
  name: string; email: string; phone: string; subject: string; message: string;
}) {
  await send(
    `Nieuw bericht via de website${m.subject ? `: ${m.subject}` : ""}`,
    render("Nieuw contactbericht", "Binnengekomen via het contactformulier op de website.", [
      { label: "Naam", value: m.name },
      { label: "E-mail", value: m.email },
      { label: "Telefoon", value: m.phone },
      { label: "Onderwerp", value: m.subject || "(geen onderwerp)" },
    ], m.message)
  );
}

export async function notifyApplication(a: {
  name: string; email: string; phone: string | null; vacancyTitle: string | null;
  motivation: string | null; hasCv: boolean;
}) {
  await send(
    `Nieuwe sollicitatie: ${a.vacancyTitle || "open sollicitatie"}`,
    render("Nieuwe sollicitatie", `Binnengekomen via ${a.vacancyTitle ? `de vacature "${a.vacancyTitle}"` : "de open sollicitatie"}.`, [
      { label: "Naam", value: a.name },
      { label: "E-mail", value: a.email },
      { label: "Telefoon", value: a.phone },
      { label: "CV", value: a.hasCv ? "meegestuurd — bekijk in het Postvak IN" : "niet meegestuurd" },
    ], a.motivation)
  );
}
