/**
 * De klantenlijst en de stamkaart (migratie 0048): de regels achter
 * /admin/klanten en /admin/klanten/<id>.
 *
 * Puur, zonder database: welke velden de stamkaart heeft en hoe ze gecontroleerd
 * worden, wat de andere modules al over een klant weten (het voorstel waarmee
 * lege velden gevuld worden, zodat niemand dubbel typt), alle documenten van
 * een klant uit alle modules in één lijst, de tariefafspraken uit getekende
 * offertes en losse opdrachten, en de afwijkende afspraken daarbuiten. De
 * schermen eromheen zijn dun; dit is wat getest wordt (stamkaart.test.ts).
 */
import type { Brochure } from "./brochures";
import type { Contract } from "./contracten";
import type { Evaluatie } from "./evaluatie";
import type { KlantBestand } from "./klantBestanden";
import type { LosseOpdracht } from "./losseOpdrachten";
import type { Onboarding } from "./onboarding";

import { BROCHURE_WEERGAVE, brochureWeergave } from "./brochures";
import { isProviderDomain, registrableDomain } from "./companies";
import { CONTRACT_WEERGAVE, contractWeergave } from "./contracten";
import { EVALUATIE_WEERGAVE, evaluatieWeergave } from "./evaluatie";
import { bestandSoortLabel } from "./klantBestanden";
import {
  bedrijfSleutel, isDatum, schoonBtw, schoonIban, schoonKvk, schoonPostcode, schoonWebsite, statusInfo, zoekKlanten, type Klant, type KlantStatus, type StamkaartVelden,
} from "./klanten";

// De schoonmaak van KvK, IBAN, postcode, website en btw staat in klanten.ts (ook de import van de klantlijst gebruikt ze).
export { schoonBtw, schoonIban, schoonKvk, schoonPostcode, schoonWebsite } from "./klanten";
import { losLabel } from "./losseOpdrachten";
import { MERKEN, type Merk } from "./offerteMerk";
import {
  berekenTotalen, DIENSTLABEL, EENHEDEN, eenheidVan, euro, herstelKeuze, isVorm, normaliseerRegels, WEERGAVE, weergaveVan,
  type Eenheid, type Offerte, type Regel,
} from "./offertes";
import { ONBOARDING_WEERGAVE, onboardingWeergave } from "./onboarding";

/* ---------- de velden ---------- */

export type StamkaartVeld = keyof StamkaartVelden | "contactpersoon" | "telefoon" | "email" | "eigenaar" | "startdatum";

export type VeldDef = {
  key: StamkaartVeld;
  label: string;
  type?: "text" | "email" | "tel" | "url" | "number" | "date";
  max: number;
  /** Half zo breed in het formulier. */
  half?: boolean;
  hint?: string;
  /** Met een kopieerknop op de stamkaart (KvK, IBAN, e-mail). */
  kopieer?: boolean;
  /** Telt mee voor de volledigheid: zonder dit veld is de stamkaart niet af. */
  kern?: boolean;
};

export type VeldGroep = { key: "bedrijf" | "adres" | "contact" | "facturatie" | "react2u"; titel: string; uitleg: string; velden: VeldDef[] };

/** De stamkaart in vijf blokken; de volgorde is die op het scherm en in het formulier. */
export const STAMKAART: VeldGroep[] = [
  {
    key: "bedrijf",
    titel: "Bedrijf",
    uitleg: "Wie de klant is volgens de Kamer van Koophandel.",
    velden: [
      { key: "kvk", label: "KvK-nummer", max: 8, half: true, kopieer: true, kern: true, hint: "Acht cijfers" },
      { key: "rechtsvorm", label: "Rechtsvorm", max: 60, half: true, hint: "Bijvoorbeeld B.V. of eenmanszaak" },
      { key: "branche", label: "Branche", max: 120, half: true },
      { key: "sbi", label: "SBI-code", max: 60, half: true },
      { key: "website", label: "Website", type: "url", max: 200, half: true },
      { key: "medewerkers", label: "Aantal werknemers", type: "number", max: 6, half: true },
      { key: "algemeen_telefoon", label: "Algemeen telefoonnummer", type: "tel", max: 40, half: true },
      { key: "algemeen_email", label: "Algemeen e-mailadres", type: "email", max: 254, half: true },
    ],
  },
  {
    key: "adres",
    titel: "Adres",
    uitleg: "Waar de klant zit en waar de post heen moet.",
    velden: [
      { key: "bezoekadres", label: "Bezoekadres", max: 200, kern: true, hint: "Straat en huisnummer" },
      { key: "bezoek_postcode", label: "Postcode", max: 12, half: true, kern: true },
      { key: "bezoek_plaats", label: "Plaats", max: 100, half: true, kern: true },
      { key: "postadres", label: "Postadres", max: 200, hint: "Alleen als het afwijkt van het bezoekadres" },
      { key: "post_postcode", label: "Postcode", max: 12, half: true },
      { key: "post_plaats", label: "Plaats", max: 100, half: true },
    ],
  },
  {
    key: "contact",
    titel: "Contactpersoon",
    uitleg: "Ons aanspreekpunt bij de klant; zo staat hij ook op de kaart op het bord.",
    velden: [
      { key: "contactpersoon", label: "Naam", max: 200, half: true, kern: true },
      { key: "contact_functie", label: "Functie", max: 120, half: true },
      { key: "telefoon", label: "Telefoon", type: "tel", max: 40, half: true, kern: true },
      { key: "email", label: "E-mail", type: "email", max: 254, half: true, kopieer: true, kern: true },
    ],
  },
  {
    key: "facturatie",
    titel: "Facturatie",
    uitleg: "Waar de factuur heen gaat en wie mag tekenen.",
    velden: [
      { key: "factuur_email", label: "E-mailadres voor facturen", type: "email", max: 254, kopieer: true, kern: true },
      { key: "btw", label: "Btw-nummer", max: 30, half: true },
      { key: "debiteurnummer", label: "Debiteurnummer", max: 40, half: true, hint: "In Exact" },
      { key: "iban", label: "IBAN", max: 40, half: true, kopieer: true },
      { key: "iban_naam", label: "Tenaamstelling", max: 120, half: true },
      { key: "ondertekenaar", label: "Bevoegd ondertekenaar", max: 200, half: true },
      { key: "ondertekenaar_functie", label: "Functie ondertekenaar", max: 120, half: true },
    ],
  },
  {
    key: "react2u",
    titel: "Bij React2u",
    uitleg: "Wie de klant bij ons heeft en sinds wanneer.",
    velden: [
      { key: "eigenaar", label: "Eigenaar (sales)", max: 80, half: true, hint: "Wie de klant binnenhaalde en opvolgt" },
      { key: "casemanager", label: "Casemanager", max: 120, half: true },
      { key: "startdatum", label: "Startdatum", type: "date", max: 10, half: true },
    ],
  },
];

export const STAMKAART_VELDEN: VeldDef[] = STAMKAART.flatMap((g) => g.velden);

export function veldDef(key: StamkaartVeld): VeldDef {
  return STAMKAART_VELDEN.find((v) => v.key === key) || STAMKAART_VELDEN[0];
}

export function isStamkaartVeld(s: unknown): s is StamkaartVeld {
  return typeof s === "string" && STAMKAART_VELDEN.some((v) => v.key === s);
}

/** Alles wat de stamkaart aan tekst en getallen heeft, als strings voor een formulier. */
export type StamkaartInvoer = Partial<Record<StamkaartVeld, string | number | null>>;

const leeg = (w: unknown): boolean => w === null || w === undefined || String(w).trim() === "";

/** De waarde van een veld op de kaart, als tekst ("" als hij leeg is). */
export function veldWaarde(k: Klant, veld: StamkaartVeld): string {
  const w = (k as Record<string, unknown>)[veld];
  return leeg(w) ? "" : String(w);
}

/* ---------- controle ---------- */

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * De invoer van de stamkaart schoon en binnen de grenzen van de database; een
 * fout in woorden als iets niet kan. Alleen velden die in `invoer` staan komen
 * terug; een leeg veld wordt null (leegmaken mag).
 */
export function schoonStamkaart(invoer: StamkaartInvoer): { velden: Partial<Klant>; fout?: string } {
  const v: Record<string, unknown> = {};
  for (const def of STAMKAART_VELDEN) {
    if (!(def.key in invoer)) continue;
    const ruw = invoer[def.key];
    if (leeg(ruw)) {
      v[def.key] = null;
      continue;
    }
    const t = String(ruw).trim().replace(/\s+/g, " ");
    switch (def.key) {
      case "kvk": {
        const k = schoonKvk(t);
        if (!k) return { velden: {}, fout: "Een KvK-nummer heeft acht cijfers." };
        v.kvk = k;
        break;
      }
      case "iban": {
        const i = schoonIban(t);
        if (!i) return { velden: {}, fout: "Het IBAN klopt niet; controleer de cijfers." };
        v.iban = i;
        break;
      }
      case "website": {
        const w = schoonWebsite(t);
        if (!w) return { velden: {}, fout: "De website klopt niet (bijvoorbeeld react2u.nl)." };
        v.website = w.slice(0, def.max);
        break;
      }
      case "btw":
        v.btw = schoonBtw(t).slice(0, def.max);
        break;
      case "bezoek_postcode":
      case "post_postcode":
        v[def.key] = schoonPostcode(t).slice(0, def.max);
        break;
      case "email":
      case "algemeen_email":
      case "factuur_email": {
        const e = t.toLowerCase();
        if (!EMAIL.test(e)) return { velden: {}, fout: `${def.label}: het e-mailadres klopt niet.` };
        v[def.key] = e.slice(0, def.max);
        break;
      }
      case "medewerkers": {
        const n = Number(t.replace(/\./g, ""));
        if (!Number.isInteger(n) || n < 0 || n > 100000) return { velden: {}, fout: "Het aantal werknemers is een heel getal." };
        v.medewerkers = n;
        break;
      }
      case "startdatum":
        if (!isDatum(t)) return { velden: {}, fout: "De startdatum klopt niet." };
        v.startdatum = t;
        break;
      default:
        v[def.key] = t.slice(0, def.max);
    }
  }
  return { velden: v as Partial<Klant> };
}

/* ---------- volledigheid ---------- */

export type Volledigheid = { ingevuld: number; totaal: number; ontbreekt: string[] };

/** Hoe compleet de stamkaart is: de kernvelden (KvK, adres, contactpersoon met telefoon en mail, factuur-e-mail). */
export function stamkaartVolledigheid(k: Klant): Volledigheid {
  const kern = STAMKAART_VELDEN.filter((v) => v.kern);
  const ontbreekt = kern.filter((v) => !veldWaarde(k, v.key)).map((v) => (v.key === "bezoek_postcode" || v.key === "bezoek_plaats" ? "" : v.label)).filter(Boolean);
  const ingevuld = kern.filter((v) => veldWaarde(k, v.key)).length;
  return { ingevuld, totaal: kern.length, ontbreekt: [...new Set(ontbreekt)] };
}

/* ---------- de lijst ---------- */

/**
 * Wie in de klantenlijst hoort (Rens, 19 nov 2026: "alleen echte klanten,
 * leads staan op het bord"): de kolommen vanaf Akkoord, zoals zijn
 * klantlijst.xlsx (offerte retour, contract retour, ingericht). Leads,
 * gesprekken en openstaande offertes blijven op het bord.
 */
export const KLANT_STATUSSEN: KlantStatus[] = ["akkoord", "inrichten", "klant"];

/**
 * Een echte klant: akkoord of verder. Een inactieve kaart telt alleen mee als
 * hij ooit klant was (een contract retour, een koppeling, facturatie of een
 * startdatum); een verloren lead die op inactief staat niet.
 */
export function isEchteKlant(k: Pick<Klant, "status" | "contract_retour" | "koppeling" | "facturatie" | "startdatum">): boolean {
  if (KLANT_STATUSSEN.includes(k.status)) return true;
  if (k.status === "inactief") return Boolean(k.contract_retour || k.koppeling || k.facturatie || k.startdatum);
  return false;
}

/** De kaarten van het bord die in de klantenlijst horen. */
export function echteKlanten<T extends Pick<Klant, "status" | "contract_retour" | "koppeling" | "facturatie" | "startdatum">>(klanten: T[]): T[] {
  return klanten.filter(isEchteKlant);
}

export type LijstFilter = { q: string; status: KlantStatus | "alle"; inactief: boolean };

/**
 * De klantenlijst: zoeken (zoals op het bord, plus KvK, plaats, casemanager en
 * website), een kolom van het bord als filter, en gestopte klanten (inactief)
 * alleen op verzoek. Verwacht de kaarten uit `echteKlanten`.
 */
export function filterKlantenlijst<T extends Klant>(klanten: T[], f: LijstFilter): T[] {
  const woorden = f.q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/).filter(Boolean);
  let lijst = f.q.trim()
    ? klanten.filter((k) => {
        const basis = zoekKlanten([k], f.q).length > 0;
        if (basis) return true;
        const extra = [k.kvk, k.bezoek_plaats, k.post_plaats, k.casemanager, k.website, k.contact_functie, k.debiteurnummer].map((x) => (x || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")).join(" ");
        return woorden.every((w) => extra.includes(w));
      })
    : klanten;
  if (f.status !== "alle") lijst = lijst.filter((k) => k.status === f.status);
  else if (!f.inactief) lijst = lijst.filter((k) => k.status !== "inactief");
  return lijst;
}

export type LijstSortering = "bedrijf" | "status" | "contact" | "casemanager" | "laatste" | "volledig";

export function sorteerKlantenlijst<T extends Klant>(klanten: T[], op: LijstSortering, oplopend: boolean): T[] {
  const waarde = (k: T): string | number => {
    switch (op) {
      case "bedrijf": return k.bedrijf.toLowerCase();
      case "status": return ["lead", "gesprek", "offerte", "akkoord", "inrichten", "klant", "inactief"].indexOf(k.status);
      case "contact": return (k.contactpersoon || "zzzz").toLowerCase();
      case "casemanager": return (k.casemanager || k.eigenaar || "zzzz").toLowerCase();
      case "laatste": return k.laatste_contact_op || k.updated_at.slice(0, 10);
      case "volledig": return stamkaartVolledigheid(k).ingevuld;
    }
  };
  return [...klanten].sort((a, b) => {
    const x = waarde(a);
    const y = waarde(b);
    const r = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "nl");
    return (oplopend ? r : -r) || a.bedrijf.localeCompare(b.bedrijf, "nl");
  });
}

/* ---------- het voorstel: wat de modules al weten ---------- */

export type Voorstel = {
  veld: StamkaartVeld;
  waarde: string;
  /** Waar het vandaan komt, in woorden: "offerte O2026-0012", "contract C2026-0003", "onboarding", "bellijst", "het e-mailadres". */
  bron: string;
  href: string | null;
};

type OfferteBron = Pick<Offerte, "id" | "nummer" | "status" | "bedrijf" | "contactpersoon" | "email" | "telefoon" | "medewerkers" | "factuur" | "getekend_inhoud" | "getekend_naam" | "getekend_functie" | "getekend_at" | "verstuurd_at" | "created_at">;
type ContractBron = Pick<Contract, "id" | "nummer" | "status" | "soort" | "bedrijf" | "contactpersoon" | "email" | "telefoon" | "opdrachtgever" | "getekend_naam" | "getekend_functie" | "getekend_at" | "ingangsdatum" | "created_at">;
type OnboardingBron = Pick<Onboarding, "id" | "nummer" | "status" | "bedrijf" | "contactpersoon" | "email" | "telefoon" | "antwoorden" | "casemanager" | "debiteurnummer" | "created_at">;
type LeadBron = { id: string; name: string; company: string | null; phone: string | null; email: string | null };

export type StamkaartBronnen = {
  offertes: OfferteBron[];
  contracten: ContractBron[];
  onboardings: OnboardingBron[];
  leads: LeadBron[];
  /** Bedrijven uit de bedrijfsherkenning (Bezoek → Bedrijven): naam en domein, voor de website. */
  bedrijven: { name: string; domain: string | null }[];
};

const vanKlant = <T extends { bedrijf: string }>(lijst: T[], sleutel: string) => lijst.filter((x) => bedrijfSleutel(x.bedrijf) === sleutel);

/** Een adres bij een webmaildienst zegt niets over de website van het bedrijf. */
const WEBMAIL = new Set(["gmail.com", "googlemail.com", "hotmail.com", "hotmail.nl", "outlook.com", "live.nl", "live.com", "msn.com", "yahoo.com", "yahoo.nl", "icloud.com", "me.com", "ziggo.nl", "kpnmail.nl", "home.nl", "planet.nl", "hetnet.nl", "xs4all.nl", "online.nl", "telfort.nl", "upcmail.nl", "chello.nl", "casema.nl", "quicknet.nl", "zonnet.nl", "tele2.nl", "freedom.nl", "protonmail.com", "proton.me"]);
const nieuwsteEerst = <T extends { created_at: string }>(lijst: T[]) => [...lijst].sort((a, b) => b.created_at.localeCompare(a.created_at));

/**
 * Voor elk leeg veld van de stamkaart wat de modules erover weten, de meest
 * betrouwbare bron eerst: een getekende offerte of getekend contract boven een
 * concept, de onboarding (daar vulde de klant het zelf in) boven de offerte
 * voor facturatie, de bellijst als laatste. Alleen velden die nu leeg zijn.
 */
export function voorstelStamkaart(k: Klant, bronnen: StamkaartBronnen): Voorstel[] {
  const sleutel = k.sleutel || bedrijfSleutel(k.bedrijf);
  const kandidaten = new Map<StamkaartVeld, Voorstel>();
  const zet = (veld: StamkaartVeld, waarde: unknown, bron: string, href: string | null) => {
    if (leeg(waarde) || kandidaten.has(veld) || veldWaarde(k, veld)) return;
    kandidaten.set(veld, { veld, waarde: String(waarde).trim(), bron, href });
  };

  const getekendEerst = <T extends { created_at: string; status: string }>(lijst: T[]) =>
    [...nieuwsteEerst(lijst)].sort((a, b) => Number(b.status === "getekend") - Number(a.status === "getekend"));

  const contracten = getekendEerst(vanKlant(bronnen.contracten, sleutel).filter((c) => c.status !== "ingetrokken" && (c.soort ?? "basiscontract") !== "reseller"));
  const offertes = getekendEerst(vanKlant(bronnen.offertes, sleutel).filter((o) => o.status !== "ingetrokken"));
  const onboardings = nieuwsteEerst(vanKlant(bronnen.onboardings, sleutel).filter((o) => o.status !== "ingetrokken"));

  // Het contract: de opdrachtgever zoals hij in het getekende contract staat.
  for (const c of contracten) {
    const bron = `contract ${c.nummer}`;
    const href = `/admin/contracten/${c.id}`;
    const g = c.opdrachtgever || {};
    zet("kvk", g.kvk && schoonKvk(g.kvk), bron, href);
    zet("bezoekadres", g.adres, bron, href);
    zet("bezoek_postcode", g.postcode && schoonPostcode(g.postcode), bron, href);
    zet("bezoek_plaats", g.plaats, bron, href);
    zet("contactpersoon", c.contactpersoon, bron, href);
    zet("email", c.email, bron, href);
    zet("telefoon", c.telefoon, bron, href);
    if (c.status === "getekend") {
      zet("ondertekenaar", c.getekend_naam, bron, href);
      zet("ondertekenaar_functie", c.getekend_functie, bron, href);
    }
    zet("startdatum", c.ingangsdatum, bron, href);
  }

  // De onboarding: wat de klant zelf invulde bij Inrichting nieuwe klant.
  for (const o of onboardings) {
    const bron = `onboarding ${o.nummer}`;
    const href = `/admin/onboarding/${o.id}`;
    const i = (o.antwoorden?.inrichting?.data as Record<string, string> | undefined) || {};
    zet("kvk", i.kvk && schoonKvk(i.kvk), bron, href);
    zet("btw", i.btw && schoonBtw(i.btw), bron, href);
    zet("postadres", i.factuur_straat, bron, href);
    zet("post_postcode", i.factuur_postcode && schoonPostcode(i.factuur_postcode), bron, href);
    zet("post_plaats", i.factuur_plaats, bron, href);
    zet("factuur_email", i.factuur_email?.toLowerCase(), bron, href);
    zet("contactpersoon", i.contact_naam || o.contactpersoon, bron, href);
    zet("contact_functie", i.contact_functie, bron, href);
    zet("telefoon", i.contact_telefoon || o.telefoon, bron, href);
    zet("email", (i.contact_email || o.email || "").toLowerCase(), bron, href);
    zet("casemanager", o.casemanager, bron, href);
    zet("debiteurnummer", o.debiteurnummer, bron, href);
  }

  // De offerte: het aantal medewerkers, de factuurgegevens die de klant bij het tekenen gaf, en wie tekende.
  for (const o of offertes) {
    const bron = `offerte ${o.nummer}`;
    const href = `/admin/offertes/${o.id}`;
    const f = o.getekend_inhoud?.factuur || o.factuur || {};
    zet("medewerkers", o.getekend_inhoud?.medewerkers ?? o.medewerkers, bron, href);
    zet("kvk", f.kvk && schoonKvk(f.kvk), bron, href);
    zet("factuur_email", f.email?.toLowerCase(), bron, href);
    zet("postadres", f.adres, bron, href);
    zet("post_postcode", f.postcode && schoonPostcode(f.postcode), bron, href);
    zet("post_plaats", f.plaats, bron, href);
    zet("contactpersoon", o.contactpersoon, bron, href);
    zet("email", o.email?.toLowerCase(), bron, href);
    zet("telefoon", o.telefoon, bron, href);
    if (o.status === "getekend") {
      zet("ondertekenaar", o.getekend_naam, bron, href);
      zet("ondertekenaar_functie", o.getekend_functie, bron, href);
      // Tekende de contactpersoon zelf, dan is zijn functie bekend.
      if (o.getekend_naam && o.getekend_naam.trim().toLowerCase() === (k.contactpersoon || "").trim().toLowerCase()) zet("contact_functie", o.getekend_functie, bron, href);
    }
  }

  // De bellijst: de lead met dezelfde bedrijfsnaam.
  for (const l of bronnen.leads) {
    if (bedrijfSleutel(l.company) !== sleutel && bedrijfSleutel(l.name) !== sleutel) continue;
    const href = `/admin/bellijst?filter=alles#lead-${l.id}`;
    if (bedrijfSleutel(l.name) !== sleutel) zet("contactpersoon", l.name, "de bellijst", href);
    zet("telefoon", l.phone, "de bellijst", href);
    zet("email", l.email?.toLowerCase(), "de bellijst", href);
  }

  // De website: het domein uit de bedrijfsherkenning, of anders uit het e-mailadres (geen gmail en zo).
  const herkend = bronnen.bedrijven.find((b) => b.domain && bedrijfSleutel(b.name) === sleutel);
  if (herkend?.domain) zet("website", `https://${herkend.domain}`, "de bedrijfsherkenning", "/admin/bezoek/bedrijven");
  const mail = veldWaarde(k, "email") || kandidaten.get("email")?.waarde || veldWaarde(k, "factuur_email") || kandidaten.get("factuur_email")?.waarde;
  const domein = registrableDomain(mail?.split("@")[1]);
  if (domein && !isProviderDomain(domein) && !WEBMAIL.has(domein)) zet("website", `https://${domein}`, "het e-mailadres", null);

  return STAMKAART_VELDEN.map((v) => kandidaten.get(v.key)).filter((x): x is Voorstel => Boolean(x));
}

/* ---------- documenten ---------- */

export type DocumentSoort = "brochure" | "offerte" | "contract" | "checklist" | "onboarding" | "machtiging" | "overdracht" | "evaluatie" | "reseller" | "bestand";

export const DOCUMENT_SOORT_LABEL: Record<DocumentSoort, string> = {
  brochure: "Brochure",
  offerte: "Offerte",
  contract: "Basiscontract",
  checklist: "Checklist arbeidsomstandigheden",
  onboarding: "Onboarding",
  machtiging: "Machtiging",
  overdracht: "Opdracht tot overdracht",
  evaluatie: "Klantevaluatie",
  reseller: "Resellerovereenkomst",
  bestand: "Eigen bestand",
};

export type Stand = { label: string; kleur: string; achter: string };

export type KlantDocument = {
  key: string;
  soort: DocumentSoort;
  naam: string;
  /** "O2026-0012", of leeg bij een eigen bestand. */
  nummer: string | null;
  /** Het moment dat bij de stand hoort (getekend, ingevuld, verstuurd, anders aangemaakt). */
  datum: string | null;
  stand: Stand;
  /** In het beheer openen. */
  href: string | null;
  /** De pdf of het bestand downloaden. */
  pdf: string | null;
  /** Nog een link: "Zoals de klant hem ziet", "Verzuimprotocol". */
  extra: { label: string; href: string }[];
  /** Wie, waar dat iets zegt: wie tekende, wie uploadde. */
  door: string | null;
};

type OfferteDoc = Pick<Offerte, "id" | "nummer" | "status" | "bedrijf" | "vorm" | "verstuurd_at" | "bekeken_at" | "getekend_at" | "getekend_naam" | "afgewezen_at" | "geldig_tot" | "created_at">;
type ContractDoc = Pick<Contract, "id" | "nummer" | "status" | "soort" | "bedrijf" | "verstuurd_at" | "bekeken_at" | "getekend_at" | "getekend_naam" | "created_at">;
type OnboardingDoc = Pick<Onboarding, "id" | "nummer" | "status" | "bedrijf" | "documenten" | "taken" | "antwoorden" | "bekeken_at" | "verstuurd_at" | "afgerond_at" | "created_at"> & { vorige_arbodienst?: unknown };

export type DocumentBronnen = {
  brochures: Pick<Brochure, "id" | "nummer" | "token" | "status" | "bedrijf" | "verstuurd_at" | "bekeken_at" | "created_at">[];
  offertes: OfferteDoc[];
  contracten: ContractDoc[];
  checklists: { contract_id: string; door: string | null; ingevuld_at: string; bijgewerkt_at: string }[];
  onboardings: OnboardingDoc[];
  machtigingen: { id: string; onboarding_id: string; naam: string; status: "open" | "getekend"; uitgenodigd_at: string; getekend_at: string | null; overdracht_at: string | null }[];
  evaluaties: Pick<Evaluatie, "id" | "nummer" | "status" | "bedrijf" | "verstuurd_at" | "bekeken_at" | "ingevuld_at" | "ingevuld_door" | "created_at">[];
  bestanden: KlantBestand[];
};

const GRIJS: Stand = { label: "nog niet ingevuld", kleur: "#6b6a85", achter: "rgba(13,13,40,0.06)" };
const GROEN = { kleur: "#0a7a4b", achter: "#e3f6ed" };
const BLAUW = { kleur: "#0b6bcb", achter: "#e6f2ff" };

/**
 * Alle documenten van een klant uit alle modules, nieuwste eerst. Eén lijst:
 * brochures, offertes (concept, verstuurd of getekend, met de pdf), het
 * basiscontract met zijn checklist, de onboarding met de klantpagina, het
 * verzuimprotocol en de getekende machtigingen en opdracht tot overdracht,
 * de klantevaluaties, resellerovereenkomsten als de klant partner is, en de
 * eigen bestanden.
 */
export function documentenVoor(k: Pick<Klant, "sleutel" | "bedrijf">, b: DocumentBronnen, vandaag: string): KlantDocument[] {
  const sleutel = k.sleutel || bedrijfSleutel(k.bedrijf);
  const uit: KlantDocument[] = [];

  for (const x of vanKlant(b.brochures, sleutel)) {
    const w = brochureWeergave(x);
    uit.push({
      key: `brochure-${x.id}`, soort: "brochure", naam: `Brochure ${x.nummer}`, nummer: x.nummer, datum: x.bekeken_at || x.verstuurd_at || x.created_at,
      stand: BROCHURE_WEERGAVE[w], href: `/admin/brochures/${x.id}`, pdf: `/brochure/${x.token}/pdf?download=1`,
      extra: [{ label: "Klantweergave", href: `/brochure/${x.token}` }], door: null,
    });
  }

  for (const o of vanKlant(b.offertes, sleutel)) {
    const w = weergaveVan(o, vandaag);
    const vorm = isVorm(o.vorm) ? o.vorm : "verzuimbegeleiding";
    const getekend = o.status === "getekend";
    uit.push({
      key: `offerte-${o.id}`, soort: "offerte", naam: `Offerte ${DIENSTLABEL[vorm].replace(/^React2u\s+/, "")} ${o.nummer}`, nummer: o.nummer,
      datum: o.getekend_at || o.afgewezen_at || o.verstuurd_at || o.created_at, stand: WEERGAVE[w], href: `/admin/offertes/${o.id}`,
      pdf: getekend ? `/admin/offertevoorbeeld/${o.id}/pdf?download=1` : o.status === "ingetrokken" ? null : `/admin/offertevoorbeeld/${o.id}/concept?download=1`,
      extra: [{ label: getekend ? "Certificaat" : "Klantweergave", href: `/admin/offertevoorbeeld/${o.id}` }],
      door: getekend ? o.getekend_naam : null,
    });
  }

  const checklistVan = new Map(b.checklists.map((c) => [c.contract_id, c]));
  for (const c of vanKlant(b.contracten, sleutel)) {
    const reseller = (c.soort ?? "basiscontract") === "reseller";
    const w = contractWeergave(c);
    const getekend = c.status === "getekend";
    uit.push({
      key: `contract-${c.id}`, soort: reseller ? "reseller" : "contract", naam: `${reseller ? "Resellerovereenkomst" : "Basiscontract arbodienstverlening"} ${c.nummer}`, nummer: c.nummer,
      datum: c.getekend_at || c.verstuurd_at || c.created_at, stand: CONTRACT_WEERGAVE[w], href: `/admin/contracten/${c.id}`,
      pdf: getekend ? `/admin/contractvoorbeeld/${c.id}/pdf?download=1` : c.status === "ingetrokken" ? null : `/admin/contractvoorbeeld/${c.id}/concept?download=1`,
      extra: [{ label: getekend ? "Certificaat" : "Klantweergave", href: `/admin/contractvoorbeeld/${c.id}` }],
      door: getekend ? c.getekend_naam : null,
    });
    // De checklist hoort bij elk basiscontract dat de klant kreeg (0042).
    if (!reseller && c.status !== "concept" && c.status !== "ingetrokken") {
      const cl = checklistVan.get(c.id);
      uit.push({
        key: `checklist-${c.id}`, soort: "checklist", naam: `Checklist arbeidsomstandigheden bij ${c.nummer}`, nummer: c.nummer,
        datum: cl?.bijgewerkt_at || cl?.ingevuld_at || c.verstuurd_at || c.created_at,
        stand: cl ? { label: cl.bijgewerkt_at > cl.ingevuld_at ? "bijgewerkt" : "ingevuld", ...GROEN } : GRIJS,
        href: `/admin/contracten/${c.id}#checklist`, pdf: `/admin/contractvoorbeeld/${c.id}/checklist/pdf?download=1`, extra: [], door: cl?.door ?? null,
      });
    }
  }

  for (const o of vanKlant(b.onboardings, sleutel)) {
    const w = onboardingWeergave(o);
    const basis = `/admin/onboardingvoorbeeld/${o.id}`;
    const extra: KlantDocument["extra"] = [{ label: "Klantpagina", href: basis }];
    if (o.documenten.includes("verzuimprotocol")) extra.push({ label: "Verzuimprotocol (pdf)", href: `${basis}/pdf/verzuimprotocol` });
    if (o.antwoorden?.inrichting) extra.push({ label: "Inrichting (pdf)", href: `${basis}/pdf/inrichting` });
    if (o.antwoorden?.werknemers) extra.push({ label: "Werknemers (Excel)", href: `${basis}/excel` });
    uit.push({
      key: `onboarding-${o.id}`, soort: "onboarding", naam: `Onboarding ${o.nummer}`, nummer: o.nummer, datum: o.afgerond_at || o.bekeken_at || o.verstuurd_at || o.created_at,
      stand: ONBOARDING_WEERGAVE[w], href: `/admin/onboarding/${o.id}`, pdf: o.documenten.includes("welkom") ? `${basis}/pdf/welkom` : null, extra, door: null,
    });
    const machtigingen = b.machtigingen.filter((m) => m.onboarding_id === o.id);
    for (const m of machtigingen) {
      if (m.status !== "getekend") continue;
      uit.push({
        key: `machtiging-${m.id}`, soort: "machtiging", naam: `Machtiging overdracht verzuimdossier: ${m.naam}`, nummer: o.nummer, datum: m.getekend_at || m.uitgenodigd_at,
        stand: { label: "getekend", ...GROEN }, href: `/admin/onboarding/${o.id}?tab=werknemer`, pdf: `/admin/onboarding/${o.id}/machtiging/${m.id}?download=1`, extra: [], door: m.naam,
      });
    }
    const overgedragen = machtigingen.filter((m) => m.overdracht_at).map((m) => m.overdracht_at!).sort();
    if (overgedragen.length) {
      uit.push({
        key: `overdracht-${o.id}`, soort: "overdracht", naam: `Opdracht tot overdracht aan de vorige arbodienst (${overgedragen.length} ${overgedragen.length === 1 ? "machtiging" : "machtigingen"})`, nummer: o.nummer,
        datum: overgedragen[overgedragen.length - 1], stand: { label: "verstuurd", ...BLAUW }, href: `/admin/onboarding/${o.id}?tab=werknemer`, pdf: `/admin/onboarding/${o.id}/overdracht?download=1`, extra: [], door: null,
      });
    }
  }

  for (const e of vanKlant(b.evaluaties, sleutel)) {
    const w = evaluatieWeergave(e);
    uit.push({
      key: `evaluatie-${e.id}`, soort: "evaluatie", naam: `Klantevaluatie ${e.nummer}`, nummer: e.nummer, datum: e.ingevuld_at || e.bekeken_at || e.verstuurd_at || e.created_at,
      stand: EVALUATIE_WEERGAVE[w], href: `/admin/documenten/evaluaties/${e.id}`, pdf: `/admin/evaluatievoorbeeld/${e.id}/pdf?download=1`,
      extra: [{ label: "Klantweergave", href: `/admin/evaluatievoorbeeld/${e.id}` }], door: e.ingevuld_door,
    });
  }

  for (const f of b.bestanden) {
    uit.push({
      key: `bestand-${f.id}`, soort: "bestand", naam: f.naam, nummer: null, datum: f.created_at,
      stand: { label: bestandSoortLabel(f.soort).toLowerCase(), kleur: f.soort === "overeenkomst" ? GROEN.kleur : "#312e82", achter: f.soort === "overeenkomst" ? GROEN.achter : "#eef0ff" },
      href: null, pdf: `/admin/klantbestand/${f.id}`, extra: [], door: f.geupload_door ? f.geupload_door.split("@")[0] : null,
    });
  }

  return uit.sort((a, b) => (b.datum || "").localeCompare(a.datum || ""));
}

/** Telling per soort, voor de filterknoppen; alleen soorten die voorkomen. */
export function documentTelling(docs: KlantDocument[]): { soort: DocumentSoort; label: string; aantal: number }[] {
  const volgorde: DocumentSoort[] = ["offerte", "contract", "checklist", "onboarding", "machtiging", "overdracht", "evaluatie", "brochure", "reseller", "bestand"];
  return volgorde.map((soort) => ({ soort, label: DOCUMENT_SOORT_LABEL[soort], aantal: docs.filter((d) => d.soort === soort).length })).filter((x) => x.aantal > 0);
}

/* ---------- tariefafspraken ---------- */

export type Periode = "abonnement" | "eenmalig" | "bij gebruik" | "op aanvraag";

export const PERIODE_LABEL: Record<Periode, string> = {
  abonnement: "Abonnement",
  eenmalig: "Eenmalig",
  "bij gebruik": "Bij gebruik",
  "op aanvraag": "Op aanvraag",
};

export type TariefRegel = {
  naam: string;
  omschrijving: string | null;
  /** "€38,50 per medewerker per jaar", "6%", "op aanvraag". */
  bedrag: string;
  periode: Periode;
  /** Hoeveel er gerekend wordt, als dat op de offerte staat (12 medewerkers). */
  aantal: string | null;
};

export type TariefGroep = { merk: Merk | null; label: string; regels: TariefRegel[] };

export type OfferteAfspraak = {
  id: string;
  nummer: string;
  vorm: string;
  getekend_at: string | null;
  getekend_naam: string | null;
  medewerkers: number | null;
  geldig_tot: string | null;
  groepen: TariefGroep[];
  /** De totalen zoals de offerte ze toont: het jaarbedrag per maand, en eenmalig. */
  perMaand: number;
  eenmalig: number;
  href: string;
};

/** "React2u Recover" → het merk Recover; null als het label onbekend is. */
export function merkUitLabel(label: string | null | undefined): Merk | null {
  if (!label) return null;
  const slug = label.replace(/^React2u\s+/i, "").trim().toLowerCase();
  return MERKEN[slug] || null;
}

/** Hoe een offerteregel op de stamkaart staat: wat er vastligt, zonder zelf iets uit te rekenen. */
export function tariefRegel(r: Regel, medewerkers: number | null | undefined): TariefRegel {
  const e = eenheidVan(r.eenheid);
  const periode: Periode = r.soort === "tarief" || r.bijGebruik ? "bij gebruik" : r.prijs === null && !r.prijsTekst ? "op aanvraag" : e.periode === "jaar" ? "abonnement" : e.periode === "eenmalig" ? "eenmalig" : "op aanvraag";
  const bedrag = r.prijsTekst ? r.prijsTekst : r.prijs === null ? "op aanvraag" : `${euro(r.prijs)}${e.achter ? ` ${e.achter}` : ""}`;
  const n = r.aantal && r.aantal > 0 ? r.aantal : r.eenheid === "medewerker_jaar" || r.eenheid === "medewerker" ? medewerkers || null : null;
  return { naam: r.naam, omschrijving: r.omschrijving || null, bedrag, periode, aantal: n && n > 1 ? `${n} ${r.eenheid === "medewerker_jaar" || r.eenheid === "medewerker" ? "medewerkers" : "stuks"}` : null };
}

/**
 * De tariefafspraken uit de getekende offertes van deze klant: per offerte de
 * regels die de klant koos (en de vaste), per label gegroepeerd, met de
 * tarieven bij gebruik erbij. De bedragen staan er zoals ze op de offerte
 * staan; de totalen zijn die van de offerte zelf.
 */
export function afsprakenUitOffertes(offertes: Pick<Offerte, "id" | "nummer" | "status" | "bedrijf" | "vorm" | "regels" | "keuze" | "medewerkers" | "getekend_at" | "getekend_naam" | "getekend_inhoud" | "geldig_tot">[], sleutel: string): OfferteAfspraak[] {
  return vanKlant(offertes, sleutel)
    .filter((o) => o.status === "getekend")
    .sort((a, b) => (b.getekend_at || "").localeCompare(a.getekend_at || ""))
    .map((o) => {
      const inhoud = o.getekend_inhoud;
      const regels = normaliseerRegels(inhoud?.regels ?? o.regels);
      const keuze = inhoud?.keuze ?? herstelKeuze(regels, o.keuze);
      const medewerkers = inhoud?.medewerkers ?? o.medewerkers;
      const vorm = isVorm(inhoud?.vorm ?? o.vorm) ? (inhoud?.vorm ?? o.vorm) : "verzuimbegeleiding";
      const gekozen = new Set(keuze);
      const groepen: TariefGroep[] = [];
      for (const r of regels) {
        if (r.soort !== "vast" && r.soort !== "tarief" && !gekozen.has(r.id)) continue;
        const merk = merkUitLabel(r.label) || merkUitLabel(DIENSTLABEL[vorm]);
        const label = merk ? `React2u ${merk.naam}` : r.label || r.sectie;
        let g = groepen.find((x) => x.label === label);
        if (!g) {
          g = { merk, label, regels: [] };
          groepen.push(g);
        }
        g.regels.push(tariefRegel(r, medewerkers));
      }
      const t = berekenTotalen(regels, keuze, medewerkers);
      return {
        id: o.id, nummer: o.nummer, vorm: DIENSTLABEL[vorm], getekend_at: o.getekend_at, getekend_naam: o.getekend_naam, medewerkers, geldig_tot: o.geldig_tot,
        groepen, perMaand: t.perMaand, eenmalig: t.eenmalig, href: `/admin/offertes/${o.id}`,
      };
    });
}

export type LosseAfspraak = {
  id: string;
  soort: LosseOpdracht["soort"];
  omschrijving: string;
  label: string;
  kleur: string;
  bedrag: string;
  periode: Periode;
  datum: string;
  stop: string | null;
  verkoper: string | null;
};

/** De losse klanten en opdrachten (0036) van deze klant, nieuwste eerst. */
export function losseAfspraken(opdrachten: LosseOpdracht[], sleutel: string): LosseAfspraak[] {
  return vanKlant(opdrachten, sleutel)
    .sort((a, b) => b.datum.localeCompare(a.datum))
    .map((l) => {
      const { label, kleur } = losLabel(l.vorm);
      return {
        id: l.id, soort: l.soort, omschrijving: l.omschrijving || (l.soort === "abonnement" ? "Abonnement" : "Losse opdracht"), label, kleur,
        bedrag: l.soort === "abonnement" ? `${euro(Number(l.bedrag))} per maand` : euro(Number(l.bedrag)), periode: l.soort === "abonnement" ? "abonnement" : "eenmalig",
        datum: l.datum, stop: l.stop, verkoper: l.verkoper,
      };
    });
}

/* ---------- afwijkende afspraken (klant_tarieven) ---------- */

export type KlantTarief = {
  id: string;
  klant_id: string;
  label: string | null;
  omschrijving: string;
  bedrag: number | null;
  eenheid: Eenheid;
  ingangsdatum: string | null;
  einddatum: string | null;
  notitie: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const TARIEF_LABELS = Object.values(MERKEN).map((m) => ({ key: m.slug, label: `React2u ${m.naam}`, kleur: m.kleur, tint: m.tint, tekst: m.tekst }));

export const TARIEF_EENHEDEN = EENHEDEN.map(({ key, label }) => ({ key, label }));

export function isEenheid(s: unknown): s is Eenheid {
  return typeof s === "string" && EENHEDEN.some((e) => e.key === s);
}

/** "€95 per uur", "€1.250 eenmalig", "op aanvraag". */
export function tariefTekst(t: Pick<KlantTarief, "bedrag" | "eenheid">): string {
  if (t.bedrag === null || t.eenheid === "op_aanvraag") return "op aanvraag";
  const e = eenheidVan(t.eenheid);
  return `${euro(Number(t.bedrag))}${e.achter ? ` ${e.achter}` : ""}`;
}

export function tariefPeriode(t: Pick<KlantTarief, "bedrag" | "eenheid">): Periode {
  if (t.bedrag === null || t.eenheid === "op_aanvraag") return "op aanvraag";
  if (t.eenheid === "uur" || t.eenheid === "stuk") return "bij gebruik";
  return eenheidVan(t.eenheid).periode === "jaar" ? "abonnement" : "eenmalig";
}

/** Geldt de afspraak vandaag: begonnen (of zonder ingangsdatum) en niet verlopen. */
export function tariefGeldt(t: Pick<KlantTarief, "ingangsdatum" | "einddatum">, vandaag: string): boolean {
  if (t.ingangsdatum && t.ingangsdatum > vandaag) return false;
  if (t.einddatum && t.einddatum < vandaag) return false;
  return true;
}

export type TariefInvoer = {
  label?: string | null;
  omschrijving?: string;
  bedrag?: string | number | null;
  eenheid?: string;
  ingangsdatum?: string | null;
  einddatum?: string | null;
  notitie?: string | null;
};

/** "1.250,50" → 1250.5, "95" → 95; null als het leeg is, NaN als het geen bedrag is. */
export function leesBedrag(w: string | number | null | undefined): number | null {
  if (w === null || w === undefined || String(w).trim() === "") return null;
  if (typeof w === "number") return Number.isFinite(w) ? Math.round(w * 100) / 100 : NaN;
  const t = w.trim().replace(/€/g, "").replace(/\s/g, "");
  const genormaliseerd = /,\d{1,2}$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  const n = Number(genormaliseerd);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

/** De invoer van een afwijkende afspraak schoon; een fout in woorden als iets niet kan. */
export function schoonTarief(invoer: TariefInvoer): { ok: true; rij: Omit<KlantTarief, "id" | "klant_id" | "created_by" | "created_at" | "updated_at"> } | { ok: false; fout: string } {
  const omschrijving = String(invoer.omschrijving ?? "").trim().replace(/\s+/g, " ").slice(0, 300);
  if (!omschrijving) return { ok: false, fout: "Omschrijf de afspraak." };
  const label = String(invoer.label ?? "").trim().toLowerCase() || null;
  if (label && !MERKEN[label]) return { ok: false, fout: "Onbekend label." };
  const eenheid = invoer.eenheid ?? "eenmalig";
  if (!isEenheid(eenheid)) return { ok: false, fout: "Onbekende eenheid." };
  const bedrag = eenheid === "op_aanvraag" ? null : leesBedrag(invoer.bedrag);
  if (bedrag !== null && (Number.isNaN(bedrag) || bedrag < 0 || bedrag > 10_000_000)) return { ok: false, fout: "Het bedrag klopt niet." };
  const ingangsdatum = String(invoer.ingangsdatum ?? "").trim() || null;
  const einddatum = String(invoer.einddatum ?? "").trim() || null;
  if (ingangsdatum && !isDatum(ingangsdatum)) return { ok: false, fout: "De ingangsdatum klopt niet." };
  if (einddatum && !isDatum(einddatum)) return { ok: false, fout: "De einddatum klopt niet." };
  if (ingangsdatum && einddatum && einddatum < ingangsdatum) return { ok: false, fout: "De einddatum ligt vóór de ingangsdatum." };
  const notitie = String(invoer.notitie ?? "").trim().slice(0, 1000) || null;
  return { ok: true, rij: { label, omschrijving, bedrag, eenheid, ingangsdatum, einddatum, notitie } };
}

/* ---------- de tijdlijnregel bij een wijziging ---------- */

/** De naam van een veld in een tijdlijnregel: "postcode bezoekadres" in plaats van alleen "Postcode". */
function veldNaam(v: StamkaartVeld): string {
  const def = veldDef(v);
  const groep = STAMKAART.find((g) => g.velden.some((x) => x.key === v));
  return groep?.key === "adres" && (v === "bezoek_postcode" || v === "bezoek_plaats" || v === "post_postcode" || v === "post_plaats") ? `${def.label.toLowerCase()} ${v.startsWith("post") ? "postadres" : "bezoekadres"}` : def.label;
}

/** "Stamkaart bijgewerkt: KvK-nummer, IBAN" of "Stamkaart aangevuld uit de modules: KvK-nummer (contract C2026-0003), …". */
export function stamkaartRegel(velden: StamkaartVeld[], bronnen?: Partial<Record<StamkaartVeld, string>>): string {
  const namen = velden.map((v) => {
    const naam = veldNaam(v);
    return bronnen?.[v] ? `${naam} (${bronnen[v]})` : naam;
  });
  if (!namen.length) return "Stamkaart bijgewerkt";
  return `${bronnen ? "Stamkaart aangevuld uit de modules" : "Stamkaart bijgewerkt"}: ${namen.join(", ")}`;
}

/**
 * De regel in de tijdlijn als de import een stamkaart aanvult:
 * "Stamkaart aangevuld uit de klantlijst (regel 4): KvK-nummer, Bezoekadres;
 * overschreven: IBAN". Geen contact, zoals elke stamkaartregel.
 */
export function stamkaartImportRegel(aangevuld: StamkaartVeld[], overschreven: StamkaartVeld[], regel: number): string {
  const delen = [aangevuld.map(veldNaam).join(", "), overschreven.length ? `overschreven: ${overschreven.map(veldNaam).join(", ")}` : ""].filter(Boolean);
  return `Stamkaart ${aangevuld.length ? "aangevuld" : "bijgewerkt"} uit de klantlijst (regel ${regel})${delen.length ? `: ${delen.join("; ")}` : ""}`;
}

/* ---------- de klantenlijst naar Excel ---------- */

/**
 * De kolommen van de export: de bedrijfsnaam, dan de stamkaart in de volgorde
 * van het scherm. De koppen zijn zo gekozen dat de import ze weer op hetzelfde
 * veld leest (stamkaart.test.ts): downloaden, in Excel aanvullen, en dezelfde
 * lijst weer importeren vult de stamkaarten in één keer. De status staat er
 * bewust niet in: die hoort bij het bord, en een kolom "Status" leest de
 * import als laatste stand.
 */
export const EXPORT_KOLOMMEN: { kop: string; veld: StamkaartVeld | "bedrijf" }[] = [
  { kop: "Klant", veld: "bedrijf" },
  { kop: "KvK-nummer", veld: "kvk" },
  { kop: "Rechtsvorm", veld: "rechtsvorm" },
  { kop: "Branche", veld: "branche" },
  { kop: "SBI-code", veld: "sbi" },
  { kop: "Website", veld: "website" },
  { kop: "Aantal werknemers", veld: "medewerkers" },
  { kop: "Algemeen telefoonnummer", veld: "algemeen_telefoon" },
  { kop: "Algemeen e-mailadres", veld: "algemeen_email" },
  { kop: "Bezoekadres", veld: "bezoekadres" },
  { kop: "Postcode", veld: "bezoek_postcode" },
  { kop: "Plaats", veld: "bezoek_plaats" },
  { kop: "Postadres", veld: "postadres" },
  { kop: "Postcode postadres", veld: "post_postcode" },
  { kop: "Plaats postadres", veld: "post_plaats" },
  { kop: "Contactpersoon", veld: "contactpersoon" },
  { kop: "Functie contactpersoon", veld: "contact_functie" },
  { kop: "Telefoon", veld: "telefoon" },
  { kop: "E-mail", veld: "email" },
  { kop: "Factuur e-mail", veld: "factuur_email" },
  { kop: "Btw-nummer", veld: "btw" },
  { kop: "IBAN", veld: "iban" },
  { kop: "Tenaamstelling", veld: "iban_naam" },
  { kop: "Debiteurnummer", veld: "debiteurnummer" },
  { kop: "Bevoegd ondertekenaar", veld: "ondertekenaar" },
  { kop: "Functie ondertekenaar", veld: "ondertekenaar_functie" },
  { kop: "Eigenaar", veld: "eigenaar" },
  { kop: "Casemanager", veld: "casemanager" },
  { kop: "Startdatum", veld: "startdatum" },
];

/** De klanten als rijen voor Excel: de kopregel en per klant één rij; een datum als 1-9-2026, zoals de import hem weer leest. */
export function klantenNaarRijen(klanten: Klant[]): string[][] {
  const datum = (iso: string) => {
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${Number(m[3])}-${Number(m[2])}-${m[1]}` : iso;
  };
  return [
    EXPORT_KOLOMMEN.map((k) => k.kop),
    ...[...klanten]
      .sort((a, b) => a.bedrijf.localeCompare(b.bedrijf, "nl"))
      .map((k) => EXPORT_KOLOMMEN.map((c) => {
        const w = c.veld === "bedrijf" ? k.bedrijf : veldWaarde(k, c.veld);
        return c.veld === "startdatum" && w ? datum(w) : w;
      })),
  ];
}

/** De status op het bord, voor de stamkaart. */
export function statusLabel(s: KlantStatus): string {
  return statusInfo(s).label;
}
