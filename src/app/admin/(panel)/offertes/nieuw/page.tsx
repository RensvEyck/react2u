import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import OfferteEditor, { type EditorBegin } from "@/components/admin/OfferteEditor";
import { laadCatalogus, standaardAfzender, uitAanvraag } from "@/lib/offerteBeheer";
import { datumOver } from "@/lib/offertes";
import { STARTPUNTEN } from "@/lib/offerteCatalogus";
import { LuArrowLeft, LuInbox } from "react-icons/lu";

/**
 * Nieuwe offerte. Vanuit een offerteaanvraag in het Postvak IN
 * (?bericht=<id>) staan de klantgegevens en het passende startpunt al klaar.
 */
export default async function NieuweOfferte({ searchParams }: { searchParams: Promise<{ bericht?: string; start?: string }> }) {
  const { sb, user, admin } = await requirePerm("bellijst");
  const { bericht, start } = await searchParams;
  const [catalogus, afzender, aanvraag] = await Promise.all([
    laadCatalogus(sb),
    standaardAfzender(sb, user.id, admin.email),
    bericht && /^[0-9a-f-]{36}$/.test(bericht) && admin.permissions.includes("postvak") ? uitAanvraag(sb, bericht) : Promise.resolve(null),
  ]);

  const startpunt = STARTPUNTEN.find((s) => s.key === (start || aanvraag?.startpunt));
  const begin: EditorBegin = {
    ...afzender,
    geldig_tot: datumOver(30),
    regels: startpunt ? startpunt.regels(catalogus) : [],
    ...(aanvraag
      ? { bedrijf: aanvraag.bedrijf, contactpersoon: aanvraag.contactpersoon, email: aanvraag.email, telefoon: aanvraag.telefoon, medewerkers: aanvraag.medewerkers }
      : {}),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Link href="/admin/offertes" className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-black/50 hover:text-[#312e82]">
          <LuArrowLeft /> Alle offertes
        </Link>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Nieuwe offerte</h1>
        {aanvraag && (
          <p className="flex items-center gap-2 text-[14px] text-black/55">
            <LuInbox className="text-[#312e82]" /> Ingevuld vanuit de offerteaanvraag van {aanvraag.contactpersoon}
            {aanvraag.bedrijf ? ` (${aanvraag.bedrijf})` : ""}. Controleer en vul aan.
          </p>
        )}
      </div>
      <OfferteEditor begin={begin} catalogus={catalogus} />
    </div>
  );
}
