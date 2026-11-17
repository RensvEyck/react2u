import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import ContractChecklistPagina from "@/components/contract/ContractChecklistPagina";
import { heeftChecklist, type ChecklistStand } from "@/lib/contractChecklist";
import type { Contract, ContractPubliek } from "@/lib/contracten";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

export const dynamic = "force-dynamic";

/**
 * De checklist zoals de klant hem ziet, ook bij een concept. Buiten het paneel,
 * zoals het contractvoorbeeld; de gegevens komen met je eigen sessie uit de
 * database, en er kan niets worden opgeslagen.
 */
export default async function ChecklistVoorbeeld({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const [{ data }, { data: stand }, huis] = await Promise.all([
    sb.from("contracten").select("*").eq("id", id).maybeSingle(),
    sb.from("contract_checklists").select("*").eq("contract_id", id).maybeSingle(),
    offerteHuisstijl(),
  ]);
  if (!data || !heeftChecklist(data as Contract)) notFound();
  const contract: ContractPubliek = data as Contract;
  return <ContractChecklistPagina contract={contract} checklist={(stand as ChecklistStand | null) ?? null} modus="voorbeeld" contact={huis.contact} basis={`/admin/contractvoorbeeld/${id}`} />;
}
