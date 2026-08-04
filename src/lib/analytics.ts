import { createHash } from "crypto";
import type { PageView } from "./types";

/**
 * Logica achter de bezoekregistratie.
 *
 * Twee dingen staan hier centraal: het IP-adres verlaat deze module nooit, en
 * er wordt eerlijk onderscheid gemaakt tussen een bedrijfsnetwerk en een
 * consumentenprovider. Zonder dat tweede is een "bedrijvenlijst" vooral een
 * lijst met KPN en Ziggo erin, en dan is de functie waardeloos.
 */

/**
 * Bezoekersherkenning zonder het IP te bewaren.
 *
 * De hash bevat de datum, dus hij verandert elke nacht. Daardoor kun je binnen
 * één dag herhaalbezoek herkennen, maar iemand niet over dagen heen volgen.
 * Het zout maakt terugrekenen naar een IP onmogelijk voor wie de database in
 * handen krijgt; zonder zout zou een lijst van alle Nederlandse IP's genoeg
 * zijn om de hashes te kraken.
 */
export function visitorHash(ip: string, userAgent: string, day: string, salt: string): string {
  return createHash("sha256").update(`${ip}|${userAgent}|${day}|${salt}`).digest("hex").slice(0, 32);
}

/** Het eerste adres in x-forwarded-for is de bezoeker; de rest zijn proxies. */
export function clientIp(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") || null;
}

/**
 * Consumentenproviders en datacenters. Een bezoeker hierachter zegt niets over
 * een bedrijf: het is iemand thuis, op zijn telefoon, of een bot.
 *
 * Bewust op woorddeel gematcht en niet op exacte naam, want dezelfde partij
 * duikt op onder tientallen ASN-namen ("KPN B.V.", "KPN Mobile", "Ziggo B.V.").
 */
const CONSUMER_OR_HOSTING = [
  // Nederlandse consumentenproviders
  "kpn", "ziggo", "vodafone", "t-mobile", "tmobile", "odido", "delta fiber", "deltafiber",
  "xs4all", "tele2", "online.nl", "freedom internet", "caiway", "solcon", "budget",
  "youfone", "simpel", "lebara", "hollandsnieuwe", "ben nederland",
  // Buitenlandse consumentenproviders die vaak opduiken
  "telenet", "proximus", "orange", "deutsche telekom", "telefonica", "sky ",
  // Datacenters, hosting en cloud: bots, crawlers, VPN's
  "amazon", "aws", "google", "microsoft", "azure", "digitalocean", "hetzner", "ovh",
  "linode", "cloudflare", "akamai", "fastly", "leaseweb", "scaleway", "vultr",
  "oracle", "alibaba", "tencent", "contabo", "transip", "hostnet", "strato",
  // VPN's en proxies
  "nordvpn", "expressvpn", "surfshark", "private internet", "mullvad", "proton",
];

/**
 * Is deze organisatienaam een bedrijf waar je iets aan hebt?
 *
 * Conservatief: bij twijfel niet. Liever een bedrijf missen dan een lijst vol
 * providers waar niemand meer naar kijkt.
 */
export function isCompanyOrg(org: string | null | undefined): boolean {
  if (!org) return false;
  const clean = org.trim().toLowerCase();
  if (clean.length < 2) return false;
  return !CONSUMER_OR_HOSTING.some((needle) => clean.includes(needle));
}

/**
 * Maakt een ASN-naam leesbaar: "AS1136 KPN B.V." -> "KPN B.V."
 *
 * IP-databanken zetten het AS-nummer er standaard voor; dat wil je niet in een
 * overzicht zien staan.
 */
export function cleanOrgName(org: string | null | undefined): string | null {
  if (!org) return null;
  const stripped = org.replace(/^AS\d+\s+/i, "").trim();
  return stripped || null;
}

/** Alleen de hostnaam van de verwijzer; het volledige pad is ruis. */
export function referrerHost(referrer: string | null | undefined, ownHost?: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (!host) return null;
    // Interne navigatie is geen verwijzing.
    if (ownHost && host === ownHost.replace(/^www\./, "")) return null;
    return host;
  } catch {
    return null;
  }
}

/**
 * Alleen echte paginapaden vastleggen.
 *
 * Houdt bestanden, API-routes en het adminpaneel uit de statistieken: die
 * vertekenen elk overzicht, en adminverkeer is jouw eigen verkeer.
 */
export function isTrackablePath(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path.startsWith("/admin")) return false;
  if (path.startsWith("/api")) return false;
  if (path.startsWith("/_next")) return false;
  if (/\.[a-z0-9]{2,5}$/i.test(path)) return false;
  return true;
}

/** Query-parameters weg: /vacatures?utm_source=x en /vacatures zijn één pagina. */
export function normalizePath(path: string): string {
  const [clean] = path.split("?");
  if (clean.length > 1 && clean.endsWith("/")) return clean.slice(0, -1);
  return clean || "/";
}

/* ---------- samenvatten voor het overzicht ---------- */

export type DayCount = { day: string; visitors: number; views: number };
export type Ranked = { label: string; count: number };
export type CompanyVisit = {
  company: string;
  views: number;
  visitors: number;
  lastSeen: string;
  paths: string[];
};

const dayOf = (iso: string) => iso.slice(0, 10);

/** Unieke bezoekers = unieke hashes. Binnen één dag, want de hash roteert. */
function uniques(views: PageView[]): number {
  return new Set(views.map((v) => v.visitor_hash)).size;
}

export function totals(views: PageView[]) {
  return { visitors: uniques(views), views: views.length };
}

/**
 * Dagreeks over het hele bereik, inclusief dagen zonder bezoek.
 *
 * Lege dagen overslaan zou de grafiek laten liegen: een week met twee drukke
 * dagen ziet er dan uit als een week met constant verkeer.
 */
export function byDay(views: PageView[], days: string[]): DayCount[] {
  const grouped = new Map<string, PageView[]>();
  for (const v of views) {
    const d = dayOf(v.created_at);
    (grouped.get(d) ?? grouped.set(d, []).get(d)!).push(v);
  }
  return days.map((day) => {
    const list = grouped.get(day) || [];
    return { day, visitors: uniques(list), views: list.length };
  });
}

/** Laatste n dagen als "YYYY-MM-DD", oudste eerst. */
export function lastDays(n: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function rank(values: (string | null)[], limit: number): Ranked[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function topPaths(views: PageView[], limit = 8): Ranked[] {
  return rank(views.map((v) => v.path), limit);
}

export function topReferrers(views: PageView[], limit = 8): Ranked[] {
  return rank(views.map((v) => v.referrer_host), limit);
}

export function topCountries(views: PageView[], limit = 6): Ranked[] {
  return rank(views.map((v) => v.country), limit);
}

/**
 * Bedrijven die langskwamen, met wat ze bekeken.
 *
 * Gesorteerd op recentheid en niet op aantal: voor opvolging is "wie was hier
 * gisteren" bruikbaarder dan "wie kwam vorige maand het vaakst".
 */
export function companyVisits(views: PageView[], limit = 25): CompanyVisit[] {
  const grouped = new Map<string, PageView[]>();
  for (const v of views) {
    if (!v.is_company || !v.company) continue;
    (grouped.get(v.company) ?? grouped.set(v.company, []).get(v.company)!).push(v);
  }
  return [...grouped.entries()]
    .map(([company, list]) => ({
      company,
      views: list.length,
      visitors: uniques(list),
      lastSeen: list.reduce((a, b) => (a > b.created_at ? a : b.created_at), list[0].created_at),
      paths: [...new Set(list.map((v) => v.path))].slice(0, 6),
    }))
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
    .slice(0, limit);
}
