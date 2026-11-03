import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { contractUrl } from "@/lib/mail";
import { conceptContractPdf } from "@/lib/contractGetekend";
import { pdfAntwoord } from "@/lib/offerteGetekend";
import type { Contract } from "@/lib/contracten";

export const dynamic = "force-dynamic";

/**
 * De concept-pdf vanuit het beheer (recht `bellijst`), ook voor een contract
 * dat nog niet verstuurd is: om mee te sturen of te printen voor een gesprek.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const { data } = await sb.from("contracten").select("*").eq("id", id).maybeSingle();
  const c = data as Contract | null;
  if (!c) notFound();
  const pdf = await conceptContractPdf(c, contractUrl(c.token));
  if (!pdf) notFound();
  return pdfAntwoord(pdf, new URL(req.url).searchParams.has("download"));
}
