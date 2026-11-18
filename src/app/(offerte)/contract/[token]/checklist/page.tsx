import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ContractChecklistPagina from "@/components/contract/ContractChecklistPagina";
import { supabasePublic } from "@/lib/supabase/public";
import { isCollega } from "@/lib/isCollega";
import { CHECKLIST_NAAM, heeftChecklist, type ChecklistStand } from "@/lib/contractChecklist";
import type { ContractPubliek } from "@/lib/contracten";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: `${CHECKLIST_NAAM} · Je contract met React2u` };

/**
 * De Checklist arbeidsomstandigheden bij een basiscontract
 * (/contract/<token>/checklist, migratie 0042). Dezelfde regels als de
 * contractpagina: het token is de sleutel, een concept of onbekend token geeft
 * een 404, een collega kan niets opslaan. Het bezoek telt hier niet: de klant
 * komt via de contractpagina, en daar telt het al.
 */
export default async function ChecklistRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token)) notFound();
  const sb = supabasePublic();
  const [collega, huis, { data }, { data: stand }] = await Promise.all([
    isCollega(),
    offerteHuisstijl(),
    sb.rpc("contract_bekijken", { p_token: token, p_tel: false }),
    sb.rpc("contract_checklist_bekijken", { p_token: token }),
  ]);
  const contract = data as ContractPubliek | null;
  if (!contract || !heeftChecklist(contract)) notFound();
  // Ingetrokken: de contractpagina vertelt dat, met de contactgegevens.
  if (contract.status === "ingetrokken") redirect(`/contract/${token}`);
  return (
    <ContractChecklistPagina
      contract={contract}
      checklist={(stand as ChecklistStand | null) ?? null}
      token={token}
      modus={collega ? "collega" : "klant"}
      contact={huis.contact}
      basis={`/contract/${token}`}
    />
  );
}
