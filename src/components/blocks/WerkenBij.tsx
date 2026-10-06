import Link from "next/link";
import type { Vacancy } from "@/lib/types";
import { MiniMarkdown } from "@/lib/md";
import { outfit } from "./HomeVerhaal";
import Solliciteren from "./Solliciteren";
import {
  NAVY, PINK, TEAL, BODY, MUTE, LINE, SOFT, LAV, kop, BREED,
  Eyebrow, Kruimels, KopBlok, Knop, Pijl, Vink, KlantenStrook,
} from "./Gedeeld";

/* eslint-disable @next/next/no-img-element */

/*
 * Werken bij React2u en de vacaturepagina (canvas: "Werken bij" en
 * "Vacature", versie B). De vacatures zelf komen uit de admin
 * (tabel `vacancies`): titel, intro, locatie, uren, salaris en de tekst.
 * Wat de admin leeg laat, verschijnt niet; er staan dus nooit lege vakjes.
 */

const SUSANNE = { naam: "Susanne Linders", rol: "Algemeen directeur", tel: "06 12479720", telHref: "tel:+31612479720", mail: "susanne@react2u.nl" };

function Chip({ children, tint = SOFT }: { children: React.ReactNode; tint?: string }) {
  return <span className="inline-flex items-center rounded-full px-3 py-[7px] text-[13.5px] font-bold" style={{ background: tint, color: NAVY }}>{children}</span>;
}

function Susanne({ licht }: { licht?: boolean }) {
  const kleur = licht ? "#ffffff" : NAVY;
  return (
    <div className="flex flex-col gap-4 rounded-[20px] p-5" style={{ background: licht ? "rgba(255,255,255,0.08)" : SOFT, border: licht ? "1px solid rgba(255,255,255,0.14)" : "none" }}>
      <div className="flex items-center gap-3.5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[16px] font-bold" style={{ background: licht ? "#ffffff" : LAV, color: NAVY }}>SL</span>
        <span className="flex flex-col">
          <span className="text-[12.5px]" style={{ color: licht ? "rgba(255,255,255,0.65)" : MUTE }}>Je aanspreekpunt</span>
          <span className="text-[16px] font-bold" style={{ color: kleur }}>{SUSANNE.naam}</span>
          <span className="text-[13.5px]" style={{ color: licht ? "rgba(255,255,255,0.7)" : BODY }}>{SUSANNE.rol} · {SUSANNE.tel}</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <a href={SUSANNE.telHref} className="inline-flex h-11 items-center justify-center rounded-full bg-white text-[14.5px] font-bold" style={{ color: NAVY }}>Bellen</a>
        <a href={`mailto:${SUSANNE.mail}`} className="inline-flex h-11 items-center justify-center rounded-full border text-[14.5px] font-bold"
          style={{ color: kleur, borderColor: licht ? "rgba(255,255,255,0.4)" : "#D9D8E6" }}>Mailen</a>
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

const VOORDELEN = [
  ["Arbeidsvoorwaarden", "Een eigen arbeidsvoorwaardenregeling, afgestemd op ons vak en ons team."],
  ["Opleiding en ontwikkeling", "Opleidingen en begeleiding om je vak verder te ontwikkelen."],
  ["Een eigen caseload", "Je bouwt een band op met je klanten en hun mensen, als vast gezicht."],
  ["Goed ingewerkt", "Je start naast ervaren collega’s die je wegwijs maken."],
  ["Korte lijnen met de bedrijfsarts", "Je werkt nauw samen met de bedrijfsarts, ook bij taakdelegatie."],
  ["Kantoor in hartje Eindhoven", "Een betrokken team op loopafstand van het centrum, waar je snel schakelt."],
];

const STAPPEN = [
  ["Solliciteren", "Stuur je cv en een korte motivatie via de vacature."],
  ["Kennismaking", "Een eerste gesprek bij ons op kantoor."],
  ["Tweede gesprek", "We gaan dieper in op de functie en je maakt kennis met het team."],
  ["Aanbod", "Klikt het? Dan bespreken we je contract en startdatum."],
];

const DIENSTVERBAND: Record<string, string> = { FULL_TIME: "Fulltime", PART_TIME: "Parttime", CONTRACTOR: "Freelance", TEMPORARY: "Tijdelijk", INTERN: "Stage" };

function kenmerken(v: Vacancy) {
  return [v.location, v.hours].filter(Boolean).join(" · ");
}

/* ---------- Werken bij React2u (/vacatures) ---------- */

export function WerkenBijPagina({ vacatures }: { vacatures: Vacancy[] }) {
  const keuzes = vacatures.map((v) => ({ id: v.id, title: v.title }));
  return (
    <div className={`hv ${outfit.variable} bg-white`} style={{ color: NAVY }}>
      {/* 1. Kop met de open vacatures */}
      <section aria-label="Werken bij React2u" className={`${BREED} grid gap-10 pt-10 md:pt-14 lg:grid-cols-12 lg:items-center lg:gap-6`}>
        <div className="flex flex-col gap-6 lg:col-span-5">
          <Kruimels items={[{ label: "Home", href: "/" }, { label: "Werken bij" }]} />
          <Eyebrow>Werken bij React2u</Eyebrow>
          <h1 className={`${kop} m-0 text-[44px] leading-[1.02] tracking-[-1.4px] md:text-[60px] md:tracking-[-1.8px]`}>Bouw met ons aan gezond en duurzaam werk</h1>
          <p className="m-0 text-[17px] leading-[1.65] md:text-[18px]" style={{ color: BODY }}>
            Bij React2u help je zieke werknemers terug naar werk en werkgevers grip te houden op verzuim. Werk dat ertoe doet, elke dag.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Knop href="#vacatures">Bekijk vacatures</Knop>
            <Knop href="#solliciteren" rand>Open sollicitatie</Knop>
          </div>
          <Micro items={["Solliciteren in 2 minuten", "Geen motivatiebrief nodig", "Reactie binnen 5 werkdagen"]} />
        </div>
        <div className="relative h-[420px] overflow-hidden rounded-[28px] md:h-[560px] lg:col-span-6 lg:col-start-7">
          <img src="/beeld/home/samen-leren.webp" alt="Collega’s van React2u lachen samen aan tafel" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 35%" }} />
          {vacatures.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-1 rounded-[20px] bg-white p-5 shadow-[0_30px_60px_-30px_rgba(50,46,131,0.45)] md:bottom-6 md:left-auto md:right-6 md:w-[340px]">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[15px] font-bold">Open vacatures</span>
                <span className="rounded-full px-2.5 py-1 text-[12.5px] font-bold" style={{ background: "#FDECF4", color: PINK }}>{vacatures.length} open</span>
              </div>
              {vacatures.map((v, i) => (
                <Link key={v.id} href={`/vacatures/${v.slug}`} className="hv-btn group flex items-center justify-between gap-3 border-t py-3" style={{ borderColor: LINE }}>
                  <span className="flex items-start gap-2.5">
                    <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: i % 2 ? TEAL : PINK }} />
                    <span className="flex flex-col">
                      <span className="text-[15px] font-bold">{v.title}</span>
                      {kenmerken(v) && <span className="text-[13px]" style={{ color: MUTE }}>{kenmerken(v)}</span>}
                    </span>
                  </span>
                  <span style={{ color: MUTE }}><Pijl /></span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="pt-10" />
      <KlantenStrook label="Je werkt voor organisaties als" />

      {/* 2. Wat je bij ons krijgt */}
      <section aria-label="Wat je bij ons krijgt" style={{ background: SOFT }}>
        <div className={`${BREED} flex flex-col gap-10 py-20 md:gap-12 md:py-[104px]`}>
          <KopBlok eyebrow="Wat je bij ons krijgt" kopTekst="Een werkgever waar je op kunt bouwen" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {VOORDELEN.map(([t, x]) => (
              <div key={t} className="flex flex-col gap-2.5 rounded-[22px] bg-white p-7">
                <span className="text-[18px] font-bold">{t}</span>
                <span className="text-[15.5px] leading-[1.6]" style={{ color: BODY }}>{x}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Je werk */}
      <section aria-label="Je werk" className="bg-white">
        <div className={`${BREED} grid gap-10 py-20 md:py-[112px] lg:grid-cols-12 lg:items-center lg:gap-6`}>
          <div className="relative h-[340px] overflow-hidden rounded-[28px] md:h-[480px] lg:col-span-6">
            <img src="/beeld/werkgevers/gezonde-werkplek.webp" alt="Twee collega’s overleggen samen achter een beeldscherm" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 40%" }} loading="lazy" />
          </div>
          <div className="flex flex-col gap-5 lg:col-span-5 lg:col-start-8">
            <Eyebrow>Je werk</Eyebrow>
            <h2 className={`${kop} m-0 text-[34px] leading-[1.1] tracking-[-0.9px] md:text-[44px]`}>Persoonlijk, met structuur eromheen</h2>
            <p className="m-0 text-[17px] leading-[1.7]" style={{ color: BODY }}>
              Je bent de spil tussen werkgever, werknemer en bedrijfsarts. Je houdt regie over het verzuim en zorgt dat iedereen weet wat de volgende stap is.
            </p>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {["Gesprekken met werknemers en leidinggevenden, op locatie of online", "Werken volgens de Wet verbetering poortwachter, met duidelijke processen", "Alles in één online dossier, zodat je overzicht houdt", "De juiste hulp inzetten, van arbeidsdeskundige tot coach"].map((t) => (
                <li key={t} className="flex gap-3 text-[16px] leading-[1.55]" style={{ color: BODY }}>
                  <span className="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full" style={{ background: "#E5F5F4", color: TEAL }}><Vink size={13} /></span>{t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 4. Vacatures */}
      <section id="vacatures" aria-label="Vacatures" className="scroll-mt-28" style={{ background: SOFT }}>
        <div className={`${BREED} flex flex-col gap-10 py-20 md:py-[104px]`}>
          <KopBlok eyebrow="Vacatures" kopTekst={vacatures.length ? "Kom ons team versterken" : "Nu geen openstaande vacatures"}
            tekst={vacatures.length ? "We breiden ons team uit. Voor deze functies zoeken we nu nieuwe collega’s." : "Maar we komen altijd graag in contact met talent."} />
          <div className="flex flex-col gap-4">
            {vacatures.map((v, i) => (
              <Link key={v.id} href={`/vacatures/${v.slug}`}
                className="hv-btn group flex flex-col gap-5 rounded-[24px] bg-white p-7 md:flex-row md:items-center md:justify-between md:p-9">
                <span className="flex flex-col gap-2.5">
                  <span className={`${kop} flex items-center gap-3 text-[24px] md:text-[28px]`}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: i % 2 ? TEAL : PINK }} />{v.title}
                  </span>
                  {v.intro && <span className="max-w-[640px] text-[16px] leading-[1.6]" style={{ color: BODY }}>{v.intro}</span>}
                </span>
                <span className="flex flex-wrap items-center gap-2 md:flex-nowrap">
                  {v.location && <Chip>{v.location}</Chip>}
                  {v.hours && <Chip>{v.hours}</Chip>}
                  {v.salary && <Chip>{v.salary}</Chip>}
                  <span className="ml-2 grid h-12 w-12 shrink-0 place-items-center rounded-full text-white transition-colors group-hover:bg-[#E61674]" style={{ background: NAVY }}><Pijl /></span>
                </span>
              </Link>
            ))}
            <a href="#solliciteren" className="flex flex-col gap-3 rounded-[24px] border-2 border-dashed bg-white/50 p-7 md:flex-row md:items-center md:justify-between md:p-9" style={{ borderColor: "#D9D8E6" }}>
              <span className="flex flex-col gap-1.5">
                <span className={`${kop} text-[22px]`}>Open sollicitatie</span>
                <span className="text-[16px]" style={{ color: BODY }}>Vertel ons wie je bent en wat je zoekt. We nemen altijd contact met je op.</span>
              </span>
              <span className="inline-flex items-center gap-2 text-[15px] font-bold">Stuur je sollicitatie <Pijl /></span>
            </a>
          </div>
        </div>
      </section>

      {/* 5. Zo solliciteer je */}
      <section aria-label="Sollicitatieproces" className="bg-white">
        <div className={`${BREED} flex flex-col gap-12 py-20 md:py-[104px]`}>
          <KopBlok eyebrow="Sollicitatieproces" kopTekst="Zo solliciteer je" tekst="Helder en persoonlijk. Je weet bij elke stap waar je staat." />
          <ol className="m-0 grid list-none gap-8 p-0 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {STAPPEN.map(([t, x], i) => (
              <li key={t} className="flex flex-col gap-3">
                <span className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] font-bold text-white" style={{ background: NAVY }}>{i + 1}</span>
                  {i < STAPPEN.length - 1 && <span className="hidden h-0.5 flex-1 lg:block" style={{ background: LINE }} />}
                </span>
                <span className="text-[19px] font-bold">{t}</span>
                <span className="text-[15.5px] leading-[1.6]" style={{ color: BODY }}>{x}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6. Snel solliciteren */}
      <section id="solliciteren" aria-label="Snel solliciteren" className="scroll-mt-28 bg-white">
        <div className={`${BREED} pb-20 md:pb-[112px]`}>
          <div className="relative grid gap-10 overflow-hidden rounded-[28px] p-6 md:rounded-[32px] md:p-16 lg:grid-cols-12 lg:items-center lg:gap-6" style={{ background: NAVY }}>
            <span aria-hidden className="absolute bottom-[-200px] left-[-160px] h-[520px] w-[520px] rounded-full" style={{ background: "radial-gradient(circle, rgba(180,173,242,0.30), rgba(180,173,242,0) 70%)" }} />
            <div className="relative flex flex-col gap-5 lg:col-span-5">
              <Eyebrow kleur="#F7A8CB">Solliciteren</Eyebrow>
              <h2 className={`${kop} m-0 text-[36px] leading-[1.05] tracking-[-1.2px] md:text-[48px]`} style={{ color: "#ffffff" }}>Zin om bij ons te werken?</h2>
              <p className="m-0 text-[17px] leading-[1.7]" style={{ color: "rgba(255,255,255,0.75)" }}>
                Kies de functie en laat je gegevens achter. Je hoort binnen vijf werkdagen van ons. Liever eerst even praten? Bel of mail Susanne.
              </p>
              <Micro licht items={["Geen motivatiebrief", "Eerst kennismaken mag"]} />
              <Susanne licht />
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

/* ---------- Vacaturepagina (/vacatures/[slug]) ---------- */

export function VacatureDetail({ v, andere }: { v: Vacancy; andere: Vacancy[] }) {
  const kerncijfers = [
    v.salary ? [v.salary, "Bruto per maand, afhankelijk van ervaring"] : null,
    v.hours ? [v.hours, "Per week, in overleg"] : null,
    [v.location || "Eindhoven", "Op kantoor, op locatie en online"],
    ["5 werkdagen", "Dan hoor je van ons"],
  ].filter(Boolean) as string[][];
  return (
    <div className={`hv ${outfit.variable} bg-white`} style={{ color: NAVY }}>
      {/* 1. Kop met het belangrijkste */}
      <section aria-label="Vacature" className="px-[6px] pt-4 md:px-10 md:pt-8 lg:px-[120px] xl:mx-auto xl:max-w-[1440px]">
        <div className="relative grid gap-10 overflow-hidden rounded-[28px] px-6 py-10 md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center lg:gap-[72px] lg:p-[72px]" style={{ background: LAV }}>
          <span aria-hidden className="absolute right-[-140px] top-[-170px] h-[560px] w-[560px] rounded-full" style={{ background: NAVY, opacity: 0.07 }} />
          <div className="relative flex flex-col gap-6">
            <Kruimels items={[{ label: "Werken bij", href: "/vacatures" }, { label: "Vacatures", href: "/vacatures#vacatures" }, { label: v.title }]} />
            <h1 className={`${kop} m-0 text-[44px] leading-[1] tracking-[-1.4px] md:text-[64px] md:tracking-[-2px]`}>{v.title}</h1>
            {v.intro && <p className="m-0 max-w-[520px] text-[17px] leading-[1.65] md:text-[19px]" style={{ color: BODY }}>{v.intro}</p>}
            <div className="flex flex-wrap items-center gap-5 pt-1">
              <Knop href="#solliciteren">Solliciteer direct</Knop>
              <span className="text-[15px]" style={{ color: MUTE }}>Duurt een minuut</span>
            </div>
          </div>
          <div className="relative flex flex-col rounded-[24px] bg-white px-7 pb-4 pt-3 md:px-8">
            <span className="pb-1.5 pt-5 text-[15px] font-bold">Het belangrijkste</span>
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
      <section aria-label="Vacaturetekst" className="bg-white">
        <div className={`${BREED} grid gap-12 py-20 md:py-[104px] lg:grid-cols-12 lg:gap-6`}>
          <div className="vacature-tekst lg:col-span-7" style={{ color: BODY }}>
            <MiniMarkdown text={v.description_md || ""} className="text-[17px] leading-[1.75]" kop="h2" />
          </div>
          <aside className="h-fit lg:sticky lg:top-[calc(var(--hh,96px)+24px)] lg:col-span-4 lg:col-start-9">
            <div className="flex flex-col gap-5 rounded-[24px] p-7" style={{ background: SOFT }}>
              <span className={`${kop} text-[22px]`}>{v.title}</span>
              <dl className="m-0 flex flex-col">
                {[["Locatie", v.location], ["Uren", v.hours], ["Salaris", v.salary], ["Dienstverband", DIENSTVERBAND[v.employment_type] || v.employment_type]].filter(([, w]) => w).map(([l, w]) => (
                  <div key={l} className="flex justify-between gap-4 border-t py-3 text-[15px]" style={{ borderColor: LINE }}>
                    <dt style={{ color: MUTE }}>{l}</dt><dd className="m-0 text-right font-bold">{w}</dd>
                  </div>
                ))}
              </dl>
              <Knop href="#solliciteren">Solliciteer direct</Knop>
              <a href={SUSANNE.telHref} className="flex items-center gap-3 border-t pt-4 text-[14.5px]" style={{ borderColor: LINE, color: BODY }}>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-[14px] font-bold" style={{ color: NAVY }}>SL</span>
                <span className="flex flex-col"><span>Vragen? Bel Susanne</span><span className="font-bold" style={{ color: NAVY }}>{SUSANNE.tel}</span></span>
              </a>
            </div>
          </aside>
        </div>
      </section>

      {/* 3. Solliciteren */}
      <section id="solliciteren" aria-label="Solliciteren" className="scroll-mt-28" style={{ background: SOFT }}>
        <div className={`${BREED} grid gap-10 py-20 md:py-[104px] lg:grid-cols-12 lg:items-start lg:gap-6`}>
          <div className="flex flex-col gap-5 lg:col-span-5">
            <h2 className={`${kop} m-0 text-[34px] leading-[1.1] tracking-[-0.9px] md:text-[44px]`}>Solliciteren duurt een minuut</h2>
            <p className="m-0 text-[17px] leading-[1.7]" style={{ color: BODY }}>
              Laat je gegevens achter en upload je cv. Je hoort binnen vijf werkdagen van ons. Een motivatiebrief is niet nodig.
            </p>
            <Susanne />
          </div>
          <div className="rounded-[24px] bg-white p-6 md:p-10 lg:col-span-6 lg:col-start-7">
            <Solliciteren keuzes={[]} vast={{ id: v.id, title: v.title }} kopTekst="Solliciteer direct" duur="1 minuut" />
          </div>
        </div>
      </section>

      {/* 4. Andere vacatures */}
      <section aria-label="Andere vacatures" className="bg-white">
        <div className={`${BREED} flex flex-col gap-8 py-20 md:py-[96px]`}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className={`${kop} m-0 text-[30px] tracking-[-0.6px] md:text-[36px]`}>Bekijk ook</h2>
            <Link href="/vacatures" className="inline-flex items-center gap-2 text-[15px] font-bold underline underline-offset-4" style={{ textDecorationColor: "rgba(50,46,131,0.35)" }}>Alles over werken bij React2u <Pijl /></Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {andere.map((a) => (
              <Link key={a.id} href={`/vacatures/${a.slug}`} className="hv-btn flex flex-col gap-2.5 rounded-[24px] border p-7" style={{ borderColor: LINE }}>
                <span className={`${kop} text-[22px]`}>{a.title}</span>
                {a.intro && <span className="text-[15.5px] leading-[1.6]" style={{ color: BODY }}>{a.intro}</span>}
                <span className="mt-1 inline-flex items-center gap-2 text-[14.5px] font-bold">Bekijk vacature <Pijl /></span>
              </Link>
            ))}
            <Link href="/vacatures#solliciteren" className="hv-btn flex flex-col gap-2.5 rounded-[24px] border-2 border-dashed p-7" style={{ borderColor: "#D9D8E6" }}>
              <span className={`${kop} text-[22px]`}>Open sollicitatie</span>
              <span className="text-[15.5px] leading-[1.6]" style={{ color: BODY }}>Zie je jouw functie er niet tussen? Vertel ons wie je bent en wat je zoekt.</span>
              <span className="mt-1 inline-flex items-center gap-2 text-[14.5px] font-bold">Altijd welkom <Pijl /></span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
