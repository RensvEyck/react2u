import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { CONTRACT_WEERGAVE, contractWeergave, looptijdNu, type Contract } from "@/lib/contracten";
import { datumLang, datumOver, momentLang } from "@/lib/offertes";
import { LuChevronRight, LuDatabase, LuEye, LuScrollText, LuPlus } from "react-icons/lu";

/**
 * Alle basiscontracten (migratie 0031): wat er verstuurd en getekend is, en
 * van elk getekend contract tot wanneer het loopt en tot wanneer het nog kan
 * worden opgezegd (artikel 1.1: telkens 12 maanden verlengd, 3 maanden
 * opzegtermijn).
 */
export default async function Contracten() {
  const { sb } = await requirePerm("bellijst");
  const { data, error } = await sb.from("contracten").select("*").order("created_at", { ascending: false }).limit(300);
  const tabel = !error || (error.code !== "PGRST205" && error.code !== "42P01");
  const vandaag = datumOver(0);
  const alle = ((data as Contract[] | null) || []).map((c) => ({ c, w: contractWeergave(c) }));
  const getekend = alle.filter(({ c }) => c.status === "getekend");
  const open = alle.filter(({ c }) => c.status === "verstuurd");
  // Binnen drie maanden de laatste dag om op te zeggen: tijd voor een gesprek over de verlenging.
  const binnenkort = getekend.filter(({ c }) => {
    const n = looptijdNu(c.ingangsdatum, c.einddatum, vandaag);
    return n.opzeggenUiterlijk >= vandaag && n.opzeggenUiterlijk <= datumOver(92);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Contracten</h1>
          <p className="text-[14.5px] text-black/50">
            Het Basiscontract Arbodienstverlening: stuur de klant een link, hij leest het, vult zijn gegevens in en tekent online.
          </p>
        </div>
        <Link href="/admin/contracten/nieuw" className="abtn"><LuPlus /> Nieuw contract</Link>
      </div>

      {!tabel && (
        <div className="acard flex items-start gap-4 p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef0ff] text-[18px] text-[#312e82]"><LuDatabase /></span>
          <p className="text-[14px] text-black/55">
            Contracten staan nog niet aan: voer{" "}
            <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[13px]">supabase/migrations/0031_contracten.sql</code> eerst uit in Supabase.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Getekend" waarde={String(getekend.length)} sub={`${alle.length} contracten in totaal`} accent />
        <Kpi label="Wacht op ondertekening" waarde={String(open.length)} sub={`${alle.filter(({ w }) => w === "bekeken").length} al bekeken door de klant`} />
        <Kpi label="Opzegtermijn loopt af" waarde={String(binnenkort.length)} sub="binnen 3 maanden de laatste dag om op te zeggen" />
      </div>

      <section className="acard overflow-hidden">
        {alle.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef0ff] text-[22px] text-[#312e82]"><LuScrollText /></span>
            <p className="text-[15px] font-semibold text-[#1c1a4e]">Nog geen contracten</p>
            <p className="max-w-[440px] text-[13.5px] text-black/50">
              Maak er een voor een klant, of open een getekende offerte en kies daar Basiscontract: dan staat alles al klaar.
            </p>
            <Link href="/admin/contracten/nieuw" className="abtn mt-2"><LuPlus /> Nieuw contract</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[14px]">
              <thead>
                <tr className="border-b border-black/[0.06] text-left text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">
                  <th className="px-6 py-3">Klant</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Looptijd</th>
                  <th className="px-4 py-3">Laatste activiteit</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {alle.map(({ c, w }) => {
                  const s = CONTRACT_WEERGAVE[w];
                  const n = looptijdNu(c.ingangsdatum, c.einddatum, vandaag);
                  const krap = c.status === "getekend" && n.opzeggenUiterlijk >= vandaag && n.opzeggenUiterlijk <= datumOver(92);
                  const activiteit = c.getekend_at
                    ? `Getekend ${momentLang(c.getekend_at)}`
                    : c.laatst_bekeken_at
                      ? `Bekeken ${momentLang(c.laatst_bekeken_at)}`
                      : c.verstuurd_at
                        ? `Verstuurd ${momentLang(c.verstuurd_at)}`
                        : `Aangemaakt ${momentLang(c.created_at)}`;
                  return (
                    <tr key={c.id} className="border-b border-black/[0.05] last:border-b-0 hover:bg-black/[0.015]">
                      <td className="px-6 py-3.5">
                        <Link href={`/admin/contracten/${c.id}`} className="font-semibold text-[#1c1a4e] hover:text-[#312e82]">{c.bedrijf}</Link>
                        <p className="mt-0.5 text-[12.5px] text-black/45">
                          {c.nummer}{c.offerte_kenmerk ? ` · ${c.offerte_kenmerk}` : ""}{c.afzender_naam ? ` · door ${c.afzender_naam}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-2">
                          <span className="apill" style={{ background: s.achter, color: s.kleur }}>{s.label}</span>
                          {c.aantal_bekeken > 0 && c.status !== "getekend" && <span className="inline-flex items-center gap-1 text-[12.5px] text-black/45"><LuEye /> {c.aantal_bekeken}</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-black/60">
                        {c.status === "getekend" ? (
                          <>
                            <span className="block text-[#1c1a4e]">{n.verlengd ? "Verlengd tot" : n.begonnen ? "Loopt tot" : `Start ${datumLang(c.ingangsdatum)}, tot`} {datumLang(n.periodeEinde)}</span>
                            <span className={`block text-[12.5px] ${krap ? "font-semibold text-[#b25e09]" : "text-black/45"}`}>Opzeggen uiterlijk {datumLang(n.opzeggenUiterlijk)}</span>
                          </>
                        ) : (
                          <span>{datumLang(c.ingangsdatum)} tot en met {datumLang(c.einddatum)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-black/60">{activiteit}</td>
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/admin/contracten/${c.id}`} aria-label={`Open het contract voor ${c.bedrijf}`} className="text-black/30 hover:text-[#312e82]"><LuChevronRight /></Link>
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

function Kpi({ label, waarde, sub, accent }: { label: string; waarde: string; sub: string; accent?: boolean }) {
  return (
    <div className="acard p-5">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">{label}</p>
      <p className={`mt-2 font-heading text-[28px] font-bold leading-none ${accent ? "text-[#0a7a4b]" : "text-[#1c1a4e]"}`}>{waarde}</p>
      <p className="mt-2 text-[12.5px] text-black/45">{sub}</p>
    </div>
  );
}
