import Link from "next/link";
import { LuArrowRight, LuCircleCheckBig, LuFlag, LuHandshake, LuRoute } from "react-icons/lu";
import { inwerkStapZetten } from "@/app/admin/inwerkreisActions";
import StapVink from "@/components/admin/inwerk/StapVink";
import { dagPositie, dagTekst, DUUR, SOORTEN, stappenWoord, type ReisStand, type StapStand } from "@/lib/inwerkreis";
import type { ReisVolledig } from "@/lib/inwerkreisDb";

/**
 * De weergave van een inwerkreis: een balk van negentig dagen met waar je
 * staat, en per fase de stappen. Voor de collega zelf ("zelf": taken en
 * oefencasussen afvinken, mijlpalen alleen bekijken) en voor het beheer
 * ("beheer": alles afvinken en aftekenen, met wie het deed).
 */

const DATUM = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "Europe/Amsterdam" });
const datumKort = (iso: string) => DATUM.format(new Date(iso)).replace(".", "");
const STARTDATUM = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
export const startTekst = (datum: string) => STARTDATUM.format(new Date(`${datum}T00:00:00Z`));

export function SoortPil({ soort }: { soort: StapStand["soort"] }) {
  const s = SOORTEN[soort];
  return (
    <span className="apill shrink-0 !px-2.5 !py-0.5 text-[11.5px]" style={{ color: s.kleur, background: s.achter }}>
      {soort === "mijlpaal" && <LuFlag className="text-[11px]" />}
      {s.label}
    </span>
  );
}

/** Negentig dagen in drie vakken, elk gevuld naar hoeveel stappen van die fase gedaan zijn, met een streep op vandaag. */
export function DagenBalk({ stand, klein = false }: { stand: ReisStand; klein?: boolean }) {
  const lopend = stand.begonnen && stand.dag <= DUUR;
  return (
    <div className="space-y-2">
      <div className="relative" style={{ paddingTop: lopend ? 22 : 0 }}>
        {lopend && (
          <div className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[11.5px] font-semibold text-[#312e82]" style={{ left: `clamp(26px, ${dagPositie(stand.dag)}%, calc(100% - 26px))` }} aria-hidden>
            vandaag
          </div>
        )}
        <div className={`flex gap-[3px] ${klein ? "h-2.5" : "h-3.5"}`} role="img" aria-label={`${dagTekst(stand.dag)}. ${stand.fases.map((f) => `${f.label}: ${f.gedaan} van ${f.totaal} gedaan`).join(". ")}.`}>
          {stand.fases.map((f) => (
            <div key={f.fase} className="relative flex-1 overflow-hidden rounded-[4px] bg-[#e9e8f5]">
              <div className="h-full rounded-[4px] bg-[#0a7a4b]" style={{ width: f.totaal ? `${(f.gedaan / f.totaal) * 100}%` : 0 }} />
            </div>
          ))}
        </div>
        {lopend && <div className="pointer-events-none absolute bottom-[-4px] top-[18px] w-[2px] -translate-x-1/2 rounded-full bg-[#e75387]" style={{ left: `${dagPositie(stand.dag)}%` }} aria-hidden />}
      </div>
      {!klein && (
        <div className="flex gap-[3px] text-[12px]" aria-hidden>
          {stand.fases.map((f) => (
            <div key={f.fase} className="min-w-0 flex-1">
              <p className={`truncate font-semibold ${f.nu ? "text-[#1c1a4e]" : "text-black/45"}`}>{f.label}</p>
              <p className="tabular-nums text-black/40">{f.totaal ? `${f.gedaan} van ${f.totaal}` : "nog leeg"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StapInhoud({ s, modus }: { s: StapStand; modus: "zelf" | "beheer" }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <SoortPil soort={s.soort} />
        <span className={`text-[14.5px] font-semibold ${s.gedaan ? "text-black/45 line-through decoration-black/25" : "text-[#1c1a4e]"}`}>{s.titel}</span>
      </div>
      {s.uitleg && <p className="mt-1 whitespace-pre-line text-[13.5px] leading-[1.55] text-black/55">{s.uitleg}</p>}
      {s.gedaan ? (
        <p className="mt-1 text-[12px] text-[#0a7a4b]">
          {s.soort === "mijlpaal" ? "Afgetekend" : "Gedaan"} op {datumKort(s.gedaan.gedaan_at)}{modus === "beheer" ? ` door ${s.gedaan.door}` : ""}
        </p>
      ) : (
        s.soort === "mijlpaal" && modus === "zelf" && <p className="mt-1 text-[12px] text-black/40">Tekent het beheer af als het zover is.</p>
      )}
    </>
  );
}

export default function ReisWeergave({ volledig, stand, modus }: { volledig: ReisVolledig; stand: ReisStand; modus: "zelf" | "beheer" }) {
  const { reis, sjabloon } = volledig;
  const leeg = stand.totaal === 0;

  return (
    <div className="space-y-5">
      <section className="acard p-6" aria-labelledby="reis-kop">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-black/40">{sjabloon?.functie || "Inwerkreis"}</p>
            <h2 id="reis-kop" className="font-heading text-[22px] font-bold leading-tight text-[#312e82]">
              {reis.afgerond_at ? "Afgerond" : dagTekst(stand.dag)}
            </h2>
            <p className="mt-1 text-[13.5px] text-black/50">
              Gestart op {startTekst(reis.startdatum)}
              {reis.afgerond_at ? `, afgerond op ${datumKort(reis.afgerond_at)}` : ""}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {reis.buddy && (
              <span className="flex items-center gap-2 rounded-[12px] bg-[#f6f5fb] px-3.5 py-2 text-[13.5px]" data-buddy>
                <LuHandshake className="text-[16px] text-[#e75387]" />
                <span><span className="text-black/45">{modus === "zelf" ? "Je buddy" : "Buddy"}</span> <span className="font-semibold text-[#1c1a4e]">{reis.buddy}</span></span>
              </span>
            )}
            <span className="flex items-center gap-2 rounded-[12px] bg-[#f6f5fb] px-3.5 py-2 text-[13.5px]">
              <LuCircleCheckBig className="text-[16px] text-[#0a7a4b]" />
              <span className="tabular-nums"><span className="font-semibold text-[#1c1a4e]">{stand.gedaan}</span> <span className="text-black/45">van {stand.totaal} {stappenWoord(stand.totaal)}</span></span>
            </span>
          </div>
        </div>
        <div className="mt-6">
          <DagenBalk stand={stand} />
        </div>
        {!leeg && stand.achter > 0 && !reis.afgerond_at && (
          <p className="mt-4 rounded-[12px] bg-[#fff4e5] px-3.5 py-2.5 text-[13px] text-[#7a4206]">
            {stand.achter === 1 ? "Eén stap" : `${stand.achter} stappen`} uit een eerdere fase {stand.achter === 1 ? "staat" : "staan"} nog open.
          </p>
        )}
      </section>

      {leeg ? (
        <section className="acard flex flex-col items-center gap-2 px-6 py-10 text-center">
          <LuRoute className="text-[26px] text-[#312e82]/50" />
          <p className="max-w-[460px] text-[14px] leading-[1.6] text-black/55">
            {modus === "zelf"
              ? "Je inwerkreis wordt nog gevuld. Zodra er taken, oefencasussen en mijlpalen klaarstaan, zie je ze hier per fase."
              : "Het sjabloon van deze functie is nog leeg. Voeg stappen toe; de collega ziet ze meteen."}
          </p>
          {modus === "beheer" && sjabloon && (
            <Link href={`/admin/inwerken/sjabloon/${sjabloon.id}`} className="abtn-ghost mt-2 !py-2 text-[13.5px]">Sjabloon vullen <LuArrowRight /></Link>
          )}
        </section>
      ) : (
        stand.fases.map((f) => (
          <section key={f.fase} id={`fase-${f.fase}`} className={`acard overflow-hidden ${f.nu ? "ring-1 ring-[#312e82]/20" : ""}`} aria-labelledby={`fase-${f.fase}-kop`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-black/[0.06] px-6 py-4">
              <h3 id={`fase-${f.fase}-kop`} className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]">
                {f.label}
                {f.nu && <span className="apill bg-[#fdecf4] !py-0.5 text-[11.5px] text-[#c2185b]">Nu</span>}
              </h3>
              <p className="text-[12.5px] tabular-nums text-black/40">dag {f.van} tot {f.tot} · {f.gedaan} van {f.totaal} gedaan</p>
            </div>
            {f.stappen.length === 0 ? (
              <p className="px-6 py-5 text-[13.5px] text-black/45">Voor deze fase staan nog geen stappen klaar.</p>
            ) : (
              <ul className="divide-y divide-black/[0.05]">
                {f.stappen.map((s) => {
                  const magVinken = modus === "beheer" || SOORTEN[s.soort].zelf;
                  return (
                    <li key={s.id} className="px-6 py-4" data-stap={s.soort}>
                      {magVinken ? (
                        <StapVink
                          gedaan={Boolean(s.gedaan)}
                          zet={inwerkStapZetten.bind(null, reis.id, s.id)}
                          label={`${SOORTEN[s.soort].label}: ${s.titel}`}
                        >
                          <StapInhoud s={s} modus={modus} />
                        </StapVink>
                      ) : (
                        <div className="flex items-start gap-3.5">
                          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] ${s.gedaan ? "bg-[#0a7a4b] text-white" : "bg-[#fff4e5] text-[#b86e00]"}`} aria-hidden>
                            {s.gedaan ? <LuCircleCheckBig className="text-[14px]" /> : <LuFlag className="text-[13px]" />}
                          </span>
                          <div className="min-w-0 flex-1"><StapInhoud s={s} modus={modus} /></div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))
      )}
    </div>
  );
}

/** Op het dashboard: waar je staat en wat er nu aan de beurt is. */
export function InwerkreisKaart({ volledig, stand }: { volledig: ReisVolledig; stand: ReisStand }) {
  return (
    <section className="acard p-6" id="mijn-inwerkreis" aria-labelledby="mijn-inwerkreis-kop">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id="mijn-inwerkreis-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]">
            <LuRoute className="text-[16px] text-black/35" /> Mijn inwerkreis
          </h2>
          <p className="mt-0.5 text-[12.5px] text-black/45">
            {volledig.sjabloon?.functie ? `${volledig.sjabloon.functie} · ` : ""}{dagTekst(stand.dag)} · {stand.gedaan} van {stand.totaal} {stappenWoord(stand.totaal)} gedaan
            {volledig.reis.buddy ? ` · buddy ${volledig.reis.buddy}` : ""}
          </p>
        </div>
        <Link href="/admin/inwerkreis" className="flex items-center gap-1 pt-0.5 text-[13px] font-semibold text-[#e75387] hover:underline">
          Naar je inwerkreis <LuArrowRight className="text-[13px]" />
        </Link>
      </div>
      <DagenBalk stand={stand} klein />
      {stand.volgende.length > 0 ? (
        <div className="mt-5">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-black/40">Aan de beurt</p>
          <ul className="space-y-2">
            {stand.volgende.map((s) => (
              <li key={s.id} className="flex items-center gap-2.5 text-[14px] text-[#1c1a4e]">
                <SoortPil soort={s.soort} />
                <span className="min-w-0 truncate">{s.titel}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-[13.5px] text-black/45">
          {stand.totaal === 0 ? "Je inwerkreis wordt nog gevuld." : "Alles van deze fase is gedaan. Mooi werk."}
        </p>
      )}
    </section>
  );
}
