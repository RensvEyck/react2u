"use client";
import { useEffect } from "react";

/**
 * Onthoudt waar een bezoeker vandaan kwam, zodat een sollicitatie dat
 * meekrijgt (kolom `bron`, migratie 0018). Volgorde:
 *  1. ?ref=naam: een collega die de vacature deelde (aanbrengpremie);
 *  2. ?utm_source=...: een campagne of vacaturesite (Indeed, LinkedIn);
 *  3. de verwijzende site, als die niet react2u.nl zelf is.
 * Een ref of utm overschrijft een eerdere bron; een verwijzer alleen als er
 * nog niets bekend is. Alleen in sessionStorage: verdwijnt bij het sluiten
 * van de browser en verlaat de browser pas bij het solliciteren.
 */
export const BRON_SLEUTEL = "r2u_bron";

export function leesBron(): string {
  try {
    return sessionStorage.getItem(BRON_SLEUTEL) || "";
  } catch {
    return "";
  }
}

export default function BronOnthouden() {
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const ref = p.get("ref")?.trim();
      const utm = p.get("utm_source")?.trim();
      let bron = "";
      if (ref) bron = `aanbrenger: ${ref}`;
      else if (utm) bron = `campagne: ${utm}${p.get("utm_medium") ? ` / ${p.get("utm_medium")}` : ""}`;
      if (bron) {
        sessionStorage.setItem(BRON_SLEUTEL, bron.slice(0, 120));
        return;
      }
      if (sessionStorage.getItem(BRON_SLEUTEL)) return;
      if (!document.referrer) return;
      const host = new URL(document.referrer).hostname.replace(/^www\./, "");
      if (host && host !== window.location.hostname.replace(/^www\./, "")) {
        sessionStorage.setItem(BRON_SLEUTEL, `verwijzer: ${host}`.slice(0, 120));
      }
    } catch {
      // Geen opslag beschikbaar (privévenster): dan zonder bron.
    }
  }, []);
  return null;
}
