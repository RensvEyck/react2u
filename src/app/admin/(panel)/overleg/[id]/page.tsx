import Link from "next/link";
import { notFound } from "next/navigation";
import { LuArrowLeft, LuMail } from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { notulenVan, overlegTitel } from "@/lib/overleg";
import { haalEenOverleg, inbrengerNaam } from "@/lib/overlegDb";
import { inMijnReact2u } from "@/lib/weergave";
import { NotulenFormulier, NotulenWeergave } from "@/components/admin/overleg/Notulen";
import Afdrukken from "@/components/admin/overleg/Afdrukken";

/**
 * Eén CM-overleg terug te lezen (0053, 0054), in de vorm van het team:
 * gegevens, agenda, notulen per punt, actie en gemaakte afspraken, punten voor
 * het volgende overleg. Af te drukken; het beheer kan de notulen achteraf nog
 * aanvullen.
 */
export default async function OverlegArchief({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { sb, admin } = await requirePerm("overleg");
  const beheer = admin.permissions.includes("omzet") && !(await inMijnReact2u(admin.permissions));
  const uit = await haalEenOverleg(sb, id);
  if (!uit.ok) return <p className="acard px-6 py-5 text-[14px] text-black/55">Dit overleg kon niet geladen worden.</p>;
  if (!uit.data) notFound();
  const { overleg, agenda, acties, aanwezigen, collegas } = uit.data;
  const n = notulenVan(overleg, agenda, aanwezigen, acties, inbrengerNaam(collegas));

  return (
    <div className="space-y-6">
      {/* Afdrukken: alleen de notulen, zonder menu en balk. */}
      <style>{`@media print { aside, header, .geen-print { display: none !important; } .lg\\:pl-\\[248px\\] { padding-left: 0 !important; } main { padding: 0 !important; max-width: none !important; } .acard { box-shadow: none !important; border: 0 !important; } body, .min-h-screen { background: #fff !important; } }`}</style>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link href="/admin/overleg#archief" className="geen-print mb-1 inline-flex items-center gap-1 text-[13px] font-semibold text-black/45 hover:text-[#312e82]"><LuArrowLeft /> CM-overleg</Link>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">{n.titel}</h1>
          <p className="flex flex-wrap items-center gap-x-3 text-[14px] text-black/50">
            <span>{overleg.afgerond_at ? "Afgerond" : "Nog niet afgerond"}</span>
            {overleg.gemaild_at && <span className="inline-flex items-center gap-1"><LuMail /> gemaild aan de aanwezigen</span>}
          </p>
        </div>
        <Afdrukken />
      </div>

      <section className="acard p-6" aria-label={`Notulen ${overlegTitel(overleg.datum)}`}>
        <NotulenWeergave n={n} overigeNotities={overleg.notulen} />
      </section>

      {beheer && (
        <details className="geen-print acard group/aanvul p-6">
          <summary className="cursor-pointer list-none font-heading text-[15px] font-bold text-[#312e82] [&::-webkit-details-marker]:hidden">
            <span className="group-open/aanvul:hidden">Notulen aanvullen</span><span className="hidden group-open/aanvul:inline">Notulen aanvullen</span>
          </summary>
          <div className="mt-4">
            <NotulenFormulier overlegId={overleg.id} agenda={agenda} aanwezigen={aanwezigen} naar="archief" />
          </div>
        </details>
      )}
    </div>
  );
}
