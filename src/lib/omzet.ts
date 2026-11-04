/**
 * Omzet (migratie 0035): wat React2u per maand verdient, uit twee bronnen.
 *
 * - Abonnementen: elke getekende offerte telt vanaf de maand van tekenen met
 *   zijn jaarbedrag gedeeld door twaalf, tot de maand waarin hij is gestopt
 *   (`abonnementen_gestopt`). Eenmalige onderdelen tellen in de maand van
 *   tekenen. Dezelfde rekenregels als de offerte zelf (berekenTotalen), met de
 *   keuze die de klant tekende.
 * - Uren: declarabele uren × het uurtarief van de medewerker, in de maand van
 *   de week (lib/uren.ts).
 *
 * Het is een omzet uit afspraken, geen boekhouding: een factuur die niet
 * betaald wordt of een meerwerk dat niet in een offerte staat, zit er niet in.
 * Puur, zonder database.
 */

import { normalizeName } from "./companies";
import { berekenTotalen, DIENSTLABEL, herstelKeuze, isVorm, normaliseerRegels, VORMEN, type Offerte } from "./offertes";
import { maandVanWeek, type Medewerker, type UrenRij } from "./uren";

/** `bron: "los"` voor een los opgevoerde klant of opdracht (lib/losseOpdrachten.ts). */
export type GetekendeOfferte = Pick<Offerte, "id" | "nummer" | "bedrijf" | "vorm" | "regels" | "keuze" | "medewerkers" | "status" | "getekend_at"> & { bron?: "los" };
export type Gestopt = { offerte_id: string; vanaf: string; reden?: string | null };

const TZ = "Europe/Amsterdam";

/** De maand (jjjj-mm) van een tijdstip, in Nederlandse tijd: een offerte om 00:30 op 1 december is van december. */
export function maandVan(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" }).format(new Date(iso)).slice(0, 7);
}

export function plusMaanden(maand: string, n: number): string {
  const [j, m] = maand.split("-").map(Number);
  const d = new Date(Date.UTC(j, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** De laatste `n` maanden tot en met `tot`, oudste eerst. */
export function maandenTot(tot: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => plusMaanden(tot, i - n + 1));
}

const MAAND_KORT = new Intl.DateTimeFormat("nl-NL", { month: "short", timeZone: "UTC" });
const MAAND_LANG = new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric", timeZone: "UTC" });

/** "nov" of "november 2026". */
export function maandNaam(maand: string, lang = false): string {
  const d = new Date(`${maand}-01T00:00:00Z`);
  return (lang ? MAAND_LANG : MAAND_KORT).format(d).replace(".", "");
}

/* ---------- abonnementen ---------- */

export type Labeldeel = { label: string; kleur: string; perMaand: number };

export type Abonnement = {
  offerte: GetekendeOfferte;
  /** De eerste maand met omzet: die van tekenen. */
  start: string;
  /** De eerste maand zonder omzet, of null als hij loopt. */
  stop: string | null;
  perMaand: number;
  eenmalig: number;
  /** Het abonnement verdeeld over de labels uit de offerteregels (React2u Recover, Resist, …). */
  labels: Labeldeel[];
};

const rond = (n: number) => Math.round(n * 100) / 100;

/** Elke getekende offerte als abonnement, met wat hij per maand en eenmalig opbrengt. */
export function abonnementen(offertes: GetekendeOfferte[], gestopt: Gestopt[] = []): Abonnement[] {
  const stop = new Map(gestopt.map((g) => [g.offerte_id, g.vanaf.slice(0, 7)]));
  const uit: Abonnement[] = [];
  for (const o of offertes) {
    if (o.status !== "getekend" || !o.getekend_at) continue;
    const vorm = isVorm(o.vorm) ? o.vorm : "verzuimbegeleiding";
    const regels = normaliseerRegels(o.regels);
    const t = berekenTotalen(regels, o.keuze ?? herstelKeuze(regels, o.keuze), o.medewerkers);
    const labels = new Map<string, Labeldeel>();
    for (const r of t.regels) {
      if (r.periode !== "jaar" || !r.bedrag) continue;
      const label = r.regel.label || DIENSTLABEL[vorm];
      const deel = labels.get(label) ?? { label, kleur: r.regel.kleur || VORMEN[vorm].kleur, perMaand: 0 };
      deel.perMaand = rond(deel.perMaand + r.bedrag / 12);
      labels.set(label, deel);
    }
    uit.push({
      offerte: o, start: maandVan(o.getekend_at), stop: stop.get(o.id) ?? null,
      perMaand: t.perMaand, eenmalig: t.eenmalig, labels: [...labels.values()],
    });
  }
  return uit;
}

/** Loopt het abonnement in deze maand? */
export function loopt(a: Pick<Abonnement, "start" | "stop">, maand: string): boolean {
  return a.start <= maand && (!a.stop || maand < a.stop);
}

/* ---------- per maand ---------- */

export type Maandomzet = {
  maand: string;
  abonnementen: number;
  eenmalig: number;
  uren: number;
  totaal: number;
  /** Declarabele uren in die maand, ook zonder uurtarief. */
  urenAantal: number;
};

export function omzetPerMaand(abos: Abonnement[], medewerkers: Pick<Medewerker, "id" | "uurtarief">[], uren: UrenRij[], maanden: string[]): Maandomzet[] {
  const tarief = new Map(medewerkers.map((m) => [m.id, m.uurtarief === null ? null : Number(m.uurtarief)]));
  return maanden.map((maand) => {
    const a = rond(abos.filter((x) => loopt(x, maand)).reduce((s, x) => s + x.perMaand, 0));
    const e = rond(abos.filter((x) => x.start === maand).reduce((s, x) => s + x.eenmalig, 0));
    const deze = uren.filter((r) => maandVanWeek(r.week) === maand);
    const u = rond(deze.reduce((s, r) => s + Number(r.declarabel) * (tarief.get(r.medewerker_id) ?? 0), 0));
    const aantal = deze.reduce((s, r) => s + Number(r.declarabel), 0);
    return { maand, abonnementen: a, eenmalig: e, uren: u, totaal: rond(a + e + u), urenAantal: aantal };
  });
}

/** Het abonnement per label in een maand, grootste eerst. */
export function perLabel(abos: Abonnement[], maand: string): (Labeldeel & { klanten: number })[] {
  const uit = new Map<string, Labeldeel & { klanten: number }>();
  for (const a of abos) {
    if (!loopt(a, maand)) continue;
    for (const l of a.labels) {
      const d = uit.get(l.label) ?? { ...l, perMaand: 0, klanten: 0 };
      d.perMaand = rond(d.perMaand + l.perMaand);
      d.klanten += 1;
      uit.set(l.label, d);
    }
  }
  return [...uit.values()].sort((x, y) => y.perMaand - x.perMaand);
}

export type Klant = { sleutel: string; bedrijf: string; perMaand: number; sinds: string; abonnementen: Abonnement[] };

/** Per klant (op bedrijfsnaam zonder rechtsvorm) wat er nu loopt, grootste eerst. */
export function perKlant(abos: Abonnement[], maand: string): Klant[] {
  const uit = new Map<string, Klant>();
  for (const a of abos) {
    if (!loopt(a, maand) || a.perMaand <= 0) continue;
    const sleutel = normalizeName(a.offerte.bedrijf) || a.offerte.id;
    const k = uit.get(sleutel) ?? { sleutel, bedrijf: a.offerte.bedrijf, perMaand: 0, sinds: a.start, abonnementen: [] };
    k.perMaand = rond(k.perMaand + a.perMaand);
    if (a.start < k.sinds) k.sinds = a.start;
    k.abonnementen.push(a);
    uit.set(sleutel, k);
  }
  return [...uit.values()].sort((x, y) => y.perMaand - x.perMaand || x.bedrijf.localeCompare(y.bedrijf, "nl"));
}

/**
 * Hoe het maandbedrag van de abonnementen veranderde: wat er aan het begin
 * liep, wat er bij kwam en wat er stopte. Begin + nieuw − gestopt = eind.
 */
export function abonnementsbrug(abos: Abonnement[], maand: string) {
  const vorige = plusMaanden(maand, -1);
  const som = (l: Abonnement[]) => rond(l.reduce((s, a) => s + a.perMaand, 0));
  const begin = abos.filter((a) => loopt(a, vorige));
  const nieuw = abos.filter((a) => a.start === maand && a.perMaand > 0);
  const gestopt = abos.filter((a) => a.stop === maand && loopt(a, vorige));
  return {
    begin: som(begin),
    nieuw: { bedrag: som(nieuw), aantal: nieuw.length },
    gestopt: { bedrag: som(gestopt), aantal: gestopt.length },
    eind: som(abos.filter((a) => loopt(a, maand))),
  };
}

/** Jaar tot nu: de som van januari tot en met `maand`, en hetzelfde stuk van het jaar ervoor. */
export function jaarTotNu(reeks: Maandomzet[], maand: string): { dit: number; vorig: number | null } {
  const jaar = maand.slice(0, 4);
  const vorigJaar = String(Number(jaar) - 1);
  const totMaand = maand.slice(5);
  const dit = reeks.filter((m) => m.maand.startsWith(jaar) && m.maand <= maand);
  const vorig = reeks.filter((m) => m.maand.startsWith(vorigJaar) && m.maand.slice(5) <= totMaand);
  return {
    dit: rond(dit.reduce((s, m) => s + m.totaal, 0)),
    // Alleen vergelijken als het hele stuk van vorig jaar in de reeks zit.
    vorig: vorig.length === Number(totMaand) ? rond(vorig.reduce((s, m) => s + m.totaal, 0)) : null,
  };
}
