import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import BrochureForm, { type BrochureBegin } from "@/components/admin/BrochureForm";
import { standaardAfzender, uitAanvraag } from "@/lib/offerteBeheer";
import { BERICHT_STANDAARD } from "@/lib/brochures";
import { LuArrowLeft, LuInbox } from "react-icons/lu";

/**
 * Nieuwe brochure: voor wie, het persoonlijke woord en de afzender. Vanuit
 * een aanvraag in het Postvak IN (?bericht=<id>) staan de gegevens van de
 * prospect al klaar; de afzender komt van je vorige offerte of brochure.
 */
export default async function NieuweBrochure({ searchParams }: { searchParams: Promise<{ bericht?: string }> }) {
  const { sb, user, admin } = await requirePerm("bellijst");
  const { bericht } = await searchParams;
  const [afzender, aanvraag] = await Promise.all([
    standaardAfzender(sb, user.id, admin.email),
    bericht && /^[0-9a-f-]{36}$/.test(bericht) && admin.permissions.includes("postvak") ? uitAanvraag(sb, bericht) : Promise.resolve(null),
  ]);
  const begin: BrochureBegin = {
    ...afzender,
    bericht: BERICHT_STANDAARD,
    ...(aanvraag ? { bedrijf: aanvraag.bedrijf, contactpersoon: aanvraag.contactpersoon, email: aanvraag.email, telefoon: aanvraag.telefoon } : {}),
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Link href="/admin/brochures" className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-black/50 hover:text-[#312e82]">
          <LuArrowLeft /> Alle brochures
        </Link>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Nieuwe brochure</h1>
        <p className="text-[14.5px] text-black/50">
          De brochure laat alle zes diensten zien, in de stijl van de site. Jij vult in voor wie hij is en wat je erbij wilt zeggen.
        </p>
        {aanvraag && (
          <p className="flex items-center gap-2 text-[14px] text-black/55">
            <LuInbox className="text-[#312e82]" /> Ingevuld vanuit de aanvraag van {aanvraag.contactpersoon}{aanvraag.bedrijf ? ` (${aanvraag.bedrijf})` : ""}. Controleer en vul aan.
          </p>
        )}
      </div>
      <BrochureForm begin={begin} nieuw />
    </div>
  );
}
