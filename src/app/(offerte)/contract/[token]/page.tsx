import type { Metadata } from "next";
import { after } from "next/server";
import { notFound } from "next/navigation";
import ContractPagina from "@/components/contract/ContractPagina";
import OfferteMelding from "@/components/offerte/OfferteMelding";
import { supabasePublic } from "@/lib/supabase/public";
import { isCollega } from "@/lib/isCollega";
import { contractAdminUrl, notifyContractBekeken } from "@/lib/mail";
import { CONTRACT_EMAIL, CONTRACT_SOORT, soortVan, type ContractPubliek } from "@/lib/contracten";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

export const dynamic = "force-dynamic";

// Algemeen: hetzelfde voor een basiscontract en een resellerovereenkomst (de titel komt vóór de database).
export const metadata: Metadata = { title: "Je contract met React2u" };

/** Net getekend (minder dan een kwartier geleden): dan krijgt de klant de felicitatie, later een rustige bevestiging. */
function netGetekend(at: string | null): boolean {
  return Boolean(at) && Date.now() - new Date(at!).getTime() < 15 * 60_000;
}

/**
 * Het contract voor één klant of partner (/contract/<token>, migratie 0031 en 0033). Dezelfde
 * regels als een offerte: het token is de sleutel, een concept of onbekend
 * token geeft een 404, een collega met een sessie telt niet als bezoek, en de
 * eerste keer dat de klant het opent krijgt de afzender een seintje.
 */
export default async function ContractRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48,}$/.test(token)) notFound();
  const [collega, huis] = await Promise.all([isCollega(), offerteHuisstijl()]);
  const { data } = await supabasePublic().rpc("contract_bekijken", { p_token: token, p_tel: !collega });
  const contract = data as ContractPubliek | null;
  if (!contract) notFound();
  if (contract.status === "ingetrokken") {
    return (
      <OfferteMelding soort="Contract" titel="Dit contract is niet meer geldig" telefoon={contract.afzender_telefoon} email={contract.afzender_email || CONTRACT_EMAIL}>
        {CONTRACT_SOORT[soortVan(contract)].naam} {contract.nummer} voor {contract.bedrijf} is ingetrokken, bijvoorbeeld omdat er een nieuwe versie is.
        {contract.afzender_naam ? ` Neem contact op met ${contract.afzender_naam} voor de actuele versie.` : " Neem contact met ons op voor de actuele versie."}
      </OfferteMelding>
    );
  }

  if (contract.eerste_keer && contract.afzender_email) {
    const { afzender_email, nummer, bedrijf, id } = contract;
    after(() => notifyContractBekeken({ to: afzender_email, soort: soortVan(contract), nummer, bedrijf, adminLink: contractAdminUrl(id) }));
  }

  return <ContractPagina contract={contract} token={token} modus={collega ? "collega" : "klant"} contact={huis.contact} vers={netGetekend(contract.getekend_at)} />;
}
