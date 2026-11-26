import { BODY, kop, LINE, NAVY, Pijl, SOFT, Vink } from "@/components/blocks/Gedeeld";
import { inkt } from "@/lib/kleur";
import { leesMinuten, WETEN, type WetenOnderwerp } from "@/lib/onboardingWeten";
import { Label, MUTE } from "./OnboardingDelen";

/*
 * Goed om te weten: de tegels per onderwerp op de hub en de inhoud van één
 * onderwerp (uitleg, in het kort, vragen en antwoorden) op zijn eigen pagina
 * (OnboardingWetenPagina.tsx). De onderwerpen zelf staan in
 * lib/onboardingWeten.ts. Dezelfde taal als de stapkaarten: een kaart met een
 * rond pictogram in de kleur van het onderwerp, de titel, één zin en de pijl;
 * de vragen klappen open zoals in de gidsen op de site (Gids.tsx), zonder
 * JavaScript, en een open vraag sluit de vorige.
 */

export function WetenIcoon({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** Eén onderwerp als tegel: op de hub (groot) en onder "Andere onderwerpen" op een onderwerppagina (compact). */
export function WetenTegel({ w, n, basis, tint, i, compact = false }: { w: WetenOnderwerp; n: number; basis: string; tint: boolean; i: number; compact?: boolean }) {
  return (
    <li className="min-w-0" style={{ ["--ri" as string]: i % 3 }} data-reveal>
      <a
        href={`${basis}/weten/${w.slug}`}
        className={`group flex h-full flex-col rounded-[24px] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-32px_rgba(50,46,131,0.45)] ${compact ? "gap-4 p-5" : "gap-5 p-6 md:p-7"}`}
        style={tint ? { background: "#ffffff" } : { background: SOFT, border: `1px solid ${LINE}` }}
      >
        <span className="flex items-start justify-between gap-3">
          <span className={`grid shrink-0 place-items-center rounded-full ${compact ? "h-11 w-11" : "h-12 w-12"}`} style={{ background: w.tint, color: inkt(w.kleur) }}>
            <WetenIcoon d={w.icoon} size={compact ? 20 : 22} />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold tabular-nums" style={{ background: tint ? SOFT : "#ffffff", color: MUTE }}>
            {w.vragen.length} vragen <span aria-hidden>·</span> {leesMinuten(w)} min
          </span>
        </span>
        <span className="flex flex-col gap-1.5">
          <Label kleur={inkt(w.kleur)}>Onderwerp {n}</Label>
          <span className={`${kop} leading-[1.2] tracking-[-0.4px] ${compact ? "text-[19px]" : "text-[22px]"}`} style={{ color: NAVY }}>{w.titel}</span>
          {!compact && <span className="text-[14.5px] leading-[1.6]" style={{ color: MUTE }}>{w.kort}</span>}
        </span>
        <span className="mt-auto inline-flex items-center gap-2 text-[15px] font-bold" style={{ color: NAVY }}>
          Uitleg en vragen <Pijl size={14} />
        </span>
      </a>
    </li>
  );
}

/** Het raster met alle onderwerpen (op de hub), of alle behalve één (onder een onderwerp). */
export function WetenTegels({ basis, tint, behalve, label = "Onderwerpen" }: { basis: string; tint: boolean; behalve?: string; label?: string }) {
  const lijst = WETEN.map((w, i) => ({ w, n: i + 1 })).filter(({ w }) => w.slug !== behalve);
  const compact = Boolean(behalve);
  return (
    <ul className={`m-0 grid list-none gap-4 p-0 md:grid-cols-2 ${compact ? "xl:grid-cols-4" : "xl:grid-cols-3"}`} aria-label={label}>
      {lijst.map(({ w, n }, i) => <WetenTegel key={w.slug} w={w} n={n} basis={basis} tint={tint} i={i} compact={compact} />)}
    </ul>
  );
}

/** De inhoud van één onderwerp: de uitleg, de punten in het kort, en de vragen en antwoorden. */
export function WetenInhoud({ w }: { w: WetenOnderwerp }) {
  const tekst = inkt(w.kleur);
  return (
    <div className="flex flex-col gap-10 md:gap-12">
      <div className="flex flex-col gap-4 text-[16.5px] leading-[1.75] md:text-[18px]" style={{ color: BODY }}>
        {w.uitleg.map((a) => <p key={a} className="m-0">{a}</p>)}
      </div>

      <div className="flex flex-col gap-4 rounded-[22px] p-6 md:p-7" style={{ background: w.tint }} data-reveal>
        <Label kleur={tekst}>In het kort</Label>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {w.kern.map((k) => (
            <li key={k} className="flex items-start gap-3 text-[15.5px] leading-[1.6]" style={{ color: NAVY }}>
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white" style={{ background: w.kleur }}><Vink size={11} /></span>
              <span className="font-semibold">{k}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-5" data-reveal>
        <div className="flex flex-col gap-2.5">
          <Label kleur={tekst}>Vragen en antwoorden</Label>
          <h2 className={`${kop} m-0 text-[26px] leading-[1.15] tracking-[-0.6px] md:text-[30px]`} style={{ color: NAVY }}>Wat werkgevers ons hierover vragen</h2>
        </div>
        <div className="flex flex-col border-t" style={{ borderColor: LINE }}>
          {w.vragen.map((v, i) => (
            <details key={v.vraag} name={`weten-${w.slug}`} className="group border-b" style={{ borderColor: LINE }} open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-[16.5px] font-bold md:text-[17px]" style={{ color: NAVY }}>
                <span>{v.vraag}</span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-white transition-colors group-open:border-[#322E83] group-open:bg-[#322E83] group-open:text-white" style={{ borderColor: LINE }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                    <path d="M5 12h14" /><path d="M12 5v14" className="group-open:hidden" />
                  </svg>
                </span>
              </summary>
              <p className="-mt-1.5 mb-0 max-w-[680px] pb-5 text-[15.5px] leading-[1.7]" style={{ color: BODY }}>{v.antwoord}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
