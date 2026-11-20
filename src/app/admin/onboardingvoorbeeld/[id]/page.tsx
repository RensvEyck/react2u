import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import OnboardingPagina from "@/components/onboarding/OnboardingPagina";
import type { Onboarding, OnboardingPubliek } from "@/lib/onboarding";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

export const dynamic = "force-dynamic";

/**
 * De onboarding zoals de klant hem ziet, ook als het nog een concept is. Buiten
 * het paneel (geen zijmenu), zoals het offerte- en contractvoorbeeld; de
 * gegevens komen met je eigen sessie uit de database, zonder het bezoek te
 * tellen. Invullen en afvinken kan hier niet: dat doet de klant via zijn link.
 */
export default async function OnboardingVoorbeeld({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const [{ data }, huis] = await Promise.all([sb.from("onboardings").select("*").eq("id", id).maybeSingle(), offerteHuisstijl()]);
  if (!data) notFound();
  const o = data as Onboarding;
  const publiek: OnboardingPubliek = o;
  return <OnboardingPagina o={publiek} basis={`/admin/onboardingvoorbeeld/${o.id}`} contact={huis.contact} certificaten={huis.certificaten} modus="voorbeeld" />;
}
