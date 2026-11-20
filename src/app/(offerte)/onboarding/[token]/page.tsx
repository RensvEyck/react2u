import type { Metadata } from "next";
import { after } from "next/server";
import { notFound } from "next/navigation";
import OnboardingPagina from "@/components/onboarding/OnboardingPagina";
import OfferteMelding from "@/components/offerte/OfferteMelding";
import { supabasePublic } from "@/lib/supabase/public";
import { isCollega } from "@/lib/isCollega";
import { notifyOnboarding, onboardingAdminUrl } from "@/lib/mail";
import { ONBOARDING_EMAIL, type OnboardingPubliek } from "@/lib/onboarding";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Je onboarding bij React2u" };

/** Net klaar (minder dan een kwartier geleden): dan de felicitatie, zoals na het tekenen van een contract. */
function netAfgerond(at: string | null): boolean {
  return Boolean(at) && Date.now() - new Date(at!).getTime() < 15 * 60_000;
}

/**
 * De onboarding voor één klant (/onboarding/<token>, migratie 0037). Dezelfde
 * regels als een brochure of contract: het token is de sleutel, een collega
 * met een sessie telt niet als bezoek, en de eerste keer dat de klant hem
 * opent krijgt de afzender een seintje. Een concept is via de link alleen een
 * voorbeeld; het echte voorbeeld voor sales staat in het beheer.
 *
 * Anders dan een brochure of contract slaat de klant hier meerdere keren iets
 * op, en elke keer rendert deze pagina opnieuw (in het verzoek van de server
 * action en bij router.refresh). De interne headers daarvan (`rsc`,
 * `next-action`) haalt Next weg voordat `headers()` ze ziet, dus de pagina kan
 * een verversing niet van een bezoek onderscheiden; daarom telt
 * `onboarding_bekijken` een bezoek pas opnieuw na een half uur zonder activiteit.
 */
export default async function OnboardingRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token)) notFound();
  const collega = await isCollega();
  const [{ data }, { contact, certificaten }] = await Promise.all([
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
  return <OnboardingPagina o={o} basis={`/onboarding/${token}`} contact={contact} certificaten={certificaten} modus={modus} vers={netAfgerond(o.afgerond_at)} />;
}
