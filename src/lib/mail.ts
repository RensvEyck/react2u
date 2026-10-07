// Mail die het systeem zelf verstuurt: de melding bij binnenkomende inzendingen,
// de uitnodiging en wachtwoordlink voor collega's, de melding dat iemands
// tweestapsverificatie is gewist, en de testmail vanuit Instellingen.
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

import type { Taal } from "./taal";

// RESEND_API_URL alleen voor tests (een nepserver die vastlegt wat er verstuurd
// zou worden); in productie staat hij niet en is dit gewoon Resend.
const api = (pad: string) => `${(process.env.RESEND_API_URL || "https://api.resend.com").replace(/\/$/, "")}${pad}`;

/** In de mail: via welke taal van de site de inzending kwam; alleen vermeld als dat Engels was. */
function taalVeld(taal?: Taal): Field {
  return { label: "Taal", value: taal === "en" ? "Engelse site (/en)" : null };
}
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

function siteBasis() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "https://react2u.nl";
  return base.replace(/\/$/, "");
}

function adminUrl() {
  return `${siteBasis()}/admin/postvak-in`;
}

/** Uitkomst van één verzendpoging, met de reden als het niet lukte. */
export type Verzonden =
  | { ok: true }
  | { ok: false; reden: "uit" | "geweigerd" | "onbereikbaar"; melding?: string };

/**
 * Eén POST naar Resend. Gooit nooit; zegt wel waarom het niet lukte.
 *
 * Zonder sleutel of afzender doet dit niets — stil, zie regel 1 bovenaan.
 * `replyTo` is waar "beantwoorden" uitkomt: bij een uitnodiging de collega die
 * uitnodigde, niet een adres waar niemand meeleest.
 */
async function verstuur(to: string[], subject: string, html: string, replyTo?: string): Promise<Verzonden> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM;
  if (!key || !from || !to.length) return { ok: false, reden: "uit" };

  try {
    const res = await fetch(api("/emails"), {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return { ok: true };
    // Alleen loggen en teruggeven. De aanroeper heeft zijn werk al gedaan;
    // hier stoppen zou een foutmelding geven voor iets wat wél gelukt is.
    const tekst = await res.text().catch(() => "");
    console.error("[mail] Resend gaf %s: %s", res.status, tekst);
    let melding = tekst;
    try {
      melding = (JSON.parse(tekst) as { message?: string }).message || tekst;
    } catch {
      // geen JSON: dan de ruwe tekst
    }
    return { ok: false, reden: "geweigerd", melding: melding.slice(0, 300) };
  } catch (err) {
    console.error("[mail] versturen mislukt:", err);
    return { ok: false, reden: "onbereikbaar" };
  }
}

async function post(to: string[], subject: string, html: string, replyTo?: string): Promise<boolean> {
  return (await verstuur(to, subject, html, replyTo)).ok;
}

const adressen = (s: string | undefined) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);

async function send(subject: string, html: string, toOverride?: string) {
  await post(adressen(toOverride || process.env.NOTIFY_TO), subject, html);
}

/** Of er gemaild kan worden. Alleen of het gezet is, nooit de waarde. */
export function mailReady() {
  return Boolean(process.env.RESEND_API_KEY && process.env.NOTIFY_FROM);
}

/** Opmaak van de mails aan collega's: kop, tekst, één knop, en de link als tekst. */
function persoonlijk(kop: string, alineas: string[], knop?: { tekst: string; link: string }, voet?: string) {
  const p = alineas
    .map((a) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444">${a}</p>`)
    .join("");
  const k = knop
    ? `<p style="margin:8px 0 24px"><a href="${esc(knop.link)}" style="display:inline-block;background:#e75387;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:12px">${esc(knop.tekst)}</a></p>
  <p style="margin:0 0 6px;font-size:13px;color:#888">Werkt de knop niet? Kopieer deze link naar je browser:</p>
  <p style="margin:0 0 20px;font-size:12px;word-break:break-all;color:#312e82">${esc(knop.link)}</p>`
    : "";
  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;color:#1c1a4e">
  <h2 style="margin:0 0 12px;font-size:20px;color:#312e82">${esc(kop)}</h2>
  ${p}${k}
  ${voet ? `<p style="margin:0;font-size:13px;color:#888">${voet}</p>` : ""}
</div>`;
}

/**
 * De uitnodiging voor een collega, of de link voor een nieuw wachtwoord
 * (`soort: "recovery"`, de knop Wachtwoordlink bij Gebruikers). Antwoorden gaat
 * naar wie de link maakte.
 */
export async function sendInvite(i: {
  to: string; link: string; invitedBy: string; roleLabel: string;
  soort?: "invite" | "recovery"; replyTo?: string;
}): Promise<Verzonden> {
  const nieuw = i.soort !== "recovery";
  const html = nieuw
    ? persoonlijk(
        "Je bent uitgenodigd voor het beheer van react2u.nl",
        [
          `${esc(i.invitedBy)} heeft je toegang gegeven als <strong>${esc(i.roleLabel)}</strong>. Kies een wachtwoord en je kunt meteen aan de slag.`,
          "Daarna stel je tweestapsverificatie in met een app op je telefoon, zoals Microsoft Authenticator of Google Authenticator. Dat is één keer, twee minuten.",
        ],
        { tekst: "Wachtwoord kiezen", link: i.link },
        "De link werkt één keer en een beperkte tijd. Verwachtte je deze mail niet, dan kun je hem negeren."
      )
    : persoonlijk(
        "Kies een nieuw wachtwoord voor het beheer van react2u.nl",
        [
          `${esc(i.invitedBy)} heeft een link voor je gemaakt waarmee je een nieuw wachtwoord kiest voor je account (${esc(i.roleLabel)}).`,
          "Daarna log je in zoals altijd, met de code uit je authenticator-app.",
        ],
        { tekst: "Nieuw wachtwoord kiezen", link: i.link },
        "De link werkt één keer en een beperkte tijd. Vroeg je hier niet om, laat het dan weten aan wie hem stuurde."
      );
  const onderwerp = nieuw ? "Je uitnodiging voor het beheer van react2u.nl" : "Nieuw wachtwoord kiezen voor het beheer van react2u.nl";
  return verstuur([i.to], onderwerp, html, i.replyTo);
}

/**
 * Melding aan een collega dat zijn tweestapsverificatie is gewist. Hoort bij
 * elke wijziging aan iemands beveiliging: was het niet de bedoeling, dan weet
 * hij het meteen.
 */
export async function sendMfaResetNotice(n: { to: string; door: string }): Promise<Verzonden> {
  const html = persoonlijk(
    "Je tweestapsverificatie is gewist",
    [
      `${esc(n.door)} heeft de tweestapsverificatie van je account voor het beheer van react2u.nl gewist, bijvoorbeeld omdat je een nieuwe telefoon hebt.`,
      "De volgende keer dat je inlogt, stel je hem opnieuw in met een app op je telefoon.",
    ],
    undefined,
    `Was dit niet de bedoeling? Neem dan meteen contact op met ${esc(n.door)}.`
  );
  return verstuur([n.to], "Je tweestapsverificatie voor react2u.nl is gewist", html, n.door);
}

/** Testmail vanuit Instellingen: werkt de koppeling, en komt het aan? */
export async function sendTestMail(to: string): Promise<Verzonden> {
  const html = persoonlijk(
    "Testmail van react2u.nl",
    [
      "Deze mail komt van de website zelf. Komt hij aan, dan werken ook de meldingen bij nieuwe berichten en sollicitaties, de uitnodigingen voor collega's en de wachtwoordlinks.",
      `Verstuurd vanaf ${esc(process.env.NOTIFY_FROM || "")} op ${esc(new Date().toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" }))}.`,
    ],
    { tekst: "Naar het beheer", link: `${siteBasis()}/admin` }
  );
  return verstuur([to], "Testmail van react2u.nl", html);
}

/* ---------- status, voor Instellingen ---------- */

export type MailStatus = {
  sleutel: boolean;
  afzender: string | null;
  meldingenNaar: string[];
  offertesNaar: string[];
};

/** Hoe het mailen is ingesteld. Adressen zijn geen geheim; de sleutel alleen of hij er is. */
export function mailStatus(): MailStatus {
  return {
    sleutel: Boolean(process.env.RESEND_API_KEY),
    afzender: process.env.NOTIFY_FROM || null,
    meldingenNaar: adressen(process.env.NOTIFY_TO),
    offertesNaar: adressen(process.env.NOTIFY_OFFERTE_TO || "sales@react2u.nl"),
  };
}

export type DomeinStatus =
  | { soort: "geverifieerd"; domein: string }
  | { soort: "wacht"; domein: string; status: string }
  | { soort: "ontbreekt"; domein: string }
  | { soort: "onbekend" };

/**
 * Staat het domein van de afzender geverifieerd bij Resend? Zonder dat
 * weigert Resend elke mail (en zou DMARC p=reject hem toch tegenhouden).
 * Een sleutel met alleen verzendrecht mag de domeinen niet lezen: dan
 * "onbekend", en geeft de testmail uitsluitsel.
 */
export async function domeinStatus(): Promise<DomeinStatus> {
  const key = process.env.RESEND_API_KEY;
  const domein = (process.env.NOTIFY_FROM || "").match(/@([^>\s]+)/)?.[1]?.toLowerCase();
  if (!key || !domein) return { soort: "onbekend" };
  try {
    const res = await fetch(api("/domains"), {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return { soort: "onbekend" };
    const lijst = ((await res.json()) as { data?: { name: string; status: string }[] }).data ?? [];
    const d = lijst.find((x) => x.name.toLowerCase() === domein);
    if (!d) return { soort: "ontbreekt", domein };
    return d.status === "verified" ? { soort: "geverifieerd", domein } : { soort: "wacht", domein, status: d.status };
  } catch {
    return { soort: "onbekend" };
  }
}

export async function notifyContactMessage(m: {
  name: string; email: string; phone: string; subject: string; message: string; taal?: Taal;
}) {
  await send(
    `Nieuw bericht via de website${m.subject ? `: ${m.subject}` : ""}`,
    render("Nieuw contactbericht", "Binnengekomen via het contactformulier op de website.", [
      { label: "Naam", value: m.name },
      { label: "E-mail", value: m.email },
      { label: "Telefoon", value: m.phone },
      { label: "Onderwerp", value: m.subject || "(geen onderwerp)" },
      taalVeld(m.taal),
    ], m.message)
  );
}

export async function notifyApplication(a: {
  name: string; email: string; phone: string | null; vacancyTitle: string | null;
  motivation: string | null; hasCv: boolean; taal?: Taal;
}) {
  await send(
    `Nieuwe sollicitatie: ${a.vacancyTitle || "open sollicitatie"}`,
    render("Nieuwe sollicitatie", `Binnengekomen via ${a.vacancyTitle ? `de vacature "${a.vacancyTitle}"` : "de open sollicitatie"}.`, [
      { label: "Naam", value: a.name },
      { label: "E-mail", value: a.email },
      { label: "Telefoon", value: a.phone },
      { label: "CV", value: a.hasCv ? "meegestuurd — bekijk in het Postvak IN" : "niet meegestuurd" },
      taalVeld(a.taal),
    ], a.motivation)
  );
}

/**
 * Offerteaanvragen gaan naar sales, niet naar het algemene meldadres.
 * Een ander adres zet je met NOTIFY_OFFERTE_TO (komma-gescheiden mag).
 */
export async function notifyOfferte(o: {
  name: string; company: string; email: string; phone: string;
  pakket: string; employees: number; message: string | null; taal?: Taal;
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
      taalVeld(o.taal),
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
