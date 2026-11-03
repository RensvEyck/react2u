import type { ContactInfo } from "./content";
import { MERKEN } from "./offerteMerk";
import {
  afzenderKaart, alineasUit, esc, eyebrow, FONT, FONT_KOP, heldAchtergrond, KLEUR, knop, linkAlsTekst, metPunt, omhulsel, p, pil, scheiding, stappen,
  vak, vinkjes, type Feit, type MailAfzender,
} from "./offerteMail";

/*
 * De mails over een basiscontract (migratie 0031): het contract zelf, de code
 * om te tekenen en de bevestiging daarna. Dezelfde opmaak als de offertemails
 * (lib/offerteMail.ts), in de kleuren van React2u zelf zoals de brochure: een
 * basiscontract hoort bij de arbodienst, niet bij één label.
 */

/** De indigo tint van React2u Ready als kleur van de kop, net als bij de brochure. */
const HUIS = MERKEN.ready;

const ruimte = (px: number) => `<div style="height:${px}px;line-height:${px}px;font-size:0">&nbsp;</div>`;

/** "React2u" met "Basiscontract" groot eronder, zoals het woordmerk van een label. */
function woordmerk() {
  return `<p style="margin:0;font-family:${FONT_KOP};font-size:22px;line-height:1.1;font-weight:700;letter-spacing:-0.01em;color:${KLEUR.indigo}">React2u</p>
<p class="label" style="margin:2px 0 0;font-family:${FONT_KOP};font-size:50px;line-height:1;font-weight:700;letter-spacing:-0.025em;color:${KLEUR.indigo}">Basiscontract</p>
<p style="margin:18px 0 0;font-family:${FONT};font-size:18px;line-height:1.35;font-weight:700;color:${KLEUR.indigo}">Arbodienstverlening.</p>
<p style="margin:2px 0 0;font-family:${FONT};font-size:18px;line-height:1.35;font-style:italic;color:${KLEUR.indigo}">Jouw mensen, <span style="color:${KLEUR.roze}">onze aandacht.</span></p>`;
}

function feitenRij(feiten: Feit[]) {
  if (!feiten.length) return "";
  return `${ruimte(22)}${scheiding}${ruimte(20)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${feiten
    .map(
      (f, i) => `<td class="kol" valign="top" width="${Math.floor(100 / feiten.length)}%" style="padding:0 ${i === feiten.length - 1 ? 0 : 12}px 0 0">
  <p style="margin:0 0 4px;font-family:${FONT};font-size:12px;line-height:1.3;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${KLEUR.grijs}">${esc(f.label)}</p>
  <p style="margin:0;font-family:${FONT_KOP};font-size:19px;line-height:1.25;font-weight:700;color:${KLEUR.inkt}">${esc(f.waarde)}</p>
  ${f.sub ? `<p style="margin:2px 0 0;font-family:${FONT};font-size:13px;line-height:1.4;color:${KLEUR.grijs}">${esc(f.sub)}</p>` : ""}
</td>`,
    )
    .join("")}</tr></table>`;
}

/* ---------- het contract ---------- */

export type ContractMail = {
  basis: string;
  aanhef: string | null;
  bedrijf: string;
  nummer: string;
  link: string;
  bericht: string | null;
  afzender: MailAfzender;
  herinnering?: boolean;
  /** Ingangsdatum, looptijd en offerte voor de kaart. */
  feiten: Feit[];
  /** De belangrijkste afspraken in gewone woorden, als vinkjes. */
  kort: string[];
  contact?: ContactInfo;
};

export function contractMailHtml(c: ContractMail): string {
  const bedrijf = esc(c.bedrijf);
  const kaart = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:#ffffff;border-radius:20px;padding:26px 28px 28px" class="binnen">
  ${eyebrow(`Contract ${esc(c.nummer)}`, HUIS.tekst)}
  <p class="kop-groot" style="margin:0;font-family:${FONT_KOP};font-size:28px;line-height:1.18;font-weight:700;letter-spacing:-0.015em;color:${KLEUR.inkt}">${bedrijf}</p>
  <p style="margin:6px 0 0;font-family:${FONT};font-size:16px;line-height:1.5;color:${KLEUR.tekst}">Het basiscontract tussen React2u en ${bedrijf}, zoals de Arbowet het vraagt.</p>
  ${feitenRij(c.feiten.slice(0, 3))}
  ${ruimte(26)}
  ${knop("Bekijk en onderteken het contract", c.link)}
</td></tr></table>`;

  const kop = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="held" style="${heldAchtergrond(c.basis, HUIS)};border-radius:27px 27px 0 0;padding:38px 40px 36px">
  ${pil(c.herinnering ? "Je contract staat nog voor je klaar" : "Je contract staat klaar", KLEUR.roze)}
  ${ruimte(26)}
  ${woordmerk()}
  ${ruimte(28)}
  ${kaart}
</td></tr></table>`;

  const brief = [
    `Beste ${esc(c.aanhef?.trim() || "relatie")},`,
    ...alineasUit(c.bericht),
    c.herinnering
      ? `Het basiscontract voor ${esc(metPunt(c.bedrijf))} staat nog voor je klaar. Lees het rustig door; akkoord? Dan teken je online, in een paar minuten.`
      : `Sinds 1 juli 2017 vraagt de Arbowet dat elke werkgever een basiscontract heeft met zijn arbodienst. Hierin staat wat je van ons kunt verwachten: de begeleiding bij verzuim, het open spreekuur bij de bedrijfsarts, de second opinion en hoe we met de gegevens van je mensen omgaan. Lees het rustig door; akkoord? Dan teken je online.`,
  ].map((a) => p(a));

  const werkwijze = [
    { kop: "Lezen", tekst: "Het hele contract staat op één pagina, met de afspraken per artikel. Ook als pdf om intern te bespreken." },
    { kop: "Gegevens invullen", tekst: "De statutaire naam, het adres en het KvK-nummer van je organisatie, zoals in het handelsregister." },
    { kop: "Ondertekenen", tekst: "Je tekent online en bevestigt met een code per mail. Je krijgt het getekende contract als pdf." },
  ];

  const romp = vak(`${brief.join("")}
${ruimte(8)}
${c.kort.length ? `${eyebrow("In het kort", HUIS.tekst)}${vinkjes(HUIS, c.kort.map(esc))}${ruimte(32)}` : ""}
${eyebrow("Zo werkt het", HUIS.tekst)}
${stappen(HUIS, werkwijze)}
${ruimte(34)}
${scheiding}
${ruimte(28)}
${afzenderKaart(c.afzender, HUIS)}
${ruimte(30)}
${linkAlsTekst(c.link)}`);

  return omhulsel({
    basis: c.basis,
    titel: `Basiscontract ${c.nummer} voor ${c.bedrijf}`,
    preheader: c.herinnering
      ? `Het basiscontract voor ${metPunt(c.bedrijf)} staat nog voor je klaar.`
      : `Het basiscontract arbodienstverlening voor ${c.bedrijf}: lezen en online ondertekenen.`,
    kaart: kop + romp,
    voetnoot: "Deze link is persoonlijk: stuur hem alleen door aan wie mag meebeslissen of tekenen.",
    contact: c.contact,
  });
}

/* ---------- de code om te ondertekenen ---------- */

export function contractCodeHtml(c: {
  basis: string; code: string; nummer: string; bedrijf: string; afzender: MailAfzender; contact?: ContactInfo;
}): string {
  const kaart = vak(`${pil(`Contract ${esc(c.nummer)}`, KLEUR.roze)}
${ruimte(22)}
<p class="kop-groot" style="margin:0 0 12px;font-family:${FONT_KOP};font-size:32px;line-height:1.15;font-weight:700;letter-spacing:-0.015em;color:${KLEUR.indigo}">Je code om te ondertekenen</p>
${p(`Vul deze code in op de contractpagina om het basiscontract voor ${esc(metPunt(c.bedrijf))} te ondertekenen.`, "margin-bottom:22px")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" style="background:#ffffff;border-radius:20px;padding:24px 16px">
  <p style="margin:0;font-family:${FONT_KOP};font-size:44px;line-height:1.1;font-weight:700;letter-spacing:0.24em;color:${KLEUR.indigo};mso-line-height-rule:exactly">${esc(c.code)}</p>
  <p style="margin:8px 0 0;font-family:${FONT};font-size:13px;line-height:1.4;color:${KLEUR.grijs}">Een kwartier geldig</p>
</td></tr></table>`, `${heldAchtergrond(c.basis, HUIS)};border-radius:27px 27px 0 0`);
  const romp = vak(`${p("Heb je niet zelf om deze code gevraagd? Dan hoef je niets te doen. Zonder de code kan niemand namens jou tekenen.")}
${ruimte(8)}
${afzenderKaart(c.afzender, HUIS)}`);
  return omhulsel({
    basis: c.basis,
    titel: `Je code voor contract ${c.nummer}`,
    preheader: `${c.code} is je code om het basiscontract te ondertekenen. Een kwartier geldig.`,
    kaart: kaart + romp,
    contact: c.contact,
  });
}

/* ---------- de bevestiging na het tekenen ---------- */

export function contractGetekendHtml(b: {
  basis: string; naam: string; bedrijf: string; nummer: string; link: string; hash: string; moment: string;
  regels: { label: string; waarde: string }[]; afzender: MailAfzender; pdf: boolean; contact?: ContactInfo;
}): string {
  const voornaam = b.naam.trim().split(/\s+/)[0] || b.naam;
  const rij = (l: string, r: string, laatste: boolean) =>
    `<tr><td valign="top" style="padding:11px 12px 11px 0;font-family:${FONT};font-size:14px;line-height:1.45;color:${KLEUR.grijs};white-space:nowrap;${laatste ? "" : `border-bottom:1px solid ${KLEUR.lijn};`}">${esc(l)}</td>` +
    `<td align="right" valign="top" style="padding:11px 0;font-family:${FONT};font-size:15px;line-height:1.45;font-weight:600;color:${KLEUR.inkt};${laatste ? "" : `border-bottom:1px solid ${KLEUR.lijn};`}">${esc(r)}</td></tr>`;

  const overzicht = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:#ffffff;border-radius:20px;padding:22px 26px 24px" class="binnen">
  ${eyebrow(`Contract ${esc(b.nummer)}`, HUIS.tekst)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${b.regels.map((r, i) => rij(r.label, r.waarde, i === b.regels.length - 1)).join("")}</table>
</td></tr></table>`;

  const kop = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="held" style="${heldAchtergrond(b.basis, HUIS)};border-radius:27px 27px 0 0;padding:38px 40px 36px">
  ${pil("Ondertekend", KLEUR.roze, "&#10003;")}
  ${ruimte(22)}
  <p class="kop-groot" style="margin:0;font-family:${FONT_KOP};font-size:36px;line-height:1.12;font-weight:700;letter-spacing:-0.02em;color:${KLEUR.indigo}">Bedankt, ${esc(voornaam)}.<br><span style="color:${KLEUR.roze}">Het contract is rond.</span></p>
  <p style="margin:14px 0 0;font-family:${FONT};font-size:16px;line-height:1.6;color:${KLEUR.tekst}">Je hebt op ${esc(b.moment)} het basiscontract arbodienstverlening voor ${esc(metPunt(b.bedrijf))} ondertekend.</p>
  ${ruimte(26)}
  ${overzicht}
</td></tr></table>`;

  const romp = vak(`${p(
    b.pdf
      ? "In de bijlage zit het ondertekende contract als pdf, met achterin het ondertekeningscertificaat. Bewaar het bij je administratie; je ondernemingsraad of personeelsvertegenwoordiging mag het inzien."
      : "Via de knop zie je het ondertekende contract terug en download je het als pdf.",
  )}
${ruimte(6)}
${knop("Bekijk het ondertekende contract", b.link, KLEUR.indigo, 340)}
${ruimte(34)}
${scheiding}
${ruimte(28)}
${afzenderKaart(b.afzender, HUIS)}`);

  return omhulsel({
    basis: b.basis,
    titel: `Ondertekend: basiscontract ${b.nummer}`,
    preheader: `Je hebt het basiscontract voor ${metPunt(b.bedrijf)} ondertekend.${b.pdf ? " Het getekende contract zit als pdf in de bijlage." : ""}`,
    kaart: kop + romp,
    voetnoot: `Kenmerk van de ondertekende versie: <span style="font-family:ui-monospace,Menlo,Consolas,monospace;word-break:break-all">${esc(b.hash)}</span>`,
    contact: b.contact,
  });
}
