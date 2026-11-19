/**
 * Herkomst: hoe een werkgever ons vond. Eén vaste keuzelijst voor de hele
 * keten, zodat je het kunt optellen: de bezoeker kiest hem in het contact- en
 * kennismakenformulier, hij reist mee naar het Postvak IN, de offerte en de
 * kaart op het klantenbord, en /admin/bezoek telt per herkomst.
 *
 * Dit is wat de werkgever zélf zegt. Wat de browser zag (de verwijzende site
 * of een campagne) staat ernaast als `bron` (BronOnthouden), en de pagina
 * waarop het bezoek begon als `landingspagina`. Alle drie samen zeggen meer
 * dan elk apart: iemand die "via een relatie" zegt maar op een plaatspagina
 * binnenkwam, heeft die pagina wél gelezen.
 *
 * De sleutels staan in de database (check op `klanten.herkomst` en
 * `offertes.herkomst`, migratie 0047); de teksten voor de bezoeker in het
 * woordenboek (lib/woordenboek, `formulier.herkomst`), die voor het beheer
 * hieronder.
 */
export const HERKOMSTEN = ["google", "ai", "linkedin", "verwijzing", "partner", "belbureau", "anders"] as const;
export type Herkomst = (typeof HERKOMSTEN)[number];

export function isHerkomst(x: unknown): x is Herkomst {
  return typeof x === "string" && (HERKOMSTEN as readonly string[]).includes(x);
}

/** Kort, voor pillen en tabellen in het beheer. */
export const HERKOMST_LABEL: Record<Herkomst, string> = {
  google: "Google",
  ai: "ChatGPT of andere AI",
  linkedin: "LinkedIn",
  verwijzing: "Verwijzing",
  partner: "Partner",
  belbureau: "Belbureau",
  anders: "Anders",
};

/** Wat de keuze betekent, voor de keuzelijst in het beheer. */
export const HERKOMST_UITLEG: Record<Herkomst, string> = {
  google: "Gevonden via Google of een andere zoekmachine",
  ai: "Gevonden via ChatGPT, Copilot of een andere AI-assistent",
  linkedin: "Via LinkedIn of andere social media",
  verwijzing: "Doorverwezen door een klant, relatie of collega",
  partner: "Via een partner (accountant, verzekeraar, adviseur)",
  belbureau: "Wij belden zelf (belbureau of eigen bellijst)",
  anders: "Anders of onbekend",
};

/** Het label bij een herkomst uit de database, of de tekst zelf als het iets ouds is. */
export function herkomstLabel(h: string | null | undefined): string | null {
  if (!h) return null;
  return isHerkomst(h) ? HERKOMST_LABEL[h] : h;
}
