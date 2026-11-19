import { NextRequest, NextResponse } from "next/server";
import { requirePerm } from "@/lib/admin";
import { downloadNaam, KLANT_BUCKET, type KlantBestand } from "@/lib/klantBestanden";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Een eigen bestand bij een klant (migratie 0048), voor wie het salesrecht
 * heeft. Zoals de partnerbestanden: het bestand wordt zelf uitgeleverd, niet
 * doorverwezen naar een deelbare link, altijd als download en met nosniff.
 * Alleen een pad dat in `klant_bestanden` staat, kan worden opgehaald.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  const { data: rij } = await sb.from("klant_bestanden").select("pad, naam").eq("id", id).maybeSingle();
  if (!rij) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  const b = rij as Pick<KlantBestand, "pad" | "naam">;

  const { data, error } = await sb.storage.from(KLANT_BUCKET).download(b.pad);
  if (error || !data) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  const naam = downloadNaam(b.naam);

  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${naam.ascii}"; filename*=UTF-8''${naam.utf8}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
