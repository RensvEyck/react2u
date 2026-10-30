"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Caveat, Outfit } from "next/font/google";
import Logo from "@/components/site/Logo";
import Beeld from "@/components/site/Beeld";
import { KEURMERKEN } from "@/components/blocks/Gedeeld";
import { CONTACT_FALLBACK, type ContactInfo } from "@/lib/content";
import type { Certificate } from "@/lib/nav";
import Handtekening from "./Handtekening";
import OfferteTekst from "./OfferteTekst";
import { bewaarKeuze, ondertekenOfferte, vraagCode, wijsOfferteAf } from "@/app/(offerte)/offerte/actions";
import {
  berekenTotalen, datumLang, euro, factuurFout, factuurRegels, herstelKeuze, isNaam, maandprijs, momentLang, normaliseerFactuur,
  normaliseerRegels, normaliseerVervolg, prijsLabel, regelbedrag, secties, wissel, aantalVoor, bedragVoor, vulIn, DIENSTLABEL,
  OFFERTE_EMAIL, ONDERTEKEN_FOUT, VERVOLG_STANDAARD, VORMEN,
  type OffertePubliek, type Regel, type Stap, type Totalen, type Vorm,
} from "@/lib/offertes";

/*
 * De offerte zoals de klant hem ziet (/offerte/<token>), en hetzelfde scherm
 * als voorbeeld in het beheer.
 *
 * Een document, geen webpagina (Rens, 29 okt 2026: "geen foto's van de
 * website, design moet echt verbeterd worden"). Een rustige omslag, daaronder
 * één vel met genummerde hoofdstukken, en rechts een vast beslispaneel met de
 * maandprijs. Het ondertekenen gebeurt onderaan in het document zelf, naast de
 * handtekening van React2u, zoals op de papieren offertes: Opdrachtnemer |
 * Opdrachtgever. Zand, wit en indigo; roze alleen voor de hoofdactie; koppen in
 * Outfit, de handtekening van de afzender in Caveat.
 *
 * Prijzen per maand: wat per jaar loopt staat als maandbedrag, het jaarbedrag
 * klein erbij; eenmalig blijft eenmalig.
 *
 * Modus:
 *  - klant      de echte link: keuze wordt bewaard, tekenen kan;
 *  - collega    een beheerder opent de echte link: niets telt, tekenen niet;
 *  - voorbeeld  vanuit het beheer, ook voor een concept.
 */

const kopLetter = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-offerte-kop", display: "swap" });
const handschrift = Caveat({ subsets: ["latin"], weight: ["600"], display: "swap" });

const NAVY = "#322E83";
const INKT = "#1C1A4E";
const PINK = "#E61674";
const TEAL = "#00A098";
const BODY = "#55536F";
// Minstens 4,5:1 op wit, zacht en zand (het oude #7A7893 haalde dat op zand niet).
const MUTE = "#6B6985";
// Teal als tekst: de merkkleur zelf is te licht voor kleine letters op wit.
const TEAL_TEKST = "#08716B";
const ZAND = "#F4EFE7";
const PAPIER = "#FFFFFF";
const LIJN = "#ECE7DE";
const ZACHT = "#FAF7F2";
const KOP: React.CSSProperties = { fontFamily: "var(--font-offerte-kop), var(--font-heading), sans-serif" };

export type Modus = "klant" | "collega" | "voorbeeld";

const LABEL = DIENSTLABEL;

/** Wat React2u zelf meegeeft: bedrijfsgegevens en certificaten (Instellingen), zoals in de footer van de site. */
type Huis = { contact: ContactInfo; certificaten: Certificate[] };

/**
 * De keurmerken met hun echte logo's (Gedeeld.tsx, dezelfde als in de footer).
 * Staat het certificaat als PDF in Instellingen, dan wordt dat de doorklik.
 */
function keurmerken(certificaten: Certificate[]) {
  const zoek: Record<string, RegExp> = { SBCA: /arbodienst|sbca|managementsysteem/i, "ISO 9001": /9001/, "ISO 27001": /27001/, "ISO 27701": /27701/, OVAL: /oval/i };
  return KEURMERKEN.map((k) => {
    const c = certificaten.find((x) => zoek[k.naam]?.test(`${x.alt} ${x.href} ${x.image}`));
    return { ...k, href: c ? c.href || c.image : "" };
  });
}

const telefoonTekst = (c: ContactInfo) => c.phoneDisplay.replace(/\s*-\s*/, " ");

const veld =
  "h-[52px] w-full rounded-[12px] border border-[#DEDAD2] bg-white px-4 text-[16px] text-[#1C1A4E] outline-none transition-[border-color,box-shadow] placeholder:text-[#A8A5B8] focus:border-[#322E83] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)] disabled:bg-[#F7F5F1] disabled:text-[#A8A5B8]";

/* ---------- kleine bouwstenen ---------- */

function Vink({ size = 14, dik = 2.8 }: { size?: number; dik?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={dik} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

function Pijl({ omlaag = false }: { omlaag?: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {omlaag ? <path d="M12 5v14M6 13l6 6 6-6" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
    </svg>
  );
}

function Telefoon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function Schild() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6l-8-3z" /><path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function Slot() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function Download({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
    </svg>
  );
}

/** De offerte als concept-pdf met de huidige keuze: om intern te bespreken voordat je tekent. */
function ConceptLink({ href, className = "" }: { href: string | null; className?: string }) {
  if (!href) return null;
  return (
    <a href={href} className={`inline-flex items-center gap-2 text-[14px] font-medium underline-offset-4 hover:underline ${className}`} style={{ color: NAVY }}>
      <Download /> Download als pdf om intern te bespreken
    </a>
  );
}

function Envelop() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function initialen(naam: string | null) {
  return (naam || "React2u").split(/\s+/).filter(Boolean).map((w) => w[0]).filter((c) => /[A-Za-zÀ-ÿ]/.test(c)).slice(0, 2).join("").toUpperCase() || "R";
}

const telLink = (t: string | null) => (t ? `tel:${t.replace(/[^\d+]/g, "")}` : null);
const voornaam = (n: string | null | undefined) => (n || "").trim().split(/\s+/)[0] || "";

/** "€134,75 per maand voor 42 medewerkers": wat een regel de organisatie kost. */
function bedragZin(r: Regel, medewerkers: number | null) {
  const b = bedragVoor(r, medewerkers);
  if (!b || !b.bedrag) return null;
  const { bedrag, per } = regelbedrag(b);
  const n = aantalVoor(r, medewerkers);
  const perMedewerker = r.eenheid === "medewerker_jaar" || r.eenheid === "medewerker";
  const voor = perMedewerker && n > 1 ? ` voor ${n.toLocaleString("nl-NL")} medewerkers` : r.aantal && r.aantal > 1 ? ` (${r.aantal.toLocaleString("nl-NL")}×)` : "";
  return `${euro(bedrag!)} ${per === "maand" ? "per maand" : "eenmalig"}${voor}`;
}

function Avatar({ naam, maat = 44 }: { naam: string | null; maat?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: maat, height: maat, fontSize: maat * 0.36, background: NAVY, ...KOP }}
      aria-hidden="true"
    >
      {initialen(naam)}
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="block text-[13px] font-medium" style={{ color: MUTE }}>{children}</span>;
}

/**
 * Een bedrag dat naar zijn nieuwe waarde telt als de klant iets aan- of
 * uitzet: zo zie je wat je keuze doet. Kort (280 ms) en niet bij "minder
 * beweging"; de eerste weergave staat er meteen.
 */
function useTelwaarde(doel: number): number {
  const [waarde, setWaarde] = useState(doel);
  const vorige = useRef(doel);
  useEffect(() => {
    const van = vorige.current;
    vorige.current = doel;
    if (van === doel) return;
    // Bij "minder beweging" meteen het eindbedrag (in de eerste frame, niet tijdens het renderen).
    const duur = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 280;
    let r = 0;
    const begin = performance.now();
    const stap = (nu: number) => {
      const t = duur ? Math.min(1, (nu - begin) / duur) : 1;
      const e = 1 - Math.pow(1 - t, 3);
      setWaarde(Math.round((van + (doel - van) * e) * 100) / 100);
      if (t < 1) r = requestAnimationFrame(stap);
    };
    r = requestAnimationFrame(stap);
    return () => cancelAnimationFrame(r);
  }, [doel]);
  return waarde;
}

/** Het bedrag groot: per maand, of eenmalig als er niets doorloopt. */
function Bedrag({ t, maat = "text-[42px]" }: { t: Totalen; maat?: string }) {
  const hoofd = t.perMaand > 0 ? { bedrag: t.perMaand, per: "per maand" } : t.eenmalig > 0 ? { bedrag: t.eenmalig, per: "eenmalig" } : null;
  const getoond = useTelwaarde(hoofd?.bedrag ?? 0);
  if (!hoofd) return <p className="m-0 text-[24px] font-semibold" style={{ ...KOP, color: INKT }}>Op aanvraag</p>;
  return (
    <p className="m-0 flex flex-wrap items-baseline gap-x-2">
      <span className={`${maat} font-semibold leading-none tracking-[-0.035em] tabular-nums`} style={{ ...KOP, color: INKT }} aria-hidden="true">{euro(getoond)}</span>
      <span className="sr-only" aria-live="polite">{euro(hoofd.bedrag)}</span>
      <span className="text-[16px] font-medium" style={{ color: BODY }}>{hoofd.per}</span>
    </p>
  );
}

/**
 * Wat voor de hele pagina geldt: een zichtbare focusring voor wie met het
 * toetsenbord werkt (velden hebben hun eigen rand), en geen animaties of
 * vloeiend scrollen bij "minder beweging".
 */
const PAGINA_CSS = `
.offerte-doc :is(a, button, summary, [role="radio"], [role="switch"], [role="tab"]):focus-visible {
  outline: 2px solid ${NAVY};
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .offerte-doc *, .offerte-doc *::before, .offerte-doc *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}`;

/** Naar een hoofdstuk, vloeiend tenzij de klant minder beweging wil. */
function scrollNaar(id: string) {
  const rustig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: rustig ? "auto" : "smooth", block: "start" });
}

/* ---------- de pagina ---------- */

export default function OffertePagina({
  offerte, token, modus, voorwaarden, vers = false, contact = CONTACT_FALLBACK, certificaten = [],
}: {
  offerte: OffertePubliek;
  token?: string;
  modus: Modus;
  voorwaarden: string;
  /** Net getekend (minder dan een kwartier geleden): dan de felicitatie, anders een rustige bevestiging. */
  vers?: boolean;
  contact?: ContactInfo;
  certificaten?: Certificate[];
}) {
  const getekend = offerte.status === "getekend" && offerte.getekend_inhoud;
  const huis: Huis = { contact, certificaten };
  return (
    <div className={`${kopLetter.variable} offerte-doc min-h-screen`} style={{ background: ZAND }}>
      <style>{PAGINA_CSS}</style>
      {getekend ? (
        <Getekend offerte={offerte} token={token} voorwaarden={voorwaarden} modus={modus} vers={vers} huis={huis} />
      ) : (
        <Document offerte={offerte} token={token} modus={modus} voorwaarden={voorwaarden} huis={huis} />
      )}
    </div>
  );
}

/* ---------- kopbalk, meldingen en voet ---------- */

function Kopbalk({ offerte, voortgang = true }: { offerte: OffertePubliek; voortgang?: boolean }) {
  const tel = telLink(offerte.afzender_telefoon);
  const balk = useRef<HTMLSpanElement>(null);
  // Hoe ver je in de offerte bent: een dun roze lijntje onder de kopbalk.
  useEffect(() => {
    if (!voortgang) return;
    let r = 0;
    const zet = () => {
      cancelAnimationFrame(r);
      r = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (balk.current) balk.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
      });
    };
    zet();
    window.addEventListener("scroll", zet, { passive: true });
    window.addEventListener("resize", zet);
    return () => {
      cancelAnimationFrame(r);
      window.removeEventListener("scroll", zet);
      window.removeEventListener("resize", zet);
    };
  }, [voortgang]);
  return (
    <header className="sticky top-0 z-40 border-b bg-[#F4EFE7]/85 backdrop-blur-md print:static" style={{ borderColor: LIJN }}>
      <div className="mx-auto flex h-[64px] max-w-[1240px] items-center justify-between gap-4 px-5 md:px-8">
        <Logo className="h-8 w-auto shrink-0" />
        <p className="m-0 hidden min-w-0 truncate text-[14px] md:block" style={{ color: MUTE }}>
          Offerte <span className="font-semibold" style={{ color: INKT }}>{offerte.nummer}</span> voor {offerte.bedrijf}
        </p>
        {tel ? (
          <a href={tel} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border bg-white px-4 text-[14px] font-semibold transition-colors hover:border-[#322E83] print:hidden" style={{ borderColor: LIJN, color: NAVY }}>
            <Telefoon size={15} /> <span className="hidden sm:inline">Bel {voornaam(offerte.afzender_naam) || "ons"}</span><span className="sm:hidden">Bellen</span>
          </a>
        ) : <span />}
      </div>
      {voortgang && <span ref={balk} className="absolute inset-x-0 bottom-[-1px] h-[2px] origin-left print:hidden" style={{ background: NAVY, transform: "scaleX(0)" }} aria-hidden="true" />}
    </header>
  );
}

function Melding({ modus }: { modus: Modus }) {
  if (modus === "klant") return null;
  return (
    <div className="bg-[#FFF4E5] text-[14px] text-[#7A4A06] print:hidden">
      <p className="mx-auto m-0 max-w-[1240px] px-5 py-2.5 md:px-8">
        {modus === "voorbeeld"
          ? "Voorbeeld: zo ziet de klant de offerte. Je keuzes hier worden niet bewaard en tekenen kan niet."
          : "Je bekijkt deze offerte als collega. Dit bezoek telt niet mee en ondertekenen kan alleen de klant."}
      </p>
    </div>
  );
}

function Band({ kleur, tekst, children }: { kleur: string; tekst: string; children: React.ReactNode }) {
  return (
    <div style={{ background: kleur, color: tekst }}>
      <p className="mx-auto m-0 max-w-[1240px] px-5 py-3 text-[15px] md:px-8">{children}</p>
    </div>
  );
}

function Voet({ offerte, voorwaarden, huis }: { offerte: OffertePubliek; voorwaarden: string; huis: Huis }) {
  const c = huis.contact;
  return (
    <footer className="mx-auto mt-16 max-w-[1240px] px-5 pb-32 text-[13.5px] md:px-8 lg:pb-14 print:mt-6 print:pb-0" style={{ color: MUTE }}>
      <div className="grid gap-8 border-t pt-8 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start md:gap-12" style={{ borderColor: "#E2DBCF" }}>
        <div>
          <Logo className="h-10 w-auto" />
          <p className="m-0 mt-3 text-[13.5px] italic" style={{ color: BODY }}>Jouw mensen, onze aandacht.</p>
        </div>
        <div className="grid gap-x-10 gap-y-1 sm:grid-cols-2">
          <p className="m-0">React2u<br />{c.addressLine1}<br />{c.addressLine2}</p>
          <p className="m-0">
            <a href={`tel:${c.phone}`} className="hover:underline">{telefoonTekst(c)}</a><br />
            <a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a><br />
            KvK {c.kvk}, btw {c.btw}
          </p>
        </div>
        <ul className="m-0 flex list-none flex-wrap items-center gap-2 p-0" aria-label="Keurmerken">
          {keurmerken(huis.certificaten).map((k) => (
            <li key={k.naam} title={`${k.naam}: ${k.wat}`} className="relative h-10 w-10 overflow-hidden rounded-[8px] bg-white">
              <Beeld src={k.src} alt={k.alt} fill sizes="40px" className="object-contain p-1" />
            </li>
          ))}
        </ul>
      </div>
      <p className="m-0 mt-6 text-[13px]">
        Offerte {offerte.nummer}. Alle bedragen zijn exclusief btw. Op deze offerte zijn de{" "}
        <a href={voorwaarden} target="_blank" rel="noopener" className="font-semibold underline underline-offset-4" style={{ color: NAVY }}>algemene voorwaarden</a> van React2u van toepassing.
      </p>
    </footer>
  );
}

/** De echte keurmerken van React2u, met logo, naam en wat ze betekenen. */
function Keurmerken({ huis }: { huis: Huis }) {
  return (
    <div className="rounded-[20px] p-6 md:p-7" style={{ background: ZACHT }}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="m-0 text-[17px] font-semibold tracking-[-0.01em]" style={{ ...KOP, color: INKT }}>Gecertificeerd en aangesloten</p>
        <p className="m-0 text-[13.5px]" style={{ color: MUTE }}>Een gecertificeerde arbodienst, met de keurmerken die daarbij horen.</p>
      </div>
      <ul className="m-0 mt-5 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-5 sm:gap-2.5 [&>li:last-child]:col-span-2 sm:[&>li:last-child]:col-span-1">
        {keurmerken(huis.certificaten).map((k) => {
          const inhoud = (
            <>
              <span className="relative block h-14 w-full">
                <Beeld src={k.src} alt={k.alt} fill sizes="120px" className="object-contain" />
              </span>
              <span className="mt-3 block text-[13.5px] font-semibold" style={{ color: INKT }}>{k.naam}</span>
              <span className="block text-[12px] leading-snug [hyphens:auto] [overflow-wrap:break-word]" style={{ color: MUTE }}>{k.wat}</span>
            </>
          );
          return (
            <li key={k.naam}>
              {k.href ? (
                <a href={k.href} target="_blank" rel="noopener" className="block h-full rounded-[14px] bg-white px-2.5 py-4 text-center transition-shadow hover:shadow-[0_8px_24px_-14px_rgba(28,26,78,0.4)]">{inhoud}</a>
              ) : (
                <span className="block h-full rounded-[14px] bg-white px-2.5 py-4 text-center">{inhoud}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- omslag ---------- */

function Omslag({ offerte, vorm }: { offerte: OffertePubliek; vorm: Vorm }) {
  const kleur = VORMEN[vorm].kleur;
  const meta: [string, React.ReactNode][] = [
    ["Offertenummer", offerte.nummer],
    ["Opgesteld door", offerte.afzender_naam || "React2u"],
    ["Datum", datumLang(offerte.verstuurd_at || new Date().toISOString())],
    ...(offerte.geldig_tot ? ([["Geldig tot en met", datumLang(offerte.geldig_tot)]] as [string, string][]) : []),
    ...(offerte.betreft ? ([[VORMEN[vorm].betreft || "Betreft", offerte.betreft]] as [string, string][]) : []),
    ...(offerte.medewerkers ? ([["Medewerkers", offerte.medewerkers.toLocaleString("nl-NL")]] as [string, string][]) : []),
  ];
  return (
    <section className="pb-10 pt-10 md:pb-14 md:pt-14">
      {/* Briefhoofd: het logo, de kernzin en het label waar deze offerte onder valt */}
      {/* Op de telefoon staat het logo al in de kopbalk; daar alleen het label */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 sm:mb-14 md:mb-16">
        <div className="hidden items-center gap-5 sm:flex">
          <Logo className="h-14 w-auto md:h-[68px]" />
          <span className="h-12 w-px" style={{ background: "#DDD5C8" }} aria-hidden="true" />
          <p className="m-0 text-[15px] leading-snug" style={{ color: BODY }}>
            Jouw mensen,<br /><span className="font-semibold" style={{ color: INKT }}>onze aandacht.</span>
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold" style={{ color: INKT }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: kleur }} aria-hidden="true" />
          {LABEL[vorm]}
        </span>
      </div>
      <h1 className="m-0 max-w-[760px] text-balance text-[36px] font-semibold leading-[1.04] tracking-[-0.035em] [hyphens:auto] [overflow-wrap:break-word] sm:text-[48px] md:text-[68px] md:tracking-[-0.04em]" style={{ ...KOP, color: INKT }}>
        {offerte.titel}
      </h1>
      <p className="m-0 mt-4 text-[22px] font-normal tracking-[-0.01em] md:text-[28px]" style={{ ...KOP, color: NAVY }}>
        voor {offerte.bedrijf}
      </p>
      <dl className="m-0 mt-10 grid grid-cols-2 gap-x-8 gap-y-5 border-t pt-6 sm:grid-cols-3 xl:flex xl:flex-wrap xl:gap-x-11" style={{ borderColor: "#E2DBCF" }}>
        {meta.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt><Label>{k}</Label></dt>
            <dd className="m-0 mt-1 truncate text-[15.5px] font-medium tabular-nums" style={{ color: INKT }}>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ---------- het document ---------- */

type Hoofdstuk = { id: string; titel: string };

function Kop({ nr, titel, sub }: { nr: number; titel: string; sub?: string }) {
  return (
    <header className="mb-7">
      <div className="flex items-center gap-4">
        <span className="text-[14px] font-semibold tabular-nums" style={{ ...KOP, color: NAVY }}>{nr}</span>
        <span className="h-px flex-1" style={{ background: LIJN }} />
      </div>
      <h2 className="m-0 mt-4 text-[28px] font-semibold leading-[1.15] tracking-[-0.025em] md:text-[34px]" style={{ ...KOP, color: INKT }}>{titel}</h2>
      {sub && <p className="m-0 mt-2 max-w-[600px] text-[16px] leading-[1.6]" style={{ color: BODY }}>{sub}</p>}
    </header>
  );
}

function Document({ offerte, token, modus, voorwaarden, huis }: { offerte: OffertePubliek; token?: string; modus: Modus; voorwaarden: string; huis: Huis }) {
  const regels = useMemo(() => normaliseerRegels(offerte.regels), [offerte.regels]);
  const [keuze, setKeuze] = useState<string[]>(() => herstelKeuze(regels, offerte.keuze));
  const totalen = useMemo(() => berekenTotalen(regels, keuze, offerte.medewerkers), [regels, keuze, offerte.medewerkers]);
  const open = (offerte.status === "verstuurd" && !offerte.verlopen) || (modus === "voorbeeld" && offerte.status === "concept");
  const kanTekenen = offerte.status === "verstuurd" && !offerte.verlopen && modus === "klant" && Boolean(token);
  const kanKiezen = offerte.status === "verstuurd" || modus === "voorbeeld";
  const [afwijzen, setAfwijzen] = useState(false);
  const vorm: Vorm = VORMEN[offerte.vorm] ? offerte.vorm : "verzuimbegeleiding";
  const heeftKeuze = regels.some((r) => r.soort === "optie" || r.soort === "keuze");

  // De tussenstand bewaren, een moment nadat de klant stopt met klikken.
  const eerste = useRef(true);
  useEffect(() => {
    if (eerste.current) {
      eerste.current = false;
      return;
    }
    if (!kanTekenen || !token) return;
    const t = setTimeout(() => void bewaarKeuze(token, keuze).catch(() => {}), 900);
    return () => clearTimeout(t);
  }, [keuze, kanTekenen, token]);

  const hoofdstukken: Hoofdstuk[] = [
    ...(offerte.intro ? [{ id: "woord", titel: "Een persoonlijk woord" }] : []),
    ...(offerte.inhoud?.trim() ? [{ id: "over", titel: "Over deze offerte" }] : []),
    { id: "keuze", titel: heeftKeuze ? "Stel je offerte samen" : "Wat je krijgt" },
    { id: "voorwaarden", titel: "Voorwaarden" },
    { id: "verder", titel: "Zo gaat het verder" },
    { id: "akkoord", titel: "Akkoord" },
  ];
  const nr = (id: string) => hoofdstukken.findIndex((h) => h.id === id) + 1;
  const actief = useActiefHoofdstuk(hoofdstukken.map((h) => h.id));
  const naarAkkoord = () => scrollNaar("akkoord");
  const klik = (id: string) => kanKiezen && setKeuze((k) => wissel(regels, k, id));
  // Concept-pdf: voor de klant via zijn link, in het voorbeeld via het beheer. Niet bij een afgewezen offerte.
  const conceptHref =
    offerte.status === "verstuurd" && token ? `/offerte/${token}/concept?keuze=${encodeURIComponent(keuze.join(","))}&download=1` :
    modus === "voorbeeld" && offerte.status !== "afgewezen" ? `/admin/offertevoorbeeld/${offerte.id}/concept?keuze=${encodeURIComponent(keuze.join(","))}&download=1` :
    null;

  return (
    <>
      <Kopbalk offerte={offerte} />
      <Melding modus={modus} />
      {offerte.verlopen && offerte.status === "verstuurd" && (
        <Band kleur="#FFF4E5" tekst="#7A4A06">
          Deze offerte was geldig tot en met {datumLang(offerte.geldig_tot)}. Wil je toch verder? Neem contact op met {offerte.afzender_naam || "ons"}, dan
          sturen we je een nieuwe.
        </Band>
      )}
      {offerte.status === "afgewezen" && (
        <Band kleur="#FDECEA" tekst="#8A1C12">
          Je hebt laten weten niet akkoord te gaan met deze offerte. Toch interesse, of wil je iets aanpassen? Neem gerust contact op.
        </Band>
      )}

      <main className="mx-auto grid max-w-[1240px] gap-x-12 px-5 md:px-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-x-16 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <Omslag offerte={offerte} vorm={vorm} />

          {/* Telefoon: het bedrag meteen onder de omslag; op een groot scherm staat het rechts */}
          <div className="mb-8 rounded-[22px] bg-white p-6 lg:hidden">
            <Label>{open && heeftKeuze ? "Bij je huidige keuze" : open ? "Je investering" : "Deze offerte"}</Label>
            <div className="mt-2"><Bedrag t={totalen} maat="text-[38px]" /></div>
            <Kleintje t={totalen} />
            {conceptHref && <ConceptLink href={conceptHref} className="mt-4" />}
          </div>

          <article className="overflow-hidden rounded-[28px] shadow-[0_1px_0_rgba(28,26,78,0.04),0_30px_80px_-50px_rgba(28,26,78,0.35)]" style={{ background: PAPIER }}>
            {offerte.intro && (
              <Hoofd id="woord">
                <Kop nr={nr("woord")} titel="Een persoonlijk woord" />
                <Brief offerte={offerte} />
              </Hoofd>
            )}
            {offerte.inhoud?.trim() && (
              <Hoofd id="over">
                <Kop nr={nr("over")} titel="Over deze offerte" />
                <Toelichting tekst={vulIn(offerte.inhoud, offerte)} />
              </Hoofd>
            )}
            <Hoofd id="keuze">
              <Kop
                nr={nr("keuze")}
                titel={heeftKeuze ? "Stel je offerte samen" : "Wat je krijgt"}
                sub={heeftKeuze ? "Kies wat bij je organisatie past. Het bedrag per maand rekent meteen mee." : "Dit is wat we voor je doen, en wat het kost."}
              />
              <div className="flex flex-col gap-10">
                {secties(regels).map((s) => (
                  <Sectie key={s.naam} sectie={s} keuze={keuze} klik={klik} medewerkers={offerte.medewerkers} kanKiezen={kanKiezen} />
                ))}
              </div>
              <Optelling t={totalen} />
            </Hoofd>
            <Hoofd id="voorwaarden">
              <Kop nr={nr("voorwaarden")} titel="Voorwaarden" />
              <OfferteTekst tekst={vulIn(offerte.voorwaarden, offerte).trim() || "- Alle bedragen zijn exclusief btw."} klein />
              <p className="m-0 mt-5 text-[14.5px] leading-[1.6]" style={{ color: BODY }}>
                {offerte.geldig_tot ? `Deze offerte is geldig tot en met ${datumLang(offerte.geldig_tot)}. ` : ""}Op deze offerte zijn de{" "}
                <a href={voorwaarden} target="_blank" rel="noopener" className="font-semibold underline underline-offset-4" style={{ color: NAVY }}>algemene voorwaarden</a>{" "}
                van React2u van toepassing.
              </p>
            </Hoofd>
            <Hoofd id="verder">
              <Kop nr={nr("verder")} titel="Zo gaat het verder" />
              <Vervolg stappen={offerte.vervolg} />
              <div id="keurmerken" className="mt-10 scroll-mt-[96px]"><Keurmerken huis={huis} /></div>
            </Hoofd>
            <Hoofd id="akkoord" laatste>
              <Kop nr={nr("akkoord")} titel="Akkoord" sub={open ? "Klopt alles? Zet hieronder je handtekening. Je bevestigt met een code uit je mail en krijgt de getekende offerte als pdf." : undefined} />
              <Akkoord
                offerte={offerte}
                token={token}
                keuze={keuze}
                totalen={totalen}
                kanTekenen={kanTekenen}
                open={open}
                modus={modus}
                voorwaarden={voorwaarden}
                afwijzen={kanTekenen ? () => setAfwijzen(true) : undefined}
                huis={huis}
                conceptHref={conceptHref}
              />
            </Hoofd>
          </article>
        </div>

        {/* Het beslispaneel: altijd in beeld op een groot scherm */}
        <aside className="hidden pt-16 lg:block print:hidden">
          <div className="sticky top-[88px] flex max-h-[calc(100vh-104px)] flex-col gap-4 overflow-y-auto pb-4">
            <Paneel totalen={totalen} heeftKeuze={heeftKeuze} open={open} naarAkkoord={naarAkkoord} offerte={offerte} bijAkkoord={actief === "akkoord"} conceptHref={conceptHref} />
            <nav aria-label="Inhoud van de offerte" className="rounded-[22px] border p-5" style={{ borderColor: "#E2DBCF" }}>
              <Label>In deze offerte</Label>
              <ol className="m-0 mt-3 flex list-none flex-col gap-0.5 p-0">
                {hoofdstukken.map((h, i) => (
                  <li key={h.id}>
                    <a
                      href={`#${h.id}`}
                      className={`flex items-center gap-3 rounded-[10px] px-2.5 py-2 text-[14px] transition-colors ${actief === h.id ? "bg-white font-semibold" : "hover:bg-white/60"}`}
                      style={{ color: actief === h.id ? INKT : BODY }}
                    >
                      <span className="w-4 text-[13px] tabular-nums" style={{ color: actief === h.id ? NAVY : MUTE }}>{i + 1}</span>
                      {h.titel}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </aside>
      </main>

      <Voet offerte={offerte} voorwaarden={voorwaarden} huis={huis} />

      {/* Telefoon: het maandbedrag en de knop in beeld, tot je bij het akkoord bent (daar staat de echte knop) */}
      {open && (
        <div
          className={`fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 px-5 py-3 backdrop-blur transition-transform duration-300 lg:hidden print:hidden ${actief === "akkoord" ? "translate-y-full" : ""}`}
          style={{ borderColor: LIJN, paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
          aria-hidden={actief === "akkoord" || undefined}
        >
          <div className="mx-auto flex max-w-[640px] items-center gap-4">
            <div className="min-w-0 flex-1 leading-tight">
              <span className="block whitespace-nowrap">
                <span className="text-[21px] font-semibold tabular-nums tracking-[-0.02em]" style={{ ...KOP, color: INKT }}>
                  {totalen.perMaand > 0 ? euro(totalen.perMaand) : euro(totalen.eenmalig)}
                </span>
                <span className="ml-1 text-[14px] font-medium" style={{ color: BODY }}>{totalen.perMaand > 0 ? "per maand" : "eenmalig"}</span>
              </span>
              <span className="block truncate text-[12.5px]" style={{ color: MUTE }}>
                {totalen.perMaand > 0 && totalen.eenmalig > 0 ? `+ ${euro(totalen.eenmalig)} eenmalig, ` : ""}exclusief btw
              </span>
            </div>
            <button type="button" onClick={naarAkkoord} className="h-[50px] shrink-0 rounded-[12px] px-5 text-[15px] font-semibold text-white" style={{ background: PINK }}>
              Ondertekenen
            </button>
          </div>
        </div>
      )}

      {afwijzen && token && <AfwijsVenster offerte={offerte} token={token} sluit={() => setAfwijzen(false)} />}
    </>
  );
}

/** Welk hoofdstuk nu in beeld is, voor de inhoudsopgave. */
function useActiefHoofdstuk(ids: string[]) {
  const [actief, setActief] = useState(ids[0]);
  const sleutel = ids.join(",");
  useEffect(() => {
    const els = sleutel.split(",").map((id) => document.getElementById(id)).filter((e): e is HTMLElement => Boolean(e));
    const io = new IntersectionObserver(
      (items) => {
        const zichtbaar = items.filter((i) => i.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (zichtbaar[0]) setActief(zichtbaar[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [sleutel]);
  return actief;
}

function Hoofd({ id, children, laatste = false }: { id: string; children: React.ReactNode; laatste?: boolean }) {
  return (
    <section id={id} className={`scroll-mt-[84px] px-6 py-10 md:px-12 md:py-14 print:break-inside-avoid ${laatste ? "" : "border-b"}`} style={{ borderColor: LIJN }}>
      {children}
    </section>
  );
}

function Kleintje({ t }: { t: Totalen }) {
  const jaar = t.perMaand > 0 ? `${euro(t.perJaar)} per jaar${t.eenmalig > 0 ? `, plus ${euro(t.eenmalig)} eenmalig` : ""}` : "";
  return (
    <p className="m-0 mt-2.5 text-[13.5px] leading-[1.5]" style={{ color: MUTE }}>
      {jaar && <span className="block">{jaar}</span>}
      <span className="block">Bedragen exclusief btw</span>
    </p>
  );
}

/* ---------- beslispaneel ---------- */

function Paneel({ totalen, heeftKeuze, open, naarAkkoord, offerte, bijAkkoord, conceptHref }: {
  totalen: Totalen; heeftKeuze: boolean; open: boolean; naarAkkoord: () => void; offerte: OffertePubliek; bijAkkoord: boolean; conceptHref: string | null;
}) {
  const tel = telLink(offerte.afzender_telefoon);
  const toestand =
    offerte.status === "afgewezen" ? "Je hebt laten weten niet akkoord te gaan." :
    offerte.verlopen ? `Deze offerte is verlopen op ${datumLang(offerte.geldig_tot)}. ${voornaam(offerte.afzender_naam) || "We"} ${offerte.afzender_naam ? "stuurt" : "sturen"} je graag een nieuwe.` :
    null;
  return (
    <div className="rounded-[24px] bg-white p-6 shadow-[0_30px_70px_-45px_rgba(28,26,78,0.5)]">
      <Label>{open && heeftKeuze ? "Bij je huidige keuze" : open ? "Je investering" : "Deze offerte"}</Label>
      <div className="mt-3"><Bedrag t={totalen} /></div>
      <Kleintje t={totalen} />

      <ul className="m-0 mt-5 flex list-none flex-col gap-2.5 border-t p-0 pt-5" style={{ borderColor: LIJN }}>
        {totalen.regels.map(({ regel, bedrag, periode }) => {
          const b = regelbedrag({ bedrag, periode });
          return (
            <li key={regel.id} className="flex items-baseline justify-between gap-3 text-[14px]">
              <span className="min-w-0" style={{ color: BODY }}>{regel.naam}</span>
              <span className="shrink-0 tabular-nums" style={{ color: INKT }}>
                {b.bedrag === null ? "op aanvraag" : b.bedrag === 0 ? "inbegrepen" : euro(b.bedrag)}
                {b.bedrag ? <span className="ml-1 text-[12px]" style={{ color: MUTE }}>{b.per === "maand" ? "/mnd" : "eenmalig"}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Bij het akkoord staat de echte knop in het document; hier dan alleen waar je bent */}
      {open && !bijAkkoord && (
        <button
          type="button"
          onClick={naarAkkoord}
          className="mt-6 flex h-[54px] w-full items-center justify-center gap-2 rounded-[13px] text-[16px] font-semibold text-white transition-[filter,transform] hover:brightness-95 active:scale-[0.99]"
          style={{ background: PINK }}
        >
          Naar ondertekenen <Pijl omlaag />
        </button>
      )}
      {open && bijAkkoord && (
        <p className="m-0 mt-6 flex h-[54px] items-center justify-center gap-2 rounded-[13px] text-[15px] font-medium" style={{ background: ZACHT, color: BODY }}>
          <span style={{ color: TEAL_TEKST }}><Vink size={15} /></span> Je ondertekent links in het document
        </p>
      )}
      {conceptHref && <div className="mt-4 text-center"><ConceptLink href={conceptHref} className="text-[13.5px]" /></div>}
      {toestand && <p className="m-0 mt-6 rounded-[12px] bg-[#FFF4E5] px-4 py-3 text-[14px] leading-[1.5] text-[#7A4A06]">{toestand}</p>}

      <div className="mt-6 flex items-center gap-3 border-t pt-5" style={{ borderColor: LIJN }}>
        <Avatar naam={offerte.afzender_naam} maat={40} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="m-0 text-[14.5px] font-semibold" style={{ color: INKT }}>{offerte.afzender_naam || "React2u"}</p>
          <p className="m-0 truncate text-[13px]" style={{ color: MUTE }}>{[offerte.afzender_functie, "React2u"].filter(Boolean).join(", ")}</p>
        </div>
        {tel && (
          <a href={tel} aria-label={`Bel ${offerte.afzender_naam || "React2u"}`} className="flex h-10 w-10 items-center justify-center rounded-full border transition-colors hover:border-[#322E83]" style={{ borderColor: LIJN, color: NAVY }}>
            <Telefoon size={16} />
          </a>
        )}
        <a href={`mailto:${offerte.afzender_email || OFFERTE_EMAIL}?subject=${encodeURIComponent(`Vraag over offerte ${offerte.nummer}`)}`} aria-label={`Mail ${offerte.afzender_naam || "React2u"}`} className="flex h-10 w-10 items-center justify-center rounded-full border transition-colors hover:border-[#322E83]" style={{ borderColor: LIJN, color: NAVY }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
        </a>
      </div>
      <p className="m-0 mt-5 flex items-center gap-2 border-t pt-4 text-[13px]" style={{ borderColor: LIJN, color: MUTE }}>
        <span style={{ color: TEAL_TEKST }}><Schild /></span> Gecertificeerde arbodienst
        <a href="#keurmerken" className="ml-auto font-medium underline-offset-4 hover:underline" style={{ color: NAVY }}>Keurmerken</a>
      </p>
    </div>
  );
}

/* ---------- de hoofdstukken ---------- */

function Brief({ offerte }: { offerte: OffertePubliek }) {
  return (
    <div className="max-w-[640px]">
      <p className="m-0 whitespace-pre-line text-[18px] leading-[1.75]" style={{ color: BODY }}>{vulIn(offerte.intro, offerte)}</p>
      <div className="mt-8 flex items-end gap-5">
        <div>
          <p className="m-0 text-[15px]" style={{ color: BODY }}>Met vriendelijke groet,</p>
          <p className={`${handschrift.className} m-0 mt-2 text-[38px] leading-none`} style={{ color: NAVY }}>{offerte.afzender_naam || "React2u"}</p>
          <p className="m-0 mt-2 text-[14px]" style={{ color: MUTE }}>{[offerte.afzender_functie, "React2u"].filter(Boolean).join(", ")}</p>
        </div>
      </div>
    </div>
  );
}

/** De uitleg van de dienst. Lang? Dan eerst een stuk, en de rest met één klik. */
function Toelichting({ tekst }: { tekst: string }) {
  const lang = tekst.length > 2000;
  const [open, setOpen] = useState(!lang);
  const minuten = Math.max(1, Math.round(tekst.split(/\s+/).length / 200));
  return (
    <div>
      <div className={`relative max-w-[680px] ${open ? "" : "max-h-[460px] overflow-hidden print:max-h-none"}`}>
        <OfferteTekst tekst={tekst} />
        {!open && <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-white to-transparent print:hidden" aria-hidden="true" />}
      </div>
      {lang && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-full border px-5 text-[14.5px] font-semibold transition-colors hover:border-[#322E83] print:hidden"
          style={{ borderColor: LIJN, color: NAVY }}
        >
          {open ? "Inklappen" : `Lees verder (${minuten} min)`}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={open ? "rotate-180" : ""} aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
      )}
    </div>
  );
}

function Sectie({
  sectie, keuze, klik, medewerkers, kanKiezen,
}: {
  sectie: ReturnType<typeof secties>[number];
  keuze: string[];
  klik: (id: string) => void;
  medewerkers: number | null;
  kanKiezen: boolean;
}) {
  const keuzes = new Map<string, Regel[]>();
  for (const r of sectie.regels.filter((r) => r.soort === "keuze")) keuzes.set(r.groep || "keuze", [...(keuzes.get(r.groep || "keuze") || []), r]);
  const vast = sectie.regels.filter((r) => r.soort === "vast");
  const opties = sectie.regels.filter((r) => r.soort === "optie");
  const tarieven = sectie.regels.filter((r) => r.soort === "tarief");
  const alleenTarieven = tarieven.length === sectie.regels.length;

  return (
    <div className="print:break-inside-avoid">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h3 className="m-0 flex flex-wrap items-baseline gap-x-3 text-[19px] font-semibold tracking-[-0.01em]" style={{ ...KOP, color: INKT }}>
          {sectie.naam}
          {sectie.label && (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium tracking-normal" style={{ color: MUTE }}>
              <span className="h-2 w-2 rounded-full" style={{ background: sectie.kleur || MUTE }} aria-hidden="true" />
              {sectie.label}
            </span>
          )}
        </h3>
      </div>

      {[...keuzes.values()].map((lijst, gi) => (
        <div key={gi} role="radiogroup" aria-label={`Kies: ${sectie.naam}`} className={`grid gap-4 ${lijst.length >= 2 ? "md:grid-cols-2" : ""} ${vast.length || opties.length || tarieven.length ? "mb-4" : ""}`}>
          {lijst.map((r) => <KeuzeKaart key={r.id} r={r} aan={keuze.includes(r.id)} klik={() => klik(r.id)} medewerkers={medewerkers} kanKiezen={kanKiezen} />)}
        </div>
      ))}

      {vast.length > 0 && (
        <ul className="m-0 flex list-none flex-col p-0">
          {vast.map((r) => (
            <li key={r.id} className="flex items-start gap-4 border-t py-4 first:border-t-0 first:pt-0" style={{ borderColor: LIJN }}>
              <span className="mt-[3px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white" style={{ background: TEAL }} aria-hidden="true"><Vink size={12} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-[16.5px] font-medium" style={{ color: INKT }}>{r.naam}</span>
                  <span className="text-[16px] font-semibold tabular-nums" style={{ color: r.prijs === 0 ? TEAL_TEKST : INKT }}>{maandprijs(r).tekst}</span>
                </span>
                <Onder r={r} medewerkers={medewerkers} />
              </span>
            </li>
          ))}
        </ul>
      )}

      {opties.length > 0 && (
        <ul className={`m-0 flex list-none flex-col gap-3 p-0 ${vast.length ? "mt-4" : ""}`}>
          {opties.map((r) => {
            const aan = keuze.includes(r.id);
            const mp = maandprijs(r);
            return (
              <li key={r.id} className={aan ? "" : "print:hidden"}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={aan}
                  disabled={!kanKiezen}
                  onClick={() => klik(r.id)}
                  className={`flex w-full items-start gap-4 rounded-[16px] border p-4 text-left transition-[border-color,background-color,box-shadow] disabled:cursor-default md:p-5 ${aan ? "border-[#322E83] bg-white shadow-[0_0_0_1px_#322E83]" : "border-[#E6E1D8] hover:border-[#BDB7AB]"}`}
                  style={aan ? undefined : { background: ZACHT }}
                >
                  <span className={`relative mt-0.5 inline-flex h-[26px] w-[44px] shrink-0 rounded-full transition-colors print:hidden ${aan ? "bg-[#322E83]" : "bg-[#D9D4CA]"}`} aria-hidden="true">
                    <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-[left] ${aan ? "left-[21px]" : "left-[3px]"}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span className="text-[16.5px] font-medium" style={{ color: INKT }}>{r.naam}</span>
                      <span className="text-[15.5px] font-semibold tabular-nums" style={{ color: INKT }}>{r.prijs ? `+ ${mp.tekst}` : mp.tekst}</span>
                    </span>
                    <Onder r={r} medewerkers={medewerkers} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {tarieven.length > 0 && (
        <div className={`rounded-[18px] p-5 md:p-6 ${vast.length || opties.length || keuzes.size ? "mt-4" : ""}`} style={{ background: ZACHT }}>
          {!alleenTarieven && <Label>Tarieven bij gebruik</Label>}
          {alleenTarieven && (
            <p className="m-0 mb-1 text-[14px]" style={{ color: MUTE }}>
              Alleen als je er gebruik van maakt. Verrichtingen op uurbasis per begonnen kwartier.
            </p>
          )}
          <dl className="m-0 mt-2 grid gap-x-10 sm:grid-cols-2">
            {tarieven.map((r) => (
              <div key={r.id} className="flex items-baseline justify-between gap-4 border-b py-2.5" style={{ borderColor: "#ECE6DB" }}>
                <dt className="min-w-0 text-[14.5px]" style={{ color: BODY }}>
                  {r.naam}
                  {r.omschrijving && <span className="block text-[12.5px]" style={{ color: MUTE }}>{r.omschrijving}</span>}
                </dt>
                <dd className="m-0 shrink-0 text-right text-[14.5px] font-semibold tabular-nums" style={{ color: INKT }}>{prijsLabel(r)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

/** Onder de naam: de omschrijving, en bij een prijs per medewerker wat het de organisatie per maand kost. */
function Onder({ r, medewerkers }: { r: Regel; medewerkers: number | null }) {
  const zin = r.eenheid === "medewerker_jaar" || r.eenheid === "medewerker" || (r.aantal ?? 1) > 1 ? bedragZin(r, medewerkers) : null;
  const jaar = maandprijs(r).jaar;
  if (!r.omschrijving && !zin && !jaar) return null;
  return (
    <span className="mt-1 block text-[14.5px] leading-[1.55]" style={{ color: BODY }}>
      {r.omschrijving && <span className="block whitespace-pre-line">{r.omschrijving}</span>}
      {(zin || jaar) && (
        <span className="mt-1 block text-[13.5px]" style={{ color: MUTE }}>
          {zin && jaar ? `${zin} (prijslijst ${jaar})` : zin || `Prijslijst ${jaar}`}
        </span>
      )}
    </span>
  );
}

function KeuzeKaart({ r, aan, klik, medewerkers, kanKiezen }: { r: Regel; aan: boolean; klik: () => void; medewerkers: number | null; kanKiezen: boolean }) {
  const mp = maandprijs(r);
  const perMedewerker = r.eenheid === "medewerker_jaar" || r.eenheid === "medewerker";
  // Bij een prijs per medewerker is het bedrag voor de hele organisatie wat telt; per medewerker staat eronder.
  const b = bedragVoor(r, medewerkers);
  const organisatie = perMedewerker && b && b.bedrag ? regelbedrag(b) : null;
  const n = aantalVoor(r, medewerkers);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={aan}
      disabled={!kanKiezen}
      onClick={klik}
      className={`group relative flex flex-col rounded-[20px] border p-6 text-left transition-[border-color,background-color,box-shadow] disabled:cursor-default md:p-7 ${
        aan
          ? "border-[#322E83] bg-white shadow-[0_0_0_1px_#322E83,0_24px_50px_-30px_rgba(50,46,131,0.55)]"
          : "border-[#E6E1D8] enabled:hover:border-[#9D98C9] enabled:hover:bg-white"
      } ${aan ? "" : "print:hidden"}`}
      style={aan ? undefined : { background: ZACHT }}
    >
      <span className="flex items-start justify-between gap-4">
        <span className="min-w-0">
          <span className="block text-[20px] font-semibold leading-snug tracking-[-0.015em]" style={{ ...KOP, color: INKT }}>{r.naam}</span>
          {r.badge && (
            <span className="mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold" style={{ background: "#EEEDF8", color: NAVY }}>{r.badge}</span>
          )}
        </span>
        <span
          className={`mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            aan ? "border-[#322E83] bg-[#322E83] text-white" : "border-[#C9C4BA] bg-white text-transparent group-enabled:group-hover:border-[#9D98C9]"
          }`}
          aria-hidden="true"
        >
          <Vink size={13} dik={3.2} />
        </span>
      </span>

      <span className="mt-6 flex flex-wrap items-baseline gap-x-2">
        <span className="text-[40px] font-semibold leading-none tracking-[-0.04em] tabular-nums" style={{ ...KOP, color: INKT }}>
          {organisatie ? euro(organisatie.bedrag!) : mp.bedrag === null ? prijsLabel(r) : euro(mp.bedrag)}
        </span>
        <span className="text-[15px]" style={{ color: BODY }}>
          {organisatie ? (organisatie.per === "maand" ? "per maand" : "eenmalig") : mp.bedrag !== null ? mp.achter : ""}
        </span>
      </span>
      {organisatie && mp.bedrag !== null && (
        <span className="mt-2.5 block text-[13.5px] leading-[1.55]" style={{ color: MUTE }}>
          <span className="block">{euro(mp.bedrag)} per medewerker per maand × {n.toLocaleString("nl-NL")}</span>
          {r.prijs !== null && r.eenheid === "medewerker_jaar" && <span className="block">Prijslijst {euro(r.prijs)} per jaar</span>}
        </span>
      )}
      {!organisatie && mp.jaar && <span className="mt-2 block text-[13.5px]" style={{ color: MUTE }}>Prijslijst {mp.jaar}</span>}

      {(r.omschrijving || r.punten) && <span className="my-5 block h-px w-full" style={{ background: LIJN }} />}
      {r.omschrijving && <span className="block whitespace-pre-line text-[14.5px] leading-[1.6]" style={{ color: BODY }}>{r.omschrijving}</span>}
      {r.punten && (
        <span className={`flex flex-col gap-2 ${r.omschrijving ? "mt-4" : ""}`}>
          {r.punten.map((p) => (
            <span key={p} className="flex items-start gap-2.5 text-[14.5px] leading-[1.5]" style={{ color: BODY }}>
              <span className="mt-[3px] shrink-0" style={{ color: TEAL_TEKST }}><Vink size={14} dik={3} /></span>
              {p}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

/** Onder de onderdelen: het totaal, zoals onder een offerte op papier. */
function Optelling({ t }: { t: Totalen }) {
  return (
    <div className="mt-10 rounded-[20px] p-6 md:p-7" style={{ background: "#F3F1FA" }}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Label>Totaal</Label>
          <div className="mt-2"><Bedrag t={t} maat="text-[36px]" /></div>
        </div>
        <div className="text-[14px] leading-[1.6] sm:text-right" style={{ color: BODY }}>
          {t.perMaand > 0 && <p className="m-0">{euro(t.perJaar)} per jaar</p>}
          {t.perMaand > 0 && t.eenmalig > 0 && <p className="m-0 font-semibold" style={{ color: INKT }}>+ {euro(t.eenmalig)} eenmalig</p>}
          <p className="m-0" style={{ color: MUTE }}>Exclusief btw. Tarieven bij gebruik komen erbij.</p>
        </div>
      </div>
    </div>
  );
}

function Vervolg({ stappen: eigen, klaar = 0 }: { stappen: Stap[] | null | undefined; klaar?: number }) {
  const lijst = normaliseerVervolg(eigen);
  const stappen = lijst.length ? lijst : VERVOLG_STANDAARD;
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {stappen.map((s, i) => (
        <li key={`${s.kop}-${i}`} className="relative flex gap-5 pb-7 last:pb-0">
          {i < stappen.length - 1 && <span className="absolute left-[17px] top-10 h-[calc(100%-2.5rem)] w-px" style={{ background: LIJN }} aria-hidden="true" />}
          <span
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold"
            style={i < klaar ? { background: TEAL, color: "#fff" } : { background: "#F3F1FA", color: NAVY, ...KOP }}
          >
            {i < klaar ? <Vink size={15} /> : i + 1}
          </span>
          <span className="pt-1.5">
            <span className="block text-[17px] font-semibold tracking-[-0.01em]" style={{ ...KOP, color: INKT }}>{s.kop}</span>
            {s.tekst && <span className="mt-1 block max-w-[560px] text-[15px] leading-[1.6]" style={{ color: BODY }}>{s.tekst}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ---------- akkoord: tekenen in het document ---------- */

function Akkoord({
  offerte, token, keuze, totalen, kanTekenen, open, modus, voorwaarden, afwijzen, huis, conceptHref,
}: {
  offerte: OffertePubliek;
  token?: string;
  keuze: string[];
  totalen: Totalen;
  kanTekenen: boolean;
  open: boolean;
  modus: Modus;
  voorwaarden: string;
  afwijzen?: () => void;
  huis: Huis;
  conceptHref: string | null;
}) {
  const router = useRouter();
  const vooraf = normaliseerFactuur(offerte.factuur);
  const [naam, setNaam] = useState(offerte.contactpersoon || "");
  const [functie, setFunctie] = useState("");
  const [email, setEmail] = useState(offerte.email || "");
  const [png, setPng] = useState<string | null>(null);
  const [akkoord, setAkkoord] = useState(false);
  const [factuur, setFactuur] = useState({ adres: vooraf.adres || "", postcode: vooraf.postcode || "", plaats: vooraf.plaats || "", kvk: vooraf.kvk || "", inkoopnummer: vooraf.inkoopnummer || "" });
  // Null: de facturen gaan naar het adres van wie tekent, tot iemand hier iets anders invult.
  const [factuurEmail, setFactuurEmail] = useState<string | null>(vooraf.email || null);
  // Eerst de gegevens, dan de code uit de mail (0026).
  const [stap, setStap] = useState<"gegevens" | "code">("gegevens");
  const [code, setCode] = useState("");
  const [wacht, setWacht] = useState(0);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, start] = useTransition();
  const uit = !open;
  const vast = uit || stap === "code";
  const veldFactuur = (k: keyof typeof factuur) => (e: React.ChangeEvent<HTMLInputElement>) => setFactuur((f) => ({ ...f, [k]: e.target.value }));

  // Aftellen tot er een nieuwe code mag.
  useEffect(() => {
    if (wacht <= 0) return;
    const t = setTimeout(() => setWacht((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wacht]);

  const factuurInvoer = () => normaliseerFactuur({ ...factuur, email: factuurEmail ?? email });

  function controleerGegevens(): string | null {
    if (!isNaam(naam)) return "Vul je volledige naam in.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return "Vul een geldig e-mailadres in; daar sturen we de code heen.";
    if (!png) return "Zet je handtekening in het vak, of kies Typen.";
    const ff = factuurFout(factuurInvoer());
    if (ff) return ONDERTEKEN_FOUT[ff];
    if (!akkoord) return "Vink aan dat je akkoord gaat en bevoegd bent om te tekenen.";
    return null;
  }

  function stuurCode() {
    if (!token) return;
    setFout(null);
    start(async () => {
      const res = await vraagCode(token, email.trim());
      if (!res.ok) {
        setFout(res.fout || "De code kon niet worden verstuurd.");
        return;
      }
      setStap("code");
      setCode("");
      setWacht(30);
    });
  }

  function teken(c: string) {
    if (!token || !png) return;
    setFout(null);
    start(async () => {
      const res = await ondertekenOfferte(token, {
        keuze, naam: naam.trim(), functie: functie.trim(), email: email.trim(), handtekening: png, akkoord, code: c, factuur: factuurInvoer(),
      });
      if (!res.ok) {
        setFout(res.fout || "Ondertekenen lukte niet.");
        setCode("");
        return;
      }
      window.scrollTo({ top: 0 });
      router.refresh();
    });
  }

  function onderteken(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);
    if (!kanTekenen || !token) {
      setFout(modus === "klant" ? "Deze offerte kan niet meer worden ondertekend." : "In het voorbeeld en als collega kan er niet worden getekend.");
      return;
    }
    const f = controleerGegevens();
    if (f) return setFout(f);
    if (stap === "gegevens") return stuurCode();
    if (code.length !== 6) return setFout("Vul de code van 6 cijfers uit de mail in.");
    teken(code);
  }

  return (
    <div>
      {/* Wat je tekent, in één zin */}
      <div className="mb-8 flex flex-col gap-3 rounded-[18px] border p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: LIJN, background: ZACHT }}>
        <div>
          <p className="m-0 text-[15px] leading-[1.55]" style={{ color: BODY }}>
            Je geeft akkoord op <strong style={{ color: INKT }}>{totalen.regels.map((r) => r.regel.naam).join(", ") || offerte.titel}</strong>.
          </p>
          {conceptHref && open && <ConceptLink href={conceptHref} className="mt-2 text-[13.5px]" />}
        </div>
        <p className="m-0 shrink-0 text-[15px] font-semibold tabular-nums" style={{ color: INKT }}>
          {totalen.perMaand > 0 && <span className="whitespace-nowrap">{euro(totalen.perMaand)} per maand</span>}
          {totalen.perMaand > 0 && totalen.eenmalig > 0 ? " " : ""}
          {totalen.eenmalig > 0 && <span className="whitespace-nowrap">{totalen.perMaand > 0 ? "+ " : ""}{euro(totalen.eenmalig)} eenmalig</span>}
        </p>
      </div>

      <form onSubmit={onderteken} noValidate>
        {/* Twee handtekeningvakken naast elkaar, zoals onderaan een offerte op papier */}
        <div className="grid gap-8 md:grid-cols-2 md:gap-6">
          <div>
            <Label>Opdrachtnemer</Label>
            <p className="m-0 mt-2 text-[18px] font-semibold" style={{ ...KOP, color: INKT }}>React2u</p>
            <p className="m-0 min-h-[2.9em] text-[13.5px] leading-[1.45]" style={{ color: MUTE }}>{huis.contact.addressLine1}, {huis.contact.addressLine2}<br />KvK {huis.contact.kvk}</p>
            <div className="mt-3 flex h-[44px] items-center">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold" style={{ background: "#E5F6F4", color: TEAL_TEKST }}>
                <Vink size={12} /> Offerte aangeboden
              </span>
            </div>
            <div className="relative mt-2.5 flex aspect-[10/3] items-end overflow-hidden rounded-[14px] border px-[6%] pb-[7%]" style={{ borderColor: "#E6E1D8", background: ZACHT }}>
              <p className={`${handschrift.className} relative z-10 m-0 text-[clamp(30px,4vw,44px)] leading-none`} style={{ color: NAVY }}>{offerte.afzender_naam || "React2u"}</p>
              <span className="absolute inset-x-[6%] bottom-[24%] border-b" style={{ borderColor: "#D9D4CA" }} aria-hidden="true" />
            </div>
            <p className="m-0 mt-2.5 text-[13.5px]" style={{ color: MUTE }}>
              {[offerte.afzender_naam, offerte.afzender_functie].filter(Boolean).join(", ") || "React2u"}
              {offerte.verstuurd_at ? `, ${datumLang(offerte.verstuurd_at)}` : ""}
            </p>
          </div>
          <div>
            <Label>Opdrachtgever</Label>
            <p className="m-0 mt-2 text-[18px] font-semibold" style={{ ...KOP, color: INKT }}>{offerte.bedrijf}</p>
            <p className="m-0 min-h-[2.9em] text-[13.5px] leading-[1.45]" style={{ color: MUTE }}>{offerte.contactpersoon ? `T.a.v. ${offerte.contactpersoon}` : "Getekend voor akkoord"}</p>
            <div className="mt-3">
              {!uit ? (
                <Handtekening
                  naam={naam}
                  onChange={(p) => {
                    setPng(p);
                    if (p) setFout(null);
                  }}
                />
              ) : (
                <>
                  <div className="h-[44px]" />
                  <div className="mt-2.5 aspect-[10/3] rounded-[14px] border border-dashed" style={{ borderColor: "#D9D4CA" }} />
                </>
              )}
            </div>
            <p className="m-0 mt-2.5 text-[13.5px]" style={{ color: MUTE }}>
              {naam.trim() || "Je naam"}{functie.trim() ? `, ${functie.trim()}` : ""}, voor akkoord
            </p>
          </div>
        </div>

        {/* Je gegevens en het akkoord */}
        <div className="mt-8 grid items-start gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-medium" style={{ color: INKT }}>Volledige naam</span>
            <input className={veld} value={naam} onChange={(e) => setNaam(e.target.value)} autoComplete="name" required disabled={vast} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-medium" style={{ color: INKT }}>Functie <span className="font-normal" style={{ color: MUTE }}>(mag leeg)</span></span>
            <input className={veld} value={functie} onChange={(e) => setFunctie(e.target.value)} autoComplete="organization-title" placeholder="Bijvoorbeeld directeur" disabled={vast} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-medium" style={{ color: INKT }}>E-mailadres</span>
            <input className={veld} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required disabled={vast} aria-describedby="of-email-uitleg" />
            <span id="of-email-uitleg" className="text-[13px]" style={{ color: MUTE }}>Hier sturen we de code naartoe.</span>
          </label>
        </div>

        {/* Factuurgegevens: zodat de eerste factuur meteen goed is, met inkoopnummer als inkoop dat vraagt */}
        <fieldset className="m-0 mt-6 min-w-0 rounded-[18px] border p-5 md:p-6" style={{ borderColor: LIJN, background: ZACHT }} disabled={vast}>
          <legend className="sr-only">Factuurgegevens</legend>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="m-0 text-[16.5px] font-semibold" style={{ ...KOP, color: INKT }}>Factuurgegevens</p>
            <p className="m-0 text-[13px]" style={{ color: MUTE }}>
              {vooraf.adres ? `Al ingevuld door ${voornaam(offerte.afzender_naam) || "React2u"}; klopt het?` : "Zodat de eerste factuur meteen goed is."}
            </p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-6">
            <label className="flex flex-col gap-1.5 md:col-span-3">
              <span className="text-[14px] font-medium" style={{ color: INKT }}>Straat en huisnummer</span>
              <input id="of-fadres" className={veld} value={factuur.adres} onChange={veldFactuur("adres")} autoComplete="address-line1" />
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-1">
              <span className="text-[14px] font-medium" style={{ color: INKT }}>Postcode</span>
              <input id="of-fpostcode" className={veld} value={factuur.postcode} onChange={veldFactuur("postcode")} autoComplete="postal-code" />
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className="text-[14px] font-medium" style={{ color: INKT }}>Plaats</span>
              <input id="of-fplaats" className={veld} value={factuur.plaats} onChange={veldFactuur("plaats")} autoComplete="address-level2" />
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className="text-[14px] font-medium" style={{ color: INKT }}>Facturen per mail naar</span>
              <input id="of-femail" className={veld} type="email" value={factuurEmail ?? email} onChange={(e) => setFactuurEmail(e.target.value)} placeholder="administratie@…" />
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className="text-[14px] font-medium" style={{ color: INKT }}>KvK-nummer <span className="font-normal" style={{ color: MUTE }}>(mag leeg)</span></span>
              <input id="of-fkvk" className={veld} value={factuur.kvk} onChange={veldFactuur("kvk")} inputMode="numeric" placeholder="8 cijfers" />
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className="text-[14px] font-medium" style={{ color: INKT }}>Inkoopnummer <span className="font-normal" style={{ color: MUTE }}>(mag leeg)</span></span>
              <input id="of-finkoop" className={veld} value={factuur.inkoopnummer} onChange={veldFactuur("inkoopnummer")} placeholder="Bijvoorbeeld PO-2026-118" />
            </label>
          </div>
          <p className="m-0 mt-3 text-[12.5px] leading-[1.5]" style={{ color: MUTE }}>Werkt jullie administratie met inkoopnummers (PO)? Vul het in, dan staat het op elke factuur.</p>
        </fieldset>

        <label className={`mt-5 flex items-start gap-3 rounded-[14px] border p-4 text-[14.5px] leading-[1.55] transition-colors ${uit ? "opacity-60" : "cursor-pointer"} ${akkoord ? "border-[#322E83] bg-[#F7F6FD]" : ""}`} style={{ color: BODY, borderColor: akkoord ? undefined : "#DEDAD2" }}>
          <input type="checkbox" checked={akkoord} onChange={(e) => setAkkoord(e.target.checked)} disabled={vast} className="mt-0.5 h-5 w-5 shrink-0 accent-[#322E83]" />
          <span>
            Ik ga akkoord met deze offerte en de{" "}
            <a href={voorwaarden} target="_blank" rel="noopener" className="font-semibold underline underline-offset-4" style={{ color: NAVY }}>algemene voorwaarden</a>{" "}
            van React2u, en ik ben bevoegd om namens <strong style={{ color: INKT }}>{offerte.bedrijf}</strong> te tekenen.
          </span>
        </label>

        {fout && <p role="alert" className="m-0 mt-4 rounded-[12px] bg-[#FDECEA] px-4 py-3 text-[14.5px] text-[#8A1C12]">{fout}</p>}

        {!uit && stap === "code" ? (
          <div className="mt-6 rounded-[20px] border-2 p-4 sm:p-5 md:p-7" style={{ borderColor: NAVY, background: "#F7F6FD" }} aria-live="polite">
            <div className="flex items-start gap-4">
              <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full text-white sm:flex" style={{ background: NAVY }}><Envelop /></span>
              <div className="min-w-0">
                <p className="m-0 text-[19px] font-semibold leading-[1.25] tracking-[-0.01em]" style={{ ...KOP, color: INKT }}>Nog één stap: de code uit je mail</p>
                <p className="m-0 mt-1.5 text-[14.5px] leading-[1.55]" style={{ color: BODY }}>
                  We stuurden een code van 6 cijfers naar <strong className="[overflow-wrap:break-word]" style={{ color: INKT }}>{email.trim()}</strong>. Zo weten we zeker dat jij het bent die tekent.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:pl-[60px] md:flex-row md:items-center">
              <input
                id="of-code"
                aria-label="Code van 6 cijfers"
                className="h-[58px] w-full rounded-[14px] border border-[#DEDAD2] bg-white px-4 text-center font-mono text-[26px] font-semibold tracking-[0.45em] text-[#1C1A4E] outline-none focus:border-[#322E83] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)] md:w-[230px]"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••••"
                autoFocus
                value={code}
                onChange={(e) => {
                  const c = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(c);
                  if (c.length === 6 && !bezig) teken(c);
                }}
              />
              <button
                type="submit"
                disabled={bezig}
                className="flex h-[58px] w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[14px] px-5 text-[16px] font-semibold text-white shadow-[0_14px_30px_-16px_rgba(230,22,116,0.85)] transition-[filter,transform] hover:brightness-95 active:scale-[0.99] disabled:opacity-60 md:w-auto md:px-7 md:text-[17px]"
                style={{ background: PINK }}
              >
                {bezig ? "Bezig met ondertekenen…" : "Bevestig en onderteken"}
              </button>
            </div>
            <div className="mt-4 flex flex-col items-start gap-x-6 gap-y-2.5 text-left text-[13.5px] font-semibold sm:flex-row sm:flex-wrap sm:pl-[60px]">
              <button type="button" onClick={stuurCode} disabled={wacht > 0 || bezig} className="text-left underline-offset-4 enabled:hover:underline disabled:opacity-60" style={{ color: NAVY }}>
                {wacht > 0 ? `Nieuwe code over ${wacht} s` : "Stuur een nieuwe code"}
              </button>
              <button type="button" onClick={() => { setStap("gegevens"); setCode(""); setFout(null); }} className="text-left underline-offset-4 hover:underline" style={{ color: MUTE }}>
                Ander e-mailadres of gegevens wijzigen
              </button>
            </div>
          </div>
        ) : !uit ? (
          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="m-0 flex max-w-[460px] items-start gap-2 text-[12.5px] leading-[1.5] md:order-1" style={{ color: MUTE }}>
              <span className="mt-0.5"><Slot /></span>
              Je krijgt eerst een code per mail. Als bewijs leggen we je naam, je bevestigde e-mailadres, het tijdstip, je IP-adres en de getekende versie vast; de getekende offerte krijg je als pdf.
            </p>
            <button
              type="submit"
              disabled={bezig}
              className="flex h-[58px] w-full shrink-0 items-center justify-center gap-2 rounded-[14px] px-8 text-[17px] font-semibold text-white shadow-[0_14px_30px_-16px_rgba(230,22,116,0.85)] transition-[filter,transform] hover:brightness-95 active:scale-[0.99] disabled:opacity-60 md:order-2 md:w-auto"
              style={{ background: PINK }}
            >
              {bezig ? "Code versturen…" : "Onderteken de offerte"}
            </button>
          </div>
        ) : (
          <p className="m-0 mt-5 text-[14.5px]" style={{ color: MUTE }}>
            {offerte.status === "afgewezen"
              ? "Je hebt laten weten niet akkoord te gaan. Neem contact op als je toch verder wilt."
              : offerte.verlopen
              ? "Deze offerte is verlopen en kan niet meer worden ondertekend."
              : "Ondertekenen kan hier niet."}
          </p>
        )}
        {!uit && afwijzen && (
          <button type="button" onClick={afwijzen} className="mt-5 text-[14px] font-semibold underline-offset-4 hover:underline" style={{ color: MUTE }}>
            Niet akkoord? Laat het ons weten
          </button>
        )}
      </form>
    </div>
  );
}

/* ---------- vensters ---------- */

function AfwijsVenster({ offerte, token, sluit }: { offerte: OffertePubliek; token: string; sluit: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [reden, setReden] = useState("");
  const [naam, setNaam] = useState(offerte.contactpersoon || "");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, start] = useTransition();
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        sluit();
      }}
      onClick={(e) => e.target === e.currentTarget && sluit()}
      aria-label="Niet akkoord"
      className="m-auto w-full max-w-none bg-white p-0 backdrop:bg-[#1c1a4e]/55 backdrop:backdrop-blur-[3px] max-md:h-full max-md:max-h-none md:max-w-[540px] md:rounded-[26px]"
    >
      <form
        className="flex flex-col gap-4 p-6 md:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await wijsOfferteAf(token, { reden, naam });
            if (!res.ok) return setFout(res.fout || "Versturen lukte niet.");
            router.refresh();
          });
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <p className="m-0 text-[26px] font-semibold tracking-[-0.02em]" style={{ ...KOP, color: INKT }}>Niet akkoord</p>
          <button type="button" onClick={sluit} aria-label="Sluiten" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-black/[0.05]" style={{ color: NAVY }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <p className="m-0 text-[15.5px] leading-[1.6]" style={{ color: BODY }}>
          Jammer! Wil je kort laten weten waarom? Dan kijkt {offerte.afzender_naam || "onze adviseur"} of we iets kunnen aanpassen. Bellen mag natuurlijk ook.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-[14px] font-medium" style={{ color: INKT }}>Wat kunnen we beter doen? <span className="font-normal" style={{ color: MUTE }}>(mag leeg)</span></span>
          <textarea className={`${veld} h-auto min-h-[120px] py-3`} value={reden} onChange={(e) => setReden(e.target.value)} maxLength={2000} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[14px] font-medium" style={{ color: INKT }}>Je naam</span>
          <input className={veld} value={naam} onChange={(e) => setNaam(e.target.value)} autoComplete="name" />
        </label>
        {fout && <p role="alert" className="m-0 rounded-[12px] bg-[#FDECEA] px-4 py-3 text-[14.5px] text-[#8A1C12]">{fout}</p>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={sluit} className="h-[48px] rounded-[12px] px-4 text-[15px] font-semibold hover:bg-[#F6F5FB]" style={{ color: NAVY }}>Annuleren</button>
          <button type="submit" disabled={bezig} className="h-[48px] rounded-[12px] px-5 text-[15px] font-semibold text-white disabled:opacity-60" style={{ background: NAVY }}>
            {bezig ? "Versturen…" : "Laat het weten"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

/* ---------- na ondertekening ---------- */

/** Stippen in de kleuren van het logo die uit het vinkje springen; alleen bij een verse ondertekening, en niet bij verminderde beweging. */
function Feest() {
  const kleuren = [NAVY, PINK, TEAL, "#F19001", "#3AA5DD", "#CA152A"];
  return (
    <span className="pointer-events-none absolute inset-0 motion-reduce:hidden" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => {
        const hoek = (i / 14) * Math.PI * 2;
        const afstand = 62 + (i % 3) * 16;
        const maat = 7 + (i % 3) * 3;
        return (
          <span
            key={i}
            className="offerte-stip absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: maat,
              height: maat,
              background: kleuren[i % kleuren.length],
              ["--x" as string]: `${Math.cos(hoek) * afstand}px`,
              ["--y" as string]: `${Math.sin(hoek) * afstand}px`,
              animationDelay: `${120 + (i % 4) * 40}ms`,
            }}
          />
        );
      })}
    </span>
  );
}

const FEEST_CSS = `
.offerte-stip { transform: translate(-50%, -50%) scale(0); opacity: 0; animation: offerte-stip 900ms cubic-bezier(.2,.8,.2,1) forwards; }
@keyframes offerte-stip {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  30% { opacity: 1; }
  100% { transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1); opacity: 0; }
}
.offerte-vink { animation: offerte-vink 520ms cubic-bezier(.2,1.4,.4,1) both; }
@keyframes offerte-vink { from { transform: scale(.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .offerte-vink, .offerte-stip { animation: none; } }
`;

function Getekend({ offerte, token, voorwaarden, modus, vers, huis }: { offerte: OffertePubliek; token?: string; voorwaarden: string; modus: Modus; vers: boolean; huis: Huis }) {
  const inhoud = offerte.getekend_inhoud!;
  // De pdf met het ondertekeningscertificaat: via het token, of in het voorbeeld via het beheer.
  const pdf = token ? `/offerte/${token}/pdf` : `/admin/offertevoorbeeld/${offerte.id}/pdf`;
  const regels = normaliseerRegels(inhoud.regels);
  const t = berekenTotalen(regels, inhoud.keuze, inhoud.medewerkers);
  const tarieven = regels.filter((r) => r.soort === "tarief");
  const vorm: Vorm = inhoud.vorm && VORMEN[inhoud.vorm] ? inhoud.vorm : "verzuimbegeleiding";
  const hoofdstukken = ["afgenomen", ...(inhoud.inhoud?.trim() ? ["over"] : []), "voorwaarden", "ondertekening"];
  const nr = (id: string) => hoofdstukken.indexOf(id) + 1;
  return (
    <>
      <style>{FEEST_CSS}</style>
      <Kopbalk offerte={offerte} voortgang={false} />
      <Melding modus={modus} />

      <main className="mx-auto max-w-[900px] px-5 md:px-8">
        <section className="pb-12 pt-14 text-center md:pb-16 md:pt-20">
          <span className="relative mx-auto flex h-24 w-24 items-center justify-center">
            {vers && <Feest />}
            <span className={`flex h-[72px] w-[72px] items-center justify-center rounded-full text-white ${vers ? "offerte-vink" : ""}`} style={{ background: TEAL }}>
              <Vink size={32} dik={3} />
            </span>
          </span>
          <p className="m-0 mt-6 text-[15px] font-semibold" style={{ color: TEAL_TEKST }}>Ondertekend</p>
          <h1 className="mx-auto m-0 mt-3 max-w-[760px] text-balance text-[34px] font-semibold leading-[1.06] tracking-[-0.035em] [hyphens:auto] [overflow-wrap:break-word] sm:text-[44px] md:text-[58px]" style={{ ...KOP, color: INKT }}>
            <span className="print:hidden">{vers ? `Gelukt, ${voornaam(inhoud.getekend_naam)}! Welkom bij React2u.` : `Ondertekend door ${inhoud.getekend_naam}`}</span>
            <span className="hidden print:inline">{inhoud.titel}</span>
          </h1>
          <p className="mx-auto m-0 mt-5 max-w-[600px] text-[17px] leading-[1.7]" style={{ color: BODY }}>
            {inhoud.titel} voor {inhoud.bedrijf}
            {inhoud.betreft ? ` (${VORMEN[vorm].betreft || "betreft"}: ${inhoud.betreft})` : ""}, ondertekend op {momentLang(inhoud.getekend_at)}.
            {vers ? ` De getekende offerte staat als pdf in je mail op ${inhoud.getekend_email}.` : ""}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 print:hidden">
            <a
              href={`${pdf}?download=1`}
              className="inline-flex h-[50px] items-center gap-2 rounded-full px-6 text-[15px] font-semibold text-white"
              style={{ background: NAVY }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" /></svg>
              Download de getekende offerte
            </a>
            <a href={pdf} target="_blank" rel="noopener" className="inline-flex h-[50px] items-center gap-2 rounded-full border bg-white px-6 text-[15px] font-semibold" style={{ borderColor: LIJN, color: NAVY }}>
              Bekijk de pdf
            </a>
            {offerte.afzender_telefoon && (
              <a href={telLink(offerte.afzender_telefoon)!} className="inline-flex h-[50px] items-center gap-2 rounded-full border bg-white px-6 text-[15px] font-semibold" style={{ borderColor: LIJN, color: NAVY }}>
                <Telefoon size={15} /> Bel {voornaam(offerte.afzender_naam) || "ons"}
              </a>
            )}
          </div>
        </section>

        <div className="mb-6 rounded-[24px] bg-white p-6 md:p-10 print:hidden">
          <h2 className="m-0 text-[22px] font-semibold tracking-[-0.02em]" style={{ ...KOP, color: INKT }}>Zo gaat het verder</h2>
          <div className="mt-6"><Vervolg stappen={inhoud.vervolg ?? offerte.vervolg} klaar={1} /></div>
        </div>

        <article className="overflow-hidden rounded-[28px] shadow-[0_1px_0_rgba(28,26,78,0.04),0_30px_80px_-50px_rgba(28,26,78,0.35)]" style={{ background: PAPIER }}>
          {/* Briefhoofd van het getekende document */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-7 md:px-12" style={{ borderColor: LIJN }}>
            <div className="flex items-center gap-4">
              <Logo className="h-12 w-auto" />
              <span className="hidden h-10 w-px sm:block" style={{ background: LIJN }} aria-hidden="true" />
              <p className="m-0 hidden text-[14px] leading-snug sm:block" style={{ color: BODY }}>Jouw mensen,<br /><span className="font-semibold" style={{ color: INKT }}>onze aandacht.</span></p>
            </div>
            <div className="text-right text-[13.5px]" style={{ color: MUTE }}>
              <p className="m-0 font-semibold" style={{ color: INKT }}>Offerte {inhoud.nummer}</p>
              <p className="m-0">{inhoud.titel}, {LABEL[vorm]}</p>
            </div>
          </div>
          <Hoofd id="afgenomen">
            <Kop nr={nr("afgenomen")} titel="Wat je hebt afgenomen" />
            <ul className="m-0 flex list-none flex-col p-0">
              {t.regels.map(({ regel, bedrag, periode }) => {
                const b = regelbedrag({ bedrag, periode });
                const n = aantalVoor(regel, inhoud.medewerkers);
                const perMedewerker = regel.eenheid === "medewerker_jaar" || regel.eenheid === "medewerker";
                return (
                  <li key={regel.id} className="flex items-start justify-between gap-4 border-t py-4 first:border-t-0 first:pt-0" style={{ borderColor: LIJN }}>
                    <span className="min-w-0">
                      <span className="block text-[16.5px] font-medium" style={{ color: INKT }}>{regel.naam}</span>
                      {perMedewerker && n > 1 && <span className="block text-[13.5px]" style={{ color: MUTE }}>{maandprijs(regel).tekst} × {n}</span>}
                    </span>
                    <span className="shrink-0 text-right text-[16px] font-semibold tabular-nums" style={{ color: INKT }}>
                      {b.bedrag === null ? "Op aanvraag" : b.bedrag === 0 ? "Inbegrepen" : `${euro(b.bedrag)} ${b.per === "maand" ? "per maand" : "eenmalig"}`}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Optelling t={t} />
            {tarieven.length > 0 && (
              <div className="mt-6 rounded-[18px] p-5 md:p-6" style={{ background: ZACHT }}>
                <Label>Tarieven bij gebruik</Label>
                <dl className="m-0 mt-2 grid gap-x-10 sm:grid-cols-2">
                  {tarieven.map((r) => (
                    <div key={r.id} className="flex items-baseline justify-between gap-4 border-b py-2" style={{ borderColor: "#ECE6DB" }}>
                      <dt className="text-[14.5px]" style={{ color: BODY }}>{r.naam}</dt>
                      <dd className="m-0 text-[14.5px] font-semibold tabular-nums" style={{ color: INKT }}>{prijsLabel(r)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </Hoofd>

          {inhoud.inhoud?.trim() && (
            <Hoofd id="over">
              <Kop nr={nr("over")} titel="Over deze offerte" />
              <details className="group">
                <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border px-5 py-2.5 text-[14.5px] font-semibold print:hidden" style={{ borderColor: LIJN, color: NAVY }}>
                  <span className="group-open:hidden">Lees de volledige tekst</span>
                  <span className="hidden group-open:inline">Inklappen</span>
                </summary>
                <div className="mt-6 max-w-[680px] print:mt-0">
                  <OfferteTekst tekst={vulIn(inhoud.inhoud, inhoud)} />
                </div>
              </details>
            </Hoofd>
          )}

          <Hoofd id="voorwaarden">
            <Kop nr={nr("voorwaarden")} titel="Voorwaarden" />
            <OfferteTekst tekst={vulIn(inhoud.voorwaarden, inhoud).trim() || "- Alle bedragen zijn exclusief btw."} klein />
            <p className="m-0 mt-5 text-[14.5px]" style={{ color: BODY }}>
              Op deze offerte zijn de{" "}
              <a href={voorwaarden} target="_blank" rel="noopener" className="font-semibold underline underline-offset-4" style={{ color: NAVY }}>algemene voorwaarden</a>{" "}
              van React2u van toepassing.
            </p>
          </Hoofd>

          <Hoofd id="ondertekening" laatste>
            <Kop nr={nr("ondertekening")} titel="Ondertekening" />
            <div className="grid gap-10 md:grid-cols-2 md:gap-12">
              <div className="flex flex-col">
                <Label>Opdrachtnemer</Label>
                <p className="m-0 mt-2 text-[18px] font-semibold" style={{ ...KOP, color: INKT }}>React2u</p>
                <p className="m-0 text-[13.5px]" style={{ color: MUTE }}>{huis.contact.addressLine1}, {huis.contact.addressLine2}, KvK {huis.contact.kvk}</p>
                <p className={`${handschrift.className} m-0 mt-auto pt-8 text-[40px] leading-none`} style={{ color: NAVY }}>{inhoud.afzender_naam || offerte.afzender_naam || "React2u"}</p>
                <p className="m-0 mt-3 border-t pt-2.5 text-[13.5px]" style={{ borderColor: "#D9D4CA", color: MUTE }}>
                  {inhoud.afzender_naam || offerte.afzender_naam || "React2u"}{inhoud.verstuurd_at ? `, ${datumLang(inhoud.verstuurd_at)}` : ""}
                </p>
              </div>
              <div className="flex flex-col">
                <Label>Opdrachtgever</Label>
                <p className="m-0 mt-2 text-[18px] font-semibold" style={{ ...KOP, color: INKT }}>{inhoud.bedrijf}</p>
                <p className="m-0 text-[14.5px]" style={{ color: MUTE }}>Getekend voor akkoord</p>
                {offerte.handtekening && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={offerte.handtekening} alt={`Handtekening van ${inhoud.getekend_naam}`} className="mt-4 h-auto w-full max-w-[320px]" />
                )}
                <p className="m-0 mt-2 border-t pt-2.5 text-[13.5px]" style={{ borderColor: "#D9D4CA", color: MUTE }}>
                  {inhoud.getekend_naam}{inhoud.getekend_functie ? `, ${inhoud.getekend_functie}` : ""}, {momentLang(inhoud.getekend_at)}
                </p>
                {inhoud.bevestiging && (
                  <span className="mt-2.5 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold" style={{ background: "#E5F6F4", color: TEAL_TEKST }}>
                    <Vink size={12} /> E-mailadres bevestigd met een code
                  </span>
                )}
              </div>
            </div>
            {inhoud.factuur && (
              <div className="mt-8 grid gap-5 rounded-[18px] p-5 sm:grid-cols-2 md:p-6" style={{ background: ZACHT }}>
                <div>
                  <Label>Factuuradres</Label>
                  <p className="m-0 mt-1.5 text-[14.5px] leading-[1.6]" style={{ color: INKT }}>
                    {[inhoud.bedrijf, ...factuurRegels(inhoud.factuur)].map((r, i) => <span key={i} className="block">{r}</span>)}
                  </p>
                </div>
                <div>
                  <Label>Facturen</Label>
                  <p className="m-0 mt-1.5 text-[14.5px] leading-[1.6]" style={{ color: INKT }}>
                    <span className="block break-all">{inhoud.factuur.email}</span>
                    {inhoud.factuur.kvk && <span className="block">KvK {inhoud.factuur.kvk}</span>}
                    {inhoud.factuur.inkoopnummer && <span className="block">Inkoopnummer {inhoud.factuur.inkoopnummer}</span>}
                  </p>
                </div>
              </div>
            )}
            {offerte.getekend_hash && (
              <p className="m-0 mt-8 text-[13px] leading-[1.6]" style={{ color: MUTE }}>
                Kenmerk van de ondertekende versie: <span className="break-all font-mono text-[12px]">{offerte.getekend_hash}</span>.{" "}
                <a href={pdf} target="_blank" rel="noopener" className="font-semibold underline underline-offset-4" style={{ color: NAVY }}>Het ondertekeningscertificaat</a> staat achterin de pdf.
              </p>
            )}
            <div className="mt-10 print:hidden"><Keurmerken huis={huis} /></div>
          </Hoofd>
        </article>
      </main>
      <Voet offerte={offerte} voorwaarden={voorwaarden} huis={huis} />
    </>
  );
}
