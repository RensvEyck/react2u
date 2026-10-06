/**
 * Roze en grijs voor tekst en knoppen, met contrast volgens WCAG 2.2 AA
 * (minstens 4,5:1 voor gewone tekst).
 *
 * Het roze uit het logo (#e61674) haalde met witte tekst maar 4,4:1 op wit en
 * 4,1:1 op de lichte vlakken; het grijs van bijschriften (#77758f) 4,1 tot
 * 4,4:1. Deze tinten halen het wél, ook op het lichtste vlak van de site:
 *
 *   ROZE      5,1:1 op wit, 4,6:1 op #f3f1fa, 4,7:1 op #f6f5fb
 *   BIJTEKST  5,3:1 op wit, 4,7:1 op #f3f1fa, 4,9:1 op #f6f5fb
 *
 * Dezelfde waarden staan als --color-accent, --color-accent-deep en
 * --color-bijtekst in app/globals.css; kleuren.test.ts bewaakt dat ze gelijk
 * blijven. Decoratief roze zonder tekst erop (de stippen in het logo, vlakken)
 * houdt de originele logokleur, zie lib/brand.ts.
 */
export const ROZE = "#d4136c";
/** Eén tint donkerder, voor hover op roze knoppen (6,4:1 met wit). */
export const ROZE_DONKER = "#b8105e";
export const BIJTEKST = "#6b6984";
/** Bijtekst op een lavendel vlak (#ecebf5, waar BIJTEKST net 4,5:1 mist): 6,1:1. */
export const BIJTEKST_DONKER = "#55518a";
/** Licht roze vlak achter roze tekst (badges, meldingen): ROZE haalt er 4,6:1 op; het oude #fdecf4 4,5:1 net niet. */
export const ROZE_TINT = "#fef0f7";

/**
 * De labelkleuren uit het logo (teal, oranje, blauw) zijn als tekst te licht:
 * teal haalt 3,2:1 op wit, oranje 2,4:1. Deze tinten halen het wel. `tekst`
 * (minstens 4,5:1 op wit en op de eigen lichte tint) is voor gewone tekst,
 * `kop` (minstens 3:1) voor koppen vanaf 24px, waar WCAG minder vraagt en de
 * kleur dichter bij het logo kan blijven. Roze is al goed (ROZE); indigo ook.
 */
const LABEL_TEKST: Record<string, { tekst: string; kop: string }> = {
  "#00a098": { tekst: "#007a6d", kop: "#00928a" }, // teal:   5,2:1 / 3,4:1 op #e5f5f4
  "#f19001": { tekst: "#955900", kop: "#c46f00" }, // oranje: 5,7:1 / 3,4:1 op #fef3e3
  "#f19000": { tekst: "#955900", kop: "#c46f00" },
  "#3aa5dd": { tekst: "#186c98", kop: "#1f8dc6" }, // blauw:  5,8:1 / 3,3:1 op #e9f5fc
  "#39a5dd": { tekst: "#186c98", kop: "#1f8dc6" },
};

/** Een labelkleur als tekstkleur; onbekende kleuren gaan ongewijzigd door. */
export function tekstKleur(kleur: string | undefined | null, standaard = ROZE): string {
  const k = (kleur || standaard).toLowerCase();
  return LABEL_TEKST[k]?.tekst ?? k;
}

/** Een labelkleur als kleur van een grote kop (vanaf 24px). */
export function kopKleur(kleur: string | undefined | null, standaard = ROZE): string {
  const k = (kleur || standaard).toLowerCase();
  return LABEL_TEKST[k]?.kop ?? k;
}
