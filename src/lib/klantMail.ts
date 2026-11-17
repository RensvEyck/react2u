/**
 * Mailen vanuit een kaart op het klantenbord: de sjablonen en het invullen
 * ervan. De mail zelf gaat via sendBrief (lib/mail.ts) in de huisstijl, met
 * de collega als afzender om op te antwoorden, en komt als regel `mail` in de
 * tijdlijn. Puur, zodat het te testen is.
 */

export type MailSjabloonKey = "kennismaking" | "offerte_nabellen" | "welkom" | "even_checken" | "leeg";

export type MailSjabloon = {
  key: MailSjabloonKey;
  label: string;
  onderwerp: string;
  /** Alinea's gescheiden door een lege regel; {voornaam}, {bedrijf} en {afzender} worden ingevuld. */
  tekst: string;
  /** De volgende stap die erbij hoort, in dagen vanaf vandaag. */
  volgende: { tekst: string; overDagen: number } | null;
};

export const MAIL_SJABLONEN: MailSjabloon[] = [
  {
    key: "kennismaking",
    label: "Kennismaking bevestigen",
    onderwerp: "Fijn dat we elkaar spraken",
    tekst:
      "Beste {voornaam},\n\nBedankt voor je tijd. Fijn om te horen hoe het bij {bedrijf} gaat en waar jullie tegenaan lopen bij verzuim.\n\nZoals besproken stuur ik je binnenkort een voorstel. Heb je intussen vragen, bel of mail me gerust.",
    volgende: { tekst: "Offerte maken", overDagen: 3 },
  },
  {
    key: "offerte_nabellen",
    label: "Offerte nabellen",
    onderwerp: "Je offerte van React2u",
    tekst:
      "Beste {voornaam},\n\nEen tijdje geleden stuurde ik je onze offerte voor {bedrijf}. Ik ben benieuwd wat je ervan vindt en of er nog vragen zijn.\n\nZal ik je deze week even bellen? Laat weten wanneer het uitkomt.",
    volgende: { tekst: "Offerte nabellen", overDagen: 3 },
  },
  {
    key: "welkom",
    label: "Welkom",
    onderwerp: "Welkom bij React2u",
    tekst:
      "Beste {voornaam},\n\nWelkom bij React2u! Fijn dat {bedrijf} met ons gaat werken. De komende weken richten we alles voor jullie in; je hoort van ons zodra jullie live zijn.\n\nHeb je in de tussentijd vragen, dan ben ik je aanspreekpunt.",
    volgende: null,
  },
  {
    key: "even_checken",
    label: "Even checken",
    onderwerp: "Hoe gaat het bij {bedrijf}?",
    tekst:
      "Beste {voornaam},\n\nWe spraken elkaar een tijdje geleden over verzuim bij {bedrijf}. Ik wilde even checken hoe het nu gaat en of ik ergens mee kan helpen.\n\nBel of mail me gerust.",
    volgende: { tekst: "Reactie afwachten, anders bellen", overDagen: 7 },
  },
  { key: "leeg", label: "Zelf schrijven", onderwerp: "", tekst: "Beste {voornaam},\n\n", volgende: null },
];

export function sjabloon(key: string): MailSjabloon {
  return MAIL_SJABLONEN.find((s) => s.key === key) || MAIL_SJABLONEN[MAIL_SJABLONEN.length - 1];
}

export type MailVelden = { voornaam: string | null; bedrijf: string; afzender: string | null };

/** "Fatima El Amrani" → "Fatima"; "Mevr. J. de Vries" → null (een voorletter is geen voornaam). */
export function voornaamUit(contactpersoon: string | null | undefined): string | null {
  const delen = (contactpersoon || "").trim().split(/\s+/).filter((d) => !/^(dhr|mevr|mr|mrs|ms|de heer|mevrouw)\.?$/i.test(d));
  const eerste = delen[0] || "";
  return /^[A-Za-zÀ-ÿ][a-zà-ÿ'-]+$/.test(eerste) && eerste.length >= 2 ? eerste : null;
}

/** Vult {voornaam}, {bedrijf} en {afzender} in; zonder voornaam wordt "Beste {voornaam}," gewoon "Beste,". */
export function vulIn(tekst: string, v: MailVelden): string {
  return tekst
    .replace(/Beste \{voornaam\},/g, v.voornaam ? `Beste ${v.voornaam},` : "Beste,")
    .replace(/\{voornaam\}/g, v.voornaam || "")
    .replace(/\{bedrijf\}/g, v.bedrijf)
    .replace(/\{afzender\}/g, v.afzender || "")
    .replace(/[ \t]+\n/g, "\n");
}

/** De tekst als alinea's, zoals sendBrief ze wil. */
export function alineas(tekst: string): string[] {
  return tekst.replace(/\r\n?/g, "\n").split(/\n\s*\n/).map((a) => a.trim()).filter(Boolean);
}

/** De naam van de collega uit zijn e-mailadres als hij er zelf geen opgeeft: "rens@react2u.nl" → "Rens". */
export function naamUitEmail(email: string | null | undefined): string {
  const lokaal = (email || "").split("@")[0].split(/[._-]/)[0];
  return lokaal ? lokaal[0].toUpperCase() + lokaal.slice(1) : "";
}

/** Wat er in de tijdlijn komt: het onderwerp en de eerste echte zin. */
export function mailSamenvatting(onderwerp: string, tekst: string): string {
  const eerste = alineas(tekst).find((a) => !/^Beste\b/.test(a)) || "";
  const zin = eerste.split(/(?<=[.!?])\s/)[0] || "";
  return `Gemaild: ${onderwerp}${zin ? ` · ${zin}` : ""}`.slice(0, 500);
}
