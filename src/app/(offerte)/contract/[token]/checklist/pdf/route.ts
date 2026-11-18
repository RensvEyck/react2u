import { notFound } from "next/navigation";
import { checklistPdfViaToken } from "@/lib/contractChecklistBestand";
import { pdfAntwoord } from "@/lib/offerteGetekend";

export const dynamic = "force-dynamic";

/**
 * De Checklist arbeidsomstandigheden als pdf (0042): met de antwoorden van de
 * klant als hij hem invulde, anders leeg om te printen. Alleen met het token
 * en alleen bij een basiscontract dat verstuurd of getekend is; anders een
 * 404. `?download=1` geeft het als bestand.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token)) notFound();
  const pdf = await checklistPdfViaToken(token);
  if (!pdf) notFound();
  return pdfAntwoord(pdf, new URL(req.url).searchParams.has("download"));
}
