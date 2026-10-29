/**
 * De prijslijst als bouwdoos voor offertes: elke regel van de tarievenpagina
 * (blok `dgTarieven` op /verzuimabonnementen) wordt een offerteregel met een
 * getal als prijs en een eenheid.
 *
 * De bron is de blokdata: in het beheer die uit de database (wat er live
 * staat), met `src/content/tarieven.json` als terugval. Zo hoeft de prijslijst
 * van een nieuw jaar alleen op de bekende plekken te veranderen (zie
 * CONTEXT.md, *Tarievenjaar*) en loopt de offertemodule vanzelf mee.
 */
import tarievenJson from "@/content/tarieven.json";
import { nieuwId, type Eenheid, type Regel, type Soort } from "./offertes";

export type CatalogusItem = Omit<Regel, "id">;
export type CatalogusGroep = { naam: string; label?: string; kleur?: string; items: CatalogusItem[] };

type Prijsregel = { naam?: string; prijs?: string; sub?: string };
type Lijst = { titel?: string; per?: string; text?: string; regels?: Prijsregel[] };
type Groep = { eyebrow?: string; heading?: string; kleur?: string; text?: string; links?: Lijst[]; rechts?: Lijst[] };
type Abonnement = { naam?: string; badge?: string; prijs?: string; per?: string; text?: string; points?: string[]; note?: string };
export type TarievenData = { abonnementen?: Abonnement[]; groepen?: Groep[] };

/** "€142,50" → 142.5, "€3.365" → 3365. Geen bedrag ("per uur", "op aanvraag", "6%") → null. */
export function parsePrijs(s: string | undefined): number | null {
  const m = (s || "").match(/€\s*([\d.]+(?:,\d{1,2})?)/);
  if (!m) return null;
  const n = Number(m[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** De eenheid uit de toelichting bij een regel ("Per maand", "3 sessies") of anders uit de kolom ("per uur"). */
export function eenheidUit(sub: string | undefined, per: string | undefined, prijs: string | undefined): Eenheid {
  const s = (sub || "").toLowerCase();
  const p = (per || "").toLowerCase();
  const t = (prijs || "").toLowerCase();
  if (/op (aanvraag|offerte)/.test(t)) return "op_aanvraag";
  if (/per uur|uurtarief/.test(t)) return "uur";
  if (/per (werknemer|medewerker) per jaar/.test(s)) return "medewerker_jaar";
  if (/per maand/.test(s)) return "maand";
  if (/^per uur/.test(s)) return "uur";
  if (/sessies|traject/.test(s)) return "traject";
  if (/^(per|vast)/.test(s)) return "stuk";
  if (/per (werknemer|medewerker) per jaar/.test(p)) return "medewerker_jaar";
  if (/per traject/.test(p)) return "traject";
  if (/per uur/.test(p) && !/per stuk/.test(p)) return "uur";
  if (/per (stuk|geval|periode)/.test(p) || /per stuk/.test(p)) return "stuk";
  return "eenmalig";
}

/** Wat een regel standaard is in een offerte: een abonnement kies je, een uur- of stuktarief geldt bij gebruik. */
function soortVoor(e: Eenheid): Soort {
  return e === "uur" || e === "stuk" || e === "op_aanvraag" ? "tarief" : "optie";
}

/** De prijslijst als groepen offerteregels, in de volgorde van de tarievenpagina. */
export function catalogusUit(data: TarievenData | null | undefined): CatalogusGroep[] {
  const uit: CatalogusGroep[] = [];
  const abonnementen = (data?.abonnementen || []).filter((a) => a.naam);
  if (abonnementen.length) {
    uit.push({
      naam: "Aansluiting",
      items: abonnementen.map((a) => {
        const prijs = parsePrijs(a.prijs);
        const item: CatalogusItem = {
          sectie: "Aansluiting",
          naam: a.naam!,
          prijs,
          eenheid: prijs === null ? "op_aanvraag" : eenheidUit(undefined, a.per, a.prijs),
          soort: "keuze",
          groep: "aansluiting",
        };
        const omschrijving = [a.text, a.note].filter(Boolean).join(" ");
        if (omschrijving) item.omschrijving = omschrijving;
        if (a.points?.length) item.punten = a.points.filter(Boolean);
        if (a.badge) item.badge = a.badge;
        return item;
      }),
    });
  }
  for (const g of data?.groepen || []) {
    const label = g.eyebrow && /^react2u /i.test(g.eyebrow) ? g.eyebrow : undefined;
    const sectie = label ? g.heading || g.eyebrow || "Onderdelen" : g.eyebrow || g.heading || "Onderdelen";
    const items: CatalogusItem[] = [];
    for (const lijst of [...(g.links || []), ...(g.rechts || [])]) {
      for (const r of lijst.regels || []) {
        if (!r.naam) continue;
        const eenheid = eenheidUit(r.sub, lijst.per, r.prijs);
        const prijs = parsePrijs(r.prijs);
        const procent = /\d\s*%/.test(r.prijs || "");
        const item: CatalogusItem = {
          sectie,
          naam: r.naam,
          prijs: procent ? null : prijs,
          eenheid: procent ? "op_aanvraag" : prijs === null && eenheid !== "uur" ? "op_aanvraag" : eenheid,
          soort: procent ? "tarief" : soortVoor(prijs === null && eenheid !== "uur" ? "op_aanvraag" : eenheid),
        };
        if (procent) item.prijsTekst = r.prijs!.trim();
        // "Per maand" onder "€389 per maand" zegt niets extra.
        const sub = r.sub && !/^per (maand|uur|(werknemer|medewerker) per jaar)$/i.test(r.sub.trim()) ? r.sub : "";
        if (sub) item.omschrijving = sub;
        if (label) item.label = label;
        if (g.kleur) item.kleur = g.kleur;
        items.push(item);
      }
    }
    if (items.length) uit.push({ naam: label ? `${label}: ${sectie}` : sectie, label, kleur: g.kleur, items });
  }
  return uit;
}

/** Uit de tarievenpagina van de repo, voor als de database niets geeft. */
export function catalogusStandaard(): CatalogusGroep[] {
  const blok = (tarievenJson as { blocks: { type: string; data: TarievenData }[] }).blocks.find((b) => b.type === "dgTarieven");
  return catalogusUit(blok?.data);
}

/** Een catalogusregel als nieuwe offerteregel, met een eigen id. */
export function alsRegel(item: CatalogusItem, extra?: Partial<Regel>): Regel {
  return { ...item, ...extra, id: nieuwId() };
}

function zoek(catalogus: CatalogusGroep[], naam: string): CatalogusItem | undefined {
  const n = naam.toLowerCase();
  for (const g of catalogus) {
    const hit = g.items.find((i) => i.naam.toLowerCase() === n) || g.items.find((i) => i.naam.toLowerCase().startsWith(n));
    if (hit) return hit;
  }
  return undefined;
}

/** De uurtarieven van de professionals en de vaste meldingen: de prijs bij gebruik, onder elke aansluiting. */
function tarievenBijGebruik(catalogus: CatalogusGroep[], ook: string[] = []): Regel[] {
  const namen = ["Casemanager", "Bedrijfsarts", "Ondersteuner bedrijfsarts", "Vertrouwenspersoon", "Verwerken ziek- en herstelmelding", "Melding UWV", "Probleemanalyse", ...ook];
  return namen
    .map((n) => zoek(catalogus, n))
    .filter((i): i is CatalogusItem => Boolean(i))
    .map((i) => alsRegel(i, { soort: "tarief", sectie: "Tarieven bij gebruik", label: undefined, kleur: undefined }));
}

export type Startpunt = { key: string; label: string; uitleg: string; regels: (c: CatalogusGroep[]) => Regel[] };

/** Snel beginnen: een offerte in één klik, daarna aan te passen. */
export const STARTPUNTEN: Startpunt[] = [
  {
    key: "keuze",
    label: "Klant kiest de aansluiting",
    uitleg: "Verrichtingenbasis of Casemanagement Compleet naast elkaar, met de tarieven bij gebruik.",
    regels: (c) => {
      const basis = zoek(c, "Verrichtingenbasis");
      const compleet = zoek(c, "Casemanagement Compleet");
      return [
        ...(basis ? [alsRegel(basis, { soort: "keuze", groep: "aansluiting", aan: true })] : []),
        ...(compleet ? [alsRegel(compleet, { soort: "keuze", groep: "aansluiting" })] : []),
        ...tarievenBijGebruik(c),
      ];
    },
  },
  {
    key: "basis",
    label: "Verrichtingenbasis",
    uitleg: "De aansluiting per medewerker per jaar, verrichtingen tegen de tarieven bij gebruik.",
    regels: (c) => {
      const basis = zoek(c, "Verrichtingenbasis");
      return [...(basis ? [alsRegel(basis, { soort: "vast", groep: undefined })] : []), ...tarievenBijGebruik(c)];
    },
  },
  {
    key: "compleet",
    label: "Casemanagement Compleet",
    uitleg: "Onbeperkt casemanagement; bedrijfsarts en specialisten tegen de tarieven bij gebruik.",
    regels: (c) => {
      const compleet = zoek(c, "Casemanagement Compleet");
      return [
        ...(compleet ? [alsRegel(compleet, { soort: "vast", groep: undefined })] : []),
        ...tarievenBijGebruik(c).filter((r) => !/^casemanager$/i.test(r.naam)),
      ];
    },
  },
];
