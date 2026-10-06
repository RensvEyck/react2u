import { NextResponse, type NextRequest } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";
import { clientIp, visitorHash, referrerHost, isTrackablePath, normalizePath } from "@/lib/analytics";
import { isIgnored, lookupCompany } from "@/lib/companyLookup";
import { missingReferrer } from "@/lib/redirects";
import { mayIdentify, normalizeTracking, TRACKING_DEFAULT, type TrackingSettings } from "@/lib/tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// De instelling kort onthouden per instantie: dit draait bij elke paginaweergave.
const SETTINGS_MS = 60_000;
let cachedSettings: { at: number; value: TrackingSettings } | null = null;

async function trackingSettings(): Promise<TrackingSettings> {
  if (cachedSettings && Date.now() - cachedSettings.at < SETTINGS_MS) return cachedSettings.value;
  try {
    const { data } = await supabasePublic()
      .from("site_settings").select("value").eq("key", "tracking")
      .abortSignal(AbortSignal.timeout(1000))
      .maybeSingle();
    cachedSettings = { at: Date.now(), value: normalizeTracking(data?.value) };
  } catch {
    cachedSettings = { at: Date.now(), value: cachedSettings?.value ?? TRACKING_DEFAULT };
  }
  return cachedSettings.value;
}

export async function POST(req: NextRequest) {
  // Altijd 204 teruggeven, wat er ook misgaat. Dit is een zijspoor: een
  // bezoeker mag hier nooit iets van merken, en een mislukte registratie is
  // geen fout die de site aangaat.
  const ok = () => new NextResponse(null, { status: 204 });

  try {
    const body = (await req.json()) as {
      path?: string; referrer?: string; missing?: boolean;
      /** De keuze "Statistiek" in de cookiemelding: aan, uit, of nog niets gekozen. */
      consent?: boolean | null;
    };
    const raw = String(body.path || "");
    if (!isTrackablePath(raw)) return ok();
    const path = normalizePath(raw);

    // Een 404 is geen bezoek. Die gaat naar missing_paths, zonder IP of hash —
    // alleen het pad en waar de link stond. Zie migratie 0007.
    if (body.missing) {
      await supabasePublic().rpc("log_missing_path", {
        p_path: path,
        p_referrer: missingReferrer(body.referrer, req.headers.get("host") || undefined),
      });
      return ok();
    }

    const ip = clientIp(req.headers);
    if (!ip) return ok();

    // Zonder geheim zout registreren we niets.
    //
    // Dit viel eerder terug op de anon-sleutel en daarna op een vaste string.
    // Beide zijn publiek, en daarmee was de hash terug te rekenen naar een IP:
    // je hoeft alleen de IP-reeks van een provider af te lopen. De opslag heette
    // dan wel anoniem, maar was het niet. Stil doorgaan met een waardeloos zout
    // is erger dan niet meten — dan denk je dat je aan dataminimalisatie doet
    // terwijl je pseudonieme persoonsgegevens bewaart.
    const salt = process.env.ANALYTICS_SALT;
    if (!salt) return ok();

    const day = new Date().toISOString().slice(0, 10);
    const hash = visitorHash(ip, req.headers.get("user-agent") || "", day, salt);

    // Welk bedrijf — maar alleen als dat mag. Standaard pas na toestemming in
    // de cookiemelding ("Statistiek"); de beheerder kan dat op gerechtvaardigd
    // belang zetten als de privacyverklaring die afweging bevat (lib/tracking.ts).
    // Zonder die grond gaat het IP-adres nergens heen: geen ipinfo, geen
    // reverse DNS. Het bezoek zelf wordt wel geteld, zonder bedrijf.
    const consent = typeof body.consent === "boolean" ? body.consent : null;
    const identify = mayIdentify(await trackingSettings(), consent);
    const found = identify ? await lookupCompany(ip) : null;
    const company = found && !(await isIgnored(found)) ? found : null;

    const row = {
      path,
      referrer_host: referrerHost(body.referrer, req.headers.get("host") || undefined),
      country: req.headers.get("x-vercel-ip-country") || null,
      company: company?.name ?? null,
      is_company: Boolean(company),
      visitor_hash: hash,
    };
    const sb = supabasePublic();
    const { error } = await sb.from("page_views").insert({
      ...row,
      company_domain: company?.domain ?? null,
      company_source: company?.source ?? null,
    });
    // Vóór migratie 0010 bestaan die twee kolommen nog niet. Dan zonder, anders
    // gaat elk bezoek verloren in plaats van alleen het domein.
    if (error && (error.code === "42703" || error.code === "PGRST204")) {
      await sb.from("page_views").insert(row);
    }

    return ok();
  } catch {
    return ok();
  }
}
