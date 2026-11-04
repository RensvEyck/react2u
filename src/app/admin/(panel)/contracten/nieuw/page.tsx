import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import ContractForm, { type ContractBegin } from "@/components/admin/ContractForm";
import { offerteKeuzes, partnerKeuzes, uitOfferte, uitPartner } from "@/lib/contractBeheer";
import { standaardEinde, standaardIngang } from "@/lib/contracten";
import { CONTRACT_STANDAARD, procent, RESELLER_STANDAARD } from "@/lib/contractTekst";
import { standaardAfzender } from "@/lib/offerteBeheer";
import { LuArrowLeft, LuFilePenLine, LuHandshake } from "react-icons/lu";

/**
 * Nieuw contract. Een basiscontract vanuit een offerte (?offerte=<id>): de
 * klant, de afzender, het kenmerk van de offerte en wat de klant bij het
 * tekenen invulde staan al klaar; de looptijd begint de eerste van de volgende
 * maand en duurt een jaar. Een resellerovereenkomst (?soort=reseller), het
 * liefst vanuit een partner (?partner=<id>): het kantoor, de contactpersoon en
 * de percentages van die partner staan dan al klaar.
 */
export default async function NieuwContract({ searchParams }: { searchParams: Promise<{ offerte?: string; soort?: string; partner?: string }> }) {
  const { sb, user, admin } = await requirePerm("bellijst");
  const { offerte, soort, partner } = await searchParams;
  const uuid = (v?: string) => Boolean(v && /^[0-9a-f-]{36}$/.test(v));
  const reseller = soort === "reseller" || uuid(partner);

  if (reseller) {
    const [afzender, vanPartner, partners] = await Promise.all([
      standaardAfzender(sb, user.id, admin.email),
      uuid(partner) ? uitPartner(sb, partner!) : Promise.resolve(null),
      partnerKeuzes(sb),
    ]);
    const begin: ContractBegin = { ...afzender, soort: "reseller", tekst: RESELLER_STANDAARD, ...(vanPartner?.velden ?? {}) };
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3">
          <Link href={vanPartner ? `/admin/partners/${partner}` : "/admin/contracten?soort=reseller"} className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-black/50 hover:text-[#312e82]">
            <LuArrowLeft /> {vanPartner ? vanPartner.kantoor : "Alle resellerovereenkomsten"}
          </Link>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Nieuwe resellerovereenkomst</h1>
          <p className="text-[14.5px] text-black/50">
            De Resellerovereenkomst arbodienstverlening, in de stijl van de site. Jij kiest de partner en controleert de tekst; de partner vult bij het
            tekenen de gegevens van zijn kantoor aan. De overeenkomst gaat in op de dag van ondertekening.
          </p>
          {vanPartner && (
            <p className="flex items-center gap-2 text-[14px] text-black/55">
              <LuHandshake className="text-[#312e82]" /> Ingevuld vanuit partner {vanPartner.kantoor}, met de afgesproken vergoeding van{" "}
              {procent(vanPartner.pct.jaarEen)}% in het eerste contractjaar en {procent(vanPartner.pct.vervolg)}% daarna (artikel 3.1). Controleer en vul aan.
            </p>
          )}
        </div>
        <ContractForm begin={begin} nieuw offertes={[]} partners={partners} />
      </div>
    );
  }

  const [afzender, vanOfferte, offertes] = await Promise.all([
    standaardAfzender(sb, user.id, admin.email),
    uuid(offerte) ? uitOfferte(sb, offerte!) : Promise.resolve(null),
    offerteKeuzes(sb),
  ]);
  const ingang = standaardIngang();
  const begin: ContractBegin = {
    ...afzender,
    ingangsdatum: ingang,
    einddatum: standaardEinde(ingang),
    tekst: CONTRACT_STANDAARD,
    ...(vanOfferte?.velden ?? {}),
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Link href="/admin/contracten" className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-black/50 hover:text-[#312e82]">
          <LuArrowLeft /> Alle contracten
        </Link>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Nieuw basiscontract</h1>
        <p className="text-[14.5px] text-black/50">
          Het Basiscontract Arbodienstverlening, in de stijl van de site. Jij vult in voor wie het is en de looptijd; de klant vult bij het tekenen de gegevens van zijn organisatie aan.
        </p>
        {vanOfferte && (
          <p className="flex items-center gap-2 text-[14px] text-black/55">
            <LuFilePenLine className="text-[#312e82]" /> Ingevuld vanuit offerte {vanOfferte.nummer} voor {vanOfferte.velden.bedrijf}. Controleer en vul aan.
          </p>
        )}
      </div>
      <ContractForm begin={begin} nieuw offertes={offertes} />
    </div>
  );
}
