import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";
import type { ContactInfo } from "@/lib/content";
import { maintenancePage, normalizeMaintenance, type Maintenance } from "@/lib/maintenance";

function sessionClient(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );
  return { supabase, response: () => response };
}

/* ---------- onderhoudsmodus ---------- */

type GateSettings = { maintenance: Maintenance; contact: Partial<ContactInfo> | null };

const OFF: GateSettings = { maintenance: { enabled: false, message: "" }, contact: null };

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
  const { data, error } = await supabasePublic()
    .from("site_settings")
    .select("key, value")
    .in("key", ["maintenance", "contact"])
    .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
  // Bij een fout de laatst bekende stand aanhouden, anders open. Ook die
  // uitkomst onthouden: tijdens een storing wacht dan niet élk verzoek de
  // volle timeout af.
  const settings = error
    ? cached?.settings ?? OFF
    : {
        maintenance: normalizeMaintenance(data?.find((r) => r.key === "maintenance")?.value),
        contact: (data?.find((r) => r.key === "contact")?.value as Partial<ContactInfo>) ?? null,
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

async function maintenanceGate(request: NextRequest) {
  // Een preview-deploy (staging) deelt de database met productie, dus ook de
  // schakelaar. Daar zou hij juist in de weg zitten: staging is er om te
  // bekijken wat er nog niet live mag. Vercel zet preview-deploys zelf op
  // noindex, dus Google ziet ze niet.
  if (process.env.VERCEL_ENV === "preview") return NextResponse.next();
  const { maintenance, contact } = await gateSettings();
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Adminpaneel: alleen de sessie verversen. Dit is géén autorisatiepoort; die
  // staat in de pagina's zelf (requireAdmin/requirePerm).
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const { supabase, response } = sessionClient(request);
    await supabase.auth.getUser();
    return response();
  }
  return maintenanceGate(request);
}

// Alles behalve Next's eigen bestanden, de API (bezoekregistratie) en losse
// bestanden met een extensie (robots.txt, sitemap.xml, favicon, afbeeldingen).
export const config = { matcher: ["/((?!_next/|api/|.*\\.\\w+$).*)"] };
