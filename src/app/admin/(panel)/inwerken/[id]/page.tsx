import Link from "next/link";
import { notFound } from "next/navigation";
import { LuArrowLeft, LuCircleCheckBig, LuRotateCcw, LuTrash2 } from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { reisStand } from "@/lib/inwerkreis";
import { haalCollegas, haalReis } from "@/lib/inwerkreisDb";
import { datumOver } from "@/lib/offertes";
import { inwerkreisAfronden, inwerkreisBijwerken, inwerkreisVerwijderen } from "@/app/admin/inwerkreisActions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ReisWeergave from "@/components/admin/inwerk/Reis";

/**
 * Eén inwerkreis, gezien vanuit het beheer (0050, recht omzet): dezelfde
 * weergave als de collega ziet, maar hier vink je alles af en teken je de
 * mijlpalen af. Daaronder de startdatum en de buddy, afronden en verwijderen.
 */
export default async function Reis({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("omzet");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [uit, collegas] = await Promise.all([haalReis(sb, id), haalCollegas(sb)]);
  if (!uit.ok) {
    return <p className="acard px-6 py-5 text-[14px] text-black/55">{uit.fout === "migratie" ? "De inwerkreis staat nog niet aan." : "Kon deze inwerkreis niet laden."}</p>;
  }
  if (!uit.data) notFound();
  const { reis, sjabloon } = uit.data;
  const collega = collegas.find((c) => c.user_id === reis.user_id);
  const stand = reisStand(reis, uit.data.stappen, uit.data.voortgang, datumOver(0));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/inwerken" className="mb-1 inline-flex items-center gap-1 text-[13px] font-semibold text-black/45 hover:text-[#312e82]"><LuArrowLeft /> Inwerken</Link>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">{collega?.naam || "Inwerkreis"}</h1>
        <p className="text-[14.5px] text-black/50">
          {collega ? `${collega.email} · ` : ""}
          {sjabloon ? <Link href={`/admin/inwerken/sjabloon/${sjabloon.id}`} className="font-semibold text-[#312e82] hover:underline">{sjabloon.functie}</Link> : null}
          {stand.mijlpalenOpen > 0 ? ` · ${stand.mijlpalenOpen === 1 ? "1 mijlpaal" : `${stand.mijlpalenOpen} mijlpalen`} af te tekenen` : ""}
        </p>
      </div>

      <ReisWeergave volledig={uit.data} stand={stand} modus="beheer" />

      <section className="acard p-6" aria-labelledby="gegevens-kop">
        <h2 id="gegevens-kop" className="font-heading text-[16px] font-bold text-[#312e82]">Gegevens</h2>
        <form action={inwerkreisBijwerken} className="mt-4 grid gap-4 md:grid-cols-[200px_minmax(0,1fr)_auto] md:items-end">
          <input type="hidden" name="id" value={reis.id} />
          <div>
            <label htmlFor="reis-start" className="alabel">Eerste werkdag</label>
            <input id="reis-start" name="startdatum" type="date" required defaultValue={reis.startdatum} className="ainput" />
          </div>
          <div>
            <label htmlFor="reis-buddy" className="alabel">Buddy</label>
            <input id="reis-buddy" name="buddy" maxLength={120} defaultValue={reis.buddy ?? ""} placeholder="Naam van de collega die meeloopt" className="ainput" />
          </div>
          <button className="abtn justify-center">Bewaren</button>
        </form>
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-black/[0.06] pt-5">
          {reis.afgerond_at ? (
            <form action={inwerkreisAfronden.bind(null, reis.id, false)}>
              <button className="abtn-ghost !px-3.5 !py-2 text-[13.5px]"><LuRotateCcw /> Weer laten lopen</button>
            </form>
          ) : (
            <form action={inwerkreisAfronden.bind(null, reis.id, true)}>
              <button className="abtn-ghost !px-3.5 !py-2 text-[13.5px]"><LuCircleCheckBig /> Inwerkreis afronden</button>
            </form>
          )}
          <ConfirmButton
            action={inwerkreisVerwijderen.bind(null, reis.id)}
            message="Deze inwerkreis verwijderen? De vinkjes gaan mee; het sjabloon blijft."
            className="abtn-ghost !px-3.5 !py-2 text-[13.5px] !text-[#e0356b]"
          >
            <LuTrash2 /> Verwijderen
          </ConfirmButton>
          <p className="text-[12.5px] text-black/40">Afronden houdt alles bewaard; de collega ziet de reis als afgerond.</p>
        </div>
      </section>
    </div>
  );
}
