import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { verwijderSjabloon } from "@/app/admin/offerteActions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import OfferteTekst from "@/components/offerte/OfferteTekst";
import { laadSjablonen } from "@/lib/offerteBeheer";
import { aantalOnderdelen } from "@/lib/offerteSjablonen";
import { momentLang, prijsLabel, SOORTEN, VORMEN } from "@/lib/offertes";
import { LuArrowLeft, LuPlus, LuRotateCcw, LuTrash2, LuDatabase, LuInfo } from "react-icons/lu";

/**
 * Offertesjablonen (migratie 0025): per vorm het beginpunt van een nieuwe
 * offerte. De standaard staat in de code (lib/offerteSjablonen.ts); wat het
 * team via "Bewaar als sjabloon" aanpaste staat in de database en wint.
 */

const GROEPEN = ["Verzuim", "Preventie", "Re-integratie"] as const;

export default async function OfferteSjablonen() {
  const { sb } = await requirePerm("bellijst");
  const { sjablonen, tabel } = await laadSjablonen(sb);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Link href="/admin/offertes" className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-black/50 hover:text-[#312e82]">
          <LuArrowLeft /> Alle offertes
        </Link>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Offertesjablonen</h1>
        <p className="max-w-[760px] text-[14.5px] text-black/50">
          Elke vorm begint met een sjabloon: titel, aanhef, uitleg, onderdelen, voorwaarden, stappen en geldigheid. Prijzen van de prijslijst
          (aansluitingen, spoor 2, arbeidsdeskundig onderzoek) lopen mee met de tarievenpagina, zolang het sjabloon niet is aangepast.
        </p>
      </div>

      <div className="acard flex items-start gap-3 p-5 text-[14px] text-black/60">
        <LuInfo className="mt-0.5 shrink-0 text-[17px] text-[#312e82]" />
        <p>
          <strong className="text-[#1c1a4e]">Een sjabloon aanpassen:</strong> maak er een offerte mee, pas tekst en onderdelen aan, en kies onderaan de
          offerte <em>Bewaar als sjabloon</em>. Gebruik in de tekst {"{contactpersoon}"}, {"{voornaam}"}, {"{bedrijf}"} en {"{betreft}"}: die vult elke
          offerte zelf in.
        </p>
      </div>

      {!tabel && (
        <div className="acard flex items-start gap-4 p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef0ff] text-[18px] text-[#312e82]"><LuDatabase /></span>
          <p className="text-[14px] text-black/55">
            Aangepaste sjablonen bewaren kan nadat{" "}
            <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[13px]">supabase/migrations/0025_offertevormen.sql</code> in Supabase is
            uitgevoerd. De standaardsjablonen hieronder werken al.
          </p>
        </div>
      )}

      {GROEPEN.map((groep) => {
        const lijst = sjablonen.filter((s) => VORMEN[s.vorm].groep === groep);
        if (!lijst.length) return null;
        return (
          <section key={groep} className="space-y-3">
            <h2 className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-black/45">{groep}</h2>
            {lijst.map((s) => (
              <details key={s.sleutel} className="acard group overflow-hidden">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: VORMEN[s.vorm].kleur }} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[#1c1a4e]">{s.naam}</span>
                      {s.bron.soort === "standaard" ? (
                        <span className="apill bg-black/[0.04] !px-2 !py-0.5 !text-[11px] text-black/50">standaard</span>
                      ) : (
                        <span className="apill bg-[#eef0ff] !px-2 !py-0.5 !text-[11px] text-[#312e82]">
                          {s.bron.heeftStandaard ? "aangepast" : "eigen sjabloon"}
                        </span>
                      )}
                    </span>
                    <span className="block text-[13px] text-black/45">
                      {s.omschrijving}
                      {s.bron.soort === "aangepast" ? ` · bewaard ${momentLang(s.bron.op)}${s.bron.door ? ` door ${s.bron.door}` : ""}` : ""}
                    </span>
                  </span>
                  <span className="text-[12.5px] text-black/40">
                    {aantalOnderdelen(s.regels)} · {s.geldigDagen} dagen geldig
                  </span>
                  <Link href={`/admin/offertes/nieuw?sjabloon=${s.sleutel}`} className="abtn !py-1.5 text-[13px]"><LuPlus /> Offerte maken</Link>
                </summary>
                <div className="grid gap-6 border-t border-black/[0.06] px-6 py-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="min-w-0 space-y-4">
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-black/40">Titel en aanhef</p>
                      <p className="mt-1 font-semibold text-[#1c1a4e]">{s.titel}</p>
                      <p className="mt-1 whitespace-pre-line text-[13.5px] text-black/60">{s.intro}</p>
                    </div>
                    {s.inhoud.trim() && (
                      <div className="max-h-[420px] overflow-y-auto rounded-[12px] border border-black/[0.06] bg-[#fbfaf7] p-5">
                        <OfferteTekst tekst={s.inhoud} klein />
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-black/40">Onderdelen</p>
                      <ul className="mt-1.5 divide-y divide-black/[0.05] text-[13px]">
                        {s.regels.map((r) => (
                          <li key={r.id} className="flex justify-between gap-3 py-1.5">
                            <span className="min-w-0 text-[#1c1a4e]">
                              {r.naam}
                              <span className="ml-1.5 text-black/40">{SOORTEN.find((x) => x.key === r.soort)?.label.toLowerCase()}</span>
                            </span>
                            <span className="shrink-0 tabular-nums text-black/60">{prijsLabel(r)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {s.voorwaarden.trim() && (
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-black/40">Voorwaarden</p>
                        <div className="mt-1.5"><OfferteTekst tekst={s.voorwaarden} klein /></div>
                      </div>
                    )}
                    {s.bron.soort === "aangepast" && (
                      <ConfirmButton
                        action={verwijderSjabloon.bind(null, s.sleutel)}
                        message={s.bron.heeftStandaard ? `${s.naam} terugzetten naar de standaardversie? Je aanpassingen verdwijnen.` : `Sjabloon ${s.naam} verwijderen?`}
                        className="abtn-ghost !py-1.5 text-[13px]"
                      >
                        {s.bron.heeftStandaard ? <><LuRotateCcw /> Terug naar standaard</> : <><LuTrash2 /> Verwijderen</>}
                      </ConfirmButton>
                    )}
                  </div>
                </div>
              </details>
            ))}
          </section>
        );
      })}
    </div>
  );
}
