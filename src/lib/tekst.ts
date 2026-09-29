/**
 * Kleine tekstbewerkingen voor weergave. Ze veranderen niets in de database —
 * alleen hoe iets op de site verschijnt.
 */

// Afkortingen die in hoofdletters horen, ook als de rest van een label dat niet doet.
const AFKORTINGEN = new Set(["WVP", "ERD", "ZW", "ERD/ZW", "RI&E", "ISO", "UWV", "PMO", "MTO", "WIA", "HR", "FD", "EU", "BIG", "KVK", "BTW"]);

/**
 * Een label dat helemaal in hoofdletters staat ("NEEM CONTACT OP") wordt
 * gewone zinsopbouw ("Neem contact op"). De oude site typte knoppen in
 * kapitalen; naast de rest van de site oogt dat als schreeuwen. Afkortingen
 * blijven staan, en een label met gewone kleine letters blijft ongemoeid.
 */
export function zinsletters(label: string): string {
  const t = (label || "").trim();
  if (!/[A-ZÀ-Þ]/.test(t) || t !== t.toUpperCase() || t.length <= 4) return t;
  const woorden = t.split(/(\s+)/).map((w) => (AFKORTINGEN.has(w.replace(/[?!.,:]+$/, "")) ? w : w.toLowerCase()));
  const zin = woorden.join("");
  const i = zin.search(/\p{L}/u);
  return i < 0 ? zin : zin.slice(0, i) + zin[i].toUpperCase() + zin.slice(i + 1);
}

/**
 * Houdt korte woorden met een koppelteken bij elkaar: "re-integratie" brak
 * anders af als "re-" aan het eind van de regel. Geeft stukken terug waarin
 * zo'n woord in een `nowrap`-span staat; lange samenstellingen mogen wel
 * breken, anders lopen ze op een telefoon uit beeld.
 */
export function koppeltekensHeel(tekst: string): (string | { heel: string })[] {
  const out: (string | { heel: string })[] = [];
  const re = /[\p{L}\d]+(?:-[\p{L}\d]+)+/gu;
  let last = 0;
  for (const m of tekst.matchAll(re)) {
    if (m[0].length > 18) continue;
    if (m.index! > last) out.push(tekst.slice(last, m.index));
    out.push({ heel: m[0] });
    last = m.index! + m[0].length;
  }
  if (last < tekst.length) out.push(tekst.slice(last));
  return out;
}
