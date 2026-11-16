import type { ContactInfo } from "./content";
import { MERKEN } from "./offerteMerk";
import {
  afzenderKaart, alineasUit, esc, eyebrow, FONT, FONT_KOP, heldAchtergrond, KLEUR, knop, linkAlsTekst, metPunt, omhulsel, p, pil, scheiding, vak,
  type MailAfzender,
} from "./offerteMail";

/*
 * De mail waarmee een nieuwe klant zijn onboarding krijgt (0037): dezelfde
 * opmaak als de brochuremail, met bovenaan een welkom en een kaart met de
 * knop, daaronder het persoonlijke woord en de documenten als checklist. Bij
 * een herinnering staat erbij wat nog openstaat.
 */

export type MailDocument = { titel: string; kort: string; kleur: string; actie: string; klaar: boolean };

export type OnboardingMail = {
  basis: string;
  aanhef: string | null;
  bedrijf: string;
  nummer: string;
  link: string;
  bericht: string | null;
  afzender: MailAfzender;
  herinnering?: boolean;
  documenten: MailDocument[];
  contact?: ContactInfo;
};

const HUIS = MERKEN.ready;

function checklist(docs: MailDocument[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${docs
    .map(
      (d, i) => `<tr>
<td width="34" valign="top" style="padding:${i ? 14 : 0}px 0 0">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" width="24" height="24" style="width:24px;height:24px;border-radius:999px;background:${d.klaar ? "#0a7a4b" : esc(d.kleur)};font-family:${FONT};font-size:13px;font-weight:700;color:#ffffff">${d.klaar ? "&#10003;" : i + 1}</td></tr></table>
</td>
<td valign="top" style="padding:${i ? 14 : 0}px 0 0">
  <p style="margin:0;font-family:${FONT_KOP};font-size:16px;line-height:1.4;font-weight:700;color:${KLEUR.inkt}">${esc(d.titel)}${d.klaar ? ` <span style="font-family:${FONT};font-weight:600;font-size:13px;color:#0a7a4b">&middot; klaar</span>` : ""}</p>
  <p style="margin:2px 0 0;font-family:${FONT};font-size:14.5px;line-height:1.55;color:${KLEUR.tekst}">${esc(d.actie)}</p>
</td>
</tr>`,
    )
    .join("")}</table>`;
}

export function onboardingMailHtml(o: OnboardingMail): string {
  const bedrijf = esc(o.bedrijf);
  const open = o.documenten.filter((d) => !d.klaar).length;
  const kaart = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:#ffffff;border-radius:20px;padding:26px 28px 28px" class="binnen">
  ${eyebrow(`Onboarding ${esc(o.nummer)}`, HUIS.tekst)}
  <p class="kop-groot" style="margin:0;font-family:${FONT_KOP};font-size:28px;line-height:1.18;font-weight:700;letter-spacing:-0.015em;color:${KLEUR.inkt}">Welkom, ${bedrijf}</p>
  <p style="margin:6px 0 0;font-family:${FONT};font-size:16px;line-height:1.5;color:${KLEUR.tekst}">${
    o.herinnering && open
      ? `Nog ${open} ${open === 1 ? "stap" : "stappen"} en jullie zijn klaar om te starten. Je kunt verder waar je gebleven was.`
      : "Alles om goed te starten op één plek: hoe we werken, wat je medewerkers doen bij ziekte, en wat we van jullie nodig hebben."
  }</p>
  <div style="height:26px;line-height:26px;font-size:0">&nbsp;</div>
  ${knop(o.herinnering ? "Ga verder met je onboarding" : "Start je onboarding", o.link)}
</td></tr></table>`;

  const kop = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="held" style="${heldAchtergrond(o.basis, HUIS)};border-radius:27px 27px 0 0;padding:38px 40px 36px">
  ${pil(o.herinnering ? "Je onboarding staat nog open" : "Welkom bij React2u", KLEUR.roze)}
  <div style="height:26px;line-height:26px;font-size:0">&nbsp;</div>
  <p class="label" style="margin:0;font-family:${FONT_KOP};font-size:52px;line-height:1;font-weight:700;letter-spacing:-0.025em;color:${KLEUR.indigo}">React2u</p>
  <p style="margin:18px 0 0;font-family:${FONT};font-size:18px;line-height:1.35;font-weight:700;color:${KLEUR.indigo}">Jouw mensen, <span style="color:${KLEUR.roze}">onze aandacht.</span></p>
  <p style="margin:2px 0 0;font-family:${FONT};font-size:18px;line-height:1.35;font-style:italic;color:${KLEUR.indigo}">Samen goed van start</p>
  <div style="height:28px;line-height:28px;font-size:0">&nbsp;</div>
  ${kaart}
</td></tr></table>`;

  const brief = [
    `Beste ${esc(o.aanhef?.trim() || "relatie")},`,
    ...alineasUit(o.bericht),
    o.herinnering
      ? `De onboarding voor ${esc(metPunt(o.bedrijf))} staat nog voor je klaar. Wat je al invulde, is bewaard.`
      : `Via de knop vind je alles bij elkaar. Wat je online kunt invullen, vul je daar direct in; de rest download je als pdf.`,
  ].map((a) => p(a));

  const romp = vak(`${brief.join("")}
<div style="height:8px;line-height:8px;font-size:0">&nbsp;</div>
${eyebrow("Jullie stappen", HUIS.tekst)}
${checklist(o.documenten)}
<div style="height:34px;line-height:34px;font-size:0">&nbsp;</div>
${scheiding}
<div style="height:28px;line-height:28px;font-size:0">&nbsp;</div>
${afzenderKaart(o.afzender, HUIS)}
<div style="height:30px;line-height:30px;font-size:0">&nbsp;</div>
${linkAlsTekst(o.link)}`);

  return omhulsel({
    basis: o.basis,
    titel: `Welkom bij React2u, ${o.bedrijf}`,
    preheader: o.herinnering ? `Je onboarding voor ${metPunt(o.bedrijf)} staat nog open.` : `Alles om goed te starten met React2u, op één plek.`,
    kaart: kop + romp,
    contact: o.contact,
  });
}
