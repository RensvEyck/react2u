import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import {
  ANTWOORD_MOMENTEN, metAntwoordMomenten, ONBOARDING_WEERGAVE, onboardingWeergave, takenVoortgang, voortgang, type AntwoordMomenten, type Onboarding,
  type OnboardingWeergave,
} from "@/lib/onboarding";
import { datumLang, momentLang } from "@/lib/offertes";
import OnboardingTabs from "@/components/admin/OnboardingTabs";
import { LuChevronRight, LuClipboardCheck, LuDatabase, LuPlus } from "react-icons/lu";

/**
 * Alle onboardings (migratie 0037): welke klant wat kreeg, hoe ver de klant
 * is en hoe ver React2u is met inrichten, en de knop om een nieuwe te maken.
 */

const FILTERS: { key: string; label: string; past: (w: OnboardingWeergave) => boolean }[] = [
  { key: "alle", label: "Alle", past: () => true },
  { key: "klant", label: "Bij de klant", past: (w) => w === "verstuurd" || w === "bekeken" },
  { key: "inrichten", label: "Inrichten", past: (w) => w === "afgerond" },
  { key: "ingericht", label: "Ingericht", past: (w) => w === "ingericht" },
  { key: "concept", label: "Concept", past: (w) => w === "concept" },
  { key: "ingetrokken", label: "Ingetrokken", past: (w) => w === "ingetrokken" },
];

/** Zonder de inhoud van `antwoorden` (daar kan het hele werknemersbestand in staan): alleen de momenten, voor de voortgang. */
const KOLOMMEN =
  `id, nummer, status, bedrijf, contactpersoon, email, documenten, invullen, gelezen, taken, vorige_arbodienst, afzender_naam, created_at, verstuurd_at, afgerond_at, bekeken_at, laatst_bekeken_at, aantal_bekeken, ${ANTWOORD_MOMENTEN}`;

type Rij = Omit<Onboarding, "antwoorden" | "token" | "telefoon" | "bericht" | "contractsoort" | "debiteurnummer" | "casemanager" | "afzender_functie" | "afzender_email" | "afzender_telefoon" | "notitie" | "created_by" | "updated_at"> & AntwoordMomenten;

function Balk({ klaar, totaal, kleur }: { klaar: number; totaal: number; kleur: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-black/[0.06]">
        <span className="block h-full rounded-full" style={{ width: `${totaal ? (klaar / totaal) * 100 : 0}%`, background: kleur }} />
      </span>
      <span className="text-[12.5px] tabular-nums text-black/55">{klaar}/{totaal}</span>
    </span>
  );
}

export default async function Onboardings({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const { sb } = await requirePerm("bellijst");
  const { filter = "alle", q = "" } = await searchParams;
  const { data, error } = await sb.from("onboardings").select(KOLOMMEN).order("created_at", { ascending: false }).limit(300);
  const tabel = !error || !isMissingTable(error);
  const alle = ((data as unknown as Rij[] | null) || []).map(metAntwoordMomenten).map((o) => ({ o, w: onboardingWeergave(o), v: voortgang(o), t: takenVoortgang(o) }));
  const actief = FILTERS.find((f) => f.key === filter) || FILTERS[0];
  const zoek = q.trim().toLowerCase();
  const rijen = alle.filter(
    ({ o, w }) => actief.past(w) && (!zoek || [o.bedrijf, o.contactpersoon, o.nummer, o.email].some((x) => (x || "").toLowerCase().includes(zoek)))
  );
  const bijKlant = alle.filter(({ w }) => w === "verstuurd" || w === "bekeken");
  const inrichten = alle.filter(({ w }) => w === "afgerond");
  const ingericht = alle.filter(({ w }) => w === "ingericht");
  const tel = (f: (typeof FILTERS)[number]) => alle.filter(({ w }) => f.past(w)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Onboarding</h1>
          <p className="text-[14.5px] text-black/50">
            Stuur een nieuwe klant één link met alles om te starten. Jij kiest welke documenten meegaan en welke de klant online invult; daarna vink je af wat wij inrichten.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <OnboardingTabs actief="werkgever" werkgever="/admin/onboarding" werknemer="/admin/onboarding/werknemers" />
          <Link href="/admin/onboarding/nieuw" className="abtn"><LuPlus /> Nieuwe onboarding</Link>
        </div>
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Bij de klant" waarde={String(bijKlant.length)} sub={`${bijKlant.filter(({ w }) => w === "bekeken").length} al bezig · ${alle.filter(({ w }) => w === "concept").length} nog concept`} />
        <Kpi label="Inrichten" waarde={String(inrichten.length)} sub="klant klaar, React2u aan zet" accent={inrichten.length > 0 ? "oranje" : undefined} />
        <Kpi label="Ingericht" waarde={String(ingericht.length)} sub="klant live" accent="groen" />
        <Kpi label="Alle onboardings" waarde={String(alle.length)} sub="gaan een jaar na de laatste activiteit weg" />
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
                  href={`/admin/onboarding${params.size ? `?${params}` : ""}`}
                  className={`apill !py-1.5 text-[13px] ${f.key === actief.key ? "bg-[#312e82] text-white" : "bg-black/[0.04] text-black/60 hover:bg-black/[0.07]"}`}
                >
                  {f.label}
                  <span className={f.key === actief.key ? "text-white/70" : "text-black/35"}>{n}</span>
                </Link>
              );
            })}
          </nav>
          <form className="flex w-full flex-wrap gap-2 sm:w-auto" action="/admin/onboarding">
            {actief.key !== "alle" && <input type="hidden" name="filter" value={actief.key} />}
            <input className="ainput !py-2 sm:w-[240px]" name="q" defaultValue={q} placeholder="Zoek op bedrijf of nummer" aria-label="Zoek onboardings" />
            <button className="abtn-ghost !py-2 text-[13px]">Toon</button>
          </form>
        </div>
        {rijen.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef0ff] text-[22px] text-[#312e82]"><LuClipboardCheck /></span>
            <p className="text-[15px] font-semibold text-[#1c1a4e]">{alle.length === 0 ? "Nog geen onboardings" : "Geen onboardings in deze selectie"}</p>
            {alle.length === 0 && (
              <>
                <p className="max-w-[420px] text-[13.5px] text-black/50">Maak er een voor een nieuwe klant: vink de documenten aan en verstuur de link.</p>
                <Link href="/admin/onboarding/nieuw" className="abtn mt-2"><LuPlus /> Nieuwe onboarding</Link>
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
                  <th className="px-4 py-3">Klant</th>
                  <th className="px-4 py-3">React2u</th>
                  <th className="px-4 py-3">Laatste activiteit</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rijen.map(({ o, w, v, t }) => {
                  const s = ONBOARDING_WEERGAVE[w];
                  const activiteit = o.afgerond_at
                    ? `Klant klaar ${momentLang(o.afgerond_at)}`
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
                      <td className="px-4 py-3.5"><Balk klaar={v.klaar} totaal={v.totaal} kleur="#0a7a4b" /></td>
                      <td className="px-4 py-3.5">
                        {o.status === "concept" ? <span className="text-[12.5px] text-black/35">nog niet</span> : <Balk klaar={t.klaar} totaal={t.totaal} kleur="#312e82" />}
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
