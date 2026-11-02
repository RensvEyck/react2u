import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { BROCHURE_WEERGAVE, brochureWeergave, type Brochure } from "@/lib/brochures";
import { datumLang, momentLang } from "@/lib/offertes";
import { LuBookOpen, LuChevronRight, LuDatabase, LuEye, LuPlus } from "react-icons/lu";

/**
 * Alle brochures (migratie 0030): wie welke brochure kreeg, of hij bekeken
 * is, en de knop om een nieuwe te maken. De inhoud van een brochure is voor
 * iedereen gelijk (de zes diensten van de site); per prospect verschillen
 * alleen het persoonlijke woord en de afzender.
 */
export default async function Brochures() {
  const { sb } = await requirePerm("bellijst");
  const { data, error } = await sb.from("brochures").select("*").order("created_at", { ascending: false }).limit(300);
  const tabel = !error || (error.code !== "PGRST205" && error.code !== "42P01");
  const alle = ((data as Brochure[] | null) || []).map((b) => ({ b, w: brochureWeergave(b) }));
  const verstuurd = alle.filter(({ b }) => b.status === "verstuurd");
  const bekeken = alle.filter(({ w }) => w === "bekeken");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Brochures</h1>
          <p className="text-[14.5px] text-black/50">
            Stuur een prospect een persoonlijke brochure met alle zes diensten, nog vóór er een offerte is. Je ziet wanneer hij hem bekijkt.
          </p>
        </div>
        <Link href="/admin/brochures/nieuw" className="abtn"><LuPlus /> Nieuwe brochure</Link>
      </div>

      {!tabel && (
        <div className="acard flex items-start gap-4 p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef0ff] text-[18px] text-[#312e82]"><LuDatabase /></span>
          <p className="text-[14px] text-black/55">
            Brochures staan nog niet aan: voer{" "}
            <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[13px]">supabase/migrations/0030_brochures.sql</code> eerst uit in Supabase.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Verstuurd" waarde={String(verstuurd.length)} sub={`${alle.filter(({ b }) => b.status === "concept").length} nog concept`} />
        <Kpi label="Bekeken door de prospect" waarde={String(bekeken.length)} sub={verstuurd.length ? `van ${verstuurd.length} verstuurd` : "nog geen"} accent />
        <Kpi label="Alle brochures" waarde={String(alle.length)} sub="niet-verstuurde gaan na een jaar weg" />
      </div>

      <section className="acard overflow-hidden">
        {alle.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef0ff] text-[22px] text-[#312e82]"><LuBookOpen /></span>
            <p className="text-[15px] font-semibold text-[#1c1a4e]">Nog geen brochures</p>
            <p className="max-w-[420px] text-[13.5px] text-black/50">Maak er een voor een prospect: je vult alleen in voor wie hij is en wat je erbij wilt zeggen.</p>
            <Link href="/admin/brochures/nieuw" className="abtn mt-2"><LuPlus /> Nieuwe brochure</Link>
          </div>
        ) : (
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-black/[0.06] text-left text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">
                <th className="px-6 py-3">Prospect</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Laatste activiteit</th>
                <th className="px-4 py-3">Aangemaakt</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {alle.map(({ b, w }) => {
                const s = BROCHURE_WEERGAVE[w];
                const activiteit = b.laatst_bekeken_at
                  ? `Bekeken ${momentLang(b.laatst_bekeken_at)}`
                  : b.verstuurd_at
                    ? `Verstuurd ${momentLang(b.verstuurd_at)}`
                    : `Aangemaakt ${momentLang(b.created_at)}`;
                return (
                  <tr key={b.id} className="border-b border-black/[0.05] last:border-b-0 hover:bg-black/[0.015]">
                    <td className="px-6 py-3.5">
                      <Link href={`/admin/brochures/${b.id}`} className="font-semibold text-[#1c1a4e] hover:text-[#312e82]">{b.bedrijf}</Link>
                      <p className="mt-0.5 text-[12.5px] text-black/45">
                        {b.nummer}{b.contactpersoon ? ` · ${b.contactpersoon}` : ""}{b.afzender_naam ? ` · door ${b.afzender_naam}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-2">
                        <span className="apill" style={{ background: s.achter, color: s.kleur }}>{s.label}</span>
                        {b.aantal_bekeken > 0 && <span className="inline-flex items-center gap-1 text-[12.5px] text-black/45"><LuEye /> {b.aantal_bekeken}</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-black/60">{activiteit}</td>
                    <td className="px-4 py-3.5 text-black/60">{datumLang(b.created_at)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/admin/brochures/${b.id}`} aria-label={`Open de brochure voor ${b.bedrijf}`} className="text-black/30 hover:text-[#312e82]"><LuChevronRight /></Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, waarde, sub, accent }: { label: string; waarde: string; sub: string; accent?: boolean }) {
  return (
    <div className="acard p-5">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">{label}</p>
      <p className={`mt-2 font-heading text-[28px] font-bold leading-none ${accent ? "text-[#0a7a4b]" : "text-[#1c1a4e]"}`}>{waarde}</p>
      <p className="mt-2 text-[12.5px] text-black/45">{sub}</p>
    </div>
  );
}
