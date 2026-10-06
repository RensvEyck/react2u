import { cleanOrgName, isCompanyOrg } from "./analytics";
import type { Lead, PageView } from "./types";

/**
 * Bedrijfsherkenning: welke bedrijven bekijken de site, en hoe warm zijn ze?
 *
 * Twee gratis bronnen, en geen van beide bewaart of deelt het IP-adres:
 *
 * 1. **Netwerkeigenaar** (ipinfo Lite, gratis): de organisatie die het
 *    IP-blok bezit. Werkt voor wie een eigen netwerk heeft — gemeenten,
 *    ziekenhuizen, grote bedrijven.
 * 2. **Reverse DNS**: de naam die bij een IP-adres hoort. Een bedrijf met een
 *    vaste zakelijke lijn zet daar vaak zijn eigen domein neer
 *    (`mail.jansen-bouw.nl`), ook als de lijn van KPN of Ziggo is. Zo zie je
 *    ook MKB'ers die in bron 1 als "KPN" binnenkomen. Kost niets en gaat niet
 *    langs een derde partij.
 *
 * Betaalde diensten (Salesfeed, Leadinfo) hebben daarnaast een eigen databank
 * van bedrijfslijnen. Die dekking halen we hiermee niet — wel alles wat gratis
 * te weten is.
 *
 * Alles hier is puur, zodat het te testen is. De lookups zelf staan in
 * companyLookup.ts.
 */

/* ---------- herkennen ---------- */

export type Identified = { name: string; domain: string | null; source: "asn" | "rdns" };

// Domeinen van providers, datacenters, CDN's en crawlers. Een reverse-DNS-naam
// onder een van deze domeinen is door de provider gekozen en zegt niets over
// het bedrijf erachter.
const PROVIDER_DOMAINS = new Set([
  // Nederland — consument en zakelijk
  "kpn.net", "kpn.com", "kpn.nl", "planet.nl", "xs4all.nl", "telfort.nl", "ziggo.nl", "upc.nl", "chello.nl",
  "casema.nl", "vodafone.nl", "odido.nl", "t-mobile.nl", "tmobile.nl", "tele2.nl", "versatel.nl", "versatel.net",
  "online.nl", "solcon.nl", "caiway.nl", "caiway.net", "deltafiber.nl", "delta.nl", "zeelandnet.nl",
  "kabelnoord.nl", "freedom.nl", "eurofiber.com", "eurofiber.nl", "previder.nl", "tweak.nl", "bit.nl",
  "transip.net", "transip.nl", "hostnet.nl", "pcextreme.nl", "signet.nl", "routit.net", "trined.nl",
  "glasoperator.nl", "fiber.nl", "stipte.nl", "speedlinq.nl", "voiceworks.com", "solvinity.com",
  // België en Duitsland
  "telenet.be", "proximus.be", "skynet.be", "belgacom.be", "scarlet.be", "orange.be", "voo.be",
  "t-ipconnect.de", "telekom.de", "dtag.de", "vodafone.de", "kabel-deutschland.de", "unitymedia.de",
  "arcor-ip.net", "versatel.de", "1und1.de", "ionos.de", "ionos.com", "strato.de", "hetzner.de",
  "hetzner.com", "your-server.de", "contabo.de", "contabo.net",
  // Internationale carriers
  "bt.net", "btcentralplus.com", "virginm.net", "sky.com", "comcast.net", "verizon.net", "att.net",
  "charter.com", "cox.net", "rr.com", "telia.com", "telia.net", "level3.net", "lumen.com", "cogentco.com",
  "zayo.com", "gtt.net", "colt.net", "wanadoo.fr", "orange.fr", "sfr.net", "proxad.net", "free.fr",
  // Cloud, hosting, CDN
  "amazonaws.com", "googleusercontent.com", "1e100.net", "google.com", "cloudflare.com", "cloudflare.net",
  "akamaitechnologies.com", "akamai.net", "fastly.net", "linode.com", "linodeusercontent.com",
  "digitalocean.com", "vultr.com", "ovh.net", "ovh.com", "ovh.nl", "scaleway.com", "online.net",
  "azure.com", "cloudapp.net", "microsoft.com", "leaseweb.com", "leaseweb.net", "oraclecloud.com",
  // Crawlers en grote platformen
  "googlebot.com", "msn.com", "bing.com", "apple.com", "icloud.com", "facebook.com", "tfbnw.net",
  "yahoo.com", "yahoo.net", "yandex.ru", "yandex.net", "yandex.com", "baidu.com", "ahrefs.com",
  "semrush.com", "mj12bot.com", "petalsearch.com", "bytedance.com",
]);

// Aanvullend op isCompanyOrg(): zakelijke providers en carriers. Die bedienen
// duizenden kleine bedrijven; wie hierachter zit, is niet de provider zelf.
const PROVIDER_NAMES = [
  "eurofiber", "colt ", "previder", "solvinity", "zayo", "level 3", "level3", "cogent", "lumen", "gtt ",
  "telia", "liberty global", "glasoperator", "tweak", "signet", "trined", "stipte", "speedlinq",
  "routit", "voiceworks", "bit b.v", "fiber nederland", "vodafoneziggo", "hurricane", "ntt ",
];

// Stukjes van een hostnaam die een provider automatisch uitdeelt. Een bedrijf
// dat zelf zijn reverse DNS instelt kiest "mail", "vpn", "kantoor" — geen
// "static-82-176-dsl".
const GENERIC_TOKENS = new Set([
  "static", "dynamic", "dyn", "dsl", "adsl", "vdsl", "xdsl", "cable", "dhcp", "pool", "client", "clients",
  "customer", "customers", "cust", "broadband", "fiber", "fibre", "ftth", "fttx", "fttb", "ppp", "pppoe",
  "subscriber", "residential", "home", "mobile", "wireless", "lte", "gprs", "cgnat", "nat", "unassigned",
  "unused", "reverse", "rev", "rdns", "ptr", "in-addr", "ip6", "ipv6", "user", "users", "dialup",
]);

// Tweedelige publieke achtervoegsels: bij "bedrijf.co.uk" is het domein
// "bedrijf.co.uk", niet "co.uk".
const TWO_PART_SUFFIXES = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk", "ltd.uk", "plc.uk", "com.au", "net.au", "org.au", "co.nz",
  "co.za", "com.br", "co.jp", "com.tr", "com.cn", "co.in", "com.mx", "com.sg", "co.il", "com.pl",
]);

/** "mail.jansen-bouw.nl." → "jansen-bouw.nl". Null bij een IP-adres of iets onbruikbaars. */
export function registrableDomain(host: string | null | undefined): string | null {
  if (!host) return null;
  const clean = host.trim().toLowerCase().replace(/\.$/, "");
  if (!clean || /^[\d.]+$/.test(clean) || clean.includes(":")) return null;
  const labels = clean.split(".").filter(Boolean);
  if (labels.length < 2 || labels.some((l) => !/^[a-z0-9-]+$/.test(l))) return null;
  const lastTwo = labels.slice(-2).join(".");
  if (TWO_PART_SUFFIXES.has(lastTwo)) return labels.length >= 3 ? labels.slice(-3).join(".") : null;
  return lastTwo;
}

export function isProviderDomain(domain: string | null | undefined): boolean {
  return !domain || PROVIDER_DOMAINS.has(domain.toLowerCase());
}

/**
 * Heeft een provider deze hostnaam automatisch uitgedeeld? Dan staat het
 * IP-adres er vaak in ("82-176-12-34.static…"), of een woord als "dsl".
 */
export function isGenericHost(host: string, ip: string): boolean {
  const h = host.toLowerCase();
  const octets = ip.includes(".") ? ip.split(".") : [];
  if (octets.length === 4) {
    const forms = [octets.join("-"), octets.join("."), [...octets].reverse().join("-"), [...octets].reverse().join(".")];
    if (forms.some((f) => h.includes(f))) return true;
    // Twee of meer octetten achter elkaar is al een verraad.
    if (h.includes(`${octets[2]}-${octets[3]}`) || h.includes(`${octets[2]}.${octets[3]}.`)) return true;
  }
  const tokens = h.split(/[.-]/);
  if (tokens.some((t) => GENERIC_TOKENS.has(t) || /^(ip|host|dhcp|dyn|cpe|pool)\d+$/.test(t))) return true;
  // Hostnamen die vooral uit cijfers bestaan komen niet van een mens.
  const digits = h.replace(/[^0-9]/g, "").length;
  return digits >= 8;
}

/** Bedrijfsdomein uit een reverse-DNS-naam, of null als het de provider is. */
export function companyFromPtr(host: string | null | undefined, ip: string): string | null {
  if (!host) return null;
  const domain = registrableDomain(host);
  if (!domain || isProviderDomain(domain) || isGenericHost(host, ip)) return null;
  return domain;
}

/** Bedrijf uit de netwerkeigenaar, of null als dat een provider, carrier of datacenter is. */
export function companyFromAsn(asName: string | null | undefined, asDomain?: string | null): { name: string; domain: string | null } | null {
  const name = cleanOrgName(asName);
  if (!name || !isCompanyOrg(name)) return null;
  // Op woordbegin: "Colt Technology" is de provider, "Coltman Bouw" niet.
  const lower = ` ${name.toLowerCase()} `;
  if (PROVIDER_NAMES.some((p) => lower.includes(` ${p}`))) return null;
  const domain = registrableDomain(asDomain);
  if (domain && isProviderDomain(domain)) return null;
  return { name, domain };
}

/**
 * Combineert beide bronnen. De netwerkeigenaar wint als die een bedrijf is:
 * dat is een echte bedrijfsnaam, geen domein. Anders het domein uit reverse DNS.
 */
export function identify(
  asn: { name: string | null; domain: string | null } | null,
  ptrHost: string | null,
  ip: string
): Identified | null {
  const fromAsn = asn ? companyFromAsn(asn.name, asn.domain) : null;
  if (fromAsn) return { name: fromAsn.name, domain: fromAsn.domain, source: "asn" };
  const fromPtr = companyFromPtr(ptrHost, ip);
  if (fromPtr) return { name: fromPtr, domain: fromPtr, source: "rdns" };
  return null;
}

/* ---------- namen en sleutels ---------- */

const LEGAL_FORMS = /\b(b\.?\s?v\.?|n\.?\s?v\.?|v\.?o\.?f\.?|c\.?v\.?|gmbh|ltd\.?|llc|inc\.?|s\.?a\.?|plc|holding)\b/g;

/** "Smulders Installatietechniek B.V." → "smulders installatietechniek". */
export function normalizeName(name: string | null | undefined): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(LEGAL_FORMS, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Eén sleutel per bedrijf: het domein als dat bekend is, anders de genormaliseerde naam. */
export function companyKey(name: string | null, domain: string | null): string {
  return domain ? domain.toLowerCase() : `naam:${normalizeName(name)}`;
}

/** Voor in een zoekvraag: "jansen-bouw.nl" → "jansen bouw". */
export function searchName(name: string, domain: string | null): string {
  if (domain && name === domain) return domain.replace(/\.[a-z.]+$/, "").replace(/-/g, " ");
  return name;
}

/** Links om een bedrijf verder uit te zoeken. Alleen zoekopdrachten; niets wordt opgehaald. */
export function researchLinks(name: string, domain: string | null) {
  const q = encodeURIComponent(searchName(name, domain));
  return [
    ...(domain ? [{ label: "Website", href: `https://${domain}` }] : []),
    { label: "KvK", href: `https://www.kvk.nl/zoeken/?source=all&q=${q}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/search/results/companies/?keywords=${q}` },
    { label: "Google", href: `https://www.google.com/search?q=${q}` },
  ];
}

/* ---------- bezoeken en score ---------- */

export type CompanyView = Pick<PageView, "path" | "referrer_host" | "visitor_hash" | "created_at" | "company" | "company_domain" | "company_source">;

export type Session = {
  start: string;
  end: string;
  referrer: string | null;
  pages: { path: string; at: string }[];
};

const SESSION_GAP_MS = 30 * 60_000;

/**
 * Bezoeken groeperen tot sessies: dezelfde bezoeker (hash), zonder pauze van
 * een halfuur. De hash wisselt elke nacht, dus een sessie loopt nooit over
 * middernacht — voor dit overzicht is dat precies goed.
 */
export function sessions(views: CompanyView[]): Session[] {
  const sorted = [...views].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const open = new Map<string, Session>();
  const out: Session[] = [];
  for (const v of sorted) {
    const current = open.get(v.visitor_hash);
    if (current && Date.parse(v.created_at) - Date.parse(current.end) <= SESSION_GAP_MS) {
      current.pages.push({ path: v.path, at: v.created_at });
      current.end = v.created_at;
    } else {
      const s: Session = { start: v.created_at, end: v.created_at, referrer: v.referrer_host, pages: [{ path: v.path, at: v.created_at }] };
      open.set(v.visitor_hash, s);
      out.push(s);
    }
  }
  return out.sort((a, b) => b.start.localeCompare(a.start));
}

/**
 * Hoe zwaar een pagina weegt als koopsignaal. React2u verkoopt aan
 * werkgevers: contact en diensten wegen zwaar. Vacatures en de
 * werknemerspagina's zijn géén koopsignaal — dat zijn sollicitanten, of
 * werknemers van een klant die hun verzuimprotocol zoeken.
 */
export const INTENT: { test: RegExp; weight: number; label: string }[] = [
  { test: /^\/contact(\/|$)/, weight: 4, label: "contact" },
  { test: /^\/(diensten|resist|recover|restart|reflex|ready|verzuimbegeleiding|preventie|begeleiding|trainingen|risicomanagement)/, weight: 2, label: "diensten" },
  { test: /^\/over-react2u(\/|$)/, weight: 1, label: "over ons" },
  { test: /^\/blog\/./, weight: 0.5, label: "blog" },
];

const APPLICANT = /^\/vacatures(\/|$)/;
const EMPLOYEE = /^\/(werknemers|verzuimprotocol)(\/|$)/;

export type Level = "warm" | "lauw" | "koud";

export type Score = { value: number; level: Level; signals: string[]; hint: string | null };

const DAY = 86_400_000;

/**
 * Interesse-score. Bewust eenvoudig en uitlegbaar: bij elk getal staat
 * waarom, zodat niemand een "warm" bedrijf belt zonder te weten wat het deed.
 *
 *   +1 per bezoek, +2 per extra dag dat ze terugkwamen,
 *   + het gewicht van elke bekeken pagina (hooguit twee keer per pagina),
 *   +1 als het laatste bezoek binnen drie dagen was.
 *
 * Warm vanaf 8, lauw vanaf 4.
 */
export function score(list: Session[], now = new Date()): Score {
  const signals: string[] = [];
  const days = new Set(list.map((s) => s.start.slice(0, 10)));
  let value = list.length + Math.max(0, days.size - 1) * 2;
  if (days.size > 1) signals.push(`kwam op ${days.size} dagen langs`);

  const counts = new Map<string, number>();
  for (const s of list) for (const p of s.pages) counts.set(p.path, (counts.get(p.path) || 0) + 1);
  const hit = new Set<string>();
  for (const [path, n] of counts) {
    const intent = INTENT.find((i) => i.test.test(path));
    if (!intent) continue;
    value += intent.weight * Math.min(n, 2);
    if (intent.weight >= 2) hit.add(intent.label);
  }
  if (hit.has("contact")) signals.push("bekeek contact");
  if (hit.has("diensten")) signals.push("bekeek diensten");

  const last = list.reduce((m, s) => (s.end > m ? s.end : m), "");
  if (last && now.getTime() - Date.parse(last) <= 3 * DAY) {
    value += 1;
    signals.push("recent");
  }
  const referrers = new Set(list.map((s) => s.referrer).filter(Boolean) as string[]);
  if ([...referrers].some((r) => r.includes("google"))) signals.push("via Google");
  if ([...referrers].some((r) => r.includes("linkedin"))) signals.push("via LinkedIn");

  // Wie alleen vacatures of werknemerspagina's bekeek, is waarschijnlijk geen koper.
  const paths = [...counts.keys()];
  const applicant = paths.length > 0 && paths.every((p) => APPLICANT.test(p) || p === "/");
  const employee = paths.some((p) => EMPLOYEE.test(p)) && !hit.size;
  const hint = applicant
    ? "Bekeek alleen vacatures — waarschijnlijk een sollicitant."
    : employee
      ? "Bekeek de werknemerspagina's — mogelijk een werknemer van een klant."
      : null;
  if (applicant || employee) value = Math.min(value, 3);

  value = Math.round(value * 10) / 10;
  return { value, level: value >= 8 ? "warm" : value >= 4 ? "lauw" : "koud", signals, hint };
}

/* ---------- koppeling met de bellijst ---------- */

export type LeadRef = Pick<Lead, "id" | "name" | "company" | "email" | "status">;

/**
 * Staat dit bedrijf al op de bellijst, of is het klant? Eerst een expliciete
 * koppeling, dan het e-maildomein van de lead, dan een gelijke bedrijfsnaam.
 * Geen losse gelijkenis: een verkeerde "is al klant" is erger dan geen.
 */
export function matchLead(
  company: { name: string; domain: string | null },
  leads: LeadRef[],
  linkedId?: string | null
): LeadRef | null {
  if (linkedId) {
    const linked = leads.find((l) => l.id === linkedId);
    if (linked) return linked;
  }
  if (company.domain) {
    const byMail = leads.find((l) => l.email?.toLowerCase().endsWith(`@${company.domain}`));
    if (byMail) return byMail;
  }
  const want = normalizeName(company.domain && company.name === company.domain ? company.domain.split(".")[0] : company.name);
  const compact = want.replace(/ /g, "");
  if (!compact) return null;
  return (
    leads.find((l) => {
      const n = normalizeName(l.company);
      return n && (n === want || n.replace(/ /g, "") === compact);
    }) || null
  );
}

/* ---------- samenvatten ---------- */

export type CompanyProfile = { key: string; name: string; domain: string | null; ignored: boolean; lead_id: string | null };

export type CompanySummary = {
  key: string;
  name: string;
  domain: string | null;
  source: "asn" | "rdns" | null;
  sessions: Session[];
  views: number;
  pages: { path: string; count: number }[];
  firstSeen: string;
  lastSeen: string;
  score: Score;
  ignored: boolean;
  lead: LeadRef | null;
};

/** Van losse paginaweergaven naar één regel per bedrijf, warmste eerst. */
export function summarize(
  views: CompanyView[],
  profiles: CompanyProfile[] = [],
  leads: LeadRef[] = [],
  now = new Date()
): CompanySummary[] {
  const groups = new Map<string, CompanyView[]>();
  for (const v of views) {
    if (!v.company && !v.company_domain) continue;
    const key = companyKey(v.company, v.company_domain ?? null);
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(v);
  }
  const byKey = new Map(profiles.map((p) => [p.key, p]));

  const out: CompanySummary[] = [];
  for (const [key, list] of groups) {
    // De naam van het laatste bezoek, en een echte naam boven een domein.
    const latest = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const named = latest.find((v) => v.company && v.company !== v.company_domain) || latest[0];
    const name = named.company || named.company_domain || key;
    const domain = latest.find((v) => v.company_domain)?.company_domain || null;
    const s = sessions(list);
    const counts = new Map<string, number>();
    for (const v of list) counts.set(v.path, (counts.get(v.path) || 0) + 1);
    const profile = byKey.get(key);
    out.push({
      key,
      name,
      domain,
      source: named.company_source ?? null,
      sessions: s,
      views: list.length,
      pages: [...counts.entries()].map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count),
      firstSeen: latest[latest.length - 1].created_at,
      lastSeen: latest[0].created_at,
      score: score(s, now),
      ignored: profile?.ignored ?? false,
      lead: matchLead({ name, domain }, leads, profile?.lead_id),
    });
  }
  return out.sort((a, b) => b.score.value - a.score.value || b.lastSeen.localeCompare(a.lastSeen));
}

/** Tekst voor de notitie bij een lead die uit websitebezoek komt. */
export function leadNotes(c: Pick<CompanySummary, "pages" | "sessions" | "lastSeen" | "score">, fmt: (iso: string) => string): string {
  const pages = c.pages.slice(0, 8).map((p) => (p.count > 1 ? `${p.path} (${p.count}×)` : p.path)).join(", ");
  const why = c.score.signals.length ? ` Signalen: ${c.score.signals.join(", ")}.` : "";
  return `Via websitebezoek herkend. ${c.sessions.length} bezoek${c.sessions.length === 1 ? "" : "en"}, laatst ${fmt(c.lastSeen)}.\nBekeek: ${pages}.${why}`;
}
