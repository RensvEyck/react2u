import "server-only";
import { promises as dns } from "dns";
import { companyKey, identify, type Identified } from "./companies";
import { supabasePublic } from "./supabase/public";

/**
 * De lookups achter de bedrijfsherkenning. Zie companies.ts voor het waarom.
 *
 * Het IP-adres gaat hier alleen door het geheugen: het wordt nergens
 * opgeslagen. De cache houdt de uitkomst per IP een dag vast, zodat een
 * bezoeker die tien pagina's bekijkt niet tien keer wordt opgezocht.
 */

const TIMEOUT_MS = 1500;
const CACHE_MS = 24 * 60 * 60_000;
const CACHE_MAX = 5000;
const cache = new Map<string, { at: number; result: Identified | null }>();

function withTimeout<T>(p: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<T>((resolve) => { timer = setTimeout(() => resolve(fallback), TIMEOUT_MS); });
  return Promise.race([p, late]).catch(() => fallback).finally(() => clearTimeout(timer));
}

/**
 * Netwerkeigenaar via ipinfo. Zonder IPINFO_TOKEN: niets.
 *
 * De gratis variant (Lite, sinds 2025) antwoordt op api.ipinfo.io/lite met
 * `as_name` en `as_domain`. Oudere tokens werken ook op ipinfo.io/<ip>/json,
 * met `org` ("AS1136 KPN B.V.") en bij een betaald pakket `company`. We
 * proberen Lite en vallen terug op het oude adres.
 */
async function networkOwner(ip: string): Promise<{ name: string | null; domain: string | null } | null> {
  const token = process.env.IPINFO_TOKEN;
  if (!token) return null;
  const get = async (url: string) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    return res.ok ? ((await res.json()) as Record<string, unknown>) : null;
  };
  try {
    const lite = await get(`https://api.ipinfo.io/lite/${encodeURIComponent(ip)}?token=${token}`);
    if (lite?.as_name) return { name: String(lite.as_name), domain: lite.as_domain ? String(lite.as_domain) : null };
    const legacy = await get(`https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${token}`);
    if (!legacy) return null;
    const company = legacy.company as { name?: string; domain?: string } | undefined;
    return {
      name: company?.name || (legacy.org ? String(legacy.org) : null),
      domain: company?.domain || null,
    };
  } catch {
    return null;
  }
}

/** Reverse DNS. Gratis, zonder derde partij; de eerste naam telt. */
async function reverseName(ip: string): Promise<string | null> {
  const names = await withTimeout(dns.reverse(ip), [] as string[]);
  return names[0] || null;
}

/**
 * Welk bedrijf zit achter dit IP-adres, als dat gratis te weten is?
 * Beide lookups tegelijk; faalt er één, dan telt de ander. Nooit een fout:
 * een bezoek zonder bedrijf is beter dan geen bezoek.
 */
export async function lookupCompany(ip: string): Promise<Identified | null> {
  const hit = cache.get(ip);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.result;

  const [owner, ptr] = await Promise.all([withTimeout(networkOwner(ip), null), reverseName(ip)]);
  const result = identify(owner, ptr, ip);

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(ip, { at: Date.now(), result });
  return result;
}

const ignoredCache = new Map<string, { at: number; ignored: boolean }>();
const IGNORED_CACHE_MS = 10 * 60_000;

/**
 * Staat dit bedrijf op "niet volgen"? Dan bewaart de tracker het bezoek
 * zonder bedrijfsnaam. Tien minuten onthouden; een wijziging in de admin is
 * dus niet op de seconde overal actief. Vóór migratie 0010 bestaat de functie
 * niet en is het antwoord nee.
 */
export async function isIgnored(company: Identified): Promise<boolean> {
  const key = companyKey(company.name, company.domain);
  const hit = ignoredCache.get(key);
  if (hit && Date.now() - hit.at < IGNORED_CACHE_MS) return hit.ignored;
  const { data, error } = await supabasePublic()
    .rpc("company_ignored", { p_key: key })
    .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
  const ignored = !error && data === true;
  if (ignoredCache.size >= CACHE_MAX) ignoredCache.delete(ignoredCache.keys().next().value!);
  ignoredCache.set(key, { at: Date.now(), ignored });
  return ignored;
}
