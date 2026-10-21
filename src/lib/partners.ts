/**
 * Partnerprogramma (/partners): het rekenvoorbeeld in de paginakop en de
 * keuzes van het aanmeldformulier. De bedragen en percentages staan in de
 * blokdata, zodat ze in het beheer mee kunnen met de tarieven van het jaar.
 */

export type Rekenvoorbeeld = {
  klanten: number;
  medewerkers: number;
  /** Abonnement per medewerker per jaar, in euro's (Casemanagement Compleet). */
  tarief: number;
  /** Vergoeding in jaar één, in procenten van het abonnement. */
  pctJaarEen: number;
  /** Vergoeding in elk jaar daarna, in procenten. */
  pctVervolg: number;
};

/** De vergoeding voor de partner: jaar één en elk jaar daarna, in euro's. */
export function partnerVergoeding(r: Rekenvoorbeeld): { jaarEen: number; vervolg: number } {
  const n = (x: number) => (Number.isFinite(x) && x > 0 ? x : 0);
  const omzet = n(r.klanten) * n(r.medewerkers) * n(r.tarief);
  return { jaarEen: (omzet * n(r.pctJaarEen)) / 100, vervolg: (omzet * n(r.pctVervolg)) / 100 };
}

const HEEL = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });
const CENTEN = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "€ 2.025": afgerond op hele euro's, zoals een rekenvoorbeeld hoort. */
export function euroRond(bedrag: number): string {
  return `€ ${HEEL.format(Math.round(bedrag))}`;
}

/** "€ 135" of "€ 139,50": een tarief, met centen alleen als die er zijn. */
export function euroTarief(bedrag: number): string {
  return `€ ${Number.isInteger(bedrag) ? HEEL.format(bedrag) : CENTEN.format(bedrag)}`;
}

/** Soorten kantoor in het aanmeldformulier; de server neemt alleen deze aan. */
export const PARTNER_SOORTEN = [
  "Accountants- of administratiekantoor",
  "Salarisadministratie",
  "HR-advies of HR-dienstverlening",
  "Verzekeringsadvies",
  "Anders",
] as const;

/** Omvang van het klantenbestand in het aanmeldformulier. */
export const PARTNER_OMVANG = ["Tot 25", "25 tot 100", "100 tot 250", "Meer dan 250"] as const;
