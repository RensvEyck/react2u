import { notFound } from "next/navigation";
import { supabasePublic } from "@/lib/supabase/public";
import { leegWerknemersbestand } from "@/lib/onboardingBestanden";
import type { OnboardingPubliek, Werknemer } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

/**
 * Het werknemersbestand (import XpertSuite) voor de klant: de 37 kolommen, om
 * in Excel in te vullen en te uploaden (of terug te mailen). Met de
 * medewerkers die al online staan, zodat hij in Excel verder kan.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token)) notFound();
  const { data } = await supabasePublic().rpc("onboarding_bekijken", { p_token: token, p_tel: false });
  const o = data as OnboardingPubliek | null;
  if (!o || o.status === "ingetrokken" || !o.documenten.includes("werknemers")) notFound();
  return leegWerknemersbestand(o.bedrijf, ((o.antwoorden?.werknemers?.data as { rijen?: Werknemer[] } | undefined)?.rijen) || []);
}
