/**
 * Klantenbord (migratie 0040): de regels achter /admin/klantenbord.
 *
 * Puur, zonder database: wat de statussen zijn en in welke volgorde ze op het
 * bord staan, hoe een rij uit de klantlijst (klantlijst.xlsx) een kaart wordt,
 * wanneer een volgende actie te laat is, hoe de kaarten gesorteerd en
 * doorzocht worden, en hoe een klant aan zijn offertes, brochures, contracten,
 * onboardings en bellijstlead gekoppeld wordt (op bedrijfsnaam, zoals het
 * Verkoopblok dat doet). De schermen eromheen zijn dun; dit is wat getest wordt
 * (klanten.test.ts).
 */

import { normalizeName } from "./companies";
import { datumLang } from "./offertes";

/* ---------- statussen ---------- */

export type KlantStatus = "lead" | "gesprek" | "offerte" | "akkoord" | "inrichten" | "klant" | "inactief";

export type StatusInfo = {
  key: KlantStatus;
  label: string;
  /** Wat de kolom betekent, onder de kop op het bord. */
  uitleg: string;
  kleur: string;
  achter: string;
};

/** De kolommen van het bord, van links naar rechts: de trechter van lead tot klant, en apart inactief. */
export const KLANT_STATUS: StatusInfo[] = [
  { key: "lead", label: "Lead", uitleg: "Nog geen gesprek gevoerd", kleur: "#312e82", achter: "#eef0ff" },
  { key: "gesprek", label: "In gesprek", uitleg: "Gesprek gepland of gevoerd", kleur: "#0b6bcb", achter: "#e6f2ff" },
  { key: "offerte", label: "Offerte uit", uitleg: "Verstuurd, wacht op de klant", kleur: "#b86e00", achter: "#fff4e5" },
  { key: "akkoord", label: "Akkoord", uitleg: "Offerte retour, contract onderweg", kleur: "#0e9f8a", achter: "#e6f7f4" },
  { key: "inrichten", label: "Inrichten", uitleg: "Contract retour, React2u richt in", kleur: "#e0356b", achter: "#fdeef4" },
  { key: "klant", label: "Klant", uitleg: "Ingericht en live", kleur: "#0a7a4b", achter: "#e3f6ed" },
  { key: "inactief", label: "Inactief", uitleg: "Verloren, gestopt of geparkeerd", kleur: "#6b6a85", achter: "rgba(13,13,40,0.06)" },
];

export const STATUS_SLEUTELS = KLANT_STATUS.map((s) => s.key);

/** De trechter, zonder inactief: wat verder staat, staat later in deze lijst. */
const TRECHTER: KlantStatus[] = ["lead", "gesprek", "offerte", "akkoord", "inrichten", "klant"];

export function isKlantStatus(s: unknown): s is KlantStatus {
  return typeof s === "string" && (STATUS_SLEUTELS as string[]).includes(s);
}

export function statusInfo(s: KlantStatus): StatusInfo {
  return KLANT_STATUS.find((x) => x.key === s) || KLANT_STATUS[0];
}

/**
 * Ligt `nieuw` verder in de trechter dan `huidig`? Een import zet een kaart
 * alleen vooruit (de klantlijst weet niet dat je iemand bewust terugzette) en
 * raakt een inactieve kaart nooit aan.
 */
export function statusVerder(nieuw: KlantStatus, huidig: KlantStatus): boolean {
  if (huidig === "inactief" || nieuw === "inactief") return false;
  return TRECHTER.indexOf(nieuw) > TRECHTER.indexOf(huidig);
}

/* ---------- de checklist uit de klantlijst ---------- */

export const CHECKLIST = [
  { key: "offerte_retour", label: "Offerte retour", kort: "Offerte" },
  { key: "contract_retour", label: "Contract retour", kort: "Contract" },
  { key: "formulieren_retour", label: "Formulieren retour", kort: "Formulieren" },
  { key: "koppeling", label: "Koppeling", kort: "Koppeling" },
  { key: "facturatie", label: "Naar Exact / facturatie", kort: "Facturatie" },
] as const;

export type ChecklistSleutel = (typeof CHECKLIST)[number]["key"];

/* ---------- de rijen ---------- */

export type Klant = {
  id: string;
  bedrijf: string;
  sleutel: string;
  status: KlantStatus;
  contactpersoon: string | null;
  email: string | null;
  telefoon: string | null;
  eigenaar: string | null;
  bron: string | null;
  startdatum: string | null;
  offerte_retour: boolean;
  contract_retour: boolean;
  formulieren_retour: boolean;
  koppeling: boolean;
  facturatie: boolean;
  stand: string | null;
  volgende_actie: string | null;
  volgende_actie_op: string | null;
  laatste_contact_op: string | null;
  laatste_contact: string | null;
  notitie: string | null;
  lead_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type GesprekSoort = "gesprek" | "mail" | "bezoek" | "notitie" | "status" | "import" | "systeem";

/** Uit welke module een systeemregel komt (0041); `opdracht` is een los opgevoerde klant of opdracht, `evaluatie` de klantevaluatie (0043). */
export type Bron = "offerte" | "brochure" | "contract" | "onboarding" | "opdracht" | "evaluatie";

export type Gesprek = {
  id: string;
  klant_id: string;
  soort: GesprekSoort;
  /** De dag, als 2026-11-16. */
  op: string;
  tekst: string;
  door: string | null;
  /** Een echt contact (gesproken, verstuurd, bekeken, getekend) of alleen administratie (aangemaakt, verplaatst, import). */
  contact: boolean;
  bron: Bron | null;
  bron_id: string | null;
  bron_gebeurtenis: number | null;
  created_at: string;
};

/** Wat je zelf kunt kiezen bij een nieuwe regel; status en import schrijft het systeem. */
export const GESPREK_SOORTEN: { key: GesprekSoort; label: string }[] = [
  { key: "gesprek", label: "Gebeld of gesproken" },
  { key: "mail", label: "Gemaild" },
  { key: "bezoek", label: "Bezoek" },
  { key: "notitie", label: "Notitie" },
];

export const CONTACT_SOORTEN: GesprekSoort[] = ["gesprek", "mail", "bezoek", "notitie"];

export function isGesprekSoort(s: unknown): s is GesprekSoort {
  return typeof s === "string" && ["gesprek", "mail", "bezoek", "notitie", "status", "import", "systeem"].includes(s);
}

/** Waar een systeemregel naartoe klikt. */
export function bronHref(bron: Bron | null, id: string | null): string | null {
  if (!bron || !id) return null;
  switch (bron) {
    case "offerte": return `/admin/offertes/${id}`;
    case "brochure": return `/admin/brochures/${id}`;
    case "contract": return `/admin/contracten/${id}`;
    case "onboarding": return `/admin/onboarding/${id}`;
    case "opdracht": return "/admin/verkoop/los";
    case "evaluatie": return `/admin/documenten/evaluaties/${id}`;
  }
}

/* ---------- sleutel ---------- */

/**
 * Dezelfde klant herkennen: de bedrijfsnaam zonder rechtsvorm, hoofdletters,
 * accenten en leestekens. Spiegelt `bedrijf_sleutel()` in migratie 0040, die
 * de kolom `klanten.sleutel` vult; de browsertest controleert dat beide
 * hetzelfde zeggen.
 */
export function bedrijfSleutel(naam: string | null | undefined): string {
  return normalizeName(naam);
}

/* ---------- datums ---------- */

const DAG = 86_400_000;

/** Vandaag in Nederland, als 2026-11-16. De server draait in UTC. */
export function vandaagNL(nu = new Date()): string {
  return nu.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

export function isDatum(s: unknown): boolean {
  if (typeof s !== "string" || !DATUM.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  // 2026-02-31 schuift JavaScript stilzwijgend door naar maart; dat is geen datum.
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}

/** Dagen van a tot b (beide 2026-11-16); positief als b later is. */
export function dagenTussen(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAG);
}

/** "vandaag", "gisteren", "3 dagen geleden", "2 weken geleden", "morgen", "over 5 dagen", anders de datum. */
export function relatief(datum: string | null | undefined, vandaag: string): string {
  if (!datum || !isDatum(datum)) return "";
  const d = dagenTussen(datum, vandaag);
  if (d === 0) return "vandaag";
  if (d === 1) return "gisteren";
  if (d === -1) return "morgen";
  if (d > 1 && d < 7) return `${d} dagen geleden`;
  if (d >= 7 && d < 28) return `${Math.floor(d / 7)} ${Math.floor(d / 7) === 1 ? "week" : "weken"} geleden`;
  if (d < -1 && d > -7) return `over ${-d} dagen`;
  return datumLang(datum);
}

/** "zojuist", "20 min geleden", "3 uur geleden", "gisteren", "4 dagen geleden": voor een tijdstip, zoals een sitebezoek. */
export function relatiefMoment(iso: string | null | undefined, nu = new Date()): string {
  if (!iso) return "";
  const ms = nu.getTime() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  const min = Math.round(ms / 60_000);
  if (min < 2) return "zojuist";
  if (min < 60) return `${min} min geleden`;
  const uur = Math.round(min / 60);
  if (uur < 24 && vandaagNL(nu) === new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" })) return `${uur} uur geleden`;
  return relatief(new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }), vandaagNL(nu));
}

export type ActieStand = "te_laat" | "vandaag" | "gepland" | "zonder_datum" | "geen";

/** Hoe dringend de volgende actie is. */
export function actieStand(k: Pick<Klant, "volgende_actie" | "volgende_actie_op">, vandaag: string): ActieStand {
  if (k.volgende_actie_op) {
    const d = dagenTussen(k.volgende_actie_op, vandaag);
    return d > 0 ? "te_laat" : d === 0 ? "vandaag" : "gepland";
  }
  return k.volgende_actie ? "zonder_datum" : "geen";
}

/* ---------- sorteren, zoeken, tellen ---------- */

const ACTIE_RANG: Record<ActieStand, number> = { te_laat: 0, vandaag: 1, gepland: 2, zonder_datum: 3, geen: 4 };

/**
 * Binnen een kolom: wat te laat is bovenaan (het langst te laat eerst), dan
 * vandaag, dan gepland (het eerst komende eerst), dan zonder datum, dan de
 * rest op laatste wijziging.
 */
export function sorteerKaarten<T extends Pick<Klant, "volgende_actie" | "volgende_actie_op" | "updated_at">>(kaarten: T[], vandaag: string): T[] {
  return [...kaarten].sort((a, b) => {
    const r = ACTIE_RANG[actieStand(a, vandaag)] - ACTIE_RANG[actieStand(b, vandaag)];
    if (r !== 0) return r;
    if (a.volgende_actie_op && b.volgende_actie_op && a.volgende_actie_op !== b.volgende_actie_op) {
      return a.volgende_actie_op.localeCompare(b.volgende_actie_op);
    }
    return b.updated_at.localeCompare(a.updated_at);
  });
}

const plat = (s: string | null | undefined) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Elk woord van de zoekvraag moet ergens voorkomen; een telefoonnummer zonder spaties en streepjes. */
export function zoekKlanten<T extends Pick<Klant, "bedrijf" | "contactpersoon" | "email" | "telefoon" | "eigenaar" | "stand" | "volgende_actie" | "laatste_contact" | "bron">>(
  klanten: T[],
  q: string,
): T[] {
  const woorden = plat(q).split(/\s+/).filter(Boolean);
  if (!woorden.length) return klanten;
  return klanten.filter((k) => {
    const tekst = plat([k.bedrijf, k.contactpersoon, k.email, k.eigenaar, k.stand, k.volgende_actie, k.laatste_contact, k.bron].join(" "));
    const nummer = (k.telefoon || "").replace(/[\s-]/g, "");
    return woorden.every((w) => tekst.includes(w) || (nummer && nummer.includes(w.replace(/[\s-]/g, ""))));
  });
}

export type Telling = Record<KlantStatus, number> & { teLaat: number; vandaag: number; totaal: number };

export function telling(klanten: Pick<Klant, "status" | "volgende_actie" | "volgende_actie_op">[], vandaag: string): Telling {
  const t = { lead: 0, gesprek: 0, offerte: 0, akkoord: 0, inrichten: 0, klant: 0, inactief: 0, teLaat: 0, vandaag: 0, totaal: klanten.length };
  for (const k of klanten) {
    t[k.status]++;
    const a = actieStand(k, vandaag);
    if (a === "te_laat") t.teLaat++;
    if (a === "vandaag") t.vandaag++;
  }
  return t;
}

/** "Cindy Faro" → "CF", "cindy" → "C". */
export function initialen(naam: string | null | undefined): string {
  return (naam || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/* ---------- koppelingen met de andere modules ---------- */

export type KoppelSoort = "offerte" | "brochure" | "contract" | "onboarding" | "evaluatie" | "lead";

export type Koppeling = {
  soort: KoppelSoort;
  id: string;
  /** "O2026-0012", of de naam van de lead. */
  nummer: string;
  /** De stand in woorden: "verstuurd", "getekend", "klant klaar". */
  stand: string;
  kleur: string;
  achter: string;
  href: string;
  /** Het moment dat bij de stand hoort. */
  at: string | null;
};

export type Bronnen = {
  offertes: { id: string; nummer: string; status: string; bedrijf: string; verstuurd_at: string | null; getekend_at: string | null; created_at: string }[];
  brochures: { id: string; nummer: string; status: string; bedrijf: string; verstuurd_at: string | null; bekeken_at: string | null; created_at: string }[];
  contracten: { id: string; nummer: string; status: string; bedrijf: string; soort?: string | null; verstuurd_at: string | null; getekend_at: string | null; created_at: string }[];
  onboardings: { id: string; nummer: string; status: string; bedrijf: string; weergave: string; verstuurd_at: string | null; afgerond_at: string | null; created_at: string }[];
  /** Klantevaluaties (0043); ontbreekt zolang de migratie niet gedraaid is. */
  evaluaties?: { id: string; nummer: string; status: string; bedrijf: string; bekeken_at: string | null; verstuurd_at: string | null; ingevuld_at: string | null; created_at: string }[];
  leads: { id: string; name: string; company: string | null; status: string; follow_up_on: string | null }[];
};

const GRIJS = { kleur: "#6b6a85", achter: "rgba(13,13,40,0.06)" };
const NAVY = { kleur: "#312e82", achter: "#eef0ff" };
const GROEN = { kleur: "#0a7a4b", achter: "#e3f6ed" };
const ORANJE = { kleur: "#b86e00", achter: "#fff4e5" };
const BLAUW = { kleur: "#0b6bcb", achter: "#e6f2ff" };

const STAND: Record<string, { label: string; kleur: string; achter: string }> = {
  concept: { label: "concept", ...GRIJS },
  verstuurd: { label: "verstuurd", ...NAVY },
  bekeken: { label: "bekeken", ...BLAUW },
  getekend: { label: "getekend", ...GROEN },
  afgewezen: { label: "afgewezen", ...GRIJS },
  ingetrokken: { label: "ingetrokken", ...GRIJS },
  afgerond: { label: "klant klaar", ...ORANJE },
  ingericht: { label: "ingericht", ...GROEN },
  ingevuld: { label: "ingevuld", ...GROEN },
};

const LEAD_STAND: Record<string, { label: string; kleur: string; achter: string }> = {
  te_bellen: { label: "te bellen", kleur: "#e0356b", achter: "#fdeef4" },
  terugbellen: { label: "terugbellen", ...ORANJE },
  niet_bereikt: { label: "niet bereikt", ...ORANJE },
  gebeld: { label: "gebeld", ...NAVY },
  klant: { label: "klant", ...GROEN },
  geen_interesse: { label: "geen interesse", ...GRIJS },
};

/**
 * Alles uit de andere modules per bedrijfssleutel, nieuwste eerst. Eén keer
 * opbouwen voor het hele bord (de pagina), dan per kaart opzoeken.
 */
export function koppelIndex(bronnen: Bronnen): Map<string, Koppeling[]> {
  const index = new Map<string, Koppeling[]>();
  const zet = (bedrijf: string | null, k: Koppeling) => {
    const s = bedrijfSleutel(bedrijf);
    if (!s) return;
    const l = index.get(s) || [];
    l.push(k);
    index.set(s, l);
  };
  for (const o of bronnen.offertes) {
    const st = STAND[o.status] || STAND.concept;
    zet(o.bedrijf, { soort: "offerte", id: o.id, nummer: o.nummer, stand: st.label, kleur: st.kleur, achter: st.achter, href: `/admin/offertes/${o.id}`, at: o.getekend_at || o.verstuurd_at || o.created_at });
  }
  for (const b of bronnen.brochures) {
    const st = b.status === "verstuurd" && b.bekeken_at ? STAND.bekeken : STAND[b.status] || STAND.concept;
    zet(b.bedrijf, { soort: "brochure", id: b.id, nummer: b.nummer, stand: st.label, kleur: st.kleur, achter: st.achter, href: `/admin/brochures/${b.id}`, at: b.bekeken_at || b.verstuurd_at || b.created_at });
  }
  for (const c of bronnen.contracten) {
    const st = STAND[c.status] || STAND.concept;
    const reseller = c.soort === "reseller";
    zet(c.bedrijf, { soort: "contract", id: c.id, nummer: c.nummer, stand: `${reseller ? "resellerovereenkomst " : ""}${st.label}`, kleur: st.kleur, achter: st.achter, href: `/admin/contracten/${c.id}`, at: c.getekend_at || c.verstuurd_at || c.created_at });
  }
  for (const o of bronnen.onboardings) {
    const st = STAND[o.weergave] || STAND[o.status] || STAND.concept;
    zet(o.bedrijf, { soort: "onboarding", id: o.id, nummer: o.nummer, stand: o.weergave === "bekeken" ? "klant bezig" : st.label, kleur: st.kleur, achter: st.achter, href: `/admin/onboarding/${o.id}`, at: o.afgerond_at || o.verstuurd_at || o.created_at });
  }
  for (const e of bronnen.evaluaties || []) {
    const st = e.status === "verstuurd" && e.bekeken_at ? STAND.bekeken : STAND[e.status] || STAND.concept;
    zet(e.bedrijf, { soort: "evaluatie", id: e.id, nummer: e.nummer, stand: e.status === "verstuurd" && e.bekeken_at ? "klant bezig" : st.label, kleur: st.kleur, achter: st.achter, href: `/admin/documenten/evaluaties/${e.id}`, at: e.ingevuld_at || e.verstuurd_at || e.created_at });
  }
  for (const l of bronnen.leads) {
    const st = LEAD_STAND[l.status] || LEAD_STAND.gebeld;
    const k: Koppeling = { soort: "lead", id: l.id, nummer: l.name, stand: l.status === "terugbellen" && l.follow_up_on ? `terugbellen ${datumLang(l.follow_up_on)}` : st.label, kleur: st.kleur, achter: st.achter, href: `/admin/bellijst?filter=alles#lead-${l.id}`, at: l.follow_up_on };
    // Op de bedrijfsnaam, of op de naam van de lead als het bedrijf ontbreekt of anders heet.
    zet(l.company, k);
    if (bedrijfSleutel(l.name) !== bedrijfSleutel(l.company)) zet(l.name, k);
  }
  for (const l of index.values()) l.sort((a, b) => (b.at || "").localeCompare(a.at || ""));
  return index;
}

/** Alles van dezelfde klant in de andere modules, nieuwste eerst: dezelfde genormaliseerde bedrijfsnaam. */
export function koppelingenVoor(bedrijf: string, bronnen: Bronnen): Koppeling[] {
  const s = bedrijfSleutel(bedrijf);
  if (!s) return [];
  return koppelIndex(bronnen).get(s) || [];
}

/* ---------- sitebezoek ---------- */

/** Wat het bord van een bedrijf op de site weet (bedrijfsherkenning, recht `bezoek`). */
export type Bezoek = {
  /** Het laatste bezoek, als tijdstip. */
  laatst: string;
  /** Paginaweergaven in de periode. */
  paginas: number;
  /** De sessies, nieuwste eerst: wanneer en welke pagina's. */
  sessies: { start: string; paginas: string[] }[];
};

type BedrijfOpSite = { name: string; lastSeen: string; views: number; sessions: { start: string; pages: { path: string }[] }[] };

/**
 * Het sitebezoek per kaart: de bedrijven uit de herkenning (summarize in
 * lib/companies.ts) op dezelfde sleutel als de kaarten. Hooguit vijf sessies,
 * nieuwste eerst, voor de tijdlijn.
 */
export function bezoekPerKlant<T extends Pick<Klant, "id" | "bedrijf" | "sleutel">>(klanten: T[], bedrijven: BedrijfOpSite[]): Record<string, Bezoek> {
  const perSleutel = new Map<string, BedrijfOpSite>();
  for (const b of bedrijven) {
    const s = bedrijfSleutel(b.name);
    if (s && !perSleutel.has(s)) perSleutel.set(s, b);
  }
  const uit: Record<string, Bezoek> = {};
  for (const k of klanten) {
    const b = perSleutel.get(k.sleutel || bedrijfSleutel(k.bedrijf));
    if (!b) continue;
    uit[k.id] = {
      laatst: b.lastSeen,
      paginas: b.views,
      sessies: [...b.sessions].sort((x, y) => y.start.localeCompare(x.start)).slice(0, 5).map((x) => ({ start: x.start, paginas: [...new Set(x.pages.map((p) => p.path))] })),
    };
  }
  return uit;
}

/* ---------- import van de klantlijst ---------- */

export type ImportVeld =
  | "bedrijf" | "startdatum" | "offerte_retour" | "contract_retour" | "formulieren_retour" | "koppeling" | "facturatie"
  | "stand" | "contactpersoon" | "email" | "telefoon" | "eigenaar" | "volgende_actie" | "bron";

export const IMPORT_VELD_LABEL: Record<ImportVeld, string> = {
  bedrijf: "Bedrijf",
  startdatum: "Startdatum",
  offerte_retour: "Offerte retour",
  contract_retour: "Contract retour",
  formulieren_retour: "Formulieren retour",
  koppeling: "Koppeling",
  facturatie: "Naar Exact / facturatie",
  stand: "Laatste stand",
  contactpersoon: "Contactpersoon",
  email: "E-mail",
  telefoon: "Telefoon",
  eigenaar: "Eigenaar",
  volgende_actie: "Volgende actie",
  bron: "Bron",
};

export type Kolom = {
  /** Kolomletter, A, B, …, voor het rapport. */
  letter: string;
  kop: string;
  veld: ImportVeld | null;
  /** Hoe de kolom herkend is: aan de kopregel, aan de inhoud, of niet. */
  via: "kop" | "inhoud" | "leeg" | "onbekend";
};

export type ImportRij = {
  /** Regelnummer in het bestand, zoals Excel het toont. */
  regel: number;
  bedrijf: string;
  startdatum: string | null;
  offerte_retour: boolean | null;
  contract_retour: boolean | null;
  formulieren_retour: boolean | null;
  koppeling: boolean | null;
  facturatie: boolean | null;
  stand: string | null;
  contactpersoon: string | null;
  email: string | null;
  telefoon: string | null;
  eigenaar: string | null;
  volgende_actie: string | null;
  bron: string | null;
  waarschuwingen: string[];
};

export function kolomLetter(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** Een kop herkennen aan een paar woorden; "naar excact/facturatie verzonden" is ook facturatie. */
const KOPPEN: [RegExp, ImportVeld][] = [
  [/start|ingang|begin/, "startdatum"],
  [/offerte/, "offerte_retour"],
  [/contract/, "contract_retour"],
  [/formulier/, "formulieren_retour"],
  [/koppel/, "koppeling"],
  [/exa?c+t|factur/, "facturatie"],
  [/contactpersoon|^contact$|aanspreek/, "contactpersoon"],
  [/mail/, "email"],
  [/telefoon|^tel\b|mobiel|nummer/, "telefoon"],
  [/eigenaar|accountmanager|verkoper|sales|van react2u|wie/, "eigenaar"],
  [/actie|volgende|to ?do|opvolg/, "volgende_actie"],
  [/bron|via|herkomst/, "bron"],
  [/stand|status|opmerking|notitie|toelichting|bijzonderheden|laatste/, "stand"],
  [/klant|bedrijf|naam|organisatie|werkgever/, "bedrijf"],
];

/** "ja", "j", "x", "yes", "✓" en "1" zijn waar; "nee", "n", "no", "0" en "-" onwaar; leeg is niets; de rest is onbekend. */
export function leesJaNee(s: string | null | undefined): { waarde: boolean | null; onbekend: boolean } {
  const t = (s || "").trim().toLowerCase().replace(/\.$/, "");
  if (!t) return { waarde: null, onbekend: false };
  if (["ja", "j", "x", "yes", "y", "✓", "✔", "1", "true", "v", "ok", "klaar", "gedaan", "retour"].includes(t)) return { waarde: true, onbekend: false };
  if (["nee", "n", "no", "0", "-", "false", "nvt", "n.v.t", "nog niet", "niet"].includes(t)) return { waarde: false, onbekend: false };
  return { waarde: null, onbekend: true };
}

/** 2026-09-01 (zo komt het uit lezenXlsx), 1-9-2026, 01/09/2026, 1.9.2026 of 1-9 (dit jaar). */
export function leesDatum(s: string | null | undefined, vandaag: string): string | null {
  const t = (s || "").trim();
  if (!t) return null;
  if (isDatum(t)) return t;
  const m = t.match(/^(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?$/);
  if (!m) return null;
  const dag = Number(m[1]);
  const maand = Number(m[2]);
  let jaar = m[3] ? Number(m[3]) : Number(vandaag.slice(0, 4));
  if (jaar < 100) jaar += 2000;
  const iso = `${jaar}-${String(maand).padStart(2, "0")}-${String(dag).padStart(2, "0")}`;
  return isDatum(iso) && maand >= 1 && maand <= 12 && dag >= 1 && dag <= 31 ? iso : null;
}

const lijktDatum = (s: string) => isDatum(s) || /^\d{1,2}[-/.]\d{1,2}([-/.]\d{2,4})?$/.test(s);
const lijktNaam = (s: string) => /^[A-ZÀ-Ý][a-zà-ÿ'.-]+(\s+(van|de|der|den|het|te|ten|v\.|d\.|[A-ZÀ-Ý][a-zà-ÿ'.-]+)){1,3}$/.test(s.trim());

/**
 * Welke kolom wat is. Eerst de kopregel; een kolom zonder kop (of een kop die
 * niemand kent) krijgt een veld aan de hand van de inhoud: datums, ja/nee,
 * namen van mensen, en anders vrije tekst als laatste stand. Zo overleeft de
 * import een kop die een kolom opgeschoven staat, zoals in de klantlijst van
 * november 2026 (de kop "naar exact/facturatie" boven een lege kolom, de
 * standtekst in de kolom ernaast zonder kop).
 */
export function herkenKolommen(cellen: string[][]): { kolommen: Kolom[]; kopregel: boolean } {
  const breedte = Math.max(0, ...cellen.map((r) => r.length));
  const eerste = cellen[0] || [];
  // Een kopregel heeft woorden, geen datums of ja/nee, en noemt iets als klant of bedrijf.
  const kopregel = eerste.some((c) => /klant|bedrijf|naam|organisatie|werkgever/i.test(c)) && !eerste.some((c) => lijktDatum(c.trim()));
  const data = kopregel ? cellen.slice(1) : cellen;
  const bezet = new Set<ImportVeld>();
  const kolommen: Kolom[] = [];
  for (let i = 0; i < breedte; i++) {
    const kop = (kopregel ? eerste[i] || "" : "").trim();
    const waarden = data.map((r) => (r[i] || "").trim()).filter(Boolean);
    let veld: ImportVeld | null = null;
    let via: Kolom["via"] = "onbekend";
    if (kop) {
      const k = kop.toLowerCase();
      const treffer = KOPPEN.find(([re, v]) => re.test(k) && !bezet.has(v));
      if (treffer) {
        veld = treffer[1];
        via = "kop";
      }
    }
    if (!veld && !waarden.length) via = "leeg";
    if (!veld && waarden.length) {
      const n = waarden.length;
      const datums = waarden.filter(lijktDatum).length;
      const jaNee = waarden.filter((w) => !leesJaNee(w).onbekend).length;
      const namen = waarden.filter(lijktNaam).length;
      const mails = waarden.filter((w) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(w)).length;
      const nummers = waarden.filter((w) => /^[\d\s()+-]{8,}$/.test(w)).length;
      const lang = waarden.filter((w) => w.length > 25 || w.split(/\s+/).length > 3).length;
      const kies = (v: ImportVeld) => {
        if (!bezet.has(v)) {
          veld = v;
          via = "inhoud";
        }
      };
      if (datums >= n * 0.8) kies("startdatum");
      else if (mails >= n * 0.8) kies("email");
      else if (nummers >= n * 0.8) kies("telefoon");
      else if (jaNee >= n * 0.8) { /* een ja/nee-kolom zonder kop: we weten niet welk vinkje */ }
      else if (!kopregel && !bezet.has("bedrijf")) kies("bedrijf");
      else if (lang >= n * 0.3) kies("stand");
      else if (namen >= n * 0.8) kies("contactpersoon");
      else kies("stand");
    }
    if (veld) bezet.add(veld);
    kolommen.push({ letter: kolomLetter(i), kop, veld, via });
  }
  return { kolommen, kopregel };
}

const knip = (s: string | undefined, max: number) => {
  const t = (s || "").trim().replace(/\s+/g, " ");
  return t ? t.slice(0, max) : null;
};

/** De cellen uit lezenXlsx (of een csv) als importrijen, met per rij wat opviel. */
export function rijenUitKlantlijst(cellen: string[][], vandaag: string): { rijen: ImportRij[]; kolommen: Kolom[]; kopregel: boolean } {
  const { kolommen, kopregel } = herkenKolommen(cellen);
  const data = kopregel ? cellen.slice(1) : cellen;
  const rijen: ImportRij[] = [];
  data.forEach((cel, n) => {
    const regel = n + (kopregel ? 2 : 1);
    if (!cel.some((c) => (c || "").trim())) return;
    const rij: ImportRij = {
      regel, bedrijf: "", startdatum: null, offerte_retour: null, contract_retour: null, formulieren_retour: null, koppeling: null, facturatie: null,
      stand: null, contactpersoon: null, email: null, telefoon: null, eigenaar: null, volgende_actie: null, bron: null, waarschuwingen: [],
    };
    kolommen.forEach((k, i) => {
      const w = (cel[i] || "").trim();
      if (!k.veld || !w) return;
      switch (k.veld) {
        case "bedrijf": rij.bedrijf = knip(w, 200) || ""; break;
        case "startdatum": {
          const d = leesDatum(w, vandaag);
          if (d) rij.startdatum = d;
          else rij.waarschuwingen.push(`Startdatum "${w}" niet herkend`);
          break;
        }
        case "offerte_retour": case "contract_retour": case "formulieren_retour": case "koppeling": case "facturatie": {
          const j = leesJaNee(w);
          if (j.onbekend) rij.waarschuwingen.push(`${IMPORT_VELD_LABEL[k.veld]}: "${w}" is geen ja of nee`);
          else rij[k.veld] = j.waarde;
          break;
        }
        case "email": {
          const e = w.toLowerCase();
          if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) rij.email = e.slice(0, 254);
          else rij.waarschuwingen.push(`E-mailadres "${w}" klopt niet`);
          break;
        }
        case "telefoon": rij.telefoon = knip(w, 40); break;
        case "stand": rij.stand = knip(w, 2000); break;
        case "contactpersoon": rij.contactpersoon = knip(w, 200); break;
        case "eigenaar": rij.eigenaar = knip(w, 80); break;
        case "volgende_actie": rij.volgende_actie = knip(w, 500); break;
        case "bron": rij.bron = knip(w, 120); break;
      }
    });
    if (!rij.bedrijf) rij.waarschuwingen.unshift("Geen bedrijfsnaam");
    rijen.push(rij);
  });
  return { rijen, kolommen, kopregel };
}

/**
 * De status die bij een rij uit de klantlijst hoort. De vinkjes wegen het
 * zwaarst (contract retour is inrichten, offerte retour is akkoord); de
 * standtekst geeft de rest: precies "ingericht" is klant, "offerte verstuurd"
 * is offerte uit, "akkoord" is akkoord, een gesprek of bezoek is in gesprek.
 * "Wordt ingericht door Iki" is inrichten, niet klant.
 */
export function statusUitRij(rij: Pick<ImportRij, "offerte_retour" | "contract_retour" | "formulieren_retour" | "koppeling" | "facturatie" | "stand">): KlantStatus {
  const stand = (rij.stand || "").trim().toLowerCase();
  if (/^ingericht\b/.test(stand) && !/\b(wordt|moet|nog)\b/.test(stand)) return "klant";
  if (rij.contract_retour) return "inrichten";
  if (/\boffertes?\b.*\b(verstuurd|gestuurd|uit|verzonden)\b|\b(verstuurd|gestuurd|verzonden)\b.*\boffertes?\b/.test(stand)) return "offerte";
  if (rij.offerte_retour) return "akkoord";
  const ontkend = /\b(nog geen|geen|nog niet|niet)\s+(ak+oord|ac+oord|getekend|ondertekend|ondertekening)\b/.test(stand);
  const bevestigd = /\b(ak+oord|ac+oord|getekend|ondertekend)\b/.test(stand);
  if (bevestigd && !(ontkend && !/\bwel\b/.test(stand))) return "akkoord";
  if (/\bcontract\b.*\b(verstuurd|gestuurd|verzonden)\b/.test(stand)) return "akkoord";
  if (/\b(gesprek|spreekt|spreken|bespreekt|belt|gebeld|naartoe|bezoek|afspraak|kennismaking)\b/.test(stand)) return "gesprek";
  if (rij.formulieren_retour || rij.koppeling || rij.facturatie) return "inrichten";
  return "lead";
}

export type VoorstelActie = "nieuw" | "bijwerken" | "ongewijzigd" | "overslaan";

export type Voorstelregel = {
  rij: ImportRij;
  actie: VoorstelActie;
  /** De bestaande kaart, als die er is. */
  bestaand: Pick<Klant, "id" | "bedrijf" | "status"> | null;
  /** De status die de kaart na de import heeft. */
  status: KlantStatus;
  /** Wat er aan een bestaande kaart verandert, in woorden. */
  wijzigingen: string[];
  waarschuwingen: string[];
};

export type Voorstel = {
  regels: Voorstelregel[];
  telling: Record<VoorstelActie, number>;
};

type Bestaand = Pick<Klant, "id" | "bedrijf" | "sleutel" | "status" | "startdatum" | "stand" | "contactpersoon" | "email" | "telefoon" | "eigenaar" | "volgende_actie" | "bron" | ChecklistSleutel>;

/** De velden uit het bestand die een bestaande kaart kunnen wijzigen, met de tekst voor het rapport. */
const TEKSTVELDEN: { veld: "startdatum" | "stand" | "contactpersoon" | "email" | "telefoon" | "eigenaar" | "volgende_actie" | "bron"; label: string }[] = [
  { veld: "startdatum", label: "startdatum" },
  { veld: "stand", label: "laatste stand" },
  { veld: "contactpersoon", label: "contactpersoon" },
  { veld: "email", label: "e-mail" },
  { veld: "telefoon", label: "telefoon" },
  { veld: "eigenaar", label: "eigenaar" },
  { veld: "volgende_actie", label: "volgende actie" },
  { veld: "bron", label: "bron" },
];

/**
 * Het controlerapport vóór de import: per rij of hij nieuw is, een bestaande
 * kaart bijwerkt (dezelfde bedrijfsnaam) of niets verandert, en wat er dan
 * verandert. Een gevulde cel wint, een lege laat staan wat er stond; de status
 * gaat alleen vooruit en een inactieve kaart blijft inactief. Een rij zonder
 * bedrijfsnaam of een tweede rij met dezelfde naam wordt overgeslagen. Een
 * startdatum van meer dan een maand terug bij wie nog geen klant is, krijgt
 * een opmerking: in de klantlijst van november 2026 stond "1-1" voor januari,
 * en Excel maakte daar het lopende jaar van.
 */
export function importVoorstel(rijen: ImportRij[], bestaande: Bestaand[], vandaag: string): Voorstel {
  const perSleutel = new Map(bestaande.map((b) => [b.sleutel || bedrijfSleutel(b.bedrijf), b]));
  const gezien = new Set<string>();
  const regels: Voorstelregel[] = rijen.map((rij) => {
    const waarschuwingen = [...rij.waarschuwingen];
    const sleutel = bedrijfSleutel(rij.bedrijf);
    const afgeleid = statusUitRij(rij);
    if (!sleutel) {
      if (!waarschuwingen.includes("Geen bedrijfsnaam")) waarschuwingen.unshift("Geen bedrijfsnaam");
      return { rij, actie: "overslaan", bestaand: null, status: afgeleid, wijzigingen: [], waarschuwingen };
    }
    if (gezien.has(sleutel)) {
      waarschuwingen.push("Staat al eerder in het bestand");
      return { rij, actie: "overslaan", bestaand: null, status: afgeleid, wijzigingen: [], waarschuwingen };
    }
    gezien.add(sleutel);
    const b = perSleutel.get(sleutel) || null;
    const status = b ? (statusVerder(afgeleid, b.status) ? afgeleid : b.status) : afgeleid;
    // Meer dan een maand terug bij wie nog geen klant is: in de klantlijst stond "1-1" voor januari, en Excel maakte er het lopende jaar van.
    if (rij.startdatum && dagenTussen(rij.startdatum, vandaag) > 31 && status !== "klant" && status !== "inrichten" && status !== "inactief") {
      waarschuwingen.push(`Startdatum ${datumLang(rij.startdatum)} ligt in het verleden; bedoel je ${Number(rij.startdatum.slice(0, 4)) + 1}?`);
    }
    if (!b) return { rij, actie: "nieuw", bestaand: null, status, wijzigingen: [], waarschuwingen };
    const wijzigingen: string[] = [];
    for (const c of CHECKLIST) {
      const w = rij[c.key];
      if (w !== null && w !== b[c.key]) wijzigingen.push(`${c.label.toLowerCase()} ${w ? "ja" : "nee"}`);
    }
    for (const t of TEKSTVELDEN) {
      const w = rij[t.veld];
      if (w && w !== (b[t.veld] || null)) wijzigingen.push(t.label);
    }
    if (status !== b.status) wijzigingen.push(`status ${statusInfo(b.status).label} → ${statusInfo(status).label}`);
    return { rij, actie: wijzigingen.length ? "bijwerken" : "ongewijzigd", bestaand: { id: b.id, bedrijf: b.bedrijf, status: b.status }, status, wijzigingen, waarschuwingen };
  });
  const telling = { nieuw: 0, bijwerken: 0, ongewijzigd: 0, overslaan: 0 };
  for (const r of regels) telling[r.actie]++;
  return { regels, telling };
}

/** Een rij uit het bestand zoals hij in de database komt (zonder lege waarden; een bestaande kaart houdt dan wat er stond). */
export function rijNaarVelden(rij: ImportRij): Partial<Klant> {
  const uit: Partial<Klant> = {};
  if (rij.startdatum) uit.startdatum = rij.startdatum;
  if (rij.stand) uit.stand = rij.stand;
  if (rij.contactpersoon) uit.contactpersoon = rij.contactpersoon;
  if (rij.email) uit.email = rij.email;
  if (rij.telefoon) uit.telefoon = rij.telefoon;
  if (rij.eigenaar) uit.eigenaar = rij.eigenaar;
  if (rij.volgende_actie) uit.volgende_actie = rij.volgende_actie;
  if (rij.bron) uit.bron = rij.bron;
  for (const c of CHECKLIST) if (rij[c.key] !== null) uit[c.key] = rij[c.key]!;
  return uit;
}

/**
 * Een csv of geplakte tekst als cellen: tabs, puntkomma's of komma's als
 * scheiding (wat het meest voorkomt in de kopregel), aanhalingstekens eromheen
 * mogen. Voor wie de klantlijst niet als .xlsx maar als csv bewaart.
 */
export function cellenUitTekst(tekst: string): string[][] {
  const regels = tekst.replace(/\r\n?/g, "\n").split("\n").filter((r) => r.trim());
  if (!regels.length) return [];
  const eerste = regels[0];
  const scheiding = [["\t", (eerste.match(/\t/g) || []).length], [";", (eerste.match(/;/g) || []).length], [",", (eerste.match(/,/g) || []).length]]
    .sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const teken = Number(scheiding[1]) > 0 ? String(scheiding[0]) : "\t";
  return regels.map((regel) => {
    const cellen: string[] = [];
    let huidig = "";
    let inQuote = false;
    for (let i = 0; i < regel.length; i++) {
      const c = regel[i];
      if (c === '"') {
        if (inQuote && regel[i + 1] === '"') {
          huidig += '"';
          i++;
        } else inQuote = !inQuote;
      } else if (c === teken && !inQuote) {
        cellen.push(huidig.trim());
        huidig = "";
      } else huidig += c;
    }
    cellen.push(huidig.trim());
    return cellen;
  });
}
