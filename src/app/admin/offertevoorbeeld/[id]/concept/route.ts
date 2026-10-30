import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { offerteUrl } from "@/lib/mail";
import { conceptPdf, keuzeUitUrl, pdfAntwoord } from "@/lib/offerteGetekend";
import { datumOver, normaliseerRegels, type Offerte, type OffertePubliek } from "@/lib/offertes";

export const dynamic = "force-dynamic";

/**
 * Dezelfde concept-pdf als de klant kan downloaden, vanuit het beheer (recht
 * `bellijst`), ook voor een concept dat nog niet verstuurd is. Handig om mee
 * te sturen of te printen voor een gesprek.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const { data } = await sb.from("offertes").select("*").eq("id", id).maybeSingle();
  const rij = data as Offerte | null;
  if (!rij) notFound();
  const o: OffertePubliek = { ...rij, regels: normaliseerRegels(rij.regels), verlopen: Boolean(rij.geldig_tot && rij.geldig_tot < datumOver(0)) };
  const url = new URL(req.url);
  const pdf = await conceptPdf(o, keuzeUitUrl(url), offerteUrl(rij.token));
  if (!pdf) notFound();
  return pdfAntwoord(pdf, url.searchParams.has("download"));
}
