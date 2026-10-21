/**
 * Partnerprogramma (/partners): het rekenvoorbeeld in de paginakop en de
 * keuzes van het aanmeldformulier. De bedragen en percentages staan in de
 * blokdata, zodat ze in het beheer mee kunnen met de tarieven van het jaar.
 */

export type Rekenvoorbeeld = {
  klanten: number;
  medewerkers: number;
  /** Het bedrag per medewerker per jaar waarover de vergoeding gaat, in euro's. */
  tarief: number;
  /** Vergoeding in jaar één, in procenten van het abonnement. */
  pctJaarEen: number;
  /** Vergoeding in elk jaar daarna, in procenten. */
  pctVervolg: number;
};

/** De vergoeding voor de partner: jaar één en elk jaar daarna, in euro's. */
export function partnerVergoeding(r: Rekenvoorbeeld): { jaarEen: number; vervolg: number } {
  const n = (x: number) => (Number.isFinite(x) && x > 0 ? x : 0);
  const omzet = n(r.klanten) * n(r.medewerkers) * n(r.tarief);
  return { jaarEen: (omzet * n(r.pctJaarEen)) / 100, vervolg: (omzet * n(r.pctVervolg)) / 100 };
}

const HEEL = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });
const CENTEN = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "€ 2.025": afgerond op hele euro's, zoals een rekenvoorbeeld hoort. */
export function euroRond(bedrag: number): string {
  return `€ ${HEEL.format(Math.round(bedrag))}`;
}

/** "€ 135" of "€ 38,50": een tarief, met centen alleen als die er zijn. */
export function euroTarief(bedrag: number): string {
  return `€ ${Number.isInteger(bedrag) ? HEEL.format(bedrag) : CENTEN.format(bedrag)}`;
}

/** Soorten kantoor in het aanmeldformulier; de server neemt alleen deze aan. */
export const PARTNER_SOORTEN = [
  "Accountants- of administratiekantoor",
  "Salarisadministratie",
  "HR-advies of HR-dienstverlening",
  "Verzekeringsadvies",
  "Anders",
] as const;

/** Omvang van het klantenbestand in het aanmeldformulier. */
export const PARTNER_OMVANG = ["Tot 25", "25 tot 100", "100 tot 250", "Meer dan 250"] as const;

/* ---------- Partnercode en aanmeldlink ---------- */

/** Een partnercode: 4 tot 20 hoofdletters en cijfers. Spaties en tekens vallen weg; anders null. */
export function normaliseerPartnercode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return code.length >= 4 && code.length <= 20 ? code : null;
}

/** Voorstel voor een nieuwe code: de naam van het kantoor (max. 10 tekens) plus twee cijfers. */
export function codeVoorstel(kantoor: string, willekeurig = Math.random): string {
  const basis = kantoor
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "PARTNER";
  return `${basis}${String(Math.floor(willekeurig() * 90) + 10)}`;
}

/** De aanmeldlink van een partner: het kennismaakformulier, met de code erbij. */
export function aanmeldlink(siteUrl: string, code: string): string {
  return `${siteUrl.replace(/\/$/, "")}/kennismaken?partner=${encodeURIComponent(code)}`;
}

/* ---------- Vergoeding per kwartaal ---------- */

export type PartnerKlantRij = {
  id: string;
  bedrijf: string;
  medewerkers: number;
  /** Abonnement per medewerker per jaar, in euro's. */
  tarief: number;
  /** Eerste dag als klant (JJJJ-MM-DD). */
  start: string;
  /** Laatste dag als klant, of null zolang de klant blijft. */
  eind: string | null;
};

export type Kwartaal = { jaar: number; kwartaal: 1 | 2 | 3 | 4 };

export function kwartaalVan(d: Date): Kwartaal {
  return { jaar: d.getFullYear(), kwartaal: (Math.floor(d.getMonth() / 3) + 1) as Kwartaal["kwartaal"] };
}

export function kwartaalLabel(k: Kwartaal): string {
  return `Q${k.kwartaal} ${k.jaar}`;
}

/** Dit kwartaal en de `aantal - 1` kwartalen ervoor, nieuwste eerst. */
export function laatsteKwartalen(aantal: number, vanaf: Kwartaal): Kwartaal[] {
  const out: Kwartaal[] = [];
  let index = vanaf.jaar * 4 + (vanaf.kwartaal - 1);
  for (let i = 0; i < aantal; i++, index--) {
    out.push({ jaar: Math.floor(index / 4), kwartaal: ((index % 4) + 1) as Kwartaal["kwartaal"] });
  }
  return out;
}

/** Maandnummer sinds het jaar 0, uit "JJJJ-MM-DD": zo zijn maanden gewoon te tellen. */
function maandIndex(datum: string): number {
  const [j, m] = datum.split("-").map(Number);
  return j * 12 + (m - 1);
}

/**
 * De vergoeding voor één klant in één kwartaal. Per begonnen maand als klant
 * een twaalfde van het jaarabonnement (medewerkers × tarief); de eerste twaalf
 * maanden tegen het percentage van jaar één, daarna tegen het
 * vervolgpercentage. Een indicatie op de contractgegevens: de echte vergoeding
 * gaat over wat de klant betaalde.
 */
export function vergoedingInKwartaal(
  klant: PartnerKlantRij,
  pct: { jaarEen: number; vervolg: number },
  k: Kwartaal,
): { bedrag: number; maanden: number } {
  const start = maandIndex(klant.start);
  const eind = klant.eind ? maandIndex(klant.eind) : Infinity;
  const perMaand = (Math.max(0, klant.medewerkers) * Math.max(0, klant.tarief)) / 12;
  let bedrag = 0, maanden = 0;
  for (let i = 0; i < 3; i++) {
    const m = k.jaar * 12 + (k.kwartaal - 1) * 3 + i;
    if (m < start || m > eind) continue;
    maanden++;
    bedrag += (perMaand * (m - start < 12 ? pct.jaarEen : pct.vervolg)) / 100;
  }
  return { bedrag: Math.round(bedrag * 100) / 100, maanden };
}

/** Alle klanten van een partner in één kwartaal: per klant en opgeteld. */
export function kwartaalOverzicht(
  klanten: PartnerKlantRij[],
  pct: { jaarEen: number; vervolg: number },
  k: Kwartaal,
): { totaal: number; regels: { klant: PartnerKlantRij; bedrag: number; maanden: number }[] } {
  const regels = klanten
    .map((klant) => ({ klant, ...vergoedingInKwartaal(klant, pct, k) }))
    .filter((r) => r.maanden > 0);
  return { totaal: Math.round(regels.reduce((s, r) => s + r.bedrag, 0) * 100) / 100, regels };
}

const MET_CENTEN = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "€ 1.604,17": een bedrag op de cent, voor het kwartaaloverzicht. */
export function euroCent(bedrag: number): string {
  return `€ ${MET_CENTEN.format(bedrag)}`;
}
