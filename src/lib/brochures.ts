/**
 * Brochures (migratie 0030): een persoonlijke brochure met alle zes diensten,
 * die sales een prospect stuurt vóór er een offerte is. Dezelfde opzet als
 * een offerte (link met token, mail in huisstijl, tijdlijn), maar zonder
 * prijzen, keuzes of ondertekening: de inhoud is voor elke brochure gelijk en
 * komt van de labelpagina's in het CMS (lib/brochureHuisstijl.ts).
 *
 * Puur, zonder database: dezelfde helpers in het beheer, op de klantpagina en
 * in de mails.
 */
import { OFFERTE_EMAIL } from "./offertes";

export type BrochureStatus = "concept" | "verstuurd" | "ingetrokken";

/** Een rij uit `brochures`, zoals het beheer hem leest. */
export type Brochure = {
  id: string;
  nummer: string;
  token: string;
  status: BrochureStatus;
  bedrijf: string;
  contactpersoon: string | null;
  email: string | null;
  telefoon: string | null;
  /** Het persoonlijke woord van de afzender; mag {bedrijf}, {contactpersoon} en {voornaam} bevatten (vulIn). */
  bericht: string | null;
  afzender_naam: string | null;
  afzender_functie: string | null;
  afzender_email: string | null;
  afzender_telefoon: string | null;
  notitie: string | null;
  offerte_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  verstuurd_at: string | null;
  bekeken_at: string | null;
  laatst_bekeken_at: string | null;
  aantal_bekeken: number;
};

/** Wat `brochure_bekijken` (0030) teruggeeft: zonder notitie, e-mail en telefoon van de prospect. */
export type BrochurePubliek = Pick<
  Brochure,
  "id" | "nummer" | "status" | "bedrijf" | "contactpersoon" | "bericht" | "afzender_naam" | "afzender_functie" | "afzender_email" | "afzender_telefoon" | "verstuurd_at" | "created_at"
> & { eerste_keer?: boolean };

export type BrochureGebeurtenis = {
  id: number;
  brochure_id: string;
  soort: "aangemaakt" | "gewijzigd" | "verstuurd" | "herinnering" | "bekeken" | "ingetrokken" | "heropend";
  door: string | null;
  details: Record<string, string | number | boolean> | null;
  at: string;
};

/** De afzender die de prospect ziet en waar hij op antwoordt: de salesbox, net als bij offertes. */
export const BROCHURE_EMAIL = OFFERTE_EMAIL;

/** De zes diensten in de volgorde van de brochure, als slug van hun labelpagina. */
export const BROCHURE_DIENSTEN = ["recover", "resist", "restart", "reflex", "ready", "reward"] as const;
export type DienstSlug = (typeof BROCHURE_DIENSTEN)[number];

export type BrochureWeergave = BrochureStatus | "bekeken";

export function brochureWeergave(b: Pick<Brochure, "status" | "bekeken_at">): BrochureWeergave {
  return b.status === "verstuurd" && b.bekeken_at ? "bekeken" : b.status;
}

export const BROCHURE_WEERGAVE: Record<BrochureWeergave, { label: string; kleur: string; achter: string }> = {
  concept: { label: "Concept", kleur: "#6b6a85", achter: "rgba(13,13,40,0.05)" },
  verstuurd: { label: "Verstuurd", kleur: "#312e82", achter: "#eef0ff" },
  bekeken: { label: "Bekeken", kleur: "#0b6bcb", achter: "#e6f2ff" },
  ingetrokken: { label: "Ingetrokken", kleur: "#6b6a85", achter: "rgba(13,13,40,0.05)" },
};

/**
 * Het persoonlijke woord waarmee een nieuwe brochure begint. Met invulvelden,
 * zodat het ook klopt als sales de bedrijfsnaam later nog aanpast.
 */
export const BERICHT_STANDAARD =
  "Fijn dat we elkaar hebben gesproken. In deze brochure lees je wat React2u voor {bedrijf} kan betekenen: van verzuimbegeleiding en preventie tot re-integratie, HR en verloning. Elk specialisme neem je los af, dus je kiest alleen wat bij jullie past.\n\nHeb je vragen, of wil je weten wat het voor jullie kost? Bel of mail me gerust, dan maak ik een voorstel op maat.";

/** De velden die het beheer invult, voor het formulier en de controle. */
export type BrochureInvoer = Pick<Brochure, "bedrijf" | "contactpersoon" | "email" | "telefoon" | "bericht" | "afzender_naam" | "afzender_functie" | "afzender_email" | "afzender_telefoon">;

/** Wat er nog ontbreekt om te versturen; leeg = klaar. */
export function controleerBrochure(b: Pick<Brochure, "bedrijf" | "email">): string[] {
  const fouten: string[] = [];
  if (!b.bedrijf?.trim()) fouten.push("De naam van het bedrijf ontbreekt.");
  if (b.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email)) fouten.push("Het e-mailadres klopt niet.");
  return fouten;
}
