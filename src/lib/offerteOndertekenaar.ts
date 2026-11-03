/*
 * Wie namens React2u tekent. Op elke offerte, in het vak Opdrachtnemer op de
 * klantpagina en in de pdf, staat de handtekening van de bestuurder (Rens,
 * 3 nov 2026: "zet mijn handtekening bij alle offertes"). De afzender van de
 * offerte (de collega die hem opstelt en verstuurt) blijft de contactpersoon
 * op de pagina; de ondertekening namens het bedrijf is niet van de afzender.
 *
 * De handtekening is een transparante png in public/beeld (de scan van de
 * echte handtekening, wit weggehaald). De pagina laadt hem als /beeld/…, de
 * pdf leest hetzelfde bestand uit public/ (zie lib/offertePdf.tsx).
 */
export const ONDERTEKENAAR = {
  naam: "Rens van Eyck",
  functie: "Bestuurder",
  handtekening: "/beeld/handtekening-rens.png",
  /** Zoals in de kop van het basiscontract (lib/contracten.ts): "vertegenwoordigd door de heer R. van Eyck". */
  formeel: "de heer R. van Eyck",
} as const;

/** "Rens van Eyck, Bestuurder, 3 november 2026": de regel onder de handtekening. */
export function ondertekeningRegel(datum: string | null | undefined, opmaak: (iso: string) => string): string {
  return [ONDERTEKENAAR.naam, ONDERTEKENAAR.functie, datum ? opmaak(datum) : null].filter(Boolean).join(", ");
}
