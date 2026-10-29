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
  | "medewerker_jaar" | "jaar" | "maand" | "eenmalig" | "traject" | "uur" | "stuk" | "op_aanvraag";

export type Soort = "vast" | "optie" | "keuze" | "tarief";

type Periode = "jaar" | "eenmalig";

export const EENHEDEN: { key: Eenheid; label: string; achter: string; periode: Periode | null }[] = [
  { key: "medewerker_jaar", label: "Per medewerker per jaar", achter: "per medewerker per jaar", periode: "jaar" },
  { key: "jaar", label: "Per jaar", achter: "per jaar", periode: "jaar" },
  { key: "maand", label: "Per maand", achter: "per maand", periode: "jaar" },
  { key: "eenmalig", label: "Eenmalig", achter: "eenmalig", periode: "eenmalig" },
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

/** Een rij uit `offertes`, zoals het beheer hem leest. */
export type Offerte = {
  id: string;
  nummer: string;
  token: string;
  status: OfferteStatus;
  bedrijf: string;
  contactpersoon: string | null;
  email: string | null;
  telefoon: string | null;
  medewerkers: number | null;
  titel: string;
  intro: string | null;
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
};

/** Wat er bij ondertekening is vastgelegd (`getekend_inhoud`), los van latere wijzigingen. */
export type GetekendeInhoud = {
  nummer: string;
  bedrijf: string;
  contactpersoon: string | null;
  medewerkers: number | null;
  titel: string;
  intro: string | null;
  regels: Regel[];
  keuze: string[];
  geldig_tot: string | null;
  getekend_naam: string;
  getekend_functie: string | null;
  getekend_email: string;
  getekend_at: string;
};

/** Wat de klantpagina krijgt (`offerte_bekijken` in 0024): geen notitie, IP of wie hem maakte. */
export type OffertePubliek = Pick<
  Offerte,
  | "id" | "nummer" | "status" | "bedrijf" | "contactpersoon" | "email" | "medewerkers" | "titel" | "intro" | "regels"
  | "geldig_tot" | "afzender_naam" | "afzender_functie" | "afzender_email" | "afzender_telefoon" | "verstuurd_at"
  | "keuze" | "getekend_at" | "getekend_naam" | "getekend_functie" | "getekend_email" | "handtekening"
  | "getekend_inhoud" | "getekend_hash" | "afgewezen_at"
> & { verlopen: boolean; eerste_keer?: boolean };

export type Gebeurtenis = {
  id: number;
  offerte_id: string;
  soort: "aangemaakt" | "gewijzigd" | "verstuurd" | "herinnering" | "bekeken" | "getekend" | "afgewezen" | "ingetrokken" | "heropend";
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

/** Het aantal waarmee gerekend wordt: bij "per medewerker per jaar" zonder eigen aantal het aantal medewerkers. */
export function aantalVoor(r: Regel, medewerkers: number | null | undefined): number {
  if (r.aantal && r.aantal > 0) return r.aantal;
  if (r.eenheid === "medewerker_jaar") return medewerkers && medewerkers > 0 ? medewerkers : 1;
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
  eenmalig: number;
  /** De regels die meedoen, met hun bedrag (null = op aanvraag). */
  regels: { regel: Regel; bedrag: number | null; periode: Periode | null }[];
};

/** Het totaal bij deze keuze. `gekozen` mag de vaste regels wel of niet bevatten; die doen altijd mee. */
export function berekenTotalen(regels: Regel[], gekozen: readonly string[], medewerkers: number | null | undefined): Totalen {
  const k = new Set(gekozen);
  const uit: Totalen = { perJaar: 0, eenmalig: 0, regels: [] };
  for (const r of regels) {
    if (r.soort === "tarief") continue;
    if (r.soort !== "vast" && !k.has(r.id)) continue;
    const b = bedragVoor(r, medewerkers);
    uit.regels.push({ regel: r, bedrag: b?.bedrag ?? null, periode: b?.periode ?? null });
    if (b?.periode === "jaar") uit.perJaar += b.bedrag;
    if (b?.periode === "eenmalig") uit.eenmalig += b.bedrag;
  }
  uit.perJaar = Math.round(uit.perJaar * 100) / 100;
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
  const achter = eenheidVan(r.eenheid).achter;
  return achter ? `${euro(r.prijs)} ${achter}` : euro(r.prijs);
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
};

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
