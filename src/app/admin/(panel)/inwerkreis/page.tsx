import { LuRoute } from "react-icons/lu";
import { requireAdmin } from "@/lib/admin";
import { reisStand } from "@/lib/inwerkreis";
import { haalEigenReis } from "@/lib/inwerkreisDb";
import { datumOver } from "@/lib/offertes";
import ReisWeergave from "@/components/admin/inwerk/Reis";

/**
 * Mijn inwerkreis (0050): de eigen reis van een nieuwe collega. Geen apart
 * recht: wie een reis heeft, ziet hem; de policies geven alleen de eigen reis
 * en de stappen van het eigen sjabloon terug.
 */
export default async function MijnInwerkreis() {
  const { sb, admin } = await requireAdmin();
  const uit = await haalEigenReis(sb, admin.userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Mijn inwerkreis</h1>
        <p className="text-[14.5px] text-black/50">Wat je de eerste negentig dagen doet, oefent en samen afrondt. Vink af wat je gedaan hebt.</p>
      </div>

      {!uit.ok ? (
        <p className="acard px-6 py-5 text-[14px] text-black/55">
          {uit.fout === "migratie" ? "De inwerkreis staat nog niet aan." : "Je inwerkreis kon niet geladen worden. Probeer het straks nog eens."}
        </p>
      ) : !uit.data ? (
        <section className="acard flex flex-col items-center gap-2 px-6 py-12 text-center">
          <LuRoute className="text-[28px] text-[#312e82]/50" />
          <p className="max-w-[460px] text-[14px] leading-[1.6] text-black/55">
            Je hebt geen inwerkreis. Begin je nieuw bij React2u, dan zet het beheer hier je reis klaar: taken, oefencasussen en mijlpalen voor je eerste 90 dagen.
          </p>
        </section>
      ) : (
        <ReisWeergave volledig={uit.data} stand={reisStand(uit.data.reis, uit.data.stappen, uit.data.voortgang, datumOver(0))} modus="zelf" />
      )}
    </div>
  );
}
