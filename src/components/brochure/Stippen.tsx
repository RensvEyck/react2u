import Beeld from "@/components/site/Beeld";
import ReisSpeler from "@/components/blocks/ReisSpeler";
import { kop, NAVY } from "@/components/blocks/Gedeeld";
import { CONSTELLATIE, mix, spoor, ZACHT } from "@/lib/stippenSpoor";

/*
 * De stippentaal van de homepage (HomeVerhaal.tsx) als bouwstenen voor de
 * brochure: het label met een stip, koppen in de kleuren van het logo, de
 * constellatie van ronde foto's, en de stippenreis, liggend (stations met een
 * spoor ertussen) en staand (de tijdlijnen van 01 en 06). De reis tekent
 * zichzelf zodra hij in beeld komt (ReisSpeler, animaties in globals.css).
 */

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** Label met een stip, zoals op de homepage. */
export function Stiplabel({ children, kleur }: { children: React.ReactNode; kleur: string }) {
  return (
    <span className="inline-flex items-center gap-2 self-start text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: kleur }}>
      <span className="grid h-[18px] w-[18px] place-items-center rounded-full" style={{ background: ZACHT[kleur] || "#EEEDF8" }}>
        <span className="h-[7px] w-[7px] rounded-full" style={{ background: kleur }} />
      </span>
      {children}
    </span>
  );
}

/** Een kop met regels in de kleuren van het logo: "Eén casemanager die je kent." / "Van dag één tot herstel." */
export function Kopregels({ regels, niveau = 2, maat = "clamp(34px, 4.2vw, 54px)" }: { regels: [string, string][]; niveau?: 1 | 2; maat?: string }) {
  const H = niveau === 1 ? "h1" : "h2";
  return (
    <H className={`${kop} m-0 text-balance leading-[1.05] tracking-[-1.2px]`} style={{ fontSize: maat }}>
      {regels.map(([tekst, kleur], i) => (
        // Kleur inline: de algemene kopstijl van de site wint anders van de Tailwind-klasse.
        // De spatie vooraan valt weg op het scherm, maar houdt de zin heel voor schermlezers en zoeken.
        <span key={i} className="block" style={{ color: kleur }}>{i > 0 && " "}{tekst}</span>
      ))}
    </H>
  );
}

/** De constellatie van de homepage: drie ronde foto's tussen de gekleurde stippen van het logo. */
export function Constellatie({ fotos, priority = false }: { fotos: { src: string; alt: string; focus?: string }[]; priority?: boolean }) {
  const { breed: CW, hoog: CH } = CONSTELLATIE;
  return (
    <div className="relative ml-auto w-full max-w-[640px]" style={{ aspectRatio: `${CW} / ${CH}` }}>
      {CONSTELLATIE.stippen.map(([x, y, s, c, f], i) => (
        <span key={`k${i}`} aria-hidden className={`hv-f${f} absolute rounded-full`} style={{ left: pct(x, CW), top: pct(y, CH), width: pct(s, CW), aspectRatio: "1", background: c }} />
      ))}
      {fotos.slice(0, 3).map((p, i) => {
        const [x, y, s, f] = CONSTELLATIE.fotos[i];
        return (
          <span key={`f${i}`} className={`hv-f${f} absolute overflow-hidden rounded-full`}
            style={{ left: pct(x, CW), top: pct(y, CH), width: pct(s, CW), aspectRatio: "1", boxShadow: "0 0 0 6px #ffffff, 0 30px 60px -30px rgba(50,46,131,.5)" }}>
            <Beeld src={p.src} alt={p.alt} fill priority={priority} sizes="(min-width: 1024px) 220px, 34vw" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: p.focus || "50% 40%" }} />
          </span>
        );
      })}
    </div>
  );
}

/** Een ronde foto met een witte ring en een paar stippen eromheen. */
export function RondeFoto({ src, alt, ring = "#ffffff", kleur, maat = 220 }: { src: string; alt: string; ring?: string; kleur: string; maat?: number }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: maat, height: maat }}>
      <span className="absolute inset-0 overflow-hidden rounded-full" style={{ boxShadow: `0 0 0 6px ${ring}, 0 30px 60px -30px rgba(50,46,131,.5)` }}>
        <Beeld src={src} alt={alt} fill sizes={`${maat}px`} className="absolute inset-0 h-full w-full object-cover" />
      </span>
      <span aria-hidden className="hv-f1 absolute rounded-full" style={{ right: -maat * 0.06, top: maat * 0.02, width: maat * 0.16, height: maat * 0.16, background: kleur }} />
      <span aria-hidden className="hv-f2 absolute rounded-full" style={{ right: -maat * 0.16, top: maat * 0.2, width: maat * 0.08, height: maat * 0.08, background: kleur, opacity: 0.7 }} />
      <span aria-hidden className="hv-f3 absolute rounded-full" style={{ left: -maat * 0.08, bottom: maat * 0.06, width: maat * 0.11, height: maat * 0.11, background: NAVY }} />
    </span>
  );
}

export type Station = {
  kleur: string;
  /** Wat in de cirkel staat: een nummer, een tijd of een icoon. */
  teken: React.ReactNode;
  label?: string;
  titel: string;
  tekst?: React.ReactNode;
  href?: string;
};

/**
 * De liggende stippenreis van de homepage, voor drie tot acht stations: de
 * stations op een golvende lijn met een spoor van stippen ertussen, de
 * teksten eronder. Op de telefoon dezelfde reis van boven naar beneden.
 */
export function Reis({ stations, klein = false }: { stations: Station[]; klein?: boolean }) {
  const n = stations.length;
  const JW = 1200;
  const JH = klein ? 190 : 250;
  const R = klein ? 42 : 66;
  const SX = stations.map((_, i) => (JW / n) * (i + 0.5));
  const SY = stations.map((_, i) => (i % 2 ? JH * 0.6 : JH * 0.44));
  const sporen = stations.slice(0, -1).flatMap((s, i) =>
    spoor([SX[i], SY[i]], [SX[i + 1], SY[i + 1]], { kleurA: s.kleur, kleurB: stations[i + 1].kleur, rand: R + 14, boog: klein ? 18 : 28, stap: klein ? 16 : 19, grootte: klein ? [6, 3] : [8, 4] }).map((d) => ({ ...d, delay: 0.5 + i * 0.6 + d.t * 0.6 })),
  );
  const tStation = (i: number) => 0.15 + i * 0.18;
  return (
    <ReisSpeler>
      <div className="hidden md:block">
        <div className="relative mx-auto w-full" style={{ aspectRatio: `${JW} / ${JH}`, containerType: "inline-size" }}>
          {sporen.map((p, i) => (
            <span key={i} aria-hidden className="hv-jd absolute rounded-full"
              style={{ left: pct(p.x - p.s / 2, JW), top: pct(p.y - p.s / 2, JH), width: pct(p.s, JW), aspectRatio: "1", background: p.c, animationDelay: `${p.delay.toFixed(2)}s` }} />
          ))}
          {stations.map((s, i) => {
            const cirkel = (
              <span className="absolute inset-0 grid place-items-center rounded-full text-white"
                style={{ background: s.kleur, boxShadow: `0 0 0 ${klein ? 7 : 10}px #ffffff, 0 30px 60px -28px ${s.kleur}` }}>
                <span className={`${kop} leading-none`} style={{ fontSize: klein ? "2.1cqw" : "2.6cqw", fontWeight: 700 }}>{s.teken}</span>
              </span>
            );
            return (
              <span key={i} className="hv-js absolute" style={{ left: pct(SX[i] - R, JW), top: pct(SY[i] - R, JH), width: pct(2 * R, JW), aspectRatio: "1", animationDelay: `${tStation(i).toFixed(2)}s` }}>
                {s.href ? <a href={s.href} aria-label={s.titel} className="absolute inset-0 rounded-full transition-transform hover:scale-105">{cirkel}</a> : cirkel}
              </span>
            );
          })}
        </div>
        <ol className={`m-0 mx-auto grid list-none p-0 ${klein ? "mt-1 gap-4" : "mt-2 gap-10"}`} style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {stations.map((s, i) => (
            <li key={i} className="hv-jc flex flex-col items-center gap-2 px-1 text-center" style={{ animationDelay: `${(tStation(i) + 0.12).toFixed(2)}s` }}>
              {s.label && <span className="text-[13px] font-bold uppercase tracking-[1.3px]" style={{ color: s.kleur }}>{s.label}</span>}
              {s.href ? (
                <a href={s.href} className={`${kop} leading-[1.3] hover:underline ${klein ? "text-[17px]" : "text-[20px] lg:text-[22px]"}`} style={{ color: NAVY }}>{s.titel}</a>
              ) : (
                <span className={`${kop} leading-[1.3] ${klein ? "text-[17px]" : "text-[20px] lg:text-[22px]"}`} style={{ color: NAVY }}>{s.titel}</span>
              )}
              {s.tekst && <span className={`${klein ? "text-[13.5px] leading-[1.5]" : "text-[15px] leading-[1.7] lg:text-[16px]"}`} style={{ color: "#5E5C78" }}>{s.tekst}</span>}
            </li>
          ))}
        </ol>
      </div>

      {/* Smal: dezelfde reis van boven naar beneden */}
      <ol className="m-0 flex list-none flex-col p-0 md:hidden">
        {stations.map((s, i) => {
          const laatste = i === n - 1;
          const inhoud = (
            <span className="hv-js grid h-14 w-14 shrink-0 place-items-center rounded-full text-white" style={{ background: s.kleur, boxShadow: `0 0 0 6px #ffffff, 0 20px 40px -22px ${s.kleur}`, animationDelay: `${tStation(i).toFixed(2)}s` }}>
              <span className={`${kop} text-[17px] leading-none`} style={{ fontWeight: 700 }}>{s.teken}</span>
            </span>
          );
          return (
            <li key={i} className="grid grid-cols-[56px_1fr] gap-x-5">
              <div className="flex flex-col items-center">
                {s.href ? <a href={s.href} aria-label={s.titel}>{inhoud}</a> : inhoud}
                {!laatste && (
                  <span aria-hidden className="flex grow flex-col items-center justify-around gap-2 py-3">
                    {[0, 1, 2, 3].map((k) => <span key={k} className="hv-jd h-2 w-2 rounded-full" style={{ background: mix(s.kleur, stations[i + 1].kleur, k / 3), animationDelay: `${(tStation(i) + 0.3 + k * 0.08).toFixed(2)}s` }} />)}
                  </span>
                )}
              </div>
              <div className={`hv-jc flex flex-col gap-1.5 pt-1.5 ${laatste ? "" : "pb-7"}`} style={{ animationDelay: `${(tStation(i) + 0.12).toFixed(2)}s` }}>
                {s.label && <span className="text-[13px] font-bold uppercase tracking-[1.3px]" style={{ color: s.kleur }}>{s.label}</span>}
                {s.href ? <a href={s.href} className={`${kop} text-[19px] leading-[1.3]`} style={{ color: NAVY }}>{s.titel}</a> : <span className={`${kop} text-[19px] leading-[1.3]`} style={{ color: NAVY }}>{s.titel}</span>}
                {s.tekst && <span className="text-[15px] leading-[1.65]" style={{ color: "#5E5C78" }}>{s.tekst}</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </ReisSpeler>
  );
}

export type Halte = {
  kleur: string;
  /** In de cirkel: "08:12", "Week 6". */
  wanneer: string;
  inhoud: React.ReactNode;
  /** Opvallen: de eerste melding, het alarm in week 104. */
  nadruk?: boolean;
};

/**
 * De staande stippenreis, met de tekst naast elk station. In kleur (06: met
 * React2u) loopt het spoor van station naar station; grijs (01: zonder regie)
 * zijn de stations leeg en het spoor onderbroken, op de nadruk na.
 */
export function Tijdreis({ haltes, grijs = false }: { haltes: Halte[]; grijs?: boolean }) {
  const tStation = (i: number) => 0.1 + i * 0.12;
  return (
    <ReisSpeler>
      <ol className="m-0 flex list-none flex-col p-0">
        {haltes.map((h, i) => {
          const laatste = i === haltes.length - 1;
          const vol = !grijs || h.nadruk;
          return (
            <li key={i} className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-5 md:grid-cols-[84px_minmax(0,1fr)] md:gap-x-8">
              <div className="flex flex-col items-center">
                <span className="hv-js grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full px-1.5 text-center md:h-[84px] md:w-[84px]"
                  style={{
                    background: vol ? h.kleur : "#ffffff",
                    color: vol ? "#ffffff" : "#9C99BD",
                    border: vol ? "none" : "2px dashed #CFCDE0",
                    boxShadow: vol ? `0 0 0 6px #ffffff, 0 20px 40px -22px ${h.kleur}` : "none",
                    animationDelay: `${tStation(i).toFixed(2)}s`,
                  }}>
                  <span className={`${kop} text-[14px] leading-[1.05] md:text-[15px]`} style={{ fontWeight: 700 }}>{h.wanneer}</span>
                </span>
                {!laatste && (
                  <span aria-hidden className="flex grow flex-col items-center justify-around gap-2 py-3">
                    {[0, 1, 2, 3, 4].map((k) => (
                      grijs && (k === 2 || k === 3) ? <span key={k} className="h-2 w-2" /> : (
                        <span key={k} className="hv-jd h-2 w-2 rounded-full"
                          style={{ background: grijs ? "#CFCDE0" : mix(h.kleur, haltes[i + 1].kleur, k / 4), animationDelay: `${(tStation(i) + 0.2 + k * 0.06).toFixed(2)}s` }} />
                      )
                    ))}
                  </span>
                )}
              </div>
              <div className={`hv-jc min-w-0 pt-4 md:pt-5 ${laatste ? "" : "pb-6 md:pb-8"}`} style={{ animationDelay: `${(tStation(i) + 0.1).toFixed(2)}s` }}>{h.inhoud}</div>
            </li>
          );
        })}
      </ol>
    </ReisSpeler>
  );
}
