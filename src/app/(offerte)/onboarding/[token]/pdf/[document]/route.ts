import { notFound } from "next/navigation";
import { supabasePublic } from "@/lib/supabase/public";
import { onboardingPdfAntwoord } from "@/lib/onboardingBestanden";
import { isDocument, type OnboardingPubliek } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

/**
 * Eén onboardingdocument als pdf (lib/onboardingPdf.tsx). Alleen met het
 * token en alleen voor een document dat bij deze onboarding hoort. Het
 * werknemersbestand is geen pdf maar Excel (../excel).
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string; document: string }> }) {
  const { token, document } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token) || !isDocument(document)) notFound();
  const { data } = await supabasePublic().rpc("onboarding_bekijken", { p_token: token, p_tel: false });
  const o = data as OnboardingPubliek | null;
  if (!o || o.status === "ingetrokken" || !o.documenten.includes(document) || document === "werknemers") notFound();
  return onboardingPdfAntwoord(o, document, new URL(req.url).searchParams.has("download"));
}
