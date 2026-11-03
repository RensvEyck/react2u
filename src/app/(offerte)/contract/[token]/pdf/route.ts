import { notFound } from "next/navigation";
import { getekendContractPdf } from "@/lib/contractGetekend";
import { pdfAntwoord } from "@/lib/offerteGetekend";

export const dynamic = "force-dynamic";

/**
 * Het getekende contract als pdf, met het ondertekeningscertificaat. Alleen
 * met het token en alleen als het getekend is; anders een 404, net als bij een
 * offerte. `?download=1` geeft het als bestand.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token)) notFound();
  const pdf = await getekendContractPdf(token);
  if (!pdf) notFound();
  return pdfAntwoord(pdf, new URL(req.url).searchParams.has("download"));
}
