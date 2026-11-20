import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { serviceRoleAvailable, supabaseAdmin } from "@/lib/supabase/admin";
import { herinneringNodig } from "@/lib/onboardingHerinnering";
import { documentKlaar, gekozen, ONBOARDING_EMAIL, vultIn, type Onboarding, type OnboardingGebeurtenis } from "@/lib/onboarding";
import { onboardingUrl, sendOnboarding } from "@/lib/mail";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Elke ochtend (vercel.json): een vriendelijke herinnering aan klanten die hun
 * onboarding niet openden of lieten liggen (lib/onboardingHerinnering.ts), met
 * de knop naar de eerstvolgende open stap. Dezelfde mail als de herinnering
 * uit het beheer, in de tijdlijn als 'herinnering' met automatisch = true.
 * Vercel Cron stuurt `Authorization: Bearer <CRON_SECRET>` mee; zonder dat
 * geheim doet de route niets. Met `?dry=1` alleen tellen.
 *
 * Draait met de service-role-sleutel: er is geen ingelogde collega om namens
 * te werken (zie src/lib/supabase/admin.ts voor de toegestane plekken).
 */
function toegestaan(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const a = Buffer.from(req.headers.get("authorization") || "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ ok: false, reden: "CRON_SECRET ontbreekt in Vercel" }, { status: 503 });
  if (!toegestaan(req)) return new NextResponse(null, { status: 401 });
  if (!serviceRoleAvailable()) return NextResponse.json({ ok: false, reden: "SUPABASE_SERVICE_ROLE_KEY ontbreekt in Vercel" }, { status: 503 });
  const dry = req.nextUrl.searchParams.get("dry") === "1";

  const sb = supabaseAdmin();
  const { data, error } = await sb.from("onboardings").select("*").eq("status", "verstuurd").not("email", "is", null);
  if (error) {
    // Vóór migratie 0037 bestaat de tabel niet: dan is er niets te doen.
    if (error.code === "PGRST205" || error.code === "42P01") return NextResponse.json({ ok: true, gecontroleerd: 0, verstuurd: 0 });
    console.error("[cron/onboarding] onboardings ophalen mislukt:", error.message);
    return NextResponse.json({ ok: false, reden: error.message }, { status: 500 });
  }
  const rijen = (data || []) as Onboarding[];
  const nu = new Date();
  const { contact, certificaten } = await offerteHuisstijl();
  let verstuurd = 0;
  const mislukt: string[] = [];
  const kandidaten: { nummer: string; reden: string }[] = [];

  for (const o of rijen) {
    const { data: g } = await sb.from("onboarding_gebeurtenissen").select("soort, at, details").eq("onboarding_id", o.id).eq("soort", "herinnering");
    const reden = herinneringNodig(o, (g || []) as Pick<OnboardingGebeurtenis, "soort" | "at" | "details">[], nu);
    if (!reden) continue;
    kandidaten.push({ nummer: o.nummer, reden });
    if (dry) continue;
    const res = await sendOnboarding({
      to: o.email!,
      aanhef: o.contactpersoon?.split(" ")[0] ?? null,
      bedrijf: o.bedrijf,
      nummer: o.nummer,
      link: onboardingUrl(o.token),
      bericht: null,
      afzender: { naam: o.afzender_naam, functie: o.afzender_functie, email: o.afzender_email || ONBOARDING_EMAIL, telefoon: o.afzender_telefoon },
      herinnering: true,
      documenten: gekozen(o).map((d) => ({ titel: d.titel, kort: d.kort, kleur: d.kleur, actie: vultIn(o, d.sleutel) ? d.invullen! : d.lezen, klaar: documentKlaar(o, d.sleutel) })),
      contact,
      certificaten,
    });
    if (!res.ok) {
      mislukt.push(o.nummer);
      continue;
    }
    await sb.from("onboarding_gebeurtenissen").insert({ onboarding_id: o.id, soort: "herinnering", door: "systeem", details: { aan: o.email, automatisch: true, reden } });
    verstuurd++;
  }

  const uitkomst = { ok: mislukt.length === 0, dry, gecontroleerd: rijen.length, kandidaten, verstuurd, mislukt };
  console.log("[cron/onboarding]", JSON.stringify(uitkomst));
  return NextResponse.json(uitkomst);
}
