import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { datumOver, euro, isVorm, waardeVan, weergaveVan, WEERGAVE, VORMEN, VORM_KEYS, type Offerte, type Weergave } from "@/lib/offertes";
import { LuPlus, LuDatabase, LuFilePenLine, LuChevronRight, LuEye, LuSettings2 } from "react-icons/lu";

/**
 * Offertes (migratie 0024): de pijplijn in één oogopslag (open, bekeken,
 * getekend), en de lijst met per offerte de status, de waarde en wat de klant
 * het laatst deed. Aanmaken en bewerken op /admin/offertes/nieuw en /[id].
 */

const FILTERS: { key: string; label: string; past: (w: Weergave) => boolean }[] = [
  { key: "alle", label: "Alle", past: () => true },
  { key: "open", label: "Open", past: (w) => w === "verstuurd" || w === "bekeken" },
  { key: "concept", label: "Concept", past: (w) => w === "concept" },
  { key: "getekend", label: "Getekend", past: (w) => w === "getekend" },
  { key: "afgerond", label: "Niet akkoord of verlopen", past: (w) => w === "afgewezen" || w === "verlopen" || w === "ingetrokken" },
];

const KOLOMMEN =
  "id, nummer, status, bedrijf, contactpersoon, medewerkers, regels, keuze, geldig_tot, created_at, verstuurd_at, bekeken_at, laatst_bekeken_at, aantal_bekeken, getekend_at, afgewezen_at, afzender_naam";

function relatief(iso: string | null): string {
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "zojuist";
  if (min < 60) return `${min} min geleden`;
  const uur = Math.round(min / 60);
  if (uur < 24) return `${uur} uur geleden`;
  const dagen = Math.round(uur / 24);
  if (dagen < 31) return dagen === 1 ? "gisteren" : `${dagen} dagen geleden`;
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export default async function OffertesAdmin({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string; vorm?: string }> }) {
  const { sb } = await requirePerm("bellijst");
  const { filter = "alle", q = "", vorm: vormFilter } = await searchParams;
  const lees = (kolommen: string) => sb.from("offertes").select(kolommen).order("created_at", { ascending: false }).limit(1000);
  let { data, error } = await lees(`${KOLOMMEN}, vorm, betreft`);
  // Zonder migratie 0025 bestaan vorm en betreft nog niet: dan zonder, alles is verzuimbegeleiding.
  if (error && (error.code === "42703" || error.code === "PGRST204")) ({ data, error } = await lees(KOLOMMEN));
  if (isMissingTable(error)) return <SetupNeeded />;

  const vandaag = datumOver(0);
  const alle = ((data as unknown as Offerte[]) || []).map((o) => ({
    o: { ...o, vorm: isVorm(o.vorm) ? o.vorm : ("verzuimbegeleiding" as const) },
    w: weergaveVan(o, vandaag),
    waarde: waardeVan(o),
  }));
  const actief = FILTERS.find((f) => f.key === filter) || FILTERS[0];
  const zoek = q.trim().toLowerCase();
  const vorm = isVorm(vormFilter) ? vormFilter : null;
  const rijen = alle.filter(
    ({ o, w }) => actief.past(w) && (!vorm || o.vorm === vorm) && (!zoek || `${o.bedrijf} ${o.nummer} ${o.contactpersoon || ""} ${o.betreft || ""}`.toLowerCase().includes(zoek))
  );

  // De pijplijn: wat er openstaat, wat de klant al bekeek, en wat er de laatste 90 dagen getekend is.
  const open = alle.filter(({ w }) => w === "verstuurd" || w === "bekeken");
  const bekeken = open.filter(({ w }) => w === "bekeken");
  const sinds = datumOver(-90);
  const recent = alle.filter(({ o }) => o.verstuurd_at && o.verstuurd_at.slice(0, 10) >= sinds);
  const getekend = recent.filter(({ w }) => w === "getekend");
  const afgerond = recent.filter(({ w }) => w === "getekend" || w === "afgewezen" || w === "verlopen");
  const conversie = afgerond.length ? Math.round((getekend.length / afgerond.length) * 100) : null;
  const som = (l: typeof alle) => Math.round(l.reduce((s, r) => s + r.waarde.perMaand, 0) * 100) / 100;
  const tel = (f: (typeof FILTERS)[number]) => alle.filter(({ w }) => f.past(w)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Offertes</h1>
          <p className="text-[14.5px] text-black/50">
            Stel een offerte samen uit de prijslijst en stuur de klant een link. Daar kiest hij zelf de onderdelen en tekent hij online.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/offertes/sjablonen" className="abtn-ghost"><LuSettings2 /> Sjablonen</Link>
          <Link href="/admin/offertes/nieuw" className="abtn"><LuPlus /> Nieuwe offerte</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Open" waarde={euro(som(open))} sub={`${open.length} offerte${open.length === 1 ? "" : "s"}, per maand`} />
        <Kpi label="Bekeken door de klant" waarde={String(bekeken.length)} sub={bekeken.length ? `${euro(som(bekeken))} per maand` : "nog geen"} />
        <Kpi label="Getekend, laatste 90 dagen" waarde={euro(som(getekend))} sub={`${getekend.length} offerte${getekend.length === 1 ? "" : "s"}, per maand`} accent />
        <Kpi label="Hitrate, laatste 90 dagen" waarde={conversie === null ? "–" : `${conversie}%`} sub={afgerond.length ? `${getekend.length} van ${afgerond.length} afgeronde offertes` : "nog niets afgerond"} />
      </div>

      <section className="acard overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-6 py-4">
          <nav className="flex flex-wrap gap-1.5" aria-label="Filter">
            {FILTERS.map((f) => {
              const n = tel(f);
              const params = new URLSearchParams({ ...(f.key !== "alle" ? { filter: f.key } : {}), ...(vorm ? { vorm } : {}), ...(q ? { q } : {}) });
              const href = `/admin/offertes${params.size ? `?${params}` : ""}`;
              return (
                <Link
                  key={f.key}
                  href={href}
                  className={`apill !py-1.5 text-[13px] ${f.key === actief.key ? "bg-[#312e82] text-white" : "bg-black/[0.04] text-black/60 hover:bg-black/[0.07]"}`}
                >
                  {f.label}
                  <span className={f.key === actief.key ? "text-white/70" : "text-black/35"}>{n}</span>
                </Link>
              );
            })}
          </nav>
          <form className="flex w-full flex-wrap gap-2 sm:w-auto" action="/admin/offertes">
            {actief.key !== "alle" && <input type="hidden" name="filter" value={actief.key} />}
            <select name="vorm" defaultValue={vorm || ""} className="ainput !w-auto !py-2" aria-label="Soort offerte">
              <option value="">Alle soorten</option>
              {VORM_KEYS.map((v) => <option key={v} value={v}>{VORMEN[v].kort}</option>)}
            </select>
            <input className="ainput !py-2 sm:w-[240px]" name="q" defaultValue={q} placeholder="Zoek op bedrijf of nummer" aria-label="Zoek offertes" />
            <button className="abtn-ghost !py-2 text-[13px]">Toon</button>
          </form>
        </div>
        {rijen.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <LuFilePenLine className="text-[28px] text-black/25" />
            <p className="text-[14px] text-black/45">
              {alle.length === 0 ? "Nog geen offertes. Maak de eerste; met een startpunt staat hij er in een minuut." : "Geen offertes in deze selectie."}
            </p>
            {alle.length === 0 && <Link href="/admin/offertes/nieuw" className="abtn mt-2"><LuPlus /> Nieuwe offerte</Link>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[14px]">
              <thead className="text-[12px] uppercase tracking-[0.06em] text-black/40">
                <tr className="border-b border-black/[0.06]">
                  <th className="px-6 py-3 font-semibold">Klant</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 text-right font-semibold">Per maand</th>
                  <th className="px-3 py-3 font-semibold">Laatste activiteit</th>
                  <th className="px-3 py-3 font-semibold">Geldig tot</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {rijen.map(({ o, w, waarde }) => {
                  const s = WEERGAVE[w];
                  const laatste =
                    w === "getekend" ? `Getekend ${relatief(o.getekend_at)}`
                    : w === "afgewezen" ? `Niet akkoord ${relatief(o.afgewezen_at)}`
                    : o.laatst_bekeken_at ? `Bekeken ${relatief(o.laatst_bekeken_at)}`
                    : o.verstuurd_at ? `Verstuurd ${relatief(o.verstuurd_at)}`
                    : `Aangemaakt ${relatief(o.created_at)}`;
                  return (
                    <tr key={o.id} className="group">
                      <td className="px-6 py-3.5">
                        <Link href={`/admin/offertes/${o.id}`} className="font-semibold text-[#1c1a4e] hover:underline">{o.bedrijf}</Link>
                        <span className="block text-[12.5px] text-black/45">
                          <span className="mr-1.5 inline-flex items-center gap-1 font-semibold text-black/55">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: VORMEN[o.vorm].kleur }} aria-hidden="true" />
                            {VORMEN[o.vorm].kort}
                          </span>
                          {o.nummer}{o.betreft ? ` · ${o.betreft}` : o.contactpersoon ? ` · ${o.contactpersoon}` : ""}{o.medewerkers ? ` · ${o.medewerkers} mw.` : ""}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="apill !text-[12px]" style={{ background: s.achter, color: s.kleur }}>{s.label}</span>
                        {o.aantal_bekeken > 0 && w !== "concept" && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[12px] text-black/40" title="Aantal keer bekeken door de klant">
                            <LuEye className="text-[12px]" /> {o.aantal_bekeken}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[#1c1a4e]">
                        {waarde.perMaand ? euro(waarde.perMaand) : "–"}
                        {waarde.eenmalig > 0 && <span className="block text-[12px] font-normal text-black/45">+ {euro(waarde.eenmalig)} eenmalig</span>}
                      </td>
                      <td className="px-3 py-3.5 text-black/60">{laatste}</td>
                      <td className={`px-3 py-3.5 ${w === "verlopen" ? "text-[#b25e09]" : "text-black/60"}`}>
                        {o.geldig_tot ? new Date(`${o.geldig_tot}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" }) : "–"}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link href={`/admin/offertes/${o.id}`} aria-label={`Offerte voor ${o.bedrijf} openen`} className="inline-flex text-black/35 hover:text-[#312e82]">
                          <LuChevronRight className="text-[18px]" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="text-[13px] text-black/45">
        Waarde per maand exclusief btw (het jaarbedrag gedeeld door twaalf): bij een getekende offerte wat er getekend is, anders de keuze die de klant aanklikte of de standaardkeuze.
      </p>
    </div>
  );
}

function Kpi({ label, waarde, sub, accent }: { label: string; waarde: string; sub: string; accent?: boolean }) {
  return (
    <div className={`acard p-5 ${accent ? "!border-[#0a7a4b]/20 bg-[#f3fbf7]" : ""}`}>
      <p className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-black/45">{label}</p>
      <p className={`mt-1.5 font-heading text-[28px] font-bold tabular-nums ${accent ? "text-[#0a7a4b]" : "text-[#1c1a4e]"}`}>{waarde}</p>
      <p className="text-[13px] text-black/45">{sub}</p>
    </div>
  );
}

function SetupNeeded() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Offertes</h1>
        <p className="text-[14.5px] text-black/50">Offertes samenstellen, versturen en online laten ondertekenen.</p>
      </div>
      <div className="acard flex items-start gap-4 p-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef0ff] text-[18px] text-[#312e82]">
          <LuDatabase />
        </span>
        <div>
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Nog één stap: de database bijwerken</h2>
          <p className="mt-1 text-[14px] text-black/55">
            Offertes hebben twee nieuwe tabellen en vier functies nodig. Voer{" "}
            <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[13px]">supabase/migrations/0024_offertes.sql</code>{" "}
            uit in Supabase. Tot die tijd werkt de rest van de site gewoon.
          </p>
        </div>
      </div>
    </div>
  );
}
