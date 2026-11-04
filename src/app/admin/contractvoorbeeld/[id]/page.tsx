import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import ContractPagina from "@/components/contract/ContractPagina";
import type { Contract, ContractPubliek } from "@/lib/contracten";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

export const dynamic = "force-dynamic";

/**
 * Het contract zoals de klant het ziet, ook als het nog een concept is. Buiten
 * het paneel (geen zijmenu), zoals het offertevoorbeeld; de gegevens komen met
 * je eigen sessie uit de database, zonder het bezoek te tellen.
 */
export default async function ContractVoorbeeld({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const [{ data }, huis] = await Promise.all([sb.from("contracten").select("*").eq("id", id).maybeSingle(), offerteHuisstijl()]);
  if (!data) notFound();
  const contract: ContractPubliek = data as Contract;
  return <ContractPagina contract={contract} modus="voorbeeld" contact={huis.contact} />;
}
