import { DREMPELS } from "./opvolgen";
import type { Onboarding, OnboardingGebeurtenis } from "./onboarding";

/**
 * Automatische herinneringen voor een verstuurde onboarding (0038), elke
 * ochtend via api/cron/onboarding. Puur, zonder database: wanneer mag er een
 * mail, en waarom. De drempels zijn die van het dashboard (lib/opvolgen.ts),
 * zodat de mail en het signaal aan het team over hetzelfde gaan:
 *
 * - niet geopend: vijf dagen na het versturen nog niet bekeken;
 * - stil: wel geopend, maar tien dagen niets meer gedaan en nog niet klaar.
 *
 * Hooguit twee automatische herinneringen per onboarding, met minstens zeven
 * dagen ertussen en pas zeven dagen na een herinnering van een collega. Een
 * klant die bezig is, krijgt niets.
 */

export const HERINNERING = { maximaal: 2, tussenpoos: 7 };

export type HerinneringReden = "niet-geopend" | "stil";

type Rij = Pick<Onboarding, "status" | "email" | "verstuurd_at" | "bekeken_at" | "laatst_bekeken_at" | "antwoorden" | "gelezen">;
type Gebeurtenis = Pick<OnboardingGebeurtenis, "soort" | "at" | "details">;

const dagen = (iso: string, nu: Date) => (nu.getTime() - new Date(iso).getTime()) / 86_400_000;

/** Het laatste moment waarop de klant iets deed: bekeken, ingevuld of afgevinkt. */
export function laatsteActiviteit(o: Rij): string | null {
  const momenten = [
    o.laatst_bekeken_at, o.bekeken_at,
    ...Object.values(o.antwoorden || {}).map((a) => a?.at),
    ...Object.values(o.gelezen || {}),
  ].filter((x): x is string => Boolean(x));
  return momenten.sort().pop() ?? null;
}

export function herinneringNodig(o: Rij, gebeurtenissen: Gebeurtenis[], nu = new Date()): HerinneringReden | null {
  if (o.status !== "verstuurd" || !o.email || !o.verstuurd_at) return null;
  const herinneringen = gebeurtenissen.filter((g) => g.soort === "herinnering");
  const automatisch = herinneringen.filter((g) => g.details?.automatisch === true);
  if (automatisch.length >= HERINNERING.maximaal) return null;
  const laatste = herinneringen.map((g) => g.at).sort().pop();
  if (laatste && dagen(laatste, nu) < HERINNERING.tussenpoos) return null;

  if (!o.bekeken_at) return dagen(o.verstuurd_at, nu) >= DREMPELS.onboardingNietGeopend ? "niet-geopend" : null;
  const activiteit = laatsteActiviteit(o) ?? o.bekeken_at;
  return dagen(activiteit, nu) >= DREMPELS.onboardingStil ? "stil" : null;
}
