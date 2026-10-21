import Link from "next/link";
import type { Vacancy } from "@/lib/types";
import { MiniMarkdown } from "@/lib/md";
import { OPEN_SOLLICITATIE, pad, vul, type Taal } from "@/lib/taal";
import { woordenboek } from "@/lib/woordenboek";
import { faqLd, faqParen, isOpdracht, kenmerkInTaal, opbouwInTaal, salarisKort, salarisRest, splitsVragen, vacatureInTaal } from "@/lib/vacatures";
import { jsonLd } from "@/lib/jsonld";
import { VAKGEBIEDEN, vakgebiedVan, type Vakgebied } from "@/lib/vakgebieden";
import { outfit } from "./HomeVerhaal";
import Solliciteren from "./Solliciteren";
import SolliciteerBalk from "./SolliciteerBalk";
import { LuBriefcase, LuChevronDown, LuChevronLeft, LuChevronRight, LuClock, LuEuro, LuGraduationCap, LuMapPin } from "react-icons/lu";
import VacatureZoeker, { Kaart, type VacatureKaart, type ZoekLabels } from "./VacatureOverzicht";
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

/** Contact bij vacatures en de open sollicitatie (vaste naam, niet vertaald). */
const EIGENAAR = { naam: "Rens van Eyck", mail: "rens@react2u.nl", whatsapp: "31645064277" };

/** Een sectie van de vacaturetekst; leeg = niet tonen. */
/** Kop van een sectie in de vacaturetekst; overal dezelfde maat, voor rust. */
const SECTIEKOP = `${kop} m-0 mb-4 text-[24px] tracking-[-0.5px] md:text-[28px]`;

function TekstSectie({ kop: titel, md, lang }: { kop: string; md: string; lang?: string }) {
  if (!md) return null;
  return (
    <div className="vacature-tekst" lang={lang}>
      <h2 className={SECTIEKOP} style={{ color: NAVY }}>{titel}</h2>
      <MiniMarkdown text={md} className="text-[17px] leading-[1.75]" kop="h3" />
    </div>
  );
}

/** "Wat wij vragen": de eisen en "Mooi meegenomen" naast elkaar; zonder die splitsing gewoon een sectie. */
function Vragen({ kop: titel, moetKop, md, lang }: { kop: string; moetKop: string; md: string; lang?: string }) {
  const delen = splitsVragen(md);
  if (!delen) return <TekstSectie kop={titel} md={md} lang={lang} />;
  return (
    <div className="vacature-tekst" lang={lang}>
      <h2 className={SECTIEKOP} style={{ color: NAVY }}>{titel}</h2>
      <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <h3 className="m-0 text-[16px] font-bold" style={{ color: NAVY }}>{moetKop}</h3>
          <MiniMarkdown text={delen.eisen} className="text-[16.5px] leading-[1.65]" kop="h3" />
        </div>
        <div className="vacature-plus flex flex-col gap-1">
          <h3 className="m-0 text-[16px] font-bold" style={{ color: NAVY }}>{delen.extraKop}</h3>
          <MiniMarkdown text={delen.extra} className="text-[16.5px] leading-[1.65]" kop="h3" />
        </div>
      </div>
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
        <WhatsAppIcoon />
        {ob.whatsappKnop}
      </a>
    </div>
  );
}

function WhatsAppIcoon({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>
  );
}

/** Contact op de vacaturepagina: klein en rustig, mail en WhatsApp als links. */
function ContactRegel({ taal }: { taal: Taal }) {
  const ob = woordenboek(taal).vacatures.opbouw;
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[14px] font-bold" style={{ background: LAV, color: NAVY }}>RE</span>
      <span className="flex min-w-0 flex-col gap-1 text-[14.5px]">
        <span className="font-bold" style={{ color: NAVY }}>{EIGENAAR.naam} <span className="font-normal" style={{ color: MUTE }}>· {ob.contactRol}</span></span>
        <a href={`mailto:${EIGENAAR.mail}`} className="underline-offset-4 hover:underline" style={{ color: NAVY }}>{EIGENAAR.mail}</a>
        <a href={`https://wa.me/${EIGENAAR.whatsapp}?text=${encodeURIComponent(ob.whatsappTekst)}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-semibold underline-offset-4 hover:underline" style={{ color: "#128C4A" }}>
          <WhatsAppIcoon size={15} />{ob.whatsappKnop}
        </a>
      </span>
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

/** Vaste volgorde van de vacatures: per vakgebied zoals in VAKGEBIEDEN, daarbinnen op titel. */
function sorteer(vacatures: Vacancy[], taal: Taal): Vacancy[] {
  const plek = (v: Vacancy) => {
    const i = VAKGEBIEDEN.findIndex((g) => g.slug === vakgebiedVan(v.vakgebied)?.slug);
    return i < 0 ? VAKGEBIEDEN.length : i;
  };
  return [...vacatures].sort((a, b) => plek(a) - plek(b) ||
    vacatureInTaal(a, taal).title.localeCompare(vacatureInTaal(b, taal).title, taal));
}

/** "32-40 uur" wordt [32, 40]; "24 uur" wordt [24, 24]; anders niets. */
function urenVan(hours: string | null): [number, number] | undefined {
  const m = (hours || "").match(/(\d+)(?:\s*[-–]\s*(\d+))?/);
  return m ? [Number(m[1]), Number(m[2] ?? m[1])] : undefined;
}

/** Een vacature als kaartje voor het overzicht en "Vergelijkbare vacatures". */
function kaartVan(v: Vacancy, taal: Taal): VacatureKaart {
  const w = woordenboek(taal).vacatures;
  const tekst = vacatureInTaal(v, taal);
  const g = vakgebiedVan(v.vakgebied);
  const s = salarisKort(v.salary, taal);
  const uren = urenVan(v.hours);
  const soort = v.employment_type === "CONTRACTOR" ? "zzp" : v.employment_type === "INTERN" ? "stage" : "vast";
  const opleiding = (v.opleidingsniveau || "").toLowerCase();
  const vorm = w.dienstverband[v.employment_type];
  return {
    id: v.id,
    href: paden(taal).vacature(v.slug),
    titel: tekst.title,
    lang: tekst.taal !== taal ? tekst.taal : undefined,
    groep: g?.slug ?? "overig",
    groepNaam: g ? g[taal].kort : v.vakgebied || "",
    locatie: v.location || w.detail.standaardLocatie,
    uren: kenmerkInTaal(v.hours, taal) || undefined,
    urenMin: uren?.[0],
    urenMax: uren?.[1],
    opleiding: kenmerkInTaal(v.opleidingsniveau ?? null, taal) || undefined,
    niveaus: (["mbo", "hbo", "wo"] as const).filter((n) => new RegExp(`\\b${n}\\b`).test(opleiding)),
    soort,
    soortNaam: soort === "vast" && vorm ? `${w.zoeker.soorten.vast}, ${vorm.toLowerCase()}` : w.zoeker.soorten[soort],
    ...(s ? s : { salarisTekst: kenmerkInTaal(v.salary, taal) || undefined }),
    concept: v.status === "draft",
    anders: tekst.taal !== taal,
    zoek: [tekst.title, v.title, g?.[taal].kort, v.vakgebied, tekst.intro, v.opleidingsniveau].filter(Boolean).join(" ").toLowerCase(),
  };
}

/** De vaste teksten voor VacatureZoeker en Kaart. */
function zoekLabels(taal: Taal): ZoekLabels {
  const w = woordenboek(taal).vacatures;
  return {
    ...w.zoeker,
    geenVacaturesKop: w.geenVacaturesKop,
    geenVacaturesTekst: w.geenVacaturesTekst,
    concept: w.conceptLabel,
    inHetNederlands: w.inHetNederlandsKort,
    bekijk: w.detail.bekijkVacature,
  };
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
  // Voor het formulier: in de vaste volgorde en met het vakgebied, zodat de keuzelijst per vakgebied kan groeperen.
  const keuzes = sorteer(vacatures, taal).map((v) => ({
    id: v.id, title: vacatureInTaal(v, taal).title,
    groep: vakgebiedVan(v.vakgebied)?.[taal].kort ?? "", open: v.slug === OPEN_SOLLICITATIE.nl,
  }));
  const kaarten = sorteer(vacatures, taal).map((v) => kaartVan(v, taal));
  const groepen = VAKGEBIEDEN.filter((g) => kaarten.some((k) => k.groep === g.slug)).map((g) => ({ slug: g.slug, naam: g[taal].kort }));
  return (
    <div className={`hv ${outfit.variable} bg-white`} style={{ color: NAVY }}>
      {/* 1. Zoeken, filteren en de vacatures, zoals bij de grote uitzendbureaus */}
      <VacatureZoeker kaarten={kaarten} groepen={groepen} labels={zoekLabels(taal)}
        kop={(
          <>
            <Kruimels items={[{ label: t.algemeen.home, href: p.home }, { label: w.kruimelWerkenBij }]} taal={taal} />
            <Eyebrow>{w.eyebrow}</Eyebrow>
            <h1 className={`${kop} m-0 text-[40px] leading-[1.04] tracking-[-1.3px] md:text-[56px] md:tracking-[-1.7px]`}>{w.kop}</h1>
            <p className="m-0 max-w-[560px] text-[17px] leading-[1.65] md:text-[18px]" style={{ color: BODY }}>{w.intro}</p>
          </>
        )}
        onderZoek={<Micro items={w.micro} />}
        beeld={<Beeld src="/beeld/home/samen-leren.webp" alt={w.fotoTeamAlt} fill priority sizes="(min-width: 1024px) 40vw, 100vw" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 35%" }} />}
        onderaan={(
          <>
            <a href="#solliciteren" className="flex flex-col gap-3 rounded-[22px] border-2 border-dashed bg-white/60 p-7 md:flex-row md:items-center md:justify-between" style={{ borderColor: "#D9D8E6" }}>
              <span className="flex flex-col gap-1.5">
                <span className={`${kop} text-[22px]`}>{w.openKaartKop}</span>
                <span className="text-[16px]" style={{ color: BODY }}>{w.openKaartTekst}</span>
              </span>
              <span className="inline-flex items-center gap-2 text-[15px] font-bold">{w.openKaartLink} <Pijl /></span>
            </a>
            <div className="flex flex-col gap-4 pt-4">
              <span className="text-[15px] font-bold">{w.opbouw.vakgebiedenKop}</span>
              <VakgebiedLinks taal={taal} />
            </div>
          </>
        )} />

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
  // Nieuwe opbouw (migratie 0017); zonder secties blijft de oude weergave staan.
  const o = opbouwInTaal(v, taal);
  const ob = w.opbouw;
  const opdracht = isOpdracht(v);
  // Het vaste pakket geldt voor loondienst; niet voor ZZP-opdrachten en stages.
  const vastPakket = !opdracht && v.employment_type !== "INTERN";
  const oLang = o && o.taal !== taal ? o.taal : undefined;
  const faq = o ? faqParen(o.faq) : [];
  // De zijkolom vult de kop aan; plaats, uren en opleiding staan daar al.
  const zijFeiten = ([
    [ob.vakgebied, vakgebiedVan(v.vakgebied)?.[taal].kort ?? v.vakgebied],
    [ob.contract, v.contractvorm],
    [ob.ervaring, kenmerkInTaal(v.ervaringsniveau ?? null, taal)],
  ] as [string, string | null | undefined][]).filter(([, x]) => x) as [string, string][];
  const stappen = opdracht ? ob.stappenOpdracht : ob.stappen;
  const vg = vakgebiedVan(v.vakgebied);
  // Dezelfde volgorde als het overzicht, voor "vorige / volgende" en vergelijkbare vacatures.
  const alle = sorteer([v, ...andere.filter((x) => x.id !== v.id)], taal);
  const plek = alle.findIndex((x) => x.id === v.id);
  const vorige = plek > 0 ? alle[plek - 1] : null;
  const volgende = plek >= 0 && plek < alle.length - 1 ? alle[plek + 1] : null;
  const zelfdeVak = alle.filter((x) => x.id !== v.id && vg && vakgebiedVan(x.vakgebied)?.slug === vg.slug);
  const vergelijkbaar = [...zelfdeVak, ...alle.filter((x) => x.id !== v.id && !zelfdeVak.includes(x))].slice(0, 3).map((x) => kaartVan(x, taal));
  const k = kaartVan(v, taal);
  const feiten: [React.ReactNode, React.ReactNode][] = [
    [<LuMapPin key="i" aria-hidden />, k.locatie],
    ...(k.bedrag ? [[<LuEuro key="i" aria-hidden />, <span key="t"><b className="tabular-nums">{k.bedrag}</b> <span className="font-normal" style={{ color: BODY }}>{k.eenheid}</span></span>] as [React.ReactNode, React.ReactNode]] : []),
    ...(k.uren ? [[<LuClock key="i" aria-hidden />, k.uren] as [React.ReactNode, React.ReactNode]] : []),
    ...(k.opleiding ? [[<LuGraduationCap key="i" aria-hidden />, k.opleiding] as [React.ReactNode, React.ReactNode]] : []),
    [<LuBriefcase key="i" aria-hidden />, k.soortNaam],
  ];
  return (
    <div className={`hv ${outfit.variable} bg-white`} style={{ color: NAVY }}>
      {/* 1. Kop: titel, kerngegevens en solliciteren, zoals bij de grote uitzendbureaus */}
      <section id="vacature-kop" aria-label={w.kruimelVacatures} className="px-[6px] pt-4 md:px-10 md:pt-8 lg:px-16 xl:px-[120px] xl:mx-auto xl:max-w-[1440px]">
        <div className="relative overflow-hidden rounded-[28px] px-6 py-8 md:rounded-[36px] md:px-14 md:py-12 lg:px-[72px] lg:py-[60px]" style={{ background: LAV }}>
          <span aria-hidden className="absolute right-[-140px] top-[-170px] h-[560px] w-[560px] rounded-full" style={{ background: NAVY, opacity: 0.07 }} />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <Kruimels items={[{ label: w.kruimelWerkenBij, href: p.basis }, { label: w.kruimelVacatures, href: p.vacatures }, { label: tekst.title }]} taal={taal} />
              {plek >= 0 && alle.length > 1 && (
                <nav aria-label={vul(d.nVan, { i: plek + 1, n: alle.length })} className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: MUTE }}>
                  {vorige && (
                    <Link href={p.vacature(vorige.slug)} rel="prev" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5" style={{ color: NAVY }}>
                      <LuChevronLeft aria-hidden />{d.vorige}
                    </Link>
                  )}
                  <span className="px-1 tabular-nums">{vul(d.nVan, { i: plek + 1, n: alle.length })}</span>
                  {volgende && (
                    <Link href={p.vacature(volgende.slug)} rel="next" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5" style={{ color: NAVY }}>
                      {d.volgende}<LuChevronRight aria-hidden />
                    </Link>
                  )}
                </nav>
              )}
            </div>
            {anders && (
              <p className="m-0 inline-flex items-center gap-2.5 self-start rounded-full bg-white px-4 py-2 text-[14px] font-bold" style={{ color: NAVY }}>
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: PINK }} />{w.inHetNederlands}
              </p>
            )}
            <div className="flex flex-col gap-3">
              {vg && <span className="text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: PINK }}>{vg[taal].kort}</span>}
              <h1 className={`${kop} m-0 max-w-[900px] text-[40px] leading-[1.02] tracking-[-1.3px] md:text-[60px] md:tracking-[-1.9px]`} lang={langAttr}>{tekst.title}</h1>
            </div>
            {tekst.intro && <p className="m-0 max-w-[720px] text-[17px] leading-[1.65] md:text-[19px]" style={{ color: BODY }} lang={langAttr}>{tekst.intro}</p>}
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {feiten.map(([icoon, inhoud], i) => (
                <li key={i} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[15px] font-semibold" style={{ color: NAVY }}>
                  <span className="text-[16px]" style={{ color: MUTE }}>{icoon}</span>{inhoud}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-5 pt-1">
              <Knop href="#solliciteren">{d.solliciteerDirect}</Knop>
              <span className="text-[15px]" style={{ color: MUTE }}>{d.duurtMinuut}</span>
            </div>
          </div>
        </div>
      </section>

      {o ? (
        <>
          {/* 2. De vacature: één rustige tekstkolom met een vaste kolom ernaast */}
          <section aria-label={tekst.title} className="bg-white">
            <div className={`${BREED} grid gap-12 py-12 md:py-[88px] lg:grid-cols-12 lg:gap-6`}>
              <div className="flex flex-col gap-10 lg:col-span-7 [&>*+*]:border-t [&>*+*]:border-[#E6E5EF] [&>*+*]:pt-10" style={{ color: BODY }}>
                <TekstSectie kop={ob.doen} md={o.doen} lang={oLang} />
                <TekstSectie kop={ob.samen} md={o.samen} lang={oLang} />
                <TekstSectie kop={ob.leuk} md={o.leuk} lang={oLang} />
                <Vragen kop={ob.vragen} moetKop={ob.vragenMoet} md={o.vragen} lang={oLang} />
                <div className="vacature-tekst" lang={oLang}>
                  <h2 className={SECTIEKOP} style={{ color: NAVY }}>{opdracht ? ob.biedenOpdracht : ob.bieden}</h2>
                  {vastPakket && <MiniMarkdown text={ob.aanbod.map((a) => `- ${a}`).join("\n")} className="vacature-kolommen text-[16.5px] leading-[1.65]" kop="h3" />}
                  {o.bieden && (
                    <>
                      {vastPakket && <h3 className="m-0 mb-1 mt-7 text-[16px] font-bold" style={{ color: NAVY }}>{ob.bovenop}</h3>}
                      <MiniMarkdown text={o.bieden} className="text-[16.5px] leading-[1.65]" kop="h3" />
                    </>
                  )}
                </div>
                {o.eerlijk && (
                  <div lang={oLang}>
                    <h2 className={SECTIEKOP} style={{ color: NAVY }}>{ob.eerlijk}</h2>
                    <div className="border-l-2 pl-5" style={{ borderColor: PINK }}>
                      <MiniMarkdown text={o.eerlijk} className="text-[17px] leading-[1.75]" kop="h3" />
                    </div>
                  </div>
                )}
                {faq.length > 0 && (
                  <div lang={oLang}>
                    <h2 className={SECTIEKOP} style={{ color: NAVY }}>{ob.faq}</h2>
                    <div className="flex flex-col">
                      {faq.map((f) => (
                        <details key={f.vraag} className="group border-b py-4 last:border-b-0 last:pb-0" style={{ borderColor: LINE }}>
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16.5px] font-bold [&::-webkit-details-marker]:hidden" style={{ color: NAVY }}>
                            {f.vraag}<LuChevronDown aria-hidden className="shrink-0 transition-transform group-open:rotate-180" />
                          </summary>
                          <p className="m-0 mt-2 text-[16px] leading-[1.7]" style={{ color: BODY }}>{f.antwoord}</p>
                        </details>
                      ))}
                    </div>
                    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqLd(faq)) }} />
                  </div>
                )}
                <Cijfers taal={taal} />
                {vg && (
                  <Link href={p.vakgebied(vg.slug)} className="inline-flex items-center gap-2 self-start text-[15px] font-bold" style={{ color: NAVY }}>
                    {ob.meerOverVak}: {vg[taal].titel} <Pijl />
                  </Link>
                )}
              </div>
              <aside className="h-fit lg:sticky lg:top-[calc(var(--hh,96px)+24px)] lg:col-span-4 lg:col-start-9">
                <div className="flex flex-col gap-5 rounded-[20px] border bg-white p-6 md:p-7" style={{ borderColor: LINE }}>
                  {k.bedrag && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: MUTE }}>{opdracht ? ob.tarief : ob.salaris}</span>
                      <span className={`${kop} text-[24px] tabular-nums`} style={{ color: NAVY }}>{k.bedrag}</span>
                      <span className="text-[14px]" style={{ color: MUTE }}>{salarisRest(v.salary, taal)}</span>
                    </div>
                  )}
                  <dl className="m-0 flex flex-col text-[15px]">
                    {zijFeiten.map(([l, x]) => (
                      <div key={l} className="flex justify-between gap-4 border-t py-2.5" style={{ borderColor: LINE }}>
                        <dt style={{ color: MUTE }}>{l}</dt><dd className="m-0 text-right font-semibold" style={{ color: NAVY }}>{x}</dd>
                      </div>
                    ))}
                  </dl>
                  <Knop href="#solliciteren">{d.solliciteerDirect}</Knop>
                  <div className="flex flex-col gap-3 border-t pt-5" style={{ borderColor: LINE }}>
                    <span className="text-[14px] font-bold" style={{ color: NAVY }}>{ob.contactKop}</span>
                    <ContactRegel taal={taal} />
                  </div>
                </div>
              </aside>
            </div>
          </section>
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

      {/* 3. Solliciteren, met hoe het daarna gaat */}
      <section id="solliciteren" aria-label={w.solliciterenEyebrow} className="scroll-mt-28" style={{ background: SOFT }}>
        <div className={`${BREED} grid gap-10 py-12 md:py-[88px] lg:grid-cols-12 lg:items-start lg:gap-6`}>
          <div className="flex flex-col gap-7 lg:col-span-5">
            <div className="flex flex-col gap-3">
              <h2 className={`${kop} m-0 text-[30px] leading-[1.1] tracking-[-0.8px] md:text-[38px]`}>{d.solliciterenKop}</h2>
              <p className="m-0 text-[17px] leading-[1.7]" style={{ color: BODY }}>{d.solliciterenTekst}</p>
            </div>
            <div className="flex flex-col gap-4">
              <span className="text-[15px] font-bold" style={{ color: NAVY }}>{ob.procedureKop}</span>
              <ol className="m-0 flex list-none flex-col gap-4 p-0">
                {stappen.map((st, i) => (
                  <li key={st.kop} className="flex gap-3.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[13px] font-bold tabular-nums" style={{ color: NAVY }}>{i + 1}</span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[15.5px] font-bold" style={{ color: NAVY }}>{st.kop}</span>
                      <span className="text-[14.5px] leading-[1.55]" style={{ color: BODY }}>{st.tekst}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex flex-col gap-3 border-t pt-6" style={{ borderColor: "#DCDBEA" }}>
              <span className="text-[14px] font-bold" style={{ color: NAVY }}>{ob.contactKop}</span>
              <ContactRegel taal={taal} />
            </div>
          </div>
          <div className="rounded-[24px] bg-white p-6 md:p-10 lg:col-span-6 lg:col-start-7">
            <Solliciteren keuzes={[]} vast={{ id: v.id, title: tekst.title }} kopTekst={t.formulier.sollicitatie.kopDirect} duur={t.formulier.sollicitatie.duur1} />
          </div>
        </div>
      </section>

      {/* 4. Vergelijkbare vacatures */}
      {vergelijkbaar.length > 0 && (
        <section aria-label={d.vergelijkbaarKop} className="bg-white">
          <div className={`${BREED} flex flex-col gap-8 py-12 md:py-[88px]`}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className={`${kop} m-0 text-[28px] tracking-[-0.6px] md:text-[32px]`}>{d.vergelijkbaarKop}</h2>
              <Link href={`${p.basis}#vacatures`} className="inline-flex items-center gap-2 text-[15px] font-bold" style={{ color: NAVY }}>{d.bekijkAlleVacatures} <Pijl /></Link>
            </div>
            <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {vergelijkbaar.map((x) => <li key={x.id} className="flex"><Kaart k={x} labels={zoekLabels(taal)} /></li>)}
            </ul>
          </div>
        </section>
      )}
      <SolliciteerBalk titel={tekst.title} salaris={k.bedrag ? `${k.bedrag} ${k.eenheid}` : undefined} knop={d.solliciteerKort} />
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
