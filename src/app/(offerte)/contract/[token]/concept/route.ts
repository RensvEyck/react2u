import { notFound } from "next/navigation";
import { supabasePublic } from "@/lib/supabase/public";
import { contractUrl } from "@/lib/mail";
import { conceptContractPdf } from "@/lib/contractGetekend";
import { pdfAntwoord } from "@/lib/offerteGetekend";
import type { ContractPubliek } from "@/lib/contracten";

export const dynamic = "force-dynamic";

/**
 * Het contract als concept-pdf, om intern te bespreken (directie, OR, inkoop).
 * Telt niet als bezoek; tekenen blijft online. Na het tekenen een 404: dan is
 * er de echte pdf. `?download=1` als bestand.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token)) notFound();
  const { data } = await supabasePublic().rpc("contract_bekijken", { p_token: token, p_tel: false });
  const c = data as ContractPubliek | null;
  if (!c || c.status !== "verstuurd") notFound();
  const pdf = await conceptContractPdf(c, contractUrl(token));
  if (!pdf) notFound();
  return pdfAntwoord(pdf, new URL(req.url).searchParams.has("download"));
}
