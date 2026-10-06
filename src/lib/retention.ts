import type { Application } from "./types";

/**
 * Bewaartermijn van sollicitaties.
 *
 * De dagelijkse opruimtaak slaat sollicitaties over, omdat het cv via de
 * Storage-API weg moet (zie CONTEXT.md, *Bewaartermijnen en privacy*). Tot nu
 * toe hing verwijderen dus af van iemand die eraan dacht. Deze module bepaalt
 * welke sollicitaties over hun termijn zijn, zodat het Postvak IN ze kan
 * aanwijzen en in één keer kan laten verwijderen.
 *
 * De termijnen volgen de richtlijn van de Autoriteit Persoonsgegevens: na
 * afloop van de procedure uiterlijk vier weken bewaren, langer alleen met
 * toestemming van de sollicitant — en daar vraagt het formulier niet om.
 *
 * Er is geen datum van afronding; de status is het enige wat we weten. Daarom
 * rekenen we vanaf binnenkomst, met ruimte voor de procedure zelf:
 *
 *   afgewezen / aangenomen  → afgerond; verlopen 4 weken na binnenkomst + 4 weken procedure
 *   nieuw / in behandeling  → nog open; na 3 maanden is dat geen procedure meer maar een vergeten dossier
 *   met toestemming         → een jaar, ongeacht de status (`retain_longer`, migratie 0013)
 *
 * Sinds oktober 2026 draait het opruimen automatisch: api/cron/opruimen
 * verwijdert dagelijks wat hier als verlopen geldt, cv's inbegrepen. Het
 * Postvak IN blijft het aanwijzen, voor wie eerder wil ingrijpen.
 *
 * Pas deze getallen aan als de organisatie een ander beleid vastlegt — en dan
 * ook de privacyverklaring.
 */
export const RETENTION = {
  closedDays: 56,
  openDays: 90,
  consentDays: 365,
} as const;

const DAY = 86_400_000;

type Termijn = Pick<Application, "status" | "created_at"> & { retain_longer?: boolean | null };

export function retentionDays(status: Application["status"], retainLonger = false): number {
  if (retainLonger) return RETENTION.consentDays;
  return status === "afgewezen" || status === "aangenomen" ? RETENTION.closedDays : RETENTION.openDays;
}

/** Is deze sollicitatie over haar bewaartermijn? */
export function isExpired(app: Termijn, now = new Date()): boolean {
  return now.getTime() - new Date(app.created_at).getTime() > retentionDays(app.status, app.retain_longer === true) * DAY;
}

/** Hoeveel dagen nog, of null als hij al verlopen is. */
export function daysLeft(app: Termijn, now = new Date()): number | null {
  const left = Math.ceil((new Date(app.created_at).getTime() + retentionDays(app.status, app.retain_longer === true) * DAY - now.getTime()) / DAY);
  return left > 0 ? left : null;
}
