import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";
import { brochurePdf } from "@/lib/brochurePdf";
import { brochureDiensten, brochurePrijslijst } from "@/lib/brochureHuisstijl";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";
import type { BrochurePubliek } from "@/lib/brochures";

export const dynamic = "force-dynamic";

/**
 * De brochure als pdf, dezelfde inhoud als de pagina (lib/brochurePdf.tsx).
 * Alleen met het token; een ingetrokken of onbekende brochure geeft een 404,
 * net als de pagina. `?download=1` geeft hem als bestand. Een pdf ophalen telt
 * niet als bezoek: dat doet de pagina al.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token)) notFound();
  const { data } = await supabasePublic().rpc("brochure_bekijken", { p_token: token, p_tel: false });
  const brochure = data as BrochurePubliek | null;
  if (!brochure || brochure.status === "ingetrokken") notFound();
  const [[diensten, prijslijst], huis] = await Promise.all([
    brochureDiensten().then(async (d) => [d, await brochurePrijslijst(d)] as const),
    offerteHuisstijl(),
  ]);
  const pdf = await brochurePdf({ brochure, diensten, prijslijst, contact: huis.contact });
  const download = new URL(req.url).searchParams.has("download");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="React2u-brochure-${brochure.nummer}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
