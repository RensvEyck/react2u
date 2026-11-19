import Link from "next/link";
import { LuLayoutGrid, LuPlus, LuUpload } from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { vandaagNL, type Klant } from "@/lib/klanten";
import { MigratieNodig } from "@/components/admin/Kerncijfer";
import KlantenLijst from "@/components/admin/klanten/KlantenLijst";

/**
 * Alle klanten onder elkaar (migratie 0048): dezelfde kaarten als het
 * klantenbord, als lijst met de contactgegevens, wie de klant bij React2u
 * heeft en hoe compleet de stamkaart is. Een rij opent de stamkaart
 * (/admin/klanten/<id>) met de bedrijfsgegevens, alle documenten en de
 * tariefafspraken. Zoeken, filteren en sorteren gebeurt in de browser.
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
  const klanten = (data as Klant[] | null) || [];
  // Zonder 0048 ontbreken de stamkaartvelden: de lijst werkt, de stamkaart meldt het.
  const stamkaartAan = klanten.length === 0 || "kvk" in klanten[0];

  return (
    <div className="space-y-6">
      <Kop />
      {!stamkaartAan && <MigratieNodig bestand="0048_stamkaart.sql" wat="De stamkaart, de documenten en de tariefafspraken per klant hebben nieuwe velden en tabellen nodig." />}
      <KlantenLijst klanten={klanten} vandaag={vandaagNL()} beginQ={q || ""} beginStatus={status || "alle"} />
    </div>
  );
}

function Kop() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Klanten</h1>
        <p className="text-[14.5px] text-black/50">Alle leads en klanten van het bord onder elkaar. Open een klant voor de stamkaart met de bedrijfsgegevens, alle documenten en de tariefafspraken.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/klantenbord" className="abtn-ghost"><LuLayoutGrid /> Klantenbord</Link>
        <Link href="/admin/klantenbord#import" className="abtn-ghost"><LuUpload /> Klantlijst importeren</Link>
        <Link href="/admin/klantenbord#nieuw" className="abtn"><LuPlus /> Nieuwe lead of klant</Link>
      </div>
    </div>
  );
}
