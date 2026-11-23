import nederland from "./kaart/nederland.json";
import postcodes from "./kaart/postcodes.json";

/**
 * De kaart van Nederland voor het CM-overleg (0053; Rens, 23 nov 2026: "de
 * landkaart van nederland met verdeling per casemanager op de kaart").
 *
 * De kaart zelf komt uit scripts/kaartdata.mjs: 342 gemeenten als SVG-pad en
 * per postcode van vier cijfers een punt en de gemeente, uit open data van het
 * CBS. Een klant staat op de kaart op zijn postcode (stamkaart, bezoekadres,
 * anders postadres), of zonder postcode in het midden van de gemeente als de
 * plaats een gemeentenaam is. Er gaat niets naar een externe dienst.
 *
 * Wie er op de kaart staat: het team (Medewerkers met een functie
 * casemanager, actief; cm_team(), 0057) en daarnaast elke andere naam die op
 * een stamkaart als casemanager staat. Een stamkaart met alleen de voornaam
 * ("Fleur") of een deel van de naam ("Sanne Bos") hoort bij die collega uit
 * het team zolang de voornaam in het team uniek is. Wie in het team zit maar
 * nog geen klanten heeft, staat er ook (Rens, 23 nov 2026: een casemanager
 * zonder klanten ontbrak op de kaart, terwijl ze wel bij Medewerkers stond).
 *
 * Kleuren per casemanager, in de volgorde van het team: de eerste drie
 * plekken van het geteste palet zijn ook voor kleurenblinden onderling te
 * onderscheiden als alles door elkaar op de kaart staat. Geen vier kleuren
 * halen die toets samen (scripts/validate_palette.js, --pairs all), dus de
 * vierde casemanager krijgt geel én een ruit in plaats van een stip, en elke
 * casemanager is uit te lichten (KaartLagen). Een vijfde en verder krijgen
 * samen één kleur ("overige"); de lijst ernaast noemt ze wel bij naam.
 */

export type Gemeente = { code: string; naam: string; d: string; x: number; y: number };
export const KAART = nederland as { breedte: number; hoogte: number; gemeenten: Gemeente[] };
const PC4 = postcodes as unknown as Record<string, [number, number, number]>;

export const CM_KLEUREN = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"] as const;
/** De vorm van een klant op de kaart: een ruit voor de vierde casemanager (geel ligt dicht bij oranje), anders een stip. */
export type Vorm = "stip" | "ruit";
export const vormVan = (cm: number): Vorm => (cm === 3 ? "ruit" : "stip");
export const OVERIG_KLEUR = "#8d89a6";
export const ZONDER_KLEUR = "#c4c1d4";

export type KaartKlant = {
  id: string;
  bedrijf: string;
  status: string;
  casemanager: string | null;
  medewerkers: number | null;
  postcode: string | null;
  plaats: string | null;
};

export type Plek = { x: number; y: number; gemeente: number; bron: "postcode" | "plaats" };

/** Kleine letters, zonder accenten, toevoegingen als "(L.)" en leestekens. */
export function plaatsSleutel(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Gemeentenamen zoals het CBS ze schrijft, plus wat mensen intikken.
const BIJNAMEN: Record<string, string> = { "den haag": "s gravenhage", "den bosch": "s hertogenbosch", "s hertogenbosch": "s hertogenbosch" };
const PER_NAAM = new Map<string, number>();
KAART.gemeenten.forEach((g, i) => {
  const k = plaatsSleutel(g.naam);
  // Bij twee gemeenten met dezelfde naam (Bergen in Limburg en in Noord-Holland) is de plaats alleen niet genoeg.
  PER_NAAM.set(k, PER_NAAM.has(k) ? -1 : i);
});

/** Waar een klant op de kaart staat: op de postcode, anders op de gemeente; null als het niet te vinden is. */
export function plekVan(postcode: string | null, plaats: string | null): Plek | null {
  const pc = (postcode || "").replace(/\s+/g, "").slice(0, 4);
  if (/^\d{4}$/.test(pc) && PC4[pc]) {
    const [x, y, gemeente] = PC4[pc];
    return { x, y, gemeente, bron: "postcode" };
  }
  if (plaats) {
    const k = plaatsSleutel(plaats);
    const i = PER_NAAM.get(BIJNAMEN[k] ?? k);
    if (i !== undefined && i >= 0) return { x: KAART.gemeenten[i].x, y: KAART.gemeenten[i].y, gemeente: i, bron: "plaats" };
  }
  return null;
}

export type CmStand = {
  naam: string;
  /** De hele naam uit Medewerkers, of de naam zoals op de stamkaart. */
  volledig: string;
  kleur: string;
  vorm: Vorm;
  /** Uit het team (Medewerkers), of alleen van een stamkaart. */
  inTeam: boolean;
  klanten: number;
  werknemers: number;
  gemeenten: number;
  opKaart: number;
};
export type KaartPunt = { klant: KaartKlant; x: number; y: number; r: number; kleur: string; vorm: Vorm; cm: number };
/** Een casemanager uit het team (cm_team(): Medewerkers met een functie casemanager, actief). */
export type TeamLid = { naam: string; sort?: number | null };
export type KaartStand = {
  casemanagers: CmStand[];
  /** Klanten zonder casemanager, apart in de lijst. */
  zonderCm: KaartKlant[];
  punten: KaartPunt[];
  zonderPlek: KaartKlant[];
  /** Per gemeente (index in KAART.gemeenten) de casemanager met de meeste klanten daar (index in casemanagers). */
  werkgebied: Map<number, number>;
};

/** Grootte van een stip in kaarteenheden (100 m): groter bij meer werknemers, met een minimum dat je ziet. */
export function straal(medewerkers: number | null): number {
  if (!medewerkers || medewerkers < 1) return 50;
  return Math.round(Math.min(130, 42 + Math.sqrt(medewerkers) * 6));
}

const schoon = (n: string) => n.trim().replace(/\s+/g, " ");
const voornaamVan = (n: string) => schoon(n).split(" ")[0].toLowerCase();

/**
 * De casemanagers op volgorde: eerst het team (in de volgorde van Medewerkers),
 * dan de andere namen van de stamkaarten op alfabet. Geeft ook terug bij wie
 * een naam van een stamkaart hoort.
 */
export function casemanagersVan(klanten: Pick<KaartKlant, "casemanager">[], team: TeamLid[] = []): { lijst: { naam: string; volledig: string; inTeam: boolean }[]; van: (naam: string | null) => number } {
  const leden = [...team].filter((t) => schoon(t.naam)).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.naam.localeCompare(b.naam, "nl"));
  const telling = new Map<string, number>();
  for (const t of leden) telling.set(voornaamVan(t.naam), (telling.get(voornaamVan(t.naam)) ?? 0) + 1);
  const uniek = (t: TeamLid) => telling.get(voornaamVan(t.naam)) === 1;
  const lijst = leden.map((t) => ({ naam: uniek(t) ? schoon(t.naam).split(" ")[0] : schoon(t.naam), volledig: schoon(t.naam), inTeam: true }));

  const inTeam = (naam: string): number => {
    const n = schoon(naam).toLowerCase();
    const heel = leden.findIndex((t) => schoon(t.naam).toLowerCase() === n);
    if (heel >= 0) return heel;
    return leden.findIndex((t) => uniek(t) && voornaamVan(t.naam) === voornaamVan(naam));
  };
  const los = [...new Map(
    klanten
      .map((k) => (k.casemanager ? schoon(k.casemanager) : ""))
      .filter((n) => n && inTeam(n) < 0)
      .map((n) => [n.toLowerCase(), n] as const),
  ).values()].sort((a, b) => a.localeCompare(b, "nl"));
  for (const n of los) lijst.push({ naam: n, volledig: n, inTeam: false });

  const van = (naam: string | null) => {
    if (!naam || !schoon(naam)) return -1;
    const t = inTeam(naam);
    return t >= 0 ? t : leden.length + los.findIndex((n) => n.toLowerCase() === schoon(naam).toLowerCase());
  };
  return { lijst, van };
}

export function kaartStand(klanten: KaartKlant[], team: TeamLid[] = []): KaartStand {
  const { lijst, van } = casemanagersVan(klanten, team);
  const kleur = (i: number) => (i < CM_KLEUREN.length ? CM_KLEUREN[i] : OVERIG_KLEUR);
  const casemanagers: CmStand[] = lijst.map((c, i) => ({ ...c, kleur: kleur(i), vorm: vormVan(i), klanten: 0, werknemers: 0, gemeenten: 0, opKaart: 0 }));

  const punten: KaartPunt[] = [];
  const zonderPlek: KaartKlant[] = [];
  const perGemeente = new Map<number, Map<number, { klanten: number; werknemers: number }>>();
  const opPlek = new Map<string, number>();
  for (const k of klanten) {
    const cm = van(k.casemanager);
    if (cm >= 0) {
      casemanagers[cm].klanten++;
      casemanagers[cm].werknemers += k.medewerkers || 0;
    }
    const plek = plekVan(k.postcode, k.plaats);
    if (!plek) {
      zonderPlek.push(k);
      continue;
    }
    // Meer klanten op dezelfde plek: een klein rondje eromheen, zodat je ze allemaal ziet.
    const sleutel = `${plek.x},${plek.y}`;
    const n = opPlek.get(sleutel) ?? 0;
    opPlek.set(sleutel, n + 1);
    const hoek = n * 2.4;
    const afstand = n ? 80 + 20 * n : 0;
    punten.push({
      klant: k,
      x: Math.round(plek.x + Math.cos(hoek) * afstand),
      y: Math.round(plek.y + Math.sin(hoek) * afstand),
      r: straal(k.medewerkers),
      kleur: cm >= 0 ? casemanagers[cm].kleur : ZONDER_KLEUR,
      vorm: cm >= 0 ? casemanagers[cm].vorm : "stip",
      cm,
    });
    if (cm >= 0) {
      casemanagers[cm].opKaart++;
      const g = perGemeente.get(plek.gemeente) ?? new Map();
      const t = g.get(cm) ?? { klanten: 0, werknemers: 0 };
      t.klanten++;
      t.werknemers += k.medewerkers || 0;
      g.set(cm, t);
      perGemeente.set(plek.gemeente, g);
    }
  }

  const werkgebied = new Map<number, number>();
  for (const [gemeente, telling] of perGemeente) {
    const [winnaar] = [...telling.entries()].sort((a, b) => b[1].klanten - a[1].klanten || b[1].werknemers - a[1].werknemers || a[0] - b[0]);
    werkgebied.set(gemeente, winnaar[0]);
    for (const cm of telling.keys()) casemanagers[cm].gemeenten++;
  }

  // Kleine stippen bovenop grote: eerst de grootste tekenen.
  punten.sort((a, b) => b.r - a.r);
  return { casemanagers, zonderCm: klanten.filter((k) => !k.casemanager), punten, zonderPlek, werkgebied };
}
