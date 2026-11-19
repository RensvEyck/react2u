import Link from "next/link";
import { notFound } from "next/navigation";
import { LuArrowDown, LuArrowLeft, LuArrowUp, LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { FASES, SOORT_VOLGORDE, SOORTEN, sorteerStappen, stappenWoord, type InwerkSjabloon, type InwerkSoort, type InwerkStap } from "@/lib/inwerkreis";
import {
  inwerkSjabloonVerwijderen, inwerkStapBewerken, inwerkStapToevoegen, inwerkStapVerplaatsen, inwerkStapVerwijderen,
} from "@/app/admin/inwerkreisActions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { SoortPil } from "@/components/admin/inwerk/Reis";

/**
 * Het sjabloon van één functie (0050, recht omzet): per fase de stappen, met
 * toevoegen, bewerken, verplaatsen en verwijderen. Een reis wijst naar het
 * sjabloon, dus een wijziging geldt meteen ook voor lopende reizen.
 */

function SoortKeuze({ naam, gekozen, id }: { naam: string; gekozen: InwerkSoort; id: string }) {
  return (
    <fieldset>
      <legend className="alabel">Soort</legend>
      <div className="flex flex-wrap gap-2">
        {SOORT_VOLGORDE.map((k) => (
          <label key={k} className="cursor-pointer">
            <input type="radio" name={naam} value={k} defaultChecked={k === gekozen} className="peer sr-only" id={`${id}-${k}`} />
            <span
              className="apill border border-black/[0.1] bg-white !px-3.5 !py-1.5 text-[13px] text-black/55 transition peer-checked:border-[#312e82] peer-checked:bg-[#312e82] peer-checked:text-white peer-focus-visible:ring-[3px] peer-focus-visible:ring-[#e75387]/25">
              {SOORTEN[k].label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function StapVelden({ stap, sjabloonId, fase, idVoorvoegsel }: { stap?: InwerkStap; sjabloonId: string; fase: number; idVoorvoegsel: string }) {
  return (
    <>
      <input type="hidden" name="sjabloon_id" value={sjabloonId} />
      {stap && <input type="hidden" name="id" value={stap.id} />}
      <SoortKeuze naam="soort" gekozen={stap?.soort ?? "taak"} id={idVoorvoegsel} />
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_170px]">
        <div>
          <label htmlFor={`${idVoorvoegsel}-titel`} className="alabel">Titel</label>
          <input id={`${idVoorvoegsel}-titel`} name="titel" required maxLength={200} defaultValue={stap?.titel} placeholder="Kort en concreet" className="ainput" />
        </div>
        <div>
          <label htmlFor={`${idVoorvoegsel}-fase`} className="alabel">Fase</label>
          <select id={`${idVoorvoegsel}-fase`} name="fase" defaultValue={stap?.fase ?? fase} className="ainput">
            {FASES.map((f) => <option key={f.fase} value={f.fase}>{f.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor={`${idVoorvoegsel}-uitleg`} className="alabel">Uitleg <span className="font-normal text-black/35">(mag leeg)</span></label>
        <textarea id={`${idVoorvoegsel}-uitleg`} name="uitleg" rows={2} maxLength={2000} defaultValue={stap?.uitleg ?? ""} placeholder="Wat moet er gebeuren, met wie, en waar staat het?" className="ainput resize-y" />
      </div>
    </>
  );
}

export default async function Sjabloon({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("omzet");
  const [{ data: sj }, { data: st }, { count }] = await Promise.all([
    sb.from("inwerk_sjablonen").select("id, functie, sort").eq("id", id).maybeSingle(),
    sb.from("inwerk_stappen").select("*").eq("sjabloon_id", id),
    sb.from("inwerkreizen").select("id", { count: "exact", head: true }).eq("sjabloon_id", id),
  ]);
  if (!sj) notFound();
  const sjabloon = sj as InwerkSjabloon;
  const stappen = sorteerStappen((st as InwerkStap[] | null) || []);
  const inGebruik = count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link href="/admin/inwerken#sjablonen" className="mb-1 inline-flex items-center gap-1 text-[13px] font-semibold text-black/45 hover:text-[#312e82]"><LuArrowLeft /> Inwerken</Link>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">{sjabloon.functie}</h1>
          <p className="text-[14.5px] text-black/50">
            Wat een nieuwe collega in deze functie de eerste 90 dagen doet.
            {inGebruik > 0 ? ` Een wijziging geldt meteen, ook voor de ${inGebruik === 1 ? "collega" : `${inGebruik} collega's`} die al onderweg ${inGebruik === 1 ? "is" : "zijn"}.` : ""}
          </p>
        </div>
      </div>

      <dl className="grid gap-3 md:grid-cols-3">
        {SOORT_VOLGORDE.map((k) => (
          <div key={k} className="rounded-[14px] bg-white/70 px-4 py-3 ring-1 ring-black/[0.05]">
            <dt><SoortPil soort={k} /></dt>
            <dd className="mt-1.5 text-[12.5px] leading-[1.5] text-black/50">{SOORTEN[k].uitleg}</dd>
          </div>
        ))}
      </dl>

      {FASES.map((f) => {
        const lijst = stappen.filter((s) => s.fase === f.fase);
        return (
          <section key={f.fase} id={`fase-${f.fase}`} className="acard overflow-hidden scroll-mt-24" aria-labelledby={`sj-fase-${f.fase}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-black/[0.06] px-6 py-4">
              <h2 id={`sj-fase-${f.fase}`} className="font-heading text-[16px] font-bold text-[#312e82]">{f.label}</h2>
              <p className="text-[12.5px] tabular-nums text-black/40">dag {f.van} tot {f.tot} · {lijst.length} {stappenWoord(lijst.length)}</p>
            </div>
            {lijst.length > 0 && (
              <ol className="divide-y divide-black/[0.05]">
                {lijst.map((s, i) => (
                  <li key={s.id} className="px-6 py-4" data-stap={s.titel}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <SoortPil soort={s.soort} />
                          <span className="text-[14.5px] font-semibold text-[#1c1a4e]">{s.titel}</span>
                        </div>
                        {s.uitleg && <p className="mt-1 whitespace-pre-line text-[13.5px] leading-[1.55] text-black/55">{s.uitleg}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <form action={inwerkStapVerplaatsen.bind(null, s.id, sjabloon.id, f.fase, -1)}>
                          <button disabled={i === 0} aria-label={`${s.titel} omhoog`} className="rounded-lg p-2 text-black/40 hover:bg-black/[0.04] hover:text-[#312e82] disabled:opacity-25"><LuArrowUp /></button>
                        </form>
                        <form action={inwerkStapVerplaatsen.bind(null, s.id, sjabloon.id, f.fase, 1)}>
                          <button disabled={i === lijst.length - 1} aria-label={`${s.titel} omlaag`} className="rounded-lg p-2 text-black/40 hover:bg-black/[0.04] hover:text-[#312e82] disabled:opacity-25"><LuArrowDown /></button>
                        </form>
                        <ConfirmButton
                          action={inwerkStapVerwijderen.bind(null, s.id, sjabloon.id, f.fase)}
                          message={`"${s.titel}" verwijderen? Ook wie hem al afvinkte, verliest dat vinkje.`}
                          className="rounded-lg p-2 text-black/40 hover:bg-[#fdeef4] hover:text-[#e0356b]"
                        >
                          <LuTrash2 aria-hidden /><span className="sr-only">{s.titel} verwijderen</span>
                        </ConfirmButton>
                      </div>
                    </div>
                    <details className="group/bewerk mt-2">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[12.5px] font-semibold text-black/45 hover:text-[#312e82] [&::-webkit-details-marker]:hidden">
                        <LuPencil className="text-[12px]" /> <span className="group-open/bewerk:hidden">Bewerken</span><span className="hidden group-open/bewerk:inline">Niet bewerken</span>
                      </summary>
                      <form action={inwerkStapBewerken} className="mt-3 space-y-3 rounded-[14px] bg-[#f6f5fb] p-4">
                        <StapVelden stap={s} sjabloonId={sjabloon.id} fase={f.fase} idVoorvoegsel={`bewerk-${s.id}`} />
                        <button className="abtn !py-2 text-[13.5px]">Bewaren</button>
                      </form>
                    </details>
                  </li>
                ))}
              </ol>
            )}
            <details className={`group/nieuw border-black/[0.06] px-6 py-4 ${lijst.length ? "border-t" : ""}`} open={lijst.length === 0}>
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[13.5px] font-semibold text-[#e75387] hover:underline [&::-webkit-details-marker]:hidden">
                <LuPlus /> Stap toevoegen aan {f.label.toLowerCase()}
              </summary>
              <form action={inwerkStapToevoegen} className="mt-3 space-y-3" data-nieuw={f.fase}>
                <StapVelden sjabloonId={sjabloon.id} fase={f.fase} idVoorvoegsel={`nieuw-${f.fase}`} />
                <button className="abtn !py-2 text-[13.5px]"><LuPlus /> Toevoegen</button>
              </form>
            </details>
          </section>
        );
      })}

      <section className="rounded-[16px] border border-dashed border-black/[0.12] px-6 py-5">
        <h2 className="text-[14px] font-semibold text-[#1c1a4e]">Sjabloon verwijderen</h2>
        {inGebruik > 0 ? (
          <p className="mt-1 text-[13px] text-black/45">Kan niet: dit sjabloon hoort bij een inwerkreis. Verwijder eerst die reis.</p>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-[13px] text-black/45">De functie en al haar stappen gaan weg.</p>
            <ConfirmButton action={inwerkSjabloonVerwijderen.bind(null, sjabloon.id)} message={`Het sjabloon ${sjabloon.functie} met ${stappen.length} stappen verwijderen?`} className="abtn-ghost !px-3.5 !py-2 text-[13.5px] !text-[#e0356b]">
              <LuTrash2 /> Verwijderen
            </ConfirmButton>
          </div>
        )}
      </section>
    </div>
  );
}
