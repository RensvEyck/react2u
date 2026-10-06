// Notificatiemail bij binnenkomende inzendingen, en de uitnodiging voor collega's.
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

/**
 * Eén POST naar Resend. Geeft terug of de mail is aangenomen; gooit nooit.
 *
 * Zonder sleutel of afzender doet dit niets — stil, zie regel 1 bovenaan.
 */
async function post(to: string[], subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM;
  if (!key || !from || !to.length) return false;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      // Alleen loggen. De aanroeper heeft zijn werk al gedaan; hier stoppen zou
      // een foutmelding geven voor iets wat wél gelukt is.
      console.error("[mail] Resend gaf %s: %s", res.status, await res.text().catch(() => ""));
    }
    return res.ok;
  } catch (err) {
    console.error("[mail] versturen mislukt:", err);
    return false;
  }
}

async function send(subject: string, html: string, toOverride?: string) {
  const to = (toOverride || process.env.NOTIFY_TO || "").split(",").map((s) => s.trim()).filter(Boolean);
  await post(to, subject, html);
}

/** Of er gemaild kan worden. Alleen of het gezet is, nooit de waarde. */
export function mailReady() {
  return Boolean(process.env.RESEND_API_KEY && process.env.NOTIFY_FROM);
}

/**
 * De uitnodiging voor een collega. `true` als Resend hem heeft aangenomen;
 * anders toont het scherm de link om zelf door te sturen.
 */
export async function sendInvite(i: { to: string; link: string; invitedBy: string; roleLabel: string }) {
  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;color:#1c1a4e">
  <h2 style="margin:0 0 8px;font-size:20px;color:#312e82">Je bent uitgenodigd voor het beheer van react2u.nl</h2>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#444">${esc(i.invitedBy)} heeft je toegang gegeven als <strong>${esc(i.roleLabel)}</strong>. Kies een wachtwoord en je kunt meteen aan de slag.</p>
  <p style="margin:0 0 24px"><a href="${esc(i.link)}" style="display:inline-block;background:#e75387;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:12px">Wachtwoord kiezen</a></p>
  <p style="margin:0 0 6px;font-size:13px;color:#888">Werkt de knop niet? Kopieer deze link naar je browser:</p>
  <p style="margin:0 0 20px;font-size:12px;word-break:break-all;color:#312e82">${esc(i.link)}</p>
  <p style="margin:0;font-size:13px;color:#888">De link werkt één keer. Verwachtte je deze mail niet, dan kun je hem negeren.</p>
</div>`;
  return post([i.to], "Je uitnodiging voor het beheer van react2u.nl", html);
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

/**
 * Offerteaanvragen gaan naar sales, niet naar het algemene meldadres.
 * Een ander adres zet je met NOTIFY_OFFERTE_TO (komma-gescheiden mag).
 */
export async function notifyOfferte(o: {
  name: string; company: string; email: string; phone: string;
  pakket: string; employees: number; message: string | null;
}) {
  await send(
    `Offerteaanvraag ${o.pakket}: ${o.company}`,
    render("Nieuwe offerteaanvraag", "Binnengekomen via de pagina Verzuimabonnementen op de website.", [
      { label: "Aansluiting", value: o.pakket },
      { label: "Bedrijf", value: o.company },
      { label: "Medewerkers", value: String(o.employees) },
      { label: "Naam", value: o.name },
      { label: "E-mail", value: o.email },
      { label: "Telefoon", value: o.phone },
    ], o.message),
    process.env.NOTIFY_OFFERTE_TO || "sales@react2u.nl"
  );
}

/**
 * Terugbelverzoek vanuit de belbalk op de werkgeverspagina's (mobiel). Een
 * lead voor sales, net als een offerteaanvraag.
 */
export async function notifyTerugbel(t: {
  name: string; phone: string; company: string | null; moment: string; path: string;
}) {
  await send(
    `Terugbelverzoek: ${t.name}${t.company ? ` (${t.company})` : ""}`,
    render("Nieuw terugbelverzoek", `Aangevraagd via de belbalk op ${t.path}.`, [
      { label: "Naam", value: t.name },
      { label: "Bedrijf", value: t.company },
      { label: "Telefoon", value: t.phone },
      { label: "Wanneer", value: t.moment },
    ]),
    process.env.NOTIFY_OFFERTE_TO || "sales@react2u.nl"
  );
}
