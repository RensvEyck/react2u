import { notFound } from "next/navigation";
import { supabasePublic } from "@/lib/supabase/public";
import { offerteUrl } from "@/lib/mail";
import { conceptPdf, keuzeUitUrl, pdfAntwoord } from "@/lib/offerteGetekend";
import type { OffertePubliek } from "@/lib/offertes";

export const dynamic = "force-dynamic";

/**
 * De offerte als concept-pdf, om intern te bespreken (directie, inkoop). Met
 * `?keuze=a,b` de keuze die de klant op de pagina heeft gemaakt. Telt niet als
 * bezoek en zet niets vast; tekenen blijft online. `?download=1` als bestand.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token)) notFound();
  const { data } = await supabasePublic().rpc("offerte_bekijken", { p_token: token, p_tel: false });
  const o = data as OffertePubliek | null;
  if (!o || o.status !== "verstuurd") notFound();
  const url = new URL(req.url);
  const pdf = await conceptPdf(o, keuzeUitUrl(url), offerteUrl(token));
  if (!pdf) notFound();
  return pdfAntwoord(pdf, url.searchParams.has("download"));
}
