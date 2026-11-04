/**
 * De stippentaal van de site (ontwerp "Home S-tier", HomeVerhaal.tsx) voor de
 * brochure: de kleuren uit het logo, de constellatie van ronde foto's tussen
 * gekleurde stippen, en het stippenspoor tussen stations. Puur rekenwerk,
 * zodat de brochurepagina (spans) en de pdf (react-pdf Views) dezelfde reis
 * tekenen.
 */

export const KLEUR = {
  teal: "#00A098",
  sky: "#3AA5DD",
  pink: "#E61674",
  orange: "#F19001",
  red: "#CB152B",
  navy: "#322E83",
} as const;

/** Bij elke kleur de zachte tint voor een label met stip. */
export const ZACHT: Record<string, string> = {
  [KLEUR.teal]: "#D7F0EE",
  [KLEUR.sky]: "#DDEFF9",
  [KLEUR.pink]: "#FDE3EE",
  [KLEUR.orange]: "#FDEBD3",
  [KLEUR.red]: "#F9DDE0",
  [KLEUR.navy]: "#E6E5F3",
};

/** De reiskleuren van de homepage, in volgorde: voorkomen, signaleren, begeleiden, verder. */
export const REIS = [KLEUR.teal, KLEUR.sky, KLEUR.pink, KLEUR.orange] as const;

/** De kleur van een hoofdstuk: de reiskleuren om de beurt, 01 teal tot 08 oranje. */
export const hoofdstukKleur = (index: number): string => REIS[index % REIS.length];

function hex(c: string) {
  return [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
}

/** Een kleur tussen a en b in (t van 0 tot 1). */
export function mix(a: string, b: string, t: number): string {
  const A = hex(a);
  const B = hex(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

export type Stip = { x: number; y: number; s: number; c: string; t: number };

/**
 * De stippen tussen twee stations, zoals de stippenreis op de homepage: een
 * zachte S-bocht, stippen die in het midden iets groter zijn en van kleur A
 * naar kleur B lopen, en niets binnen de rand van een station. `gat` laat het
 * midden weg: een onderbroken spoor, voor de reis zonder regie.
 */
export function spoor(
  van: [number, number],
  naar: [number, number],
  { kleurA, kleurB, rand, stap = 19, boog = 28, grootte = [8, 4], gat = false }: {
    kleurA: string;
    kleurB: string;
    /** Hoe ver van het middelpunt van een station de stippen wegblijven. */
    rand: number;
    stap?: number;
    boog?: number;
    /** De kleinste stip, en hoeveel groter hij in het midden wordt. */
    grootte?: [number, number];
    gat?: boolean;
  },
): Stip[] {
  const [x0, y0] = van;
  const [x1, y1] = naar;
  const horizontaal = Math.abs(x1 - x0) >= Math.abs(y1 - y0);
  const punten: [number, number][] = [];
  for (let k = 0; k < 400; k++) {
    const u = k / 399;
    const glad = 3 * u * u - 2 * u * u * u;
    punten.push(
      horizontaal
        ? [x0 + (x1 - x0) * u, y0 + (y1 - y0) * glad - boog * Math.sin(Math.PI * u)]
        : [x0 + (x1 - x0) * glad + boog * Math.sin(Math.PI * u), y0 + (y1 - y0) * u],
    );
  }
  let afstand = 0;
  let vorige = punten[0];
  let gekozen: [number, number][] = [];
  for (const p of punten.slice(1)) {
    afstand += Math.hypot(p[0] - vorige[0], p[1] - vorige[1]);
    vorige = p;
    if (afstand >= stap) {
      gekozen.push(p);
      afstand = 0;
    }
  }
  gekozen = gekozen.filter((p) => Math.hypot(p[0] - x0, p[1] - y0) > rand && Math.hypot(p[0] - x1, p[1] - y1) > rand);
  return gekozen
    .map((p, j) => {
      const t = j / Math.max(gekozen.length - 1, 1);
      return { x: p[0], y: p[1], s: grootte[0] + grootte[1] * Math.sin(Math.PI * t), c: mix(kleurA, kleurB, t), t };
    })
    .filter((p) => !gat || p.t < 0.3 || p.t > 0.7);
}

/**
 * De constellatie van de homepage op een vlak van 640×620: gekleurde stippen
 * [x, y, maat, kleur, zweef] en drie ronde foto's [x, y, maat, zweef].
 * Dezelfde plekken als HomeEenMens in HomeVerhaal.tsx.
 */
export const CONSTELLATIE = {
  breed: 640,
  hoog: 620,
  stippen: [
    [250, 10, 46, KLEUR.teal, 2], [318, 36, 34, KLEUR.teal, 1], [560, 70, 40, KLEUR.navy, 3], [140, 96, 30, KLEUR.sky, 1],
    [40, 420, 54, KLEUR.orange, 2], [96, 488, 30, KLEUR.orange, 1],
    [460, 330, 62, KLEUR.pink, 3], [470, 430, 38, KLEUR.red, 1], [540, 400, 30, KLEUR.red, 2], [590, 350, 44, KLEUR.red, 3],
    [200, 560, 34, KLEUR.pink, 1], [450, 540, 26, KLEUR.pink, 2],
  ] as [number, number, number, string, number][],
  fotos: [[330, 90, 200, 1], [80, 170, 220, 3], [250, 360, 180, 2]] as [number, number, number, number][],
};
