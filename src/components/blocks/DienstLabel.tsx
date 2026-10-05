import Link from "next/link";
import { outfit } from "./HomeVerhaal";

/* eslint-disable @typescript-eslint/no-explicit-any */
type BlockProps = { d: any; asH1?: boolean };

/*
 * Dienstpagina per label (ontwerp "Dienst: Resist/Recover/…" op het canvas):
 * de specialismekaart in de breedte, "Herken je dit?", wat het label omvat in
 * genummerde groepen, de aanpak, waarom React2u met de keurmerken, en de
 * andere labels. Eén blok, zodat de vijf pagina's gegarandeerd gelijk blijven.
 * Kleur en tint komen uit de data: elk label heeft zijn eigen kleur.
 */

const NAVY = "#322E83";
const BODY = "#5E5C78";
const MUTE = "#77758F";
const LINE = "#E6E5EF";
const SOFT = "#F6F5FB";

const KEURMERKEN = [
  { src: "/beeld/keurmerken/sbca.jpg", alt: "SBCA gecertificeerde arbodienst" },
  { src: "/beeld/keurmerken/iso9001.png", alt: "DNV ISO 9001 certificaat" },
  { src: "/beeld/keurmerken/iso27001.png", alt: "DNV ISO 27001 certificaat" },
  { src: "/beeld/keurmerken/iso27701.png", alt: "DNV ISO 27701 certificaat" },
  { src: "/beeld/keurmerken/oval.png", alt: "Lid van OVAL" },
];

function Pijl() {
  return (
    <svg className="hn-pijl transition-transform duration-300" width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Vink({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

const kop = "hv-kop font-semibold";

export function DienstLabel({ d, asH1 }: BlockProps) {
  const c: string = d.kleur || NAVY;
  const t: string = d.tint || SOFT;
  // Tekst in de labelkleur moet leesbaar blijven: navy blijft navy.
  const tc = c;
  const naam: string = d.naam || "";
  const H = asH1 ? "h1" : "h2";
  const checks: string[] = d.checks || [];
  const groepen: any[] = d.groepen || [];
  const stappen: any[] = d.stappen || [];
  const waarom: any[] = d.waarom || [];
  const ook: any[] = d.ook || [];
  const kolommen = groepen.length > 4 ? "lg:grid-cols-3" : "lg:grid-cols-2";

  return (
    <div className={`hv ${outfit.variable} bg-white`} style={{ color: NAVY }}>
      {/* 1. De specialismekaart, in de breedte */}
      <section aria-label={`React2u ${naam}`} className="px-[6px] pt-4 md:px-10 md:pt-8 xl:mx-auto xl:max-w-[1280px]">
        <div className="relative grid gap-8 overflow-hidden rounded-[28px] px-6 py-10 md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:gap-16 lg:p-16"
          style={{ background: t }}>
          <span aria-hidden className="absolute right-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full md:h-[520px] md:w-[520px]"
            style={{ background: c, opacity: 0.12 }} />
          <div className="relative flex flex-col gap-5 md:gap-[22px]">
            <nav aria-label="Kruimelpad" className="flex flex-wrap items-center gap-2.5 text-[14px] font-semibold" style={{ color: MUTE }}>
              <Link href="/werkgevers" style={{ color: MUTE }}>Werkgevers</Link><span>/</span>
              <Link href="/diensten" style={{ color: MUTE }}>Diensten</Link><span>/</span>
              <span aria-current="page" style={{ color: NAVY }}>{naam}</span>
            </nav>
            <H className={`${kop} m-0 text-[26px] leading-[1.05] tracking-[-0.4px] md:text-[34px]`} style={{ color: NAVY }}>
              React2u<br />
              <span className="mt-1 inline-block text-[56px] tracking-[-1.6px] md:text-[76px] md:tracking-[-2px]">
                <span style={{ color: c }}>{naam}</span>
                <span className="ml-1 align-super text-[22px] md:text-[28px]" style={{ color: NAVY }}>®</span>
              </span>
            </H>
            <p className="m-0 text-[18px] leading-[1.5] md:text-[21px]" style={{ color: NAVY }}>
              <strong className="font-bold">{d.label}</strong><br /><em>{d.tagline}</em>
            </p>
            {d.text && <p className="m-0 max-w-[520px] text-[16px] leading-[1.7] md:text-[17px]" style={{ color: BODY }}>{d.text}</p>}
            <div className="flex flex-wrap gap-2.5 pt-2">
              <Link href="/contact" className="hv-btn hv-btn-roze inline-flex h-[54px] items-center gap-2.5 rounded-full px-6 text-[15px] font-bold">Adviesgesprek <Pijl /></Link>
              <Link href="/diensten" className="hv-btn hv-btn-rand inline-flex h-[54px] items-center gap-2.5 rounded-full px-6 text-[15px] font-bold">Alle diensten <Pijl /></Link>
            </div>
          </div>
          {checks.length > 0 && (
            <div className="relative flex flex-col gap-4 rounded-[24px] p-7 md:p-8" style={{ background: "rgba(255,255,255,0.7)" }}>
              <span className="text-[13px] font-bold uppercase tracking-[1.4px]" style={{ color: MUTE }}>Wat je krijgt</span>
              {checks.map((x, i) => (
                <span key={i} className="flex items-start gap-2.5 text-[16px] leading-[1.45] md:text-[17px]" style={{ color: NAVY }}>
                  <span className="mt-0.5 shrink-0" style={{ color: c }}><Vink /></span>{x}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 2. Introductie en "Herken je dit?" */}
      <section aria-label="Wat we doen" className="px-5 py-20 md:px-10 md:py-[120px] xl:mx-auto xl:max-w-[1200px] xl:px-0">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-6">
          <div className="flex flex-col gap-5 lg:col-span-6 md:gap-[22px]">
            <span className="inline-flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: tc }}>
              <span className="h-2 w-2 rounded-full" style={{ background: c }} />React2u {naam}
            </span>
            <h2 className={`${kop} m-0 text-[34px] leading-[1.08] tracking-[-0.8px] md:text-[46px] md:tracking-[-1.1px]`}>{d.de}</h2>
            {d.lead && <p className="m-0 text-[19px] font-bold leading-[1.5] md:text-[20px]">{d.lead}</p>}
            {(d.intro || []).map((p: string, i: number) => (
              <p key={i} className="m-0 text-[16px] leading-[1.75] md:text-[17px]" style={{ color: BODY }}>{p}</p>
            ))}
          </div>
          {(d.herken || []).length > 0 && (
            <div className="flex flex-col rounded-[28px] p-7 md:p-10 lg:col-span-5 lg:col-start-8" style={{ background: SOFT }}>
              <h3 className={`${kop} m-0 mb-[18px] text-[24px] tracking-[-0.4px] md:text-[26px]`}>Herken je dit?</h3>
              {d.herken.map((q: string, i: number) => (
                <div key={i} className="flex items-start gap-3.5 border-t py-4" style={{ borderColor: LINE }}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[15px] font-bold" style={{ background: t, color: tc }} aria-hidden>?</span>
                  <span className="pt-0.5 text-[16px] leading-[1.5] md:text-[17px]">{q}</span>
                </div>
              ))}
              <p className="m-0 border-t pt-5 text-[17px] font-bold" style={{ borderColor: LINE, color: tc }}>Dan is React2u {naam} er voor jou.</p>
            </div>
          )}
        </div>
      </section>

      {/* 3. Wat het label omvat */}
      {groepen.length > 0 && (
        <section aria-label="Wat het omvat" className="flex flex-col gap-10 px-5 pb-20 md:gap-12 md:px-10 md:pb-[120px] xl:mx-auto xl:max-w-[1200px] xl:px-0">
          <div className="grid gap-4 lg:grid-cols-12 lg:items-end lg:gap-6">
            <h2 className={`${kop} m-0 text-[34px] leading-[1.1] tracking-[-0.8px] md:text-[44px] md:tracking-[-1px] lg:col-span-7`}>Wat React2u {naam} omvat</h2>
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px] lg:col-span-4 lg:col-start-9" style={{ color: BODY }}>
              We zetten één onderdeel in of combineren ze tot een aanpak die past bij jouw organisatie.
            </p>
          </div>
          <div className={`grid gap-4 md:grid-cols-2 md:gap-6 ${kolommen}`}>
            {groepen.map((g, i) => (
              <div key={i} className="flex flex-col gap-3.5 rounded-[28px] border bg-white p-7 md:p-9"
                style={{ borderColor: LINE, boxShadow: "0 1px 2px rgba(46,42,126,0.04), 0 24px 48px -36px rgba(46,42,126,0.35)" }}>
                <span className="grid h-[52px] w-[52px] place-items-center rounded-full text-[17px] font-bold" style={{ background: t, color: tc }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className={`${kop} m-0 mt-1.5 text-[22px] leading-[1.2] tracking-[-0.4px] md:text-[24px]`}>{g.titel}</h3>
                {g.tekst && <p className="m-0 text-[16px] leading-[1.6]" style={{ color: BODY }}>{g.tekst}</p>}
                <div className="mt-1 flex flex-col gap-3 border-t pt-[18px]" style={{ borderColor: LINE }}>
                  {(g.items || []).map((it: string, k: number) => (
                    <span key={k} className="flex items-start gap-2.5 text-[16px] leading-[1.45]">
                      <span className="mt-0.5 shrink-0" style={{ color: c }}><Vink size={16} /></span>{it}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Onze aanpak */}
      {stappen.length > 0 && (
        <section aria-label="Onze aanpak" className="relative overflow-hidden px-5 py-20 md:px-10 md:py-[104px]" style={{ background: NAVY }}>
          <span aria-hidden className="absolute right-[-180px] top-[-220px] h-[540px] w-[540px] rounded-full" style={{ background: "#3B378F" }} />
          <div className="relative flex flex-col gap-10 md:gap-[52px] xl:mx-auto xl:max-w-[1200px]">
            <h2 className={`${kop} m-0 text-[34px] leading-[1.1] tracking-[-0.8px] md:text-[44px]`} style={{ color: "#ffffff" }}>Onze aanpak</h2>
            <ol className="m-0 grid list-none gap-8 p-0 md:grid-cols-2 lg:grid-cols-4">
              {stappen.map((s, i) => (
                <li key={i} className="flex flex-col gap-3.5">
                  <span className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[19px] font-semibold"
                      style={{ background: c === NAVY ? "#ffffff" : c, color: c === NAVY ? NAVY : "#ffffff" }}>{i + 1}</span>
                    {i < stappen.length - 1 && <span aria-hidden className="hidden h-px grow lg:block" style={{ background: "rgba(255,255,255,0.18)" }} />}
                  </span>
                  <h3 className={`${kop} m-0 text-[21px]`} style={{ color: "#ffffff" }}>{s.titel}</h3>
                  <p className="m-0 text-[15.5px] leading-[1.6]" style={{ color: "#D6D2F7" }}>{s.tekst}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* 5. Waarom React2u, met de keurmerken */}
      {waarom.length > 0 && (
        <section aria-label={`Waarom React2u ${naam}`} className="px-[6px] pt-20 md:px-10 md:pt-[120px] xl:mx-auto xl:max-w-[1280px]">
          <div className="relative flex flex-col gap-10 overflow-hidden rounded-[28px] px-6 py-12 md:gap-[52px] md:rounded-[36px] md:p-[72px]" style={{ background: t }}>
            <span aria-hidden className="absolute bottom-[-200px] left-[-140px] h-[460px] w-[460px] rounded-full" style={{ background: c, opacity: 0.1 }} />
            <h2 className={`${kop} relative m-0 text-[34px] leading-[1.1] tracking-[-0.8px] md:text-[44px]`}>Waarom React2u {naam}</h2>
            <div className="relative grid gap-8 md:grid-cols-3 md:gap-10">
              {waarom.map((w, i) => (
                <div key={i} className="flex flex-col gap-3 border-t-2 pt-6" style={{ borderColor: c }}>
                  <h3 className={`${kop} m-0 text-[21px] tracking-[-0.3px] md:text-[22px]`}>{w.titel}</h3>
                  <p className="m-0 text-[16px] leading-[1.65]" style={{ color: BODY }}>{w.tekst}</p>
                </div>
              ))}
            </div>
            <div className="relative flex flex-col gap-5 border-t pt-9 md:flex-row md:items-center md:justify-between" style={{ borderColor: "rgba(50,46,131,0.12)" }}>
              <span className="text-[16px] font-bold">Gecertificeerd en aangesloten</span>
              <div className="flex flex-wrap gap-3">
                {KEURMERKEN.map((k) => (
                  <span key={k.src} className="grid h-[72px] w-[72px] place-items-center rounded-[18px] bg-white md:h-[84px] md:w-[84px]">
                    <img src={k.src} alt={k.alt} loading="lazy" className="block max-h-[56px] max-w-[56px] md:max-h-[64px] md:max-w-[64px]" />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. De andere labels */}
      {ook.length > 0 && (
        <section aria-label="Andere diensten" className="flex flex-col gap-8 px-5 pt-20 md:px-10 md:pt-[104px] xl:mx-auto xl:max-w-[1200px] xl:px-0">
          <h2 className={`${kop} m-0 text-[28px] leading-[1.15] tracking-[-0.6px] md:text-[34px]`}>Bekijk ook</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ook.map((o, i) => (
              <Link key={i} href={o.href} className="flex flex-col gap-2.5 rounded-[20px] px-6 py-[26px] transition-transform duration-300 hover:-translate-y-1"
                style={{ background: SOFT, color: NAVY }}>
                <span className="flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full" style={{ background: o.kleur }} />
                  <span className="text-[14px] font-bold" style={{ color: MUTE }}>{o.wat}</span>
                </span>
                <span className={`${kop} text-[24px]`}>React2u {o.naam}</span>
                <span className="flex items-center gap-2 text-[15px] font-bold">Bekijk <Pijl /></span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
