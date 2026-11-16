import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import OnboardingStapPagina from "@/components/onboarding/OnboardingStapPagina";
import { isDocument, type Onboarding, type OnboardingPubliek } from "@/lib/onboarding";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

export const dynamic = "force-dynamic";

/** Eén stap zoals de klant hem ziet, vanuit het beheer; invullen kan hier niet. */
export default async function OnboardingStapVoorbeeld({ params }: { params: Promise<{ id: string; stap: string }> }) {
  const { id, stap } = await params;
  if (!isDocument(stap)) notFound();
  const { sb } = await requirePerm("bellijst");
  const [{ data }, huis] = await Promise.all([sb.from("onboardings").select("*").eq("id", id).maybeSingle(), offerteHuisstijl()]);
  if (!data) notFound();
  const o = data as Onboarding;
  if (!o.documenten.includes(stap)) notFound();
  const publiek: OnboardingPubliek = o;
  return <OnboardingStapPagina o={publiek} token={o.token} basis={`/admin/onboardingvoorbeeld/${o.id}`} contact={huis.contact} modus="voorbeeld" sleutel={stap} />;
}
