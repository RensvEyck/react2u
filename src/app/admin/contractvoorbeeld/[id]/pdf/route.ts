import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { getekendContractPdf } from "@/lib/contractGetekend";
import { pdfAntwoord } from "@/lib/offerteGetekend";

export const dynamic = "force-dynamic";

/**
 * Dezelfde pdf als de klant krijgt, vanuit het beheer (recht `bellijst`). Het
 * token komt met je eigen sessie uit de database; de pdf zelf ontstaat net als
 * bij de klant uit de vastgelegde versie.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const { data } = await sb.from("contracten").select("token, status").eq("id", id).maybeSingle();
  const rij = data as { token: string; status: string } | null;
  if (!rij || rij.status !== "getekend") notFound();
  const pdf = await getekendContractPdf(rij.token);
  if (!pdf) notFound();
  return pdfAntwoord(pdf, new URL(req.url).searchParams.has("download"));
}
