/**
 * Koppelingen (`site_settings.koppelingen`): links naar systemen buiten de site
 * en de termijn die de site aan sollicitanten belooft. Bewerkbaar op
 * /admin/instellingen; migratie 0013 zet de rij met standaardwaarden. Ontbreekt
 * de rij, dan gelden de standaardwaarden hieronder.
 *
 * - `kennismaking_url`: agenda waarin een werkgever zelf een kennismaking plant
 *   (Calendly of vergelijkbaar). Gevuld: na een offerteaanvraag staat op de
 *   bedankmelding én in de bevestigingsmail een knop "Plan direct een
 *   kennismaking". Leeg: geen knop.
 * - `sollicitatie_werkdagen`: binnen hoeveel werkdagen een sollicitant van ons
 *   hoort; staat op de bedankmelding en in de bevestigingsmail.
 */
export type Koppelingen = {
  kennismaking_url: string;
  sollicitatie_werkdagen: number;
};

export const KOPPELINGEN_STANDAARD: Koppelingen = {
  kennismaking_url: "",
  sollicitatie_werkdagen: 5,
};

/**
 * Alleen een volledig http(s)-adres telt; al het andere wordt leeg. Zo komt
 * er nooit een `javascript:`-link of een half adres als knop op de site.
 */
export function geldigeUrl(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
  } catch {
    return "";
  }
}

export function normalizeKoppelingen(value: unknown): Koppelingen {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const dagen = Math.round(Number(v.sollicitatie_werkdagen));
  return {
    kennismaking_url: geldigeUrl(v.kennismaking_url),
    sollicitatie_werkdagen:
      Number.isFinite(dagen) && dagen >= 1 && dagen <= 30 ? dagen : KOPPELINGEN_STANDAARD.sollicitatie_werkdagen,
  };
}

/** "5" wordt "vijf werkdagen": in een zin leest een klein getal als woord prettiger. */
export function werkdagenTekst(n: number): string {
  const woorden = ["", "één", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht", "negen", "tien"];
  return `${woorden[n] ?? n} werkdag${n === 1 ? "" : "en"}`;
}
