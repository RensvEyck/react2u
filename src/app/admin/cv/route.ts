import { NextRequest, NextResponse } from "next/server";
import { requirePerm } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Levert een cv uit aan iemand met het recht `postvak`.
 *
 * Twee dingen zijn hier bewust anders dan de voor de hand liggende oplossing.
 *
 * 1. **Het pad wordt getoetst aan een bestaande sollicitatie.** Eerder tekende
 *    deze route élk pad dat je meegaf. Omdat de bucket door anonieme bezoekers
 *    beschreven kan worden, kon een aanvaller een eigen bestand uploaden, een
 *    sollicitatie met dat pad indienen en zo een medewerker naar door hem
 *    aangeleverde inhoud laten klikken — vanuit het vertrouwde adminpaneel.
 *    Nu bestaat het pad alleen als er echt een sollicitatie bij hoort.
 *
 * 2. **Het bestand wordt doorgestuurd in plaats van doorverwezen.** Een signed
 *    URL belandt in de adresbalk, de geschiedenis en de referrer, is tien
 *    minuten geldig en is niet in te trekken. Door de bytes zelf uit te leveren
 *    ontstaat er geen deelbaar token. Bovendien bepalen wij het content-type en
 *    forceren we een download, zodat een als cv vermomd HTML-bestand niet in de
 *    browser van de medewerker rendert.
 */
export async function GET(req: NextRequest) {
  const { sb } = await requirePerm("postvak");
  const path = req.nextUrl.searchParams.get("path");
  if (!path) return NextResponse.json({ error: "path ontbreekt" }, { status: 400 });

  // Bestaat er een sollicitatie met precies dit cv? RLS zorgt er al voor dat
  // alleen iemand met `postvak` deze tabel mag lezen.
  const { data: app } = await sb
    .from("applications")
    .select("id, name")
    .eq("cv_path", path)
    .maybeSingle();
  if (!app) return NextResponse.json({ error: "CV niet gevonden" }, { status: 404 });

  const { data, error } = await sb.storage.from("cvs").download(path);
  if (error || !data) return NextResponse.json({ error: "CV niet gevonden" }, { status: 404 });

  // Nooit het opgeslagen content-type overnemen: dat komt van de uploader.
  const naam = path.split("/").pop() || "cv";
  const veiligeNaam = naam.replace(/[^a-zA-Z0-9._-]/g, "_");

  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${veiligeNaam}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
