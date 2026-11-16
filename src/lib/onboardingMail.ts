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

/* ---------- 0038: de machtiging online, de klant op de hoogte, een stap doorsturen ---------- */

const ruimte = (h: number) => `<div style="height:${h}px;line-height:${h}px;font-size:0">&nbsp;</div>`;
const eerste = (naam: string | null | undefined) => (naam || "").trim().split(/\s+/)[0] || "";

/** Een kleine kaart in de kop: eyebrow, kop, tekst en een knop. */
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

function held2(basis: string, pilTekst: string, pilKleur: string, kaart: string, teken?: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="held" style="${heldAchtergrond(basis, HUIS)};border-radius:27px 27px 0 0;padding:38px 40px 36px">
  ${pil(pilTekst, pilKleur, teken)}
  ${ruimte(26)}
  <p class="label" style="margin:0;font-family:${FONT_KOP};font-size:52px;line-height:1;font-weight:700;letter-spacing:-0.025em;color:${KLEUR.indigo}">React2u</p>
  <p style="margin:18px 0 0;font-family:${FONT};font-size:18px;line-height:1.35;font-weight:700;color:${KLEUR.indigo}">Jouw mensen, <span style="color:${KLEUR.roze}">onze aandacht.</span></p>
  ${ruimte(28)}
  ${kaart}
</td></tr></table>`;
}

export type MachtigingMail = {
  basis: string;
  /** De werknemer. */
  naam: string;
  bedrijf: string;
  /** De vorige arbodienst, zoals de werkgever hem opgaf. */
  arbodienst: string | null;
  link: string;
  afzender: MailAfzender;
  opnieuw?: boolean;
  contact?: ContactInfo;
};

/** Aan de werknemer: je werkgever vraagt je de machtiging te tekenen. Kort en op de telefoon te lezen. */
export function machtigingMailHtml(m: MachtigingMail): string {
  const kaart = kopKaart(
    `Machtiging · ${esc(m.bedrijf)}`,
    `Hallo ${esc(eerste(m.naam) || m.naam)}`,
    m.opnieuw
      ? "Je machtiging staat nog voor je klaar. Tekenen duurt twee minuten, gewoon op je telefoon."
      : "Je werkgever vraagt je toestemming om je verzuimdossier over te dragen aan React2u. Tekenen duurt twee minuten, gewoon op je telefoon.",
    "Bekijk en teken de machtiging",
    m.link,
  );
  const brief = [
    `Beste ${esc(m.naam)},`,
    `${esc(metPunt(m.bedrijf))} werkt voortaan samen met arbodienst React2u. Omdat je een lopend verzuimdossier hebt${m.arbodienst ? ` bij ${esc(m.arbodienst)}` : " bij je vorige arbodienst"}, mag dat dossier alleen met jouw toestemming naar onze bedrijfsarts. Zo kan je begeleiding doorlopen zonder dubbele onderzoeken.`,
    "Via de knop lees je waar je precies toestemming voor geeft, vul je je gegevens in en zet je je handtekening. Je krijgt daarna een kopie per mail.",
    "Liever op papier? Vraag je werkgever dan om de machtiging uit te printen.",
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
    titel: `Machtiging overdracht verzuimdossier, ${m.bedrijf}`,
    preheader: `${metPunt(m.bedrijf)} vraagt je toestemming om je verzuimdossier over te dragen aan React2u. Tekenen duurt twee minuten.`,
    kaart: held2(m.basis, m.opnieuw ? "Je machtiging staat nog open" : "Even tekenen, op je telefoon", KLEUR.roze, kaart) + romp,
    contact: m.contact,
  });
}

/** Aan de werknemer na het tekenen: de bevestiging, met de getekende machtiging als pdf. */
export function machtigingGetekendHtml(m: { basis: string; naam: string; bedrijf: string; arbodienst: string | null; moment: string; link: string; afzender: MailAfzender; pdf: boolean; contact?: ContactInfo }): string {
  const kaart = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:#ffffff;border-radius:20px;padding:26px 28px 28px" class="binnen">
  ${eyebrow(`Machtiging · ${esc(m.bedrijf)}`, HUIS.tekst)}
  <p class="kop-groot" style="margin:0;font-family:${FONT_KOP};font-size:28px;line-height:1.18;font-weight:700;letter-spacing:-0.015em;color:${KLEUR.inkt}">Dank je wel, ${esc(eerste(m.naam) || m.naam)}.</p>
  <p style="margin:6px 0 0;font-family:${FONT};font-size:16px;line-height:1.5;color:${KLEUR.tekst}">Je hebt op ${esc(m.moment)} de machtiging voor de overdracht van je verzuimdossier getekend.</p>
</td></tr></table>`;
  const brief = [
    m.pdf ? "In de bijlage zit je getekende machtiging als pdf. Bewaar hem gerust." : "Via de link hieronder zie je je getekende machtiging terug.",
    `Je werkgever stuurt de machtiging, met de opdracht tot overdracht, naar ${m.arbodienst ? esc(m.arbodienst) : "je vorige arbodienst"}. Die draagt je dossier over aan de bedrijfsarts van React2u. Daarna nemen wij contact met je op om je begeleiding voort te zetten.`,
    "React2u gaat vertrouwelijk om met je medische gegevens: alleen de bedrijfsarts en de casemanager in taakdelegatie zien ze, je werkgever niet.",
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
    titel: `Je machtiging is getekend, ${m.bedrijf}`,
    preheader: `Je tekende op ${m.moment} de machtiging voor de overdracht van je verzuimdossier aan React2u.`,
    kaart: held2(m.basis, "Getekend", KLEUR.roze, kaart, "&#10003;") + romp,
    contact: m.contact,
  });
}

export type KlantMailSoort = "ontvangen" | "klaar" | "live";

export type OnboardingKlantMail = {
  basis: string;
  soort: KlantMailSoort;
  aanhef: string | null;
  bedrijf: string;
  nummer: string;
  link: string;
  afzender: MailAfzender;
  contact?: ContactInfo;
  /** ontvangen: welk document, wanneer, door wie, en of de kopie als pdf meegaat. */
  document?: string;
  moment?: string;
  door?: string | null;
  pdf?: boolean;
  /** klaar: wat React2u nu doet. */
  taken?: { kop: string; tekst: string }[];
  /** live: de vaste casemanager. */
  casemanager?: string | null;
};

/**
 * Aan de klant, op drie momenten (0038): we hebben je gegevens ontvangen (met
 * een kopie), jullie deel is klaar (dit doen wij nu), en jullie zijn live (de
 * casemanager, hoe je ziek meldt). Zo hoeft niemand te bellen "is het aangekomen?".
 */
export function onboardingKlantHtml(o: OnboardingKlantMail): string {
  const aanhef = esc(o.aanhef?.trim() || "relatie");
  const bedrijf = esc(o.bedrijf);
  let pilTekst: string;
  let kaart: string;
  let brief: string[];
  let titel: string;
  let preheader: string;
  if (o.soort === "ontvangen") {
    pilTekst = "Ontvangen";
    titel = `Ontvangen: ${o.document} van ${o.bedrijf}`;
    preheader = `We hebben ${o.document} ontvangen${o.moment ? ` op ${o.moment}` : ""}. ${o.pdf ? "De kopie zit in de bijlage." : ""}`.trim();
    kaart = kopKaart(`Onboarding ${esc(o.nummer)}`, `Dank je wel, ${aanhef}.`, `We hebben <strong>${esc(o.document || "je gegevens")}</strong> ontvangen${o.moment ? ` op ${esc(o.moment)}` : ""}${o.door ? `, ingevuld door ${esc(o.door)}` : ""}.`, "Naar je onboarding", o.link, KLEUR.indigo);
    brief = [
      o.pdf ? "In de bijlage zit een kopie van wat je invulde, als pdf voor je eigen administratie." : "Wat je invulde staat veilig bij ons; je kunt het op je onboardingpagina altijd teruglezen en aanpassen.",
      "Wil je nog iets wijzigen? Open je onboarding, pas het aan en sla opnieuw op. Wij werken met de laatste versie.",
    ];
  } else if (o.soort === "klaar") {
    pilTekst = "Jullie deel is klaar";
    titel = `Jullie deel is klaar, ${o.bedrijf}`;
    preheader = "Alles is binnen. Nu richten wij alles in; je hoort van ons zodra jullie live zijn.";
    kaart = kopKaart(`Onboarding ${esc(o.nummer)}`, `Alles is binnen, ${aanhef}.`, `Dank je wel. Jullie hebben alle stappen van de onboarding voor ${bedrijf} afgerond. Nu zijn wij aan zet.`, "Volg de voortgang", o.link, KLEUR.indigo);
    brief = ["Dit doen we de komende dagen; op je onboardingpagina zie je per onderdeel wanneer het geregeld is:"];
  } else {
    pilTekst = "Jullie zijn live";
    titel = `Jullie zijn live bij React2u, ${o.bedrijf}`;
    preheader = `Alles staat klaar voor ${metPunt(o.bedrijf)}. ${o.casemanager ? `Je vaste casemanager is ${o.casemanager}.` : ""}`.trim();
    kaart = kopKaart(`Onboarding ${esc(o.nummer)}`, `Welkom aan boord, ${aanhef}.`, `Alles staat klaar voor ${bedrijf}: jullie omgeving, de medewerkers en de facturatie. Vanaf nu bewaken wij elke ziekmelding.`, "Naar je onboarding", o.link, KLEUR.roze);
    brief = [
      o.casemanager ? `Je vaste casemanager is <strong>${esc(o.casemanager)}</strong>: één aanspreekpunt dat jullie organisatie kent. Bel of mail bij elke vraag; niet bereikbaar, dan helpt het team je verder.` : "Je krijgt een vaste casemanager: één aanspreekpunt dat jullie organisatie kent.",
      "Een ziekmelding doe je in de beveiligde omgeving van XpertSuite, of telefonisch. Binnen één tot drie werkdagen nemen we contact op met jou en met de medewerker.",
      "Wil je wegwijs worden in het systeem? Plan een afspraak op kantoor of online, dan lopen we het samen door.",
    ];
  }
  const takenHtml = o.soort === "klaar" && o.taken?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${o.taken
        .map(
          (t, i) => `<tr>
<td width="34" valign="top" style="padding:${i ? 12 : 0}px 0 0"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" width="24" height="24" style="width:24px;height:24px;border-radius:999px;background:${KLEUR.indigo};font-family:${FONT};font-size:13px;font-weight:700;color:#ffffff">${i + 1}</td></tr></table></td>
<td valign="top" style="padding:${i ? 12 : 0}px 0 0"><p style="margin:0;font-family:${FONT_KOP};font-size:16px;line-height:1.4;font-weight:700;color:${KLEUR.inkt}">${esc(t.kop)}</p><p style="margin:2px 0 0;font-family:${FONT};font-size:14.5px;line-height:1.55;color:${KLEUR.tekst}">${esc(t.tekst)}</p></td>
</tr>`,
        )
        .join("")}</table>${ruimte(10)}`
    : "";
  const romp = vak(`${brief.map((a) => p(a)).join("")}
${takenHtml}
${ruimte(24)}
${scheiding}
${ruimte(28)}
${afzenderKaart(o.afzender, HUIS)}
${ruimte(30)}
${linkAlsTekst(o.link)}`);
  return omhulsel({ basis: o.basis, titel, preheader, kaart: held2(o.basis, pilTekst, KLEUR.roze, kaart, o.soort === "ontvangen" ? "&#10003;" : undefined) + romp, contact: o.contact });
}

/** Aan een collega van de klant: iemand stuurt je een stap van de onboarding door. */
export function doorgestuurdHtml(d: { basis: string; naam: string; van: string; bedrijf: string; stap: string; actie: string; link: string; bericht: string | null; afzender: MailAfzender; contact?: ContactInfo }): string {
  const kaart = kopKaart(`Onboarding · ${esc(d.bedrijf)}`, `Hallo ${esc(eerste(d.naam) || d.naam)}`, `${esc(d.van)} vraagt je om <strong>${esc(d.stap)}</strong> op te pakken: ${esc(d.actie.toLowerCase())}.`, `Open ${esc(d.stap)}`, d.link, KLEUR.indigo);
  const brief = [
    `Beste ${esc(d.naam)},`,
    ...alineasUit(d.bericht),
    `${esc(metPunt(d.bedrijf))} gaat van start bij arbodienst React2u. De onboarding staat op één pagina; ${esc(d.van)} stuurde je de stap "${esc(d.stap)}" door omdat jij daar de aangewezen persoon voor bent. Via de knop kom je er direct; wat je invult, wordt bewaard.`,
  ].map((a) => p(a));
  const romp = vak(`${brief.join("")}
${ruimte(34)}
${scheiding}
${ruimte(28)}
${afzenderKaart(d.afzender, HUIS)}
${ruimte(30)}
${linkAlsTekst(d.link)}`);
  return omhulsel({
    basis: d.basis,
    titel: `${d.van} stuurt je ${d.stap} door (onboarding ${d.bedrijf})`,
    preheader: `${d.van} vraagt je om ${d.stap} op te pakken voor de onboarding van ${metPunt(d.bedrijf)} bij React2u.`,
    kaart: held2(d.basis, "Een stap voor jou", KLEUR.indigo, kaart) + romp,
    contact: d.contact,
  });
}

/** Aan de vorige arbodienst, namens de werkgever: de opdracht tot overdracht, met de getekende machtigingen als pdf. Zakelijk en kort. */
export function overdrachtMailHtml(b: { basis: string; bedrijf: string; contactpersoon: string | null; aantal: number; namen: { naam: string; geboortedatum: string }[]; arbodienst: string | null; alineas: string[]; contact?: ContactInfo }): string {
  const lijst = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${b.namen
    .map(
      (n, i) => `<tr><td style="padding:8px 12px 8px 0;font-family:${FONT};font-size:15px;line-height:1.45;font-weight:600;color:${KLEUR.inkt};${i < b.namen.length - 1 ? `border-bottom:1px solid ${KLEUR.lijn};` : ""}">${esc(n.naam)}</td><td align="right" style="padding:8px 0;font-family:${FONT};font-size:14px;line-height:1.45;color:${KLEUR.grijs};${i < b.namen.length - 1 ? `border-bottom:1px solid ${KLEUR.lijn};` : ""}">geboren ${esc(n.geboortedatum)}</td></tr>`,
    )
    .join("")}</table>`;
  const kaart = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:#ffffff;border-radius:20px;padding:26px 28px 28px" class="binnen">
  ${eyebrow("Opdracht tot overdracht", HUIS.tekst)}
  <p class="kop-groot" style="margin:0;font-family:${FONT_KOP};font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-0.015em;color:${KLEUR.inkt}">Verzuimdossiers ${esc(b.bedrijf)} naar React2u</p>
  <p style="margin:6px 0 0;font-family:${FONT};font-size:16px;line-height:1.5;color:${KLEUR.tekst}">${b.aantal} getekende ${b.aantal === 1 ? "machtiging" : "machtigingen"} in de bijlage.</p>
</td></tr></table>`;
  const brief = [`Geachte heer, mevrouw${b.arbodienst ? ` van ${esc(b.arbodienst)}` : ""},`, ...b.alineas.map(esc)].map((a) => p(a));
  const romp = vak(`${brief.join("")}
${ruimte(8)}
${eyebrow("Werknemers", HUIS.tekst)}
${lijst}
${ruimte(28)}
${p(`Met vriendelijke groet,<br><strong>${esc(b.contactpersoon || b.bedrijf)}</strong>${b.contactpersoon ? `<br>${esc(b.bedrijf)}` : ""}`)}
${ruimte(10)}
${scheiding}
${ruimte(18)}
${p(`Deze opdracht is verstuurd via de onboardingomgeving van React2u, in opdracht van ${esc(metPunt(b.bedrijf))} React2u ontvangt een kopie.`, `font-size:13px;color:${KLEUR.grijs}`)}`);
  return omhulsel({
    basis: b.basis,
    titel: `Opdracht overdracht verzuimdossiers ${b.bedrijf}`,
    preheader: `${metPunt(b.bedrijf)} verzoekt u ${b.aantal === 1 ? "het lopende verzuimdossier" : `${b.aantal} lopende verzuimdossiers`} over te dragen aan React2u. De getekende machtigingen zitten in de bijlage.`,
    kaart: held2(b.basis, "Namens de werkgever", KLEUR.indigo, kaart) + romp,
    contact: b.contact,
  });
}
