import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import EvaluatiePagina from "@/components/evaluatie/EvaluatiePagina";
import type { Evaluatie, EvaluatiePubliek } from "@/lib/evaluatie";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

export const dynamic = "force-dynamic";

/**
 * De evaluatie zoals de klant hem ziet, ook als het nog een concept is. Buiten
 * het paneel (geen zijmenu), zoals het onboardingvoorbeeld; de gegevens komen
 * met je eigen sessie uit de database, zonder het bezoek te tellen. Invullen
 * kan hier niet: dat doet de klant via zijn link.
 */
export default async function EvaluatieVoorbeeld({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const [{ data }, huis] = await Promise.all([sb.from("evaluaties").select("*").eq("id", id).maybeSingle(), offerteHuisstijl()]);
  if (!data) notFound();
  const e = data as Evaluatie;
  const publiek: EvaluatiePubliek = e;
  return <EvaluatiePagina e={publiek} token={e.token} basis={`/admin/evaluatievoorbeeld/${e.id}`} contact={huis.contact} modus="voorbeeld" />;
}
