/**
 * Instelling `site_settings.tracking`: op welke grond draait de
 * bedrijfsherkenning (zie CONTEXT.md, *Bewaartermijnen en privacy*).
 *
 * - `toestemming` (standaard): alleen als de bezoeker in de cookiemelding
 *   "Statistiek" aanzet. Zonder keuze wordt het bezoek wel geteld, maar
 *   zonder bedrijf — en gaat het IP-adres niet naar ipinfo.
 * - `altijd`: op grond van gerechtvaardigd belang. Alleen kiezen als de
 *   privacyverklaring die afweging bevat. Een bezoeker die "Statistiek"
 *   uitzet, maakt bezwaar; dat respecteren we ook dan.
 */
export type Bedrijfsherkenning = "toestemming" | "altijd";
export type TrackingSettings = { bedrijfsherkenning: Bedrijfsherkenning };

export const TRACKING_DEFAULT: TrackingSettings = { bedrijfsherkenning: "toestemming" };

export function normalizeTracking(value: unknown): TrackingSettings {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return { bedrijfsherkenning: v.bedrijfsherkenning === "altijd" ? "altijd" : "toestemming" };
}

/**
 * Mag dit bezoek tot een bedrijf herleid worden? `consent` is de keuze in de
 * cookiemelding: true (aan), false (uit) of null (nog niets gekozen).
 */
export function mayIdentify(settings: TrackingSettings, consent: boolean | null | undefined): boolean {
  if (consent === false) return false;
  if (settings.bedrijfsherkenning === "altijd") return true;
  return consent === true;
}
