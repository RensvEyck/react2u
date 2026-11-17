import type { Metadata } from "next";
import { after } from "next/server";
import { notFound } from "next/navigation";
import EvaluatiePagina from "@/components/evaluatie/EvaluatiePagina";
import OfferteMelding from "@/components/offerte/OfferteMelding";
import { supabasePublic } from "@/lib/supabase/public";
import { isCollega } from "@/lib/isCollega";
import { evaluatieAdminUrl, notifyEvaluatie } from "@/lib/mail";
import { EVALUATIE_EMAIL, type EvaluatiePubliek } from "@/lib/evaluatie";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Je klantevaluatie van React2u" };

/** Net ingevuld (minder dan een kwartier geleden): dan de felicitatie, zoals na het afronden van een onboarding. */
function netIngevuld(at: string | null): boolean {
  return Boolean(at) && Date.now() - new Date(at!).getTime() < 15 * 60_000;
}

/**
 * De klantevaluatie voor één klant (/evaluatie/<token>, migratie 0043).
 * Dezelfde regels als de onboarding: het token is de sleutel, een collega met
 * een sessie telt niet als bezoek, de eerste keer dat de klant hem opent
 * krijgt de afzender een seintje, en een bezoek telt pas opnieuw na een half
 * uur zonder activiteit (de pagina rendert ook na elke keer opslaan). Een
 * concept is via de link alleen een voorbeeld.
 */
export default async function EvaluatieRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token)) notFound();
  const collega = await isCollega();
  const [{ data }, { contact }] = await Promise.all([
    supabasePublic().rpc("evaluatie_bekijken", { p_token: token, p_tel: !collega }),
    offerteHuisstijl(),
  ]);
  const e = data as EvaluatiePubliek | null;
  if (!e) notFound();
  if (e.status === "ingetrokken") {
    return (
      <OfferteMelding soort="Klantevaluatie" titel="Deze evaluatie is niet meer beschikbaar" telefoon={e.afzender_telefoon} email={e.afzender_email || EVALUATIE_EMAIL}>
        De evaluatie voor {e.bedrijf} is ingetrokken, bijvoorbeeld omdat er een nieuwe versie is.
        {e.afzender_naam ? ` Neem contact op met ${e.afzender_naam}.` : " Neem contact met ons op."}
      </OfferteMelding>
    );
  }

  if (e.eerste_keer && e.afzender_email) {
    const { afzender_email, nummer, bedrijf, id } = e;
    after(() => notifyEvaluatie({ to: afzender_email, nummer, bedrijf, adminLink: evaluatieAdminUrl(id), soort: "bekeken" }));
  }

  const modus = e.status === "concept" ? "voorbeeld" : collega ? "collega" : "klant";
  return <EvaluatiePagina e={e} token={token} basis={`/evaluatie/${token}`} contact={contact} modus={modus} vers={netIngevuld(e.ingevuld_at)} />;
}
