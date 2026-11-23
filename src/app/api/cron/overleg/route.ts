import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { serviceRoleAvailable, supabaseAdmin } from "@/lib/supabase/admin";
import { firstName } from "@/lib/dashboard";
import { vandaagNL } from "@/lib/klanten";
import { herinneringVoor, nlDelen, overlegHerinnering, sorteerAgenda, type Actiepunt, type Agendapunt, type Overleg } from "@/lib/overleg";
import { sendOverlegHerinnering, siteBasis } from "@/lib/mail";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * De herinnering voor het CM-overleg (vercel.json, werkdagen in de ochtend):
 * staat het overleg op de eerstvolgende werkdag, dan krijgt iedereen met het
 * recht overleg een korte mail met de agenda en de eigen open actiepunten.
 * Eén keer per overleg (herinnerd_at); verzetten zet dat terug. Vercel Cron
 * stuurt `Authorization: Bearer <CRON_SECRET>` mee; met `?dry=1` alleen de
 * plannen.
 *
 * Draait met de service-role-sleutel: er is geen ingelogde collega om namens
 * te werken (zie src/lib/supabase/admin.ts).
 */
function toegestaan(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const a = Buffer.from(req.headers.get("authorization") || "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

type AdminRij = { user_id: string; email: string; roles: { permissions: string[] } | { permissions: string[] }[] | null };

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ ok: false, reden: "CRON_SECRET ontbreekt in Vercel" }, { status: 503 });
  if (!toegestaan(req)) return new NextResponse(null, { status: 401 });
  if (!serviceRoleAvailable()) return NextResponse.json({ ok: false, reden: "SUPABASE_SERVICE_ROLE_KEY ontbreekt in Vercel" }, { status: 503 });
  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const vandaag = vandaagNL();
  const doel = herinneringVoor(vandaag);

  const sb = supabaseAdmin();
  const { data: open, error } = await sb.from("cm_overleggen").select("*").is("afgerond_at", null).is("herinnerd_at", null);
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return NextResponse.json({ ok: true, reden: "migratie 0053 ontbreekt", verstuurd: 0 });
    console.error("[cron/overleg] overleggen ophalen mislukt:", error.message);
    return NextResponse.json({ ok: false, reden: error.message }, { status: 500 });
  }
  const overleg = ((open as Overleg[] | null) || []).find((o) => nlDelen(o.datum).datum === doel);
  if (!overleg) return NextResponse.json({ ok: true, reden: `geen overleg op ${doel}`, verstuurd: 0 });

  const [aRes, pRes, acRes] = await Promise.all([
    sb.from("admins").select("user_id, email, roles(permissions)"),
    sb.from("cm_agendapunten").select("*").eq("overleg_id", overleg.id),
    sb.from("cm_actiepunten").select("*").is("gedaan_at", null),
  ]);
  const ontvangers = (((aRes.data as unknown as AdminRij[] | null) || []))
    .filter((a) => {
      const rol = Array.isArray(a.roles) ? a.roles[0] : a.roles;
      return a.email && (rol?.permissions || []).includes("overleg");
    });
  const agenda = sorteerAgenda((pRes.data as Agendapunt[] | null) || []).map((p) => p.titel);
  const acties = (acRes.data as Actiepunt[] | null) || [];
  const basis = siteBasis();
  const { contact } = await offerteHuisstijl();

  const plannen: { aan: string; onderwerp: string; acties: number }[] = [];
  let verstuurd = 0;
  const mislukt: string[] = [];
  for (const o of ontvangers) {
    const eigen = acties.filter((a) => a.wie === o.user_id);
    const h = overlegHerinnering(firstName(o.email), overleg, agenda, eigen, vandaag);
    plannen.push({ aan: o.email, onderwerp: h.onderwerp, acties: eigen.length });
    if (dry) continue;
    const res = await sendOverlegHerinnering({ to: o.email, ...h, link: `${basis}/admin/overleg`, contact });
    if (res.ok) verstuurd++;
    else mislukt.push(`${o.email}: ${res.reden}${res.melding ? ` (${res.melding})` : ""}`);
  }
  if (!dry && verstuurd > 0) await sb.from("cm_overleggen").update({ herinnerd_at: new Date().toISOString() }).eq("id", overleg.id);
  return NextResponse.json({ ok: true, doel, overleg: overleg.id, plannen, verstuurd, mislukt });
}
