import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { serviceRoleAvailable, supabaseAdmin } from "@/lib/supabase/admin";
import { vandaagNL, type Gesprek, type Klant } from "@/lib/klanten";
import { ochtendmail } from "@/lib/ochtendmail";
import { haalVerkoop, verkoopOverzicht } from "@/lib/opvolgenDb";
import { sendOchtendmail, siteBasis } from "@/lib/mail";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * De ochtendmail van het klantenbord (vercel.json, elke werkdag om zeven uur
 * Nederlandse tijd): aan elke collega met het salesrecht wat vandaag moet en
 * te laat is (eerst wat van hem of haar is), wat klanten gisteren deden en wat
 * er volgens de modules opgevolgd moet worden. De inhoud komt uit
 * lib/ochtendmail.ts; zonder iets te melden gaat er geen mail. Vercel Cron
 * stuurt `Authorization: Bearer <CRON_SECRET>` mee; met `?dry=1` alleen de
 * plannen, met `?weekend=1` ook in het weekend.
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

type Ontvanger = { email: string; roles: { permissions: string[] } | { permissions: string[] }[] | null };

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ ok: false, reden: "CRON_SECRET ontbreekt in Vercel" }, { status: 503 });
  if (!toegestaan(req)) return new NextResponse(null, { status: 401 });
  if (!serviceRoleAvailable()) return NextResponse.json({ ok: false, reden: "SUPABASE_SERVICE_ROLE_KEY ontbreekt in Vercel" }, { status: 503 });
  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const nu = new Date();
  const vandaag = vandaagNL(nu);
  const weekdag = new Date(`${vandaag}T12:00:00Z`).getUTCDay();
  if ((weekdag === 0 || weekdag === 6) && req.nextUrl.searchParams.get("weekend") !== "1") return NextResponse.json({ ok: true, reden: "weekend", verstuurd: 0 });

  const sb = supabaseAdmin();
  const gisteren = new Date(nu.getTime() - 30 * 3_600_000).toISOString();
  const [kRes, gRes, aRes] = await Promise.all([
    sb.from("klanten").select("*").limit(2000),
    sb.from("klant_gesprekken").select("*").eq("soort", "systeem").eq("contact", true).gte("created_at", gisteren).order("created_at", { ascending: false }).limit(500),
    sb.from("admins").select("email, roles(permissions)"),
  ]);
  if (kRes.error) {
    if (kRes.error.code === "PGRST205" || kRes.error.code === "42P01") return NextResponse.json({ ok: true, reden: "geen klantenbord", verstuurd: 0 });
    console.error("[cron/klantenbord] klanten ophalen mislukt:", kRes.error.message);
    return NextResponse.json({ ok: false, reden: kRes.error.message }, { status: 500 });
  }
  const klanten = (kRes.data as Klant[] | null) || [];
  // Wat de klant zelf deed: bekeken, gekozen, getekend, ingevuld. Niet wat wij stuurden.
  const gisterenRijen = ((gRes.data as Gesprek[] | null) || []).filter((g) => g.door === "klant" || /getekend|tekende/.test(g.tekst));
  const verkoop = await haalVerkoop(sb as unknown as Parameters<typeof haalVerkoop>[0], nu).catch(() => null);
  const signalen = verkoop ? verkoopOverzicht(verkoop, [], nu).signalen : [];
  const basis = siteBasis();
  const ontvangers = ((aRes.data as unknown as Ontvanger[] | null) || []).filter((a) => {
    const rol = Array.isArray(a.roles) ? a.roles[0] : a.roles;
    return a.email && (rol?.permissions || []).includes("bellijst");
  });

  const { contact, certificaten } = await offerteHuisstijl();
  const plannen: { aan: string; onderwerp: string; delen: number }[] = [];
  let verstuurd = 0;
  const mislukt: string[] = [];
  for (const o of ontvangers) {
    const m = ochtendmail({ klanten, gisteren: gisterenRijen, signalen, vandaag, basis }, o.email);
    if (!m) continue;
    plannen.push({ aan: o.email, onderwerp: m.onderwerp, delen: m.delen.length });
    if (dry) continue;
    const res = await sendOchtendmail({ to: o.email, onderwerp: m.onderwerp, aanhef: m.aanhef, delen: m.delen, link: `${basis}/admin/klantenbord/vandaag`, contact, certificaten });
    if (res.ok) verstuurd++;
    else mislukt.push(`${o.email}: ${res.reden}${res.melding ? ` (${res.melding})` : ""}`);
  }
  return NextResponse.json({ ok: true, ontvangers: ontvangers.length, plannen, verstuurd, mislukt });
}
