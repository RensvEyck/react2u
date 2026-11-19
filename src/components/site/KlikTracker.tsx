"use client";
import { useEffect } from "react";
import { consentFor, STATISTIEK } from "./CookieBanner";
import { leesBron, leesLanding } from "./BronOnthouden";

/**
 * Telt een klik op een telefoonnummer (`tel:`) of een mailadres (`mailto:`)
 * als conversie, met de pagina waar de link stond (migratie 0047; de route
 * /api/track schrijft hem in `conversions` als `bel` of `mail`).
 *
 * Waarom: bij een arbodienst komen de meeste aanvragen per telefoon of mail,
 * niet via een formulier. Zonder deze telling zag /admin/bezoek alleen de
 * formulieren en leek een pagina die tot een telefoontje leidt niets op te
 * leveren.
 *
 * Eén klik per soort per pagina per bezoek: wie het nummer twee keer aanraakt
 * (op de telefoon gebeurt dat) telt één keer. Onthouden in sessionStorage,
 * net als de bron. Een luisteraar op het document, in de vangfase, zodat ook
 * links in later geladen delen (belbalk, menu) meetellen.
 */
const SLEUTEL = "r2u_klik";

function soortVan(a: HTMLAnchorElement): "bel" | "mail" | null {
  const href = (a.getAttribute("href") || "").trim().toLowerCase();
  if (href.startsWith("tel:")) return "bel";
  if (href.startsWith("mailto:")) return "mail";
  return null;
}

export default function KlikTracker() {
  useEffect(() => {
    const op = (e: MouseEvent) => {
      const doel = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(doel instanceof HTMLAnchorElement)) return;
      const soort = soortVan(doel);
      if (!soort) return;
      const path = window.location.pathname || "/";
      const sleutel = `${SLEUTEL}_${soort}_${path}`;
      try {
        if (sessionStorage.getItem(sleutel)) return;
        sessionStorage.setItem(sleutel, "1");
      } catch {
        // Zonder opslag tellen we elke klik; beter te veel dan niets.
      }
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          klik: soort, path, bron: leesBron(), landing: leesLanding(),
          referrer: document.referrer || null, consent: consentFor(STATISTIEK),
        }),
        keepalive: true,
      }).catch(() => {
        // Stil: statistiek mag nooit een foutmelding bij een bezoeker opleveren.
      });
    };
    document.addEventListener("click", op, true);
    return () => document.removeEventListener("click", op, true);
  }, []);
  return null;
}
