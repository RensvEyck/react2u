import { notFound } from "next/navigation";
import { getekendePdf, pdfAntwoord } from "@/lib/offerteGetekend";

export const dynamic = "force-dynamic";

/**
 * De getekende offerte als pdf, met het ondertekeningscertificaat. Alleen
 * met het token en alleen als hij getekend is; anders een 404, net als de
 * pagina zelf. `?download=1` geeft hem als bestand.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token)) notFound();
  const pdf = await getekendePdf(token);
  if (!pdf) notFound();
  return pdfAntwoord(pdf, new URL(req.url).searchParams.has("download"));
}
