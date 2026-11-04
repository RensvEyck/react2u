/**
 * Opvolgen: wat er in de verkoop vandaag een actie vraagt, voor het dashboard.
 *
 * Puur: de pagina haalt de rijen op, dit bepaalt per offerte, brochure en
 * contract hooguit één signaal (het belangrijkste) en zet ze op volgorde. Het
 * Verkoopblok op het dashboard toont ze; de regels staan in CONTEXT.md onder
 * *Commandopalet en dashboard*.
 *
 * Een signaal verdwijnt vanzelf als de reden weg is: getekend, afgewezen, een
 * herinnering net verstuurd, of de klant keek te lang geleden om nog warm te
 * zijn. Er is dus geen "afgehandeld"-knop nodig, en niets om bij te houden.
 */

import type { Brochure } from "./brochures";
import { normalizeName, isProviderDomain, registrableDomain } from "./companies";
import { CONTRACT_SOORT, looptijdNu, soortVan, type Contract } from "./contracten";
import { waited } from "./dashboard";
import { datumLang, datumOver, euro, VORMEN, waardeVan, weergaveVan, type Offerte, type Totalen } from "./offertes";

/* ---------- invoer ---------- */

export type OfferteRij = Pick<
  Offerte,
  | "id" | "nummer" | "status" | "vorm" | "bedrijf" | "contactpersoon" | "email" | "telefoon" | "medewerkers"
  | "regels" | "keuze" | "keuze_at" | "geldig_tot" | "created_at" | "verstuurd_at" | "bekeken_at"
  | "laatst_bekeken_at" | "aantal_bekeken" | "getekend_at"
>;

export type BrochureRij = Pick<
  Brochure,
  | "id" | "nummer" | "status" | "bedrijf" | "contactpersoon" | "email" | "telefoon" | "created_at"
  | "verstuurd_at" | "bekeken_at" | "laatst_bekeken_at" | "aantal_bekeken"
>;

export type ContractRij = Pick<
  Contract,
  | "id" | "nummer" | "status" | "soort" | "bedrijf" | "contactpersoon" | "email" | "telefoon" | "offerte_id"
  | "ingangsdatum" | "einddatum" | "created_at" | "verstuurd_at" | "bekeken_at" | "laatst_bekeken_at"
  | "aantal_bekeken" | "getekend_at"
>;

/** Een bedrijf dat de laatste dagen op de site was (Bezoek → Bedrijven). */
export type Bezoeker = { naam: string; domein: string | null; laatst: string; paginas: number };

export type Invoer = {
  offertes: OfferteRij[];
  brochures: BrochureRij[];
  contracten: ContractRij[];
  /**
   * Wanneer elk stuk voor het laatst gemaild is, per id: de nieuwste
   * gebeurtenis "verstuurd" of "herinnering". `verstuurd_at` blijft op de
   * eerste keer staan, dus zonder dit bleef "nog niet geopend" na een
   * herinnering gewoon staan.
   */
  gemaild?: Map<string, string>;
  bezoek?: Bezoeker[];
};

/* ---------- uitvoer ---------- */

export type Toon = "warm" | "let-op" | "info" | "goed";

export type Reden =
  | "gekozen" | "bekeken" | "stil" | "niet-geopend" | "verloopt" | "verlopen"
  | "zonder-contract" | "brochure-bekeken" | "opzeggen";

export type Signaal = {
  key: string;
  soort: "offerte" | "brochure" | "contract";
  id: string;
  bedrijf: string;
  contactpersoon: string | null;
  telefoon: string | null;
  /** Waar de rij heen gaat: het stuk zelf, of meteen de volgende stap. */
  href: string;
  reden: Reden;
  /** Kort, in het pilletje: wat er aan de hand is. */
  label: string;
  toon: Toon;
  /** De regel eronder, aan elkaar met " · ". */
  details: string[];
  /** Een termijn die afloopt: "verloopt over 2 dagen". */
  termijn: string | null;
  /** "Op de site 2 uur geleden, 3 pagina's": alleen met het recht op Bezoek. */
  opSite: string | null;
  gewicht: number;
  /** Het laatste wat er gebeurde, voor de volgorde bij gelijk gewicht. */
  at: string;
};

/* ---------- drempels ---------- */

/** De grenzen, op één plek. In dagen tenzij anders vermeld. */
export const DREMPELS = {
  /** Zo recent bekeken telt als warm: nu bellen. */
  warmUren: 48,
  /** Een offerte of contract blijft "bekeken" zolang de klant de laatste week keek; daarna "stil". */
  bekeken: 7,
  /** Een brochure is langer bruikbaar als aanleiding: twee weken. */
  brochureBekeken: 14,
  /** Na zoveel dagen zonder openen een herinnering. */
  nietGeopend: 3,
  brochureNietGeopend: 5,
  /** Net gemaild (verstuurd of herinnering): even niet opnieuw aandringen. */
  netGemaild: 3,
  /** Ouder dan dit (sinds de eerste keer versturen) is het geen opvolging meer, maar een dood spoor. */
  houdbaar: 60,
  brochureHoudbaar: 30,
  /** De geldigheid loopt af: binnen zoveel dagen. */
  verlooptBinnen: 5,
  /** Hoe lang een verlopen offerte nog op het dashboard staat. */
  verlopenTot: 30,
  /** Getekend zonder basiscontract: zo lang blijft dat staan. */
  zonderContract: 60,
  /** De laatste dag om op te zeggen komt eraan: tijd voor een evaluatiegesprek. */
  opzeggenBinnen: 60,
  opzeggenDringend: 21,
  /** Wie zo recent op de site was, krijgt een duwtje omhoog. */
  opSiteUren: 48,
} as const;

/**
 * Offertevormen waar een Basiscontract Arbodienstverlening bij hoort: de
 * verzuimbegeleiding (ook voor de flexbranche). Een RI&E, training of traject
 * is een losse opdracht en heeft dat contract niet nodig.
 */
const MET_BASISCONTRACT = new Set(["Verzuim", "Flexbranche"]);

/* ---------- dezelfde klant ---------- */

/** Mailadressen van particulieren: twee klanten met @gmail.com zijn niet hetzelfde bedrijf. */
const GRATIS_MAIL = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.nl", "outlook.com", "outlook.nl", "live.com", "live.nl",
  "msn.com", "yahoo.com", "yahoo.nl", "icloud.com", "me.com", "proton.me", "protonmail.com", "kpnmail.nl",
  "home.nl", "hetnet.nl", "upcmail.nl", "zonnet.nl", "quicknet.nl", "ziggo.nl", "planet.nl", "xs4all.nl",
  "casema.nl", "chello.nl", "tele2.nl", "online.nl", "telfort.nl",
]);

/**
 * Sleutels waarmee twee stukken bij dezelfde klant horen: de bedrijfsnaam
 * zonder rechtsvorm, het e-mailadres, en het domein daarvan als dat geen
 * Gmail of Hotmail is. Een brochure weet niet welke offerte eruit volgde
 * (`offerte_id` wordt niet gezet), dus zonder dit zou "nog geen offerte" ook
 * blijven staan als die er allang is.
 */
export function klantSleutels(k: { bedrijf: string | null; email?: string | null }): string[] {
  const uit: string[] = [];
  const naam = normalizeName(k.bedrijf);
  if (naam) uit.push(`naam:${naam}`);
  const mail = (k.email || "").trim().toLowerCase();
  if (mail.includes("@")) {
    uit.push(`mail:${mail}`);
    const domein = registrableDomain(mail.split("@")[1]);
    if (domein && !GRATIS_MAIL.has(domein) && !isProviderDomain(domein)) uit.push(`domein:${domein}`);
  }
  return uit;
}

function zelfde(a: string[], b: Set<string>): boolean {
  return a.some((s) => b.has(s));
}

/* ---------- helpers ---------- */

const UUR = 3_600_000;
const DAG = 86_400_000;

function urenSinds(iso: string, nu: Date): number {
  return (nu.getTime() - new Date(iso).getTime()) / UUR;
}

function dagenSinds(iso: string, nu: Date): number {
  return (nu.getTime() - new Date(iso).getTime()) / DAG;
}

function geleden(iso: string, nu: Date): string {
  return `${waited(iso, nu)} geleden`;
}

function bekekenTekst(aantal: number, laatst: string, nu: Date): string {
  return `${aantal > 1 ? `${aantal}× bekeken, laatst` : "bekeken"} ${geleden(laatst, nu)}`;
}

/** "€450 per maand", "€1.250 eenmalig", "€450 per maand + €95 eenmalig", of null. */
export function waardeTekst(t: Pick<Totalen, "perMaand" | "eenmalig">): string | null {
  const delen = [
    t.perMaand > 0 ? `${euro(t.perMaand)} per maand` : "",
    t.eenmalig > 0 ? `${euro(t.eenmalig)} eenmalig` : "",
  ].filter(Boolean);
  return delen.length ? delen.join(" + ") : null;
}

function termijnTekst(dagen: number): string {
  if (dagen <= 0) return "verloopt vandaag";
  if (dagen === 1) return "verloopt morgen";
  return `verloopt over ${dagen} dagen`;
}

function dagenTot(vandaag: string, datum: string): number {
  return Math.round((Date.parse(`${datum}T00:00:00Z`) - Date.parse(`${vandaag}T00:00:00Z`)) / DAG);
}

function laatsteMail(id: string, verstuurd: string | null, gemaild: Map<string, string> | undefined): string | null {
  const g = gemaild?.get(id) ?? null;
  if (!verstuurd) return g;
  if (!g) return verstuurd;
  return g > verstuurd ? g : verstuurd;
}

/* ---------- de regels ---------- */

/**
 * Een verstuurd stuk (offerte, brochure of contract) dat de klant nog niet
 * getekend heeft: warm, bekeken, stil of niet geopend. Null als het (nog)
 * geen actie vraagt.
 */
function betrokkenheid(
  r: { id: string; verstuurd_at: string | null; created_at: string; bekeken_at: string | null; laatst_bekeken_at: string | null; aantal_bekeken: number },
  opties: { bekeken: number; nietGeopend: number; houdbaar: number; stil: boolean },
  gemaild: Map<string, string> | undefined,
  nu: Date
): { reden: "bekeken" | "stil" | "niet-geopend"; warm: boolean; at: string; tekst: string } | null {
  const eerst = r.verstuurd_at ?? r.created_at;
  if (dagenSinds(eerst, nu) > opties.houdbaar) return null;
  const mail = laatsteMail(r.id, r.verstuurd_at, gemaild) ?? eerst;
  const netGemaild = dagenSinds(mail, nu) < DREMPELS.netGemaild;

  if (r.bekeken_at) {
    const laatst = r.laatst_bekeken_at ?? r.bekeken_at;
    const tekst = bekekenTekst(Math.max(1, r.aantal_bekeken), laatst, nu);
    if (dagenSinds(laatst, nu) <= opties.bekeken) {
      return { reden: "bekeken", warm: urenSinds(laatst, nu) <= DREMPELS.warmUren, at: laatst, tekst };
    }
    if (!opties.stil || netGemaild) return null;
    return { reden: "stil", warm: false, at: laatst, tekst };
  }
  if (netGemaild || dagenSinds(mail, nu) < opties.nietGeopend) return null;
  // Al een herinnering gestuurd: dan staat die erbij, anders lijkt het alsof er nog niets gebeurd is.
  const herinnerd = mail > eerst && dagenSinds(eerst, nu) - dagenSinds(mail, nu) >= 1;
  return {
    reden: "niet-geopend", warm: false, at: mail,
    tekst: `verstuurd ${geleden(eerst, nu)}${herinnerd ? `, herinnering ${geleden(mail, nu)}` : ""}`,
  };
}

function offerteSignaal(o: OfferteRij, i: Invoer, nu: Date, vandaag: string): Signaal | null {
  if (o.status !== "verstuurd") return null;
  const waarde = waardeTekst(waardeVan(o));
  const basis = {
    key: `offerte-${o.id}`, soort: "offerte" as const, id: o.id, bedrijf: o.bedrijf,
    contactpersoon: o.contactpersoon, telefoon: o.telefoon, href: `/admin/offertes/${o.id}`,
    termijn: null, opSite: null,
  };
  const kop = `Offerte ${o.nummer}`;

  if (weergaveVan(o, vandaag) === "verlopen") {
    const verlopen = -dagenTot(vandaag, o.geldig_tot!);
    if (verlopen > DREMPELS.verlopenTot) return null;
    return {
      ...basis, reden: "verlopen", label: "Verlopen", toon: "let-op", gewicht: 62,
      details: [kop, `geldig tot ${datumLang(o.geldig_tot)}`, "verleng hem of vraag na waarom"],
      at: `${o.geldig_tot}T00:00:00Z`,
    };
  }

  const tot = o.geldig_tot ? dagenTot(vandaag, o.geldig_tot) : null;
  const loopt = tot !== null && tot <= DREMPELS.verlooptBinnen;
  const b = betrokkenheid(o, { bekeken: DREMPELS.bekeken, nietGeopend: DREMPELS.nietGeopend, houdbaar: DREMPELS.houdbaar, stil: true }, i.gemaild, nu);
  // Loopt de geldigheid af, dan telt dat ook als er verder niets gebeurt.
  if (!b && !loopt) return null;

  const termijn = loopt ? termijnTekst(tot!) : null;
  const plus = loopt ? 12 : 0;
  const details = (t: string, ...rest: (string | null)[]) => [kop, t, ...rest].filter((s): s is string => Boolean(s));

  if (b?.reden === "bekeken" && o.keuze_at) {
    // De klant klikte zelf onderdelen aan en keek deze week nog: hij is aan het rekenen. Het warmste signaal.
    return {
      ...basis, reden: "gekozen", label: "Koos onderdelen", toon: "warm",
      gewicht: (b.warm ? 97 : 90) + plus, details: details(b.tekst, waarde), termijn, at: b.at,
    };
  }
  if (b?.reden === "bekeken") {
    return {
      ...basis, reden: "bekeken", label: b.warm ? "Net bekeken" : "Bekeken", toon: b.warm ? "warm" : "let-op",
      gewicht: (b.warm ? 88 : 72) + plus, details: details(b.tekst, waarde), termijn, at: b.at,
    };
  }
  if (b?.reden === "stil") {
    return {
      ...basis, reden: "stil", label: "Daarna stil", toon: "let-op",
      gewicht: (o.keuze_at ? 60 : 56) + plus,
      details: details(b.tekst, o.keuze_at ? "koos al onderdelen" : null, waarde, "bel even na"), termijn, at: b.at,
    };
  }
  if (b?.reden === "niet-geopend") {
    return {
      ...basis, reden: "niet-geopend", label: "Niet geopend", toon: loopt ? "let-op" : "info",
      gewicht: 46 + Math.min(10, Math.floor(dagenSinds(b.at, nu))) + plus,
      details: details(b.tekst, waarde, "stuur een herinnering"), termijn, at: b.at,
    };
  }
  // Alleen de termijn: net gemaild of al lang verstuurd, maar hij loopt nu af.
  return {
    ...basis, reden: "verloopt", label: "Loopt af", toon: "let-op", gewicht: 60,
    details: details(o.bekeken_at ? bekekenTekst(Math.max(1, o.aantal_bekeken), o.laatst_bekeken_at ?? o.bekeken_at, nu) : "nog niet geopend", waarde),
    termijn, at: o.verstuurd_at ?? o.created_at,
  };
}

function zonderContractSignaal(o: OfferteRij, contracten: ContractRij[], nu: Date): Signaal | null {
  if (o.status !== "getekend" || !o.getekend_at) return null;
  if (!MET_BASISCONTRACT.has(VORMEN[o.vorm]?.groep ?? "Verzuim")) return null;
  if (dagenSinds(o.getekend_at, nu) > DREMPELS.zonderContract) return null;
  const sleutels = new Set(klantSleutels(o));
  // Alleen basiscontracten: een resellerovereenkomst (0033) is een afspraak met een partner, niet met deze klant.
  const bijKlant = contracten.filter(
    (c) => soortVan(c) === "basiscontract" && (c.offerte_id === o.id || zelfde(klantSleutels(c), sleutels))
  );
  // Een verstuurd of getekend contract volstaat: één basiscontract dekt alle offertes van die klant.
  if (bijKlant.some((c) => c.status === "verstuurd" || c.status === "getekend")) return null;
  const concept = bijKlant.find((c) => c.status === "concept");
  return {
    key: `zonder-contract-${o.id}`, soort: "offerte", id: o.id, bedrijf: o.bedrijf,
    contactpersoon: o.contactpersoon, telefoon: o.telefoon,
    href: concept ? `/admin/contracten/${concept.id}` : `/admin/contracten/nieuw?offerte=${o.id}`,
    reden: "zonder-contract", label: "Getekend", toon: "goed", gewicht: 78,
    details: [
      `Offerte ${o.nummer} getekend ${geleden(o.getekend_at, nu)}`,
      concept ? "het basiscontract staat klaar, nog niet verstuurd" : "stuur het basiscontract",
    ],
    termijn: null, opSite: null, at: o.getekend_at,
  };
}

function brochureSignaal(b: BrochureRij, offertes: OfferteRij[], i: Invoer, nu: Date): Signaal | null {
  if (b.status !== "verstuurd") return null;
  // Is er sindsdien een offerte voor deze klant (ook een concept: dan is sales er al mee bezig)?
  const sleutels = new Set(klantSleutels(b));
  const sinds = b.verstuurd_at ?? b.created_at;
  if (offertes.some((o) => o.status !== "ingetrokken" && o.created_at >= sinds.slice(0, 10) && zelfde(klantSleutels(o), sleutels))) return null;

  const r = betrokkenheid(
    b,
    { bekeken: DREMPELS.brochureBekeken, nietGeopend: DREMPELS.brochureNietGeopend, houdbaar: DREMPELS.brochureHoudbaar, stil: false },
    i.gemaild,
    nu
  );
  if (!r) return null;
  const basis = {
    key: `brochure-${b.id}`, soort: "brochure" as const, id: b.id, bedrijf: b.bedrijf,
    contactpersoon: b.contactpersoon, telefoon: b.telefoon, href: `/admin/brochures/${b.id}`,
    termijn: null, opSite: null, at: r.at,
  };
  if (r.reden === "bekeken") {
    return {
      ...basis, reden: "brochure-bekeken", label: "Brochure bekeken", toon: r.warm ? "warm" : "let-op",
      gewicht: r.warm ? 84 : 64, details: [`Brochure ${b.nummer}`, r.tekst, "nog geen offerte"],
    };
  }
  return {
    ...basis, reden: "niet-geopend", label: "Niet geopend", toon: "info", gewicht: 36,
    details: [`Brochure ${b.nummer}`, r.tekst, "stuur een herinnering"],
  };
}

function contractSignaal(c: ContractRij, i: Invoer, nu: Date, vandaag: string): Signaal | null {
  const basis = {
    key: `contract-${c.id}`, soort: "contract" as const, id: c.id, bedrijf: c.bedrijf,
    contactpersoon: c.contactpersoon, telefoon: c.telefoon, href: `/admin/contracten/${c.id}`,
    termijn: null, opSite: null,
  };
  const kop = `${CONTRACT_SOORT[soortVan(c)].naam} ${c.nummer}`;

  if (c.status === "getekend") {
    // Alleen een basiscontract heeft een einddatum; een resellerovereenkomst loopt voor onbepaalde tijd.
    if (soortVan(c) !== "basiscontract" || !c.ingangsdatum || !c.einddatum) return null;
    const n = looptijdNu(c.ingangsdatum, c.einddatum, vandaag);
    const tot = dagenTot(vandaag, n.opzeggenUiterlijk);
    if (tot < 0 || tot > DREMPELS.opzeggenBinnen) return null;
    const dringend = tot <= DREMPELS.opzeggenDringend;
    return {
      ...basis, reden: "opzeggen", label: "Opzegdatum nadert", toon: dringend ? "let-op" : "info",
      gewicht: dringend ? 58 : 40,
      details: [kop, `loopt tot ${datumLang(n.periodeEinde)}`, "tijd voor een evaluatiegesprek"],
      termijn: tot === 0 ? "laatste opzegdag vandaag" : `laatste opzegdag over ${tot} dag${tot === 1 ? "" : "en"}`,
      at: `${n.opzeggenUiterlijk}T00:00:00Z`,
    };
  }
  if (c.status !== "verstuurd") return null;

  const r = betrokkenheid(c, { bekeken: DREMPELS.bekeken, nietGeopend: DREMPELS.nietGeopend, houdbaar: DREMPELS.houdbaar, stil: true }, i.gemaild, nu);
  if (!r) return null;
  if (r.reden === "bekeken") {
    return {
      ...basis, reden: "bekeken", label: r.warm ? "Net bekeken" : "Bekeken", toon: r.warm ? "warm" : "let-op",
      gewicht: r.warm ? 86 : 70, details: [kop, r.tekst, "nog niet getekend"], at: r.at,
    };
  }
  if (r.reden === "stil") {
    return {
      ...basis, reden: "stil", label: "Daarna stil", toon: "let-op", gewicht: 54,
      details: [kop, r.tekst, "nog niet getekend"], at: r.at,
    };
  }
  return {
    ...basis, reden: "niet-geopend", label: "Niet geopend", toon: "info",
    gewicht: 44 + Math.min(10, Math.floor(dagenSinds(r.at, nu))),
    details: [kop, r.tekst, "stuur een herinnering"], at: r.at,
  };
}

/** Wie er recent op de site was, als "Op de site 2 uur geleden", met een duwtje in gewicht. */
function metBezoek(s: Signaal, sleutels: string[], bezoek: Bezoeker[] | undefined, nu: Date): Signaal {
  if (!bezoek?.length || s.reden === "zonder-contract") return s;
  const eigen = new Set(sleutels);
  const hit = bezoek
    .filter((b) => {
      const naam = normalizeName(b.naam);
      return (naam && eigen.has(`naam:${naam}`)) || (b.domein && eigen.has(`domein:${b.domein.toLowerCase()}`));
    })
    .sort((a, b) => b.laatst.localeCompare(a.laatst))[0];
  if (!hit) return s;
  const recent = urenSinds(hit.laatst, nu) <= DREMPELS.opSiteUren;
  return {
    ...s,
    opSite: `Op de site ${geleden(hit.laatst, nu)}${hit.paginas > 1 ? `, ${hit.paginas} pagina's` : ""}`,
    gewicht: s.gewicht + (recent ? 8 : 3),
    toon: recent && s.toon === "info" ? "let-op" : s.toon,
  };
}

/** Alle signalen, belangrijkste eerst; bij gelijk gewicht wat het laatst gebeurde. */
export function opvolgen(i: Invoer, nu = new Date()): Signaal[] {
  const vandaag = datumOver(0, nu);
  const uit: Signaal[] = [];
  const voeg = (s: Signaal | null, k: { bedrijf: string; email?: string | null }) => {
    if (s) uit.push(metBezoek(s, klantSleutels(k), i.bezoek, nu));
  };
  for (const o of i.offertes) {
    voeg(offerteSignaal(o, i, nu, vandaag), o);
    voeg(zonderContractSignaal(o, i.contracten, nu), o);
  }
  for (const b of i.brochures) voeg(brochureSignaal(b, i.offertes, i, nu), b);
  for (const c of i.contracten) voeg(contractSignaal(c, i, nu, vandaag), c);
  return uit.sort((a, b) => b.gewicht - a.gewicht || b.at.localeCompare(a.at));
}

/* ---------- de cijfers ---------- */

/**
 * Het slagingspercentage: van de offertes die in de periode verstuurd zijn en
 * inmiddels afgerond (getekend, niet akkoord of verlopen), het deel dat getekend
 * is. Gedeeld met /admin/offertes, zodat beide hetzelfde getal laten zien.
 */
export function hitrate<T extends { w: string; o: { verstuurd_at: string | null } }>(lijst: T[], sinds: string) {
  const recent = lijst.filter(({ o }) => o.verstuurd_at && o.verstuurd_at.slice(0, 10) >= sinds);
  const getekend = recent.filter(({ w }) => w === "getekend");
  const afgerond = recent.filter(({ w }) => w === "getekend" || w === "afgewezen" || w === "verlopen");
  return { getekend, afgerond, procent: afgerond.length ? Math.round((getekend.length / afgerond.length) * 100) : null };
}

export type Verkoopcijfers = {
  open: { aantal: number; bekeken: number; perMaand: number; eenmalig: number };
  getekend30: { aantal: number; perMaand: number; eenmalig: number };
  hitrate: { procent: number | null; getekend: number; afgerond: number };
  contracten: { getekend: number; wacht: number };
};

/** De vier getallen boven de opvolglijst. */
export function verkoopcijfers(offertes: OfferteRij[], contracten: ContractRij[], nu = new Date()): Verkoopcijfers {
  const vandaag = datumOver(0, nu);
  const alle = offertes.map((o) => ({ o, w: weergaveVan(o, vandaag), t: waardeVan(o) }));
  const som = (l: typeof alle, k: "perMaand" | "eenmalig") => Math.round(l.reduce((s, r) => s + r.t[k], 0) * 100) / 100;
  const open = alle.filter(({ w }) => w === "verstuurd" || w === "bekeken");
  const sinds30 = datumOver(-30, nu);
  const getekend30 = alle.filter(({ o, w }) => w === "getekend" && o.getekend_at && o.getekend_at.slice(0, 10) >= sinds30);
  const h = hitrate(alle, datumOver(-90, nu));
  const basis = contracten.filter((c) => soortVan(c) === "basiscontract");
  return {
    open: { aantal: open.length, bekeken: open.filter(({ w }) => w === "bekeken").length, perMaand: som(open, "perMaand"), eenmalig: som(open, "eenmalig") },
    getekend30: { aantal: getekend30.length, perMaand: som(getekend30, "perMaand"), eenmalig: som(getekend30, "eenmalig") },
    hitrate: { procent: h.procent, getekend: h.getekend.length, afgerond: h.afgerond.length },
    contracten: {
      getekend: basis.filter((c) => c.status === "getekend").length,
      wacht: basis.filter((c) => c.status === "verstuurd").length,
    },
  };
}
