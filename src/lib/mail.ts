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
import type { Certificate } from "./nav";
import type { Vorm } from "./offertes";
import type { Notulen } from "./overleg";
import { merkVoorVorm } from "./offerteMerk";
import { FONT, FONT_KOP, KLEUR, offerteCodeHtml, offerteGetekendHtml, offerteMailHtml, omhulsel, p, vak, type MailAfzender, type OfferteMail, eyebrow, knop, linkAlsTekst } from "./offerteMail";
import { brochureMailHtml, type MailDienst } from "./brochureMail";
import { doorgestuurdHtml, machtigingGetekendHtml, machtigingMailHtml, onboardingKlantHtml, onboardingMailHtml, overdrachtMailHtml, type MachtigingMail, type MailDocument, type OnboardingKlantMail } from "./onboardingMail";
import { evaluatieIngevuldHtml, evaluatieMailHtml, type EvaluatieIngevuldMail, type EvaluatieMail } from "./evaluatieMail";
import { contractChecklistHtml, contractCodeHtml, contractGetekendHtml, contractMailHtml, type ContractMail } from "./contractMail";
import { CHECKLIST_NAAM } from "./contractChecklist";
import { CONTRACT_SOORT, soortVan, type ContractSoort } from "./contracten";

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

export function siteBasis() {
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
          "Heb je tweestapsverificatie al aan, dan vraagt die pagina eerst je code. Daarna log je in zoals altijd.",
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

/**
 * Een persoonlijke brief aan een kandidaat: de tekst zoals de collega hem in
 * het beheer heeft staan, en de groet, in het omhulsel van de klantmails (logo,
 * witte kaart op zand, voet met keurmerken). Geen kop, geen knop en geen label:
 * het is een bericht van een collega, geen campagne. Een aanhef ("Hoi Yasmin,")
 * staat iets donkerder; de laatste regel van de groet (het bedrijf) gedempt,
 * zoals een handtekening.
 */
function brief(b: { alineas: string[]; groet: string[]; onderwerp: string; taal?: Taal; contact?: ContactInfo; certificaten: Certificate[] }) {
  const regel = (t: string) => esc(t).replace(/\n/g, "<br>");
  const alineas = b.alineas.filter((a) => a.trim());
  const isAanhef = (a: string, i: number) => i === 0 && a.length <= 60 && !a.includes("\n") && a.trimEnd().endsWith(",");
  const [groet, naam, ...onder] = b.groet;
  const kaart = vak(`${alineas.map((a, i) => p(regel(a), isAanhef(a, i) ? `color:${KLEUR.inkt}` : "")).join("\n")}
<p style="margin:26px 0 0;font-family:${FONT};font-size:16px;line-height:1.5;color:${KLEUR.tekst}">${esc(groet || "")}</p>
${naam ? `<p style="margin:4px 0 0;font-family:${FONT_KOP};font-size:17px;line-height:1.35;font-weight:700;color:${KLEUR.inkt}">${esc(naam)}</p>` : ""}
${onder.map((r) => `<p style="margin:1px 0 0;font-family:${FONT};font-size:14px;line-height:1.5;color:${KLEUR.grijs}">${esc(r)}</p>`).join("\n")}`);
  return omhulsel({
    basis: siteBasis(),
    titel: b.onderwerp,
    // Naast het onderwerp in de inbox: de eerste echte zin, niet "Hoi Yasmin,".
    preheader: alineas.find((a, i) => !isAanhef(a, i)) || b.onderwerp,
    kaart,
    contact: b.contact, certificaten: b.certificaten,
    taal: b.taal,
  });
}

/**
 * Een persoonlijke mail aan een kandidaat vanuit Sollicitaties (begintekst uit
 * lib/kandidaatMail.ts, daarna door de collega aan te passen). Antwoorden komt
 * uit bij de collega die hem stuurde, niet bij het noreply-adres.
 */
export async function sendBrief(b: {
  to: string; subject: string; alineas: string[]; groet: string[]; replyTo?: string; taal?: Taal; contact?: ContactInfo; certificaten: Certificate[];
}): Promise<Verzonden> {
  const html = brief({ alineas: b.alineas, groet: b.groet, onderwerp: b.subject, taal: b.taal, contact: b.contact, certificaten: b.certificaten });
  return verstuur([b.to], b.subject, html, b.replyTo);
}

/**
 * De ochtendmail van het klantenbord (api/cron/klantenbord, inhoud uit
 * lib/ochtendmail.ts): per deel een kop en regels met een link naar de kaart.
 */
export async function sendOchtendmail(m: { to: string; onderwerp: string; aanhef: string; delen: { kop: string; regels: { bedrijf: string; tekst: string; sub: string | null; href: string }[] }[]; link: string; contact?: ContactInfo; certificaten: Certificate[] }): Promise<Verzonden> {
  const regel = (r: { bedrijf: string; tekst: string; sub: string | null; href: string }) =>
    `<tr><td style="padding:9px 0;border-top:1px solid ${KLEUR.lijn}">
      <a href="${esc(r.href)}" style="font-family:${FONT_KOP};font-size:15px;line-height:1.4;font-weight:700;color:${KLEUR.inkt};text-decoration:none">${esc(r.bedrijf)}</a>
      <div style="font-family:${FONT};font-size:14.5px;line-height:1.5;color:${KLEUR.tekst}">${esc(r.tekst)}</div>
      ${r.sub ? `<div style="font-family:${FONT};font-size:13px;line-height:1.5;color:${KLEUR.grijs}">${esc(r.sub)}</div>` : ""}
    </td></tr>`;
  const delen = m.delen
    .map(
      (d) => `${eyebrow(d.kop, KLEUR.indigo)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px">${d.regels.map(regel).join("")}</table>`
    )
    .join("");
  const kaart = vak(`${p(esc(m.aanhef), `color:${KLEUR.inkt}`)}
${p(esc("Dit staat vandaag op het klantenbord. Klik op een bedrijf om naar de kaart te gaan."))}
<div style="height:18px"></div>
${delen}
${knop("Open de werkrij van vandaag", m.link)}`);
  const html = omhulsel({ basis: siteBasis(), titel: m.onderwerp, preheader: m.onderwerp, kaart, contact: m.contact, certificaten: m.certificaten });
  return verstuur([m.to], m.onderwerp, html);
}

/**
 * De vrijdagherinnering van de weekevaluatie (api/cron/weekevaluatie, tekst
 * uit lib/weekevaluatie.ts): een korte persoonlijke mail met één knop naar
 * het eigen scherm. Antwoorden komt uit bij het meldingenadres.
 */
export async function sendWeekevaluatieHerinnering(h: {
  to: string; onderwerp: string; aanhef: string; alineas: string[]; knop: string; link: string; contact?: ContactInfo; certificaten: Certificate[];
}): Promise<Verzonden> {
  const kaart = vak(`${p(esc(h.aanhef), `color:${KLEUR.inkt}`)}
${h.alineas.map((a) => p(esc(a))).join("\n")}
<div style="height:6px"></div>
${knop(h.knop, h.link)}
<div style="height:22px"></div>
${linkAlsTekst(h.link)}`);
  const html = omhulsel({ basis: siteBasis(), titel: h.onderwerp, preheader: h.alineas[0] || h.onderwerp, kaart, contact: h.contact, certificaten: h.certificaten });
  return verstuur([h.to], h.onderwerp, html, adressen(process.env.NOTIFY_TO)[0]);
}

/**
 * De herinnering voor het CM-overleg (api/cron/overleg, tekst uit
 * lib/overleg.ts): de werkdag ervoor, met wanneer en waar, de agenda en de
 * eigen open actiepunten, en één knop naar het overleg.
 */
export async function sendOverlegHerinnering(h: {
  to: string; onderwerp: string; aanhef: string; intro: string; agenda: string[]; acties: string[]; link: string; contact?: ContactInfo; certificaten: Certificate[];
}): Promise<Verzonden> {
  const lijst = (items: string[]) =>
    `<ol style="margin:6px 0 20px;padding-left:22px;font-family:${FONT};font-size:15px;line-height:1.65;color:${KLEUR.tekst}">${items.map((i) => `<li style="margin:2px 0">${esc(i)}</li>`).join("")}</ol>`;
  const kaart = vak(`${p(esc(h.aanhef), `color:${KLEUR.inkt}`)}
${p(esc(h.intro))}
${eyebrow("Agenda", KLEUR.indigo)}
${lijst(h.agenda)}
${h.acties.length ? `${eyebrow("Jouw actiepunten", KLEUR.indigo)}
${lijst(h.acties)}` : ""}
${knop("Naar het CM-overleg", h.link)}
<div style="height:22px"></div>
${linkAlsTekst(h.link)}`);
  const html = omhulsel({ basis: siteBasis(), titel: h.onderwerp, preheader: h.intro, kaart, contact: h.contact, certificaten: h.certificaten });
  return verstuur([h.to], h.onderwerp, html, adressen(process.env.NOTIFY_TO)[0]);
}

/**
 * De notulen van het CM-overleg (overlegActions, bij afronden; opbouw uit
 * notulenVan in lib/overleg.ts), in de vorm van het team: gegevens, de eigen
 * actiepunten bovenaan, per agendapunt wat er besproken is, alle actiepunten
 * met wie en de status, en de punten voor het volgende overleg.
 */
export async function sendOverlegNotulen(m: {
  to: string; voornaam: string | null; notulen: Notulen; mijnActies: string[]; link: string; contact?: ContactInfo; certificaten: Certificate[];
}): Promise<Verzonden> {
  const n = m.notulen;
  const klein = (s: string) => `<div style="font-family:${FONT};font-size:13px;line-height:1.5;color:${KLEUR.grijs}">${s}</div>`;
  const tekst = (s: string) => `<div style="font-family:${FONT};font-size:15px;line-height:1.6;color:${KLEUR.tekst};white-space:pre-line">${esc(s)}</div>`;
  const rij = (links: string, rechts: string) =>
    `<tr><td style="padding:5px 14px 5px 0;font-family:${FONT};font-size:14px;color:${KLEUR.grijs};white-space:nowrap;vertical-align:top">${esc(links)}</td><td style="padding:5px 0;font-family:${FONT};font-size:14px;color:${KLEUR.inkt}">${esc(rechts)}</td></tr>`;
  const gegevens = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px">
${rij("Datum", n.gegevens.datum)}${rij("Tijd", n.gegevens.tijd)}${n.gegevens.locatie ? rij("Waar", n.gegevens.locatie) : ""}${rij("Aanwezig", n.gegevens.aanwezig.join(", ") || "\u2013")}${rij("Notulist", n.gegevens.notulist || "\u2013")}</table>`;
  const deel = (d: Notulen["delen"][number]) => `<tr><td style="padding:12px 0;border-top:1px solid ${KLEUR.lijn}">
  <div style="font-family:${FONT_KOP};font-size:15.5px;font-weight:700;color:${KLEUR.inkt}">${esc(d.titel)}</div>
  ${d.inbrenger ? klein(`Ingebracht door ${esc(d.inbrenger)}`) : ""}
  ${d.regels.length ? d.regels.map((r) => r.wie ? `<div style="margin-top:6px;font-family:${FONT};font-size:15px;line-height:1.6;color:${KLEUR.tekst}"><strong style="color:${KLEUR.inkt}">${esc(r.wie)}:</strong> ${esc(r.tekst)}</div>` : `<div style="margin-top:6px">${tekst(r.tekst)}</div>`).join("") : klein("Niets genoteerd.")}
</td></tr>`;
  const acties = n.acties.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px">${n.acties.map((a) => `<tr><td style="padding:8px 12px 8px 0;border-top:1px solid ${KLEUR.lijn};font-family:${FONT};font-size:14.5px;color:${KLEUR.inkt}">${esc(a.wat)}</td><td style="padding:8px 12px 8px 0;border-top:1px solid ${KLEUR.lijn};font-family:${FONT};font-size:14px;color:${KLEUR.tekst};white-space:nowrap">${esc(a.door)}</td><td style="padding:8px 0;border-top:1px solid ${KLEUR.lijn};font-family:${FONT};font-size:13.5px;color:${KLEUR.grijs};white-space:nowrap">${a.status}</td></tr>`).join("")}</table>`
    : klein("Geen actiepunten.");
  const lijst = (items: string[]) => `<ul style="margin:6px 0 20px;padding-left:20px;font-family:${FONT};font-size:15px;line-height:1.6;color:${KLEUR.tekst}">${items.map((i) => `<li style="margin:2px 0">${esc(i)}</li>`).join("")}</ul>`;
  const kaart = vak(`${p(esc(`Hoi${m.voornaam ? ` ${m.voornaam}` : ""},`), `color:${KLEUR.inkt}`)}
${p(esc(`Hier zijn de notulen van het CM-overleg van ${n.gegevens.datum.toLowerCase()}.`))}
${gegevens}
${m.mijnActies.length ? `${eyebrow("Jouw actiepunten", KLEUR.roze)}${lijst(m.mijnActies)}` : ""}
${eyebrow("Notulen", KLEUR.indigo)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px">${n.delen.map(deel).join("")}</table>
${eyebrow("Actie en gemaakte afspraken", KLEUR.indigo)}
${acties}
${n.volgend.length ? `${eyebrow("Punten voor het volgende overleg", KLEUR.indigo)}${lijst(n.volgend.map((v) => (v.inbrenger ? `${v.titel} (${v.inbrenger})` : v.titel)))}` : ""}
${knop("Notulen in Mijn React2u", m.link)}
<div style="height:22px"></div>
${linkAlsTekst(m.link)}`);
  const onderwerp = `Notulen ${n.titel}`;
  const html = omhulsel({ basis: siteBasis(), titel: onderwerp, preheader: `Aanwezig: ${n.gegevens.aanwezig.join(", ")}`, kaart, contact: m.contact, certificaten: m.certificaten });
  return verstuur([m.to], onderwerp, html, adressen(process.env.NOTIFY_TO)[0]);
}

/**
 * Twee zware weken bij een collega (weekevaluatieActions, regel in
 * weekevaluatie_signaal van 0045): een korte mail aan wie het kwartaaloverzicht
 * mag zien, zonder de antwoorden zelf, met een knop naar de collega in het overzicht.
 */
export async function sendWeekevaluatieSignaal(s: { to: string; onderwerp: string; alineas: string[]; knop: string; link: string; contact?: ContactInfo; certificaten: Certificate[] }): Promise<Verzonden> {
  const kaart = vak(`${s.alineas.map((a) => p(esc(a))).join("\n")}
<div style="height:6px"></div>
${knop(s.knop, s.link, KLEUR.indigo)}
<div style="height:22px"></div>
${linkAlsTekst(s.link)}`);
  const html = omhulsel({ basis: siteBasis(), titel: s.onderwerp, preheader: s.alineas[0] || s.onderwerp, kaart, contact: s.contact, certificaten: s.certificaten });
  return verstuur([s.to], s.onderwerp, html);
}

/**
 * Een melding uit de weekevaluatie die de collega meteen wil laten weten
 * (weekevaluatieActions, tekst in meldingMail): de tekst als citaat, een knop
 * naar de collega in het kwartaaloverzicht. Beantwoorden gaat naar de collega.
 */
export async function sendWeekevaluatieMelding(m: {
  to: string; onderwerp: string; alineas: string[]; citaat: string; knop: string; link: string; replyTo: string; contact?: ContactInfo; certificaten: Certificate[];
}): Promise<Verzonden> {
  const citaat = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px"><tr>
<td style="border-left:3px solid ${KLEUR.roze};background:${KLEUR.zand};border-radius:0 14px 14px 0;padding:16px 20px;font-family:${FONT};font-size:16px;line-height:1.6;color:${KLEUR.inkt};white-space:pre-line">${esc(m.citaat)}</td>
</tr></table>`;
  const kaart = vak(`${p(esc(m.alineas[0]))}
${citaat}
${m.alineas.slice(1).map((a) => p(esc(a))).join("\n")}
<div style="height:6px"></div>
${knop(m.knop, m.link, KLEUR.indigo)}
<div style="height:22px"></div>
${linkAlsTekst(m.link)}`);
  const html = omhulsel({ basis: siteBasis(), titel: m.onderwerp, preheader: m.citaat.slice(0, 140), kaart, contact: m.contact, certificaten: m.certificaten });
  return verstuur([m.to], m.onderwerp, html, m.replyTo);
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
  /** Hoe de afzender ons vond, als leesbare tekst (lib/herkomst.ts), met de landingspagina (migratie 0047). */
  herkomst?: string | null; landingspagina?: string | null;
}) {
  await send(
    `Nieuw bericht via de website${m.subject ? `: ${m.subject}` : ""}`,
    render("Nieuw contactbericht", "Binnengekomen via het contactformulier op de website.", [
      { label: "Naam", value: m.name },
      { label: "E-mail", value: m.email },
      { label: "Telefoon", value: m.phone },
      { label: "Onderwerp", value: m.subject || "(geen onderwerp)" },
      { label: "Gevonden via", value: m.herkomst ?? null },
      { label: "Kwam binnen op", value: m.landingspagina ?? null },
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
  /** Hoe de aanvrager ons vond, als leesbare tekst (lib/herkomst.ts), met de landingspagina (migratie 0047). */
  herkomst?: string | null; landingspagina?: string | null;
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
      { label: "Gevonden via", value: o.herkomst ?? null },
      { label: "Kwam binnen op", value: o.landingspagina ?? null },
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
  contact?: ContactInfo; certificaten: Certificate[];
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
    contact: o.contact, certificaten: o.certificaten,
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
  to: string; code: string; nummer: string; bedrijf: string; afzender: Afzender; vorm?: Vorm | null; contact?: ContactInfo; certificaten: Certificate[];
}): Promise<Verzonden> {
  const html = offerteCodeHtml({
    basis: siteBasis(), merk: merkVan(c.vorm), code: c.code, nummer: c.nummer, bedrijf: c.bedrijf, afzender: c.afzender, contact: c.contact, certificaten: c.certificaten,
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
  vorm?: Vorm | null; vervolg?: { kop: string; tekst: string }[] | null; contact?: ContactInfo; certificaten: Certificate[];
}): Promise<Verzonden> {
  const html = offerteGetekendHtml({
    basis: siteBasis(), merk: merkVan(b.vorm), naam: b.naam, bedrijf: b.bedrijf, nummer: b.nummer, link: b.link, hash: b.hash,
    moment: b.moment, regels: b.regels, totalen: b.totalen, afzender: b.afzender, vervolg: b.vervolg, pdf: Boolean(b.pdf), contact: b.contact, certificaten: b.certificaten,
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
  afzender: Afzender; herinnering?: boolean; diensten: MailDienst[]; contact?: ContactInfo; certificaten: Certificate[];
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

/* ---------- onboarding (migratie 0037) ---------- */

export async function sendOnboarding(o: {
  to: string; aanhef: string | null; bedrijf: string; nummer: string; link: string; bericht: string | null;
  afzender: Afzender; herinnering?: boolean; documenten: MailDocument[]; contact?: ContactInfo; certificaten: Certificate[];
}): Promise<Verzonden> {
  const { to, ...rest } = o;
  const html = onboardingMailHtml({ basis: siteBasis(), ...rest });
  const onderwerp = o.herinnering ? `Herinnering: je onboarding bij React2u voor ${o.bedrijf}` : `Welkom bij React2u: je onboarding voor ${o.bedrijf}`;
  return verstuur([to], onderwerp, html, o.afzender.email || undefined);
}

/** Aan de afzender: de klant opende de onboarding, vulde iets in, is klaar, een werknemer tekende, of de opdracht ging naar de vorige arbodienst. */
export async function notifyOnboarding(n: {
  to: string; nummer: string; bedrijf: string; adminLink: string; soort: "bekeken" | "ingevuld" | "afgerond" | "getekend" | "overdracht"; document?: string; naam?: string; aantal?: number;
}) {
  const kop =
    n.soort === "afgerond" ? `${n.bedrijf} heeft de onboarding afgerond`
      : n.soort === "ingevuld" ? `${n.bedrijf} vulde ${n.document || "een document"} in`
        : n.soort === "getekend" ? `${n.naam || "Een werknemer"} van ${n.bedrijf} tekende de machtiging`
          : n.soort === "overdracht" ? `Opdracht tot overdracht voor ${n.bedrijf} naar de vorige arbodienst`
            : `${n.bedrijf} heeft de onboarding geopend`;
  const tekst =
    n.soort === "afgerond"
      ? `Onboarding ${esc(n.nummer)} is compleet: alle documenten zijn ingevuld of afgevinkt. Tijd om de klant in te richten.`
      : n.soort === "ingevuld"
        ? `In onboarding ${esc(n.nummer)} is ${esc(n.document || "een document")} ingevuld. Je ziet de gegevens in het beheer.`
        : n.soort === "getekend"
          ? `In onboarding ${esc(n.nummer)} heeft ${esc(n.naam || "een werknemer")} de machtiging voor de overdracht van het verzuimdossier online getekend, met IP-registratie. De getekende pdf staat in het beheer onder Werknemer; stuur daar de opdracht tot overdracht naar de vorige arbodienst.`
          : n.soort === "overdracht"
            ? `In onboarding ${esc(n.nummer)} ging namens de werkgever de opdracht tot overdracht met ${n.aantal ?? ""} getekende ${n.aantal === 1 ? "machtiging" : "machtigingen"} naar de vorige arbodienst; ${REACT2U_MEDISCH} en de werkgever kregen een kopie. Verwacht een lijst van de dossiers; vink daarna de taak af.`
            : `Onboarding ${esc(n.nummer)} is zojuist voor het eerst geopend.`;
  await post([n.to], kop, persoonlijk(kop, [tekst], { tekst: "Open de onboarding", link: n.adminLink }));
}

const REACT2U_MEDISCH = "medisch@react2u.nl";

/* ---------- 0038: de machtiging online, de klant op de hoogte, een stap doorsturen ---------- */

export function machtigingUrl(token: string) {
  return `${siteBasis()}/machtiging/${token}`;
}

/** Aan de werknemer: de uitnodiging om de machtiging te tekenen (of nog eens). */
export async function sendMachtiging(m: Omit<MachtigingMail, "basis"> & { to: string }): Promise<Verzonden> {
  const { to, ...rest } = m;
  const html = machtigingMailHtml({ basis: siteBasis(), ...rest });
  return verstuur([to], `${m.opnieuw ? "Herinnering: m" : "M"}achtiging overdracht verzuimdossier, ${m.bedrijf}`, html, m.afzender.email || undefined);
}

/** Aan de werknemer na het tekenen, met de getekende machtiging als pdf. */
export async function bevestigMachtigingGetekend(b: { to: string; naam: string; bedrijf: string; arbodienst: string | null; moment: string; link: string; afzender: Afzender; pdf?: Bijlage | null; contact?: ContactInfo; certificaten: Certificate[] }): Promise<Verzonden> {
  const html = machtigingGetekendHtml({ basis: siteBasis(), naam: b.naam, bedrijf: b.bedrijf, arbodienst: b.arbodienst, moment: b.moment, link: b.link, afzender: b.afzender, pdf: Boolean(b.pdf), contact: b.contact, certificaten: b.certificaten });
  return verstuur([b.to], `Getekend: je machtiging voor de overdracht van je verzuimdossier`, html, b.afzender.email || undefined, b.pdf ? [b.pdf] : undefined);
}

/** Aan de klant: ontvangen (met kopie), jullie deel is klaar, jullie zijn live. */
export async function sendOnboardingKlant(k: Omit<OnboardingKlantMail, "basis"> & { to: string; bijlage?: Bijlage | null }): Promise<Verzonden> {
  const { to, bijlage, ...rest } = k;
  const html = onboardingKlantHtml({ basis: siteBasis(), ...rest, pdf: Boolean(bijlage) });
  const onderwerp =
    k.soort === "ontvangen" ? `Ontvangen: ${k.document || "je gegevens"} voor de onboarding van ${k.bedrijf}`
      : k.soort === "klaar" ? `Jullie deel is klaar: nu richten wij ${k.bedrijf} in`
        : `Jullie zijn live bij React2u, ${k.bedrijf}`;
  return verstuur([to], onderwerp, html, k.afzender.email || undefined, bijlage ? [bijlage] : undefined);
}

/** Aan een collega van de klant: een stap van de onboarding doorgestuurd. */
export async function sendOnboardingDoorgestuurd(d: { to: string; naam: string; van: string; bedrijf: string; stap: string; actie: string; link: string; bericht: string | null; afzender: Afzender; contact?: ContactInfo; certificaten: Certificate[] }): Promise<Verzonden> {
  const { to, ...rest } = d;
  const html = doorgestuurdHtml({ basis: siteBasis(), ...rest });
  return verstuur([to], `${d.van} stuurt je ${d.stap} door: onboarding ${d.bedrijf} bij React2u`, html, d.afzender.email || undefined);
}

/**
 * Aan de vorige arbodienst, namens de werkgever: de opdracht tot overdracht
 * met de getekende machtigingen. De werkgever en medisch@react2u.nl ontvangen
 * hem ook; antwoorden gaat naar de werkgever.
 */
export async function sendOverdracht(b: {
  to: string; werkgeverEmail: string | null; bedrijf: string; contactpersoon: string | null; aantal: number; namen: { naam: string; geboortedatum: string }[];
  arbodienst: string | null; alineas: string[]; pdf: Bijlage; contact?: ContactInfo; certificaten: Certificate[];
}): Promise<Verzonden> {
  const html = overdrachtMailHtml({ basis: siteBasis(), bedrijf: b.bedrijf, contactpersoon: b.contactpersoon, aantal: b.aantal, namen: b.namen, arbodienst: b.arbodienst, alineas: b.alineas, contact: b.contact, certificaten: b.certificaten });
  const aan = [b.to, ...(b.werkgeverEmail && b.werkgeverEmail !== b.to ? [b.werkgeverEmail] : []), REACT2U_MEDISCH];
  return verstuur([...new Set(aan)], `Opdracht overdracht verzuimdossiers ${b.bedrijf} naar React2u`, html, b.werkgeverEmail || undefined, [b.pdf]);
}

export function onboardingAdminUrl(id: string) {
  return `${siteBasis()}/admin/onboarding/${id}`;
}

export function onboardingUrl(token: string) {
  return `${siteBasis()}/onboarding/${token}`;
}

/* ---------- klantevaluatie (migratie 0043) ---------- */

/** Aan de klant: de uitnodiging om de evaluatie online in te vullen, of een herinnering. Antwoorden gaat naar de afzender. */
export async function sendEvaluatie(e: Omit<EvaluatieMail, "basis"> & { to: string }): Promise<Verzonden> {
  const { to, ...rest } = e;
  const html = evaluatieMailHtml({ basis: siteBasis(), ...rest });
  const onderwerp = e.herinnering ? `Herinnering: de klantevaluatie van ${e.bedrijf}` : `Klantevaluatie React2u voor ${e.bedrijf}`;
  return verstuur([to], onderwerp, html, e.afzender.email || undefined);
}

/** Aan de klant na het invullen: dank je wel, met de ingevulde evaluatie als pdf. */
export async function bevestigEvaluatieIngevuld(b: Omit<EvaluatieIngevuldMail, "basis" | "pdf"> & { to: string; bijlage?: Bijlage | null }): Promise<Verzonden> {
  const { to, bijlage, ...rest } = b;
  const html = evaluatieIngevuldHtml({ basis: siteBasis(), ...rest, pdf: Boolean(bijlage) });
  return verstuur([to], `Ontvangen: de klantevaluatie van ${b.bedrijf}`, html, b.afzender.email || undefined, bijlage ? [bijlage] : undefined);
}

/** Aan de afzender: de klant opende de evaluatie, of vulde hem in (met de aandachtspunten erbij). */
export async function notifyEvaluatie(n: { to: string; nummer: string; bedrijf: string; adminLink: string; soort: "bekeken" | "ingevuld"; opnieuw?: boolean; door?: string | null; aandachtspunten?: string[] }) {
  const kop =
    n.soort === "ingevuld"
      ? `${n.bedrijf} heeft de klantevaluatie ${n.opnieuw ? "aangepast" : "ingevuld"}`
      : `${n.bedrijf} heeft de klantevaluatie geopend`;
  const punten = n.aandachtspunten || [];
  const tekst =
    n.soort === "ingevuld"
      ? `Klantevaluatie ${esc(n.nummer)} is ${n.opnieuw ? "aangepast" : "ingevuld"}${n.door ? ` door ${esc(n.door)}` : ""}. ${
          punten.length
            ? `${punten.length === 1 ? "Eén aandachtspunt" : `${punten.length} aandachtspunten`} (nog niet geregeld): ${esc(punten.join(", "))}.`
            : "Alle punten van de checklist zijn geregeld of niet van toepassing."
        } Je ziet de antwoorden en de pdf in het beheer.`
      : `Klantevaluatie ${esc(n.nummer)} is zojuist voor het eerst geopend.`;
  await post([n.to], kop, persoonlijk(kop, [tekst], { tekst: "Open de evaluatie", link: n.adminLink }));
}

export function evaluatieAdminUrl(id: string) {
  return `${siteBasis()}/admin/documenten/evaluaties/${id}`;
}

export function evaluatieUrl(token: string) {
  return `${siteBasis()}/evaluatie/${token}`;
}

/* ---------- contracten (migratie 0031, de resellerovereenkomst sinds 0033) ---------- */

/**
 * Het contract naar de klant of de partner: een persoonlijke mail met één knop
 * naar de contractpagina (lib/contractMail.ts). Antwoorden gaat naar de afzender.
 */
export async function sendContract(c: Omit<ContractMail, "basis"> & { to: string; bijlagen?: Bijlage[] }): Promise<Verzonden> {
  const { to, bijlagen, ...rest } = c;
  const html = contractMailHtml({ basis: siteBasis(), ...rest });
  const naam = CONTRACT_SOORT[soortVan(c)].naam;
  const onderwerp = `${c.herinnering ? `Herinnering: ${naam.toLowerCase()}` : naam} ${c.nummer} voor ${c.bedrijf}`;
  return verstuur([to], onderwerp, html, c.afzender.email || undefined, bijlagen?.length ? bijlagen : undefined);
}

/** De code waarmee wie tekent zijn e-mailadres bevestigt; vooraan in het onderwerp, net als bij offertes. */
export async function sendContractCode(c: { to: string; soort?: ContractSoort; code: string; nummer: string; bedrijf: string; afzender: Afzender; contact?: ContactInfo; certificaten: Certificate[] }): Promise<Verzonden> {
  const html = contractCodeHtml({ basis: siteBasis(), soort: c.soort, code: c.code, nummer: c.nummer, bedrijf: c.bedrijf, afzender: c.afzender, contact: c.contact, certificaten: c.certificaten });
  return verstuur([c.to], `${c.code} is je code voor contract ${c.nummer}`, html, c.afzender.email || undefined);
}

/** Bevestiging aan wie tekende, met het getekende contract als pdf (met het ondertekeningscertificaat). */
export async function bevestigContractGetekend(b: {
  to: string; soort?: ContractSoort; naam: string; bedrijf: string; nummer: string; link: string; hash: string; moment: string;
  regels: { label: string; waarde: string }[]; afzender: Afzender; pdf?: Bijlage | null; contact?: ContactInfo; certificaten: Certificate[];
  /** Basiscontract (0042): de ingevulde checklist als tweede bijlage, of de regel dat hij nog openstaat. */
  checklist?: Bijlage | "open" | null;
}): Promise<Verzonden> {
  const checklistPdf = b.checklist && b.checklist !== "open" ? b.checklist : null;
  const html = contractGetekendHtml({
    basis: siteBasis(), soort: b.soort, naam: b.naam, bedrijf: b.bedrijf, nummer: b.nummer, link: b.link, hash: b.hash, moment: b.moment,
    regels: b.regels, afzender: b.afzender, pdf: Boolean(b.pdf), contact: b.contact, certificaten: b.certificaten,
    checklist: checklistPdf ? "bijgevoegd" : b.checklist === "open" ? "open" : undefined,
  });
  const bijlagen = [b.pdf, checklistPdf].filter((x): x is Bijlage => Boolean(x));
  return verstuur([b.to], `Ondertekend: ${CONTRACT_SOORT[soortVan(b)].zin.replace(/^(het|de) /, "")} ${b.nummer} voor ${b.bedrijf}`, html, b.afzender.email || undefined, bijlagen.length ? bijlagen : undefined);
}

/** De kopie aan de klant zodra hij de Checklist arbeidsomstandigheden invult of bijwerkt (0042), met de pdf. */
export async function sendContractChecklistKopie(c: {
  to: string; aanhef: string | null; bedrijf: string; nummer: string; link: string; beantwoord: number; totaal: number; opnieuw: boolean; door: string | null;
  afzender: Afzender; pdf?: Bijlage | null; contact?: ContactInfo; certificaten: Certificate[];
}): Promise<Verzonden> {
  const html = contractChecklistHtml({ basis: siteBasis(), ...c, pdf: Boolean(c.pdf) });
  return verstuur([c.to], `${c.opnieuw ? "Bijgewerkt" : "Opgeslagen"}: ${CHECKLIST_NAAM.toLowerCase()} bij contract ${c.nummer}`, html, c.afzender.email || undefined, c.pdf ? [c.pdf] : undefined);
}

/** Aan sales (en de afzender) zodra de klant de checklist invult of bijwerkt: sober, zoals de melding "getekend". */
export async function notifyContractChecklist(n: {
  nummer: string; bedrijf: string; door: string | null; beantwoord: number; totaal: number; opnieuw: boolean; adminLink: string; afzenderEmail: string | null; pdf?: Bijlage | null;
}) {
  const woord = CHECKLIST_NAAM.toLowerCase();
  await post(
    offerteOntvangers(n.afzenderEmail),
    `${n.bedrijf} ${n.opnieuw ? "werkte" : "vulde"} de ${woord} ${n.opnieuw ? "bij" : "in"}`,
    persoonlijk(
      `${n.bedrijf} heeft de ${woord} ${n.opnieuw ? "bijgewerkt" : "ingevuld"}`,
      [
        `${n.door ? `${esc(n.door)} heeft` : "De klant heeft"} de ${esc(CHECKLIST_NAAM)} bij contract ${esc(n.nummer)} zojuist online ${n.opnieuw ? "bijgewerkt" : "ingevuld"}: ${n.beantwoord} van ${n.totaal} onderdelen beantwoord.`,
        `De antwoorden staan bij het contract in het beheer.${n.pdf ? " De checklist zit als pdf bij deze mail." : ""}`,
      ],
      { tekst: "Open het contract", link: n.adminLink }
    ),
    undefined,
    n.pdf ? [n.pdf] : undefined
  );
}

export async function notifyContractGetekend(n: {
  soort?: ContractSoort; nummer: string; bedrijf: string; naam: string; functie: string; email: string; organisatie: string[]; looptijd: string;
  adminLink: string; afzenderEmail: string | null; pdf?: Bijlage | null;
}) {
  const sd = CONTRACT_SOORT[soortVan(n)];
  const woord = sd.zin.replace(/^(het|de) /, "");
  await post(
    offerteOntvangers(n.afzenderEmail),
    `Getekend: ${woord} ${n.nummer} voor ${n.bedrijf}`,
    persoonlijk(
      `${n.bedrijf} heeft ${sd.zin} getekend`,
      [
        `${esc(n.naam)} (${esc(n.functie)}) heeft ${woord} ${esc(n.nummer)} zojuist online ondertekend.`,
        `<strong>Looptijd</strong><br>${esc(n.looptijd)}`,
        `<strong>${sd.rollen[1]}</strong><br>${n.organisatie.map(esc).join("<br>")}`,
        `E-mailadres ${esc(n.email)} bevestigd met een code; de bevestiging met de pdf is daarheen gestuurd.${n.pdf ? " Het getekende contract zit ook bij deze mail." : ""}`,
      ],
      { tekst: "Open het contract", link: n.adminLink }
    ),
    undefined,
    n.pdf ? [n.pdf] : undefined
  );
}

/** De eerste keer dat de klant het contract opent: alleen naar de collega die het stuurde. */
export async function notifyContractBekeken(n: { to: string; soort?: ContractSoort; nummer: string; bedrijf: string; adminLink: string }) {
  const zin = CONTRACT_SOORT[soortVan(n)].zin;
  await post(
    [n.to],
    `${n.bedrijf} bekijkt ${zin}`,
    persoonlijk(
      `${n.bedrijf} heeft ${zin} geopend`,
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
