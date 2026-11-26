import type { Metadata } from "next";
import { after } from "next/server";
import { notFound } from "next/navigation";
import OnboardingWetenPagina from "@/components/onboarding/OnboardingWetenPagina";
import OfferteMelding from "@/components/offerte/OfferteMelding";
import { supabasePublic } from "@/lib/supabase/public";
import { isCollega } from "@/lib/isCollega";
import { notifyOnboarding, onboardingAdminUrl } from "@/lib/mail";
import { ONBOARDING_EMAIL, type OnboardingPubliek } from "@/lib/onboarding";
import { isWeten, wetenVoor } from "@/lib/onboardingWeten";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ onderwerp: string }> }): Promise<Metadata> {
  const { onderwerp } = await params;
  return { title: isWeten(onderwerp) ? `${wetenVoor(onderwerp)!.titel} · Je onboarding bij React2u` : "Je onboarding bij React2u" };
}

/**
 * Eén onderwerp van Goed om te weten (/onboarding/<token>/weten/<onderwerp>).
 * Dezelfde regels als de hub en een stap: het token is de sleutel, een collega
 * telt niet, en het bezoek telt per half uur. Een onbekend onderwerp geeft 404.
 */
export default async function OnboardingWetenRoute({ params }: { params: Promise<{ token: string; onderwerp: string }> }) {
  const { token, onderwerp } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token) || !isWeten(onderwerp)) notFound();
  const collega = await isCollega();
  const [{ data }, { contact }] = await Promise.all([
    supabasePublic().rpc("onboarding_bekijken", { p_token: token, p_tel: !collega }),
    offerteHuisstijl(),
  ]);
  const o = data as OnboardingPubliek | null;
  if (!o) notFound();
  if (o.status === "ingetrokken") {
    return (
      <OfferteMelding soort="Onboarding" titel="Deze onboarding is niet meer beschikbaar" telefoon={o.afzender_telefoon} email={o.afzender_email || ONBOARDING_EMAIL}>
        De onboarding voor {o.bedrijf} is ingetrokken, bijvoorbeeld omdat er een nieuwe versie is.
        {o.afzender_naam ? ` Neem contact op met ${o.afzender_naam}.` : " Neem contact met ons op."}
      </OfferteMelding>
    );
  }

  if (o.eerste_keer && o.afzender_email) {
    const { afzender_email, nummer, bedrijf, id } = o;
    after(() => notifyOnboarding({ to: afzender_email, nummer, bedrijf, adminLink: onboardingAdminUrl(id), soort: "bekeken" }));
  }

  const modus = o.status === "concept" ? "voorbeeld" : collega ? "collega" : "klant";
  return <OnboardingWetenPagina o={o} basis={`/onboarding/${token}`} contact={contact} modus={modus} slug={onderwerp} />;
}
