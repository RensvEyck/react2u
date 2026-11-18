import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { aandachtspunten, EVALUATIE_WEERGAVE, evaluatieWeergave, type Evaluatie, type EvaluatieWeergave } from "@/lib/evaluatie";
import { datumLang, momentLang } from "@/lib/offertes";
import { LuArrowLeft, LuChevronRight, LuClipboardList, LuDatabase, LuPlus } from "react-icons/lu";

/**
 * Alle klantevaluaties (migratie 0043): welke klant er een kreeg, of hij al
 * ingevuld is en hoeveel aandachtspunten de klant aangaf, met de knop om een
 * nieuwe te maken.
 */

const FILTERS: { key: string; label: string; past: (w: EvaluatieWeergave) => boolean }[] = [
  { key: "alle", label: "Alle", past: () => true },
  { key: "klant", label: "Bij de klant", past: (w) => w === "verstuurd" || w === "bekeken" },
  { key: "ingevuld", label: "Ingevuld", past: (w) => w === "ingevuld" },
  { key: "concept", label: "Concept", past: (w) => w === "concept" },
  { key: "ingetrokken", label: "Ingetrokken", past: (w) => w === "ingetrokken" },
];

const KOLOMMEN = "id, nummer, status, bedrijf, contactpersoon, email, bezoek_datum, antwoorden, ingevuld_at, ingevuld_door, afzender_naam, created_at, verstuurd_at, bekeken_at, laatst_bekeken_at, aantal_bekeken";

type Rij = Pick<Evaluatie, "id" | "nummer" | "status" | "bedrijf" | "contactpersoon" | "email" | "bezoek_datum" | "antwoorden" | "ingevuld_at" | "ingevuld_door" | "afzender_naam" | "created_at" | "verstuurd_at" | "bekeken_at" | "laatst_bekeken_at" | "aantal_bekeken">;

export default async function Evaluaties({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const { sb } = await requirePerm("bellijst");
  const { filter = "alle", q = "" } = await searchParams;
  const { data, error } = await sb.from("evaluaties").select(KOLOMMEN).order("created_at", { ascending: false }).limit(300);
  const tabel = !error || !isMissingTable(error);
  const alle = ((data as unknown as Rij[] | null) || []).map((e) => ({ e, w: evaluatieWeergave(e), punten: aandachtspunten(e.antwoorden).length }));
  const actief = FILTERS.find((f) => f.key === filter) || FILTERS[0];
  const zoek = q.trim().toLowerCase();
  const rijen = alle.filter(
    ({ e, w }) => actief.past(w) && (!zoek || [e.bedrijf, e.contactpersoon, e.nummer, e.email].some((x) => (x || "").toLowerCase().includes(zoek)))
  );
  const bijKlant = alle.filter(({ w }) => w === "verstuurd" || w === "bekeken");
  const ingevuld = alle.filter(({ w }) => w === "ingevuld");
  const metPunten = ingevuld.filter(({ punten }) => punten > 0);
  const tel = (f: (typeof FILTERS)[number]) => alle.filter(({ w }) => f.past(w)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Link href="/admin/documenten" className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-black/50 hover:text-[#312e82]">
          <LuArrowLeft /> Documenten
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Klantevaluaties</h1>
            <p className="text-[14.5px] text-black/50">
              Stuur een klant de jaarlijkse evaluatie als persoonlijke link. De klant vult de checklist, de evaluatie, de wensen en de afspraken online in; jij ziet de antwoorden en de pdf hier.
            </p>
          </div>
          <Link href="/admin/documenten/evaluaties/nieuw" className="abtn"><LuPlus /> Nieuwe evaluatie</Link>
        </div>
      </div>

      {!tabel && (
        <div className="acard flex items-start gap-4 p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef0ff] text-[18px] text-[#312e82]"><LuDatabase /></span>
          <p className="text-[14px] text-black/55">
            Klantevaluaties staan nog niet aan: voer{" "}
            <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[13px]">supabase/migrations/0043_klantevaluatie.sql</code> eerst uit in Supabase.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Bij de klant" waarde={String(bijKlant.length)} sub={`${bijKlant.filter(({ w }) => w === "bekeken").length} al bezig · ${alle.filter(({ w }) => w === "concept").length} nog concept`} />
        <Kpi label="Ingevuld" waarde={String(ingevuld.length)} sub="klaar om te bespreken" accent="groen" />
        <Kpi label="Met aandachtspunten" waarde={String(metPunten.length)} sub="een of meer punten nog niet geregeld" accent={metPunten.length > 0 ? "oranje" : undefined} />
        <Kpi label="Alle evaluaties" waarde={String(alle.length)} sub="gaan twee jaar na de laatste activiteit weg" />
      </div>

      <section className="acard overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-6 py-4">
          <nav className="flex flex-wrap gap-1.5" aria-label="Filter">
            {FILTERS.map((f) => {
              const n = tel(f);
              const params = new URLSearchParams({ ...(f.key !== "alle" ? { filter: f.key } : {}), ...(q ? { q } : {}) });
              return (
                <Link
                  key={f.key}
                  href={`/admin/documenten/evaluaties${params.size ? `?${params}` : ""}`}
                  className={`apill !py-1.5 text-[13px] ${f.key === actief.key ? "bg-[#312e82] text-white" : "bg-black/[0.04] text-black/60 hover:bg-black/[0.07]"}`}
                >
                  {f.label}
                  <span className={f.key === actief.key ? "text-white/70" : "text-black/35"}>{n}</span>
                </Link>
              );
            })}
          </nav>
          <form className="flex w-full flex-wrap gap-2 sm:w-auto" action="/admin/documenten/evaluaties">
            {actief.key !== "alle" && <input type="hidden" name="filter" value={actief.key} />}
            <input className="ainput !py-2 sm:w-[240px]" name="q" defaultValue={q} placeholder="Zoek op bedrijf of nummer" aria-label="Zoek evaluaties" />
            <button className="abtn-ghost !py-2 text-[13px]">Toon</button>
          </form>
        </div>
        {rijen.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fdecf4] text-[22px] text-[#e61674]"><LuClipboardList /></span>
            <p className="text-[15px] font-semibold text-[#1c1a4e]">{alle.length === 0 ? "Nog geen evaluaties" : "Geen evaluaties in deze selectie"}</p>
            {alle.length === 0 && (
              <>
                <p className="max-w-[420px] text-[13.5px] text-black/50">Maak er een voor een klant: vul de gegevens in, bekijk het voorbeeld en verstuur de link.</p>
                <Link href="/admin/documenten/evaluaties/nieuw" className="abtn mt-2"><LuPlus /> Nieuwe evaluatie</Link>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-[14px]">
              <thead>
                <tr className="border-b border-black/[0.06] text-left text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">
                  <th className="px-6 py-3">Klant</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Bezoek</th>
                  <th className="px-4 py-3">Aandachtspunten</th>
                  <th className="px-4 py-3">Laatste activiteit</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rijen.map(({ e, w, punten }) => {
                  const s = EVALUATIE_WEERGAVE[w];
                  const activiteit = e.ingevuld_at
                    ? `Ingevuld ${momentLang(e.ingevuld_at)}`
                    : e.laatst_bekeken_at
                      ? `Bekeken ${momentLang(e.laatst_bekeken_at)}`
                      : e.verstuurd_at
                        ? `Verstuurd ${momentLang(e.verstuurd_at)}`
                        : `Aangemaakt ${datumLang(e.created_at)}`;
                  return (
                    <tr key={e.id} className="border-b border-black/[0.05] last:border-b-0 hover:bg-black/[0.015]">
                      <td className="px-6 py-3.5">
                        <Link href={`/admin/documenten/evaluaties/${e.id}`} className="font-semibold text-[#1c1a4e] hover:text-[#312e82]">{e.bedrijf}</Link>
                        <p className="mt-0.5 text-[12.5px] text-black/45">
                          {e.nummer}{e.contactpersoon ? ` · ${e.contactpersoon}` : ""}{e.afzender_naam ? ` · door ${e.afzender_naam}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3.5"><span className="apill" style={{ background: s.achter, color: s.kleur }}>{s.label}</span></td>
                      <td className="px-4 py-3.5 text-black/60">{e.bezoek_datum ? datumLang(e.bezoek_datum) : <span className="text-black/35">nog geen datum</span>}</td>
                      <td className="px-4 py-3.5">
                        {w === "ingevuld" ? (
                          punten > 0 ? (
                            <span className="apill bg-[#fff4e5] text-[#b86e00]">{punten} {punten === 1 ? "punt" : "punten"}</span>
                          ) : (
                            <span className="apill bg-[#e3f6ed] text-[#0a7a4b]">alles geregeld</span>
                          )
                        ) : (
                          <span className="text-[12.5px] text-black/35">nog niet ingevuld</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-black/60">{activiteit}</td>
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/admin/documenten/evaluaties/${e.id}`} aria-label={`Open de evaluatie van ${e.bedrijf}`} className="text-black/30 hover:text-[#312e82]"><LuChevronRight /></Link>
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
