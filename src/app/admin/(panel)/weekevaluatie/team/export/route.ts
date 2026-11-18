import { NextResponse } from "next/server";
import { requirePerm } from "@/lib/admin";
import { datumOver } from "@/lib/offertes";
import { haalKwartaal } from "@/lib/weekevaluatieDb";
import { exportNaam, exportRijen, kwartaalLabel, kwartaalVanDatum, leesKwartaal } from "@/lib/weekevaluatie";
import { xlsx } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

/**
 * De export van een kwartaal als Excelbestand (recht `omzet`): één rij per
 * collega per verstreken week, met de cijfers, de open antwoorden en de
 * declarabele uren; gemiste weken staan er leeg in. `?kwartaal=2026-Q4`.
 */
export async function GET(req: Request) {
  const { sb } = await requirePerm("omzet");
  const vandaag = datumOver(0);
  const k = leesKwartaal(new URL(req.url).searchParams.get("kwartaal")) ?? kwartaalVanDatum(vandaag);
  const o = await haalKwartaal(sb, k, vandaag);
  if (!o) return new NextResponse("Migratie 0044 is nog niet uitgevoerd.", { status: 503 });
  const rijen = exportRijen({ deelnemers: o.deelnemers, evaluaties: o.evaluaties, weken: o.weken, namen: o.namen, uren: o.uren, vandaag });
  const bestand = xlsx(rijen, kwartaalLabel(k));
  return new Response(new Uint8Array(bestand), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${exportNaam(k)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
