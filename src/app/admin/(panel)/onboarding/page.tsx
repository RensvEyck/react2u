import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { ONBOARDING_WEERGAVE, onboardingWeergave, voortgang, type Onboarding } from "@/lib/onboarding";
import { datumLang, momentLang } from "@/lib/offertes";
import { LuChevronRight, LuClipboardCheck, LuDatabase, LuPlus } from "react-icons/lu";

/**
 * Alle onboardings (migratie 0037): welke klant wat kreeg, hoe ver hij is, en
 * de knop om een nieuwe te maken.
 */
export default async function Onboardings() {
  const { sb } = await requirePerm("bellijst");
  const { data, error } = await sb.from("onboardings").select("*").order("created_at", { ascending: false }).limit(300);
  const tabel = !error || (error.code !== "PGRST205" && error.code !== "42P01");
  const alle = ((data as Onboarding[] | null) || []).map((o) => ({ o, w: onboardingWeergave(o), v: voortgang(o) }));
  const lopend = alle.filter(({ o }) => o.status === "verstuurd");
  const compleet = alle.filter(({ o }) => o.status === "afgerond");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Onboarding</h1>
          <p className="text-[14.5px] text-black/50">
            Stuur een nieuwe klant één link met alles om te starten. Jij kiest welke documenten meegaan en welke de klant online invult.
          </p>
        </div>
        <Link href="/admin/onboarding/nieuw" className="abtn"><LuPlus /> Nieuwe onboarding</Link>
      </div>

      {!tabel && (
        <div className="acard flex items-start gap-4 p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef0ff] text-[18px] text-[#312e82]"><LuDatabase /></span>
          <p className="text-[14px] text-black/55">
            Onboarding staat nog niet aan: voer{" "}
            <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[13px]">supabase/migrations/0037_onboarding.sql</code> eerst uit in Supabase.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Loopt nog" waarde={String(lopend.length)} sub={`${alle.filter(({ o }) => o.status === "concept").length} nog concept`} />
        <Kpi label="Compleet" waarde={String(compleet.length)} sub="alles ingevuld of afgevinkt" accent />
        <Kpi label="Alle onboardings" waarde={String(alle.length)} sub="gaan een jaar na de laatste activiteit weg" />
      </div>

      <section className="acard overflow-hidden">
        {alle.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef0ff] text-[22px] text-[#312e82]"><LuClipboardCheck /></span>
            <p className="text-[15px] font-semibold text-[#1c1a4e]">Nog geen onboardings</p>
            <p className="max-w-[420px] text-[13.5px] text-black/50">Maak er een voor een nieuwe klant: vink de documenten aan en verstuur de link.</p>
            <Link href="/admin/onboarding/nieuw" className="abtn mt-2"><LuPlus /> Nieuwe onboarding</Link>
          </div>
        ) : (
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-black/[0.06] text-left text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">
                <th className="px-6 py-3">Klant</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Voortgang</th>
                <th className="px-4 py-3">Laatste activiteit</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {alle.map(({ o, w, v }) => {
                const s = ONBOARDING_WEERGAVE[w];
                const activiteit = o.afgerond_at
                  ? `Compleet ${momentLang(o.afgerond_at)}`
                  : o.laatst_bekeken_at
                    ? `Bekeken ${momentLang(o.laatst_bekeken_at)}`
                    : o.verstuurd_at
                      ? `Verstuurd ${momentLang(o.verstuurd_at)}`
                      : `Aangemaakt ${datumLang(o.created_at)}`;
                return (
                  <tr key={o.id} className="border-b border-black/[0.05] last:border-b-0 hover:bg-black/[0.015]">
                    <td className="px-6 py-3.5">
                      <Link href={`/admin/onboarding/${o.id}`} className="font-semibold text-[#1c1a4e] hover:text-[#312e82]">{o.bedrijf}</Link>
                      <p className="mt-0.5 text-[12.5px] text-black/45">
                        {o.nummer}{o.contactpersoon ? ` · ${o.contactpersoon}` : ""}{o.afzender_naam ? ` · door ${o.afzender_naam}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3.5"><span className="apill" style={{ background: s.achter, color: s.kleur }}>{s.label}</span></td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-2.5">
                        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-black/[0.06]">
                          <span className="block h-full rounded-full bg-[#0a7a4b]" style={{ width: `${v.totaal ? (v.klaar / v.totaal) * 100 : 0}%` }} />
                        </span>
                        <span className="text-[12.5px] text-black/55">{v.klaar}/{v.totaal}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-black/60">{activiteit}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/admin/onboarding/${o.id}`} aria-label={`Open de onboarding van ${o.bedrijf}`} className="text-black/30 hover:text-[#312e82]"><LuChevronRight /></Link>
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
