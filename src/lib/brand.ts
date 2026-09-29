import type { CSSProperties } from "react";

/**
 * Merkkleuren en de stippenwolk uit het logo.
 *
 * Elke dienst heeft een eigen kleur uit de stippen van het logo. Dat is het
 * herkenbaarste detail van de huisstijl, dus die kleuren staan hier op één
 * plek — blokken en het menu verwijzen naar een naam ("rood", "blauw"), nooit
 * naar een hexcode. Zo kan een redacteur in het CMS "roze" typen in plaats van
 * een kleurcode te moeten kennen.
 */

export type Kleur = "blauw" | "teal" | "rood" | "oranje" | "roze" | "indigo";

/**
 * Per kleur vier tinten:
 * - `tekst`: voor tekst en iconen. Verdiept tot minstens 4,9:1 contrast, óók
 *   op de eigen `zacht`-tint — de originele stipkleuren halen dat niet;
 * - `vlak`: de originele stipkleur, voor stippen, balkjes en decoratie;
 * - `zacht`: een lichte achtergrondtint;
 * - `donker`: de stipkleur op een donkere (indigo) ondergrond. Alleen indigo
 *   wijkt af — die valt anders weg tegen indigo.
 */
export const KLEUREN: Record<Kleur, { tekst: string; vlak: string; zacht: string; donker: string }> = {
  blauw: { tekst: "#186c98", vlak: "#39a5dd", zacht: "#eaf5fb", donker: "#39a5dd" },
  teal: { tekst: "#007166", vlak: "#00a098", zacht: "#e5f5f3", donker: "#00a098" },
  rood: { tekst: "#ca152a", vlak: "#ca152a", zacht: "#fbeaec", donker: "#e8455a" },
  oranje: { tekst: "#955900", vlak: "#f19000", zacht: "#fef3e1", donker: "#f19000" },
  roze: { tekst: "#c01263", vlak: "#e51673", zacht: "#fce9f2", donker: "#e51673" },
  indigo: { tekst: "#312e82", vlak: "#312e82", zacht: "#efeef8", donker: "#a9a6ea" },
};

/** Onbekende of lege kleur valt terug op indigo, zodat een typefout in het CMS niets breekt. */
export function kleur(naam: unknown) {
  return KLEUREN[(typeof naam === "string" && naam in KLEUREN ? naam : "indigo") as Kleur];
}

/**
 * CSS-variabelen voor één kleur, om via `style` op een element te zetten.
 * Componenten gebruiken daarna `text-[var(--k)]`, `bg-[var(--k-zacht)]` enz.
 */
export function kleurVars(naam: unknown): CSSProperties {
  const k = kleur(naam);
  return { "--k": k.tekst, "--k-vlak": k.vlak, "--k-zacht": k.zacht, "--k-donker": k.donker } as CSSProperties;
}

/**
 * De stippenwolk uit het logo (Logo-kleur.svg), zonder het woordmerk: per stip
 * [kleur, cx, cy], straal 3,14, in de viewBox van het logo.
 *
 * Opgemeten uit de paden van het logo en omgezet naar cirkels. In het origineel
 * is de onderste blauwe stip afgevlakt waar hij de "t" raakt; op groot formaat
 * oogt dat als een fout, dus hier is hij rond.
 */
export const LOGO_DOTS: [string, number, number][] = [
  ["#39a5dd", 47.84, 16.19],
  ["#00a098", 57.78, 3.14],
  ["#39a5dd", 58.21, 15.39],
  ["#00a098", 67.96, 5.16],
  ["#39a5dd", 68.11, 18.63],
  ["#00a098", 76.62, 10.92],
  ["#312e82", 91.69, 11.95],
  ["#f19000", 37.72, 54.2],
  ["#f19000", 41.23, 64],
  ["#e51673", 51.54, 57.38],
  ["#e51673", 57.52, 65.81],
  ["#ca152a", 65.88, 57.91],
  ["#e51673", 66.3, 71.38],
  ["#ca152a", 75.82, 60.91],
  ["#e51673", 76.55, 73.16],
  ["#ca152a", 86.17, 59.88],
  ["#ca152a", 95.33, 54.99],
];

export const DOT_R = 3.14;
