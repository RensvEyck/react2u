import type { ContactInfo } from "./content";
import { MERKEN } from "./offerteMerk";
import { afzenderKaart, alineasUit, esc, eyebrow, FONT, FONT_KOP, heldAchtergrond, KLEUR, knop, linkAlsTekst, metPunt, omhulsel, p, pil, scheiding, vak, type MailAfzender } from "./offerteMail";
import { MINUTEN, VRIJE_VELDEN } from "./evaluatie";

/*
 * De mails van de klantevaluatie (0043), in dezelfde opmaak als de
 * onboardingmail (lib/onboardingMail.ts): bovenaan de kop met een kaart en de
 * knop, daaronder het persoonlijke woord van de afzender, wat we vragen als
 * korte lijst, de afzender en de link als tekst. Bij een herinnering staat
 * erbij dat de evaluatie nog openstaat; na het invullen krijgt de klant een
 * bevestiging met de pdf.
 */

const HUIS = MERKEN.ready;
const ruimte = (h: number) => `<div style="height:${h}px;line-height:${h}px;font-size:0">&nbsp;</div>`;

export type EvaluatieMail = {
  basis: string;
  aanhef: string | null;
  bedrijf: string;
  nummer: string;
  link: string;
  bericht: string | null;
  afzender: MailAfzender;
  herinnering?: boolean;
  /** De dag van het bezoek, al in woorden ("20 november 2026"), als die er is. */
  bezoek?: string | null;
  contact?: ContactInfo;
};

/** De onderdelen van de evaluatie, als lijstje in de mail. */
const ONDERDELEN = [
  { titel: "Checklist", tekst: "Negen punten over arbo en verzuim: geregeld, nog niet, of niet van toepassing." },
  ...VRIJE_VELDEN.map((v) => ({ titel: v.titel.replace(/\s*\(tevens wijzen op het KTO\)/, ""), tekst: v.hint })),
  { titel: "Acties", tekst: "Wie wat oppakt, en wanneer we elkaar weer zien." },
];

function lijst(items: { titel: string; tekst: string }[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items
    .map(
      (d, i) => `<tr>
<td width="34" valign="top" style="padding:${i ? 12 : 0}px 0 0">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" width="24" height="24" style="width:24px;height:24px;border-radius:999px;background:${KLEUR.indigo};font-family:${FONT};font-size:13px;font-weight:700;color:#ffffff">${i + 1}</td></tr></table>
</td>
<td valign="top" style="padding:${i ? 12 : 0}px 0 0">
  <p style="margin:0;font-family:${FONT_KOP};font-size:16px;line-height:1.4;font-weight:700;color:${KLEUR.inkt}">${esc(d.titel)}</p>
  <p style="margin:2px 0 0;font-family:${FONT};font-size:14.5px;line-height:1.55;color:${KLEUR.tekst}">${esc(d.tekst)}</p>
</td>
</tr>`,
    )
    .join("")}</table>`;
}

function kopKaart(eyebrowTekst: string, titel: string, tekst: string, knopTekst: string, link: string, kleur = KLEUR.roze) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:#ffffff;border-radius:20px;padding:26px 28px 28px" class="binnen">
  ${eyebrow(eyebrowTekst, HUIS.tekst)}
  <p class="kop-groot" style="margin:0;font-family:${FONT_KOP};font-size:28px;line-height:1.18;font-weight:700;letter-spacing:-0.015em;color:${KLEUR.inkt}">${titel}</p>
  <p style="margin:6px 0 0;font-family:${FONT};font-size:16px;line-height:1.5;color:${KLEUR.tekst}">${tekst}</p>
  ${ruimte(26)}
  ${knop(knopTekst, link, kleur)}
</td></tr></table>`;
}

function held(basis: string, pilTekst: string, pilKleur: string, kaart: string, teken?: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="held" style="${heldAchtergrond(basis, HUIS)};border-radius:27px 27px 0 0;padding:38px 40px 36px">
  ${pil(pilTekst, pilKleur, teken)}
  ${ruimte(26)}
  <p class="label" style="margin:0;font-family:${FONT_KOP};font-size:52px;line-height:1;font-weight:700;letter-spacing:-0.025em;color:${KLEUR.indigo}">React2u</p>
  <p style="margin:18px 0 0;font-family:${FONT};font-size:18px;line-height:1.35;font-weight:700;color:${KLEUR.indigo}">Jouw mensen, <span style="color:${KLEUR.roze}">onze aandacht.</span></p>
  <p style="margin:2px 0 0;font-family:${FONT};font-size:18px;line-height:1.35;font-style:italic;color:${KLEUR.indigo}">Samen kijken hoe het gaat</p>
  ${ruimte(28)}
  ${kaart}
</td></tr></table>`;
}

/** Aan de klant: de uitnodiging om de evaluatie in te vullen, of de herinnering. */
export function evaluatieMailHtml(e: EvaluatieMail): string {
  const bedrijf = esc(e.bedrijf);
  const kaart = kopKaart(
    `Klantevaluatie ${esc(e.nummer)}`,
    e.herinnering ? `Je evaluatie staat nog klaar, ${bedrijf}` : `Hoe gaat het, ${bedrijf}?`,
    e.herinnering
      ? "Vul hem in wanneer het je uitkomt; wat je al invulde, is bewaard."
      : `Eén keer per jaar kijken we samen hoe het gaat. Online invullen kost ongeveer ${MINUTEN} minuten${e.bezoek ? `; we bespreken het op ${esc(e.bezoek)}` : ""}.`,
    e.herinnering ? "Ga verder met de evaluatie" : "Vul de evaluatie in",
    e.link,
  );
  const brief = [
    `Beste ${esc(e.aanhef?.trim() || "relatie")},`,
    ...alineasUit(e.bericht),
    e.herinnering
      ? `De evaluatie voor ${esc(metPunt(e.bedrijf))} staat nog voor je klaar. Je kunt verder waar je gebleven was.`
      : "Via de knop vind je de evaluatie. Je kunt tussendoor stoppen en later verder; na het invullen krijg je een kopie als pdf.",
  ].map((a) => p(a));
  const romp = vak(`${brief.join("")}
${ruimte(8)}
${eyebrow("Wat we vragen", HUIS.tekst)}
${lijst(ONDERDELEN)}
${ruimte(34)}
${scheiding}
${ruimte(28)}
${afzenderKaart(e.afzender, HUIS)}
${ruimte(30)}
${linkAlsTekst(e.link)}`);
  return omhulsel({
    basis: e.basis,
    titel: e.herinnering ? `Herinnering: de klantevaluatie van ${e.bedrijf}` : `Klantevaluatie React2u voor ${e.bedrijf}`,
    preheader: e.herinnering ? `De evaluatie voor ${metPunt(e.bedrijf)} staat nog open.` : `Samen kijken hoe het gaat: de jaarlijkse evaluatie van React2u, in ongeveer ${MINUTEN} minuten in te vullen.`,
    kaart: held(e.basis, e.herinnering ? "Je evaluatie staat nog open" : "Jouw mening telt", KLEUR.roze, kaart) + romp,
    contact: e.contact,
  });
}

export type EvaluatieIngevuldMail = {
  basis: string;
  aanhef: string | null;
  bedrijf: string;
  nummer: string;
  link: string;
  moment: string;
  door: string | null;
  /** Hoeveel punten de klant op "nog niet" zette: daar praten we over. */
  aandachtspunten: string[];
  afzender: MailAfzender;
  pdf: boolean;
  contact?: ContactInfo;
};

/** Aan de klant na het invullen: dank je wel, de kopie als pdf, en wat er nu gebeurt. */
export function evaluatieIngevuldHtml(m: EvaluatieIngevuldMail): string {
  const aanhef = esc(m.aanhef?.trim() || "relatie");
  const kaart = kopKaart(
    `Klantevaluatie ${esc(m.nummer)}`,
    `Dank je wel, ${aanhef}.`,
    `We hebben de evaluatie van <strong>${esc(m.bedrijf)}</strong> ontvangen op ${esc(m.moment)}${m.door ? `, ingevuld door ${esc(m.door)}` : ""}.`,
    "Bekijk je evaluatie",
    m.link,
    KLEUR.indigo,
  );
  const punten = m.aandachtspunten.length
    ? `Je gaf aan dat ${m.aandachtspunten.length === 1 ? "één punt" : `${m.aandachtspunten.length} punten`} nog niet geregeld ${m.aandachtspunten.length === 1 ? "is" : "zijn"}: ${esc(m.aandachtspunten.join(", "))}. Daar kijken we in ons gesprek samen naar; waar het past, helpen we je op weg.`
    : "Mooi om te zien dat de punten van de checklist geregeld zijn. In ons gesprek kijken we vooral naar wat je komend jaar nodig hebt.";
  const brief = [
    m.pdf ? "In de bijlage zit een kopie van wat je invulde, als pdf voor je eigen administratie." : "Via de link hierboven kun je altijd teruglezen wat je invulde.",
    punten,
    "Wil je nog iets wijzigen? Open de evaluatie, pas het aan en sla opnieuw op. Wij werken met de laatste versie.",
  ].map((a) => p(a));
  const romp = vak(`${brief.join("")}
${ruimte(34)}
${scheiding}
${ruimte(28)}
${afzenderKaart(m.afzender, HUIS)}
${ruimte(30)}
${linkAlsTekst(m.link)}`);
  return omhulsel({
    basis: m.basis,
    titel: `Ontvangen: de klantevaluatie van ${m.bedrijf}`,
    preheader: `We hebben je evaluatie ontvangen op ${m.moment}. ${m.pdf ? "De kopie zit in de bijlage." : ""}`.trim(),
    kaart: held(m.basis, "Ontvangen", KLEUR.roze, kaart, "&#10003;") + romp,
    contact: m.contact,
  });
}
