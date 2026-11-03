import { CONTACT_FALLBACK, type ContactInfo } from "./content";
import { MERKEN, type Merk } from "./offerteMerk";
import { euro, normaliseerRegels, waardeVan, type Offerte } from "./offertes";

/*
 * De mails die de klant over zijn offerte krijgt, in de vormgeving van de site:
 * de zandkleur als achtergrond, het logo erboven, een witte kaart en een voet
 * met de keurmerken, zoals de footer van react2u.nl. Bovenaan staat het label
 * van de offerte zoals op de labelpagina (/recover, /resist, /restart): de
 * pasteltint, "React2u" met de labelnaam groot in de labelkleur, de dienst en
 * de tagline (Rens, 2 nov 2026: "deze mail moet visueel echt veel mooier in de
 * stijl van React2u").
 *
 * Mailclients kunnen veel minder dan een browser. Daarom tabellen en inline
 * stijlen, een knop die in Outlook voor Windows als VML wordt getekend, en
 * afbeeldingen als PNG (geen SVG). De lettertypen van de site (Figtree, DM Sans)
 * laden waar de client dat kan (Apple Mail, iOS, Outlook voor Mac); de rest
 * valt terug op de systeemletter. Zonder afbeeldingen blijft alles leesbaar.
 */

/** Merkkleuren, gelijk aan globals.css; grijs is de contrastversie uit de offertepagina. */
export const KLEUR = {
  indigo: "#312e82",
  inkt: "#1c1a4e",
  tekst: "#5a5870",
  grijs: "#6b6985",
  zand: "#f6f2ec",
  lijn: "#e6e0d6",
  roze: "#c8306a",
};
export const FONT = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
export const FONT_KOP = "Figtree, 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Wat de mail van het label nodig heeft. */
export type MailMerk = Pick<Merk, "slug" | "naam" | "kleur" | "tekst" | "tint" | "dienst" | "tagline">;

export type MailAfzender = { naam: string | null; functie: string | null; email: string | null; telefoon: string | null };

/** Een kerngegeven in de offertekaart: "Per maand", "€1.234", "excl. btw". */
export type Feit = { label: string; waarde: string; sub?: string };

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** "bedrijf." zonder dubbele punt als de naam er al op eindigt (FlexHero B.V.). */
export function metPunt(s: string) {
  return /[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`;
}

/** Tekst van een collega als alinea's: escapen, lege regel = nieuwe alinea. */
export function alineasUit(tekst: string | null | undefined): string[] {
  return (tekst || "")
    .split(/\n\s*\n/)
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a) => esc(a).replace(/\n/g, "<br>"));
}

export function initialen(naam: string | null) {
  const delen = (naam || "React2u").trim().split(/\s+/).filter((d) => /^[\p{Lu}\p{Ll}]/u.test(d));
  const eerste = delen[0]?.[0] || "R";
  const laatste = delen.length > 1 ? delen[delen.length - 1][0] : "";
  return (eerste + laatste).toUpperCase();
}

/* ---------- bouwstenen ---------- */

export const p = (html: string, stijl = "") =>
  `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.65;color:${KLEUR.tekst};${stijl}">${html}</p>`;

/** Klein label boven een blok, zoals "WAT JE KRIJGT" op de labelpagina. */
export const eyebrow = (tekst: string, kleur: string) =>
  `<p style="margin:0 0 14px;font-family:${FONT};font-size:12px;line-height:1.4;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:${kleur}">${tekst}</p>`;

/**
 * De knop: een pil zoals .hv-btn op de site, met pijl. Outlook voor Windows
 * tekent geen afgeronde links, dus daar een VML-vorm met dezelfde maat.
 */
export function knop(tekst: string, link: string, kleur = KLEUR.roze, breedte = 340) {
  const href = esc(link);
  return `<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:54px;v-text-anchor:middle;width:${breedte}px;" arcsize="50%" stroke="f" fillcolor="${kleur}">
<w:anchorlock/>
<center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${esc(tekst)} &#8594;</center>
</v:roundrect>
<![endif]--><!--[if !mso]><!-- --><a href="${href}" class="knop" style="display:inline-block;background:${kleur};color:#ffffff;font-family:${FONT};font-size:16px;line-height:22px;font-weight:600;text-decoration:none;padding:16px 30px;border-radius:999px;mso-hide:all">${esc(tekst)}&nbsp;&nbsp;&#8594;</a><!--<![endif]-->`;
}

/** "React2u" met de labelnaam groot eronder: het woordmerk van de labelpagina. */
export function woordmerk(m: MailMerk, groot = 56) {
  return `<p style="margin:0;font-family:${FONT_KOP};font-size:22px;line-height:1.1;font-weight:700;letter-spacing:-0.01em;color:${KLEUR.indigo}">React2u</p>
<p class="label" style="margin:2px 0 0;font-family:${FONT_KOP};font-size:${groot}px;line-height:1;font-weight:700;letter-spacing:-0.025em;color:${m.kleur}">${esc(m.naam)}<sup style="font-size:15px;line-height:0;vertical-align:top;position:relative;top:10px;margin-left:2px">&reg;</sup></p>
<p style="margin:18px 0 0;font-family:${FONT};font-size:18px;line-height:1.35;font-weight:700;color:${KLEUR.indigo}">${esc(m.dienst)}</p>
<p style="margin:2px 0 0;font-family:${FONT};font-size:18px;line-height:1.35;font-style:italic;color:${KLEUR.indigo}">${esc(m.tagline)}</p>`;
}

/** Een pil met een stip (of een ander teken) ervoor, zoals de Eyebrow op de site. */
export function pil(tekst: string, kleur: string, teken = "&#9679;") {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:#ffffff;border-radius:999px;padding:7px 14px 7px 12px;font-family:${FONT};font-size:13px;line-height:18px;font-weight:600;color:${KLEUR.indigo}"><span style="color:${kleur};font-size:15px;font-weight:700">${teken}</span>&nbsp; ${tekst}</td>
</tr></table>`;
}

/** Genummerde stappen met een badge in de tint, zoals de onderdeelkaarten op de labelpagina. */
export function stappen(m: MailMerk, lijst: { kop: string; tekst: string }[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${lijst
    .map(
      (s, i) => `<tr>
<td width="52" valign="top" style="padding:0 0 ${i === lijst.length - 1 ? 0 : 18}px">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" width="38" height="38" style="width:38px;height:38px;border-radius:999px;background:${m.tint};font-family:${FONT};font-size:13px;font-weight:700;color:${m.tekst}">${String(i + 1).padStart(2, "0")}</td></tr></table>
</td>
<td valign="top" style="padding:1px 0 ${i === lijst.length - 1 ? 0 : 18}px">
  <p style="margin:0 0 2px;font-family:${FONT_KOP};font-size:17px;line-height:1.35;font-weight:700;color:${KLEUR.inkt}">${esc(s.kop)}</p>
  <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.55;color:${KLEUR.tekst}">${esc(s.tekst)}</p>
</td>
</tr>`
    )
    .join("")}</table>`;
}

/** Vinkjes in de labelkleur, zoals "Wat je krijgt" op de labelpagina. */
export function vinkjes(m: MailMerk, regels: string[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${regels
    .map(
      (r) => `<tr>
<td width="26" valign="top" style="padding:4px 0;font-family:${FONT};font-size:16px;line-height:1.5;font-weight:700;color:${m.kleur}">&#10003;</td>
<td valign="top" style="padding:4px 0;font-family:${FONT};font-size:16px;line-height:1.5;color:${KLEUR.inkt}">${r}</td>
</tr>`
    )
    .join("")}</table>`;
}

/** De groet met een kaartje van de collega: initialen, naam, functie en hoe je hem bereikt. */
export function afzenderKaart(a: MailAfzender, m: MailMerk) {
  const naam = a.naam?.trim() || "Team React2u";
  const functie = a.functie ? `${a.functie}, React2u` : "React2u";
  const tel = a.telefoon?.trim();
  const bereik = [
    tel ? `<a href="tel:${esc(tel.replace(/[^\d+]/g, ""))}" style="color:${KLEUR.indigo};text-decoration:none;font-weight:600">${esc(tel)}</a>` : "",
    a.email ? `<a href="mailto:${esc(a.email)}" style="color:${KLEUR.indigo};text-decoration:none;font-weight:600">${esc(a.email)}</a>` : "",
  ].filter(Boolean);
  return `${p("Met vriendelijke groet,", "margin-bottom:14px")}
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="top" width="64" style="padding-right:14px">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" width="50" height="50" style="width:50px;height:50px;border-radius:999px;background:${m.tint};font-family:${FONT_KOP};font-size:18px;font-weight:700;color:${m.tekst}">${esc(initialen(a.naam))}</td></tr></table>
</td>
<td valign="middle">
  <p style="margin:0;font-family:${FONT_KOP};font-size:17px;line-height:1.3;font-weight:700;color:${KLEUR.inkt}">${esc(naam)}</p>
  <p style="margin:1px 0 0;font-family:${FONT};font-size:14px;line-height:1.5;color:${KLEUR.grijs}">${esc(functie)}</p>
  ${bereik.length ? `<p style="margin:4px 0 0;font-family:${FONT};font-size:14px;line-height:1.5;color:${KLEUR.grijs}">${bereik.join(`&nbsp;&nbsp;<span style="color:${KLEUR.lijn}">|</span>&nbsp;&nbsp;`)}</p>` : ""}
</td>
</tr></table>`;
}

export const scheiding = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${KLEUR.lijn};font-size:0;line-height:0;height:1px">&nbsp;</td></tr></table>`;

/** De keurmerken uit de footer van de site, als ronde witte badges. */
export const KEURMERKEN = [
  { pad: "sbca.jpg", alt: "SBCA" },
  { pad: "iso9001.png", alt: "ISO 9001" },
  { pad: "iso27001.png", alt: "ISO 27001" },
  { pad: "iso27701.png", alt: "ISO 27701" },
  { pad: "oval.png", alt: "OVAL" },
];

/* ---------- het omhulsel ---------- */

/**
 * De tekst die mailclients naast het onderwerp tonen. De opvulling erachter
 * houdt de rest van de mail uit dat voorbeeld.
 */
export function preheader(tekst: string) {
  return `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${esc(tekst)}${"&#847;&zwnj;&nbsp;".repeat(60)}</div>`;
}

export function omhulsel(o: {
  basis: string; titel: string; preheader: string; kaart: string; voetnoot?: string; contact?: ContactInfo;
  /** De taal van de inhoud; alleen de kandidaatmails komen ook in het Engels. */
  taal?: "nl" | "en";
}) {
  const c = { ...CONTACT_FALLBACK, ...(o.contact || {}) };
  const link = (href: string, tekst: string) => `<a href="${esc(href)}" style="color:${KLEUR.indigo};text-decoration:none">${esc(tekst)}</a>`;
  const keurmerken = KEURMERKEN.map(
    (k) =>
      `<td style="padding:0 5px"><img src="${esc(`${o.basis}/beeld/keurmerken/${k.pad}`)}" width="46" height="46" alt="${esc(k.alt)}" style="display:block;width:46px;height:46px;border-radius:999px;border:1px solid ${KLEUR.lijn};background:#ffffff"></td>`
  ).join("");
  return `<!doctype html>
<html lang="${o.taal === "en" ? "en" : "nl"}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(o.titel)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>table,td,p,a,span{font-family:Arial,Helvetica,sans-serif !important}</style><![endif]-->
<style>
  :root { color-scheme: light only; supported-color-schemes: light only; }
  @media screen {
    @font-face { font-family: "Figtree"; src: url(${o.basis}/fonts/figtree-latin.woff2) format("woff2"); font-weight: 300 900; font-style: normal; }
    @font-face { font-family: "DM Sans"; src: url(${o.basis}/fonts/dm-sans-latin.woff2) format("woff2"); font-weight: 100 1000; font-style: normal; }
  }
  body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
  a.knop:hover { filter: brightness(1.08); }
  @media only screen and (max-width: 620px) {
    .rand { padding: 14px 8px 32px !important; }
    .vak { padding-left: 22px !important; padding-right: 22px !important; }
    .held { padding: 28px 18px 26px !important; background-size: 190px 180px !important; }
    .binnen { padding: 22px 20px 22px !important; }
    .label { font-size: 46px !important; }
    .kol { display: inline-block !important; width: 50% !important; padding: 0 0 16px !important; box-sizing: border-box; vertical-align: top; }
    .knop { display: block !important; text-align: center !important; font-size: 15px !important; padding: 15px 14px !important; }
    .kop-groot { font-size: 30px !important; }
    .verberg-mobiel { display: none !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${KLEUR.zand}">
${preheader(o.preheader)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${KLEUR.zand}">
<tr><td align="center" class="rand" style="padding:36px 16px 44px">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
<tr><td style="padding:0 4px 22px">
  <a href="${esc(o.basis)}" style="text-decoration:none"><img src="${esc(`${o.basis}/mail/logo-react2u.png`)}" width="120" height="74" alt="React2u" style="display:block;width:120px;height:auto;color:${KLEUR.indigo};font-family:${FONT_KOP};font-size:24px;font-weight:700"></a>
</td></tr>
<tr><td style="background:#ffffff;border:1px solid ${KLEUR.lijn};border-radius:28px;overflow:hidden">${o.kaart}</td></tr>
<tr><td align="center" style="padding:30px 12px 0">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${keurmerken}</tr></table>
</td></tr>
<tr><td align="center" style="padding:20px 12px 0;font-family:${FONT};font-size:13px;line-height:1.7;color:${KLEUR.grijs}">
  <p style="margin:0 0 4px;font-family:${FONT_KOP};font-size:15px;font-weight:700;color:${KLEUR.indigo}">Jouw mensen, <span style="color:${KLEUR.roze}">onze aandacht.</span></p>
  <p style="margin:0">React2u&nbsp;&nbsp;·&nbsp;&nbsp;${esc(c.addressLine1)}, ${esc(c.addressLine2)}</p>
  <p style="margin:0">${link(`tel:+31${c.phone.replace(/\D/g, "").replace(/^0/, "")}`, c.phoneDisplay)}&nbsp;&nbsp;·&nbsp;&nbsp;${link(`mailto:${c.email}`, c.email)}&nbsp;&nbsp;·&nbsp;&nbsp;${link(o.basis, o.basis.replace(/^https?:\/\//, ""))}</p>
  ${o.voetnoot ? `<p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:${KLEUR.grijs}">${o.voetnoot}</p>` : ""}
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

/**
 * De tint van het label met de grote cirkel rechtsboven, zoals op de
 * labelpagina (DienstLabel.tsx: 12% van de labelkleur). Mailclients kennen
 * geen doorzichtige vlakken over elkaar, dus de cirkel is een PNG per label
 * (public/mail/cirkel-<label>.png); zonder afbeeldingen blijft de tint over.
 * De kaart is half zo breed als de labelpagina, dus de cirkel ook.
 */
export function heldAchtergrond(basis: string, m: MailMerk) {
  const cirkel = `${basis}/mail/cirkel-${MERKEN[m.slug] ? m.slug : "recover"}.png`;
  return `background-color:${m.tint};background-image:url('${esc(cirkel)}');background-repeat:no-repeat;background-position:right top;background-size:236px 224px`;
}

/** De kop van de kaart in de tint van het label, met een pil, het woordmerk en wat er nog onder moet. */
export function held(basis: string, m: MailMerk, pilTekst: string, onder: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="held" style="${heldAchtergrond(basis, m)};border-radius:27px 27px 0 0;padding:38px 40px 36px">
  ${pil(pilTekst, m.kleur)}
  <div style="height:26px;line-height:26px;font-size:0">&nbsp;</div>
  ${woordmerk(m)}
  ${onder}
</td></tr></table>`;
}

export const vak = (inhoud: string, stijl = "") => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="vak" style="padding:36px 40px;${stijl}">${inhoud}</td></tr></table>`;

/** "Werkt de knop niet?" met de link als tekst: klein, onderaan. */
export function linkAlsTekst(link: string) {
  return `<p style="margin:0 0 4px;font-family:${FONT};font-size:13px;line-height:1.5;color:${KLEUR.grijs}">Werkt de knop niet? Kopieer deze link naar je browser:</p>
<p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.5;word-break:break-all"><a href="${esc(link)}" style="color:${KLEUR.indigo};text-decoration:underline">${esc(link)}</a></p>`;
}

export function merkOf(m: MailMerk | null | undefined): MailMerk {
  return m || MERKEN.recover;
}

/* ---------- de offerte ---------- */

const KORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** "1 dec 2026": kort genoeg voor de offertekaart. */
function kortDatum(iso: string) {
  const [j, m, d] = iso.slice(0, 10).split("-").map(Number);
  return j && m && d ? `${d} ${KORT[m - 1]} ${j}` : "";
}

/** "nog 29 dagen", "nog 1 dag", "vandaag de laatste dag"; null als hij al verlopen is. */
function nogDagen(iso: string, nu: Date) {
  const vandaag = nu.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  const dagen = Math.round((Date.parse(iso.slice(0, 10)) - Date.parse(vandaag)) / 86_400_000);
  if (Number.isNaN(dagen) || dagen < 0) return null;
  return dagen === 0 ? "vandaag de laatste dag" : `nog ${dagen} ${dagen === 1 ? "dag" : "dagen"}`;
}

/**
 * Wat de mail over de offerte zelf laat zien, uit dezelfde berekening als de
 * offertepagina: het bedrag bij de voorgestelde keuze (of de keuze die de klant
 * al maakte), de onderdelen die meedoen, en wat hij er zelf nog bij kan zetten.
 * Een kaart heeft ruimte voor drie gegevens: eerst de bedragen, dan de
 * geldigheid, dan het aantal medewerkers.
 */
export function offerteSamenvatting(
  o: Pick<Offerte, "regels" | "keuze" | "medewerkers" | "status" | "geldig_tot">,
  nu = new Date(),
): { feiten: Feit[]; onderdelen: string[]; opties: number; kiezen: boolean } {
  const t = waardeVan(o);
  const kandidaten: (Feit & { voorrang: number })[] = [];
  if (t.perMaand > 0) kandidaten.push({ label: "Per maand", waarde: euro(t.perMaand), sub: "excl. btw", voorrang: 1 });
  if (t.eenmalig > 0) kandidaten.push({ label: "Eenmalig", waarde: euro(t.eenmalig), sub: "excl. btw", voorrang: 2 });
  if (o.medewerkers) kandidaten.push({ label: "Medewerkers", waarde: String(o.medewerkers), sub: "in dienst", voorrang: 4 });
  if (o.geldig_tot) {
    const sub = nogDagen(o.geldig_tot, nu);
    kandidaten.push({ label: "Geldig tot", waarde: kortDatum(o.geldig_tot), ...(sub ? { sub } : {}), voorrang: 3 });
  }
  const gekozen = new Set([...kandidaten].sort((a, b) => a.voorrang - b.voorrang).slice(0, 3));
  const feiten: Feit[] = kandidaten.filter((k) => gekozen.has(k)).map((k) => ({ label: k.label, waarde: k.waarde, ...(k.sub ? { sub: k.sub } : {}) }));

  const mee = new Set(t.regels.map((r) => r.regel.id));
  const alle = normaliseerRegels(o.regels);
  return {
    feiten,
    onderdelen: t.regels.map((r) => r.regel.naam),
    opties: alle.filter((r) => r.soort === "optie" && !mee.has(r.id)).length,
    kiezen: alle.some((r) => r.soort === "optie" || r.soort === "keuze"),
  };
}

export type OfferteMail = {
  basis: string;
  merk?: MailMerk | null;
  aanhef: string | null;
  bedrijf: string;
  nummer: string;
  titel?: string | null;
  link: string;
  bericht: string | null;
  geldigTot: string | null;
  afzender: MailAfzender;
  herinnering?: boolean;
  /** Twee of drie kerngegevens voor de offertekaart (bedrag, geldigheid, medewerkers). */
  feiten?: Feit[];
  /** De onderdelen die bij de voorgestelde keuze meedoen. */
  onderdelen?: string[];
  /** Hoeveel opties de klant er zelf nog bij kan zetten. */
  opties?: number;
  /** Of de klant iets te kiezen heeft (opties of een keuze uit een groep). */
  kiezen?: boolean;
  contact?: ContactInfo;
};

const MAX_ONDERDELEN = 6;

export function offerteMailHtml(o: OfferteMail): string {
  const m = merkOf(o.merk);
  const bedrijf = esc(o.bedrijf);
  const feiten = (o.feiten || []).slice(0, 3);

  const feitenRij = feiten.length
    ? `<div style="height:22px;line-height:22px;font-size:0">&nbsp;</div>${scheiding}<div style="height:20px;line-height:20px;font-size:0">&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${feiten
        .map(
          (f, i) => `<td class="kol" valign="top" width="${Math.floor(100 / feiten.length)}%" style="padding:0 ${i === feiten.length - 1 ? 0 : 12}px 0 0">
  <p style="margin:0 0 4px;font-family:${FONT};font-size:12px;line-height:1.3;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${KLEUR.grijs}">${esc(f.label)}</p>
  <p style="margin:0;font-family:${FONT_KOP};font-size:21px;line-height:1.25;font-weight:700;color:${KLEUR.inkt}">${esc(f.waarde)}</p>
  ${f.sub ? `<p style="margin:2px 0 0;font-family:${FONT};font-size:13px;line-height:1.4;color:${KLEUR.grijs}">${esc(f.sub)}</p>` : ""}
</td>`
        )
        .join("")}</tr></table>`
    : "";

  const kaart = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:#ffffff;border-radius:20px;padding:26px 28px 28px" class="binnen">
  ${eyebrow(`Offerte ${esc(o.nummer)}`, m.tekst)}
  <p class="kop-groot" style="margin:0;font-family:${FONT_KOP};font-size:28px;line-height:1.18;font-weight:700;letter-spacing:-0.015em;color:${KLEUR.inkt}">${bedrijf}</p>
  ${o.titel ? `<p style="margin:6px 0 0;font-family:${FONT};font-size:16px;line-height:1.5;color:${KLEUR.tekst}">${esc(o.titel)}</p>` : ""}
  ${feitenRij}
  <div style="height:26px;line-height:26px;font-size:0">&nbsp;</div>
  ${knop("Bekijk en onderteken je offerte", o.link)}
</td></tr></table>`;

  const kop = held(
    o.basis,
    m,
    o.herinnering ? "Je offerte staat nog voor je klaar" : "Je offerte staat klaar",
    `<div style="height:28px;line-height:28px;font-size:0">&nbsp;</div>${kaart}`
  );

  const onderdelen = o.onderdelen || [];
  const lijst = onderdelen.slice(0, MAX_ONDERDELEN).map(esc);
  const meer = onderdelen.length - lijst.length;
  if (meer > 0) lijst.push(`<span style="color:${KLEUR.grijs}">en nog ${meer} ${meer === 1 ? "onderdeel" : "onderdelen"}</span>`);
  const opties = o.opties || 0;
  const wat = lijst.length
    ? `${eyebrow("In je offerte", m.tekst)}
${vinkjes(m, lijst)}
${opties ? `<p style="margin:12px 0 0;font-family:${FONT};font-size:14px;line-height:1.55;color:${KLEUR.grijs}">Plus ${opties} ${opties === 1 ? "optie" : "opties"} die je zelf aan of uit zet. Het bedrag rekent meteen mee.</p>` : ""}`
    : "";

  const brief = [
    `Beste ${esc(o.aanhef?.trim() || "relatie")},`,
    ...alineasUit(o.bericht),
    o.herinnering
      ? `Je offerte voor ${esc(metPunt(o.bedrijf))} staat nog voor je klaar.${o.geldigTot ? ` Hij is geldig tot en met ${esc(o.geldigTot)}.` : ""}`
      : `In de offerte zie je precies wat we voor ${bedrijf} doen en wat het kost.${o.kiezen ? " Waar dat kan, kies je zelf je onderdelen." : ""} Akkoord? Dan onderteken je online.${
          o.geldigTot ? ` De offerte is geldig tot en met ${esc(o.geldigTot)}.` : ""
        }`,
  ].map((a) => p(a));

  const werkwijze = [
    { kop: "Bekijken", tekst: "Lees rustig wat we doen en wat het per maand kost. Op je telefoon of achter je bureau." },
    ...(o.kiezen ? [{ kop: "Kiezen", tekst: "Zet opties aan of uit. Het bedrag in je offerte rekent meteen mee." }] : []),
    { kop: "Ondertekenen", tekst: "Akkoord? Je tekent online en bevestigt met een code per mail. Je krijgt de getekende offerte als pdf." },
  ];

  const romp = vak(`${brief.join("")}
<div style="height:8px;line-height:8px;font-size:0">&nbsp;</div>
${wat ? `${wat}<div style="height:32px;line-height:32px;font-size:0">&nbsp;</div>` : ""}
${eyebrow("Zo werkt het", m.tekst)}
${stappen(m, werkwijze)}
<div style="height:34px;line-height:34px;font-size:0">&nbsp;</div>
${scheiding}
<div style="height:28px;line-height:28px;font-size:0">&nbsp;</div>
${afzenderKaart(o.afzender, m)}
<div style="height:30px;line-height:30px;font-size:0">&nbsp;</div>
${linkAlsTekst(o.link)}`);

  const geldig = o.geldigTot ? ` Geldig tot en met ${o.geldigTot}.` : "";
  return omhulsel({
    basis: o.basis,
    titel: `Offerte ${o.nummer} voor ${o.bedrijf}`,
    preheader: o.herinnering
      ? `Je offerte voor ${metPunt(o.bedrijf)}${geldig} Bekijk hem, kies je onderdelen en onderteken online.`
      : `Bekijk wat we voor ${o.bedrijf} doen, kies je onderdelen en onderteken online.${geldig}`,
    kaart: kop + romp,
    voetnoot: "Deze link is persoonlijk: stuur hem alleen door aan wie mag meebeslissen.",
    contact: o.contact,
  });
}

/* ---------- de code om te ondertekenen ---------- */

export function offerteCodeHtml(c: {
  basis: string; merk?: MailMerk | null; code: string; nummer: string; bedrijf: string; afzender: MailAfzender; contact?: ContactInfo;
}): string {
  const m = merkOf(c.merk);
  const kaart = vak(`${pil(`Offerte ${esc(c.nummer)}`, m.kleur)}
<div style="height:22px;line-height:22px;font-size:0">&nbsp;</div>
<p class="kop-groot" style="margin:0 0 12px;font-family:${FONT_KOP};font-size:32px;line-height:1.15;font-weight:700;letter-spacing:-0.015em;color:${KLEUR.indigo}">Je code om te ondertekenen</p>
${p(`Vul deze code in op de offertepagina om offerte ${esc(c.nummer)} voor ${esc(metPunt(c.bedrijf))} te ondertekenen.`, "margin-bottom:22px")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" style="background:#ffffff;border-radius:20px;padding:24px 16px">
  <p style="margin:0;font-family:${FONT_KOP};font-size:44px;line-height:1.1;font-weight:700;letter-spacing:0.24em;color:${KLEUR.indigo};mso-line-height-rule:exactly">${esc(c.code)}</p>
  <p style="margin:8px 0 0;font-family:${FONT};font-size:13px;line-height:1.4;color:${KLEUR.grijs}">Een kwartier geldig</p>
</td></tr></table>`, `${heldAchtergrond(c.basis, m)};border-radius:27px 27px 0 0`);
  const romp = vak(`${p("Heb je niet zelf om deze code gevraagd? Dan hoef je niets te doen. Zonder de code kan niemand namens jou tekenen.")}
<div style="height:8px;line-height:8px;font-size:0">&nbsp;</div>
${afzenderKaart(c.afzender, m)}`);
  return omhulsel({
    basis: c.basis,
    titel: `Je code voor offerte ${c.nummer}`,
    preheader: `${c.code} is je code om offerte ${c.nummer} te ondertekenen. Een kwartier geldig.`,
    kaart: kaart + romp,
    contact: c.contact,
  });
}

/* ---------- de bevestiging na het tekenen ---------- */

export function offerteGetekendHtml(b: {
  basis: string; merk?: MailMerk | null; naam: string; bedrijf: string; nummer: string; link: string; hash: string; moment: string;
  regels: { naam: string; bedrag: string }[]; totalen: { label: string; bedrag: string }[]; afzender: MailAfzender;
  vervolg?: { kop: string; tekst: string }[] | null; pdf: boolean; contact?: ContactInfo;
}): string {
  const m = merkOf(b.merk);
  const voornaam = b.naam.trim().split(/\s+/)[0] || b.naam;
  const rij = (l: string, r: string, laatste: boolean) =>
    `<tr><td style="padding:11px 12px 11px 0;font-family:${FONT};font-size:15px;line-height:1.45;color:${KLEUR.inkt};${laatste ? "" : `border-bottom:1px solid ${KLEUR.lijn};`}">${esc(l)}</td>` +
    `<td align="right" style="padding:11px 0;font-family:${FONT};font-size:15px;line-height:1.45;color:${KLEUR.inkt};white-space:nowrap;${laatste ? "" : `border-bottom:1px solid ${KLEUR.lijn};`}">${esc(r)}</td></tr>`;
  const totaal = (t: { label: string; bedrag: string }) =>
    `<tr><td style="padding:12px 12px 0 0;font-family:${FONT};font-size:15px;font-weight:700;color:${KLEUR.inkt}">${esc(t.label)}</td>` +
    `<td align="right" style="padding:12px 0 0;font-family:${FONT_KOP};font-size:22px;font-weight:700;color:${KLEUR.inkt};white-space:nowrap">${esc(t.bedrag)}</td></tr>`;

  const overzicht = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:#ffffff;border-radius:20px;padding:22px 26px 24px" class="binnen">
  ${eyebrow(`Offerte ${esc(b.nummer)}`, m.tekst)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${b.regels.map((r, i) => rij(r.naam, r.bedrag, i === b.regels.length - 1)).join("")}</table>
  ${b.totalen.length ? `<div style="height:6px;line-height:6px;font-size:0">&nbsp;</div>${scheiding}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${b.totalen.map(totaal).join("")}</table>` : ""}
  <p style="margin:10px 0 0;font-family:${FONT};font-size:13px;line-height:1.4;color:${KLEUR.grijs}">Alle bedragen exclusief btw.</p>
</td></tr></table>`;

  const kop = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="held" style="${heldAchtergrond(b.basis, m)};border-radius:27px 27px 0 0;padding:38px 40px 36px">
  ${pil("Ondertekend", m.kleur, "&#10003;")}
  <div style="height:22px;line-height:22px;font-size:0">&nbsp;</div>
  <p class="kop-groot" style="margin:0;font-family:${FONT_KOP};font-size:36px;line-height:1.12;font-weight:700;letter-spacing:-0.02em;color:${KLEUR.indigo}">Bedankt, ${esc(voornaam)}.<br><span style="color:${m.kleur}">We gaan voor je aan de slag.</span></p>
  <p style="margin:14px 0 0;font-family:${FONT};font-size:16px;line-height:1.6;color:${KLEUR.tekst}">Je hebt op ${esc(b.moment)} de offerte voor ${esc(metPunt(b.bedrijf))} ondertekend. Hieronder staat wat je hebt gekozen.</p>
  <div style="height:26px;line-height:26px;font-size:0">&nbsp;</div>
  ${overzicht}
</td></tr></table>`;

  // De eerste stap van een offerte is meestal het ondertekenen zelf: die is nu gebeurd.
  const vervolg = (b.vervolg || []).filter((s, i) => s.kop?.trim() && !(i === 0 && /teken/i.test(s.kop)));
  const romp = vak(`${p(
    b.pdf
      ? "In de bijlage zit de ondertekende offerte als pdf, met achterin het ondertekeningscertificaat. Bewaar hem bij je administratie of stuur hem door naar inkoop."
      : "Via de knop zie je de ondertekende offerte terug en download je hem als pdf."
  )}
<div style="height:6px;line-height:6px;font-size:0">&nbsp;</div>
${knop("Bekijk de ondertekende offerte", b.link, KLEUR.indigo, 330)}
${vervolg.length ? `<div style="height:36px;line-height:36px;font-size:0">&nbsp;</div>${eyebrow("Zo gaat het verder", m.tekst)}${stappen(m, vervolg)}` : ""}
<div style="height:34px;line-height:34px;font-size:0">&nbsp;</div>
${scheiding}
<div style="height:28px;line-height:28px;font-size:0">&nbsp;</div>
${afzenderKaart(b.afzender, m)}`);

  return omhulsel({
    basis: b.basis,
    titel: `Ondertekend: offerte ${b.nummer}`,
    preheader: `Je hebt offerte ${b.nummer} voor ${metPunt(b.bedrijf)} ondertekend.${b.pdf ? " De getekende offerte zit als pdf in de bijlage." : ""}`,
    kaart: kop + romp,
    voetnoot: `Kenmerk van de ondertekende versie: <span style="font-family:ui-monospace,Menlo,Consolas,monospace;word-break:break-all">${esc(b.hash)}</span>`,
    contact: b.contact,
  });
}
