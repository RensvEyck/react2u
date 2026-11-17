/**
 * Bellen vanaf je telefoon legt zichzelf vast. Tik je op een nummer op het
 * bord, dan onthouden we wie je belde (localStorage, zodat het overleeft dat
 * de telefoon-app even voor staat). Kom je terug in de browser, dan vraagt het
 * bord "Wat is er afgesproken?" met drie knoppen. Puur, met de opslag als
 * parameter, zodat het te testen is.
 */

export type Bel = { id: string; bedrijf: string; naam: string | null; at: number };

export const BEL_SLEUTEL = "kb-bel";

/** Pas na zoveel milliseconden telt terugkomen als "net gebeld": een misklik op het nummer is anders meteen een vraag. */
export const BEL_MINIMAAL_MS = 8_000;

type Opslag = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const opslag = (): Opslag | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

export function noteerBel(b: Omit<Bel, "at">, nu = Date.now(), o: Opslag | null = opslag()): void {
  try {
    o?.setItem(BEL_SLEUTEL, JSON.stringify({ ...b, at: nu }));
  } catch {
    // privémodus of geen opslag: dan geen vraag achteraf
  }
}

/** De bel die lang genoeg geleden begon om nu te vragen hoe het ging; anders null. */
export function openBel(nu = Date.now(), o: Opslag | null = opslag()): Bel | null {
  try {
    const ruw = o?.getItem(BEL_SLEUTEL);
    if (!ruw) return null;
    const b = JSON.parse(ruw) as Partial<Bel>;
    if (!b || typeof b.id !== "string" || typeof b.at !== "number") return null;
    // Ouder dan een dag: dat telefoontje is al lang voorbij.
    if (nu - b.at > 86_400_000) return null;
    if (nu - b.at < BEL_MINIMAAL_MS) return null;
    return { id: b.id, bedrijf: String(b.bedrijf || ""), naam: b.naam ?? null, at: b.at };
  } catch {
    return null;
  }
}

export function wisBel(o: Opslag | null = opslag()): void {
  try {
    o?.removeItem(BEL_SLEUTEL);
  } catch {
    // niets te wissen
  }
}
