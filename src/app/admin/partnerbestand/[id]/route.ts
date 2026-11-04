import { NextRequest, NextResponse } from "next/server";
import { requirePerm } from "@/lib/admin";
import { downloadNaam, PARTNER_BUCKET, type PartnerBestand } from "@/lib/partnerBestanden";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Een bestand bij een partner (migratie 0034), voor wie het salesrecht heeft.
 * Zoals de cv-route: het bestand wordt zelf uitgeleverd, niet doorverwezen naar
 * een deelbare link, altijd als download en met nosniff. Alleen een pad dat in
 * `partner_bestanden` staat, kan worden opgehaald.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  const { data: rij } = await sb.from("partner_bestanden").select("pad, naam").eq("id", id).maybeSingle();
  if (!rij) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  const b = rij as Pick<PartnerBestand, "pad" | "naam">;

  const { data, error } = await sb.storage.from(PARTNER_BUCKET).download(b.pad);
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
