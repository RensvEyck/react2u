import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MachtigingPagina from "@/components/onboarding/MachtigingPagina";
import OfferteMelding from "@/components/offerte/OfferteMelding";
import { supabasePublic } from "@/lib/supabase/public";
import { isCollega } from "@/lib/isCollega";
import { ONBOARDING_EMAIL, type MachtigingPubliek } from "@/lib/onboarding";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Machtiging overdracht verzuimdossier · React2u", robots: { index: false, follow: false } };

/**
 * De machtiging van één werknemer (/machtiging/<token>, migratie 0038): de
 * persoonlijke link uit de mail. Dezelfde regels als de onboarding: het token
 * is de sleutel, een collega met een sessie telt niet als bezoek en kan niet
 * tekenen. Een gesloten onboarding geeft alleen de contactgegevens.
 */
export default async function MachtigingRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token)) notFound();
  const collega = await isCollega();
  const [{ data }, { contact }] = await Promise.all([
    supabasePublic().rpc("onboarding_machtiging_bekijken", { p_token: token, p_tel: !collega }),
    offerteHuisstijl(),
  ]);
  const m = data as MachtigingPubliek | null;
  if (!m) notFound();
  if (m.status === "gesloten") {
    return (
      <OfferteMelding soort="Machtiging" titel="Deze machtiging is niet meer beschikbaar" telefoon={m.afzender_telefoon} email={m.afzender_email || ONBOARDING_EMAIL}>
        De onboarding van {m.bedrijf} bij React2u is gesloten. Neem contact op met je werkgever{m.afzender_naam ? ` of met ${m.afzender_naam}` : " of met ons"}.
      </OfferteMelding>
    );
  }
  return <MachtigingPagina m={m} token={token} contact={contact} collega={collega} />;
}
