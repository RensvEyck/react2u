import Link from "next/link";
import { notFound } from "next/navigation";
import { LuArrowLeft, LuCheck, LuCircleCheckBig, LuListTodo, LuMapPin, LuNotebookPen } from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { firstName } from "@/lib/dashboard";
import { NIETS_MEDISCH, overlegTitel, sorteerAgenda } from "@/lib/overleg";
import { haalEenOverleg } from "@/lib/overlegDb";
import { actiepuntZetten, overlegNotulen } from "@/app/admin/overlegActions";
import StapVink from "@/components/admin/inwerk/StapVink";

/** Eén CM-overleg terug te lezen (0053): agenda, notulen en wat er met de actiepunten gebeurde. */
export default async function OverlegArchief({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { sb, admin } = await requirePerm("overleg");
  const beheer = admin.permissions.includes("omzet");
  const uit = await haalEenOverleg(sb, id);
  if (!uit.ok) return <p className="acard px-6 py-5 text-[14px] text-black/55">Dit overleg kon niet geladen worden.</p>;
  if (!uit.data) notFound();
  const { overleg, agenda, acties } = uit.data;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/overleg#archief" className="mb-1 inline-flex items-center gap-1 text-[13px] font-semibold text-black/45 hover:text-[#312e82]"><LuArrowLeft /> CM-overleg</Link>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">{overlegTitel(overleg.datum)}</h1>
        <p className="flex flex-wrap items-center gap-x-3 text-[14.5px] text-black/50">
          {overleg.locatie && <span className="inline-flex items-center gap-1.5"><LuMapPin /> {overleg.locatie}</span>}
          <span>{overleg.afgerond_at ? "Afgerond" : "Nog niet afgerond"}</span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="acard overflow-hidden" aria-labelledby="a-agenda">
          <h2 id="a-agenda" className="flex items-center gap-2 border-b border-black/[0.06] px-6 py-4 font-heading text-[16px] font-bold text-[#312e82]"><LuListTodo /> Agenda</h2>
          {agenda.length === 0 ? (
            <p className="px-6 py-5 text-[13.5px] text-black/45">Geen agendapunten.</p>
          ) : (
            <ol className="divide-y divide-black/[0.05]">
              {sorteerAgenda(agenda).map((p) => (
                <li key={p.id} className="flex items-start gap-3 px-6 py-3" data-punt={p.titel}>
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${p.besproken ? "bg-[#0a7a4b] text-white" : "bg-black/[0.06]"}`} aria-label={p.besproken ? "besproken" : "niet besproken"}>
                    {p.besproken && <LuCheck className="text-[12px]" strokeWidth={3} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#1c1a4e]">{p.titel}{!p.vast && <span className="ml-2 text-[12px] font-normal text-black/40">van {firstName(p.door_email || "") || "een collega"}</span>}</p>
                    {p.toelichting && <p className="whitespace-pre-line text-[13px] text-black/55">{p.toelichting}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="acard overflow-hidden" aria-labelledby="a-acties">
          <h2 id="a-acties" className="flex items-center gap-2 border-b border-black/[0.06] px-6 py-4 font-heading text-[16px] font-bold text-[#312e82]"><LuCircleCheckBig /> Actiepunten</h2>
          {acties.length === 0 ? (
            <p className="px-6 py-5 text-[13.5px] text-black/45">In dit overleg zijn geen actiepunten gemaakt.</p>
          ) : (
            <ul className="divide-y divide-black/[0.05]">
              {acties.map((a) => {
                const regel = (
                  <div className="min-w-0">
                    <p className={`text-[14px] font-medium ${a.gedaan_at ? "text-black/45 line-through decoration-black/25" : "text-[#1c1a4e]"}`}>{a.wat}</p>
                    <p className="text-[12px] text-black/40">{a.wie_naam}{a.gedaan_at ? " · gedaan" : ""}</p>
                  </div>
                );
                return (
                  <li key={a.id} className="px-6 py-3" data-actie={a.wat}>
                    {beheer || a.wie === admin.userId ? (
                      <StapVink gedaan={Boolean(a.gedaan_at)} zet={actiepuntZetten.bind(null, a.id)} label={`Gedaan: ${a.wat}`}>{regel}</StapVink>
                    ) : regel}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="acard p-6" aria-labelledby="a-notulen">
        <h2 id="a-notulen" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuNotebookPen /> Notulen</h2>
        {beheer ? (
          <form action={overlegNotulen} className="mt-3 space-y-3">
            <input type="hidden" name="id" value={overleg.id} />
            <input type="hidden" name="naar" value="archief" />
            <textarea name="notulen" rows={8} maxLength={20000} defaultValue={overleg.notulen ?? ""} className="ainput resize-y" aria-label="Notulen" />
            <div className="flex flex-wrap items-center gap-3">
              <button className="abtn-ghost !py-2 text-[13.5px]">Notulen bewaren</button>
              <span className="text-[12.5px] text-black/40">{NIETS_MEDISCH}</span>
            </div>
          </form>
        ) : overleg.notulen ? (
          <p className="mt-3 whitespace-pre-line text-[14px] leading-[1.65] text-black/70" id="notulen-gelezen">{overleg.notulen}</p>
        ) : (
          <p className="mt-3 text-[13.5px] text-black/45">Bij dit overleg zijn geen notulen geschreven.</p>
        )}
      </section>
    </div>
  );
}
