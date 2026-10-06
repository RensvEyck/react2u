// Mail: de melding bij binnenkomende inzendingen, de bevestiging aan wie het
// formulier invulde, en de uitnodiging voor collega's.
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

import { CONTACT_FALLBACK, OPENINGSTIJDEN, type ContactInfo } from "./content";
import { BEVESTIGING } from "./bevestiging";
import { DOCUMENTEN } from "./documenten";
import { LOGO_URL } from "./nav";
import { ROZE } from "./kleuren";

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
  <p style="margin:20px 0 0;font-size:13px;color:#888">Behandel deze inzending in het <a href="${esc(adminUrl())}" style="color:${ROZE}">Postvak IN</a>.</p>
</div>`;
}

function siteUrl() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "https://react2u.nl";
  return base.replace(/\/$/, "");
}

function adminUrl() {
  return `${siteUrl()}/admin/postvak-in`;
}

/**
 * Eén POST naar Resend. Geeft terug of de mail is aangenomen; gooit nooit.
 *
 * Zonder sleutel of afzender doet dit niets — stil, zie regel 1 bovenaan.
 * `replyTo` is het adres dat een antwoord krijgt: de bevestiging aan een
 * bezoeker komt van een geen-antwoord-adres, maar "beantwoorden" moet gewoon
 * bij het team uitkomen.
 */
async function post(to: string[], subject: string, html: string, replyTo?: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM;
  if (!key || !from || !to.length) return false;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
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

const adressen = (s: string | undefined) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);

async function send(subject: string, html: string, toOverride?: string) {
  await post(adressen(toOverride || process.env.NOTIFY_TO), subject, html);
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
  <p style="margin:0 0 24px"><a href="${esc(i.link)}" style="display:inline-block;background:${ROZE};color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:12px">Wachtwoord kiezen</a></p>
  <p style="margin:0 0 6px;font-size:13px;color:#888">Werkt de knop niet? Kopieer deze link naar je browser:</p>
  <p style="margin:0 0 20px;font-size:12px;word-break:break-all;color:#312e82">${esc(i.link)}</p>
  <p style="margin:0;font-size:13px;color:#888">De link werkt één keer. Verwachtte je deze mail niet, dan kun je hem negeren.</p>
</div>`;
  return post([i.to], "Je uitnodiging voor het beheer van react2u.nl", html);
}

/* ---------- Melding aan het team ---------- */

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

/** Waar offerteaanvragen heen gaan: sales, tenzij NOTIFY_OFFERTE_TO anders zegt. */
const offerteAdres = () => process.env.NOTIFY_OFFERTE_TO || "sales@react2u.nl";

/**
 * Offerteaanvragen gaan naar sales, niet naar het algemene meldadres.
 * Een ander adres zet je met NOTIFY_OFFERTE_TO (komma-gescheiden mag).
 */
export async function notifyOfferte(o: {
  name: string; company: string; email: string; phone: string;
  pakket: string; employees: string; message: string | null;
}) {
  await send(
    `Offerteaanvraag ${o.pakket}: ${o.company}`,
    render("Nieuwe offerteaanvraag", "Binnengekomen via de website.", [
      { label: "Aansluiting", value: o.pakket },
      { label: "Bedrijf", value: o.company },
      { label: "Medewerkers", value: o.employees },
      { label: "Naam", value: o.name },
      { label: "E-mail", value: o.email },
      { label: "Telefoon", value: o.phone },
    ], o.message),
    offerteAdres()
  );
}

/* ---------- Bevestiging aan de invuller ---------- */

// Dezelfde opzet voor alle drie: logo, aanhef, wat er nu gebeurt, eventueel een
// samenvatting en een knop, en onderaan hoe je ons bereikt. Alles inline, want
// mailprogramma's lezen geen stylesheet. `true` als Resend de mail aannam;
// de bedankmelding op het scherm zegt dan dat er een bevestiging onderweg is.

const INDIGO = "#312e82";

function voornaam(naam: string) {
  return naam.trim().split(/\s+/)[0] || "";
}

function samenvatting(rijen: Field[]) {
  const rows = rijen
    .filter((r) => r.value)
    .map(
      (r) =>
        `<tr><td style="padding:5px 18px 5px 0;font-size:14px;color:#6b6984;white-space:nowrap;vertical-align:top">${esc(r.label)}</td>` +
        `<td style="padding:5px 0;font-size:14px;color:${INDIGO};font-weight:600">${esc(String(r.value))}</td></tr>`
    )
    .join("");
  return rows
    ? `<table role="presentation" style="border-collapse:collapse;margin:0 0 22px;background:#f6f5fb;border-radius:12px;padding:0"><tr><td style="padding:14px 18px"><table role="presentation" style="border-collapse:collapse">${rows}</table></td></tr></table>`
    : "";
}

function knop(label: string, href: string) {
  return `<p style="margin:0 0 24px"><a href="${esc(href)}" style="display:inline-block;background:${ROZE};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 24px;border-radius:999px">${esc(label)}</a></p>`;
}

function brief(o: {
  naam: string;
  kop: string;
  tekst: string;
  /** Alinea's onder de hoofdtekst, al als HTML. */
  extra?: string;
  contact: ContactInfo;
}) {
  const c = { ...CONTACT_FALLBACK, ...o.contact };
  const adres = [c.addressLine1, c.addressLine2].filter(Boolean).map(esc).join(", ");
  const aanhef = voornaam(o.naam) ? `Hallo ${esc(voornaam(o.naam))},` : "Hallo,";
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(o.kop)}</title></head>
<body style="margin:0;padding:0;background:#f6f5fb">
<table role="presentation" width="100%" style="border-collapse:collapse;background:#f6f5fb"><tr><td align="center" style="padding:28px 16px">
<table role="presentation" width="100%" style="max-width:560px;border-collapse:collapse;background:#ffffff;border-radius:20px">
  <tr><td style="padding:28px 32px 8px"><img src="${esc(LOGO_URL)}" alt="React2u" width="110" height="68" style="display:block;width:110px;height:auto;border:0"></td></tr>
  <tr><td style="padding:12px 32px 0;font-family:'DM Sans',system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1a4e">
    <p style="margin:0 0 14px;font-size:16px;line-height:1.6">${aanhef}</p>
    <h1 style="margin:0 0 10px;font-size:24px;line-height:1.2;color:${INDIGO};font-weight:700">${esc(o.kop)}.</h1>
    <p style="margin:0 0 22px;font-size:16px;line-height:1.6;color:#3c3a5c">${esc(o.tekst)}</p>
    ${o.extra ?? ""}
    <p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#3c3a5c">Eerder iets vragen? Bel ons op <a href="tel:${esc(c.phone)}" style="color:${INDIGO};font-weight:700;text-decoration:none">${esc(c.phoneDisplay)}</a>, ${esc(OPENINGSTIJDEN)}.</p>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#3c3a5c">Met vriendelijke groet,<br>het team van React2u</p>
  </td></tr>
  <tr><td style="padding:16px 32px 24px;border-top:1px solid #e6e5ef;font-family:'DM Sans',system-ui,-apple-system,'Segoe UI',sans-serif;font-size:13px;line-height:1.6;color:#6b6984">
    React2u${adres ? ` · ${adres}` : ""} · <a href="mailto:${esc(c.email)}" style="color:#6b6984">${esc(c.email)}</a> · <a href="${esc(siteUrl())}" style="color:#6b6984">react2u.nl</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/**
 * Bevestiging van een offerteaanvraag. Antwoorden komen bij sales uit. Met
 * `kennismakingUrl` (instelling) staat er een knop om zelf een afspraak te
 * plannen; zonder niet.
 */
export async function bevestigOfferte(o: {
  name: string; email: string; company: string; pakket: string; employees: string;
  kennismakingUrl: string; contact: ContactInfo;
}): Promise<boolean> {
  const html = brief({
    naam: o.name,
    kop: BEVESTIGING.offerte.kop,
    tekst: BEVESTIGING.offerte.tekst,
    extra:
      samenvatting([
        { label: "Interesse", value: o.pakket },
        { label: "Bedrijf", value: o.company },
        { label: "Aantal medewerkers", value: o.employees },
      ]) + (o.kennismakingUrl ? knop(BEVESTIGING.offerte.knop, o.kennismakingUrl) : ""),
    contact: o.contact,
  });
  return post([o.email], "Je aanvraag bij React2u", html, adressen(offerteAdres())[0]);
}

/**
 * Bevestiging van een contactbericht. Bewust zonder de inhoud van het bericht:
 * dat kan medische informatie bevatten, en die hoort niet in een mail te staan
 * die onderweg en in postvakken bewaard blijft.
 */
export async function bevestigContact(c: { name: string; email: string; contact: ContactInfo }): Promise<boolean> {
  const html = brief({
    naam: c.name,
    kop: BEVESTIGING.contact.kop,
    tekst: BEVESTIGING.contact.tekst,
    contact: c.contact,
  });
  return post([c.email], "Je bericht aan React2u", html, c.contact.email || CONTACT_FALLBACK.email);
}

/**
 * Bevestiging van een sollicitatie. Antwoorden komen uit op het adres dat ook
 * de sollicitatiemeldingen krijgt (NOTIFY_TO). Vermeldt de bewaartermijn, zoals
 * de privacyverklaring die beschrijft (zie ook lib/retention.ts).
 */
export async function bevestigSollicitatie(a: {
  name: string; email: string; vacancyTitle: string | null; werkdagen: number; contact: ContactInfo;
}): Promise<boolean> {
  const privacy = `${siteUrl()}${DOCUMENTEN.privacyverklaring}`;
  const html = brief({
    naam: a.name,
    kop: BEVESTIGING.sollicitatie.kop(a.vacancyTitle),
    tekst: BEVESTIGING.sollicitatie.tekst(a.werkdagen),
    extra: `<p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#6b6984">We bewaren je gegevens en je cv tot uiterlijk vier weken na afloop van de sollicitatieprocedure en verwijderen ze daarna. Hoe we met je gegevens omgaan staat in onze <a href="${esc(privacy)}" style="color:${INDIGO};font-weight:600">privacyverklaring</a> (PDF).</p>`,
    contact: a.contact,
  });
  const replyTo = adressen(process.env.NOTIFY_TO)[0] || a.contact.email || CONTACT_FALLBACK.email;
  return post([a.email], "Je sollicitatie bij React2u", html, replyTo);
}
