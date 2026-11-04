import type { Metadata } from "next";
import { after } from "next/server";
import { notFound } from "next/navigation";
import BrochurePagina from "@/components/brochure/BrochurePagina";
import OfferteMelding from "@/components/offerte/OfferteMelding";
import { supabasePublic } from "@/lib/supabase/public";
import { isCollega } from "@/lib/isCollega";
import { brochureAdminUrl, notifyBrochureBekeken } from "@/lib/mail";
import { BROCHURE_EMAIL, type BrochurePubliek } from "@/lib/brochures";
import { brochureDiensten, brochurePrijslijst } from "@/lib/brochureHuisstijl";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Je brochure van React2u" };

/**
 * De brochure voor één prospect (/brochure/<token>, migratie 0030): alle zes
 * diensten en de prijslijst in de stijl van de site, met het persoonlijke
 * woord van de afzender. Dezelfde regels als een offerte: het token is de
 * sleutel, een collega met een sessie telt niet als bezoek, en de eerste keer
 * dat de prospect hem opent krijgt de afzender een seintje.
 */
export default async function BrochureRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token)) notFound();
  const collega = await isCollega();
  const [{ data }, [diensten, prijslijst], huis] = await Promise.all([
    supabasePublic().rpc("brochure_bekijken", { p_token: token, p_tel: !collega }),
    // De prijslijst krijgt de labelkleuren van de diensten mee.
    brochureDiensten().then(async (d) => [d, await brochurePrijslijst(d)] as const),
    offerteHuisstijl(),
  ]);
  const brochure = data as BrochurePubliek | null;
  if (!brochure) notFound();
  if (brochure.status === "ingetrokken") {
    return (
      <OfferteMelding titel="Deze brochure is niet meer beschikbaar" telefoon={brochure.afzender_telefoon} email={brochure.afzender_email || BROCHURE_EMAIL}>
        De brochure voor {brochure.bedrijf} is ingetrokken, bijvoorbeeld omdat er een nieuwe versie is.
        {brochure.afzender_naam ? ` Neem contact op met ${brochure.afzender_naam} voor de actuele versie.` : " Neem contact met ons op voor de actuele versie."}
      </OfferteMelding>
    );
  }

  if (brochure.eerste_keer && brochure.afzender_email) {
    const { afzender_email, nummer, bedrijf, id } = brochure;
    after(() => notifyBrochureBekeken({ to: afzender_email, nummer, bedrijf, adminLink: brochureAdminUrl(id) }));
  }

  return <BrochurePagina brochure={brochure} diensten={diensten} prijslijst={prijslijst} huis={huis} modus={collega ? "collega" : "klant"} pdfHref={`/brochure/${token}/pdf`} />;
}
