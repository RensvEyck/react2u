import type { Metadata } from "next";
import { after } from "next/server";
import { notFound } from "next/navigation";
import OnboardingStapPagina from "@/components/onboarding/OnboardingStapPagina";
import OfferteMelding from "@/components/offerte/OfferteMelding";
import { supabasePublic } from "@/lib/supabase/public";
import { isCollega } from "@/lib/isCollega";
import { notifyOnboarding, onboardingAdminUrl } from "@/lib/mail";
import { documentInfo, isDocument, ONBOARDING_EMAIL, type OnboardingPubliek } from "@/lib/onboarding";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ stap: string }> }): Promise<Metadata> {
  const { stap } = await params;
  return { title: isDocument(stap) ? `${documentInfo(stap).titel} · Je onboarding bij React2u` : "Je onboarding bij React2u" };
}

/**
 * Eén stap van de onboarding op zijn eigen pagina (/onboarding/<token>/<stap>).
 * Dezelfde regels als de hub: het token is de sleutel, een collega telt niet,
 * en het bezoek telt per half uur (zie de hub). Een stap die niet bij deze
 * onboarding hoort, geeft een 404.
 */
export default async function OnboardingStapRoute({ params }: { params: Promise<{ token: string; stap: string }> }) {
  const { token, stap } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token) || !isDocument(stap)) notFound();
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
  if (!o.documenten.includes(stap)) notFound();

  if (o.eerste_keer && o.afzender_email) {
    const { afzender_email, nummer, bedrijf, id } = o;
    after(() => notifyOnboarding({ to: afzender_email, nummer, bedrijf, adminLink: onboardingAdminUrl(id), soort: "bekeken" }));
  }

  const modus = o.status === "concept" ? "voorbeeld" : collega ? "collega" : "klant";
  return <OnboardingStapPagina o={o} token={token} basis={`/onboarding/${token}`} contact={contact} modus={modus} sleutel={stap} />;
}
