import Link from "next/link";
import type { Vacancy } from "@/lib/types";
import { MiniMarkdown } from "@/lib/md";
import { OPEN_SOLLICITATIE, pad, telefoonInTaal, vul, type Taal } from "@/lib/taal";
import { woordenboek } from "@/lib/woordenboek";
import { kenmerkInTaal, vacatureInTaal } from "@/lib/vacatures";
import { outfit } from "./HomeVerhaal";
import Solliciteren from "./Solliciteren";
import {
  NAVY, PINK, TEAL, BODY, MUTE, LINE, SOFT, LAV, kop, BREED,
  Eyebrow, Kruimels, KopBlok, Knop, Pijl, Vink, KlantenStrook,
} from "./Gedeeld";

/* eslint-disable @next/next/no-img-element */

/*
 * Werken bij React2u, de vacaturepagina en de open sollicitatie (canvas:
 * "Werken bij" en "Vacature", versie B). De vacatures zelf komen uit de admin
 * (tabel `vacancies`): titel, intro, locatie, uren, salaris en de tekst.
 * Wat de admin leeg laat, verschijnt niet; er staan dus nooit lege vakjes.
 *
 * Alle vaste teksten komen uit het woordenboek (lib/woordenboek), zodat deze
 * pagina's ook onder /en/jobs staan. Een vacature zonder Engelse velden toont
 * daar de Nederlandse tekst met een melding bovenaan.
 */

const SUSANNE = { naam: "Susanne Linders", tel: "06 12479720", telHref: "tel:+31612479720", mail: "susanne@react2u.nl" };

function Chip({ children, tint = SOFT }: { children: React.ReactNode; tint?: string }) {
  return <span className="inline-flex items-center rounded-full px-3 py-[7px] text-[13.5px] font-bold" style={{ background: tint, color: NAVY }}>{children}</span>;
}

function Susanne({ licht, taal }: { licht?: boolean; taal: Taal }) {
  const t = woordenboek(taal);
  const kleur = licht ? "#ffffff" : NAVY;
  return (
    <div className="flex flex-col gap-4 rounded-[20px] p-5" style={{ background: licht ? "rgba(255,255,255,0.08)" : SOFT, border: licht ? "1px solid rgba(255,255,255,0.14)" : "none" }}>
      <div className="flex items-center gap-3.5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[16px] font-bold" style={{ background: licht ? "#ffffff" : LAV, color: NAVY }}>SL</span>
        <span className="flex flex-col">
          <span className="text-[12.5px]" style={{ color: licht ? "rgba(255,255,255,0.65)" : MUTE }}>{t.vacatures.aanspreekpunt}</span>
          <span className="text-[16px] font-bold" style={{ color: kleur }}>{SUSANNE.naam}</span>
          <span className="text-[13.5px]" style={{ color: licht ? "rgba(255,255,255,0.7)" : BODY }}>{t.vacatures.susanneRol} · {telefoonInTaal(SUSANNE.tel, taal)}</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <a href={SUSANNE.telHref} className="inline-flex h-11 items-center justify-center rounded-full bg-white text-[14.5px] font-bold" style={{ color: NAVY }}>{t.algemeen.bellen}</a>
        <a href={`mailto:${SUSANNE.mail}`} className="inline-flex h-11 items-center justify-center rounded-full border text-[14.5px] font-bold"
          style={{ color: kleur, borderColor: licht ? "rgba(255,255,255,0.4)" : "#D9D8E6" }}>{t.algemeen.mailen}</a>
      </div>
    </div>
  );
}

function Micro({ items, licht }: { items: string[]; licht?: boolean }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {items.map((t) => (
        <span key={t} className="inline-flex items-center gap-2 text-[14px]" style={{ color: licht ? "rgba(255,255,255,0.85)" : MUTE }}>
          <span style={{ color: licht ? "#F7A8CB" : TEAL }}><Vink /></span>{t}
        </span>
      ))}
    </div>
  );
}

function kenmerken(v: Vacancy, taal: Taal) {
  return [v.location, kenmerkInTaal(v.hours, taal)].filter(Boolean).join(" · ");
}

/** De adressen van Werken bij, de vacatures en de open sollicitatie in een taal. */
function paden(taal: Taal) {
  const basis = pad(taal, "vacatures");
  return {
    basis,
    vacatures: `${basis}#vacatures`,
    solliciteren: `${basis}#solliciteren`,
    vacature: (slug: string) => `${basis}/${slug}`,
    open: `${basis}/${OPEN_SOLLICITATIE[taal]}`,
    home: pad(taal, "home"),
  };
}

/* ---------- Werken bij React2u (/vacatures, /en/jobs) ---------- */

export function WerkenBijPagina({ vacatures, taal = "nl" }: { vacatures: Vacancy[]; taal?: Taal }) {
  const t = woordenboek(taal);
  const w = t.vacatures;
  const p = paden(taal);
  const keuzes = vacatures.map((v) => ({ id: v.id, title: vacatureInTaal(v, taal).title }));
  return (
    <div className={`hv ${outfit.variable} bg-white`} style={{ color: NAVY }}>
      {/* 1. Kop met de open vacatures */}
      <section aria-label={w.eyebrow} className={`${BREED} grid gap-10 pt-10 md:pt-14 lg:grid-cols-12 lg:items-center lg:gap-6`}>
        <div className="flex flex-col gap-6 lg:col-span-5">
          <Kruimels items={[{ label: t.algemeen.home, href: p.home }, { label: w.kruimelWerkenBij }]} taal={taal} />
          <Eyebrow>{w.eyebrow}</Eyebrow>
          <h1 className={`${kop} m-0 text-[44px] leading-[1.02] tracking-[-1.4px] md:text-[60px] md:tracking-[-1.8px]`}>{w.kop}</h1>
          <p className="m-0 text-[17px] leading-[1.65] md:text-[18px]" style={{ color: BODY }}>{w.intro}</p>
          <div className="flex flex-wrap gap-2.5">
            <Knop href="#vacatures">{w.bekijkVacatures}</Knop>
            <Knop href="#solliciteren" rand>{w.openSollicitatie}</Knop>
          </div>
          <Micro items={w.micro} />
        </div>
        <div className="relative h-[420px] overflow-hidden rounded-[28px] md:h-[560px] lg:col-span-6 lg:col-start-7">
          <img src="/beeld/home/samen-leren.webp" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 35%" }} />
          {vacatures.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-1 rounded-[20px] bg-white p-5 shadow-[0_30px_60px_-30px_rgba(50,46,131,0.45)] md:bottom-6 md:left-auto md:right-6 md:w-[340px]">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[15px] font-bold">{w.openVacatures}</span>
                <span className="rounded-full px-2.5 py-1 text-[12.5px] font-bold" style={{ background: "#FDECF4", color: PINK }}>{vul(w.nOpen, { n: vacatures.length })}</span>
              </div>
              {vacatures.map((v, i) => {
                const tekst = vacatureInTaal(v, taal);
                return (
                  <Link key={v.id} href={p.vacature(v.slug)} className="hv-btn group flex items-center justify-between gap-3 border-t py-3" style={{ borderColor: LINE }}>
                    <span className="flex items-start gap-2.5">
                      <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: i % 2 ? TEAL : PINK }} />
                      <span className="flex flex-col">
                        <span className="text-[15px] font-bold" lang={tekst.taal !== taal ? tekst.taal : undefined}>{tekst.title}</span>
                        {kenmerken(v, taal) && <span className="text-[13px]" style={{ color: MUTE }}>{kenmerken(v, taal)}</span>}
                      </span>
                    </span>
                    <span style={{ color: MUTE }}><Pijl /></span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div className="pt-10" />
      <KlantenStrook label={w.klantenLabel} taal={taal} />

      {/* 2. Wat je bij ons krijgt */}
      <section aria-label={w.voordelenEyebrow} style={{ background: SOFT }}>
        <div className={`${BREED} flex flex-col gap-10 py-20 md:gap-12 md:py-[104px]`}>
          <KopBlok eyebrow={w.voordelenEyebrow} kopTekst={w.voordelenKop} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {w.voordelen.map((x) => (
              <div key={x.titel} className="flex flex-col gap-2.5 rounded-[22px] bg-white p-7">
                <span className="text-[18px] font-bold">{x.titel}</span>
                <span className="text-[15.5px] leading-[1.6]" style={{ color: BODY }}>{x.tekst}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Je werk */}
      <section aria-label={w.werkEyebrow} className="bg-white">
        <div className={`${BREED} grid gap-10 py-20 md:py-[112px] lg:grid-cols-12 lg:items-center lg:gap-6`}>
          <div className="relative h-[340px] overflow-hidden rounded-[28px] md:h-[480px] lg:col-span-6">
            <img src="/beeld/werkgevers/gezonde-werkplek.webp" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 40%" }} loading="lazy" />
          </div>
          <div className="flex flex-col gap-5 lg:col-span-5 lg:col-start-8">
            <Eyebrow>{w.werkEyebrow}</Eyebrow>
            <h2 className={`${kop} m-0 text-[34px] leading-[1.1] tracking-[-0.9px] md:text-[44px]`}>{w.werkKop}</h2>
            <p className="m-0 text-[17px] leading-[1.7]" style={{ color: BODY }}>{w.werkTekst}</p>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {w.werkPunten.map((x) => (
                <li key={x} className="flex gap-3 text-[16px] leading-[1.55]" style={{ color: BODY }}>
                  <span className="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full" style={{ background: "#E5F5F4", color: TEAL }}><Vink size={13} /></span>{x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 4. Vacatures */}
      <section id="vacatures" aria-label={w.vacaturesEyebrow} className="scroll-mt-28" style={{ background: SOFT }}>
        <div className={`${BREED} flex flex-col gap-10 py-20 md:py-[104px]`}>
          <KopBlok eyebrow={w.vacaturesEyebrow} kopTekst={vacatures.length ? w.vacaturesKop : w.geenVacaturesKop}
            tekst={vacatures.length ? w.vacaturesTekst : w.geenVacaturesTekst} />
          <div className="flex flex-col gap-4">
            {vacatures.map((v, i) => {
              const tekst = vacatureInTaal(v, taal);
              const anders = tekst.taal !== taal;
              return (
                <Link key={v.id} href={p.vacature(v.slug)}
                  className="hv-btn group flex flex-col gap-5 rounded-[24px] bg-white p-7 md:flex-row md:items-center md:justify-between md:p-9">
                  <span className="flex flex-col gap-2.5" lang={anders ? tekst.taal : undefined}>
                    <span className={`${kop} flex items-center gap-3 text-[24px] md:text-[28px]`}>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: i % 2 ? TEAL : PINK }} />{tekst.title}
                    </span>
                    {tekst.intro && <span className="max-w-[640px] text-[16px] leading-[1.6]" style={{ color: BODY }}>{tekst.intro}</span>}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 md:flex-nowrap">
                    {anders && <Chip tint="#FDECF4">{w.inHetNederlandsKort}</Chip>}
                    {v.location && <Chip>{v.location}</Chip>}
                    {v.hours && <Chip>{kenmerkInTaal(v.hours, taal)}</Chip>}
                    {v.salary && <Chip>{kenmerkInTaal(v.salary, taal)}</Chip>}
                    <span className="ml-2 grid h-12 w-12 shrink-0 place-items-center rounded-full text-white transition-colors group-hover:bg-[#E61674]" style={{ background: NAVY }}><Pijl /></span>
                  </span>
                </Link>
              );
            })}
            <a href="#solliciteren" className="flex flex-col gap-3 rounded-[24px] border-2 border-dashed bg-white/50 p-7 md:flex-row md:items-center md:justify-between md:p-9" style={{ borderColor: "#D9D8E6" }}>
              <span className="flex flex-col gap-1.5">
                <span className={`${kop} text-[22px]`}>{w.openKaartKop}</span>
                <span className="text-[16px]" style={{ color: BODY }}>{w.openKaartTekst}</span>
              </span>
              <span className="inline-flex items-center gap-2 text-[15px] font-bold">{w.openKaartLink} <Pijl /></span>
            </a>
          </div>
        </div>
      </section>

      {/* 5. Zo solliciteer je */}
      <section aria-label={w.procesEyebrow} className="bg-white">
        <div className={`${BREED} flex flex-col gap-12 py-20 md:py-[104px]`}>
          <KopBlok eyebrow={w.procesEyebrow} kopTekst={w.procesKop} tekst={w.procesTekst} />
          <ol className="m-0 grid list-none gap-8 p-0 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {w.stappen.map((x, i) => (
              <li key={x.titel} className="flex flex-col gap-3">
                <span className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] font-bold text-white" style={{ background: NAVY }}>{i + 1}</span>
                  {i < w.stappen.length - 1 && <span className="hidden h-0.5 flex-1 lg:block" style={{ background: LINE }} />}
                </span>
                <span className="text-[19px] font-bold">{x.titel}</span>
                <span className="text-[15.5px] leading-[1.6]" style={{ color: BODY }}>{x.tekst}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6. Snel solliciteren */}
      <section id="solliciteren" aria-label={w.solliciterenEyebrow} className="scroll-mt-28 bg-white">
        <div className={`${BREED} pb-20 md:pb-[112px]`}>
          <div className="relative grid gap-10 overflow-hidden rounded-[28px] p-6 md:rounded-[32px] md:p-16 lg:grid-cols-12 lg:items-center lg:gap-6" style={{ background: NAVY }}>
            <span aria-hidden className="absolute bottom-[-200px] left-[-160px] h-[520px] w-[520px] rounded-full" style={{ background: "radial-gradient(circle, rgba(180,173,242,0.30), rgba(180,173,242,0) 70%)" }} />
            <div className="relative flex flex-col gap-5 lg:col-span-5">
              <Eyebrow kleur="#F7A8CB">{w.solliciterenEyebrow}</Eyebrow>
              <h2 className={`${kop} m-0 text-[36px] leading-[1.05] tracking-[-1.2px] md:text-[48px]`} style={{ color: "#ffffff" }}>{w.solliciterenKop}</h2>
              <p className="m-0 text-[17px] leading-[1.7]" style={{ color: "rgba(255,255,255,0.75)" }}>{w.solliciterenTekst}</p>
              <Micro licht items={w.solliciterenMicro} />
              <Susanne licht taal={taal} />
            </div>
            <div className="relative rounded-[24px] bg-white p-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.45)] md:p-10 lg:col-span-6 lg:col-start-7">
              <Solliciteren keuzes={keuzes} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- Vacaturepagina (/vacatures/[slug], /en/jobs/[slug]) ---------- */

export function VacatureDetail({ v, andere, taal = "nl" }: { v: Vacancy; andere: Vacancy[]; taal?: Taal }) {
  const t = woordenboek(taal);
  const w = t.vacatures;
  const d = w.detail;
  const p = paden(taal);
  const tekst = vacatureInTaal(v, taal);
  // De tekst staat in een andere taal dan de pagina: dan zegt de pagina dat, en
  // krijgt de tekst zelf een lang-attribuut voor schermlezers en vertaalknoppen.
  const anders = tekst.taal !== taal;
  const langAttr = anders ? tekst.taal : undefined;
  const kerncijfers = [
    v.salary ? [kenmerkInTaal(v.salary, taal), d.brutoPerMaand] : null,
    v.hours ? [kenmerkInTaal(v.hours, taal), d.perWeek] : null,
    [v.location || d.standaardLocatie, d.locatieSub],
    [d.werkdagen, d.danHoorJe],
  ].filter(Boolean) as string[][];
  return (
    <div className={`hv ${outfit.variable} bg-white`} style={{ color: NAVY }}>
      {/* 1. Kop met het belangrijkste */}
      <section aria-label={w.kruimelVacatures} className="px-[6px] pt-4 md:px-10 md:pt-8 lg:px-16 xl:px-[120px] xl:mx-auto xl:max-w-[1440px]">
        <div className="relative grid gap-10 overflow-hidden rounded-[28px] px-6 py-10 md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center lg:gap-[72px] lg:p-[72px]" style={{ background: LAV }}>
          <span aria-hidden className="absolute right-[-140px] top-[-170px] h-[560px] w-[560px] rounded-full" style={{ background: NAVY, opacity: 0.07 }} />
          <div className="relative flex flex-col gap-6">
            <Kruimels items={[{ label: w.kruimelWerkenBij, href: p.basis }, { label: w.kruimelVacatures, href: p.vacatures }, { label: tekst.title }]} taal={taal} />
            {anders && (
              <p className="m-0 inline-flex items-center gap-2.5 self-start rounded-full bg-white px-4 py-2 text-[14px] font-bold" style={{ color: NAVY }}>
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: PINK }} />{w.inHetNederlands}
              </p>
            )}
            <h1 className={`${kop} m-0 text-[44px] leading-[1] tracking-[-1.4px] md:text-[64px] md:tracking-[-2px]`} lang={langAttr}>{tekst.title}</h1>
            {tekst.intro && <p className="m-0 max-w-[520px] text-[17px] leading-[1.65] md:text-[19px]" style={{ color: BODY }} lang={langAttr}>{tekst.intro}</p>}
            <div className="flex flex-wrap items-center gap-5 pt-1">
              <Knop href="#solliciteren">{d.solliciteerDirect}</Knop>
              <span className="text-[15px]" style={{ color: MUTE }}>{d.duurtMinuut}</span>
            </div>
          </div>
          <div className="relative flex flex-col rounded-[24px] bg-white px-7 pb-4 pt-3 md:px-8">
            <span className="pb-1.5 pt-5 text-[15px] font-bold">{d.belangrijkste}</span>
            {kerncijfers.map(([groot, klein]) => (
              <div key={groot} className="flex flex-col gap-1 border-t py-5" style={{ borderColor: LINE }}>
                <span className={`${kop} text-[26px] tracking-[-0.6px] md:text-[30px]`}>{groot}</span>
                <span className="text-[14.5px]" style={{ color: MUTE }}>{klein}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. De tekst uit de admin, met een vaste kolom ernaast */}
      <section aria-label={w.kruimelVacatures} className="bg-white">
        <div className={`${BREED} grid gap-12 py-20 md:py-[104px] lg:grid-cols-12 lg:gap-6`}>
          <div className="vacature-tekst lg:col-span-7" style={{ color: BODY }} lang={langAttr}>
            <MiniMarkdown text={tekst.description_md || ""} className="text-[17px] leading-[1.75]" kop="h2" />
          </div>
          <aside className="h-fit lg:sticky lg:top-[calc(var(--hh,96px)+24px)] lg:col-span-4 lg:col-start-9">
            <div className="flex flex-col gap-5 rounded-[24px] p-7" style={{ background: SOFT }}>
              <span className={`${kop} text-[22px]`} lang={langAttr}>{tekst.title}</span>
              <dl className="m-0 flex flex-col">
                {[
                  [d.locatie, v.location],
                  [d.uren, kenmerkInTaal(v.hours, taal)],
                  [d.salaris, kenmerkInTaal(v.salary, taal)],
                  [d.dienstverband, w.dienstverband[v.employment_type] || v.employment_type],
                ].filter(([, x]) => x).map(([l, x]) => (
                  <div key={l} className="flex justify-between gap-4 border-t py-3 text-[15px]" style={{ borderColor: LINE }}>
                    <dt style={{ color: MUTE }}>{l}</dt><dd className="m-0 text-right font-bold">{x}</dd>
                  </div>
                ))}
              </dl>
              <Knop href="#solliciteren">{d.solliciteerDirect}</Knop>
              <a href={SUSANNE.telHref} className="flex items-center gap-3 border-t pt-4 text-[14.5px]" style={{ borderColor: LINE, color: BODY }}>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-[14px] font-bold" style={{ color: NAVY }}>SL</span>
                <span className="flex flex-col"><span>{d.vragenBel}</span><span className="font-bold" style={{ color: NAVY }}>{telefoonInTaal(SUSANNE.tel, taal)}</span></span>
              </a>
            </div>
          </aside>
        </div>
      </section>

      {/* 3. Solliciteren */}
      <section id="solliciteren" aria-label={w.solliciterenEyebrow} className="scroll-mt-28" style={{ background: SOFT }}>
        <div className={`${BREED} grid gap-10 py-20 md:py-[104px] lg:grid-cols-12 lg:items-start lg:gap-6`}>
          <div className="flex flex-col gap-5 lg:col-span-5">
            <h2 className={`${kop} m-0 text-[34px] leading-[1.1] tracking-[-0.9px] md:text-[44px]`}>{d.solliciterenKop}</h2>
            <p className="m-0 text-[17px] leading-[1.7]" style={{ color: BODY }}>{d.solliciterenTekst}</p>
            <Susanne taal={taal} />
          </div>
          <div className="rounded-[24px] bg-white p-6 md:p-10 lg:col-span-6 lg:col-start-7">
            <Solliciteren keuzes={[]} vast={{ id: v.id, title: tekst.title }} kopTekst={t.formulier.sollicitatie.kopDirect} duur={t.formulier.sollicitatie.duur1} />
          </div>
        </div>
      </section>

      {/* 4. Andere vacatures */}
      <section aria-label={d.bekijkOok} className="bg-white">
        <div className={`${BREED} flex flex-col gap-8 py-20 md:py-[96px]`}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className={`${kop} m-0 text-[30px] tracking-[-0.6px] md:text-[36px]`}>{d.bekijkOok}</h2>
            <Link href={p.basis} className="inline-flex items-center gap-2 text-[15px] font-bold underline underline-offset-4" style={{ textDecorationColor: "rgba(50,46,131,0.35)" }}>{d.allesOverWerken} <Pijl /></Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {andere.map((a) => {
              const at = vacatureInTaal(a, taal);
              return (
                <Link key={a.id} href={p.vacature(a.slug)} className="hv-btn flex flex-col gap-2.5 rounded-[24px] border p-7" style={{ borderColor: LINE }}>
                  <span className={`${kop} text-[22px]`} lang={at.taal !== taal ? at.taal : undefined}>{at.title}</span>
                  {at.intro && <span className="text-[15.5px] leading-[1.6]" style={{ color: BODY }} lang={at.taal !== taal ? at.taal : undefined}>{at.intro}</span>}
                  <span className="mt-1 inline-flex items-center gap-2 text-[14.5px] font-bold">{d.bekijkVacature} <Pijl /></span>
                </Link>
              );
            })}
            <Link href={p.solliciteren} className="hv-btn flex flex-col gap-2.5 rounded-[24px] border-2 border-dashed p-7" style={{ borderColor: "#D9D8E6" }}>
              <span className={`${kop} text-[22px]`}>{w.openKaartKop}</span>
              <span className="text-[15.5px] leading-[1.6]" style={{ color: BODY }}>{d.openKaartTekst}</span>
              <span className="mt-1 inline-flex items-center gap-2 text-[14.5px] font-bold">{d.altijdWelkom} <Pijl /></span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- Open sollicitatie (/vacatures/open-sollicitatie, /en/jobs/open-application) ---------- */

export function OpenSollicitatiePagina({ taal = "nl" }: { taal?: Taal }) {
  const t = woordenboek(taal);
  const w = t.vacatures;
  const o = w.openPagina;
  const p = paden(taal);
  return (
    <div className={`hv ${outfit.variable} bg-white`} style={{ color: NAVY }}>
      <section aria-label={o.kop} className="px-[6px] pt-4 md:px-10 md:pt-8 lg:px-16 xl:px-[120px] xl:mx-auto xl:max-w-[1440px]">
        <div className="relative grid gap-10 overflow-hidden rounded-[28px] px-6 py-10 md:rounded-[36px] md:p-14 lg:grid-cols-12 lg:items-start lg:gap-6 lg:p-[72px]" style={{ background: LAV }}>
          <span aria-hidden className="absolute right-[-140px] top-[-170px] h-[560px] w-[560px] rounded-full" style={{ background: NAVY, opacity: 0.07 }} />
          <div className="relative flex flex-col gap-6 lg:col-span-5">
            <Kruimels items={[{ label: w.kruimelWerkenBij, href: p.basis }, { label: o.kop }]} taal={taal} />
            <Eyebrow>{o.eyebrow}</Eyebrow>
            <h1 className={`${kop} m-0 text-[44px] leading-[1.02] tracking-[-1.4px] md:text-[60px] md:tracking-[-1.8px]`}>{o.kop}</h1>
            <p className="m-0 text-[17px] leading-[1.65] md:text-[19px]" style={{ color: BODY }}>{o.tekst}</p>
            <Micro items={w.solliciterenMicro} />
            <Susanne taal={taal} />
          </div>
          <div className="relative rounded-[24px] bg-white p-6 shadow-[0_30px_60px_-30px_rgba(50,46,131,0.35)] md:p-10 lg:col-span-6 lg:col-start-7">
            <Solliciteren keuzes={[]} vast={{ id: "", title: t.formulier.sollicitatie.open }} kopTekst={o.formKop} />
          </div>
        </div>
      </section>
      <div className="pb-20 md:pb-[112px]" />
    </div>
  );
}
