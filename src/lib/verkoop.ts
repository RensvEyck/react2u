/**
 * Het salesdashboard (/admin/verkoop): de trechter, de pijplijn per fase, de
 * maanden, en per soort offerte en per verkoper hoe het gaat.
 *
 * Twee manieren van tellen, bewust uit elkaar gehouden:
 * - **Getekend in de periode** telt op de datum van tekenen: wat er binnenkwam.
 * - **Hitrate** telt het cohort: de offertes die in de periode verstuurd zijn en
 *   inmiddels afgerond (getekend, niet akkoord of verlopen), net als
 *   `hitrate()` in lib/opvolgen.ts voor het dashboard en /admin/offertes.
 *
 * Puur, zonder database.
 */

import { hitrate, klantSleutels, type BrochureRij, type OfferteRij } from "./opvolgen";
import { datumOver, isVorm, VORMEN, waardeVan, weergaveVan, type Offerte, type Totalen, type Vorm } from "./offertes";
import { maandVan } from "./omzet";

export type VerkoopOfferte = OfferteRij & Pick<Offerte, "afzender_naam" | "afgewezen_at">;

export const PERIODES = [
  { key: "30", label: "30 dagen", dagen: 30 },
  { key: "90", label: "90 dagen", dagen: 90 },
  { key: "365", label: "12 maanden", dagen: 365 },
] as const;

export type PeriodeKey = (typeof PERIODES)[number]["key"];

export function periodeVan(key: string | undefined) {
  return PERIODES.find((p) => p.key === key) ?? PERIODES[1];
}

type Rij = { o: VerkoopOfferte; w: ReturnType<typeof weergaveVan>; t: Totalen; vorm: Vorm };

function rijen(offertes: VerkoopOfferte[], vandaag: string): Rij[] {
  return offertes.map((o) => ({ o, w: weergaveVan(o, vandaag), t: waardeVan(o), vorm: isVorm(o.vorm) ? o.vorm : "verzuimbegeleiding" }));
}

const rond = (n: number) => Math.round(n * 100) / 100;
const som = (l: Rij[], k: "perMaand" | "eenmalig") => rond(l.reduce((s, r) => s + r.t[k], 0));
const dag = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");

/* ---------- kerncijfers ---------- */

export type Kern = {
  getekend: { aantal: number; perMaand: number; eenmalig: number };
  hitrate: { procent: number | null; getekend: number; afgerond: number };
  /** Mediaan in dagen van versturen tot tekenen, over wat er in de periode getekend is. */
  doorlooptijd: number | null;
  /** Gemiddeld maandbedrag van wat er in de periode getekend is (alleen met een maandbedrag). */
  gemiddeld: number | null;
  verstuurd: number;
};

export function kern(offertes: VerkoopOfferte[], sinds: string, nu = new Date()): Kern {
  const vandaag = datumOver(0, nu);
  const alle = rijen(offertes, vandaag);
  const getekend = alle.filter(({ o }) => o.status === "getekend" && dag(o.getekend_at) >= sinds);
  const h = hitrate(alle, sinds);
  const dagen = getekend
    .filter(({ o }) => o.verstuurd_at && o.getekend_at)
    .map(({ o }) => (new Date(o.getekend_at!).getTime() - new Date(o.verstuurd_at!).getTime()) / 86_400_000)
    .sort((a, b) => a - b);
  const mediaan = dagen.length
    ? Math.round(dagen.length % 2 ? dagen[(dagen.length - 1) / 2] : (dagen[dagen.length / 2 - 1] + dagen[dagen.length / 2]) / 2)
    : null;
  const metMaand = getekend.filter(({ t }) => t.perMaand > 0);
  return {
    getekend: { aantal: getekend.length, perMaand: som(getekend, "perMaand"), eenmalig: som(getekend, "eenmalig") },
    hitrate: { procent: h.procent, getekend: h.getekend.length, afgerond: h.afgerond.length },
    doorlooptijd: mediaan,
    gemiddeld: metMaand.length ? rond(som(metMaand, "perMaand") / metMaand.length) : null,
    verstuurd: alle.filter(({ o }) => dag(o.verstuurd_at) >= sinds).length,
  };
}

/* ---------- trechter ---------- */

export type Stap = { label: string; aantal: number };

/**
 * Van brochure naar handtekening, over wat er in de periode verstuurd is. Een
 * brochure "leidde tot een offerte" als er daarna een offerte voor dezelfde
 * klant kwam (naam, e-mail of domein, zoals in lib/opvolgen.ts).
 */
export function trechter(offertes: VerkoopOfferte[], brochures: BrochureRij[], sinds: string): { brochures: Stap[]; offertes: Stap[] } {
  const b = brochures.filter((x) => x.status !== "concept" && dag(x.verstuurd_at) >= sinds);
  const metOfferte = b.filter((x) => {
    const eigen = new Set(klantSleutels(x));
    return offertes.some((o) => o.status !== "ingetrokken" && o.created_at >= (x.verstuurd_at ?? x.created_at).slice(0, 10) && klantSleutels(o).some((s) => eigen.has(s)));
  });
  const o = offertes.filter((x) => x.status !== "concept" && dag(x.verstuurd_at) >= sinds);
  return {
    brochures: [
      { label: "Brochure verstuurd", aantal: b.length },
      { label: "Bekeken", aantal: b.filter((x) => x.bekeken_at).length },
      { label: "Offerte gemaakt", aantal: metOfferte.length },
    ],
    offertes: [
      { label: "Offerte verstuurd", aantal: o.length },
      { label: "Bekeken", aantal: o.filter((x) => x.bekeken_at).length },
      { label: "Onderdelen gekozen", aantal: o.filter((x) => x.keuze_at).length },
      { label: "Getekend", aantal: o.filter((x) => x.status === "getekend").length },
    ],
  };
}

/* ---------- pijplijn ---------- */

export type Fase = { key: "niet-geopend" | "bekeken" | "gekozen"; label: string; aantal: number; perMaand: number; eenmalig: number };

/** De open offertes (verstuurd, niet verlopen) naar hoe ver de klant is. */
export function pijplijn(offertes: VerkoopOfferte[], nu = new Date()): Fase[] {
  const open = rijen(offertes, datumOver(0, nu)).filter(({ w }) => w === "verstuurd" || w === "bekeken");
  const fase = (key: Fase["key"], label: string, l: Rij[]): Fase => ({ key, label, aantal: l.length, perMaand: som(l, "perMaand"), eenmalig: som(l, "eenmalig") });
  return [
    fase("niet-geopend", "Nog niet geopend", open.filter(({ o }) => !o.bekeken_at)),
    fase("bekeken", "Bekeken", open.filter(({ o }) => o.bekeken_at && !o.keuze_at)),
    fase("gekozen", "Koos onderdelen", open.filter(({ o }) => o.bekeken_at && o.keuze_at)),
  ];
}

/* ---------- per maand ---------- */

export type VerkoopMaand = { maand: string; verstuurd: number; getekend: number; perMaand: number; eenmalig: number };

/** Per maand hoeveel er verstuurd en getekend is, en wat het getekende opbrengt. */
export function perMaand(offertes: VerkoopOfferte[], maanden: string[], nu = new Date()): VerkoopMaand[] {
  const alle = rijen(offertes, datumOver(0, nu));
  return maanden.map((maand) => {
    const getekend = alle.filter(({ o }) => o.status === "getekend" && o.getekend_at && maandVan(o.getekend_at) === maand);
    return {
      maand,
      verstuurd: alle.filter(({ o }) => o.verstuurd_at && maandVan(o.verstuurd_at) === maand).length,
      getekend: getekend.length,
      perMaand: som(getekend, "perMaand"),
      eenmalig: som(getekend, "eenmalig"),
    };
  });
}

/* ---------- per soort en per verkoper ---------- */

export type Groep = {
  sleutel: string;
  label: string;
  kleur: string | null;
  verstuurd: number;
  open: number;
  getekend: number;
  hitrate: number | null;
  perMaand: number;
  eenmalig: number;
};

function groepeer(offertes: VerkoopOfferte[], sinds: string, nu: Date, sleutel: (r: Rij) => { sleutel: string; label: string; kleur: string | null }): Groep[] {
  const alle = rijen(offertes, datumOver(0, nu));
  const groepen = new Map<string, { info: ReturnType<typeof sleutel>; l: Rij[] }>();
  for (const r of alle) {
    if (r.o.status === "concept") continue;
    const info = sleutel(r);
    const g = groepen.get(info.sleutel) ?? { info, l: [] };
    g.l.push(r);
    groepen.set(info.sleutel, g);
  }
  const uit: Groep[] = [];
  for (const { info, l } of groepen.values()) {
    const getekend = l.filter(({ o }) => o.status === "getekend" && dag(o.getekend_at) >= sinds);
    const verstuurd = l.filter(({ o }) => dag(o.verstuurd_at) >= sinds);
    const open = l.filter(({ w }) => w === "verstuurd" || w === "bekeken");
    if (!verstuurd.length && !getekend.length && !open.length) continue;
    uit.push({
      ...info,
      verstuurd: verstuurd.length,
      open: open.length,
      getekend: getekend.length,
      hitrate: hitrate(l, sinds).procent,
      perMaand: som(getekend, "perMaand"),
      eenmalig: som(getekend, "eenmalig"),
    });
  }
  return uit.sort((a, b) => b.perMaand + b.eenmalig / 12 - (a.perMaand + a.eenmalig / 12) || b.verstuurd - a.verstuurd);
}

export function perVorm(offertes: VerkoopOfferte[], sinds: string, nu = new Date()): Groep[] {
  return groepeer(offertes, sinds, nu, ({ vorm }) => ({ sleutel: vorm, label: VORMEN[vorm].kort, kleur: VORMEN[vorm].kleur }));
}

/** Per verkoper: de afzender op de offerte. */
export function perVerkoper(offertes: VerkoopOfferte[], sinds: string, nu = new Date()): Groep[] {
  return groepeer(offertes, sinds, nu, ({ o }) => {
    const naam = (o.afzender_naam || "").trim();
    return { sleutel: naam.toLowerCase() || "-", label: naam || "Zonder afzender", kleur: null };
  });
}
