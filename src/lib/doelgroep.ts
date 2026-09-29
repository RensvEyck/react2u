import { useSyncExternalStore } from "react";
import type { Doelgroep } from "./nav";

/**
 * De laatste keuze van de bezoeker: werkgever of werknemer.
 *
 * Nodig op gedeelde pagina's (contact, blog, over ons): een werknemer die
 * vanaf zijn startpagina naar Contact klikt, hoort daar het werknemersmenu te
 * houden. Het pad zelf zegt het niet, dus onthouden we de keuze in de browser.
 *
 * Alleen `localStorage`, geen cookie: de pagina's zijn statisch, de server kan
 * er toch niets mee. Gevolg: op een gedeelde pagina rendert de server het
 * werkgeversmenu en wisselt de browser direct daarna, als de bezoeker eerder
 * "werknemer" koos. Er wordt niets persoonlijks bewaard, alleen dit woord.
 */

const SLEUTEL = "r2u-doelgroep";
// `storage` vuurt alleen in andere tabbladen; dit eigen event houdt het
// huidige tabblad bij.
const EVENT = "r2u-doelgroep";

function lees(): Doelgroep | null {
  try {
    const v = window.localStorage.getItem(SLEUTEL);
    return v === "werkgever" || v === "werknemer" ? v : null;
  } catch {
    return null;
  }
}

export function bewaarDoelgroep(d: Doelgroep) {
  try {
    if (window.localStorage.getItem(SLEUTEL) === d) return;
    window.localStorage.setItem(SLEUTEL, d);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Privévenster of geblokkeerde opslag: dan onthouden we het gewoon niet.
  }
}

function abonneer(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

/** De bewaarde keuze; `null` op de server en zolang er niets gekozen is. */
export function useBewaardeDoelgroep(): Doelgroep | null {
  return useSyncExternalStore(abonneer, lees, () => null);
}
