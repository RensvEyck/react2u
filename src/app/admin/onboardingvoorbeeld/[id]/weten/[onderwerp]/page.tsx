import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import OnboardingWetenPagina from "@/components/onboarding/OnboardingWetenPagina";
import type { Onboarding, OnboardingPubliek } from "@/lib/onboarding";
import { isWeten } from "@/lib/onboardingWeten";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

export const dynamic = "force-dynamic";

/** Eén onderwerp van Goed om te weten zoals de klant het ziet, vanuit het beheer. */
export default async function OnboardingWetenVoorbeeld({ params }: { params: Promise<{ id: string; onderwerp: string }> }) {
  const { id, onderwerp } = await params;
  if (!isWeten(onderwerp)) notFound();
  const { sb } = await requirePerm("bellijst");
  const [{ data }, huis] = await Promise.all([sb.from("onboardings").select("*").eq("id", id).maybeSingle(), offerteHuisstijl()]);
  if (!data) notFound();
  const o = data as Onboarding;
  const publiek: OnboardingPubliek = o;
  return <OnboardingWetenPagina o={publiek} basis={`/admin/onboardingvoorbeeld/${o.id}`} contact={huis.contact} modus="voorbeeld" slug={onderwerp} />;
}
