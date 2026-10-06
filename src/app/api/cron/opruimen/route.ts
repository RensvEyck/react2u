import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { serviceRoleAvailable, supabaseAdmin } from "@/lib/supabase/admin";
import { isExpired } from "@/lib/retention";
import { removeCvs } from "@/lib/cvs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Dagelijkse opschoning van sollicitaties die over hun bewaartermijn zijn
 * (src/lib/retention.ts), cv's inbegrepen. Vercel Cron roept dit aan volgens
 * vercel.json en stuurt `Authorization: Bearer <CRON_SECRET>` mee; zonder dat
 * geheim doet de route niets.
 *
 * Waarom hier en niet in pg_cron: een cv staat in Storage, en alleen de
 * Storage-API verwijdert het bestand écht. Een `delete` op storage.objects
 * laat de bytes staan — het lijkt dan gewist terwijl het er nog is.
 *
 * Draait met de service-role-sleutel: er is geen ingelogde beheerder om
 * namens te werken. Dit is één van de drie toegestane plekken (zie
 * src/lib/supabase/admin.ts).
 *
 * Volgorde per sollicitatie: eerst het cv, dan de rij. Lukt het cv niet, dan
 * blijft de rij staan en komt hij morgen terug — en wijst het Postvak IN hem
 * aan. Een rij wissen terwijl het bestand blijft hangen is erger.
 *
 * Met `?dry=1` wordt er niets verwijderd, alleen geteld — om de koppeling te
 * controleren zonder iets kwijt te raken.
 */
type Rij = { id: string; status: "nieuw" | "in_behandeling" | "afgewezen" | "aangenomen"; created_at: string; cv_path: string | null; retain_longer?: boolean | null };

function toegestaan(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const gegeven = req.headers.get("authorization") || "";
  const a = Buffer.from(gegeven);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, reden: "CRON_SECRET ontbreekt in Vercel" }, { status: 503 });
  }
  if (!toegestaan(req)) return new NextResponse(null, { status: 401 });
  if (!serviceRoleAvailable()) {
    return NextResponse.json({ ok: false, reden: "SUPABASE_SERVICE_ROLE_KEY ontbreekt in Vercel" }, { status: 503 });
  }

  const sb = supabaseAdmin();
  let { data, error } = await sb.from("applications").select("id, status, created_at, cv_path, retain_longer");
  // Vóór migratie 0013 bestaat retain_longer niet; dan zonder toestemmingskolom.
  if (error && (error.code === "42703" || error.code === "PGRST204")) {
    ({ data, error } = await sb.from("applications").select("id, status, created_at, cv_path"));
  }
  if (error) {
    console.error("[opruimen] sollicitaties ophalen mislukt:", error.message);
    return NextResponse.json({ ok: false, reden: error.message }, { status: 500 });
  }

  const nu = new Date();
  const rijen = (data || []) as Rij[];
  const verlopen = rijen.filter((r) => isExpired(r, nu));
  const dry = req.nextUrl.searchParams.get("dry") === "1";
  let verwijderd = 0;
  const cvBleefStaan: string[] = [];
  const rijFout: string[] = [];

  for (const r of dry ? [] : verlopen) {
    if (r.cv_path && !(await removeCvs(sb, [r.cv_path]))) {
      cvBleefStaan.push(r.id);
      continue;
    }
    const { error: delErr } = await sb.from("applications").delete().eq("id", r.id);
    if (delErr) rijFout.push(r.id);
    else verwijderd++;
  }

  const uitkomst = {
    ok: cvBleefStaan.length === 0 && rijFout.length === 0,
    dry,
    gecontroleerd: rijen.length,
    verlopen: verlopen.length,
    verwijderd,
    cvNietVerwijderd: cvBleefStaan.length,
    rijNietVerwijderd: rijFout.length,
  };
  console.log("[opruimen]", JSON.stringify(uitkomst));
  return NextResponse.json(uitkomst);
}
