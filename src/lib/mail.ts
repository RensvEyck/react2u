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
import { SAMENVATTING_LABELS, type CvSamenvatting } from "./cvSamenvatting";
import type { ContactInfo } from "./content";
import type { Vorm } from "./offertes";
import { merkVoorVorm } from "./offerteMerk";
import { offerteCodeHtml, offerteGetekendHtml, offerteMailHtml, type MailAfzender, type OfferteMail } from "./offerteMail";
import { brochureMailHtml, type MailDienst } from "./brochureMail";
import { contractCodeHtml, contractGetekendHtml, contractMailHtml, type ContractMail } from "./contractMail";

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
/** Een bijlage voor Resend: de inhoud gaat er als base64 heen. */
export type Bijlage = { filename: string; content: Buffer };

async function verstuur(to: string[], subject: string, html: string, replyTo?: string, bijlagen?: Bijlage[]): Promise<Verzonden> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM;
  if (!key || !from || !to.length) return { ok: false, reden: "uit" };

  try {
    const res = await fetch(api("/emails"), {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to, subject, html,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(bijlagen?.length ? { attachments: bijlagen.map((b) => ({ filename: b.filename, content: b.content.toString("base64") })) } : {}),
      }),
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

async function post(to: string[], subject: string, html: string, replyTo?: string, bijlagen?: Bijlage[]): Promise<boolean> {
  return (await verstuur(to, subject, html, replyTo, bijlagen)).ok;
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
    // Een tabel (het overzicht in een offertemail) mag niet in een <p>.
    .map((a) => (a.startsWith("<table") ? a : `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444">${a}</p>`))
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
  motivation: string | null; hasCv: boolean; linkedin?: string | null; via?: string | null; samenvatting?: CvSamenvatting | null; bron?: string | null; taal?: Taal;
}) {
  await send(
    `Nieuwe sollicitatie: ${a.vacancyTitle || "open sollicitatie"}`,
    render("Nieuwe sollicitatie", `Binnengekomen via ${a.vacancyTitle ? `de vacature "${a.vacancyTitle}"` : "de open sollicitatie"}.`, [
      { label: "Naam", value: a.name },
      { label: "E-mail", value: a.email },
      { label: "Telefoon", value: a.phone },
      { label: "CV", value: a.hasCv ? "meegestuurd — bekijk in het Postvak IN" : "niet meegestuurd" },
      { label: "LinkedIn", value: a.linkedin ?? null },
      { label: "Ingelogd met", value: a.via ? a.via.charAt(0).toUpperCase() + a.via.slice(1) : null },
      ...SAMENVATTING_LABELS.map(([k, label]) => ({ label, value: a.samenvatting?.[k] ?? null })),
      { label: "Bron", value: a.bron },
      taalVeld(a.taal),
    ], [a.samenvatting?.samenvatting ? `Uit het cv: ${a.samenvatting.samenvatting}` : "", a.motivation || ""].filter(Boolean).join("\n\n") || null)
  );
}

/**
 * Offerteaanvragen gaan naar sales, niet naar het algemene meldadres.
 * Een ander adres zet je met NOTIFY_OFFERTE_TO (komma-gescheiden mag).
 */
export async function notifyOfferte(o: {
  name: string; company: string; email: string; phone: string;
  pakket: string; employees: number; message: string | null; taal?: Taal;
  /** Partnercode uit de aanmeldlink, als de aanvraag via een partner kwam. */
  partner?: string | null;
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
      { label: "Via partner", value: o.partner },
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

/** Aanmelding voor het partnerprogramma (/partners): naar sales, net als offertes. */
export async function notifyPartner(p: {
  name: string; company: string; email: string; phone: string; soort: string; omvang: string | null; path: string;
}) {
  await send(
    `Partneraanmelding: ${p.company}`,
    render("Nieuwe partneraanmelding", `Via ${p.path}. Wil teruggebeld worden over het partnerprogramma.`, [
      { label: "Naam", value: p.name },
      { label: "Kantoor", value: p.company },
      { label: "Soort kantoor", value: p.soort },
      { label: "Werkgevers in het klantenbestand", value: p.omvang },
      { label: "E-mail", value: p.email },
      { label: "Telefoon", value: p.phone },
    ]),
    process.env.NOTIFY_OFFERTE_TO || "sales@react2u.nl"
  );
}

/**
 * Bevestiging aan de sollicitant zelf, in de taal waarin hij solliciteerde.
 * Snel en persoonlijk reageren is waar kandidaten op afhaken; deze mail
 * overbrugt de tijd tot het eerste telefoontje. Gaat naar het adres van de
 * kandidaat, niet naar NOTIFY_TO.
 */
export async function bevestigSollicitatie(b: { to: string; name: string; vacancyTitle: string | null; taal?: Taal }) {
  const en = b.taal === "en";
  const voornaam = esc(b.name.split(" ")[0] || b.name);
  const functie = b.vacancyTitle ? esc(b.vacancyTitle) : en ? "React2u" : "React2u";
  const html = en
    ? `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;color:#1c1a4e;font-size:15px;line-height:1.65">
  <p style="margin:0 0 14px">Hi ${voornaam},</p>
  <p style="margin:0 0 14px">Thank you for applying${b.vacancyTitle ? ` for <strong>${functie}</strong>` : ""}. We have received your application and will contact you within 5 working days.</p>
  <p style="margin:0 0 6px"><strong>What happens next</strong></p>
  <ul style="margin:0 0 14px;padding-left:18px"><li>We call or email you to get acquainted</li><li>A first meeting at our office in Eindhoven, or online</li><li>A second meeting with the team, and if it is a match, an offer</li></ul>
  <p style="margin:0 0 14px">Any questions in the meantime? Email rens@react2u.nl.</p>
  <p style="margin:0">Kind regards,<br>Rens van Eyck<br><span style="color:#666">Owner, React2u</span></p>
</div>`
    : `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;color:#1c1a4e;font-size:15px;line-height:1.65">
  <p style="margin:0 0 14px">Hoi ${voornaam},</p>
  <p style="margin:0 0 14px">Bedankt voor je sollicitatie${b.vacancyTitle ? ` als <strong>${functie}</strong>` : ""}. We hebben hem goed ontvangen en nemen binnen 5 werkdagen contact met je op.</p>
  <p style="margin:0 0 6px"><strong>Zo gaat het verder</strong></p>
  <ul style="margin:0 0 14px;padding-left:18px"><li>We bellen of mailen je om kennis te maken</li><li>Een eerste gesprek bij ons op kantoor in Eindhoven, of online</li><li>Een tweede gesprek met het team en klikt het, dan een aanbod</li></ul>
  <p style="margin:0 0 14px">Heb je in de tussentijd vragen? Mail gerust naar rens@react2u.nl.</p>
  <p style="margin:0">Groet,<br>Rens van Eyck<br><span style="color:#666">Eigenaar React2u</span></p>
</div>`;
  await post([b.to], en ? "We have received your application" : "We hebben je sollicitatie ontvangen", html);
}

/* ---------- offertes (migratie 0024) ---------- */

// De mails aan de klant (offerte, code, bevestiging) staan in lib/offerteMail.ts,
// in de vormgeving van de site. De meldingen aan sales hieronder blijven sober.

type Afzender = MailAfzender;

/** De opmaak van het label van de offerte (Recover, Resist, Restart); zonder vorm die van Recover. */
const merkVan = (vorm: Vorm | null | undefined) => (vorm ? merkVoorVorm(vorm) : null);

/**
 * De offerte naar de klant: een persoonlijke mail met één knop naar de
 * offertepagina. Antwoorden gaat naar de collega die hem stuurt.
 */
export async function sendOfferte(o: {
  to: string; aanhef: string | null; bedrijf: string; nummer: string; link: string; titel?: string | null;
  bericht: string | null; geldigTot: string | null; afzender: Afzender; herinnering?: boolean;
  /** Het label bepaalt kleur en woordmerk bovenaan. */
  vorm?: Vorm | null;
  /** Bedrag, geldigheid en onderdelen voor de offertekaart (offerteSamenvatting). */
  samenvatting?: Pick<OfferteMail, "feiten" | "onderdelen" | "opties" | "kiezen">;
  contact?: ContactInfo;
}): Promise<Verzonden> {
  const html = offerteMailHtml({
    basis: siteBasis(),
    merk: merkVan(o.vorm),
    aanhef: o.aanhef,
    bedrijf: o.bedrijf,
    nummer: o.nummer,
    titel: o.titel,
    link: o.link,
    bericht: o.bericht,
    geldigTot: o.geldigTot,
    afzender: o.afzender,
    herinnering: o.herinnering,
    contact: o.contact,
    ...o.samenvatting,
  });
  const onderwerp = `${o.herinnering ? "Herinnering: o" : "O"}fferte ${o.nummer} voor ${o.bedrijf}`;
  return verstuur([o.to], onderwerp, html, o.afzender.email || undefined);
}

/**
 * De code waarmee wie tekent zijn e-mailadres bevestigt (0026). De code staat
 * vooraan in het onderwerp, zodat hij al in de melding op de telefoon staat.
 */
export async function sendOfferteCode(c: {
  to: string; code: string; nummer: string; bedrijf: string; afzender: Afzender; vorm?: Vorm | null; contact?: ContactInfo;
}): Promise<Verzonden> {
  const html = offerteCodeHtml({
    basis: siteBasis(), merk: merkVan(c.vorm), code: c.code, nummer: c.nummer, bedrijf: c.bedrijf, afzender: c.afzender, contact: c.contact,
  });
  return verstuur([c.to], `${c.code} is je code voor offerte ${c.nummer}`, html, c.afzender.email || undefined);
}

/** Het factuurblok in de mail aan sales: adres, e-mail, KvK en inkoopnummer. */
function factuurHtml(f: { email?: string; adres?: string; postcode?: string; plaats?: string; kvk?: string; inkoopnummer?: string; tav?: string } | null) {
  if (!f) return "";
  const regels = [
    f.tav ? `T.a.v. ${f.tav}` : "", f.adres || "", [f.postcode, f.plaats].filter(Boolean).join(" "),
    f.email ? `Facturen naar ${f.email}` : "", f.kvk ? `KvK ${f.kvk}` : "", f.inkoopnummer ? `Inkoopnummer ${f.inkoopnummer}` : "",
  ].filter(Boolean);
  return `<strong>Factuurgegevens</strong><br>${regels.map(esc).join("<br>")}`;
}

/**
 * Bevestiging aan wie tekende: wat er getekend is, met de getekende offerte
 * als pdf (met het ondertekeningscertificaat) en de link om hem terug te zien.
 */
export async function bevestigOfferteGetekend(b: {
  to: string; naam: string; bedrijf: string; nummer: string; link: string; hash: string; moment: string;
  regels: { naam: string; bedrag: string }[]; totalen: { label: string; bedrag: string }[]; afzender: Afzender; pdf?: Bijlage | null;
  vorm?: Vorm | null; vervolg?: { kop: string; tekst: string }[] | null; contact?: ContactInfo;
}): Promise<Verzonden> {
  const html = offerteGetekendHtml({
    basis: siteBasis(), merk: merkVan(b.vorm), naam: b.naam, bedrijf: b.bedrijf, nummer: b.nummer, link: b.link, hash: b.hash,
    moment: b.moment, regels: b.regels, totalen: b.totalen, afzender: b.afzender, vervolg: b.vervolg, pdf: Boolean(b.pdf), contact: b.contact,
  });
  return verstuur([b.to], `Ondertekend: offerte ${b.nummer} voor ${b.bedrijf}`, html, b.afzender.email || undefined, b.pdf ? [b.pdf] : undefined);
}

/** Wie meldingen over een offerte krijgt: sales (NOTIFY_OFFERTE_TO) en de collega die hem stuurde. */
function offerteOntvangers(afzender: string | null) {
  return [...new Set([...adressen(process.env.NOTIFY_OFFERTE_TO || "sales@react2u.nl"), ...(afzender ? [afzender] : [])])];
}

export async function notifyOfferteGetekend(n: {
  nummer: string; bedrijf: string; naam: string; functie: string | null; email: string; perMaand: string; eenmalig: string | null;
  regels: string[]; adminLink: string; afzenderEmail: string | null;
  factuur?: Parameters<typeof factuurHtml>[0]; pdf?: Bijlage | null;
}) {
  await post(
    offerteOntvangers(n.afzenderEmail),
    `Getekend: offerte ${n.nummer} voor ${n.bedrijf} (${n.perMaand} per maand)`,
    persoonlijk(
      `${n.bedrijf} heeft getekend`,
      [
        `${esc(n.naam)}${n.functie ? ` (${esc(n.functie)})` : ""} heeft offerte ${esc(n.nummer)} zojuist online ondertekend.`,
        `<strong>${esc(n.perMaand)} per maand</strong>${n.eenmalig ? ` en ${esc(n.eenmalig)} eenmalig` : ""}, exclusief btw.`,
        `Gekozen: ${n.regels.map(esc).join(", ")}.`,
        ...(n.factuur ? [factuurHtml(n.factuur)] : []),
        `E-mailadres ${esc(n.email)} bevestigd met een code; de bevestiging met de pdf is daarheen gestuurd.${n.pdf ? " De getekende offerte zit ook bij deze mail." : ""}`,
      ],
      { tekst: "Open de offerte", link: n.adminLink }
    ),
    undefined,
    n.pdf ? [n.pdf] : undefined
  );
}

export async function notifyOfferteAfgewezen(n: {
  nummer: string; bedrijf: string; reden: string | null; naam: string | null; adminLink: string; afzenderEmail: string | null;
}) {
  await post(
    offerteOntvangers(n.afzenderEmail),
    `Niet akkoord: offerte ${n.nummer} voor ${n.bedrijf}`,
    persoonlijk(
      `${n.bedrijf} gaat niet akkoord`,
      [
        `${n.naam ? esc(n.naam) : "De klant"} heeft bij offerte ${esc(n.nummer)} aangegeven niet akkoord te gaan.`,
        n.reden ? `Toelichting: &ldquo;${esc(n.reden)}&rdquo;` : "Er is geen toelichting gegeven.",
        "Bellen loont: vaak is het de prijs of één onderdeel. Je kunt de offerte aanpassen en heropenen.",
      ],
      { tekst: "Open de offerte", link: n.adminLink }
    )
  );
}

/** De eerste keer dat de klant de offerte opent: alleen naar de collega die hem stuurde. */
export async function notifyOfferteBekeken(n: { to: string; nummer: string; bedrijf: string; adminLink: string }) {
  await post(
    [n.to],
    `${n.bedrijf} bekijkt je offerte`,
    persoonlijk(
      `${n.bedrijf} heeft de offerte geopend`,
      [`Offerte ${esc(n.nummer)} is zojuist voor het eerst geopend. Een goed moment om even te bellen.`],
      { tekst: "Open de offerte", link: n.adminLink }
    )
  );
}

/** Adres van een offerte in het beheer, voor de meldingen. */
export function offerteAdminUrl(id: string) {
  return `${siteBasis()}/admin/offertes/${id}`;
}

/** Adres van de offertepagina voor de klant. */
export function offerteUrl(token: string) {
  return `${siteBasis()}/offerte/${token}`;
}

/* ---------- brochures (migratie 0030) ---------- */

/**
 * De brochure naar de prospect: een persoonlijke mail met één knop naar de
 * brochurepagina, in de kleuren van React2u zelf (lib/brochureMail.ts).
 * Antwoorden gaat naar de collega die hem stuurt.
 */
export async function sendBrochure(b: {
  to: string; aanhef: string | null; bedrijf: string; nummer: string; link: string; bericht: string | null;
  afzender: Afzender; herinnering?: boolean; diensten: MailDienst[]; contact?: ContactInfo;
}): Promise<Verzonden> {
  const { to, ...rest } = b;
  const html = brochureMailHtml({ basis: siteBasis(), ...rest });
  const onderwerp = `${b.herinnering ? "Herinnering: b" : "B"}rochure van React2u voor ${b.bedrijf}`;
  return verstuur([to], onderwerp, html, b.afzender.email || undefined);
}

export async function notifyBrochureBekeken(n: { to: string; nummer: string; bedrijf: string; adminLink: string }) {
  await post(
    [n.to],
    `${n.bedrijf} bekijkt je brochure`,
    persoonlijk(
      `${n.bedrijf} heeft de brochure geopend`,
      [`Brochure ${esc(n.nummer)} is zojuist voor het eerst geopend. Een goed moment om even te bellen.`],
      { tekst: "Open de brochure", link: n.adminLink }
    )
  );
}

export function brochureAdminUrl(id: string) {
  return `${siteBasis()}/admin/brochures/${id}`;
}

export function brochureUrl(token: string) {
  return `${siteBasis()}/brochure/${token}`;
}

/* ---------- contracten (migratie 0031) ---------- */

/**
 * Het basiscontract naar de klant: een persoonlijke mail met één knop naar de
 * contractpagina (lib/contractMail.ts). Antwoorden gaat naar de afzender.
 */
export async function sendContract(c: Omit<ContractMail, "basis"> & { to: string }): Promise<Verzonden> {
  const { to, ...rest } = c;
  const html = contractMailHtml({ basis: siteBasis(), ...rest });
  const onderwerp = `${c.herinnering ? "Herinnering: b" : "B"}asiscontract ${c.nummer} voor ${c.bedrijf}`;
  return verstuur([to], onderwerp, html, c.afzender.email || undefined);
}

/** De code waarmee wie tekent zijn e-mailadres bevestigt; vooraan in het onderwerp, net als bij offertes. */
export async function sendContractCode(c: { to: string; code: string; nummer: string; bedrijf: string; afzender: Afzender; contact?: ContactInfo }): Promise<Verzonden> {
  const html = contractCodeHtml({ basis: siteBasis(), code: c.code, nummer: c.nummer, bedrijf: c.bedrijf, afzender: c.afzender, contact: c.contact });
  return verstuur([c.to], `${c.code} is je code voor contract ${c.nummer}`, html, c.afzender.email || undefined);
}

/** Bevestiging aan wie tekende, met het getekende contract als pdf (met het ondertekeningscertificaat). */
export async function bevestigContractGetekend(b: {
  to: string; naam: string; bedrijf: string; nummer: string; link: string; hash: string; moment: string;
  regels: { label: string; waarde: string }[]; afzender: Afzender; pdf?: Bijlage | null; contact?: ContactInfo;
}): Promise<Verzonden> {
  const html = contractGetekendHtml({
    basis: siteBasis(), naam: b.naam, bedrijf: b.bedrijf, nummer: b.nummer, link: b.link, hash: b.hash, moment: b.moment,
    regels: b.regels, afzender: b.afzender, pdf: Boolean(b.pdf), contact: b.contact,
  });
  return verstuur([b.to], `Ondertekend: basiscontract ${b.nummer} voor ${b.bedrijf}`, html, b.afzender.email || undefined, b.pdf ? [b.pdf] : undefined);
}

export async function notifyContractGetekend(n: {
  nummer: string; bedrijf: string; naam: string; functie: string; email: string; organisatie: string[]; looptijd: string;
  adminLink: string; afzenderEmail: string | null; pdf?: Bijlage | null;
}) {
  await post(
    offerteOntvangers(n.afzenderEmail),
    `Getekend: basiscontract ${n.nummer} voor ${n.bedrijf}`,
    persoonlijk(
      `${n.bedrijf} heeft het basiscontract getekend`,
      [
        `${esc(n.naam)} (${esc(n.functie)}) heeft basiscontract ${esc(n.nummer)} zojuist online ondertekend.`,
        `<strong>Looptijd</strong><br>${esc(n.looptijd)}`,
        `<strong>Opdrachtgever</strong><br>${n.organisatie.map(esc).join("<br>")}`,
        `E-mailadres ${esc(n.email)} bevestigd met een code; de bevestiging met de pdf is daarheen gestuurd.${n.pdf ? " Het getekende contract zit ook bij deze mail." : ""}`,
      ],
      { tekst: "Open het contract", link: n.adminLink }
    ),
    undefined,
    n.pdf ? [n.pdf] : undefined
  );
}

/** De eerste keer dat de klant het contract opent: alleen naar de collega die het stuurde. */
export async function notifyContractBekeken(n: { to: string; nummer: string; bedrijf: string; adminLink: string }) {
  await post(
    [n.to],
    `${n.bedrijf} bekijkt het basiscontract`,
    persoonlijk(
      `${n.bedrijf} heeft het basiscontract geopend`,
      [`Contract ${esc(n.nummer)} is zojuist voor het eerst geopend. Een goed moment om even te bellen.`],
      { tekst: "Open het contract", link: n.adminLink }
    )
  );
}

export function contractAdminUrl(id: string) {
  return `${siteBasis()}/admin/contracten/${id}`;
}

export function contractUrl(token: string) {
  return `${siteBasis()}/contract/${token}`;
}
