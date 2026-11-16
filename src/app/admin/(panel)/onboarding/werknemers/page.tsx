import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import OnboardingTabs from "@/components/admin/OnboardingTabs";
import type { Machtiging, Onboarding } from "@/lib/onboarding";
import { datumLang, momentLang } from "@/lib/offertes";
import { LuChevronRight, LuCircle, LuCircleCheck, LuDatabase, LuFileDown, LuMailCheck, LuSignature, LuUsers } from "react-icons/lu";

/**
 * Onboarding, het deel Werknemer (0039): over alle onboardings heen wie de
 * machtiging voor de overdracht van zijn verzuimdossier moet tekenen, wie
 * tekende (met IP-registratie), en welke opdrachten al naar de vorige
 * arbodienst gingen. De tegenhanger van het register Werkgever.
 */

type MRij = Pick<Machtiging, "id" | "onboarding_id" | "naam" | "email" | "status" | "uitgenodigd_at" | "herinnerd_at" | "bekeken_at" | "getekend_at" | "overdracht_at" | "getekend_ip"> & {
  onboardings: Pick<Onboarding, "nummer" | "bedrijf" | "status"> | null;
};

const FILTERS: { key: string; label: string; past: (m: MRij) => boolean }[] = [
  { key: "alle", label: "Alle", past: () => true },
  { key: "open", label: "Wacht op handtekening", past: (m) => m.status === "open" },
  { key: "getekend", label: "Getekend, nog niet verstuurd", past: (m) => m.status === "getekend" && !m.overdracht_at },
  { key: "verstuurd", label: "Naar de arbodienst", past: (m) => m.status === "getekend" && Boolean(m.overdracht_at) },
];

export default async function WerknemersVanKlanten({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const { sb } = await requirePerm("bellijst");
  const { filter = "alle", q = "" } = await searchParams;
  const mRes = await sb.from("onboarding_machtigingen")
    .select("id, onboarding_id, naam, email, status, uitgenodigd_at, herinnerd_at, bekeken_at, getekend_at, overdracht_at, getekend_ip, onboardings(nummer, bedrijf, status)")
    .order("uitgenodigd_at", { ascending: false })
    .limit(500);
  const tabel = !mRes.error || !isMissingTable(mRes.error);
  const alle = ((mRes.data as unknown as MRij[] | null) || []).filter((m) => m.onboardings?.status !== "ingetrokken");
  const actief = FILTERS.find((f) => f.key === filter) || FILTERS[0];
  const zoek = q.trim().toLowerCase();
  const rijen = alle.filter((m) => actief.past(m) && (!zoek || [m.naam, m.email, m.onboardings?.bedrijf, m.onboardings?.nummer].some((x) => (x || "").toLowerCase().includes(zoek))));
  const tel = (f: (typeof FILTERS)[number]) => alle.filter(f.past).length;
  const klanten = new Set(alle.map((m) => m.onboarding_id)).size;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Onboarding werknemer</h1>
          <p className="text-[14.5px] text-black/50">
            De machtiging voor de overdracht van het verzuimdossier: wie tekent, met IP-registratie, en welke opdrachten naar de vorige arbodienst gingen. De werkgever zelf staat onder Werkgever.
          </p>
        </div>
        <OnboardingTabs actief="werknemer" werkgever="/admin/onboarding" werknemer="/admin/onboarding/werknemers" telling={alle.length ? String(alle.length) : undefined} />
      </div>

      {!tabel && (
        <div className="acard flex items-start gap-4 p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef0ff] text-[18px] text-[#312e82]"><LuDatabase /></span>
          <p className="text-[14px] text-black/55">
            Machtigingen staan nog niet aan: voer <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[13px]">supabase/migrations/0038_onboarding_machtigingen.sql</code> eerst uit in Supabase.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Wacht op handtekening" waarde={String(tel(FILTERS[1]))} sub="uitgenodigd, nog niet getekend" accent={tel(FILTERS[1]) > 0 ? "oranje" : undefined} />
        <Kpi label="Getekend, nog niet verstuurd" waarde={String(tel(FILTERS[2]))} sub="de klant stuurt de opdracht nog" />
        <Kpi label="Naar de arbodienst" waarde={String(tel(FILTERS[3]))} sub="opdracht verstuurd; wacht op de dossiers" accent="groen" />
        <Kpi label="Werknemers" waarde={String(alle.length)} sub={`bij ${klanten} ${klanten === 1 ? "klant" : "klanten"}`} />
      </div>

      <section className="acard overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-6 py-4">
          <div className="flex items-center gap-2">
            <LuSignature className="text-[18px] text-[#312e82]" />
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Machtigingen overdracht verzuimdossier</h2>
          </div>
          <form className="flex w-full flex-wrap gap-2 sm:w-auto" action="/admin/onboarding/werknemers">
            {actief.key !== "alle" && <input type="hidden" name="filter" value={actief.key} />}
            <input className="ainput !py-2 sm:w-[240px]" name="q" defaultValue={q} placeholder="Zoek op naam, e-mail of klant" aria-label="Zoek werknemers" />
            <button className="abtn-ghost !py-2 text-[13px]">Toon</button>
          </form>
        </div>
        <nav className="flex flex-wrap gap-1.5 border-b border-black/[0.06] px-6 py-3" aria-label="Filter">
          {FILTERS.map((f) => {
            const params = new URLSearchParams({ ...(f.key !== "alle" ? { filter: f.key } : {}), ...(q ? { q } : {}) });
            return (
              <Link
                key={f.key}
                href={`/admin/onboarding/werknemers${params.size ? `?${params}` : ""}`}
                className={`apill !py-1.5 text-[13px] ${f.key === actief.key ? "bg-[#312e82] text-white" : "bg-black/[0.04] text-black/60 hover:bg-black/[0.07]"}`}
              >
                {f.label}
                <span className={f.key === actief.key ? "text-white/70" : "text-black/35"}>{tel(f)}</span>
              </Link>
            );
          })}
        </nav>
        {rijen.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef0ff] text-[22px] text-[#312e82]"><LuUsers /></span>
            <p className="text-[15px] font-semibold text-[#1c1a4e]">{alle.length === 0 ? "Nog geen werknemers uitgenodigd" : "Geen werknemers in deze selectie"}</p>
            {alle.length === 0 && <p className="max-w-[460px] text-[13.5px] text-black/50">Nodig op het tabblad Werknemer van een onboarding zieke medewerkers met een lopend dossier uit; die tekenen op hun telefoon en verschijnen hier.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[14px]">
              <thead>
                <tr className="border-b border-black/[0.06] text-left text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">
                  <th className="px-6 py-3">Werknemer</th>
                  <th className="px-4 py-3">Klant</th>
                  <th className="px-4 py-3">Stand</th>
                  <th className="px-4 py-3">IP bij tekenen</th>
                  <th className="px-4 py-3">Opdracht</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rijen.map((m) => {
                  const klaar = m.status === "getekend";
                  return (
                    <tr key={m.id} className="border-b border-black/[0.05] last:border-b-0 hover:bg-black/[0.015]">
                      <td className="px-6 py-3.5">
                        <span className="flex items-center gap-2.5">
                          {klaar ? <LuCircleCheck className="shrink-0 text-[17px] text-[#0a7a4b]" /> : <LuCircle className="shrink-0 text-[17px] text-black/20" />}
                          <span>
                            <span className="block font-semibold text-[#1c1a4e]">{m.naam}</span>
                            <span className="block text-[12.5px] text-black/45">{m.email}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link href={`/admin/onboarding/${m.onboarding_id}?tab=werknemer`} className="font-semibold text-[#1c1a4e] hover:text-[#312e82]">{m.onboardings?.bedrijf || "Onbekend"}</Link>
                        <p className="mt-0.5 text-[12.5px] text-black/45">{m.onboardings?.nummer}</p>
                      </td>
                      <td className="px-4 py-3.5 text-black/60">
                        {klaar
                          ? <span className="apill bg-[#e3f6ed] text-[#0a7a4b]">Getekend {datumLang(m.getekend_at)}</span>
                          : m.bekeken_at
                            ? <span className="apill bg-[#e6f2ff] text-[#0b6bcb]">Geopend {datumLang(m.bekeken_at)}</span>
                            : <span className="apill bg-[#fff4e5] text-[#b86e00]">Uitgenodigd {datumLang(m.uitgenodigd_at)}</span>}
                        {m.herinnerd_at && !klaar && <p className="mt-1 text-[12px] text-black/40">herinnerd {momentLang(m.herinnerd_at)}</p>}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[12.5px] text-black/60">{klaar ? m.getekend_ip || "onbekend" : <span className="font-sans text-black/35">nog niet</span>}</td>
                      <td className="px-4 py-3.5 text-black/60">
                        {m.overdracht_at ? (
                          <span className="inline-flex items-center gap-1.5 text-[13px]"><LuMailCheck className="text-[#0a7a4b]" /> Naar de arbodienst {datumLang(m.overdracht_at)}</span>
                        ) : klaar ? (
                          <span className="text-[13px] text-black/45">De klant stuurt de opdracht nog</span>
                        ) : (
                          <span className="text-[12.5px] text-black/35">nog niet</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="inline-flex items-center gap-3">
                          {klaar && (
                            <a href={`/admin/onboarding/${m.onboarding_id}/machtiging/${m.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#312e82] hover:underline"><LuFileDown /> Pdf</a>
                          )}
                          <Link href={`/admin/onboarding/${m.onboarding_id}?tab=werknemer`} aria-label={`Open de werknemers van ${m.onboardings?.bedrijf || "deze klant"}`} className="text-black/30 hover:text-[#312e82]"><LuChevronRight /></Link>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}

function Kpi({ label, waarde, sub, accent }: { label: string; waarde: string; sub: string; accent?: "groen" | "oranje" }) {
  const kleur = accent === "groen" ? "text-[#0a7a4b]" : accent === "oranje" ? "text-[#b86e00]" : "text-[#1c1a4e]";
  return (
    <div className="acard p-5">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">{label}</p>
      <p className={`mt-2 font-heading text-[28px] font-bold leading-none ${kleur}`}>{waarde}</p>
      <p className="mt-2 text-[12.5px] text-black/45">{sub}</p>
    </div>
  );
}
