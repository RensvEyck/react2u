import { NextResponse } from "next/server";
import { requirePerm } from "@/lib/admin";
import { naarXpertRijen, XPERT_KOLOMMEN, type Onboarding, type Werknemer } from "@/lib/onboarding";
import { xlsx } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

/**
 * Het werknemersbestand van een onboarding als .xlsx, in het formaat van het
 * lege importbestand van XpertSuite (37 kolommen, blad "Sheet 1"). Alleen met
 * het salesrecht, net als de rest van de onboarding.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const { data } = await sb.from("onboardings").select("nummer, bedrijf, debiteurnummer, antwoorden").eq("id", id).maybeSingle();
  const o = data as Pick<Onboarding, "nummer" | "bedrijf" | "debiteurnummer" | "antwoorden"> | null;
  const rijen = ((o?.antwoorden?.werknemers?.data as { rijen?: Werknemer[] } | undefined)?.rijen) || [];
  if (!o || !rijen.length) return new NextResponse("Geen werknemersbestand.", { status: 404 });
  const bestand = xlsx([[...XPERT_KOLOMMEN], ...naarXpertRijen(rijen, o.debiteurnummer)]);
  const naam = `Import XpertSuite ${o.bedrijf}`.replace(/[^\p{L}\p{N} ._-]/gu, "").trim().slice(0, 80) || o.nummer;
  return new NextResponse(new Uint8Array(bestand), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${naam}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
