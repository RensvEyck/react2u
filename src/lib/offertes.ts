/**
 * Offertes (migratie 0024): de vorm van een offerte en alle rekenregels.
 *
 * Een offerte is een lijst regels. Elke regel heeft een prijs, een eenheid en
 * een soort:
 *  - vast    zit er altijd in;
 *  - optie   de klant zet hem aan of uit (`aan` = standaard aan);
 *  - keuze   de klant kiest precies één regel uit zijn `groep`, bijvoorbeeld
 *            Verrichtingenbasis óf Casemanagement Compleet;
 *  - tarief  geen bedrag in de offerte maar een prijs bij gebruik (uurtarief,
 *            per melding). Telt nooit mee in het totaal.
 *
 * Puur, zonder database: dezelfde functies rekenen in het beheer, op de
 * klantpagina en in de mails. De database controleert de keuze zelf ook
 * (`offerte_effectieve_keuze` in 0024); `geldigeKeuze` hieronder doet precies
 * hetzelfde en de tests houden die twee gelijk.
 */

export type Eenheid =
  | "medewerker_jaar" | "jaar" | "maand" | "eenmalig" | "medewerker" | "traject" | "uur" | "stuk" | "op_aanvraag";

export type Soort = "vast" | "optie" | "keuze" | "tarief";

type Periode = "jaar" | "eenmalig";

export const EENHEDEN: { key: Eenheid; label: string; achter: string; periode: Periode | null }[] = [
  { key: "medewerker_jaar", label: "Per medewerker per jaar", achter: "per medewerker per jaar", periode: "jaar" },
  { key: "jaar", label: "Per jaar", achter: "per jaar", periode: "jaar" },
  { key: "maand", label: "Per maand", achter: "per maand", periode: "jaar" },
  { key: "eenmalig", label: "Eenmalig", achter: "eenmalig", periode: "eenmalig" },
  { key: "medewerker", label: "Per medewerker, eenmalig", achter: "per medewerker", periode: "eenmalig" },
  { key: "traject", label: "Per traject", achter: "per traject", periode: "eenmalig" },
  { key: "uur", label: "Per uur", achter: "per uur", periode: "eenmalig" },
  { key: "stuk", label: "Per stuk", achter: "per stuk", periode: "eenmalig" },
  { key: "op_aanvraag", label: "Op aanvraag", achter: "", periode: null },
];

export const SOORTEN: { key: Soort; label: string; uitleg: string }[] = [
  { key: "vast", label: "Vast onderdeel", uitleg: "Zit er altijd in" },
  { key: "optie", label: "Optie", uitleg: "De klant zet hem aan of uit" },
  { key: "keuze", label: "Keuze uit een groep", uitleg: "De klant kiest er één uit de groep" },
  { key: "tarief", label: "Tarief bij gebruik", uitleg: "Prijs per uur of per keer, telt niet mee in het totaal" },
];

export type Regel = {
  id: string;
  /** Kop waaronder de regel op de pagina staat, bijvoorbeeld "Aansluiting" of "Verzuimbegeleiding". */
  sectie: string;
  /** Label uit de prijslijst boven de kop, bijvoorbeeld "React2u Recover". */
  label?: string;
  /** Kleur van dat label (#rrggbb), zoals op de tarievenpagina. */
  kleur?: string;
  naam: string;
  omschrijving?: string;
  /** Wat erbij hoort, als vinkjes onder een keuze (zoals op de tarievenpagina). */
  punten?: string[];
  /** Klein label naast de naam, bijvoorbeeld "Meest gekozen". */
  badge?: string;
  /** Prijs in euro's, exclusief btw. Null = op aanvraag. */
  prijs: number | null;
  /** Tekst in plaats van een bedrag als er geen prijs is, bijvoorbeeld "6%". */
  prijsTekst?: string;
  eenheid: Eenheid;
  /** Hoeveel. Leeg: het aantal medewerkers bij "per medewerker per jaar", anders 1. */
  aantal?: number | null;
  soort: Soort;
  /** Bij soort "keuze": de groep waaruit de klant er één kiest. */
  groep?: string;
  /** Bij "optie": standaard aan. Bij "keuze": de voorgeselecteerde in zijn groep. */
  aan?: boolean;
};

export type OfferteStatus = "concept" | "verstuurd" | "getekend" | "afgewezen" | "ingetrokken";

/** De zeven offertevormen (migratie 0025). Elke vorm heeft standaardsjablonen in lib/offerteSjablonen.ts. */
export type Vorm = "verzuimbegeleiding" | "rie" | "pago" | "verzuimtraining" | "spoor2" | "werkfit" | "arbeidsdeskundig";

export const VORMEN: Record<Vorm, { label: string; kort: string; groep: "Verzuim" | "Preventie" | "Re-integratie"; kleur: string; betreft?: string; betreftHint?: string }> = {
  verzuimbegeleiding: { label: "Verzuimbegeleiding", kort: "Verzuim", groep: "Verzuim", kleur: "#E61674" },
  rie: { label: "Risico-inventarisatie en -evaluatie (RI&E)", kort: "RI&E", groep: "Preventie", kleur: "#00A098", betreft: "Locatie", betreftHint: "Bijvoorbeeld de vestiging in Eindhoven" },
  pago: { label: "Periodiek arbeidsgezondheidskundig onderzoek (PAGO)", kort: "PAGO", groep: "Preventie", kleur: "#00A098" },
  verzuimtraining: { label: "Verzuimtraining voor leidinggevenden", kort: "Training", groep: "Preventie", kleur: "#00A098", betreft: "Deelnemers", betreftHint: "Bijvoorbeeld 12 leidinggevenden" },
  spoor2: { label: "Re-integratietraject 2e spoor", kort: "Spoor 2", groep: "Re-integratie", kleur: "#F19001", betreft: "Werknemer", betreftHint: "Initialen of naam; geen medische informatie" },
  werkfit: { label: "Werkfittraject", kort: "Werkfit", groep: "Re-integratie", kleur: "#F19001", betreft: "Werknemer", betreftHint: "Initialen of naam; geen medische informatie" },
  arbeidsdeskundig: { label: "Arbeidsdeskundig onderzoek", kort: "AD-onderzoek", groep: "Re-integratie", kleur: "#F19001", betreft: "Werknemer", betreftHint: "Initialen of naam; geen medische informatie" },
};

export const VORM_KEYS = Object.keys(VORMEN) as Vorm[];

/**
 * Het mailadres dat de klant ziet en waar hij op antwoordt: de salesbox, niet
 * de mail van de collega die de offerte maakt (Rens, 29 okt 2026). Standaard
 * bij elke nieuwe offerte en de terugval als een offerte geen adres heeft.
 */
export const OFFERTE_EMAIL = "sales@react2u.nl";

/** Het label van React2u waar de vorm onder valt, in de kleur van de tarievenpagina. */
export const DIENSTLABEL: Record<Vorm, string> = {
  verzuimbegeleiding: "React2u Recover",
  rie: "React2u Resist",
  pago: "React2u Resist",
  verzuimtraining: "React2u Resist",
  spoor2: "React2u Restart",
  werkfit: "React2u Restart",
  arbeidsdeskundig: "React2u Restart",
};

export function isVorm(v: unknown): v is Vorm {
  return typeof v === "string" && (VORM_KEYS as string[]).includes(v);
}

/** Een stap onder "Zo gaat het verder". */
export type Stap = { kop: string; tekst: string };

/** Een rij uit `offertes`, zoals het beheer hem leest. */
export type Offerte = {
  id: string;
  nummer: string;
  token: string;
  status: OfferteStatus;
  vorm: Vorm;
  bedrijf: string;
  contactpersoon: string | null;
  email: string | null;
  telefoon: string | null;
  medewerkers: number | null;
  titel: string;
  /** Waar het om gaat: de werknemer bij een traject, de locatie bij een RI&E. */
  betreft: string | null;
  intro: string | null;
  /** De uitleg van de dienst, in de opmaak van OfferteTekst (## kop, - lijst, …). */
  inhoud: string | null;
  voorwaarden: string | null;
  vervolg: Stap[] | null;
  regels: Regel[];
  geldig_tot: string | null;
  afzender_naam: string | null;
  afzender_functie: string | null;
  afzender_email: string | null;
  afzender_telefoon: string | null;
  notitie: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  verstuurd_at: string | null;
  bekeken_at: string | null;
  laatst_bekeken_at: string | null;
  aantal_bekeken: number;
  keuze: string[] | null;
  keuze_at: string | null;
  getekend_at: string | null;
  getekend_naam: string | null;
  getekend_functie: string | null;
  getekend_email: string | null;
  handtekening: string | null;
  getekend_ip: string | null;
  getekend_agent: string | null;
  getekend_inhoud: GetekendeInhoud | null;
  getekend_hash: string | null;
  afgewezen_at: string | null;
  afgewezen_reden: string | null;
  /** Vooraf door sales, bij het tekenen aangevuld door de klant (0026). */
  factuur: Partial<Factuur> | null;
};

/** Factuurgegevens (0026). E-mail, adres, postcode en plaats zijn nodig om te factureren. */
export type Factuur = {
  email: string;
  adres: string;
  postcode: string;
  plaats: string;
  kvk?: string;
  inkoopnummer?: string;
  tav?: string;
};

/** Hoe het e-mailadres van wie tekende is bevestigd (0026). */
export type Bevestiging = { methode: "e-mailcode"; email: string; verstuurd_at: string; bevestigd_at: string };

/** Wat er bij ondertekening is vastgelegd (`getekend_inhoud`), los van latere wijzigingen. */
export type GetekendeInhoud = {
  nummer: string;
  vorm?: Vorm;
  bedrijf: string;
  contactpersoon: string | null;
  medewerkers: number | null;
  titel: string;
  betreft?: string | null;
  intro: string | null;
  inhoud?: string | null;
  voorwaarden?: string | null;
  vervolg?: Stap[] | null;
  afzender_naam?: string | null;
  afzender_functie?: string | null;
  afzender_email?: string | null;
  verstuurd_at?: string | null;
  regels: Regel[];
  keuze: string[];
  geldig_tot: string | null;
  getekend_naam: string;
  getekend_functie: string | null;
  getekend_email: string;
  getekend_at: string;
  /** Vanaf 0026: de factuurgegevens, de hash van de handtekening en de bevestiging met een code. */
  factuur?: Factuur | null;
  handtekening_hash?: string;
  bevestiging?: Bevestiging;
};

/** Wat de klantpagina krijgt (`offerte_bekijken` in 0024): geen notitie, IP of wie hem maakte. */
export type OffertePubliek = Pick<
  Offerte,
  | "id" | "nummer" | "status" | "vorm" | "bedrijf" | "contactpersoon" | "email" | "medewerkers" | "titel" | "betreft" | "intro"
  | "inhoud" | "voorwaarden" | "vervolg" | "regels"
  | "geldig_tot" | "afzender_naam" | "afzender_functie" | "afzender_email" | "afzender_telefoon" | "verstuurd_at"
  | "keuze" | "getekend_at" | "getekend_naam" | "getekend_functie" | "getekend_email" | "handtekening"
  | "getekend_inhoud" | "getekend_hash" | "afgewezen_at"
> & { verlopen: boolean; eerste_keer?: boolean; factuur?: Partial<Factuur> | null };

export type Gebeurtenis = {
  id: number;
  offerte_id: string;
  soort: "aangemaakt" | "gewijzigd" | "verstuurd" | "herinnering" | "bekeken" | "code" | "getekend" | "afgewezen" | "ingetrokken" | "heropend";
  door: string | null;
  details: Record<string, unknown> | null;
  at: string;
};

/* ---------- invoer schoonmaken ---------- */

const EENHEID_KEYS = EENHEDEN.map((e) => e.key);
const SOORT_KEYS = SOORTEN.map((s) => s.key);

/** Korte willekeurige id voor een regel: uniek binnen één offerte is genoeg. */
export function nieuwId(): string {
  const tekens = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => tekens[b % tekens.length]).join("");
}

const tekst = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const lang = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function getal(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string" || !v.trim()) return null;
  const n = Number(v.trim().replace(/\s|€/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const KLEUR = /^#[0-9a-fA-F]{6}$/;

/**
 * Regels uit een formulier of de database terug in vorm: onbekende soorten en
 * eenheden vallen terug op een veilige waarde, teksten worden ingekort, ids
 * zijn uniek. Alles wat de server opslaat, gaat hierdoorheen.
 */
export function normaliseerRegels(input: unknown): Regel[] {
  if (!Array.isArray(input)) return [];
  const gezien = new Set<string>();
  const uit: Regel[] = [];
  for (const ruw of input.slice(0, 200)) {
    if (!ruw || typeof ruw !== "object") continue;
    const r = ruw as Record<string, unknown>;
    const naam = tekst(r.naam, 200);
    if (!naam) continue;
    let id = tekst(r.id, 40).replace(/[^a-zA-Z0-9_-]/g, "");
    if (!id || gezien.has(id)) id = nieuwId();
    gezien.add(id);
    const eenheid = (EENHEID_KEYS as string[]).includes(String(r.eenheid)) ? (r.eenheid as Eenheid) : "eenmalig";
    const soort = (SOORT_KEYS as string[]).includes(String(r.soort)) ? (r.soort as Soort) : "vast";
    const prijsRuw = getal(r.prijs);
    const prijs = eenheid === "op_aanvraag" || prijsRuw === null ? null : Math.round(Math.max(0, prijsRuw) * 100) / 100;
    const aantalRuw = getal(r.aantal);
    const regel: Regel = {
      id,
      sectie: tekst(r.sectie, 120) || "Onderdelen",
      naam,
      prijs,
      eenheid: prijs === null && eenheid !== "uur" && eenheid !== "stuk" ? "op_aanvraag" : eenheid,
      soort,
    };
    const label = tekst(r.label, 80);
    if (label) regel.label = label;
    if (typeof r.kleur === "string" && KLEUR.test(r.kleur)) regel.kleur = r.kleur;
    const omschrijving = lang(r.omschrijving, 1000);
    if (omschrijving) regel.omschrijving = omschrijving;
    const prijsTekst = tekst(r.prijsTekst, 60);
    if (prijsTekst && prijs === null) regel.prijsTekst = prijsTekst;
    const badge = tekst(r.badge, 40);
    if (badge) regel.badge = badge;
    if (Array.isArray(r.punten)) {
      const punten = r.punten.map((p) => tekst(p, 200)).filter(Boolean).slice(0, 12);
      if (punten.length) regel.punten = punten;
    }
    if (aantalRuw !== null && aantalRuw > 0) regel.aantal = Math.round(aantalRuw * 100) / 100;
    if (soort === "keuze") regel.groep = tekst(r.groep, 60) || "keuze";
    if ((soort === "optie" || soort === "keuze") && r.aan === true) regel.aan = true;
    uit.push(regel);
  }
  return uit;
}

/* ---------- de keuze van de klant ---------- */

function groepen(regels: Regel[]): Map<string, Regel[]> {
  const m = new Map<string, Regel[]>();
  for (const r of regels) {
    if (r.soort !== "keuze") continue;
    const g = r.groep || "keuze";
    m.set(g, [...(m.get(g) || []), r]);
  }
  return m;
}

/** Wat er klaarstaat als de klant de pagina opent: opties die aan staan en per groep de voorgeselecteerde (of de eerste). */
export function standaardKeuze(regels: Regel[]): string[] {
  const uit = regels.filter((r) => r.soort === "optie" && r.aan).map((r) => r.id);
  for (const lijst of groepen(regels).values()) uit.push((lijst.find((r) => r.aan) || lijst[0]).id);
  return uit;
}

/**
 * Zoals `offerte_effectieve_keuze` in de database: de ids van alle regels die
 * meedoen (vast altijd, opties en keuzes als ze gekozen zijn), in de volgorde
 * van de offerte. Null als er in een groep niet precies één gekozen is.
 */
export function geldigeKeuze(regels: Regel[], keuze: readonly string[]): string[] | null {
  const k = new Set(keuze);
  for (const lijst of groepen(regels).values()) {
    if (lijst.filter((r) => k.has(r.id)).length !== 1) return null;
  }
  return regels
    .filter((r) => r.soort === "vast" || ((r.soort === "optie" || r.soort === "keuze") && k.has(r.id)))
    .map((r) => r.id);
}

/**
 * Een opgeslagen keuze bruikbaar maken voor het scherm: onbekende ids weg, per
 * groep precies één (anders de standaard). Zo kan een offerte na een wijziging
 * in het beheer gewoon verder met wat de klant al had aangeklikt.
 */
export function herstelKeuze(regels: Regel[], keuze: unknown): string[] {
  if (!Array.isArray(keuze)) return standaardKeuze(regels);
  const ids = new Set(regels.map((r) => r.id));
  const k = new Set(keuze.filter((x): x is string => typeof x === "string" && ids.has(x)));
  const uit = regels.filter((r) => r.soort === "optie" && k.has(r.id)).map((r) => r.id);
  for (const lijst of groepen(regels).values()) {
    const gekozen = lijst.filter((r) => k.has(r.id));
    uit.push((gekozen.length === 1 ? gekozen[0] : lijst.find((r) => r.aan) || lijst[0]).id);
  }
  return uit;
}

/** Klikken op een regel: een optie gaat aan of uit, een keuze wordt de enige in zijn groep. Vast en tarief doen niets. */
export function wissel(regels: Regel[], keuze: readonly string[], id: string): string[] {
  const r = regels.find((x) => x.id === id);
  if (!r) return [...keuze];
  if (r.soort === "optie") return keuze.includes(id) ? keuze.filter((x) => x !== id) : [...keuze, id];
  if (r.soort === "keuze") {
    const groep = new Set(regels.filter((x) => x.soort === "keuze" && (x.groep || "keuze") === (r.groep || "keuze")).map((x) => x.id));
    return [...keuze.filter((x) => !groep.has(x)), id];
  }
  return [...keuze];
}

/* ---------- rekenen ---------- */

export function eenheidVan(e: Eenheid) {
  return EENHEDEN.find((x) => x.key === e) || EENHEDEN[3];
}

/** Het aantal waarmee gerekend wordt: bij "per medewerker" (per jaar of eenmalig) zonder eigen aantal het aantal medewerkers. */
export function aantalVoor(r: Regel, medewerkers: number | null | undefined): number {
  if (r.aantal && r.aantal > 0) return r.aantal;
  if (r.eenheid === "medewerker_jaar" || r.eenheid === "medewerker") return medewerkers && medewerkers > 0 ? medewerkers : 1;
  return 1;
}

/** Het bedrag van één regel en waar het bij hoort (per jaar of eenmalig). Null voor tarieven en op aanvraag. */
export function bedragVoor(r: Regel, medewerkers: number | null | undefined): { bedrag: number; periode: Periode } | null {
  if (r.soort === "tarief" || r.prijs === null) return null;
  const periode = eenheidVan(r.eenheid).periode;
  if (!periode) return null;
  const factor = r.eenheid === "maand" ? 12 : 1;
  return { bedrag: Math.round(r.prijs * aantalVoor(r, medewerkers) * factor * 100) / 100, periode };
}

export type Totalen = {
  perJaar: number;
  /** Het jaarbedrag per maand: zo staat de prijs op de offerte (Rens, 29 okt 2026). */
  perMaand: number;
  eenmalig: number;
  /** De regels die meedoen, met hun bedrag (null = op aanvraag). */
  regels: { regel: Regel; bedrag: number | null; periode: Periode | null }[];
};

/** Het totaal bij deze keuze. `gekozen` mag de vaste regels wel of niet bevatten; die doen altijd mee. */
export function berekenTotalen(regels: Regel[], gekozen: readonly string[], medewerkers: number | null | undefined): Totalen {
  const k = new Set(gekozen);
  const uit: Totalen = { perJaar: 0, perMaand: 0, eenmalig: 0, regels: [] };
  for (const r of regels) {
    if (r.soort === "tarief") continue;
    if (r.soort !== "vast" && !k.has(r.id)) continue;
    const b = bedragVoor(r, medewerkers);
    uit.regels.push({ regel: r, bedrag: b?.bedrag ?? null, periode: b?.periode ?? null });
    if (b?.periode === "jaar") uit.perJaar += b.bedrag;
    if (b?.periode === "eenmalig") uit.eenmalig += b.bedrag;
  }
  uit.perJaar = Math.round(uit.perJaar * 100) / 100;
  uit.perMaand = Math.round((uit.perJaar / 12) * 100) / 100;
  uit.eenmalig = Math.round(uit.eenmalig * 100) / 100;
  return uit;
}

/** De waarde van een offerte voor het overzicht: wat er getekend is, of anders de standaardkeuze. */
export function waardeVan(o: Pick<Offerte, "regels" | "keuze" | "medewerkers" | "status">): Totalen {
  const regels = normaliseerRegels(o.regels);
  const keuze = o.status === "getekend" && o.keuze ? o.keuze : herstelKeuze(regels, o.keuze);
  return berekenTotalen(regels, keuze, o.medewerkers);
}

/* ---------- opmaak ---------- */

const HEEL = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });
const CENTEN = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "€38,50", "€240", "€3.365": de notatie van de tarievenpagina, centen alleen als die er zijn. */
export function euro(bedrag: number): string {
  const rond = Math.round(bedrag * 100) / 100;
  return `€${Number.isInteger(rond) ? HEEL.format(rond) : CENTEN.format(rond)}`;
}

/** "€38,50 per medewerker per jaar", "€240 per uur", "Op aanvraag". */
export function prijsLabel(r: Pick<Regel, "prijs" | "eenheid"> & { prijsTekst?: string }): string {
  if (r.prijs === null && r.prijsTekst) return r.prijsTekst;
  if (r.prijs === null && r.eenheid === "uur") return "Uurtarief";
  if (r.prijs === null || r.eenheid === "op_aanvraag") return "Op aanvraag";
  if (r.prijs === 0) return "Inbegrepen";
  const achter = eenheidVan(r.eenheid).achter;
  return achter ? `${euro(r.prijs)} ${achter}` : euro(r.prijs);
}

/**
 * De prijs van een regel zoals de klant hem ziet: wat per jaar loopt, per
 * maand. "€38,50 per medewerker per jaar" wordt "€3,21 per medewerker per
 * maand". Eenmalige prijzen en tarieven blijven zoals ze zijn. `jaar` is de
 * prijs zoals hij op de prijslijst staat, voor de kleine regel eronder.
 */
export function maandprijs(r: Pick<Regel, "prijs" | "eenheid"> & { prijsTekst?: string }): { bedrag: number | null; achter: string; tekst: string; jaar: string | null } {
  if (r.prijs !== null && r.prijs > 0 && (r.eenheid === "medewerker_jaar" || r.eenheid === "jaar")) {
    const bedrag = Math.round((r.prijs / 12) * 100) / 100;
    const achter = r.eenheid === "medewerker_jaar" ? "per medewerker per maand" : "per maand";
    return { bedrag, achter, tekst: `${euro(bedrag)} ${achter}`, jaar: prijsLabel(r) };
  }
  const tekst = prijsLabel(r);
  return { bedrag: r.prijs, achter: r.prijs === null || r.prijs === 0 ? "" : eenheidVan(r.eenheid).achter, tekst, jaar: null };
}

/** Het bedrag van een regel in de keuze: per maand als het doorloopt, anders eenmalig. */
export function regelbedrag(b: { bedrag: number | null; periode: "jaar" | "eenmalig" | null }): { bedrag: number | null; per: "maand" | "eenmalig" | null } {
  if (b.bedrag === null || b.periode === null) return { bedrag: b.bedrag, per: null };
  if (b.periode === "jaar") return { bedrag: Math.round((b.bedrag / 12) * 100) / 100, per: "maand" };
  return { bedrag: b.bedrag, per: "eenmalig" };
}

/**
 * De regels per kop, in de volgorde waarin de koppen voor het eerst voorkomen.
 * Een kop met alleen tarieven bij gebruik komt achteraan: eerst wat de klant
 * afneemt, dan wat het kost als hij er gebruik van maakt.
 */
export function secties(regels: Regel[]): { naam: string; label?: string; kleur?: string; regels: Regel[] }[] {
  const uit: { naam: string; label?: string; kleur?: string; regels: Regel[] }[] = [];
  for (const r of regels) {
    let s = uit.find((x) => x.naam === r.sectie);
    if (!s) {
      s = { naam: r.sectie, regels: [] };
      uit.push(s);
    }
    if (!s.label && r.label) s.label = r.label;
    if (!s.kleur && r.kleur) s.kleur = r.kleur;
    s.regels.push(r);
  }
  const alleenTarief = (s: (typeof uit)[number]) => s.regels.every((r) => r.soort === "tarief");
  return [...uit.filter((s) => !alleenTarief(s)), ...uit.filter(alleenTarief)];
}

const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

/** "2026-11-28" → "28 november 2026". Ook een volledige tijdstempel mag; dan telt de dag in Nederland. */
export function datumLang(iso: string | null | undefined): string {
  if (!iso) return "";
  const dag = iso.length === 10 ? iso : new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  const [j, m, d] = dag.split("-").map(Number);
  if (!j || !m || !d) return "";
  return `${d} ${MAANDEN[m - 1]} ${j}`;
}

/** "28 november 2026 om 14.05 uur", in Nederlandse tijd. */
export function momentLang(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).toLocaleTimeString("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit" }).replace(":", ".");
  return `${datumLang(iso)} om ${t} uur`;
}

/** "29 oktober 2026, 14:03:27": tot op de seconde, in Nederlandse tijd. Voor het ondertekeningscertificaat. */
export function momentPrecies(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).toLocaleTimeString("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return `${datumLang(iso)}, ${t}`;
}

/** Vandaag + `dagen` als datum (jjjj-mm-dd), in Nederlandse tijd. Standaard voor "geldig tot". */
export function datumOver(dagen: number, nu = new Date()): string {
  return new Date(nu.getTime() + dagen * 86_400_000).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

/* ---------- status ---------- */

/** Wat het beheer toont: naast de status in de database ook "bekeken" en "verlopen". */
export type Weergave = OfferteStatus | "bekeken" | "verlopen";

export function weergaveVan(
  o: Pick<Offerte, "status" | "bekeken_at" | "geldig_tot">,
  vandaag = datumOver(0),
): Weergave {
  if (o.status === "verstuurd") {
    if (o.geldig_tot && o.geldig_tot < vandaag) return "verlopen";
    return o.bekeken_at ? "bekeken" : "verstuurd";
  }
  return o.status;
}

export const WEERGAVE: Record<Weergave, { label: string; kleur: string; achter: string }> = {
  concept: { label: "Concept", kleur: "#6b6a85", achter: "rgba(13,13,40,0.05)" },
  verstuurd: { label: "Verstuurd", kleur: "#312e82", achter: "#eef0ff" },
  bekeken: { label: "Bekeken", kleur: "#0b6bcb", achter: "#e6f2ff" },
  getekend: { label: "Getekend", kleur: "#0a7a4b", achter: "#e3f6ed" },
  afgewezen: { label: "Niet akkoord", kleur: "#b42318", achter: "#fdecea" },
  ingetrokken: { label: "Ingetrokken", kleur: "#6b6a85", achter: "rgba(13,13,40,0.05)" },
  verlopen: { label: "Verlopen", kleur: "#b25e09", achter: "#fff4e5" },
};

/** Meldingen bij een mislukte ondertekening; de codes komen uit `offerte_ondertekenen` (0024). */
export const ONDERTEKEN_FOUT: Record<string, string> = {
  onbekend: "Deze offerte is niet (meer) beschikbaar. Neem contact met ons op.",
  "al-getekend": "Deze offerte is al ondertekend.",
  afgewezen: "Je hebt aangegeven niet akkoord te gaan. Wil je toch verder? Neem dan even contact met ons op.",
  verlopen: "Deze offerte is verlopen. Neem contact met ons op voor een nieuwe.",
  naam: "Vul je volledige naam in.",
  functie: "Je functie is te lang.",
  email: "Vul een geldig e-mailadres in.",
  handtekening: "Zet je handtekening in het vak, of typ je naam.",
  keuze: "Maak in elke groep een keuze.",
  leeg: "Deze offerte heeft nog geen inhoud. Neem contact met ons op.",
  limiet: "Er ging iets te vaak achter elkaar mis. Probeer het over een uur opnieuw, of bel ons.",
  akkoord: "Vink aan dat je akkoord gaat en bevoegd bent om te tekenen.",
  storing: "Ondertekenen lukte niet door een storing. Probeer het opnieuw, of bel ons.",
  // De bevestigingscode en de factuurgegevens (0026).
  code: "Deze code klopt niet. Kijk nog eens in de mail, of vraag een nieuwe code aan.",
  "code-nieuw": "Vraag eerst een code aan.",
  "code-verlopen": "Deze code is verlopen. Vraag een nieuwe code aan.",
  "code-pogingen": "Te vaak een verkeerde code. Vraag een nieuwe code aan.",
  "code-email": "De code is naar een ander e-mailadres gestuurd. Vraag een nieuwe code aan.",
  "code-limiet": "Er zijn het afgelopen uur al vijf codes gestuurd. Probeer het later opnieuw, of bel ons.",
  mail: "We konden de code niet mailen. Controleer je e-mailadres, of bel ons.",
  factuur: "Controleer de factuurgegevens.",
  "factuur-email": "Vul een geldig e-mailadres in voor de facturen.",
  "factuur-adres": "Vul het factuuradres in: straat en huisnummer, postcode en plaats.",
  "factuur-kvk": "Een KvK-nummer heeft 8 cijfers.",
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Factuurgegevens uit een formulier of de database terug in vorm: alleen de bekende velden, schoon. */
export function normaliseerFactuur(input: unknown): Partial<Factuur> {
  if (!input || typeof input !== "object") return {};
  const f = input as Record<string, unknown>;
  const uit: Partial<Factuur> = {
    email: tekst(f.email, 254).toLowerCase(),
    adres: tekst(f.adres, 200),
    postcode: tekst(f.postcode, 12).toUpperCase(),
    plaats: tekst(f.plaats, 100),
    kvk: tekst(f.kvk, 20).replace(/\s/g, ""),
    inkoopnummer: tekst(f.inkoopnummer, 60),
    tav: tekst(f.tav, 120),
  };
  for (const k of Object.keys(uit) as (keyof Factuur)[]) if (!uit[k]) delete uit[k];
  return uit;
}

/**
 * Wat er nog niet klopt aan de factuurgegevens, als foutcode uit
 * ONDERTEKEN_FOUT (dezelfde controle als offerte_ondertekenen in 0026), of null.
 */
export function factuurFout(f: Partial<Factuur>): "factuur-email" | "factuur-adres" | "factuur-kvk" | null {
  if (!f.email || !EMAIL.test(f.email)) return "factuur-email";
  if (!f.adres || f.adres.length < 3 || !f.postcode || f.postcode.length < 4 || !f.plaats || f.plaats.length < 2) return "factuur-adres";
  if (f.kvk && !/^\d{8}$/.test(f.kvk)) return "factuur-kvk";
  return null;
}

/** De factuurgegevens als regels voor een adresblok of mail. */
export function factuurRegels(f: Partial<Factuur> | null | undefined): string[] {
  if (!f) return [];
  return [
    f.tav ? `T.a.v. ${f.tav}` : "",
    f.adres || "",
    [f.postcode, f.plaats].filter(Boolean).join(" "),
  ].filter(Boolean);
}

/**
 * Wat er nog niet klopt voordat de offerte de deur uit kan. Leeg = klaar om
 * te versturen.
 */
export function controleer(o: { bedrijf: string; email?: string | null; regels: Regel[]; geldig_tot?: string | null }): string[] {
  const fouten: string[] = [];
  if (!o.bedrijf.trim()) fouten.push("Vul de naam van het bedrijf in.");
  if (!o.email?.trim()) fouten.push("Vul het e-mailadres van de klant in.");
  if (!o.regels.length) fouten.push("Voeg minstens één onderdeel toe.");
  if (o.regels.length && o.regels.every((r) => r.soort === "tarief")) fouten.push("Er staat alleen een tarievenlijst in: voeg iets toe dat de klant afneemt.");
  for (const [g, lijst] of groepen(o.regels)) {
    if (lijst.length < 2) fouten.push(`De keuzegroep "${g}" heeft maar één optie: maak er een vast onderdeel van of voeg een tweede toe.`);
  }
  if (o.geldig_tot && o.geldig_tot < datumOver(0)) fouten.push("De geldigheidsdatum ligt in het verleden.");
  return fouten;
}

/** Een getypte naam als handtekening: niet leeg, geen cijfers of tekens die niets met een naam te maken hebben. */
export function isNaam(s: string): boolean {
  const n = s.trim();
  return n.length >= 2 && n.length <= 120 && /^[\p{L}][\p{L}\p{M} .'-]*$/u.test(n);
}

/* ---------- vormen, tekst en vervolg ---------- */

/** De stappen uit de database of een formulier terug in vorm: hooguit zes, met een kop. */
export function normaliseerVervolg(input: unknown): Stap[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === "object")
    .map((s) => ({ kop: tekst(s.kop, 80), tekst: lang(s.tekst, 400) }))
    .filter((s) => s.kop)
    .slice(0, 6);
}

/** De stappen als de offerte er zelf geen heeft. */
export const VERVOLG_STANDAARD: Stap[] = [
  { kop: "Je ondertekent online", tekst: "Kies wat je wilt, zet je handtekening en je krijgt direct een bevestiging per mail." },
  { kop: "We plannen de start", tekst: "We nemen contact met je op om de eerste afspraken door te nemen." },
  { kop: "Je vaste aanspreekpunt", tekst: "Je krijgt een vast aanspreekpunt dat je organisatie en je mensen leert kennen." },
];

/**
 * Invulvelden in de teksten van een offerte: {bedrijf}, {contactpersoon} en
 * {betreft}. Zo kan een sjabloon "voor {bedrijf}" zeggen. Zonder contactpersoon
 * wordt het "heer, mevrouw", zoals in de Word-offertes.
 */
export function vulIn(t: string | null | undefined, o: { bedrijf?: string | null; contactpersoon?: string | null; betreft?: string | null }): string {
  return (t || "")
    .replace(/\{bedrijf\}/g, o.bedrijf || "je organisatie")
    .replace(/\{contactpersoon\}/g, o.contactpersoon?.trim() || "heer, mevrouw")
    .replace(/\{voornaam\}/g, o.contactpersoon?.trim().split(/\s+/)[0] || "heer, mevrouw")
    .replace(/\{betreft\}/g, o.betreft || "");
}

/* ---------- het ondertekeningscertificaat ---------- */

/** Wat `offerte_certificaat` (0026) teruggeeft: alleen voor een getekende offerte. */
export type CertificaatGegevens = {
  ip: string | null;
  agent: string | null;
  aantal_bekeken: number;
  tijdlijn: { soort: Gebeurtenis["soort"]; at: string; wie: string | null }[];
};

/** "Chrome op macOS" uit de user-agent; leeg als er niets van te maken is. */
export function apparaatUit(agent: string | null | undefined): string {
  const a = agent || "";
  if (!a) return "";
  const browser = /Edg\//.test(a) ? "Edge" : /OPR\//.test(a) ? "Opera" : /Firefox\//.test(a) ? "Firefox"
    : /Chrome\//.test(a) ? "Chrome" : /Safari\//.test(a) && /Version\//.test(a) ? "Safari" : "";
  const os = /iPhone/.test(a) ? "iPhone" : /iPad/.test(a) ? "iPad" : /Android/.test(a) ? "Android"
    : /Windows/.test(a) ? "Windows" : /Mac OS X|Macintosh/.test(a) ? "macOS" : /Linux/.test(a) ? "Linux" : "";
  return [browser, os].filter(Boolean).join(" op ");
}

/**
 * De tijdlijn van het certificaat in gewone zinnen. Van het bekijken alleen
 * de eerste keer; hoe vaak in totaal staat erachter.
 */
export function tijdlijnRegels(c: CertificaatGegevens): { at: string; tekst: string }[] {
  let eersteKeer = true;
  const uit: { at: string; tekst: string }[] = [];
  for (const g of c.tijdlijn) {
    if (g.soort === "verstuurd") uit.push({ at: g.at, tekst: g.wie ? `Offerte verstuurd aan ${g.wie}` : "Link naar de offerte gedeeld" });
    else if (g.soort === "herinnering") uit.push({ at: g.at, tekst: g.wie ? `Herinnering verstuurd aan ${g.wie}` : "Herinnering verstuurd" });
    else if (g.soort === "bekeken" && eersteKeer) {
      eersteKeer = false;
      uit.push({ at: g.at, tekst: c.aantal_bekeken > 1 ? `Offerte voor het eerst geopend (in totaal ${c.aantal_bekeken} keer)` : "Offerte geopend" });
    } else if (g.soort === "code") uit.push({ at: g.at, tekst: `Bevestigingscode gemaild naar ${g.wie || "de ondertekenaar"}` });
    else if (g.soort === "getekend") uit.push({ at: g.at, tekst: `Ondertekend door ${g.wie || "de klant"}, met de juiste code` });
  }
  return uit;
}

/** Bestandsnaam van de pdf: "Offerte 2026-0012 Bakkerij Jansen (getekend).pdf", of "(concept)". */
export function pdfNaam(i: Pick<GetekendeInhoud, "nummer" | "bedrijf">, soort: "getekend" | "concept" = "getekend"): string {
  const bedrijf = i.bedrijf.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return `Offerte ${i.nummer} ${bedrijf} (${soort}).pdf`;
}
