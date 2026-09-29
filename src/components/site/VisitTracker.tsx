"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Meldt een paginabezoek aan /api/track.
 *
 * Draait bij elke paginawissel, ook bij client-side navigatie — anders telt
 * alleen het eerste bezoek van een sessie. `keepalive` zorgt dat het verzoek
 * doorgaat als de bezoeker meteen wegklikt.
 *
 * Staat er een 404-pagina (`data-niet-gevonden`), dan gaat er `missing` mee:
 * zo'n weergave is geen bezoek aan een pagina, en zou anders als "populaire
 * pagina" in de statistieken belanden. De route legt hem vast als 404.
 */
export default function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const controller = new AbortController();
    const missing = Boolean(document.querySelector("[data-niet-gevonden]"));
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer: document.referrer || null, missing }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {
      // Stilte is hier het juiste gedrag: statistiek mag nooit een foutmelding
      // in de console van een bezoeker opleveren.
    });
    return () => controller.abort();
  }, [pathname]);

  return null;
}
