"use client";
import { useEffect } from "react";

/**
 * Onthoudt waar een bezoeker vandaan kwam en waar het bezoek begon, zodat een
 * aanvraag dat meekrijgt: een sollicitatie (kolom `bron`, migratie 0018) en
 * sinds migratie 0047 ook een contactbericht, kennismakingsaanvraag,
 * terugbelverzoek of partneraanmelding (`bron` en `landingspagina`), plus de
 * klik op een telefoonnummer of mailadres (KlikTracker).
 *
 * De bron, in deze volgorde:
 *  1. ?ref=naam: een collega die de vacature deelde (aanbrengpremie);
 *  2. ?utm_source=...: een campagne of vacaturesite (Indeed, LinkedIn, ChatGPT);
 *  3. de verwijzende site, als die niet react2u.nl zelf is.
 * Een ref of utm overschrijft een eerdere bron; een verwijzer alleen als er
 * nog niets bekend is.
 *
 * De landingspagina is de eerste pagina van dit bezoek, zonder querystring.
 * Zo zie je of een aanvraag begon op een plaatspagina, een vacature of de
 * homepage, ook als het formulier pas drie pagina's later werd ingevuld.
 *
 * Alleen in sessionStorage: verdwijnt bij het sluiten van de browser en
 * verlaat de browser pas bij het versturen van een formulier of een klik.
 */
export const BRON_SLEUTEL = "r2u_bron";
export const LANDING_SLEUTEL = "r2u_landing";

export function leesBron(): string {
  try {
    return sessionStorage.getItem(BRON_SLEUTEL) || "";
  } catch {
    return "";
  }
}

export function leesLanding(): string {
  try {
    return sessionStorage.getItem(LANDING_SLEUTEL) || "";
  } catch {
    return "";
  }
}

/**
 * Bron en landingspagina op een FormData zetten, vlak voor het versturen. De
 * formulieren roepen dit aan in hun eigen actiewrapper: dan is de opslag
 * zeker gevuld, wat bij een verborgen veld dat in een effect wordt gezet niet
 * vaststaat (effecten van kinderen draaien vóór die van de ouder).
 */
export function metHerkomst(fd: FormData): FormData {
  fd.set("bron", leesBron().slice(0, 120));
  fd.set("landing", leesLanding().slice(0, 200));
  return fd;
}

export default function BronOnthouden() {
  useEffect(() => {
    try {
      if (!sessionStorage.getItem(LANDING_SLEUTEL)) {
        sessionStorage.setItem(LANDING_SLEUTEL, window.location.pathname.slice(0, 200) || "/");
      }
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
