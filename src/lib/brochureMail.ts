import type { ContactInfo } from "./content";
import { MERKEN } from "./offerteMerk";
import {
  afzenderKaart, alineasUit, esc, eyebrow, FONT, FONT_KOP, heldAchtergrond, KLEUR, knop, linkAlsTekst, metPunt, omhulsel, p, pil, scheiding, vak,
  type MailAfzender,
} from "./offerteMail";

/*
 * De mail waarmee een prospect zijn brochure krijgt: dezelfde opmaak als de
 * offertemail (lib/offerteMail.ts), maar in de kleuren van React2u zelf in
 * plaats van één label, want de brochure gaat over alle zes diensten. Bovenaan
 * het woordmerk met de belofte van de site, een kaart met de knop, daaronder
 * het persoonlijke woord van de afzender en de zes diensten in hun eigen kleur.
 * De prijzen staan in de brochure zelf, niet in de mail.
 */

/** Wat de mail per dienst nodig heeft. */
export type MailDienst = { naam: string; kleur: string; tekst: string; dienst: string };

export type BrochureMail = {
  basis: string;
  aanhef: string | null;
  bedrijf: string;
  nummer: string;
  link: string;
  bericht: string | null;
  afzender: MailAfzender;
  herinnering?: boolean;
  diensten: MailDienst[];
  contact?: ContactInfo;
};

/** De indigo tint van React2u Ready als kleur van de kop: het label zonder eigen kleur. */
const HUIS = MERKEN.ready;

/** De zes diensten als rijen met een stip in de labelkleur. */
function dienstenLijst(diensten: MailDienst[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${diensten
    .map(
      (d, i) => `<tr>
<td width="22" valign="top" style="padding:${i ? 12 : 0}px 0 0"><span style="display:inline-block;width:12px;height:12px;border-radius:999px;background:${esc(d.kleur)};margin-top:5px"></span></td>
<td valign="top" style="padding:${i ? 12 : 0}px 0 0">
  <p style="margin:0;font-family:${FONT_KOP};font-size:16px;line-height:1.4;font-weight:700;color:${KLEUR.inkt}">React2u <span style="color:${esc(d.kleur)}">${esc(d.naam)}</span> <span style="font-family:${FONT};font-weight:400;color:${KLEUR.grijs}">· ${esc(d.dienst.replace(/\.$/, ""))}</span></p>
  <p style="margin:2px 0 0;font-family:${FONT};font-size:14.5px;line-height:1.55;color:${KLEUR.tekst}">${esc(d.tekst)}</p>
</td>
</tr>`,
    )
    .join("")}</table>`;
}

export function brochureMailHtml(b: BrochureMail): string {
  const bedrijf = esc(b.bedrijf);
  const kaart = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:#ffffff;border-radius:20px;padding:26px 28px 28px" class="binnen">
  ${eyebrow(`Brochure ${esc(b.nummer)}`, HUIS.tekst)}
  <p class="kop-groot" style="margin:0;font-family:${FONT_KOP};font-size:28px;line-height:1.18;font-weight:700;letter-spacing:-0.015em;color:${KLEUR.inkt}">Voor ${bedrijf}</p>
  <p style="margin:6px 0 0;font-family:${FONT};font-size:16px;line-height:1.5;color:${KLEUR.tekst}">Alles wat React2u voor je organisatie kan doen, met onze tarieven, in één overzicht. Lezen op je telefoon of achter je bureau, en als pdf om door te sturen.</p>
  <div style="height:26px;line-height:26px;font-size:0">&nbsp;</div>
  ${knop("Bekijk de brochure", b.link)}
</td></tr></table>`;

  const kop = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="held" style="${heldAchtergrond(b.basis, HUIS)};border-radius:27px 27px 0 0;padding:38px 40px 36px">
  ${pil(b.herinnering ? "Je brochure staat nog voor je klaar" : "Je brochure staat klaar", KLEUR.roze)}
  <div style="height:26px;line-height:26px;font-size:0">&nbsp;</div>
  <p class="label" style="margin:0;font-family:${FONT_KOP};font-size:52px;line-height:1;font-weight:700;letter-spacing:-0.025em;color:${KLEUR.indigo}">React2u</p>
  <p style="margin:18px 0 0;font-family:${FONT};font-size:18px;line-height:1.35;font-weight:700;color:${KLEUR.indigo}">Jouw mensen, <span style="color:${KLEUR.roze}">onze aandacht.</span></p>
  <p style="margin:2px 0 0;font-family:${FONT};font-size:18px;line-height:1.35;font-style:italic;color:${KLEUR.indigo}">Zes specialismen, los af te nemen</p>
  <div style="height:28px;line-height:28px;font-size:0">&nbsp;</div>
  ${kaart}
</td></tr></table>`;

  const brief = [
    `Beste ${esc(b.aanhef?.trim() || "relatie")},`,
    ...alineasUit(b.bericht),
    b.herinnering
      ? `Je brochure voor ${esc(metPunt(b.bedrijf))} staat nog voor je klaar. Lees hem rustig door, en bel of mail me als je ergens meer over wilt weten.`
      : `In de brochure lees je per specialisme wat we doen en voor wie, met al onze tarieven op een rij. Wil je weten wat het voor ${bedrijf} precies kost? Dan maak ik een voorstel op maat.`,
  ].map((a) => p(a));

  const romp = vak(`${brief.join("")}
<div style="height:8px;line-height:8px;font-size:0">&nbsp;</div>
${eyebrow("In de brochure", HUIS.tekst)}
${dienstenLijst(b.diensten)}
<div style="height:34px;line-height:34px;font-size:0">&nbsp;</div>
${scheiding}
<div style="height:28px;line-height:28px;font-size:0">&nbsp;</div>
${afzenderKaart(b.afzender, HUIS)}
<div style="height:30px;line-height:30px;font-size:0">&nbsp;</div>
${linkAlsTekst(b.link)}`);

  return omhulsel({
    basis: b.basis,
    titel: `Brochure van React2u voor ${b.bedrijf}`,
    preheader: b.herinnering
      ? `Je brochure voor ${metPunt(b.bedrijf)} staat nog voor je klaar.`
      : `Alles wat React2u voor ${b.bedrijf} kan doen: zes specialismen, los af te nemen.`,
    kaart: kop + romp,
    contact: b.contact,
  });
}
