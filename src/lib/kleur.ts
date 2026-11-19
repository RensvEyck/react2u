/*
 * Tekstkleuren met genoeg contrast.
 *
 * De merkkleuren uit het logo zijn gemaakt voor vlakken en stippen, niet voor
 * letters: roze #E61674 en het grijs #77758F haalden 4,44:1 op wit, net onder
 * de 4,5:1 van WCAG AA; teal, oranje en blauw blijven onder de 3,3:1. De
 * HALO-scan van november 2026 telde dat na. Voor tekst en knoppen gelden
 * daarom deze donkerdere tinten; de vlakken, stippen en randen houden de
 * oorspronkelijke kleur. Doorgerekend (relatieve luminantie, WCAG 2.x):
 *
 *   roze   #D4136A  5,1 op wit, 4,6 op het ivoren vlak #F6F2EC
 *   grijs  #67657F  5,6 / 5,0
 *   teal   #007A6D  5,2 / 4,7   (= --color-secondary-ink in globals.css)
 *   oranje #B45600  4,9 / 4,4
 *   blauw  #2277A8  4,9 / 4,4
 *
 * Rood #CA152A (Reward) en indigo #322E83 (Ready) halen het al en blijven.
 */

export const INKT: Record<string, string> = {
  "#e61674": "#D4136A",
  "#e51673": "#D4136A",
  "#77758f": "#67657F",
  "#00a098": "#007A6D",
  "#00aa98": "#007A6D",
  "#f19001": "#B45600",
  "#f19000": "#B45600",
  "#3aa5dd": "#2277A8",
  "#39a5dd": "#2277A8",
};

/**
 * De tekstkleur bij een merkkleur: de donkerdere tint als die er is, anders de
 * kleur zelf (indigo, rood, een eigen kleur uit het CMS). Zonder kleur `standaard`.
 */
export function inkt(kleur: string | null | undefined, standaard = "#322E83"): string {
  const k = (kleur || "").trim();
  if (!k) return standaard;
  return INKT[k.toLowerCase()] ?? k;
}
