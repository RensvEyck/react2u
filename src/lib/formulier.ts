/**
 * Pure hulpjes voor de publieke formulieren. Los van actions.ts, omdat een
 * "use server"-bestand alleen async functies mag exporteren — en omdat dit
 * zonder server te testen is.
 */

/**
 * Een e-mailadres dat tenminste de vorm heeft van een e-mailadres. Geen
 * volledige RFC-controle (die keurt echte adressen af), wel genoeg om "jan",
 * "jan@" en "jan@bedrijf" tegen te houden — daar kan niemand op antwoorden.
 */
export function geldigEmail(email: string): boolean {
  return email.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/** De keuzes in de belbalk; de waarde is wat er in het bericht komt. */
export const TERUGBEL_MOMENTEN = [
  "Zo snel mogelijk",
  "Vandaag nog",
  "Morgenochtend",
  "Morgenmiddag",
  "Later deze week",
] as const;
