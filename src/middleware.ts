import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import type { ContactInfo } from "@/lib/contact";
import { maintenancePage, normalizeMaintenance, type Maintenance } from "@/lib/maintenance";
import { matchRedirect, targetUrl, type RedirectRule } from "@/lib/redirects";
import { ADMIN_PAD_HEADER } from "@/lib/terug";

/* ---------- Supabase zonder supabase-js ---------- */

// Deze middleware draait vóór elke publieke pagina, ook de statische, en elke
// milliseconde telt bij Vercel als CPU-tijd (Fluid Active CPU; zie CONTEXT.md,
// *Vercel-verbruik*). Daarom geen supabase-js op het publieke pad: een client
// opbouwen voor twee simpele selects was het zwaarste wat hier gebeurde. Een
// kale fetch naar PostgREST doet hetzelfde met dezelfde publieke sleutel, dus
// met dezelfde RLS-policies.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const TIMEOUT_MS = 1_000;

function rest(pad: string, init: { method?: string; body?: string } = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${pad}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "content-type": "application/json",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

async function select<T>(pad: string): Promise<T> {
  const res = await rest(pad);
  if (!res.ok) throw new Error(`PostgREST ${res.status} op ${pad}`);
  return (await res.json()) as T;
}

/**
 * De sessieclient van @supabase/ssr, pas geladen als een verzoek hem nodig
 * heeft: het adminpaneel, en de doorlaat voor beheerders tijdens onderhoud.
 * Zo blijft die bibliotheek (met supabase-js erin) buiten het publieke pad.
 */
async function sessionClient(request: NextRequest, extraHeaders?: Record<string, string>) {
  const { createServerClient } = await import("@supabase/ssr");
  // De headers pas opbouwen als de response gemaakt wordt: setAll hieronder
  // zet ververste cookies op `request`, en die moeten mee naar de pagina.
  const next = () => {
    if (!extraHeaders) return NextResponse.next({ request });
    const headers = new Headers(request.headers);
    for (const [k, v] of Object.entries(extraHeaders)) headers.set(k, v);
    return NextResponse.next({ request: { headers } });
  };
  let response = next();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = next();
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  return { supabase, response: () => response };
}

/* ---------- instellingen voor de poort ---------- */

type GateSettings = {
  maintenance: Maintenance;
  contact: Partial<ContactInfo> | null;
  redirects: RedirectRule[];
};

const OFF: GateSettings = { maintenance: { enabled: false, message: "" }, contact: null, redirects: [] };

// Deze poort draait vóór elke publieke pagina, ook de statische. Daarom:
// - een minuut onthouden per instantie, zodat niet elke paginaweergave een
//   query kost (best effort — een koude instantie vraagt het gewoon opnieuw op);
// - een harde timeout, en bij een fout of storing gaat de site open. Zonder dat
//   zou een haperend Supabase de hele site laten hangen, terwijl de pagina's
//   zelf gewoon uit de cache kunnen komen.
const CACHE_MS = 60_000;
let cached: { at: number; settings: GateSettings } | null = null;

type SettingRij = { key: string; value: unknown };

async function gateSettings(): Promise<GateSettings> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.settings;
  const [settingsRes, redirectsRes] = await Promise.allSettled([
    select<SettingRij[]>("site_settings?select=key,value&key=in.(maintenance,contact)"),
    select<RedirectRule[]>("redirects?select=source,destination,permanent"),
  ]);
  // Bij een fout de laatst bekende stand aanhouden, anders open. Ook die
  // uitkomst onthouden: tijdens een storing wacht dan niet élk verzoek de
  // volle timeout af. Doorverwijzingen staan los daarvan: faalt alleen die
  // query (bijvoorbeeld omdat migratie 0007 nog niet gedraaid is), dan blijft
  // de onderhoudsmodus gewoon werken.
  const settings: GateSettings = {
    ...(settingsRes.status === "rejected"
      ? cached?.settings ?? OFF
      : {
          maintenance: normalizeMaintenance(settingsRes.value.find((r) => r.key === "maintenance")?.value),
          contact: (settingsRes.value.find((r) => r.key === "contact")?.value as Partial<ContactInfo>) ?? null,
        }),
    redirects: redirectsRes.status === "rejected" ? cached?.settings.redirects ?? [] : redirectsRes.value || [],
  };
  cached = { at: Date.now(), settings };
  return settings;
}

/**
 * Beheerders zien de site tijdens onderhoud gewoon.
 *
 * Eén query op `admins`: de policy "own admin row" geeft een ingelogde
 * beheerder minstens zijn eigen rij, en iedereen anders niets. PostgREST
 * controleert de handtekening van het token, dus een zelfgemaakte cookie levert
 * hier niets op.
 */
async function adminPassThrough(request: NextRequest): Promise<NextResponse | null> {
  // Geen sessiecookie, geen beheerder — scheelt bezoekers een query.
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  if (!hasSession) return null;
  const { supabase, response } = await sessionClient(request);
  const { data } = await supabase
    .from("admins")
    .select("user_id")
    .limit(1)
    .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
  return data?.length ? response() : null;
}

async function publicGate(request: NextRequest, event: NextFetchEvent) {
  const { maintenance, contact, redirects } = await gateSettings();

  // Doorverwijzingen eerst, ook tijdens onderhoud: een 308 is informatie over
  // waar iets woont, en die blijft waar als de site weer opengaat.
  const rule = matchRedirect(request.nextUrl.pathname, redirects);
  if (rule) {
    // De teller mag de bezoeker niet ophouden; waitUntil laat hem na het
    // antwoord afmaken. Mislukt hij, dan is er alleen een tel minder.
    event.waitUntil(
      rest("rpc/redirect_hit", { method: "POST", body: JSON.stringify({ p_source: rule.source }) }).then(() => {}, () => {})
    );
    return NextResponse.redirect(targetUrl(rule.destination, request.nextUrl), rule.permanent ? 308 : 307);
  }

  // Een preview-deploy (staging) deelt de database met productie, dus ook de
  // onderhoudsschakelaar. Daar zou hij juist in de weg zitten: staging is er om
  // te bekijken wat er nog niet live mag. Vercel zet preview-deploys zelf op
  // noindex, dus Google ziet ze niet.
  if (process.env.VERCEL_ENV === "preview") return NextResponse.next();

  if (!maintenance.enabled) return NextResponse.next();

  const admin = await adminPassThrough(request);
  if (admin) return admin;

  // 503 + Retry-After is voor zoekmachines "tijdelijk weg, kom later terug":
  // pagina's houden hun plek in de index. Een 200 met deze tekst zou Google als
  // de nieuwe inhoud van elke pagina kunnen opnemen.
  return new NextResponse(maintenancePage(maintenance, contact), {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "retry-after": "3600",
      "cache-control": "no-store",
    },
  });
}

/* ---------- ingang ---------- */

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  // Afsluitende schuine streep weg: `/werkgevers/` → `/werkgevers` (308). Dit
  // deed Next zelf, maar dan vóór de vaste doorverwijzingen in next.config.ts,
  // zodat een oud adres met streep twee stappen nodig had. Nu staat die
  // ingebouwde redirect uit (`skipTrailingSlashRedirect`) en accepteren de
  // vaste regels de streep zelf; wat hier aankomt is dus geen vast adres en
  // krijgt de kale versie, mét querystring.
  if (pathname.length > 1 && pathname.endsWith("/")) {
    // Een gewone URL, geen nextUrl.clone(): NextURL onthoudt de streep van het
    // oorspronkelijke adres en zet hem bij het formatteren weer terug.
    const doel = new URL(request.url);
    doel.pathname = pathname.replace(/\/+$/, "") || "/";
    return NextResponse.redirect(doel, 308);
  }

  // Adminpaneel: alleen de sessie verversen. Dit is géén autorisatiepoort; die
  // staat in de pagina's zelf (requireAdmin/requirePerm).
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // Het pad gaat mee naar de pagina: verloopt de sessie, dan stuurt
    // requireAdmin() na het inloggen hierheen terug. Altijd overschrijven, zodat
    // een meegestuurde header van de browser niets doet.
    const { supabase, response } = await sessionClient(request, {
      [ADMIN_PAD_HEADER]: `${pathname}${request.nextUrl.search}`,
    });
    await supabase.auth.getUser();
    return response();
  }
  // Een offerte (/offerte/<token>), brochure (/brochure/<token>), contract (/contract/<token>), onboarding (/onboarding/<token>),
  // machtiging van een werknemer (/machtiging/<token>, 0038) of klantevaluatie (/evaluatie/<token>, 0043) is voor één persoon, geen
  // pagina van de site: geen onderhoudspagina en geen doorverwijzingen ervoor. Wie net wil tekenen, moet dat ook kunnen als de site even dicht is.
  if (["/offerte/", "/brochure/", "/contract/", "/onboarding/", "/machtiging/", "/evaluatie/"].some((p) => pathname.startsWith(p))) return NextResponse.next();
  return publicGate(request, event);
}

// Alles behalve Next's eigen bestanden, Vercel's eigen paden (analytics), de
// API (bezoekregistratie) en losse bestanden met een extensie (robots.txt,
// sitemap.xml, favicon, afbeeldingen).
export const config = { matcher: ["/((?!_next/|_vercel/|api/|.*\\.\\w+$).*)"] };
