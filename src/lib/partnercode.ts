import { useSyncExternalStore } from "react";
import { normaliseerPartnercode } from "./partners";

/**
 * De partnercode uit de aanmeldlink van een partner (/kennismaken?partner=CODE).
 *
 * De offerteformulieren sturen hem mee (veld `partner`), zodat de aanvraag in
 * het Postvak IN bij die partner hoort (migratie 0022). Onthouden in
 * `sessionStorage`, alleen voor dit bezoek: wie via de link binnenkomt en eerst
 * nog naar de tarieven kijkt, neemt de code mee naar dat formulier. Geen
 * cookie, niets persoonlijks; weg als het tabblad dicht gaat.
 */

const SLEUTEL = "r2u-partner";

function lees(): string | null {
  const uitLink = normaliseerPartnercode(new URLSearchParams(window.location.search).get("partner"));
  try {
    // Onthouden is idempotent: dezelfde waarde nog eens schrijven verandert niets.
    if (uitLink) window.sessionStorage.setItem(SLEUTEL, uitLink);
    return uitLink ?? normaliseerPartnercode(window.sessionStorage.getItem(SLEUTEL));
  } catch {
    // Privévenster of geblokkeerde opslag: dan telt alleen de link zelf.
    return uitLink;
  }
}

// De code verandert niet terwijl een formulier open staat; na een navigatie
// wordt het formulier opnieuw opgebouwd en leest het opnieuw.
const abonneer = () => () => {};

/** De partnercode voor dit bezoek; leeg op de server en zonder code. */
export function usePartnercode(): string {
  return useSyncExternalStore(abonneer, lees, () => null) ?? "";
}
