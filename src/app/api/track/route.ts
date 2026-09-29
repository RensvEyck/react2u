import { NextResponse, type NextRequest } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";
import {
  clientIp, visitorHash, isCompanyOrg, cleanOrgName, referrerHost,
  isTrackablePath, normalizePath,
} from "@/lib/analytics";
import { missingReferrer } from "@/lib/redirects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Zoekt op welke organisatie achter een IP zit.
 *
 * Zonder IPINFO_TOKEN gebeurt er niets — dan wordt het bezoek gewoon zonder
 * bedrijfsnaam geregistreerd. Net als bij de notificatiemail is de verrijking
 * een extra, geen voorwaarde: liever een bezoek zonder bedrijf dan geen bezoek.
 */
async function lookupOrg(ip: string): Promise<string | null> {
  const token = process.env.IPINFO_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${token}`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { org?: string; company?: { name?: string } };
    return cleanOrgName(data.company?.name || data.org);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  // Altijd 204 teruggeven, wat er ook misgaat. Dit is een zijspoor: een
  // bezoeker mag hier nooit iets van merken, en een mislukte registratie is
  // geen fout die de site aangaat.
  const ok = () => new NextResponse(null, { status: 204 });

  try {
    const body = (await req.json()) as { path?: string; referrer?: string; missing?: boolean };
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

    const org = await lookupOrg(ip);
    const isCompany = isCompanyOrg(org);

    await supabasePublic().from("page_views").insert({
      path,
      referrer_host: referrerHost(body.referrer, req.headers.get("host") || undefined),
      country: req.headers.get("x-vercel-ip-country") || null,
      // Providernamen bewaren we niet: die zeggen niets en zouden het overzicht
      // vervuilen. Alleen echte organisaties.
      company: isCompany ? org : null,
      is_company: isCompany,
      visitor_hash: hash,
    });

    return ok();
  } catch {
    return ok();
  }
}
