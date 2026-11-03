import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import ContractForm, { type ContractBegin } from "@/components/admin/ContractForm";
import { offerteKeuzes, uitOfferte } from "@/lib/contractBeheer";
import { standaardEinde, standaardIngang } from "@/lib/contracten";
import { CONTRACT_STANDAARD } from "@/lib/contractTekst";
import { standaardAfzender } from "@/lib/offerteBeheer";
import { LuArrowLeft, LuFilePenLine } from "react-icons/lu";

/**
 * Nieuw basiscontract. Vanuit een offerte (?offerte=<id>) staan de klant, de
 * afzender, het kenmerk van de offerte en wat de klant bij het tekenen invulde
 * al klaar; de looptijd begint de eerste van de volgende maand en duurt een jaar.
 */
export default async function NieuwContract({ searchParams }: { searchParams: Promise<{ offerte?: string }> }) {
  const { sb, user, admin } = await requirePerm("bellijst");
  const { offerte } = await searchParams;
  const [afzender, vanOfferte, offertes] = await Promise.all([
    standaardAfzender(sb, user.id, admin.email),
    offerte && /^[0-9a-f-]{36}$/.test(offerte) ? uitOfferte(sb, offerte) : Promise.resolve(null),
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
