/**
 * Doorverwijzingen die in de admin te beheren zijn, en de 404's die erom vragen.
 *
 * Er zijn twee lagen, en de volgorde telt:
 *
 * 1. `next.config.ts` — de vaste lijst van de oude WordPress-site
 *    (`WORDPRESS_REDIRECTS` hieronder). Next voert die uit vóór de middleware.
 * 2. De tabel `redirects` — alles wat daarna in de admin wordt toegevoegd. De
 *    middleware past die toe.
 *
 * Staat een pad in beide, dan wint dus altijd de vaste lijst. Daarom weigert de
 * admin een bron die daar al in staat: anders sla je iets op dat nooit werkt.
 *
 * Alles hier is puur, zodat de middleware, de server actions en het scherm
 * dezelfde regels gebruiken.
 */

import { DOCUMENTEN } from "./documenten";

export type Redirect = {
  id: string;
  source: string;
  destination: string;
  permanent: boolean;
  hits: number;
  last_hit_at: string | null;
  note: string | null;
  created_at: string;
};

export type MissingPath = {
  path: string;
  hits: number;
  first_seen: string;
  last_seen: string;
  last_referrer: string | null;
  ignored: boolean;
};

/** Wat de middleware nodig heeft; de rest van de rij blijft in de database. */
export type RedirectRule = Pick<Redirect, "source" | "destination" | "permanent">;

const SITE_HOSTS = ["react2u.nl", "www.react2u.nl"];

// Paden waar een doorverwijzing iets kapot zou maken, of die de middleware
// nooit ziet (zie de matcher in middleware.ts).
const RESERVED = [/^\/admin(\/|$)/, /^\/api(\/|$)/, /^\/_next(\/|$)/];

/**
 * Een pad zoals het in de tabel staat: met een schuine streep ervoor, zonder
 * domein, querystring, hash of afsluitende schuine streep, en in kleine
 * letters. Plakt iemand de volledige oude URL, dan werkt dat ook.
 */
export function normalizePath(input: string): string {
  let s = input.trim();
  const url = /^https?:\/\//i.test(s) ? safeUrl(s) : null;
  if (url) s = url.pathname;
  s = s.split(/[?#]/)[0];
  try {
    s = decodeURI(s);
  } catch {
    // Kapotte procentcodering: laat staan zoals ingevoerd.
  }
  if (!s.startsWith("/")) s = `/${s}`;
  s = s.replace(/\/{2,}/g, "/");
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s.toLowerCase();
}

function safeUrl(s: string): URL | null {
  try {
    return new URL(s);
  } catch {
    return null;
  }
}

export type SourceCheck = { ok: true; source: string } | { ok: false; reason: string };

/** Mag dit een bron van een doorverwijzing zijn? */
export function checkSource(input: string): SourceCheck {
  if (!input.trim()) return { ok: false, reason: "leeg" };
  if (/^https?:\/\//i.test(input.trim())) {
    const url = safeUrl(input.trim());
    if (!url || !SITE_HOSTS.includes(url.hostname)) return { ok: false, reason: "ander-domein" };
  }
  const source = normalizePath(input);
  // "/*" zou de hele site doorsturen, "/" is de homepage. Een sterretje mag
  // alleen als laatste stuk ("/oud/*"), nergens anders.
  if (source === "/" || source === "/*") return { ok: false, reason: "home" };
  if (source.slice(0, -2).includes("*") || (source.includes("*") && !source.endsWith("/*"))) {
    return { ok: false, reason: "sterretje" };
  }
  if (RESERVED.some((r) => r.test(source))) return { ok: false, reason: "gereserveerd" };
  // De middleware slaat paden met een bestandsextensie over (afbeeldingen,
  // robots.txt). Zo'n doorverwijzing zou dus stil nooit werken.
  if (/\.[a-z0-9]{2,5}$/i.test(source)) return { ok: false, reason: "extensie" };
  if (source.length > 300) return { ok: false, reason: "te-lang" };
  return { ok: true, source };
}

export type DestinationCheck = { ok: true; destination: string } | { ok: false; reason: string };

/**
 * Een bestemming is een pad op deze site of een volledige https-URL elders.
 * Een URL naar react2u.nl zelf wordt een pad, zodat hij ook op een
 * preview-omgeving naar de juiste plek wijst.
 */
export function checkDestination(input: string): DestinationCheck {
  const s = input.trim();
  if (!s) return { ok: false, reason: "leeg" };
  if (/^https?:\/\//i.test(s)) {
    const url = safeUrl(s);
    if (!url) return { ok: false, reason: "ongeldig" };
    if (SITE_HOSTS.includes(url.hostname)) {
      const path = url.pathname.replace(/\/+$/, "") || "/";
      return { ok: true, destination: path + url.search + url.hash };
    }
    if (url.protocol !== "https:") return { ok: false, reason: "geen-https" };
    return { ok: true, destination: url.toString() };
  }
  if (!s.startsWith("/")) return { ok: true, destination: `/${s}` };
  return { ok: true, destination: s };
}

/**
 * Alle bronnen die dit pad zouden afvangen: het pad zelf en elke wildcard
 * erboven. "/a/b" → ["/a/b", "/a/b/*", "/a/*"]. Gebruikt om ze op te ruimen
 * zodra er weer echte inhoud op dat adres staat.
 */
export function coveringSources(path: string): string[] {
  const p = normalizePath(path);
  const parts = p.split("/").filter(Boolean);
  const out = [p];
  for (let i = parts.length; i > 0; i--) out.push(`/${parts.slice(0, i).join("/")}/*`);
  return out;
}

/**
 * Zoekt de regel voor een pad. Exacte bron eerst; daarna bronnen die op `/*`
 * eindigen (alles eronder), de langste eerst — `/oud/team/*` gaat dus voor
 * `/oud/*`.
 */
export function matchRedirect(pathname: string, rules: RedirectRule[]): RedirectRule | null {
  const path = normalizePath(pathname);
  const exact = rules.find((r) => r.source === path);
  if (exact) return exact;
  let best: RedirectRule | null = null;
  for (const r of rules) {
    if (!r.source.endsWith("/*")) continue;
    const prefix = r.source.slice(0, -2);
    if ((path === prefix || path.startsWith(`${prefix}/`)) && (!best || r.source.length > best.source.length)) best = r;
  }
  return best;
}

/**
 * Zou deze nieuwe regel een lus maken? Volgt de keten vanaf de bestemming, mét
 * de nieuwe regel erbij; komt die een pad twee keer tegen, dan stuurt de site
 * bezoekers eindeloos rond en geeft de browser het op. Vangt ook een wildcard
 * die naar zichzelf wijst: `/oud/*` → `/oud/nieuw`.
 */
export function createsLoop(source: string, destination: string, rules: RedirectRule[]): boolean {
  const all = [...rules.filter((r) => r.source !== source), { source, destination, permanent: true }];
  const seen = new Set<string>();
  let at = destination;
  for (let i = 0; i < 20; i++) {
    if (/^https?:\/\//i.test(at)) return false;
    const path = normalizePath(at);
    if (seen.has(path)) return true;
    seen.add(path);
    const next = matchRedirect(path, all);
    if (!next) return false;
    at = next.destination;
  }
  return true;
}

/**
 * De volledige doel-URL, met de querystring van het verzoek erbij als de
 * bestemming er zelf geen heeft — zo komen utm-parameters uit een oude
 * nieuwsbrief gewoon aan.
 */
export function targetUrl(destination: string, requestUrl: URL): URL {
  const target = new URL(destination, requestUrl.origin);
  if (!target.search && requestUrl.search) target.search = requestUrl.search;
  return target;
}

/**
 * Waar de link naar een 404 stond. Van een andere site alleen de host; van
 * deze site het pad — dat is dan een kapotte link die je zelf kunt repareren,
 * en precies wat je wilt weten.
 */
export function missingReferrer(referrer: string | null | undefined, ownHost?: string): string | null {
  if (!referrer) return null;
  const url = safeUrl(referrer);
  if (!url) return null;
  const host = url.hostname.replace(/^www\./, "");
  if (ownHost && host === ownHost.split(":")[0].replace(/^www\./, "")) return url.pathname || "/";
  return host || null;
}

/* ---------- suggesties ---------- */

/** Woorden per padsegment: "/werkgever/over-ons" → [["werkgever"], ["over", "ons"]]. */
function segmentWords(path: string): string[][] {
  return normalizePath(path)
    .split("/")
    .filter(Boolean)
    .map((seg) => seg.split(/[-_]+/).filter((w) => w.length > 1));
}

/**
 * De bestaande pagina die het meest lijkt op een pad dat 404 geeft.
 *
 * Telt overlappende woorden en gedeelde woordbegins ("verzuim" in
 * "verzuimbegeleiding"). Woorden uit het laatste padsegment wegen dubbel, want
 * daar staat meestal waar het over gaat — bij /werkgever/over-ons gaat het om
 * "over ons", niet om "werkgever". Geen treffer boven de drempel? Dan geen
 * suggestie: liever niets dan een gok die er overtuigend uitziet.
 */
export function suggestDestination(missing: string, candidates: { path: string; label: string }[]) {
  const segments = segmentWords(missing);
  if (!segments.length) return null;
  const weighted = segments.flatMap((ws, i) => ws.map((w) => ({ w, weight: i === segments.length - 1 ? 2 : 1 })));
  let best: { path: string; label: string; score: number } | null = null;
  for (const c of candidates) {
    const have = [...segmentWords(c.path).flat(), ...segmentWords(c.label).flat()];
    let score = 0;
    for (const { w, weight } of weighted) {
      if (have.includes(w)) score += 3 * weight;
      else if (have.some((h) => (h.length >= 4 && w.startsWith(h)) || (w.length >= 4 && h.startsWith(w)))) score += 2 * weight;
    }
    if (score > (best?.score ?? 0)) best = { ...c, score };
  }
  return best && best.score >= 4 ? { path: best.path, label: best.label } : null;
}

/* ---------- de vaste lijst van de oude site ---------- */

/**
 * Redirects van de oude WordPress-site.
 *
 * Deze URL's stonden in Google toen de DNS naar Vercel ging. Zonder redirect
 * wordt elk van deze adressen een 404 en verliest de pagina zijn positie — en
 * die komt niet vanzelf terug. Bron: de sitemap van de oude site
 * (wp-sitemap.xml), opgehaald toen die nog live was.
 *
 * Gebruikt door next.config.ts (permanent, 308) en getoond in de admin, zodat
 * daar zichtbaar is wat al geregeld is. Volgorde telt: specifieke paden staan
 * vóór de patronen die ze zouden opslokken.
 */
export const WORDPRESS_REDIRECTS: { source: string; destination: string }[] = [
  // Oude structuur met /werkgever en /werknemer ervoor
  { source: "/werkgever/diensten/arbodienstverlening", destination: "/diensten" },
  { source: "/werkgever/diensten/verzuimbegeleiding", destination: "/recover" },
  { source: "/werkgever/diensten/ziektewetuitvoering", destination: "/reflex" },
  { source: "/werkgever/diensten", destination: "/diensten" },
  { source: "/werkgever/over-ons", destination: "/over-react2u" },
  { source: "/werkgever/contact", destination: "/contact" },
  { source: "/werkgever/faq-werkgever", destination: "/diensten" },
  { source: "/werknemer/faq-werknemer", destination: "/werknemers" },
  { source: "/werknemer/contact", destination: "/contact" },
  { source: "/werknemer", destination: "/werknemers" },
  { source: "/werkgever", destination: "/werkgevers" },

  // Varianten met "-niet": WordPress-pagina's die uit het menu waren gehaald
  // en een "-niet"-slug kregen, maar wel in Google stonden. Specifiek vóór
  // algemeen, anders slokt /werkgever-niet/* de dienstenpaden op.
  { source: "/werkgever-niet/diensten-niet/:slug*", destination: "/diensten" },
  { source: "/werkgever-niet/diensten/:slug*", destination: "/diensten" },
  { source: "/werkgever-niet/:slug*", destination: "/werkgevers" },
  { source: "/werknemer-niet/:slug*", destination: "/werknemers" },
  { source: "/diensten-niet/:slug*", destination: "/diensten" },
  { source: "/adviseurs-niet/:slug*", destination: "/diensten" },

  // Adviseurssectie, bestaat niet meer als aparte ingang
  { source: "/adviseurs/arbodienstverlening", destination: "/diensten" },
  { source: "/adviseurs/ziektewet-uitvoering", destination: "/reflex" },
  { source: "/adviseurs/ziekteverzuimbegeleiding", destination: "/recover" },
  { source: "/adviseurs", destination: "/diensten" },

  // Losse oude paden
  { source: "/xdiensten", destination: "/diensten" },
  { source: "/xbegeleidingx-xcoachingx", destination: "/restart" },

  // Hernoemd op deze site: de tarievenpagina heet sinds september 2026
  // Verzuimabonnementen. De tabel `redirects` bestaat in productie nog niet
  // (migratie 0007), dus deze staat hier.
  { source: "/tarieven", destination: "/verzuimabonnementen" },

  // Restanten van het WordPress-thema: Engelstalige demo-artikelen, teamleden
  // met plaatshouder-namen, categorieën en auteursarchieven. Geen echte
  // inhoud, maar een 404 is een 404 — die vangen we af op de dichtstbijzijnde
  // pagina die wél bestaat.
  { source: "/team/:slug*", destination: "/over-react2u" },
  { source: "/category/:slug*", destination: "/blog" },
  { source: "/author/:slug*", destination: "/" },
  { source: "/the-importance-of-self-care-for-coaches-strategies-for-success", destination: "/blog" },
  { source: "/coaching-for-leadership-building-stronger-teams-and-organizations", destination: "/blog" },
  { source: "/the-role-of-business-coach-education-training-experience", destination: "/blog" },
  { source: "/the-power-of-mindset-helping-clients-achieve-their-goals", destination: "/blog" },
  { source: "/mastering-communication-skills-key-to-effective-coaching", destination: "/blog" },
  { source: "/building-trust-with-business-coaching-clients", destination: "/blog" },
  { source: "/effective-goal-setting-for-business-coaching-clients", destination: "/blog" },
  { source: "/managing-difficult-business-coaching-clients", destination: "/blog" },

  // WordPress-restanten die crawlers nog jaren blijven proberen
  { source: "/wp-content/:path*", destination: "/" },
  { source: "/wp-includes/:path*", destination: "/" },
  { source: "/feed", destination: "/blog" },
  { source: "/comments/feed", destination: "/blog" },
];

/**
 * De juridische documenten waren webpagina's; nu zijn het alleen nog PDF's
 * (src/lib/documenten.ts). Een echte 301 (geen 308), zodat Google de oude
 * adressen definitief door de PDF vervangt. Net als de WordPress-lijst past
 * next.config.ts ze toe, vóór de middleware en de tabel.
 */
export const DOCUMENT_REDIRECTS: { source: string; destination: string }[] = [
  { source: "/privacyverklaring", destination: DOCUMENTEN.privacyverklaring },
  { source: "/cookieverklaring", destination: DOCUMENTEN.cookieverklaring },
  // De documentpagina's van de oude WordPress-site. Tot oktober 2026 wezen ze
  // naar de WordPress-PDF's in media/wp/; nu naar de definitieve versies.
  { source: "/privacy-reglement", destination: DOCUMENTEN.privacyverklaring },
  { source: "/klachtenprocedure", destination: DOCUMENTEN.klachtenregeling },
  { source: "/algemene-voorwaarden", destination: DOCUMENTEN.algemeneVoorwaarden },
];

/**
 * De zes dienstpagina's van vóór oktober 2026, nu opgegaan in de vijf labels
 * (Resist, Recover, Restart, Reflex, Ready; zie LABELS in nav.ts). Een echte
 * 301, net als de documenten: Google moet de oude adressen definitief door het
 * label vervangen. De pagina's staan nog in de database, maar deze regels gaan
 * vóór elke pagina, en sitemap.xml laat ze weg (coveredByWordpress).
 *
 * Engelse versies van deze pagina's hebben nooit bestaan: de Engelse site
 * kende vanaf het begin alleen /en/services/<label>.
 *
 * De WordPress-lijst hierboven wijst rechtstreeks naar dezelfde labels, zodat
 * er nergens een keten van twee doorverwijzingen ontstaat.
 */
export const DIENST_REDIRECTS: { source: string; destination: string }[] = [
  { source: "/verzuimbegeleiding-wvp", destination: "/recover" },
  { source: "/verzuimbegeleiding-erd-zw", destination: "/reflex" },
  { source: "/preventie-en-vitaliteit", destination: "/resist" },
  { source: "/risicomanagement", destination: "/resist" },
  { source: "/trainingen-en-workshops", destination: "/restart" },
  { source: "/begeleiding-en-coaching", destination: "/restart" },
];

/** Alle vaste regels uit de code, in de volgorde waarin next.config.ts ze toepast. */
export const VASTE_REDIRECTS = [...WORDPRESS_REDIRECTS, ...DOCUMENT_REDIRECTS, ...DIENST_REDIRECTS];

/** Valt dit pad al onder de vaste lijst? Dan zou een regel in de tabel nooit werken. */
export function coveredByWordpress(path: string): { source: string; destination: string } | null {
  const p = normalizePath(path);
  for (const r of VASTE_REDIRECTS) {
    const wildcard = r.source.match(/^(.*)\/:\w+\*$/);
    if (wildcard) {
      const prefix = wildcard[1];
      if (p === prefix || p.startsWith(`${prefix}/`)) return r;
    } else if (p === r.source) {
      return r;
    }
  }
  return null;
}
