import { outfit } from "./HomeVerhaal";
import {
  NAVY, PINK, BODY, LINE, SOFT, LAV, kop, BREED,
  Eyebrow, Kruimels, Keurmerken, KlantenStrook, KlantenAanHetWoord,
} from "./Gedeeld";

/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */

/*
 * Over React2u (ontwerp "Over React2u" op het canvas): het motto als kop,
 * het verhaal met de stappen ernaast, een brede foto van kantoor, missie en
 * visie op indigo, de kernwaarden, daarna keurmerken en klanten.
 * Eén blok zodat de volgorde vastligt; alle tekst komt uit `data`.
 */

export function OverReact2u({ d, asH1 }: { d: any; asH1?: boolean }) {
  const H = asH1 ? "h1" : "h2";
  const stappen: any[] = d.stappen || [];
  const waarden: any[] = d.waarden || [];
  const verhaal: string[] = d.verhaal || [];
  return (
    <div className={`hv ${outfit.variable} bg-white`} style={{ color: NAVY }}>
      {/* 1. Het motto */}
      <section aria-label="Over React2u" className="px-[6px] pt-4 md:px-10 md:pt-8 lg:px-[120px] xl:mx-auto xl:max-w-[1440px]">
        <div className="relative grid gap-10 overflow-hidden rounded-[28px] px-6 py-12 md:rounded-[36px] md:px-14 md:py-16 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end lg:gap-16 lg:px-20 lg:pb-20 lg:pt-[88px]"
          style={{ background: LAV }}>
          <span aria-hidden className="absolute right-[-160px] top-[-200px] h-[640px] w-[640px] rounded-full" style={{ background: NAVY, opacity: 0.07 }} />
          <span aria-hidden className="absolute bottom-[-220px] right-[260px] h-[360px] w-[360px] rounded-full" style={{ background: PINK, opacity: 0.08 }} />
          <div className="relative flex flex-col gap-7">
            <Kruimels items={[{ label: "Home", href: "/" }, { label: "Over React2u" }]} />
            <H className={`${kop} m-0 text-[72px] leading-[0.92] tracking-[-2.4px] md:text-[104px] lg:text-[128px] lg:tracking-[-4.6px]`}>
              {(d.motto || "Aandacht\nraakt.").split("\n").map((r: string, i: number) => <span key={i} className="block">{r}</span>)}
            </H>
            {d.intro && <p className="m-0 max-w-[560px] text-[18px] leading-[1.65] md:text-[20px]" style={{ color: BODY }}>{d.intro}</p>}
          </div>
          {d.citaat && (
            <div className="relative flex flex-col gap-3.5 rounded-[24px] bg-white p-7">
              <span className={`${kop} text-[19px] leading-[1.4] md:text-[21px]`} style={{ fontWeight: 500 }}>“{d.citaat}”</span>
              <span className="border-t pt-3.5 text-[14px] font-bold" style={{ borderColor: LINE }}>{d.citaatLabel || "Waarom we doen wat we doen"}</span>
            </div>
          )}
        </div>
      </section>

      {/* 2. Het verhaal, met de stappen ernaast */}
      <section aria-label="Ons verhaal" className="bg-white">
        <div className={`${BREED} grid gap-12 py-20 md:py-[120px] lg:grid-cols-12 lg:items-start lg:gap-6 lg:pb-[112px]`}>
          <div className="flex flex-col gap-[22px] lg:col-span-6">
            <Eyebrow>{d.verhaalEyebrow || "Ons verhaal"}</Eyebrow>
            <h2 className={`${kop} m-0 text-[36px] leading-[1.1] tracking-[-0.9px] md:text-[48px]`}>{d.verhaalKop || "Hoe React2u begon"}</h2>
            {verhaal.map((p, i) => (
              <p key={i} className="m-0 text-[17px] leading-[1.75] md:text-[18px]" style={{ color: BODY }}>{p}</p>
            ))}
            {d.uitspraak && (
              <p className={`${kop} m-0 border-l-[3px] pl-6 text-[21px] leading-[1.45] md:text-[24px]`} style={{ borderColor: PINK, fontWeight: 500 }}>{d.uitspraak}</p>
            )}
            {d.slot && <p className="m-0 text-[17px] leading-[1.75] md:text-[18px]" style={{ color: BODY }}>{d.slot}</p>}
          </div>
          {stappen.length > 0 && (
            <ol className="m-0 list-none rounded-[28px] px-8 py-10 md:px-10 md:py-11 lg:col-span-5 lg:col-start-8" style={{ background: SOFT }}>
              {stappen.map((s, i) => {
                const laatste = i === stappen.length - 1;
                return (
                  <li key={i} className={`relative ml-[7px] flex flex-col gap-1.5 border-l-2 pl-8 ${laatste ? "" : "pb-8"}`}
                    style={{ borderColor: laatste ? "transparent" : LINE }}>
                    <span aria-hidden className="absolute left-[-9px] top-[1px] box-border h-4 w-4 rounded-full border-2"
                      style={{ borderColor: PINK, background: laatste ? PINK : "#ffffff" }} />
                    <span className="text-[13px] font-bold uppercase leading-[18px] tracking-[1.2px]" style={{ color: PINK }}>{s.label}</span>
                    <span className={`${kop} text-[20px] leading-[1.3]`}>{s.titel}</span>
                    <span className="text-[15.5px] leading-[1.6]" style={{ color: BODY }}>{s.tekst}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      {/* 3. Kantoor */}
      {d.foto && (
        <section aria-label="Ons kantoor" className="bg-white">
          <div className={`${BREED} pb-20 md:pb-[112px]`}>
            <div className="relative h-[340px] overflow-hidden rounded-[24px] md:h-[600px] md:rounded-[32px]" style={{ background: LAV }}>
              <img src={d.foto} alt={d.fotoAlt || ""} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: d.fotoFocus || "50% 55%" }} loading="lazy" />
              {d.fotoLabel && (
                <span className="absolute bottom-5 left-5 inline-flex h-11 items-center gap-2.5 rounded-full bg-white px-[18px] text-[15px] font-bold md:bottom-8 md:left-8">
                  <span className="h-2 w-2 rounded-full" style={{ background: PINK }} />{d.fotoLabel}
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 4. Missie en visie */}
      <section aria-label="Missie en visie" className="bg-white">
        <div className={`${BREED} pb-20 md:pb-[112px]`}>
          <div className="relative flex flex-col gap-10 overflow-hidden rounded-[28px] p-7 md:rounded-[36px] md:p-[72px]" style={{ background: NAVY }}>
            <span aria-hidden className="absolute bottom-[-240px] left-[-180px] h-[560px] w-[560px] rounded-full" style={{ background: "#B4ADF2", opacity: 0.12 }} />
            <h2 className={`${kop} relative m-0 text-[36px] leading-[1.08] tracking-[-1.2px] md:text-[48px]`} style={{ color: "#ffffff" }}>{d.mvKop || "Waar we voor staan"}</h2>
            <div className="relative grid gap-5 md:grid-cols-2 md:gap-6">
              {[d.missie, d.visie].filter(Boolean).map((m: any, i: number) => (
                <div key={i} className="flex flex-col gap-[18px] rounded-[28px] border p-7 md:p-12" style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" }}>
                  <span className="text-[15px] font-bold" style={{ color: "#F7A8CB" }}>{m.label}</span>
                  <span className={`${kop} text-[28px] leading-[1.18] tracking-[-0.6px] text-white md:text-[34px]`}>{m.titel}</span>
                  <span className="text-[16px] leading-[1.7] md:text-[16.5px]" style={{ color: "rgba(255,255,255,0.72)" }}>{m.tekst}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Kernwaarden */}
      {waarden.length > 0 && (
        <section aria-label="Kernwaarden" className="bg-white">
          <div className={`${BREED} flex flex-col gap-12 pb-20 md:pb-[120px]`}>
            <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-6">
              <div className="flex flex-col gap-[18px] lg:col-span-6">
                <Eyebrow>Kernwaarden</Eyebrow>
                <h2 className={`${kop} m-0 text-[34px] leading-[1.1] tracking-[-0.9px] md:text-[44px]`}>{d.waardenKop || "Gezond, menselijk en duidelijk"}</h2>
              </div>
              {d.waardenTekst && <p className="m-0 text-[17px] leading-[1.7] lg:col-span-5 lg:col-start-8" style={{ color: BODY }}>{d.waardenTekst}</p>}
            </div>
            <div className="grid gap-10 md:grid-cols-3">
              {waarden.map((w, i) => (
                <div key={i} className="flex flex-col gap-[18px] border-t-[3px] pt-7" style={{ borderColor: w.kleur || PINK }}>
                  <span className={`${kop} text-[44px] leading-none tracking-[-1.6px] md:text-[52px]`}>{w.titel}</span>
                  <span className="text-[16.5px] leading-[1.7] md:text-[17px]" style={{ color: BODY }}>{w.tekst}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. Kwaliteit en klanten */}
      <Keurmerken />
      <div className="border-t" style={{ borderColor: LINE }} />
      <KlantenStrook />
      <KlantenAanHetWoord />
    </div>
  );
}
