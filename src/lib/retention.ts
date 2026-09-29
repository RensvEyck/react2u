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
 *
 * Pas deze getallen aan als de organisatie een ander beleid vastlegt — en dan
 * ook de privacyverklaring.
 */
export const RETENTION = {
  closedDays: 56,
  openDays: 90,
} as const;

const DAY = 86_400_000;

export function retentionDays(status: Application["status"]): number {
  return status === "afgewezen" || status === "aangenomen" ? RETENTION.closedDays : RETENTION.openDays;
}

/** Is deze sollicitatie over haar bewaartermijn? */
export function isExpired(app: Pick<Application, "status" | "created_at">, now = new Date()): boolean {
  return now.getTime() - new Date(app.created_at).getTime() > retentionDays(app.status) * DAY;
}

/** Hoeveel dagen nog, of null als hij al verlopen is. */
export function daysLeft(app: Pick<Application, "status" | "created_at">, now = new Date()): number | null {
  const left = Math.ceil((new Date(app.created_at).getTime() + retentionDays(app.status) * DAY - now.getTime()) / DAY);
  return left > 0 ? left : null;
}
