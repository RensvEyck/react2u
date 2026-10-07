import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";
import type { ContactInfo } from "@/lib/content";
import { maintenancePage, normalizeMaintenance, type Maintenance } from "@/lib/maintenance";
import { matchRedirect, targetUrl, type RedirectRule } from "@/lib/redirects";
import { ADMIN_PAD_HEADER } from "@/lib/terug";

function sessionClient(request: NextRequest, extraHeaders?: Record<string, string>) {
  // De headers pas opbouwen als de response gemaakt wordt: setAll hieronder
  // zet ververste cookies op `request`, en die moeten mee naar de pagina.
  const next = () => {
    if (!extraHeaders) return NextResponse.next({ request });
    const headers = new Headers(request.headers);
    for (const [k, v] of Object.entries(extraHeaders)) headers.set(k, v);
    return NextResponse.next({ request: { headers } });
  };
  let response = next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = next();
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );
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
// - kort onthouden per instantie, zodat niet elke paginaweergave een query kost
//   (best effort — een koude instantie vraagt het gewoon opnieuw op);
// - een harde timeout, en bij een fout of storing gaat de site open. Zonder dat
//   zou een haperend Supabase de hele site laten hangen, terwijl de pagina's
//   zelf gewoon uit de cache kunnen komen.
const CACHE_MS = 15_000;
const TIMEOUT_MS = 1_000;
let cached: { at: number; settings: GateSettings } | null = null;

async function gateSettings(): Promise<GateSettings> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.settings;
  const sb = supabasePublic();
  const [settingsRes, redirectsRes] = await Promise.all([
    sb.from("site_settings")
      .select("key, value")
      .in("key", ["maintenance", "contact"])
      .abortSignal(AbortSignal.timeout(TIMEOUT_MS)),
    sb.from("redirects")
      .select("source, destination, permanent")
      .abortSignal(AbortSignal.timeout(TIMEOUT_MS)),
  ]);
  const { data, error } = settingsRes;
  // Bij een fout de laatst bekende stand aanhouden, anders open. Ook die
  // uitkomst onthouden: tijdens een storing wacht dan niet élk verzoek de
  // volle timeout af. Doorverwijzingen staan los daarvan: faalt alleen die
  // query (bijvoorbeeld omdat migratie 0007 nog niet gedraaid is), dan blijft
  // de onderhoudsmodus gewoon werken.
  const settings: GateSettings = {
    ...(error
      ? cached?.settings ?? OFF
      : {
          maintenance: normalizeMaintenance(data?.find((r) => r.key === "maintenance")?.value),
          contact: (data?.find((r) => r.key === "contact")?.value as Partial<ContactInfo>) ?? null,
        }),
    redirects: redirectsRes.error
      ? cached?.settings.redirects ?? []
      : ((redirectsRes.data as RedirectRule[]) || []),
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
  const { supabase, response } = sessionClient(request);
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
      Promise.resolve(supabasePublic().rpc("redirect_hit", { p_source: rule.source })).then(() => {}, () => {})
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
    const { supabase, response } = sessionClient(request, {
      [ADMIN_PAD_HEADER]: `${pathname}${request.nextUrl.search}`,
    });
    await supabase.auth.getUser();
    return response();
  }
  return publicGate(request, event);
}

// Alles behalve Next's eigen bestanden, de API (bezoekregistratie) en losse
// bestanden met een extensie (robots.txt, sitemap.xml, favicon, afbeeldingen).
export const config = { matcher: ["/((?!_next/|api/|.*\\.\\w+$).*)"] };
