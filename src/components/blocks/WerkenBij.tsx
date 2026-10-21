import Link from "next/link";
import type { Vacancy } from "@/lib/types";
import { MiniMarkdown } from "@/lib/md";
import { OPEN_SOLLICITATIE, pad, vul, type Taal } from "@/lib/taal";
import { woordenboek } from "@/lib/woordenboek";
import { faqLd, faqParen, isOpdracht, kenmerkInTaal, opbouwInTaal, vacatureInTaal } from "@/lib/vacatures";
import { jsonLd } from "@/lib/jsonld";
import { VAKGEBIEDEN, vakgebiedVan, type Vakgebied } from "@/lib/vakgebieden";
import { outfit } from "./HomeVerhaal";
import Solliciteren from "./Solliciteren";
import DeelVacature from "./DeelVacature";
import {
  NAVY, PINK, TEAL, BODY, MUTE, LINE, SOFT, LAV, kop, BREED,
  Eyebrow, Kruimels, KopBlok, Knop, Pijl, Vink, KlantenStrook,
} from "./Gedeeld";
import Beeld from "@/components/site/Beeld";

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

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl").replace(/\/$/, "");

/** Contact bij vacatures en de open sollicitatie (vaste naam, niet vertaald). */
const EIGENAAR = { naam: "Rens van Eyck", mail: "rens@react2u.nl", whatsapp: "31645064277" };

function Chip({ children, tint = SOFT }: { children: React.ReactNode; tint?: string }) {
  return <span className="inline-flex items-center rounded-full px-3 py-[7px] text-[13.5px] font-bold" style={{ background: tint, color: NAVY }}>{children}</span>;
}

/** Een sectie van de vacaturetekst; leeg = niet tonen. */
function TekstSectie({ kop: titel, md, lang }: { kop: string; md: string; lang?: string }) {
  if (!md) return null;
  return (
    <div className="vacature-tekst" lang={lang}>
      <h2 className={`${kop} m-0 mb-5 text-[30px] tracking-[-0.7px] md:text-[36px]`} style={{ color: NAVY }}>{titel}</h2>
      <MiniMarkdown text={md} className="text-[17px] leading-[1.75]" kop="h3" />
    </div>
  );
}

/** "React2u in cijfers": verschijnt pas als er cijfers in het woordenboek staan. */
function Cijfers({ taal }: { taal: Taal }) {
  const ob = woordenboek(taal).vacatures.opbouw;
  if (!ob.cijfers.length) return null;
  return (
    <div className="flex flex-col gap-4">
      <span className="text-[15px] font-bold">{ob.cijfersKop}</span>
      <dl className="m-0 grid grid-cols-2 gap-4 md:grid-cols-4">
        {ob.cijfers.map((c) => (
          <div key={c.label} className="flex flex-col gap-1 rounded-[24px] bg-white p-6">
            <dt className="order-2 text-[15px]" style={{ color: BODY }}>{c.label}</dt>
            <dd className={`${kop} order-1 m-0 text-[34px] tracking-[-0.8px]`}>{c.getal}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Contact bij een vacature: de eigenaar van React2u, via mail of WhatsApp.
 * `licht` is voor een donkere achtergrond, `kop` vervangt "Vragen over deze
 * vacature?" op pagina's die niet over één vacature gaan.
 */
function Eigenaar({ taal, groot, licht, kop: titel }: { taal: Taal; groot?: boolean; licht?: boolean; kop?: string }) {
  const ob = woordenboek(taal).vacatures.opbouw;
  const kaart = licht
    ? { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }
    : { background: SOFT };
  return (
    <div className={`flex flex-col gap-3 ${groot ? "rounded-[20px] p-5" : "border-t pt-4"}`} style={groot ? kaart : { borderColor: LINE }}>
      {groot && <span className="text-[16px] font-bold" style={{ color: licht ? "#ffffff" : NAVY }}>{titel || ob.contactKop}</span>}
      <div className="flex items-center gap-3.5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[16px] font-bold" style={{ background: groot && !licht ? LAV : "#ffffff", color: NAVY }}>RE</span>
        <span className="flex flex-col">
          <span className="text-[16px] font-bold" style={{ color: licht ? "#ffffff" : NAVY }}>{EIGENAAR.naam}</span>
          <span className="text-[13.5px]" style={{ color: licht ? "rgba(255,255,255,0.7)" : BODY }}>{ob.contactRol}, React2u</span>
        </span>
      </div>
      {groot && <p className="m-0 text-[14.5px] leading-[1.6]" style={{ color: licht ? "rgba(255,255,255,0.75)" : BODY }}>{ob.contactTekst}</p>}
      <a href={`mailto:${EIGENAAR.mail}`} className="inline-flex h-11 items-center justify-center rounded-full border bg-white text-[14.5px] font-bold" style={{ color: NAVY, borderColor: "#D9D8E6" }}>{EIGENAAR.mail}</a>
      <a href={`https://wa.me/${EIGENAAR.whatsapp}?text=${encodeURIComponent(ob.whatsappTekst)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-full text-[14.5px] font-bold text-white" style={{ background: "#1FA855" }}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>
        {ob.whatsappKnop}
      </a>
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
    vakgebied: (slug: string) => `${basis}/vakgebied/${slug}`,
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
          <Beeld src="/beeld/home/samen-leren.webp" alt={w.fotoTeamAlt} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 35%" }} />
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
        <div className={`${BREED} flex flex-col gap-10 py-14 md:gap-12 md:py-[104px]`}>
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
        <div className={`${BREED} grid gap-10 py-14 md:py-[112px] lg:grid-cols-12 lg:items-center lg:gap-6`}>
          <div className="relative h-[340px] overflow-hidden rounded-[28px] md:h-[480px] lg:col-span-6">
            <Beeld src="/beeld/kantoor/scherm.webp" alt={w.fotoWerkAlt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 45%" }} />
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
        <div className={`${BREED} flex flex-col gap-8 py-14 md:gap-10 md:py-[104px]`}>
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
          <div className="flex flex-col gap-4">
            <span className="text-[15px] font-bold">{w.opbouw.vakgebiedenKop}</span>
            <VakgebiedLinks taal={taal} />
          </div>
        </div>
      </section>

      {/* 5. Zo solliciteer je */}
      <section aria-label={w.procesEyebrow} className="bg-white">
        <div className={`${BREED} flex flex-col gap-9 py-14 md:gap-12 md:py-[104px]`}>
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
        <div className={`${BREED} pb-14 md:pb-[112px]`}>
          <div className="relative grid gap-10 overflow-hidden rounded-[28px] p-6 md:rounded-[32px] md:p-16 lg:grid-cols-12 lg:items-center lg:gap-6" style={{ background: NAVY }}>
            <span aria-hidden className="absolute bottom-[-200px] left-[-160px] h-[520px] w-[520px] rounded-full" style={{ background: "radial-gradient(circle, rgba(180,173,242,0.30), rgba(180,173,242,0) 70%)" }} />
            <div className="relative flex flex-col gap-5 lg:col-span-5">
              <Eyebrow kleur="#F7A8CB">{w.solliciterenEyebrow}</Eyebrow>
              <h2 className={`${kop} m-0 text-[36px] leading-[1.05] tracking-[-1.2px] md:text-[48px]`} style={{ color: "#ffffff" }}>{w.solliciterenKop}</h2>
              <p className="m-0 text-[17px] leading-[1.7]" style={{ color: "rgba(255,255,255,0.75)" }}>{w.solliciterenTekst}</p>
              <Micro licht items={w.solliciterenMicro} />
              <Eigenaar taal={taal} groot licht kop={w.aanspreekpunt} />
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
  // Nieuwe opbouw (migratie 0017); zonder secties blijft de oude weergave staan.
  const o = opbouwInTaal(v, taal);
  const ob = w.opbouw;
  const opdracht = isOpdracht(v);
  // Het vaste pakket geldt voor loondienst; niet voor ZZP-opdrachten en stages.
  const vastPakket = !opdracht && v.employment_type !== "INTERN";
  const oLang = o && o.taal !== taal ? o.taal : undefined;
  const faq = o ? faqParen(o.faq) : [];
  const inHetKort = [
    [ob.vakgebied, v.vakgebied],
    [ob.uren, kenmerkInTaal(v.hours, taal)],
    [ob.locatie, v.location || d.standaardLocatie],
    [opdracht ? ob.tarief : ob.salaris, kenmerkInTaal(v.salary, taal)],
    [ob.contract, v.contractvorm],
    [ob.ervaring, v.ervaringsniveau],
    [ob.opleiding, v.opleidingsniveau],
  ].filter(([, x]) => x) as string[][];
  const stappen = opdracht ? ob.stappenOpdracht : ob.stappen;
  const vg = vakgebiedVan(v.vakgebied);
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
          {o ? (
            <div className="relative flex flex-col rounded-[24px] bg-white px-7 pb-3 pt-3 md:px-8">
              <span className="pb-2 pt-5 text-[15px] font-bold">{ob.inHetKort}</span>
              <dl className="m-0 flex flex-col">
                {inHetKort.map(([l, x]) => (
                  <div key={l} className="flex items-baseline justify-between gap-5 border-t py-3.5 text-[15.5px]" style={{ borderColor: LINE }}>
                    <dt style={{ color: MUTE }}>{l}</dt><dd className="m-0 text-right font-bold">{x}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
          <div className="relative flex flex-col rounded-[24px] bg-white px-7 pb-4 pt-3 md:px-8">
            <span className="pb-1.5 pt-5 text-[15px] font-bold">{d.belangrijkste}</span>
            {kerncijfers.map(([groot, klein]) => (
              <div key={groot} className="flex flex-col gap-1 border-t py-5" style={{ borderColor: LINE }}>
                <span className={`${kop} text-[26px] tracking-[-0.6px] md:text-[30px]`}>{groot}</span>
                <span className="text-[14.5px]" style={{ color: MUTE }}>{klein}</span>
              </div>
            ))}
          </div>
          )}
        </div>
      </section>

      {o ? (
        <>
          {/* 2. De secties van de vacature, met een vaste kolom ernaast */}
          <section aria-label={tekst.title} className="bg-white">
            <div className={`${BREED} grid gap-12 py-14 md:py-[104px] lg:grid-cols-12 lg:gap-6`}>
              <div className="flex flex-col gap-12 lg:col-span-7" style={{ color: BODY }}>
                <TekstSectie kop={ob.doen} md={o.doen} lang={oLang} />
                <TekstSectie kop={ob.samen} md={o.samen} lang={oLang} />
                <TekstSectie kop={ob.leuk} md={o.leuk} lang={oLang} />
                {o.eerlijk && (
                  <div className="rounded-[24px] border-2 border-dashed p-7" style={{ borderColor: "#D9D8E6" }} lang={oLang}>
                    <h2 className={`${kop} m-0 mb-3 text-[24px] tracking-[-0.4px]`} style={{ color: NAVY }}>{ob.eerlijk}</h2>
                    <MiniMarkdown text={o.eerlijk} className="text-[17px] leading-[1.75]" kop="h3" />
                  </div>
                )}
                <TekstSectie kop={ob.vragen} md={o.vragen} lang={oLang} />
                <div className="flex flex-col gap-5">
                  <h2 className={`${kop} m-0 text-[30px] tracking-[-0.7px] md:text-[36px]`} style={{ color: NAVY }}>{opdracht ? ob.biedenOpdracht : ob.bieden}</h2>
                  {vastPakket && (
                    <ul className="m-0 grid list-none gap-x-6 gap-y-3 rounded-[24px] p-6 sm:grid-cols-2 md:p-7" style={{ background: SOFT }}>
                      {ob.aanbod.map((a) => (
                        <li key={a} className="flex items-start gap-2.5 text-[16px] leading-[1.55]">
                          <span className="mt-[3px] shrink-0" style={{ color: TEAL }}><Vink /></span><span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {o.bieden && (
                    <div className="vacature-tekst" lang={oLang}>
                      {vastPakket && <h3 className="m-0 mb-2 mt-3 text-[18px] font-bold" style={{ color: NAVY }}>{ob.bovenop}</h3>}
                      <MiniMarkdown text={o.bieden} className="text-[17px] leading-[1.75]" kop="h3" />
                    </div>
                  )}
                </div>
                <DeelVacature url={`${SITE_URL}${p.vacature(v.slug)}`} titel={tekst.title} t={ob.deel} />
                {vg && (
                  <Link href={p.vakgebied(vg.slug)} className="hv-btn flex items-center justify-between gap-4 rounded-[24px] border p-6" style={{ borderColor: LINE }}>
                    <span className="flex flex-col gap-1">
                      <span className="text-[14px]" style={{ color: MUTE }}>{ob.meerOverVak}</span>
                      <span className={`${kop} text-[20px]`} style={{ color: NAVY }}>{vg[taal].titel}</span>
                    </span>
                    <Pijl />
                  </Link>
                )}
              </div>
              <aside className="h-fit lg:sticky lg:top-[calc(var(--hh,96px)+24px)] lg:col-span-4 lg:col-start-9">
                <div className="flex flex-col gap-5 rounded-[24px] p-7" style={{ background: SOFT }}>
                  <span className={`${kop} text-[22px]`} lang={langAttr}>{tekst.title}</span>
                  <dl className="m-0 flex flex-col">
                    {inHetKort.slice(0, 5).map(([l, x]) => (
                      <div key={l} className="flex justify-between gap-4 border-t py-3 text-[15px]" style={{ borderColor: LINE }}>
                        <dt style={{ color: MUTE }}>{l}</dt><dd className="m-0 text-right font-bold">{x}</dd>
                      </div>
                    ))}
                  </dl>
                  <Knop href="#solliciteren">{d.solliciteerDirect}</Knop>
                  <Eigenaar taal={taal} />
                </div>
              </aside>
            </div>
          </section>

          {/* 3. Werken bij React2u */}
          <section aria-label={ob.werkenBijKop} style={{ background: SOFT }}>
            <div className={`${BREED} flex flex-col gap-8 py-14 md:py-[96px]`}>
              <div className="flex max-w-[640px] flex-col gap-3">
                <h2 className={`${kop} m-0 text-[32px] tracking-[-0.8px] md:text-[40px]`}>{ob.werkenBijKop}</h2>
                <p className="m-0 text-[17px] leading-[1.7]" style={{ color: BODY }}>{ob.werkenBijTekst}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {ob.werkenBij.map((b) => (
                  <div key={b.kop} className="flex flex-col gap-2 rounded-[24px] bg-white p-6">
                    <span className={`${kop} text-[20px]`}>{b.kop}</span>
                    <span className="text-[15.5px] leading-[1.6]" style={{ color: BODY }}>{b.tekst}</span>
                  </div>
                ))}
              </div>
              <Cijfers taal={taal} />
            </div>
          </section>

          {/* 4. Procedure */}
          <section aria-label={ob.procedureKop} className="bg-white">
            <div className={`${BREED} flex flex-col gap-8 py-14 md:py-[96px]`}>
              <div className="flex max-w-[640px] flex-col gap-3">
                <h2 className={`${kop} m-0 text-[32px] tracking-[-0.8px] md:text-[40px]`}>{ob.procedureKop}</h2>
                <p className="m-0 text-[17px] leading-[1.7]" style={{ color: BODY }}>{ob.procedureTekst}</p>
              </div>
              <ol className={`m-0 grid list-none gap-4 p-0 sm:grid-cols-2 ${stappen.length > 4 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
                {stappen.map((st, i) => (
                  <li key={st.kop} className="flex flex-col gap-2 rounded-[24px] border p-6" style={{ borderColor: LINE }}>
                    <span className="grid h-9 w-9 place-items-center rounded-full text-[15px] font-bold" style={{ background: LAV, color: NAVY }}>{i + 1}</span>
                    <span className="text-[17px] font-bold">{st.kop}</span>
                    <span className="text-[15px] leading-[1.6]" style={{ color: BODY }}>{st.tekst}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* 5. Veelgestelde vragen */}
          {faq.length > 0 && (
            <section aria-label={ob.faq} style={{ background: SOFT }}>
              <div className={`${BREED} grid gap-8 py-14 md:py-[96px] lg:grid-cols-12 lg:gap-6`}>
                <h2 className={`${kop} m-0 text-[32px] tracking-[-0.8px] md:text-[40px] lg:col-span-4`}>{ob.faq}</h2>
                <div className="flex flex-col gap-3 lg:col-span-7 lg:col-start-6" lang={oLang}>
                  {faq.map((f) => (
                    <details key={f.vraag} className="group rounded-[20px] bg-white p-6">
                      <summary className="cursor-pointer list-none text-[17px] font-bold" style={{ color: NAVY }}>{f.vraag}</summary>
                      <p className="m-0 mt-3 text-[16px] leading-[1.7]" style={{ color: BODY }}>{f.antwoord}</p>
                    </details>
                  ))}
                </div>
              </div>
              <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqLd(faq)) }} />
            </section>
          )}
        </>
      ) : (
        <>
      {/* 2. De tekst uit de admin, met een vaste kolom ernaast */}
      <section aria-label={w.kruimelVacatures} className="bg-white">
        <div className={`${BREED} grid gap-12 py-14 md:py-[104px] lg:grid-cols-12 lg:gap-6`}>
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
              <Eigenaar taal={taal} />
            </div>
          </aside>
        </div>
      </section>

        </>
      )}

      {/* 3. Solliciteren */}
      <section id="solliciteren" aria-label={w.solliciterenEyebrow} className="scroll-mt-28" style={{ background: SOFT }}>
        <div className={`${BREED} grid gap-10 py-14 md:py-[104px] lg:grid-cols-12 lg:items-start lg:gap-6`}>
          <div className="flex flex-col gap-5 lg:col-span-5">
            <h2 className={`${kop} m-0 text-[34px] leading-[1.1] tracking-[-0.9px] md:text-[44px]`}>{d.solliciterenKop}</h2>
            <p className="m-0 text-[17px] leading-[1.7]" style={{ color: BODY }}>{d.solliciterenTekst}</p>
            <Eigenaar taal={taal} groot />
          </div>
          <div className="rounded-[24px] bg-white p-6 md:p-10 lg:col-span-6 lg:col-start-7">
            <Solliciteren keuzes={[]} vast={{ id: v.id, title: tekst.title }} kopTekst={t.formulier.sollicitatie.kopDirect} duur={t.formulier.sollicitatie.duur1} />
          </div>
        </div>
      </section>

      {/* 4. Andere vacatures */}
      <section aria-label={d.bekijkOok} className="bg-white">
        <div className={`${BREED} flex flex-col gap-8 py-14 md:py-[96px]`}>
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

/* ---------- Vakgebied (/vacatures/vakgebied/[slug], /en/jobs/vakgebied/[slug]) ---------- */

export function VakgebiedPagina({ g, vacatures, taal = "nl" }: { g: Vakgebied; vacatures: Vacancy[]; taal?: Taal }) {
  const t = woordenboek(taal);
  const w = t.vacatures;
  const d = w.detail;
  const p = paden(taal);
  const x = g[taal];
  const hier = vacatures.filter((v) => vakgebiedVan(v.vakgebied)?.slug === g.slug);
  const faq = x.faq;
  return (
    <div className={`hv ${outfit.variable} bg-white`} style={{ color: NAVY }}>
      <section aria-label={x.titel} className="px-[6px] pt-4 md:px-10 md:pt-8 lg:px-16 xl:px-[120px] xl:mx-auto xl:max-w-[1440px]">
        <div className="relative flex flex-col gap-6 overflow-hidden rounded-[28px] px-6 py-10 md:rounded-[36px] md:p-14 lg:p-[72px]" style={{ background: LAV }}>
          <span aria-hidden className="absolute right-[-140px] top-[-170px] h-[560px] w-[560px] rounded-full" style={{ background: NAVY, opacity: 0.07 }} />
          <div className="relative flex max-w-[760px] flex-col gap-6">
            <Kruimels items={[{ label: w.kruimelWerkenBij, href: p.basis }, { label: x.titel }]} taal={taal} />
            <Eyebrow>{x.eyebrow}</Eyebrow>
            <h1 className={`${kop} m-0 text-[42px] leading-[1.02] tracking-[-1.4px] md:text-[60px] md:tracking-[-1.8px]`}>{x.titel}</h1>
            <p className="m-0 text-[17px] leading-[1.65] md:text-[19px]" style={{ color: BODY }}>{x.intro}</p>
            <div className="flex flex-wrap items-center gap-5 pt-1">
              <Knop href="#vacatures-vak">{w.kruimelVacatures}</Knop>
            </div>
          </div>
        </div>
      </section>

      <section aria-label={x.fasenKop} className="bg-white">
        <div className={`${BREED} flex flex-col gap-8 py-14 md:py-[96px]`}>
          <h2 className={`${kop} m-0 text-[32px] tracking-[-0.8px] md:text-[40px]`}>{x.fasenKop}</h2>
          <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
            {x.fasen.map((f, i) => (
              <li key={f.kop} className="flex flex-col gap-2 rounded-[24px] border p-6" style={{ borderColor: LINE }}>
                <span className="grid h-9 w-9 place-items-center rounded-full text-[15px] font-bold" style={{ background: LAV, color: NAVY }}>{i + 1}</span>
                <span className="text-[18px] font-bold">{f.kop}</span>
                <span className="text-[15.5px] leading-[1.65]" style={{ color: BODY }}>{f.tekst}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-label={x.groeiKop} style={{ background: SOFT }}>
        <div className={`${BREED} grid gap-10 py-14 md:py-[96px] lg:grid-cols-12 lg:gap-6`}>
          <div className="flex flex-col gap-4 lg:col-span-4">
            <h2 className={`${kop} m-0 text-[32px] tracking-[-0.8px] md:text-[40px]`}>{x.groeiKop}</h2>
            <p className="m-0 text-[17px] leading-[1.7]" style={{ color: BODY }}>{x.groeiTekst}</p>
          </div>
          <div className="flex flex-col gap-3 lg:col-span-7 lg:col-start-6">
            {x.groei.map((gr) => (
              <div key={gr.kop} className="flex flex-col gap-1.5 rounded-[20px] bg-white p-6">
                <span className="text-[18px] font-bold">{gr.kop}</span>
                <span className="text-[15.5px] leading-[1.65]" style={{ color: BODY }}>{gr.tekst}</span>
              </div>
            ))}
            <div className="flex flex-col gap-1.5 rounded-[20px] bg-white p-6">
              <span className="text-[18px] font-bold">{x.samenKop}</span>
              <span className="text-[15.5px] leading-[1.65]" style={{ color: BODY }}>{x.samen}</span>
            </div>
          </div>
        </div>
      </section>

      <section id="vacatures-vak" aria-label={w.kruimelVacatures} className="scroll-mt-28 bg-white">
        <div className={`${BREED} flex flex-col gap-8 py-14 md:py-[96px]`}>
          <h2 className={`${kop} m-0 text-[32px] tracking-[-0.8px] md:text-[40px]`}>{w.kruimelVacatures}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {hier.map((a) => {
              const at = vacatureInTaal(a, taal);
              return (
                <Link key={a.id} href={p.vacature(a.slug)} className="hv-btn flex flex-col gap-2.5 rounded-[24px] border p-7" style={{ borderColor: LINE }}>
                  <span className={`${kop} text-[22px]`} lang={at.taal !== taal ? at.taal : undefined}>{at.title}</span>
                  {at.intro && <span className="text-[15.5px] leading-[1.6]" style={{ color: BODY }} lang={at.taal !== taal ? at.taal : undefined}>{at.intro}</span>}
                  <span className="mt-1 inline-flex items-center gap-2 text-[14.5px] font-bold">{d.bekijkVacature} <Pijl /></span>
                </Link>
              );
            })}
            <Link href={p.open} className="hv-btn flex flex-col gap-2.5 rounded-[24px] border-2 border-dashed p-7" style={{ borderColor: "#D9D8E6" }}>
              <span className={`${kop} text-[22px]`}>{w.openKaartKop}</span>
              <span className="text-[15.5px] leading-[1.6]" style={{ color: BODY }}>{d.openKaartTekst}</span>
              <span className="mt-1 inline-flex items-center gap-2 text-[14.5px] font-bold">{d.altijdWelkom} <Pijl /></span>
            </Link>
          </div>
        </div>
      </section>

      {faq.length > 0 && (
        <section aria-label={w.opbouw.faq} style={{ background: SOFT }}>
          <div className={`${BREED} grid gap-8 py-14 md:py-[96px] lg:grid-cols-12 lg:gap-6`}>
            <div className="flex flex-col gap-5 lg:col-span-4">
              <h2 className={`${kop} m-0 text-[32px] tracking-[-0.8px] md:text-[40px]`}>{w.opbouw.faq}</h2>
              <Eigenaar taal={taal} groot />
            </div>
            <div className="flex flex-col gap-3 lg:col-span-7 lg:col-start-6">
              {faq.map((f) => (
                <details key={f.vraag} className="rounded-[20px] bg-white p-6">
                  <summary className="cursor-pointer list-none text-[17px] font-bold" style={{ color: NAVY }}>{f.vraag}</summary>
                  <p className="m-0 mt-3 text-[16px] leading-[1.7]" style={{ color: BODY }}>{f.antwoord}</p>
                </details>
              ))}
            </div>
          </div>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqLd(faq)) }} />
        </section>
      )}
    </div>
  );
}

/** Links naar alle vakgebiedpagina's, voor op Werken bij. */
export function VakgebiedLinks({ taal = "nl" }: { taal?: Taal }) {
  const p = paden(taal);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {VAKGEBIEDEN.map((g) => (
        <Link key={g.slug} href={p.vakgebied(g.slug)} className="hv-btn flex items-center justify-between gap-3 rounded-[20px] border p-5 text-[16px] font-bold" style={{ borderColor: LINE, color: NAVY }}>
          {g[taal].titel} <Pijl />
        </Link>
      ))}
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
            <Eigenaar taal={taal} groot kop={w.aanspreekpunt} />
          </div>
          <div className="relative rounded-[24px] bg-white p-6 shadow-[0_30px_60px_-30px_rgba(50,46,131,0.35)] md:p-10 lg:col-span-6 lg:col-start-7">
            <Solliciteren keuzes={[]} vast={{ id: "", title: t.formulier.sollicitatie.open }} kopTekst={o.formKop} />
          </div>
        </div>
      </section>
      <div className="pb-14 md:pb-[112px]" />
    </div>
  );
}
