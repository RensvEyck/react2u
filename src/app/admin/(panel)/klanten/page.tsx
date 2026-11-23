import Link from "next/link";
import { LuLayoutGrid, LuPlus } from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { vandaagNL, type Klant } from "@/lib/klanten";
import { echteKlanten } from "@/lib/stamkaart";
import { MigratieNodig } from "@/components/admin/Kerncijfer";
import KlantenLijst from "@/components/admin/klanten/KlantenLijst";
import StamkaartenPaneel from "@/components/admin/klanten/StamkaartenPaneel";

/**
 * Alle klanten onder elkaar (migratie 0048): de echte klanten van het
 * klantenbord (akkoord of verder, zoals de klantlijst in Excel; Rens, 19 nov
 * 2026: "alleen echte klanten, leads staan op het bord"), als lijst met de
 * contactgegevens, wie de klant bij React2u heeft en hoe compleet de
 * stamkaart is. Een rij opent de stamkaart (/admin/klanten/<id>) met de
 * bedrijfsgegevens, alle documenten en de tariefafspraken. Zoeken, filteren
 * en sorteren gebeurt in de browser. Erboven het paneel Stamkaarten: hoe
 * compleet ze zijn, en ze in één keer aanvullen uit Excel (StamkaartenPaneel).
 */
export default async function KlantenPagina({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { sb } = await requirePerm("bellijst");
  const { q, status } = await searchParams;
  const { data, error } = await sb.from("klanten").select("*").order("bedrijf").limit(5000);
  if (error && isMissingTable(error)) {
    return (
      <div className="space-y-6">
        <Kop />
        <MigratieNodig bestand="0040_klantenbord.sql" wat="De klantenlijst leest de kaarten van het klantenbord." />
      </div>
    );
  }
  const alle = (data as Klant[] | null) || [];
  // Alleen echte klanten: akkoord, inrichten en klant (en gestopte klanten op verzoek). Leads blijven op het bord.
  const klanten = echteKlanten(alle);
  const opHetBord = alle.length - klanten.length;
  // Zonder 0048 ontbreken de stamkaartvelden: de lijst werkt, de stamkaart meldt het.
  const stamkaartAan = alle.length === 0 || "kvk" in alle[0];

  return (
    <div className="space-y-6">
      <Kop />
      {stamkaartAan && <StamkaartenPaneel klanten={klanten} alle={alle} vandaag={vandaagNL()} />}
      {!stamkaartAan && <MigratieNodig bestand="0048_stamkaart.sql" wat="De stamkaart, de documenten en de tariefafspraken per klant hebben nieuwe velden en tabellen nodig." />}
      <KlantenLijst klanten={klanten} vandaag={vandaagNL()} beginQ={q || ""} beginStatus={status || "alle"} opHetBord={opHetBord} />
    </div>
  );
}

function Kop() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Klanten</h1>
        <p className="text-[14.5px] text-black/50">Alle klanten onder elkaar: wie akkoord is, wordt ingericht of live is. Open een klant voor de stamkaart met de bedrijfsgegevens, alle documenten en de tariefafspraken. Leads en gesprekken staan op het bord.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/klantenbord" className="abtn-ghost"><LuLayoutGrid /> Klantenbord</Link>
        <Link href="/admin/klantenbord#nieuw" className="abtn"><LuPlus /> Nieuwe lead of klant</Link>
      </div>
    </div>
  );
}
