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
import { DIENSTLABEL, euro, nieuwId, type Eenheid, type Regel, type Soort, type Vorm } from "./offertes";

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

/* ---------- aanbevolen extra's: de upsell per traject ---------- */

/**
 * Per traject de diensten uit andere specialismen die de klant er zelf bij kan
 * aanklikken (Rens, 2 nov 2026: "de klant moet meer opties kunnen
 * aanklikken"). Alleen diensten met een vaste prijs op de prijslijst, zodat
 * het totaal kan meetellen; losse specialismen, geen pakketkorting. Elke
 * nieuwe offerte uit een standaardsjabloon krijgt ze als opties die uit staan;
 * sales kan er in de editor een weghalen.
 */
export const AANBEVOLEN: Record<Vorm, string[]> = {
  verzuimbegeleiding: ["Loopbaanscan", "Coaching", "Arbeidsdeskundig onderzoek", "Salarisadministratie, maandverloning"],
  reflex: ["Salarisadministratie, vierwekelijks", "Arbeidsdeskundig onderzoek", "Coaching"],
  rie: ["Verrichtingenbasis", "Coaching", "Loopbaanscan"],
  pago: ["Verrichtingenbasis", "Coaching", "Burn-outcoaching, 1-op-1"],
  verzuimtraining: ["Verrichtingenbasis", "Coaching", "Burn-outcoaching, 1-op-1"],
  spoor2: ["Arbeidsdeskundig onderzoek", "Coaching", "Burn-outcoaching, 1-op-1"],
  werkfit: ["Arbeidsdeskundig onderzoek", "Coaching", "Loopbaanscan"],
  arbeidsdeskundig: ["Spoor 2, eerste zes maanden", "Coaching", "Loopbaanscan"],
};

export const AANBEVOLEN_SECTIE = "Vaak gekozen erbij";

/** De aansluiting staat op de prijslijst zonder label; als extra hoort hij bij Recover, met een eigen korte uitleg. */
const AANSLUITING_ALS_EXTRA: Partial<Regel> = {
  label: "React2u Recover",
  kleur: "#E61674",
  omschrijving: "Je verzuimbegeleiding ook bij React2u: een vaste casemanager die je mensen kent, verrichtingen tegen de tarieven bij gebruik.",
};

/** Een korte uitleg voor extra's die op de prijslijst zonder toelichting staan. */
const UITLEG_EXTRA: Record<string, string> = {
  "arbeidsdeskundig onderzoek": "Duidelijkheid over passend werk, binnen of buiten je organisatie.",
  "salarisadministratie, maandverloning": "Elke maand op tijd, door mensen die verzuim kennen.",
  "spoor 2, eerste zes maanden": "Begeleiding naar werk buiten je organisatie, de eerste zes maanden.",
  "spoor 2, vervolg": "Als het tweede spoor na zes maanden doorloopt.",
};

/**
 * Diensten die je niet tegelijk afneemt: één aansluiting, één manier van
 * verlonen. Als optie in dezelfde groep staat er hooguit één aan (wissel in
 * lib/offertes.ts), of ze nu aanbevolen zijn of bij alle modules staan.
 */
const UITSLUITEND: Record<string, string[]> = {
  "Recover-aansluiting": ["Verrichtingenbasis", "Casemanagement Compleet", "Grotere organisaties"],
  "Reward-verloning": ["Salarisadministratie, maandverloning", "Salarisadministratie, vierwekelijks"],
};

function uitsluitGroep(naam: string): string | undefined {
  const n = naam.toLowerCase();
  return Object.keys(UITSLUITEND).find((g) => UITSLUITEND[g].some((x) => x.toLowerCase() === n));
}

/**
 * De aanbevolen extra's voor een vorm als opties die uit staan, zonder wat al
 * in de offerte staat (op naam). Een dienst die niet (meer) op de prijslijst
 * staat, valt weg.
 */
export function aanbevolenExtras(vorm: Vorm, catalogus: CatalogusGroep[], bestaand: Regel[] = []): Regel[] {
  const al = new Set(bestaand.map((r) => r.naam.toLowerCase()));
  const uit: Regel[] = [];
  for (const naam of AANBEVOLEN[vorm] || []) {
    if (al.has(naam.toLowerCase())) continue;
    const item = catalogus.flatMap((g) => g.items).find((i) => i.naam.toLowerCase() === naam.toLowerCase());
    if (!item || item.prijs === null) continue;
    const { punten: _punten, badge: _badge, groep: _groep, aan: _aan, ...rest } = item;
    void _punten; void _badge; void _groep; void _aan;
    const uitleg = !rest.omschrijving ? UITLEG_EXTRA[naam.toLowerCase()] : undefined;
    const groep = uitsluitGroep(item.naam);
    uit.push(alsRegel(rest, {
      ...(uitleg ? { omschrijving: uitleg } : {}),
      ...(item.soort === "keuze" ? AANSLUITING_ALS_EXTRA : {}),
      ...(groep ? { groep } : {}),
      sectie: AANBEVOLEN_SECTIE,
      soort: "optie",
      aanbevolen: true,
    }));
  }
  return uit;
}

/* ---------- alle modules: de hele prijslijst om zelf aan te zetten ---------- */

export const MODULES_SECTIE = "Alle modules";

/** De labels in de volgorde van de prijslijst; het label van de offerte zelf komt vooraan. */
export const MODULE_LABELS = ["React2u Recover", "React2u Resist", "React2u Restart", "React2u Reflex", "React2u Ready", "React2u Reward"];

/**
 * Wat een offerte van een vorm zelf al is: die dienst hoort niet nog eens
 * als module (de RI&E-offerte ís de RI&E). Wat op naam al in de offerte staat,
 * valt sowieso weg.
 */
const EIGEN_DIENST: Partial<Record<Vorm, string[]>> = {
  reflex: ["Casemanagement Reflex"],
  rie: ["Risico-inventarisatie en -evaluatie (RI&E)"],
  verzuimtraining: ["Training Verzuim en Preventie"],
  spoor2: ["Spoor 2, eerste zes maanden", "Spoor 2, vervolg"],
  arbeidsdeskundig: ["Arbeidsdeskundig onderzoek"],
};

/**
 * Een dienst van de prijslijst als module. De prijs bepaalt wat aanzetten
 * betekent:
 *  - een vaste prijs (eenmalig, per traject, per medewerker per jaar) telt
 *    mee in het totaal;
 *  - een tarief (per uur, per melding, per maand per dossier, een
 *    percentage) is "bij gebruik": aan = je neemt het af tegen dat tarief;
 *  - op aanvraag of op offerte: aan = je wilt een voorstel.
 * "Vast, plus 15% van de besparing" (Whk-check) is een vaste prijs per keer.
 */
function alsModule(item: CatalogusItem, label: string, kleur: string | undefined): Regel {
  const { punten: _punten, badge: _badge, groep: _groep, aan: _aan, ...rest } = item;
  void _punten; void _badge; void _groep; void _aan;
  const vastPerKeer = item.eenheid === "stuk" && /^vast\b/i.test(item.omschrijving || "");
  const eenheid: Eenheid = vastPerKeer ? "eenmalig" : item.eenheid;
  const bijGebruik = !vastPerKeer && (eenheid === "uur" || eenheid === "stuk" || eenheid === "maand" || Boolean(item.prijsTekst));
  const groep = uitsluitGroep(item.naam);
  // Een tarief zoals de prijslijst het zegt: "€20 per ziekmelding", niet "€20 per stuk".
  const segmenten = (item.omschrijving || "").split(/\s*[·,]\s*/);
  const per = segmenten.find((x) => /^per\s/i.test(x));
  const prijsTekst = bijGebruik && item.prijs !== null && per ? `${euro(item.prijs)} ${per.toLowerCase()}` : undefined;
  const alleenPer = per !== undefined && segmenten.length === 1;
  const uitleg = UITLEG_EXTRA[item.naam.toLowerCase()];
  return alsRegel(rest, {
    ...(item.soort === "keuze" && /^verrichtingenbasis$/i.test(item.naam) ? { omschrijving: AANSLUITING_ALS_EXTRA.omschrijving } : {}),
    ...(prijsTekst ? { prijsTekst } : {}),
    ...(prijsTekst && alleenPer ? { omschrijving: undefined } : {}),
    ...(!item.omschrijving && uitleg ? { omschrijving: uitleg } : {}),
    label,
    ...(kleur ? { kleur } : {}),
    eenheid,
    sectie: MODULES_SECTIE,
    soort: "optie",
    module: true,
    ...(bijGebruik ? { bijGebruik: true } : {}),
    ...(groep ? { groep } : {}),
  });
}

/**
 * Alle diensten van de prijslijst als modules die uit staan, per label: de
 * klant zet zelf aan wat hij wil (Rens, 2 nov 2026). De aansluitingen horen
 * bij Recover; de losse verrichtingen van Recover en de uurtarieven van de
 * professionals niet, want die gelden al onder een aansluiting (tarieven bij
 * gebruik). Zonder wat al in de offerte staat (op naam) en zonder de dienst
 * die de offerte zelf is. Het label van de vorm komt vooraan.
 */
export function alleModules(vorm: Vorm, catalogus: CatalogusGroep[], bestaand: Regel[] = []): Regel[] {
  const al = new Set(bestaand.filter((r) => !r.module).map((r) => r.naam.toLowerCase()));
  for (const n of EIGEN_DIENST[vorm] || []) al.add(n.toLowerCase());
  const recover = catalogus.find((g) => g.label === "React2u Recover");
  const perLabel = new Map<string, Regel[]>();
  const voegToe = (label: string, kleur: string | undefined, items: CatalogusItem[]) => {
    for (const item of items) {
      if (al.has(item.naam.toLowerCase())) continue;
      al.add(item.naam.toLowerCase());
      perLabel.set(label, [...(perLabel.get(label) || []), alsModule(item, label, kleur)]);
    }
  };
  // Hoort één aansluiting al in de offerte (verzuimbegeleiding), dan alle drie niet.
  const aansluitingen = catalogus.find((g) => g.naam === "Aansluiting")?.items || [];
  if (!aansluitingen.some((i) => al.has(i.naam.toLowerCase()))) voegToe("React2u Recover", recover?.kleur || AANSLUITING_ALS_EXTRA.kleur, aansluitingen);
  for (const g of catalogus) {
    if (!g.label || g.label === "React2u Recover") continue;
    voegToe(g.label, g.kleur, g.items);
  }
  const eigen = DIENSTLABEL[vorm];
  const volgorde = [eigen, ...MODULE_LABELS.filter((l) => l !== eigen), ...[...perLabel.keys()].filter((l) => !MODULE_LABELS.includes(l))];
  return volgorde.flatMap((l) => perLabel.get(l) || []);
}

/**
 * De modules van een offerte vernieuwen: na een andere vorm of nieuwe
 * onderdelen. Wat er al stond, houdt zijn id (en dus een keuze van de klant)
 * en of hij standaard aan staat; een module die nu als gewoon onderdeel in de
 * offerte staat, valt weg.
 */
export function vernieuwModules(vorm: Vorm, catalogus: CatalogusGroep[], regels: Regel[]): Regel[] {
  const gewoon = regels.filter((r) => !r.module);
  const oud = new Map(regels.filter((r) => r.module).map((r) => [r.naam.toLowerCase(), r]));
  const nieuw = alleModules(vorm, catalogus, gewoon).map((r) => {
    const was = oud.get(r.naam.toLowerCase());
    return was ? { ...r, id: was.id, ...(was.aan ? { aan: true } : {}) } : r;
  });
  return [...gewoon, ...nieuw];
}

/** Modules die op naam ook als gewoon onderdeel in de offerte staan, eruit; de modules achteraan. */
export function ruimModulesOp(regels: Regel[]): Regel[] {
  const gewoon = regels.filter((r) => !r.module);
  const namen = new Set(gewoon.map((r) => r.naam.toLowerCase()));
  return [...gewoon, ...regels.filter((r) => r.module && !namen.has(r.naam.toLowerCase()))];
}

