import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { serviceRoleAvailable, supabaseAdmin } from "@/lib/supabase/admin";
import { firstName } from "@/lib/dashboard";
import { vandaagNL } from "@/lib/klanten";
import { maandagVan, plusWeken } from "@/lib/uren";
import { herinnering, wieHerinneren, type Deelnemer } from "@/lib/weekevaluatie";
import { sendWeekevaluatieHerinnering, siteBasis } from "@/lib/mail";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * De vrijdagherinnering van de weekevaluatie (vercel.json, vrijdag 14:00 of
 * 15:00 Nederlandse tijd): een korte mail aan elke collega die meedoet
 * (lib/weekevaluatie.ts, `wieHerinneren`) en deze week nog niets invulde.
 * Wie al invulde krijgt niets; de super admin alleen als hij zelf meedoet.
 * Vercel Cron stuurt `Authorization: Bearer <CRON_SECRET>` mee; met `?dry=1`
 * alleen de plannen, met `?altijd=1` ook op een andere dag dan vrijdag.
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

type AdminRij = {
  user_id: string;
  email: string;
  invited_at: string | null;
  created_at: string;
  roles: { key: string; permissions: string[] } | { key: string; permissions: string[] }[] | null;
};

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ ok: false, reden: "CRON_SECRET ontbreekt in Vercel" }, { status: 503 });
  if (!toegestaan(req)) return new NextResponse(null, { status: 401 });
  if (!serviceRoleAvailable()) return NextResponse.json({ ok: false, reden: "SUPABASE_SERVICE_ROLE_KEY ontbreekt in Vercel" }, { status: 503 });
  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const vandaag = vandaagNL();
  const weekdag = new Date(`${vandaag}T12:00:00Z`).getUTCDay();
  if (weekdag !== 5 && req.nextUrl.searchParams.get("altijd") !== "1") return NextResponse.json({ ok: true, reden: "geen vrijdag", verstuurd: 0 });
  const week = maandagVan(vandaag);

  const sb = supabaseAdmin();
  const [aRes, eRes] = await Promise.all([
    sb.from("admins").select("user_id, email, invited_at, created_at, roles(key, permissions)"),
    sb.from("weekevaluaties").select("user_id, week").gte("week", plusWeken(week, -1)),
  ]);
  if (eRes.error) {
    if (eRes.error.code === "PGRST205" || eRes.error.code === "42P01") return NextResponse.json({ ok: true, reden: "migratie 0044 ontbreekt", verstuurd: 0 });
    console.error("[cron/weekevaluatie] evaluaties ophalen mislukt:", eRes.error.message);
    return NextResponse.json({ ok: false, reden: eRes.error.message }, { status: 500 });
  }
  const deelnemers: Deelnemer[] = (((aRes.data as unknown as AdminRij[] | null) || []))
    .map((a) => {
      const rol = Array.isArray(a.roles) ? a.roles[0] : a.roles;
      return { user_id: a.user_id, email: a.email, rol: rol?.key || "", permissions: rol?.permissions || [], sinds: (a.invited_at || a.created_at).slice(0, 10) };
    })
    .filter((a) => a.email && a.permissions.includes("weekevaluatie"));
  const recent = (eRes.data as { user_id: string; week: string }[] | null) || [];
  // Of een super admin ooit meedeed staat niet in de laatste twee weken; dat vraagt een eigen blik.
  const superadmins = deelnemers.filter((d) => d.rol === "superadmin").map((d) => d.user_id);
  const ooit = superadmins.length ? await sb.from("weekevaluaties").select("user_id").in("user_id", superadmins).limit(100) : { data: [] };
  const alle = [...recent, ...(((ooit.data as { user_id: string }[] | null) || []).map((r) => ({ user_id: r.user_id, week: "" })))];

  const ontvangers = wieHerinneren(deelnemers, alle, week);
  const vorigeWeekOpen = new Set(recent.filter((e) => e.week === plusWeken(week, -1)).map((e) => e.user_id));
  const basis = siteBasis();
  const { contact } = await offerteHuisstijl();
  const plannen: { aan: string; onderwerp: string }[] = [];
  let verstuurd = 0;
  const mislukt: string[] = [];
  for (const d of ontvangers) {
    const h = herinnering(firstName(d.email), week, { vorigeWeekOok: !vorigeWeekOpen.has(d.user_id) });
    plannen.push({ aan: d.email, onderwerp: h.onderwerp });
    if (dry) continue;
    const res = await sendWeekevaluatieHerinnering({ to: d.email, ...h, link: `${basis}/admin/weekevaluatie`, contact });
    if (res.ok) verstuurd++;
    else mislukt.push(`${d.email}: ${res.reden}${res.melding ? ` (${res.melding})` : ""}`);
  }
  return NextResponse.json({ ok: true, week, deelnemers: deelnemers.length, plannen, verstuurd, mislukt });
}
