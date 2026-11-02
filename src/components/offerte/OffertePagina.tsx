"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Caveat, Outfit } from "next/font/google";
import { LuCheck } from "react-icons/lu";
import Logo from "@/components/site/Logo";
import Beeld from "@/components/site/Beeld";
import { BODY, BREED, Eyebrow, KEURMERKEN, KLANTEN, kop, LINE, NAVY, Pijl, SOFT } from "@/components/blocks/Gedeeld";
import { CONTACT_FALLBACK, type ContactInfo } from "@/lib/content";
import type { Certificate } from "@/lib/nav";
import { woordenboek } from "@/lib/woordenboek";
import Handtekening from "./Handtekening";
import OfferteTekst from "./OfferteTekst";
import { ondertekenaarRegel, VOORWOORD, VOORWOORD_VAN } from "@/lib/offerteVoorwoord";
import { MERKEN, merkVoorVorm, type Merk } from "@/lib/offerteMerk";
import { bewaarKeuze, ondertekenOfferte, vraagCode, wijsOfferteAf } from "@/app/(offerte)/offerte/actions";
import {
  berekenTotalen, datumLang, euro, factuurFout, factuurRegels, herstelKeuze, isNaam, maandprijs, momentLang, normaliseerFactuur,
  normaliseerRegels, normaliseerVervolg, prijsLabel, regelbedrag, secties, wissel, aantalVoor, bedragVoor, vulIn,
  OFFERTE_EMAIL, ONDERTEKEN_FOUT, VERVOLG_STANDAARD, VORMEN,
  type OffertePubliek, type Regel, type Stap, type Totalen, type Vorm,
} from "@/lib/offertes";

/*
 * De offerte zoals de klant hem ziet (/offerte/<token>), en hetzelfde scherm
 * als voorbeeld in het beheer.
 *
 * Geen persoonlijk woord van de afzender meer: het vaste voorwoord van Cindy
 * en Susanne staat er al (Rens, 2 nov 2026).
 *
 * Elk traject in de branding van zijn eigen label (Rens, 2 nov 2026: "het moet
 * deze branding zijn per offerte traject", bij de dienstenkaarten op
 * /werkgevers): Recover roze, Resist teal, Restart oranje, Reflex blauw, Ready
 * indigo, Reward rood. De opbouw is die van de dienstpagina van het label
 * (DienstLabel.tsx):
 *  - de opening als de specialismekaart: de tint met de grote cirkel,
 *    "React2u Recover®", de dienst en de tagline, en rechts een witte kaart
 *    met het voorstel;
 *  - accenten (bovenkopjes, vinkjes, schakelaars, badges) in de labelkleur,
 *    banden afwisselend wit en in de tint;
 *  - "Zo gaat het verder" als de indigo band "Onze aanpak", met de stappen in
 *    de labelkleur;
 *  - het akkoord weer in de tint, als slot van de opening.
 * Kleur, tint, dienst en tagline komen uit het dienstLabel-blok in het CMS
 * (lib/offerteMerk.ts). Geen foto's (Rens, 29 okt).
 *
 * Modus:
 *  - klant      de echte link: keuze wordt bewaard, tekenen kan;
 *  - collega    een beheerder opent de echte link: niets telt, tekenen niet;
 *  - voorbeeld  vanuit het beheer, ook voor een concept.
 */

// Dezelfde variabele als de site (.hv .hv-kop leest --font-outfit).
const outfit = Outfit({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-outfit", display: "swap" });
const handschrift = Caveat({ subsets: ["latin"], weight: ["600"], display: "swap" });

// Grijs van de site (#77758F), net iets donkerder: 4,5:1 op wit en de tinten.
const MUTE = "#6B6985";
// De lichtere cirkel in de indigo band, zoals op de dienstpagina's.
const NAVY_LICHT = "#3B378F";
// De achtergrond van de footer van de site (r2uStijl.ts).
const IVOOR = "#F8F5F1";

export type Modus = "klant" | "collega" | "voorbeeld";

/** Wat React2u zelf meegeeft: bedrijfsgegevens en certificaten (Instellingen), zoals in de footer van de site. */
type Huis = { contact: ContactInfo; certificaten: Certificate[] };

/** De branding van dit traject, voor elk onderdeel van de pagina. */
const MerkContext = createContext<Merk>(MERKEN.recover);
const useMerk = () => useContext(MerkContext);
/** Een vlak in de labelkleur: wit erop, behalve bij Ready (indigo op indigo), dan omgekeerd. */
const opKleur = (m: Merk) => (m.kleur.toLowerCase() === NAVY.toLowerCase() ? { background: "#ffffff", color: NAVY } : { background: m.kleur, color: "#ffffff" });

/**
 * De keurmerken met hun echte logo's (Gedeeld.tsx, dezelfde als op de site).
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
const telLink = (t: string | null) => (t ? `tel:${t.replace(/[^\d+]/g, "")}` : null);
const voornaam = (n: string | null | undefined) => (n || "").trim().split(/\s+/)[0] || "";

/** Knoppen van de site (Doelgroep.tsx, Knop2): rond, vet, met een pijl die meeschuift. */
const KNOP = "inline-flex h-[52px] items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 text-[15px] font-bold disabled:opacity-60";
const knop = {
  roze: `hv-btn hv-btn-roze ${KNOP}`,
  rand: `hv-btn hv-btn-rand ${KNOP}`,
  navy: `hv-btn border-[1.5px] border-[#322E83] bg-[#322E83] text-white hover:bg-[#262268] ${KNOP}`,
  wit: `hv-btn border-[1.5px] border-white bg-white text-[#322E83] ${KNOP}`,
};

const veld =
  "h-[52px] w-full rounded-[14px] border border-[#DCDAE8] bg-white px-4 text-[16px] text-[#322E83] outline-none transition-[border-color,box-shadow] placeholder:text-[#A9A7BC] focus:border-[#322E83] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)] disabled:bg-[#F6F5FB] disabled:text-[#A9A7BC]";

/* ---------- kleine bouwstenen ---------- */

function Vink({ size = 14, dik = 2.8 }: { size?: number; dik?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={dik} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

function Omlaag() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M6 13l6 6 6-6" />
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

function Mail({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" />
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
    <a href={href} className={`inline-flex items-start gap-2 text-left text-[14.5px] font-bold leading-[1.45] underline-offset-[5px] hover:underline ${className}`} style={{ color: NAVY }}>
      <span className="mt-[2px] shrink-0"><Download /></span>Download als pdf om intern te bespreken
    </a>
  );
}

function initialen(naam: string | null) {
  return (naam || "React2u").split(/\s+/).filter(Boolean).map((w) => w[0]).filter((c) => /[A-Za-zÀ-ÿ]/.test(c)).slice(0, 2).join("").toUpperCase() || "R";
}

/** Initialen in een cirkel met een rand in de kleur van de achtergrond. */
function Avatar({ naam, maat = 44, kleur = NAVY, tekst = "#ffffff", rand = "#ffffff" }: { naam: string | null; maat?: number; kleur?: string; tekst?: string; rand?: string }) {
  return (
    <span
      className={`${kop} flex shrink-0 items-center justify-center rounded-full`}
      style={{ width: maat, height: maat, fontSize: maat * 0.36, background: kleur, color: tekst, boxShadow: `0 0 0 ${Math.max(3, Math.round(maat / 16))}px ${rand}` }}
      aria-hidden="true"
    >
      {initialen(naam)}
    </span>
  );
}

/** Klein kopje zoals op de prijskaarten van de site ("Wat je dan per verrichting betaalt"). */
function Label({ children, licht = false }: { children: React.ReactNode; licht?: boolean }) {
  return <span className="block text-[12.5px] font-bold uppercase tracking-[1.2px]" style={{ color: licht ? "rgba(255,255,255,0.72)" : MUTE }}>{children}</span>;
}

/** Vinkje in een rondje, in de tint en kleur van het label. */
function Bolvink({ maat = 22 }: { maat?: number }) {
  const m = useMerk();
  return (
    <span className="mt-0.5 grid shrink-0 place-items-center rounded-full" style={{ width: maat, height: maat, background: m.tint, color: m.tekst }} aria-hidden="true">
      <Vink size={Math.round(maat * 0.52)} dik={3} />
    </span>
  );
}

/** "React2u" met de labelnaam groot in de labelkleur, zoals op de dienstkaarten. */
function Merknaam({ m, klein = false }: { m: Merk; klein?: boolean }) {
  return (
    <span className={`${kop} flex flex-col leading-[1.05]`} style={{ color: NAVY, fontSize: klein ? 15 : 17 }}>
      React2u
      <span className="tracking-[-0.5px]" style={{ color: m.kleur, fontSize: klein ? 24 : 30 }}>
        {m.naam}<sup style={{ color: NAVY, fontSize: klein ? 11 : 13 }}>®</sup>
      </span>
    </span>
  );
}

/** De sectiekop van de site: links bovenkopje en kop, rechts een korte toelichting. */
function SectieKop({ eyebrow, kleur, titel, tekst, licht = false }: { eyebrow: string; kleur?: string; titel: string; tekst?: React.ReactNode; licht?: boolean }) {
  const m = useMerk();
  return (
    <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-6">
      <div className="flex flex-col gap-4 lg:col-span-7">
        <Eyebrow kleur={licht ? "rgba(255,255,255,0.85)" : kleur || m.tekst}>{eyebrow}</Eyebrow>
        <h2 className={`${kop} m-0 leading-[1.1] tracking-[-0.9px]`} style={{ color: licht ? "#ffffff" : NAVY, fontSize: "clamp(32px, 4vw, 46px)" }}>{titel}</h2>
      </div>
      {tekst && <div className="m-0 text-[16px] leading-[1.7] md:text-[17px] lg:col-span-4 lg:col-start-9" style={{ color: licht ? "rgba(255,255,255,0.8)" : BODY }}>{tekst}</div>}
    </div>
  );
}

/** Een band van rand tot rand, wit of in de tint van het label, met de maten van de site. */
function Band({ id, tint = false, children, label }: { id?: string; tint?: boolean; children: React.ReactNode; label?: string }) {
  const m = useMerk();
  return (
    <section id={id} aria-label={label} className="scroll-mt-[96px]" style={{ background: tint ? m.tint : "#ffffff" }}>
      <div className={`${BREED} flex flex-col gap-10 py-16 md:gap-14 md:py-[112px]`}>{children}</div>
    </section>
  );
}

/** Een vlak binnen een band: wit op de tint, de tint op wit. */
const vlak = (m: Merk, tint: boolean): React.CSSProperties => ({ background: tint ? "#ffffff" : m.tint });

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

/** Het hoofdbedrag: per maand, of eenmalig als er niets doorloopt. */
function hoofdbedrag(t: Totalen) {
  return t.perMaand > 0 ? { bedrag: t.perMaand, per: "per maand" } : t.eenmalig > 0 ? { bedrag: t.eenmalig, per: "eenmalig" } : null;
}

/** Het bedrag groot. Een schermlezer hoort alleen het eindbedrag (en alleen in het overzicht, niet in de opening). */
function Bedrag({ t, maat = "text-[52px]", licht = false, live = true }: { t: Totalen; maat?: string; licht?: boolean; live?: boolean }) {
  const hoofd = hoofdbedrag(t);
  const getoond = useTelwaarde(hoofd?.bedrag ?? 0);
  if (!hoofd) return <p className={`${kop} m-0 text-[28px]`} style={{ color: licht ? "#fff" : NAVY }}>Op aanvraag</p>;
  return (
    <p className="m-0 flex flex-wrap items-end gap-x-2">
      <span className={`${kop} ${maat} leading-[0.95] tracking-[-1.6px] tabular-nums`} style={{ color: licht ? "#fff" : NAVY }} aria-hidden={live || undefined}>{euro(getoond)}</span>
      {live && <span className="sr-only" aria-live="polite">{euro(hoofd.bedrag)}</span>}
      <span className="pb-1 text-[15px]" style={{ color: licht ? "rgba(255,255,255,0.78)" : BODY }}>{hoofd.per}</span>
    </p>
  );
}

/** Onder het bedrag: per jaar en eenmalig, en dat het exclusief btw is. */
function Kleintje({ t, licht = false }: { t: Totalen; licht?: boolean }) {
  const jaar = t.perMaand > 0 ? `${euro(t.perJaar)} per jaar${t.eenmalig > 0 ? `, plus ${euro(t.eenmalig)} eenmalig` : ""}` : "";
  return (
    <p className="m-0 mt-2 text-[14px] leading-[1.55]" style={{ color: licht ? "rgba(255,255,255,0.72)" : MUTE }}>
      {jaar && <span className="block">{jaar}</span>}
      <span className="block">Bedragen exclusief btw</span>
    </p>
  );
}

/**
 * Wat voor de hele pagina geldt: geen animaties of vloeiend scrollen bij
 * "minder beweging". De focusring komt uit globals.css, net als op de site.
 */
const PAGINA_CSS = `
.offerte-regel { animation: offerte-regel 320ms cubic-bezier(.2,.8,.2,1) both; }
@keyframes offerte-regel { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .offerte-doc *, .offerte-doc *::before, .offerte-doc *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}`;

/** Naar een onderdeel, vloeiend tenzij de klant minder beweging wil. */
function scrollNaar(id: string) {
  const rustig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: rustig ? "auto" : "smooth", block: "start" });
}

/** Of een onderdeel (het akkoord) in beeld is: dan hoeft de knop ernaartoe niet meer. */
function useInBeeld(id: string) {
  const [inBeeld, setInBeeld] = useState(false);
  useEffect(() => {
    const el = document.getElementById(id);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInBeeld(e.isIntersecting), { rootMargin: "-25% 0px -40% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [id]);
  return inBeeld;
}

/* ---------- de pagina ---------- */

export default function OffertePagina({
  offerte, token, modus, voorwaarden, vers = false, contact = CONTACT_FALLBACK, certificaten = [], merk,
}: {
  offerte: OffertePubliek;
  token?: string;
  modus: Modus;
  voorwaarden: string;
  /** Net getekend (minder dan een kwartier geleden): dan de felicitatie, anders een rustige bevestiging. */
  vers?: boolean;
  contact?: ContactInfo;
  certificaten?: Certificate[];
  /** De branding van het label uit het CMS; zonder: de vaste gegevens bij de vorm. */
  merk?: Merk;
}) {
  const getekend = offerte.status === "getekend" && offerte.getekend_inhoud;
  const huis: Huis = { contact, certificaten };
  const vorm = (getekend ? offerte.getekend_inhoud!.vorm : offerte.vorm) as Vorm | null;
  const m = merk || merkVoorVorm(vorm && VORMEN[vorm] ? vorm : "verzuimbegeleiding");
  return (
    <MerkContext.Provider value={m}>
      <div className={`hv ${outfit.variable} offerte-doc min-h-screen bg-white`}>
        <style>{PAGINA_CSS}</style>
        {getekend ? (
          <Getekend offerte={offerte} token={token} voorwaarden={voorwaarden} modus={modus} vers={vers} huis={huis} />
        ) : (
          <Document offerte={offerte} token={token} modus={modus} voorwaarden={voorwaarden} huis={huis} />
        )}
      </div>
    </MerkContext.Provider>
  );
}

/* ---------- kop, meldingen en voet ---------- */

/** De kopbalk van de site: logo, waar je bent, en rechts de hoofdactie. */
function Kopbalk({ offerte, actie }: { offerte: OffertePubliek; actie?: React.ReactNode }) {
  const tel = telLink(offerte.afzender_telefoon);
  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur-md print:static" style={{ borderColor: LINE }}>
      <div className={`${BREED} flex h-[72px] items-center justify-between gap-4 md:h-[88px]`}>
        <div className="flex min-w-0 items-center gap-4">
          <Logo className="h-9 w-auto shrink-0 md:h-11" />
          <span className="hidden h-8 w-px sm:block" style={{ background: LINE }} aria-hidden="true" />
          <span className="hidden truncate text-[15px] font-bold sm:block" style={{ color: NAVY }}>Offerte {offerte.nummer}</span>
        </div>
        <div className="flex shrink-0 items-center gap-5">
          {tel && (
            <a href={tel} className="inline-flex items-center gap-2 text-[15px] font-bold print:hidden" style={{ color: NAVY }}>
              <Telefoon size={15} /> <span className="hidden md:inline">Bel {voornaam(offerte.afzender_naam) || "ons"}</span><span className="md:hidden">Bellen</span>
            </a>
          )}
          {/* Op de telefoon staat de actie in de balk onderaan */}
          {actie && <div className="hidden sm:block">{actie}</div>}
        </div>
      </div>
    </header>
  );
}

function Melding({ modus }: { modus: Modus }) {
  if (modus === "klant") return null;
  return (
    <div className="bg-[#FFF4E5] text-[14px] text-[#7A4A06] print:hidden">
      <p className={`${BREED} m-0 py-2.5`}>
        {modus === "voorbeeld"
          ? "Voorbeeld: zo ziet de klant de offerte. Je keuzes hier worden niet bewaard en tekenen kan niet."
          : "Je bekijkt deze offerte als collega. Dit bezoek telt niet mee en ondertekenen kan alleen de klant."}
      </p>
    </div>
  );
}

function Strip({ kleur, tekst, children }: { kleur: string; tekst: string; children: React.ReactNode }) {
  return (
    <div style={{ background: kleur, color: tekst }}>
      <p className={`${BREED} m-0 py-3 text-[15px]`}>{children}</p>
    </div>
  );
}

/** De voet zoals de footer van de site (FooterR2u): ivoor, met een witte kaart en de gegevens van React2u. */
function Voet({ offerte, voorwaarden, huis }: { offerte: OffertePubliek; voorwaarden: string; huis: Huis }) {
  const c = huis.contact;
  const kolomkop = "m-0 text-[15px] font-bold";
  return (
    <footer className="pb-32 pt-12 md:pt-16 lg:pb-16 print:pb-0" style={{ background: IVOOR }}>
      <div className={`${BREED} flex flex-col gap-8`}>
        <div className="grid gap-8 rounded-[22px] bg-white px-6 py-9 sm:grid-cols-2 md:px-10 lg:grid-cols-[1.1fr_1fr_1fr_1fr] lg:gap-10">
          <div className="flex flex-col gap-3">
            <Logo className="h-12 w-auto self-start" />
            <p className="m-0 text-[15px]" style={{ color: BODY }}>Jouw mensen, <span className="font-bold" style={{ color: NAVY }}>onze aandacht.</span></p>
          </div>
          <div className="flex flex-col gap-3">
            <p className={kolomkop} style={{ color: NAVY }}>Bezoekadres</p>
            <p className="m-0 text-[15px] leading-[1.75]" style={{ color: BODY }}>React2u<br />{c.addressLine1}<br />{c.addressLine2}</p>
          </div>
          <div className="flex flex-col gap-3">
            <p className={kolomkop} style={{ color: NAVY }}>Contact</p>
            <p className="m-0 text-[15px] leading-[1.75]" style={{ color: BODY }}>
              <a href={`tel:${c.phone}`} className="font-bold hover:underline" style={{ color: NAVY }}>{telefoonTekst(c)}</a><br />
              Ma t/m vr 9.00 tot 17.00 uur<br />
              <a href={`mailto:${offerte.afzender_email || OFFERTE_EMAIL}`} className="font-bold hover:underline" style={{ color: NAVY }}>{offerte.afzender_email || OFFERTE_EMAIL}</a>
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <p className={kolomkop} style={{ color: NAVY }}>Deze offerte</p>
            <p className="m-0 text-[15px] leading-[1.75]" style={{ color: BODY }}>
              Offerte {offerte.nummer}<br />
              Alle bedragen exclusief btw<br />
              <a href={voorwaarden} target="_blank" rel="noopener" className="font-bold hover:underline" style={{ color: NAVY }}>Algemene voorwaarden</a>
            </p>
          </div>
        </div>
        <p className="m-0 text-[13.5px]" style={{ color: MUTE }}>
          © {new Date().getFullYear()} React2u. KvK {c.kvk}, btw {c.btw}.
        </p>
      </div>
    </footer>
  );
}

/* ---------- de opening: de specialismekaart van het label ---------- */

/**
 * De opening als de specialismekaart op de dienstpagina van het label: de tint
 * met de grote cirkel in de labelkleur, "React2u Recover®" met de dienst en de
 * tagline, en rechts een witte kaart. Daaronder de offerte zelf: voor wie, door
 * wie, de feiten en de knoppen.
 */
function Opening({ nummer, bedrijf, zin, tekst, feiten, knoppen, kaart }: {
  nummer: string;
  bedrijf: string;
  /** De offerte in één regel, groot onder de dienst: "Verzuimbegeleiding op maat voor …". */
  zin: React.ReactNode;
  tekst: React.ReactNode;
  feiten?: [string, string][];
  knoppen: React.ReactNode;
  kaart: React.ReactNode;
}) {
  const m = useMerk();
  return (
    <section className="px-[6px] pt-2 md:px-6 md:pt-6 xl:px-10">
      <div className="relative mx-auto grid max-w-[1360px] gap-10 overflow-hidden rounded-[28px] px-6 pb-8 pt-10 md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-14 lg:p-16 xl:p-[72px]" style={{ background: m.tint }}>
        <span aria-hidden className="absolute right-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full md:h-[560px] md:w-[560px]" style={{ background: m.kleur, opacity: 0.12 }} />
        <span aria-hidden className="absolute bottom-[-120px] left-[38%] hidden h-[220px] w-[220px] rounded-full lg:block" style={{ background: m.kleur, opacity: 0.06 }} />
        <div className="relative flex flex-col gap-6">
          <p className="m-0 flex flex-col gap-0.5 text-[14px] font-semibold sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5" style={{ color: MUTE }}>
            <span>Offerte {nummer}</span><span aria-hidden className="hidden sm:inline">/</span><span style={{ color: NAVY }}>{bedrijf}</span>
          </p>
          <div>
            {/* Kleur inline: de algemene kopstijl van de site staat buiten de Tailwind-lagen en wint anders */}
            <h1 className={`${kop} m-0 text-[24px] leading-[1.05] tracking-[-0.4px] md:text-[32px]`} style={{ color: NAVY }}>
              React2u<br />
              <span className="mt-1 inline-block text-[56px] tracking-[-1.6px] md:text-[80px] md:tracking-[-2.2px]">
                <span style={{ color: m.kleur }}>{m.naam}</span>
                <span className="ml-1 align-super text-[22px] md:text-[28px]" style={{ color: NAVY }}>®</span>
              </span>
              <span className="hv-dienst mt-4 block text-[18px] font-bold leading-[1.5] tracking-normal md:text-[21px]">{m.dienst}</span>
            </h1>
            <p className="m-0 text-[18px] leading-[1.5] md:text-[21px]" style={{ color: NAVY }}><em>{m.tagline}</em></p>
          </div>
          <div className="flex max-w-[600px] flex-col gap-3 border-t pt-6" style={{ borderColor: "rgba(50,46,131,0.12)" }}>
            <p className={`${kop} m-0 text-[24px] leading-[1.25] tracking-[-0.4px] md:text-[28px]`} style={{ color: NAVY }}>{zin}</p>
            <div className="text-[16px] leading-[1.7] md:text-[17px]" style={{ color: BODY }}>{tekst}</div>
          </div>
          {feiten && feiten.length > 0 && (
            <dl className="m-0 flex flex-wrap gap-x-10 gap-y-4">
              {feiten.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-[13px]" style={{ color: MUTE }}>{k}</dt>
                  <dd className="m-0 mt-0.5 text-[16px] font-bold" style={{ color: NAVY }}>{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="flex flex-wrap gap-3 pt-1 print:hidden">{knoppen}</div>
        </div>
        <div className="relative">{kaart}</div>
      </div>
    </section>
  );
}

/**
 * De witte kaart in de opening: het bedrag dat meetelt, wat je krijgt (de
 * gekozen onderdelen) en de contactpersoon. Geen <aside>: het overzicht bij de
 * keuzes is het eerste.
 */
function VoorstelKaart({ offerte, totalen, open, heeftKeuze }: { offerte: OffertePubliek; totalen: Totalen; open: boolean; heeftKeuze: boolean }) {
  const m = useMerk();
  const tel = telLink(offerte.afzender_telefoon);
  const onderdelen = totalen.regels.map((r) => r.regel.naam);
  return (
    <div className="rounded-[24px] bg-white p-6 shadow-[0_30px_70px_-40px_rgba(50,46,131,0.45)] md:p-8">
      <div className="flex items-start justify-between gap-4">
        <Label>{open && heeftKeuze ? "Jouw keuze" : "Jouw voorstel"}</Label>
        <span className="h-3 w-3 rounded-full" style={{ background: m.kleur }} aria-hidden="true" />
      </div>
      <div className="mt-3"><Bedrag t={totalen} maat="text-[48px] md:text-[54px]" live={false} /></div>
      <Kleintje t={totalen} />
      {onderdelen.length > 0 && (
        <div className="mt-6 flex flex-col gap-3 border-t pt-5" style={{ borderColor: LINE }}>
          <Label>Wat je krijgt</Label>
          {onderdelen.slice(0, 6).map((n) => (
            <span key={n} className="flex items-start gap-2.5 text-[15.5px] leading-[1.45]" style={{ color: NAVY }}>
              <span className="mt-0.5 shrink-0" style={{ color: m.kleur }}><Vink size={17} dik={2.8} /></span>{n}
            </span>
          ))}
        </div>
      )}
      <div className="mt-6 flex items-center gap-3 border-t pt-5" style={{ borderColor: LINE }}>
        <Avatar naam={offerte.afzender_naam} maat={42} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="m-0 text-[15px] font-bold" style={{ color: NAVY }}>{offerte.afzender_naam || "React2u"}</p>
          <p className="m-0 truncate text-[13.5px]" style={{ color: MUTE }}>Je contactpersoon bij React2u</p>
        </div>
        {tel && (
          <a href={tel} aria-label={`Bel ${offerte.afzender_naam || "React2u"}`} className="hv-btn hv-btn-rand flex h-10 w-10 items-center justify-center rounded-full">
            <Telefoon size={16} />
          </a>
        )}
      </div>
    </div>
  );
}

/* ---------- het document ---------- */

function Document({ offerte, token, modus, voorwaarden, huis }: { offerte: OffertePubliek; token?: string; modus: Modus; voorwaarden: string; huis: Huis }) {
  const m = useMerk();
  const regels = useMemo(() => normaliseerRegels(offerte.regels), [offerte.regels]);
  const [keuze, setKeuze] = useState<string[]>(() => herstelKeuze(regels, offerte.keuze));
  const totalen = useMemo(() => berekenTotalen(regels, keuze, offerte.medewerkers), [regels, keuze, offerte.medewerkers]);
  const open = (offerte.status === "verstuurd" && !offerte.verlopen) || (modus === "voorbeeld" && offerte.status === "concept");
  const kanTekenen = offerte.status === "verstuurd" && !offerte.verlopen && modus === "klant" && Boolean(token);
  const kanKiezen = offerte.status === "verstuurd" || modus === "voorbeeld";
  const [afwijzen, setAfwijzen] = useState(false);
  const vorm: Vorm = VORMEN[offerte.vorm] ? offerte.vorm : "verzuimbegeleiding";
  const heeftKeuze = regels.some((r) => r.soort === "optie" || r.soort === "keuze");
  const bijAkkoord = useInBeeld("akkoord");
  // De aanbevolen extra's staan in hun eigen blok; een prijs per medewerker alleen als het aantal bekend is.
  const gewoon = useMemo(() => regels.filter((r) => !r.aanbevolen), [regels]);
  const extras = useMemo(
    () => regels.filter((r) => r.aanbevolen && (offerte.medewerkers || (r.eenheid !== "medewerker_jaar" && r.eenheid !== "medewerker"))),
    [regels, offerte.medewerkers]
  );
  // Wat een andere keuze in een groep per maand en eenmalig scheelt, voor het upgrade-duwtje.
  const verschil = (id: string) => {
    const t = berekenTotalen(regels, wissel(regels, keuze, id), offerte.medewerkers);
    return { maand: Math.round((t.perMaand - totalen.perMaand) * 100) / 100, eenmalig: Math.round((t.eenmalig - totalen.eenmalig) * 100) / 100 };
  };
  // Wit en tint om en om onder de opening (die zelf in de tint staat, dus eerst wit), wat er ook in de offerte staat.
  const banden = ["voorwoord", ...(offerte.inhoud?.trim() ? ["over"] : []), "keuze"];
  const tint = (id: string) => banden.indexOf(id) % 2 === 1;

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

  const naarAkkoord = () => scrollNaar("akkoord");
  const klik = (id: string) => kanKiezen && setKeuze((k) => wissel(regels, k, id));
  // Concept-pdf: voor de klant via zijn link, in het voorbeeld via het beheer. Niet bij een afgewezen offerte.
  const conceptHref =
    offerte.status === "verstuurd" && token ? `/offerte/${token}/concept?keuze=${encodeURIComponent(keuze.join(","))}&download=1` :
    modus === "voorbeeld" && offerte.status !== "afgewezen" ? `/admin/offertevoorbeeld/${offerte.id}/concept?keuze=${encodeURIComponent(keuze.join(","))}&download=1` :
    null;
  const tel = telLink(offerte.afzender_telefoon);
  const feiten: [string, string][] = [
    ...(offerte.betreft ? ([[VORMEN[vorm].betreft || "Betreft", offerte.betreft]] as [string, string][]) : []),
    ...(offerte.medewerkers ? ([["Medewerkers", offerte.medewerkers.toLocaleString("nl-NL")]] as [string, string][]) : []),
    ...(offerte.geldig_tot ? ([["Geldig tot en met", datumLang(offerte.geldig_tot)]] as [string, string][]) : []),
  ];

  return (
    <>
      <Kopbalk
        offerte={offerte}
        actie={open ? <button type="button" onClick={naarAkkoord} className={`${knop.roze} !h-[48px] md:!h-[52px]`}>Ondertekenen<Pijl /></button> : null}
      />
      <Melding modus={modus} />
      {offerte.verlopen && offerte.status === "verstuurd" && (
        <Strip kleur="#FFF4E5" tekst="#7A4A06">
          Deze offerte was geldig tot en met {datumLang(offerte.geldig_tot)}. Wil je toch verder? Neem contact op met {offerte.afzender_naam || "ons"}, dan sturen we je een nieuwe.
        </Strip>
      )}
      {offerte.status === "afgewezen" && (
        <Strip kleur="#FDECEA" tekst="#8A1C12">
          Je hebt laten weten niet akkoord te gaan met deze offerte. Toch interesse, of wil je iets aanpassen? Neem gerust contact op.
        </Strip>
      )}

      <main>
        <Opening
          nummer={offerte.nummer}
          bedrijf={offerte.bedrijf}
          zin={<>{offerte.titel} voor {offerte.bedrijf}</>}
          tekst={
            <p className="m-0">
              Opgesteld door {offerte.afzender_naam || "React2u"}{offerte.contactpersoon ? ` voor ${offerte.contactpersoon}` : ""}, op{" "}
              {datumLang(offerte.verstuurd_at || new Date().toISOString())}.{" "}
              {heeftKeuze ? "Kies wat bij jullie past, het bedrag rekent meteen mee." : "Hieronder lees je precies wat we doen en wat het kost."}
            </p>
          }
          feiten={feiten}
          knoppen={
            <>
              <a href="#keuze" className={knop.roze}>{heeftKeuze ? "Stel je offerte samen" : "Bekijk de offerte"}<Pijl /></a>
              {tel && <a href={tel} className={knop.rand}>Bel {voornaam(offerte.afzender_naam) || "ons"}<Pijl /></a>}
            </>
          }
          kaart={<VoorstelKaart offerte={offerte} totalen={totalen} open={open} heeftKeuze={heeftKeuze} />}
        />

        <Voorwoord offerte={offerte} tint={tint("voorwoord")} />

        {offerte.inhoud?.trim() && (
          <section aria-label="Over deze offerte" style={{ background: tint("over") ? m.tint : "#ffffff" }}>
            <div className={`${BREED} grid gap-8 py-16 md:py-[112px] lg:grid-cols-12 lg:gap-6`}>
              <div className="flex flex-col gap-4 lg:col-span-4">
                <Eyebrow kleur={m.tekst}>React2u {m.naam}</Eyebrow>
                <h2 className={`${kop} m-0 text-[34px] leading-[1.08] tracking-[-0.9px] md:text-[46px]`} style={{ color: NAVY }}>Over deze offerte</h2>
              </div>
              <div className="rounded-[28px] p-6 md:p-10 lg:col-span-8 lg:col-start-5" style={vlak(m, tint("over"))}>
                <Toelichting tekst={vulIn(offerte.inhoud, offerte)} achter={tint("over") ? "#ffffff" : m.tint} />
              </div>
            </div>
          </section>
        )}

        <Band id="keuze" tint={tint("keuze")}>
          <SectieKop
            eyebrow={heeftKeuze ? "Stel je offerte samen" : "Wat je krijgt"}
            titel={heeftKeuze ? "Kies wat bij jullie past" : "Dit doen we voor je"}
            tekst={heeftKeuze ? "Kies je aansluiting en zet extra's aan of uit. Rechts zie je meteen wat het per maand kost." : "Wat we voor je doen en wat het kost, precies zoals in de prijslijst."}
          />
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-6">
            <div className="flex min-w-0 flex-col gap-12 lg:col-span-8">
              {/* Eerst wat je kiest, dan de aanbevolen extra's, en de tarieven bij gebruik als naslag onderaan */}
              {secties(gewoon).filter((s) => s.regels.some((r) => r.soort !== "tarief")).map((s) => (
                <Sectie key={s.naam} sectie={s} keuze={keuze} klik={klik} medewerkers={offerte.medewerkers} kanKiezen={kanKiezen} verschil={open ? verschil : undefined} />
              ))}
              <Extras regels={extras} keuze={keuze} klik={klik} medewerkers={offerte.medewerkers} kanKiezen={kanKiezen} achter={tint("keuze") ? m.tint : "#ffffff"} />
              {secties(gewoon).filter((s) => s.regels.every((r) => r.soort === "tarief")).map((s) => (
                <Sectie key={s.naam} sectie={s} keuze={keuze} klik={klik} medewerkers={offerte.medewerkers} kanKiezen={kanKiezen} />
              ))}
            </div>
            {/* Op een groot scherm loopt het overzicht mee langs de keuzes */}
            <div className="hidden lg:col-span-4 lg:block">
              <Overzicht offerte={offerte} totalen={totalen} open={open} heeftKeuze={heeftKeuze} bijAkkoord={bijAkkoord} naarAkkoord={naarAkkoord} conceptHref={conceptHref} />
            </div>
          </div>
          <Optelling t={totalen} open={open} naarAkkoord={naarAkkoord} />
        </Band>

        <Aanpak stappen={offerte.vervolg} titel="Na je akkoord" tekst="Je tekent online met een code uit je mail. Daarna plannen we samen de start." />

        <Vertrouwen huis={huis} />

        <section id="akkoord" aria-label="Akkoord" className="scroll-mt-[96px] bg-white px-[6px] pb-10 md:px-6 md:pb-16 xl:px-10">
          <div className="relative mx-auto max-w-[1360px] overflow-hidden rounded-[28px] px-5 py-12 sm:px-8 md:rounded-[36px] md:px-12 md:py-16 xl:px-[72px] xl:py-[88px]" style={{ background: m.tint }}>
            <span aria-hidden className="absolute right-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full md:h-[560px] md:w-[560px]" style={{ background: m.kleur, opacity: 0.12 }} />
            <div className="relative grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-6">
              <div className="flex flex-col gap-5 lg:col-span-6">
                <Eyebrow kleur={m.tekst}>Akkoord</Eyebrow>
                <h2 className={`${kop} m-0 text-[36px] leading-[1.05] tracking-[-1px] md:text-[50px] md:tracking-[-1.4px]`}>
                  <span className="block" style={{ color: NAVY }}>Teken voor akkoord.</span>
                  <span className="block" style={{ color: m.kleur }}>Wij doen de rest.</span>
                </h2>
                <p className="m-0 max-w-[480px] text-[16px] leading-[1.7] md:text-[17px]" style={{ color: BODY }}>
                  {open ? "Zet je handtekening en bevestig met de code uit je mail. De getekende offerte krijg je meteen als pdf." : "Ondertekenen kan bij deze offerte niet meer. Neem gerust contact op."}
                </p>
              </div>
              <ContactRijen offerte={offerte} huis={huis} />
            </div>
            <div className="relative mt-10 rounded-[24px] bg-white p-5 shadow-[0_30px_70px_-50px_rgba(50,46,131,0.5)] sm:p-7 md:mt-14 md:p-10">
              <div className="mb-9 grid gap-5 border-b pb-8 md:grid-cols-12" style={{ borderColor: LINE }}>
                <div className="md:col-span-7">
                  <h3 className={`${kop} m-0 text-[22px]`} style={{ color: NAVY }}>Voorwaarden</h3>
                  <div className="mt-4"><OfferteTekst tekst={vulIn(offerte.voorwaarden, offerte).trim() || "- Alle bedragen zijn exclusief btw."} klein /></div>
                </div>
                <p className="m-0 text-[15px] leading-[1.7] md:col-span-4 md:col-start-9 md:self-end" style={{ color: BODY }}>
                  {offerte.geldig_tot ? `Deze offerte is geldig tot en met ${datumLang(offerte.geldig_tot)}. ` : ""}Op deze offerte zijn de{" "}
                  <a href={voorwaarden} target="_blank" rel="noopener" className="font-bold underline underline-offset-4" style={{ color: NAVY }}>algemene voorwaarden</a> van React2u van toepassing.
                </p>
              </div>
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
            </div>
          </div>
        </section>
      </main>

      <Voet offerte={offerte} voorwaarden={voorwaarden} huis={huis} />

      {/* Telefoon: het maandbedrag en de knop in beeld, tot je bij het akkoord bent (daar staat de echte knop) */}
      {open && (
        <div
          className={`fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 px-5 py-3 backdrop-blur transition-transform duration-300 lg:hidden print:hidden ${bijAkkoord ? "translate-y-full" : ""}`}
          style={{ borderColor: LINE, paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
          aria-hidden={bijAkkoord || undefined}
        >
          <div className="mx-auto flex max-w-[640px] items-center gap-4">
            <div className="min-w-0 flex-1 leading-tight">
              <span className="block whitespace-nowrap">
                <span className={`${kop} text-[22px] tabular-nums tracking-[-0.4px]`} style={{ color: NAVY }}>{totalen.perMaand > 0 ? euro(totalen.perMaand) : euro(totalen.eenmalig)}</span>
                <span className="ml-1 text-[14px]" style={{ color: BODY }}>{totalen.perMaand > 0 ? "per maand" : "eenmalig"}</span>
              </span>
              <span className="block truncate text-[12.5px]" style={{ color: MUTE }}>
                {totalen.perMaand > 0 && totalen.eenmalig > 0 ? `+ ${euro(totalen.eenmalig)} eenmalig, ` : ""}exclusief btw
              </span>
            </div>
            <button type="button" onClick={naarAkkoord} className={`${knop.roze} !h-[50px] !px-5`}>Ondertekenen</button>
          </div>
        </div>
      )}

      {afwijzen && token && <AfwijsVenster offerte={offerte} token={token} sluit={() => setAfwijzen(false)} />}
    </>
  );
}

/** Bellen en mailen naast het akkoord, zoals de contactrijen van de site, op de tint van het label. */
function ContactRijen({ offerte, huis }: { offerte: OffertePubliek; huis: Huis }) {
  const m = useMerk();
  const tel = telLink(offerte.afzender_telefoon) || `tel:${huis.contact.phone}`;
  const telTekst = offerte.afzender_telefoon || telefoonTekst(huis.contact);
  const mail = offerte.afzender_email || OFFERTE_EMAIL;
  const rijen = [
    { href: tel, icoon: <Telefoon size={18} />, klein: `Bel ${voornaam(offerte.afzender_naam) || "ons"}, ma t/m vr 9.00 tot 17.00 uur`, groot: telTekst },
    { href: `mailto:${mail}?subject=${encodeURIComponent(`Vraag over offerte ${offerte.nummer}`)}`, icoon: <Mail size={18} />, klein: "Mailen", groot: mail },
  ];
  return (
    <ul className="m-0 flex list-none flex-col p-0 lg:col-span-5 lg:col-start-8">
      {rijen.map((r) => (
        <li key={r.groot} className="border-t last:border-b" style={{ borderColor: "rgba(50,46,131,0.12)" }}>
          <a href={r.href} className="hv-btn group flex items-center gap-4 py-5" style={{ color: NAVY }}>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white" style={{ color: m.tekst }}>{r.icoon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold" style={{ color: MUTE }}>{r.klein}</span>
              <span className={`${kop} block truncate text-[19px] md:text-[21px]`}>{r.groot}</span>
            </span>
            <Pijl />
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Het overzicht naast de keuzes: wat je hebt gekozen, regel voor regel, met
 * het totaal dat meetelt. Het eerste <aside> van de pagina (de browsertests
 * lezen het bedrag hier).
 */
function Overzicht({ offerte, totalen, open, heeftKeuze, bijAkkoord, naarAkkoord, conceptHref }: {
  offerte: OffertePubliek; totalen: Totalen; open: boolean; heeftKeuze: boolean; bijAkkoord: boolean; naarAkkoord: () => void; conceptHref: string | null;
}) {
  const m = useMerk();
  const tel = telLink(offerte.afzender_telefoon);
  return (
    <aside aria-label="Jouw voorstel" className="sticky top-[112px] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_70px_-40px_rgba(50,46,131,0.45)]" style={{ border: `1px solid ${LINE}` }}>
      <div className="relative overflow-hidden px-7 pb-5 pt-6" style={{ background: m.tint }}>
        <span aria-hidden className="absolute -right-[36px] -top-[36px] h-[110px] w-[110px] rounded-full" style={{ background: m.kleur, opacity: 0.16 }} />
        <span className="relative flex items-start justify-between gap-3">
          <Merknaam m={m} klein />
          <span className="relative rounded-md bg-white px-2.5 py-1 text-[12.5px] font-bold" style={{ color: NAVY }}>{open && heeftKeuze ? "Jouw keuze" : "Voorstel"}</span>
        </span>
      </div>
      <div className="px-7 pb-7 pt-5">
        <ul className="m-0 flex list-none flex-col p-0">
          {totalen.regels.map(({ regel, bedrag, periode }) => {
            const b = regelbedrag({ bedrag, periode });
            return (
              <li key={regel.id} className="offerte-regel flex items-baseline justify-between gap-4 border-b py-2.5 text-[14.5px]" style={{ borderColor: LINE }}>
                <span style={{ color: BODY }}>{regel.naam}</span>
                <span className="shrink-0 font-bold tabular-nums" style={{ color: b.bedrag === 0 ? m.tekst : NAVY }}>
                  {b.bedrag === null ? "Op aanvraag" : b.bedrag === 0 ? "Inbegrepen" : `${euro(b.bedrag)}${b.per === "maand" ? " p/m" : " eenmalig"}`}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-5">
          <Label>{totalen.perMaand > 0 ? "Totaal per maand" : "Totaal"}</Label>
          <div className="mt-2"><Bedrag t={totalen} maat="text-[46px]" /></div>
          <Kleintje t={totalen} />
        </div>
        {open && (bijAkkoord ? (
          <p className="m-0 mt-6 flex items-center gap-2 text-[15px] font-bold" style={{ color: m.tekst }}><Vink size={15} /> Je ondertekent hieronder</p>
        ) : (
          <button type="button" onClick={naarAkkoord} className={`${knop.roze} mt-6 w-full`}>Naar ondertekenen<Pijl /></button>
        ))}
        {conceptHref && <div className="mt-4 flex justify-center"><ConceptLink href={conceptHref} className="text-[14px]" /></div>}
        <div className="mt-6 flex items-center gap-3 border-t pt-5" style={{ borderColor: LINE }}>
          <Avatar naam={offerte.afzender_naam} maat={40} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="m-0 text-[14.5px] font-bold" style={{ color: NAVY }}>Vragen?</p>
            <p className="m-0 truncate text-[13.5px]" style={{ color: MUTE }}>{offerte.afzender_naam || "React2u"} denkt graag mee</p>
          </div>
          {tel && (
            <a href={tel} aria-label={`Bel ${offerte.afzender_naam || "React2u"}`} className="hv-btn hv-btn-rand flex h-10 w-10 items-center justify-center rounded-full">
              <Telefoon size={16} />
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}

/**
 * Het vaste voorwoord van Cindy en Susanne (lib/offerteVoorwoord.ts): links
 * hun initialen, de kop en de uitgelichte zin zoals de klantcitaten van de
 * site; rechts de brief, met de eerste alinea als intro en onderaan hun twee
 * handtekeningen. Op een groot scherm blijft links staan.
 */
function Voorwoord({ offerte, tint }: { offerte: OffertePubliek; tint: boolean }) {
  const m = useMerk();
  const v = VOORWOORD;
  const achter = tint ? m.tint : "#ffffff";
  const [eerste, ...rest] = v.alineas;
  const kleur2 = opKleur(m);
  return (
    <section aria-labelledby="voorwoord-kop" style={{ background: achter }}>
      <div className={`${BREED} grid gap-10 py-16 md:py-[112px] lg:grid-cols-12 lg:gap-6`}>
        <div className="flex flex-col gap-7 lg:sticky lg:top-[120px] lg:col-span-5 lg:self-start xl:col-span-4">
          <div className="relative h-[112px] w-[200px]" aria-hidden="true">
            <span className="absolute left-0 top-[8px]"><Avatar naam={v.ondertekenaars[0]?.naam || "C"} maat={88} rand={achter} /></span>
            <span className="absolute left-[70px] top-[18px]"><Avatar naam={v.ondertekenaars[1]?.naam || "S"} maat={88} kleur={kleur2.background} tekst={kleur2.color} rand={achter} /></span>
            <span className="absolute left-[170px] top-0 h-4 w-4 rounded-full" style={{ background: m.kleur, opacity: 0.35 }} />
            <span className="absolute left-[176px] top-[84px] h-2.5 w-2.5 rounded-full" style={{ background: m.kleur }} />
          </div>
          <div className="flex flex-col gap-4">
            <Eyebrow kleur={m.tekst}>Voorwoord</Eyebrow>
            <h2 id="voorwoord-kop" className={`${kop} m-0 text-[34px] leading-[1.08] tracking-[-0.9px] md:text-[46px]`} style={{ color: NAVY }}>{v.kop}</h2>
          </div>
          <figure className="m-0 flex flex-col gap-3">
            <span aria-hidden className={`${kop} text-[64px] leading-[0.6]`} style={{ color: m.kleur }}>“</span>
            <blockquote className="m-0">
              <p className={`${kop} m-0 text-[20px] leading-[1.45] md:text-[22px]`} style={{ color: NAVY, fontWeight: 500 }}>{v.citaat}</p>
            </blockquote>
            <figcaption className="text-[15px]" style={{ color: MUTE }}><span className="font-bold" style={{ color: NAVY }}>{VOORWOORD_VAN}</span>, React2u</figcaption>
          </figure>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <div className="flex max-w-[680px] flex-col gap-6">
            <p className={`${kop} m-0 text-[21px] leading-[1.55] md:text-[24px]`} style={{ color: NAVY, fontWeight: 500 }}>{vulIn(eerste, offerte)}</p>
            {rest.map((a, i) => (
              <p key={i} className="m-0 text-[17px] leading-[1.8] md:text-[18px]" style={{ color: BODY }}>{vulIn(a, offerte)}</p>
            ))}
            <p className="m-0 text-[17px] md:text-[18px]" style={{ color: BODY }}>{v.groet}</p>
          </div>
          <div className="mt-6 grid max-w-[680px] grid-cols-2 gap-5 sm:gap-8">
            {v.ondertekenaars.map((o) => (
              <div key={o.naam}>
                <p className={`${handschrift.className} m-0 text-[46px] leading-none`} style={{ color: NAVY }}>{o.naam}</p>
                <p className="m-0 mt-2 border-t pt-2 text-[14.5px]" style={{ borderColor: LINE, color: MUTE }}>{ondertekenaarRegel(o)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** De uitleg van de dienst. Lang? Dan eerst een stuk, en de rest met één klik. */
function Toelichting({ tekst, achter = "#ffffff" }: { tekst: string; achter?: string }) {
  const lang = tekst.length > 2000;
  const [open, setOpen] = useState(!lang);
  const minuten = Math.max(1, Math.round(tekst.split(/\s+/).length / 200));
  return (
    <div>
      <div className={`relative max-w-[720px] ${open ? "" : "max-h-[460px] overflow-hidden print:max-h-none"}`}>
        <OfferteTekst tekst={tekst} />
        {!open && <div className="absolute inset-x-0 bottom-0 h-36 print:hidden" style={{ background: `linear-gradient(to top, ${achter}, transparent)` }} aria-hidden="true" />}
      </div>
      {lang && (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`${knop.rand} mt-6 !h-[46px] print:hidden`}>
          {open ? "Inklappen" : `Lees verder (${minuten} min)`}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={open ? "rotate-180" : ""} aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
      )}
    </div>
  );
}

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

function Sectie({
  sectie, keuze, klik, medewerkers, kanKiezen, verschil,
}: {
  sectie: ReturnType<typeof secties>[number];
  keuze: string[];
  klik: (id: string) => void;
  medewerkers: number | null;
  kanKiezen: boolean;
  /** Wat een andere keuze scheelt; alleen bij een open offerte. */
  verschil?: (id: string) => { maand: number; eenmalig: number };
}) {
  const m = useMerk();
  const keuzes = new Map<string, Regel[]>();
  for (const r of sectie.regels.filter((r) => r.soort === "keuze")) keuzes.set(r.groep || "keuze", [...(keuzes.get(r.groep || "keuze") || []), r]);
  const vast = sectie.regels.filter((r) => r.soort === "vast");
  const opties = sectie.regels.filter((r) => r.soort === "optie");
  const tarieven = sectie.regels.filter((r) => r.soort === "tarief");
  const alleenTarieven = tarieven.length === sectie.regels.length;

  return (
    <div className="flex flex-col gap-5 print:break-inside-avoid">
      <h3 className={`${kop} m-0 flex flex-wrap items-baseline gap-x-3 text-[24px] tracking-[-0.4px]`} style={{ color: NAVY }}>
        {sectie.naam}
        {sectie.label && (
          <span className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[1.4px]" style={{ color: sectie.kleur || MUTE }}>
            <span className="h-2 w-2 rounded-full" style={{ background: sectie.kleur || MUTE }} aria-hidden="true" />
            {sectie.label.replace(/^React2u\s+/i, "")}
          </span>
        )}
      </h3>

      {[...keuzes.values()].map((lijst, gi) => (
        <div key={gi} className="flex flex-col gap-4">
          <div role="radiogroup" aria-label={`Kies: ${sectie.naam}`} className={`grid gap-5 ${lijst.length >= 2 ? "md:grid-cols-2" : ""}`}>
            {lijst.map((r) => <KeuzeKaart key={r.id} r={r} aan={keuze.includes(r.id)} klik={() => klik(r.id)} medewerkers={medewerkers} kanKiezen={kanKiezen} />)}
          </div>
          {kanKiezen && verschil && <Upgrade lijst={lijst} keuze={keuze} klik={klik} verschil={verschil} />}
        </div>
      ))}

      {vast.length > 0 && (
        <div className="flex flex-col rounded-[22px] border bg-white px-6 py-2 md:px-7" style={{ borderColor: LINE }}>
          {vast.map((r) => (
            <div key={r.id} className="flex items-start gap-3.5 border-b py-4 last:border-b-0" style={{ borderColor: LINE }}>
              <Bolvink maat={24} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-[16px] font-bold" style={{ color: NAVY }}>{r.naam}</span>
                  <span className="text-[16px] font-bold tabular-nums" style={{ color: r.prijs === 0 ? m.tekst : NAVY }}>{maandprijs(r).tekst}</span>
                </span>
                <Onder r={r} medewerkers={medewerkers} />
              </span>
            </div>
          ))}
        </div>
      )}

      {opties.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
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
                  className="flex w-full items-start gap-4 rounded-[22px] border-[1.5px] bg-white p-5 text-left transition-[border-color,box-shadow,transform] disabled:cursor-default enabled:active:scale-[0.995] md:px-7"
                  style={{ borderColor: aan ? m.kleur : LINE, boxShadow: aan ? "0 18px 36px -28px rgba(50,46,131,0.55)" : undefined }}
                >
                  <span className="relative mt-0.5 inline-flex h-[26px] w-[46px] shrink-0 rounded-full transition-colors print:hidden" style={{ background: aan ? m.kleur : "#DCDAE8" }} aria-hidden="true">
                    <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-[left] ${aan ? "left-[23px]" : "left-[3px]"}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span className="text-[16.5px] font-bold" style={{ color: NAVY }}>{r.naam}</span>
                      <span className="text-[16px] font-bold tabular-nums" style={{ color: NAVY }}>{r.prijs ? `+ ${mp.tekst}` : mp.tekst}</span>
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
        <div className="flex flex-col rounded-[22px] border bg-white px-6 pb-3 pt-6 md:px-7" style={{ borderColor: LINE }}>
          <div className="flex items-baseline justify-between gap-4 border-b pb-3" style={{ borderColor: LINE }}>
            <span className={`${kop} text-[19px]`} style={{ color: NAVY }}>Tarieven bij gebruik</span>
            <span className="text-[13px]" style={{ color: MUTE }}>{alleenTarieven ? "alleen als je er gebruik van maakt" : "exclusief btw"}</span>
          </div>
          {tarieven.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-4 border-b py-3.5 last:border-b-0" style={{ borderColor: LINE }}>
              <span className="flex flex-col">
                <span className="text-[15px] font-bold" style={{ color: NAVY }}>{r.naam}</span>
                {r.omschrijving && <span className="text-[13.5px]" style={{ color: MUTE }}>{r.omschrijving}</span>}
              </span>
              <span className="shrink-0 text-right text-[15px] font-bold tabular-nums" style={{ color: NAVY }}>{prijsLabel(r)}</span>
            </div>
          ))}
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

/**
 * Het upgrade-duwtje onder een keuze: staat er een uitgebreidere keuze naast
 * de gekozen, dan zegt een regel wat die per maand meer kost, met één klik om
 * over te stappen. Het verschil komt uit de offerte zelf.
 */
function Upgrade({ lijst, keuze, klik, verschil }: { lijst: Regel[]; keuze: string[]; klik: (id: string) => void; verschil: (id: string) => { maand: number; eenmalig: number } }) {
  const m = useMerk();
  if (!lijst.some((r) => keuze.includes(r.id))) return null;
  // De eerstvolgende stap omhoog: van de duurdere keuzes de kleinste stap.
  const beter = lijst
    .filter((r) => !keuze.includes(r.id))
    .map((r) => ({ r, v: verschil(r.id) }))
    .filter(({ v }) => v.maand > 0)
    .sort((a, b) => a.v.maand - b.v.maand)[0];
  if (!beter) return null;
  const zin = (beter.r.omschrijving || "").split(/(?<=\.)\s/)[0];
  return (
    <div className="flex flex-col gap-4 rounded-[22px] p-5 sm:flex-row sm:items-center sm:justify-between md:px-7" style={{ background: m.tint }}>
      <p className="m-0 text-[15.5px] leading-[1.55]" style={{ color: BODY }}>
        <strong style={{ color: NAVY }}>Liever alles geregeld?</strong> Met {beter.r.naam} betaal je{" "}
        <strong className="whitespace-nowrap" style={{ color: NAVY }}>{euro(beter.v.maand)} per maand</strong> meer.
        {zin && zin.length <= 140 ? ` ${zin}` : ""}
      </p>
      <button type="button" onClick={() => klik(beter.r.id)} className={`${knop.navy} !h-[46px] shrink-0 self-start sm:self-auto`}>
        Kies {beter.r.naam}<Pijl />
      </button>
    </div>
  );
}

/** Het label van een regel ("React2u Restart") als branding, of null. */
function merkVanLabel(label: string | undefined): Merk | null {
  if (!label) return null;
  return MERKEN[label.replace(/^React2u\s+/i, "").toLowerCase()] || null;
}

/**
 * "Vaak gekozen erbij": diensten uit andere specialismen die de klant er zelf
 * bij kan aanklikken (aanbevolenExtras in lib/offerteCatalogus.ts), als kaarten
 * in de kleur van hun eigen label, zoals de dienstenkaarten op de site. Aan
 * betekent: telt mee en wordt meegetekend.
 */
function Extras({ regels, keuze, klik, medewerkers, kanKiezen, achter }: { regels: Regel[]; keuze: string[]; klik: (id: string) => void; medewerkers: number | null; kanKiezen: boolean; achter: string }) {
  const m = useMerk();
  if (!regels.length) return null;
  return (
    <div className="flex flex-col gap-5 print:hidden">
      <div className="flex flex-col gap-2">
        <h3 className={`${kop} m-0 text-[24px] tracking-[-0.4px]`} style={{ color: NAVY }}>Vaak gekozen erbij</h3>
        <p className="m-0 max-w-[640px] text-[16px] leading-[1.65]" style={{ color: BODY }}>
          Specialismen die goed aansluiten bij React2u {m.naam}. Zet aan wat je wilt meenemen, het bedrag rekent meteen mee.
        </p>
      </div>
      <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
        {regels.map((r) => (
          <li key={r.id} className="flex">
            <ExtraKaart r={r} aan={keuze.includes(r.id)} klik={() => klik(r.id)} medewerkers={medewerkers} kanKiezen={kanKiezen} achter={achter} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExtraKaart({ r, aan, klik, medewerkers, kanKiezen, achter }: { r: Regel; aan: boolean; klik: () => void; medewerkers: number | null; kanKiezen: boolean; achter: string }) {
  const m = useMerk();
  const lm = merkVanLabel(r.label) || m;
  const mp = maandprijs(r);
  const perMedewerker = r.eenheid === "medewerker_jaar" || r.eenheid === "medewerker";
  const b = bedragVoor(r, medewerkers);
  const organisatie = perMedewerker && b && b.bedrag ? regelbedrag(b) : null;
  const n = aantalVoor(r, medewerkers);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={aan}
      disabled={!kanKiezen}
      onClick={klik}
      className="relative flex w-full flex-col gap-4 overflow-hidden rounded-[26px] border-2 p-6 text-left transition-[border-color,box-shadow,transform] duration-300 disabled:cursor-default enabled:hover:-translate-y-0.5 md:p-7"
      // Op een band in dezelfde tint wordt de kaart wit, anders valt hij weg.
      style={{ background: lm.tint.toLowerCase() === achter.toLowerCase() ? "#ffffff" : lm.tint, borderColor: aan ? lm.kleur : "transparent", boxShadow: aan ? "0 24px 48px -32px rgba(50,46,131,0.45)" : "0 18px 40px -36px rgba(50,46,131,0.35)" }}
    >
      <span aria-hidden className="absolute right-[-40px] top-[-40px] h-[120px] w-[120px] rounded-full" style={{ background: lm.kleur, opacity: 0.16 }} />
      <span className="relative flex items-start justify-between gap-4">
        <Merknaam m={lm} klein />
        <span className="relative mt-1 inline-flex h-[26px] w-[46px] shrink-0 rounded-full transition-colors" style={{ background: aan ? lm.kleur : "rgba(50,46,131,0.18)" }} aria-hidden="true">
          <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-[left] ${aan ? "left-[23px]" : "left-[3px]"}`} />
        </span>
      </span>
      <span className="relative flex flex-col gap-1">
        <span className={`${kop} text-[20px] leading-[1.25]`} style={{ color: NAVY }}>{r.naam}</span>
        {r.omschrijving && <span className="text-[14.5px] leading-[1.55]" style={{ color: BODY }}>{r.omschrijving}</span>}
      </span>
      <span className="relative mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-t pt-4" style={{ borderColor: "rgba(50,46,131,0.12)" }}>
        <span className="flex flex-col">
          <span className={`${kop} text-[24px] tabular-nums tracking-[-0.5px]`} style={{ color: NAVY }}>
            {organisatie ? `${euro(organisatie.bedrag!)} ${organisatie.per === "maand" ? "per maand" : "eenmalig"}` : mp.tekst}
          </span>
          {organisatie && mp.bedrag !== null && (
            <span className="text-[13px]" style={{ color: MUTE }}>{euro(mp.bedrag)} per medewerker per maand × {n.toLocaleString("nl-NL")}</span>
          )}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[14px] font-bold" style={{ color: aan ? lm.tekst : NAVY }}>
          {aan ? <><Vink size={14} /> Toegevoegd</> : <>Voeg toe<span aria-hidden className="text-[17px] leading-none">+</span></>}
        </span>
      </span>
    </button>
  );
}

/**
 * Een keuze als de prijskaarten op de tarievenpagina: wit met een rand, en
 * indigo als hij gekozen is, met de badge in de labelkleur. Het bedrag is wat
 * de organisatie per maand betaalt; per medewerker en de prijslijst eronder.
 */
function KeuzeKaart({ r, aan, klik, medewerkers, kanKiezen }: { r: Regel; aan: boolean; klik: () => void; medewerkers: number | null; kanKiezen: boolean }) {
  const m = useMerk();
  const mp = maandprijs(r);
  const perMedewerker = r.eenheid === "medewerker_jaar" || r.eenheid === "medewerker";
  const b = bedragVoor(r, medewerkers);
  const organisatie = perMedewerker && b && b.bedrag ? regelbedrag(b) : null;
  const n = aantalVoor(r, medewerkers);
  const tekst = aan ? "#ffffff" : NAVY;
  const zacht = aan ? "rgba(255,255,255,0.78)" : BODY;
  const badge = aan ? opKleur(m) : { background: m.tint, color: m.tekst };
  return (
    <button
      type="button"
      role="radio"
      aria-checked={aan}
      disabled={!kanKiezen}
      onClick={klik}
      className={`group relative flex flex-col gap-5 overflow-hidden rounded-[28px] border p-6 text-left transition-[background-color,border-color,box-shadow,transform] duration-300 disabled:cursor-default md:p-8 ${aan ? "" : "enabled:hover:-translate-y-0.5 enabled:hover:border-[#B9B6DA] print:hidden"}`}
      style={{ background: aan ? NAVY : "#ffffff", borderColor: aan ? NAVY : LINE, boxShadow: aan ? "0 30px 60px -36px rgba(50,46,131,0.7)" : "0 24px 48px -36px rgba(50,46,131,0.35)" }}
    >
      {aan && <span aria-hidden className="absolute -right-[60px] -top-[60px] h-[180px] w-[180px] rounded-full" style={{ background: m.kleur, opacity: 0.22 }} />}
      <span className="relative flex items-start justify-between gap-4">
        <span className={`${kop} text-[22px] leading-[1.2]`} style={{ color: tekst }}>{r.naam}</span>
        {r.badge && <span className="shrink-0 rounded-md px-2.5 py-1 text-[13px] font-bold" style={badge}>{r.badge}</span>}
      </span>
      <span className="relative flex flex-col gap-1.5">
        <span className="flex flex-wrap items-end gap-x-2">
          <span className={`${kop} text-[48px] leading-[0.9] tracking-[-1.6px] tabular-nums md:text-[54px]`} style={{ color: tekst }}>
            {organisatie ? euro(organisatie.bedrag!) : mp.bedrag === null ? prijsLabel(r) : euro(mp.bedrag)}
          </span>
          <span className="pb-1 text-[14.5px]" style={{ color: zacht }}>
            {organisatie ? (organisatie.per === "maand" ? "per maand" : "eenmalig") : mp.bedrag !== null ? mp.achter : ""}
          </span>
        </span>
        {organisatie && mp.bedrag !== null && (
          <span className="text-[14px] leading-[1.5]" style={{ color: zacht }}>
            {euro(mp.bedrag)} per medewerker per maand × {n.toLocaleString("nl-NL")}
            {r.prijs !== null && r.eenheid === "medewerker_jaar" && <span className="block">Prijslijst {euro(r.prijs)} per jaar</span>}
          </span>
        )}
        {!organisatie && mp.jaar && <span className="text-[14px]" style={{ color: zacht }}>Prijslijst {mp.jaar}</span>}
      </span>
      {(r.omschrijving || r.punten) && <span className="relative block h-px w-full" style={{ background: aan ? "rgba(255,255,255,0.15)" : LINE }} />}
      {r.omschrijving && <span className="relative block whitespace-pre-line text-[15.5px] leading-[1.6]" style={{ color: zacht }}>{r.omschrijving}</span>}
      {r.punten && (
        <span className="relative flex flex-col gap-3">
          {r.punten.map((p) => (
            <span key={p} className="flex items-start gap-3 text-[15px] leading-[1.5]" style={{ color: tekst }}>
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ background: aan ? "rgba(255,255,255,0.12)" : m.tint, color: aan ? "#ffffff" : m.tekst }}><Vink size={11} /></span>
              {p}
            </span>
          ))}
        </span>
      )}
      <span className="relative mt-auto pt-1 print:hidden">
        <span className={aan ? `${knop.wit} pointer-events-none` : `${knop.navy} pointer-events-none`}>
          {aan ? <><Vink size={15} /> Gekozen</> : <>Kies deze<Pijl /></>}
        </span>
      </span>
    </button>
  );
}

/** Onder de onderdelen het totaal, als de indigo strook van de site. */
function Optelling({ t, open, naarAkkoord }: { t: Totalen; open: boolean; naarAkkoord: () => void }) {
  return (
    <div className="relative flex flex-col gap-6 overflow-hidden rounded-[28px] px-6 py-8 md:flex-row md:items-center md:justify-between md:px-10 md:py-9" style={{ background: NAVY }}>
      <span aria-hidden className="absolute -right-[80px] -top-[140px] h-[300px] w-[300px] rounded-full" style={{ background: NAVY_LICHT }} />
      <div className="relative">
        <Label licht>Totaal</Label>
        <div className="mt-2"><Bedrag t={t} maat="text-[48px]" licht live={false} /></div>
      </div>
      <div className="relative flex flex-col gap-4 md:items-end">
        <p className="m-0 text-[15px] leading-[1.6] md:text-right" style={{ color: "rgba(255,255,255,0.8)" }}>
          {t.perMaand > 0 && <span className="block">{euro(t.perJaar)} per jaar</span>}
          {t.perMaand > 0 && t.eenmalig > 0 && <span className="block font-bold text-white">+ {euro(t.eenmalig)} eenmalig</span>}
          <span className="block">Exclusief btw. Tarieven bij gebruik komen erbij.</span>
        </p>
        {open && <button type="button" onClick={naarAkkoord} className={`${knop.wit} self-start md:self-end`}>Naar ondertekenen<Omlaag /></button>}
      </div>
    </div>
  );
}

/* ---------- zo gaat het verder: de aanpak ---------- */

/**
 * De vervolgstappen als "Onze aanpak" op de dienstpagina van het label: een
 * indigo band met de lichtere cirkel, en genummerde stappen in de labelkleur.
 * Wat al gedaan is (na ondertekening de eerste stap) krijgt een vinkje.
 */
function Aanpak({ stappen: eigen, klaar = 0, titel, tekst }: { stappen: Stap[] | null | undefined; klaar?: number; titel: string; tekst?: React.ReactNode }) {
  const m = useMerk();
  const lijst = normaliseerVervolg(eigen);
  const stappen = lijst.length ? lijst : VERVOLG_STANDAARD;
  const bol = opKleur(m);
  return (
    <section aria-label="Zo gaat het verder" className="relative overflow-hidden" style={{ background: NAVY }}>
      <span aria-hidden className="absolute right-[-180px] top-[-220px] h-[540px] w-[540px] rounded-full" style={{ background: NAVY_LICHT }} />
      <div className={`${BREED} relative flex flex-col gap-10 py-16 md:gap-[52px] md:py-[104px]`}>
        <SectieKop eyebrow="Zo gaat het verder" titel={titel} tekst={tekst} licht />
        <ol className={`m-0 grid list-none gap-6 p-0 md:grid-cols-2 md:gap-8 ${stappen.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          {stappen.map((s, i) => {
            const gedaan = i < klaar;
            return (
              <li key={`${s.kop}-${i}`} className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-4 gap-y-1.5 md:flex md:flex-col md:gap-3.5">
                <span className="row-span-2 flex items-start gap-3 md:row-span-1 md:items-center">
                  <span className={`${kop} grid h-12 w-12 shrink-0 place-items-center rounded-full text-[19px]`} style={bol}>
                    {gedaan ? <LuCheck className="text-[22px]" strokeWidth={3} aria-hidden /> : i + 1}
                  </span>
                  {i < stappen.length - 1 && <span aria-hidden className="hidden h-px grow lg:block" style={{ background: "rgba(255,255,255,0.18)" }} />}
                </span>
                <span className="text-[13px] font-bold uppercase tracking-[1.3px] md:mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>{gedaan ? "Gedaan" : `Stap ${i + 1}`}</span>
                <span className={`${kop} col-start-2 text-[21px] leading-[1.3]`} style={{ color: "#ffffff" }}>{s.kop}</span>
                {s.tekst && <span className="col-start-2 text-[15.5px] leading-[1.65]" style={{ color: "rgba(255,255,255,0.75)" }}>{s.tekst}</span>}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ---------- vertrouwen: klanten aan het woord en de keurmerken ---------- */

/** Klanten aan het woord, de klantlogo's en de keurmerken, zoals op de site (Gedeeld.tsx). */
function Vertrouwen({ huis }: { huis: Huis }) {
  const m = useMerk();
  const g = woordenboek("nl").gedeeld;
  return (
    <Band label="Klanten en kwaliteit">
      <SectieKop
        eyebrow={g.ervaringenEyebrow}
        titel={g.ervaringenKop}
        tekst="React2u is een gecertificeerde arbodienst. Onafhankelijke instellingen toetsen elk jaar hoe we werken en hoe we met gegevens omgaan."
      />
      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        {g.citaten.map((q) => (
          <figure key={q.naam} className="m-0 flex flex-col justify-between gap-7 rounded-[28px] p-6 sm:gap-8 sm:p-8 md:p-10" style={{ background: m.tint }}>
            <blockquote className="m-0 flex flex-col gap-4">
              <span aria-hidden className={`${kop} text-[64px] leading-[0.6]`} style={{ color: m.kleur }}>“</span>
              <p className={`${kop} m-0 text-[19px] leading-[1.45] sm:text-[20px] md:text-[22px]`} style={{ color: NAVY, fontWeight: 500 }}>{q.tekst}</p>
            </blockquote>
            <figcaption className="flex items-center justify-between gap-6 border-t pt-6" style={{ borderColor: "rgba(50,46,131,0.12)" }}>
              <span className="flex flex-col gap-0.5">
                <span className="text-[16px] font-bold" style={{ color: NAVY }}>{q.naam}</span>
                <span className="text-[14.5px]" style={{ color: MUTE }}>{q.rol}</span>
              </span>
              <Beeld src={q.logo} alt="" sizes="120px" className="h-8 w-auto max-w-[120px] object-contain" />
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="flex flex-col items-center gap-6">
        <span className="text-[14px] font-semibold" style={{ color: MUTE }}>{g.klantenLabel}</span>
        <ul className="m-0 flex w-full list-none flex-wrap items-center justify-center gap-x-8 gap-y-5 p-0 sm:gap-x-12 md:justify-between">
          {KLANTEN.map((k) => (
            <li key={k.src} className="flex h-8 items-center sm:h-10 md:h-11">
              <Beeld src={k.src} alt={k.alt} sizes="150px" className="h-full w-auto max-w-[100px] object-contain sm:max-w-[150px]" />
            </li>
          ))}
        </ul>
      </div>
      <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {keurmerken(huis.certificaten).map((k) => {
          const inhoud = (
            <>
              <span className="flex h-12 w-14 shrink-0 items-center justify-center sm:h-[72px] sm:w-auto"><Beeld src={k.src} alt={k.alt} sizes="72px" className="max-h-full w-auto max-w-[56px] object-contain sm:max-w-[110px]" /></span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[16px] font-bold" style={{ color: NAVY }}>{k.naam}</span>
                <span className="text-[14px]" style={{ color: MUTE }}>{k.wat}</span>
              </span>
            </>
          );
          const cls = "flex h-full items-center gap-4 rounded-[18px] border bg-white px-4 py-3 sm:flex-col sm:rounded-[22px] sm:px-5 sm:py-7 sm:text-center";
          return (
            <li key={k.naam}>
              {k.href ? (
                <a href={k.href} target="_blank" rel="noopener" className={`${cls} transition-shadow hover:shadow-[0_18px_36px_-24px_rgba(50,46,131,0.45)]`} style={{ borderColor: LINE }}>{inhoud}</a>
              ) : (
                <span className={cls} style={{ borderColor: LINE }}>{inhoud}</span>
              )}
            </li>
          );
        })}
      </ul>
    </Band>
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
  const m = useMerk();
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

  const veldLabel = "text-[14.5px] font-bold";

  return (
    <div>
      {/* Wat je tekent, in één regel */}
      <div className="mb-9 flex flex-col gap-3 rounded-[20px] p-5 sm:flex-row sm:items-center sm:justify-between md:px-7" style={{ background: m.tint }}>
        <div>
          <p className="m-0 text-[15.5px] leading-[1.55]" style={{ color: BODY }}>
            Je geeft akkoord op <strong style={{ color: NAVY }}>{totalen.regels.map((r) => r.regel.naam).join(", ") || offerte.titel}</strong>.
          </p>
          {conceptHref && open && <ConceptLink href={conceptHref} className="mt-2 text-[14px]" />}
        </div>
        <p className={`${kop} m-0 shrink-0 text-[19px] tabular-nums`} style={{ color: NAVY }}>
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
            <p className={`${kop} m-0 mt-2 text-[20px]`} style={{ color: NAVY }}>React2u</p>
            <p className="m-0 min-h-[2.9em] text-[14px] leading-[1.45]" style={{ color: MUTE }}>{huis.contact.addressLine1}, {huis.contact.addressLine2}<br />KvK {huis.contact.kvk}</p>
            <div className="mt-3 flex h-[44px] items-center">
              <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-bold" style={{ background: m.tint, color: m.tekst }}>
                <Vink size={12} /> Offerte aangeboden
              </span>
            </div>
            <div className="relative mt-2.5 flex aspect-[10/3] items-end overflow-hidden rounded-[16px] border px-[6%] pb-[7%]" style={{ borderColor: LINE, background: SOFT }}>
              <p className={`${handschrift.className} relative z-10 m-0 text-[clamp(30px,4vw,44px)] leading-none`} style={{ color: NAVY }}>{offerte.afzender_naam || "React2u"}</p>
              <span className="absolute inset-x-[6%] bottom-[24%] border-b" style={{ borderColor: "#D6D4E4" }} aria-hidden="true" />
            </div>
            <p className="m-0 mt-2.5 text-[14px]" style={{ color: MUTE }}>
              {[offerte.afzender_naam, offerte.afzender_functie].filter(Boolean).join(", ") || "React2u"}
              {offerte.verstuurd_at ? `, ${datumLang(offerte.verstuurd_at)}` : ""}
            </p>
          </div>
          <div>
            <Label>Opdrachtgever</Label>
            <p className={`${kop} m-0 mt-2 text-[20px]`} style={{ color: NAVY }}>{offerte.bedrijf}</p>
            <p className="m-0 min-h-[2.9em] text-[14px] leading-[1.45]" style={{ color: MUTE }}>{offerte.contactpersoon ? `T.a.v. ${offerte.contactpersoon}` : "Getekend voor akkoord"}</p>
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
                  <div className="mt-2.5 aspect-[10/3] rounded-[16px] border border-dashed" style={{ borderColor: "#D6D4E4" }} />
                </>
              )}
            </div>
            <p className="m-0 mt-2.5 text-[14px]" style={{ color: MUTE }}>
              {naam.trim() || "Je naam"}{functie.trim() ? `, ${functie.trim()}` : ""}, voor akkoord
            </p>
          </div>
        </div>

        {/* Je gegevens */}
        <div className="mt-9 grid items-start gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className={veldLabel} style={{ color: NAVY }}>Volledige naam</span>
            <input className={veld} value={naam} onChange={(e) => setNaam(e.target.value)} autoComplete="name" required disabled={vast} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={veldLabel} style={{ color: NAVY }}>Functie <span className="font-normal" style={{ color: MUTE }}>(mag leeg)</span></span>
            <input className={veld} value={functie} onChange={(e) => setFunctie(e.target.value)} autoComplete="organization-title" placeholder="Bijvoorbeeld directeur" disabled={vast} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={veldLabel} style={{ color: NAVY }}>E-mailadres</span>
            <input className={veld} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required disabled={vast} aria-describedby="of-email-uitleg" />
            <span id="of-email-uitleg" className="text-[13.5px]" style={{ color: MUTE }}>Hier sturen we de code naartoe.</span>
          </label>
        </div>

        {/* Factuurgegevens: zodat de eerste factuur meteen goed is, met inkoopnummer als inkoop dat vraagt */}
        <fieldset className="m-0 mt-7 min-w-0 rounded-[22px] border-0 p-5 md:p-7" style={{ background: SOFT }} disabled={vast}>
          <legend className="sr-only">Factuurgegevens</legend>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className={`${kop} m-0 text-[19px]`} style={{ color: NAVY }}>Factuurgegevens</p>
            <p className="m-0 text-[13.5px]" style={{ color: MUTE }}>
              {vooraf.adres ? `Al ingevuld door ${voornaam(offerte.afzender_naam) || "React2u"}; klopt het?` : "Zodat de eerste factuur meteen goed is."}
            </p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-6">
            <label className="flex flex-col gap-1.5 md:col-span-3">
              <span className={veldLabel} style={{ color: NAVY }}>Straat en huisnummer</span>
              <input id="of-fadres" className={veld} value={factuur.adres} onChange={veldFactuur("adres")} autoComplete="address-line1" />
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-1">
              <span className={veldLabel} style={{ color: NAVY }}>Postcode</span>
              <input id="of-fpostcode" className={veld} value={factuur.postcode} onChange={veldFactuur("postcode")} autoComplete="postal-code" />
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className={veldLabel} style={{ color: NAVY }}>Plaats</span>
              <input id="of-fplaats" className={veld} value={factuur.plaats} onChange={veldFactuur("plaats")} autoComplete="address-level2" />
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className={veldLabel} style={{ color: NAVY }}>Facturen per mail naar</span>
              <input id="of-femail" className={veld} type="email" value={factuurEmail ?? email} onChange={(e) => setFactuurEmail(e.target.value)} placeholder="administratie@…" />
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className={veldLabel} style={{ color: NAVY }}>KvK-nummer <span className="font-normal" style={{ color: MUTE }}>(mag leeg)</span></span>
              <input id="of-fkvk" className={veld} value={factuur.kvk} onChange={veldFactuur("kvk")} inputMode="numeric" placeholder="8 cijfers" />
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className={veldLabel} style={{ color: NAVY }}>Inkoopnummer <span className="font-normal" style={{ color: MUTE }}>(mag leeg)</span></span>
              <input id="of-finkoop" className={veld} value={factuur.inkoopnummer} onChange={veldFactuur("inkoopnummer")} placeholder="Bijvoorbeeld PO-2026-118" />
            </label>
          </div>
          <p className="m-0 mt-3 text-[13px] leading-[1.5]" style={{ color: MUTE }}>Werkt jullie administratie met inkoopnummers (PO)? Vul het in, dan staat het op elke factuur.</p>
        </fieldset>

        <label className={`mt-5 flex items-start gap-3 rounded-[16px] border-[1.5px] p-4 text-[15px] leading-[1.55] transition-colors md:px-5 ${uit ? "opacity-60" : "cursor-pointer"} ${akkoord ? "border-[#322E83] bg-[#F6F5FB]" : "border-[#E6E5EF]"}`} style={{ color: BODY }}>
          <input type="checkbox" checked={akkoord} onChange={(e) => setAkkoord(e.target.checked)} disabled={vast} className="mt-0.5 h-5 w-5 shrink-0 accent-[#322E83]" />
          <span>
            Ik ga akkoord met deze offerte en de{" "}
            <a href={voorwaarden} target="_blank" rel="noopener" className="font-bold underline underline-offset-4" style={{ color: NAVY }}>algemene voorwaarden</a>{" "}
            van React2u, en ik ben bevoegd om namens <strong style={{ color: NAVY }}>{offerte.bedrijf}</strong> te tekenen.
          </span>
        </label>

        {fout && <p role="alert" className="m-0 mt-4 rounded-[14px] bg-[#FDECEA] px-4 py-3 text-[15px] text-[#8A1C12]">{fout}</p>}

        {!uit && stap === "code" ? (
          <div className="relative mt-6 overflow-hidden rounded-[22px] p-5 md:p-7" style={{ background: NAVY }} aria-live="polite">
            <span aria-hidden className="absolute -right-[60px] -top-[80px] h-[220px] w-[220px] rounded-full" style={{ background: NAVY_LICHT }} />
            <div className="relative flex items-start gap-4">
              <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full sm:flex" style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}><Mail size={20} /></span>
              <div className="min-w-0">
                <p className={`${kop} m-0 text-[22px] leading-[1.25] text-white`}>Nog één stap: de code uit je mail</p>
                <p className="m-0 mt-1.5 text-[15px] leading-[1.55]" style={{ color: "rgba(255,255,255,0.82)" }}>
                  We stuurden een code van 6 cijfers naar <strong className="text-white [overflow-wrap:break-word]">{email.trim()}</strong>. Zo weten we zeker dat jij het bent die tekent.
                </p>
              </div>
            </div>
            <div className="relative mt-5 flex flex-col gap-3 sm:pl-[60px] md:flex-row md:items-center">
              <input
                id="of-code"
                aria-label="Code van 6 cijfers"
                className="h-[56px] w-full rounded-[14px] border-0 bg-white px-4 text-center font-mono text-[26px] font-semibold tracking-[0.45em] text-[#322E83] outline-none focus:shadow-[0_0_0_3px_rgba(255,255,255,0.4)] md:w-[230px]"
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
              <button type="submit" disabled={bezig} className={`${knop.roze} !h-[56px] w-full md:w-auto`}>
                {bezig ? "Bezig met ondertekenen…" : <>Bevestig en onderteken<Pijl /></>}
              </button>
            </div>
            <div className="relative mt-4 flex flex-col items-start gap-x-6 gap-y-2.5 text-left text-[14px] font-bold sm:flex-row sm:flex-wrap sm:pl-[60px]">
              <button type="button" onClick={stuurCode} disabled={wacht > 0 || bezig} className="text-left text-white underline-offset-4 enabled:hover:underline disabled:opacity-60">
                {wacht > 0 ? `Nieuwe code over ${wacht} s` : "Stuur een nieuwe code"}
              </button>
              <button type="button" onClick={() => { setStap("gegevens"); setCode(""); setFout(null); }} className="text-left underline-offset-4 hover:underline" style={{ color: "rgba(255,255,255,0.75)" }}>
                Ander e-mailadres of gegevens wijzigen
              </button>
            </div>
          </div>
        ) : !uit ? (
          <div className="mt-7 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="m-0 flex max-w-[480px] items-start gap-2 text-[13px] leading-[1.5] md:order-1" style={{ color: MUTE }}>
              <span className="mt-0.5"><Slot /></span>
              Je krijgt eerst een code per mail. Als bewijs leggen we je naam, je bevestigde e-mailadres, het tijdstip, je IP-adres en de getekende versie vast; de getekende offerte krijg je als pdf.
            </p>
            <button type="submit" disabled={bezig} className={`${knop.roze} !h-[56px] w-full !text-[16px] md:order-2 md:w-auto`}>
              {bezig ? "Code versturen…" : <>Onderteken de offerte<Pijl /></>}
            </button>
          </div>
        ) : (
          <p className="m-0 mt-5 text-[15px]" style={{ color: MUTE }}>
            {offerte.status === "afgewezen"
              ? "Je hebt laten weten niet akkoord te gaan. Neem contact op als je toch verder wilt."
              : offerte.verlopen
              ? "Deze offerte is verlopen en kan niet meer worden ondertekend."
              : "Ondertekenen kan hier niet."}
          </p>
        )}
        {!uit && afwijzen && (
          <button type="button" onClick={afwijzen} className="mt-5 text-[14.5px] font-bold underline-offset-4 hover:underline" style={{ color: MUTE }}>
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
      className="hv m-auto w-full max-w-none bg-white p-0 backdrop:bg-[#1c1a4e]/55 backdrop:backdrop-blur-[3px] max-md:h-full max-md:max-h-none md:max-w-[540px] md:rounded-[26px]"
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
          <p className={`${kop} m-0 text-[28px]`} style={{ color: NAVY }}>Niet akkoord</p>
          <button type="button" onClick={sluit} aria-label="Sluiten" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-black/[0.05]" style={{ color: NAVY }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <p className="m-0 text-[16px] leading-[1.6]" style={{ color: BODY }}>
          Jammer! Wil je kort laten weten waarom? Dan kijkt {offerte.afzender_naam || "onze adviseur"} of we iets kunnen aanpassen. Bellen mag natuurlijk ook.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-[14.5px] font-bold" style={{ color: NAVY }}>Wat kunnen we beter doen? <span className="font-normal" style={{ color: MUTE }}>(mag leeg)</span></span>
          <textarea className={`${veld} h-auto min-h-[120px] py-3`} value={reden} onChange={(e) => setReden(e.target.value)} maxLength={2000} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[14.5px] font-bold" style={{ color: NAVY }}>Je naam</span>
          <input className={veld} value={naam} onChange={(e) => setNaam(e.target.value)} autoComplete="name" />
        </label>
        {fout && <p role="alert" className="m-0 rounded-[14px] bg-[#FDECEA] px-4 py-3 text-[15px] text-[#8A1C12]">{fout}</p>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={sluit} className={knop.rand}>Annuleren</button>
          <button type="submit" disabled={bezig} className={knop.navy}>{bezig ? "Versturen…" : "Laat het weten"}</button>
        </div>
      </form>
    </dialog>
  );
}

/* ---------- na ondertekening ---------- */

/** Stippen in de labelkleur die uit het vinkje springen; alleen bij een verse ondertekening, en niet bij verminderde beweging. */
function Feest() {
  const m = useMerk();
  const kleuren = [m.kleur, NAVY, m.kleur, "#ffffff"];
  return (
    <span className="pointer-events-none absolute inset-0 motion-reduce:hidden" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => {
        const hoek = (i / 16) * Math.PI * 2;
        const afstand = 58 + (i % 3) * 16;
        const maat = 7 + (i % 3) * 3;
        return (
          <span
            key={i}
            className="offerte-stip absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: maat,
              height: maat,
              background: kleuren[i % kleuren.length],
              boxShadow: kleuren[i % kleuren.length] === "#ffffff" ? `0 0 0 1px ${m.kleur}` : undefined,
              ["--x" as string]: `${Math.cos(hoek) * afstand}px`,
              ["--y" as string]: `${Math.sin(hoek) * afstand}px`,
              animationDelay: `${150 + (i % 4) * 40}ms`,
            }}
          />
        );
      })}
    </span>
  );
}

const FEEST_CSS = `
.offerte-stip { transform: translate(-50%, -50%) scale(0); opacity: 0; animation: offerte-stip 1000ms cubic-bezier(.2,.8,.2,1) forwards; }
@keyframes offerte-stip {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  30% { opacity: 1; }
  100% { transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1); opacity: 0; }
}
.offerte-vink { animation: offerte-vink 520ms cubic-bezier(.2,1.4,.4,1) both; }
@keyframes offerte-vink { from { transform: scale(.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .offerte-stip, .offerte-vink { animation: none; } }
`;

/** De witte kaart in de opening na ondertekening: het vinkje in de labelkleur, wanneer, en het bedrag. */
function GetekendKaart({ moment, vers, t, bevestigd }: { moment: string; vers: boolean; t: Totalen; bevestigd: boolean }) {
  const m = useMerk();
  return (
    <div className="rounded-[24px] bg-white p-6 text-center shadow-[0_30px_70px_-40px_rgba(50,46,131,0.45)] md:p-8">
      <span className="relative mx-auto flex h-24 w-24 items-center justify-center">
        {vers && <Feest />}
        <span className={`flex h-[72px] w-[72px] items-center justify-center rounded-full ${vers ? "offerte-vink" : ""}`} style={opKleur(m)}>
          <LuCheck className="text-[34px]" strokeWidth={3} aria-hidden />
        </span>
      </span>
      <p className={`${kop} m-0 mt-4 text-[24px]`} style={{ color: NAVY }}>Ondertekend</p>
      <p className="m-0 mt-1 text-[15px]" style={{ color: MUTE }}>{moment}</p>
      <div className="mt-6 border-t pt-5 text-left" style={{ borderColor: LINE }}>
        <Bedrag t={t} maat="text-[44px]" live={false} />
        <Kleintje t={t} />
      </div>
      {bevestigd && (
        <span className="mt-5 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-bold" style={{ background: m.tint, color: m.tekst }}>
          <Vink size={12} /> E-mailadres bevestigd met een code
        </span>
      )}
    </div>
  );
}

function Getekend({ offerte, token, voorwaarden, modus, vers, huis }: { offerte: OffertePubliek; token?: string; voorwaarden: string; modus: Modus; vers: boolean; huis: Huis }) {
  const m = useMerk();
  const inhoud = offerte.getekend_inhoud!;
  // De pdf met het ondertekeningscertificaat: via het token, of in het voorbeeld via het beheer.
  const pdf = token ? `/offerte/${token}/pdf` : `/admin/offertevoorbeeld/${offerte.id}/pdf`;
  const regels = normaliseerRegels(inhoud.regels);
  const t = berekenTotalen(regels, inhoud.keuze, inhoud.medewerkers);
  const tarieven = regels.filter((r) => r.soort === "tarief");
  const vorm: Vorm = inhoud.vorm && VORMEN[inhoud.vorm] ? inhoud.vorm : "verzuimbegeleiding";
  const afzender = inhoud.afzender_naam || offerte.afzender_naam || "React2u";
  const metTekst = Boolean(inhoud.inhoud?.trim());
  return (
    <>
      <style>{FEEST_CSS}</style>
      <Kopbalk offerte={offerte} actie={<a href={`${pdf}?download=1`} className={`${knop.rand} !h-[48px] md:!h-[52px]`}><Download /> Pdf</a>} />
      <Melding modus={modus} />

      <main>
        <Opening
          nummer={inhoud.nummer}
          bedrijf={inhoud.bedrijf}
          zin={vers ? <>Gelukt, {voornaam(inhoud.getekend_naam)}! Welkom bij React2u.</> : <>Ondertekend door {inhoud.getekend_naam}</>}
          tekst={
            <p className="m-0">
              {inhoud.titel} voor {inhoud.bedrijf}
              {inhoud.betreft ? ` (${VORMEN[vorm].betreft || "betreft"}: ${inhoud.betreft})` : ""}, ondertekend op {momentLang(inhoud.getekend_at)}.
              {vers ? ` De getekende offerte staat als pdf in je mail op ${inhoud.getekend_email}.` : ""}
            </p>
          }
          knoppen={
            <>
              <a href={`${pdf}?download=1`} className={knop.roze}><Download /> Download de getekende offerte</a>
              <a href={pdf} target="_blank" rel="noopener" className={knop.rand}>Bekijk de pdf<Pijl /></a>
            </>
          }
          kaart={<GetekendKaart moment={momentLang(inhoud.getekend_at)} vers={vers} t={t} bevestigd={Boolean(inhoud.bevestiging)} />}
        />

        <div className="h-10 md:h-16" />
        <Aanpak
          stappen={inhoud.vervolg ?? offerte.vervolg}
          klaar={1}
          titel="De eerste stap is gezet"
          tekst={offerte.afzender_telefoon ? <>Vragen over de start? Bel {voornaam(afzender) || "ons"} op <span className="whitespace-nowrap">{offerte.afzender_telefoon}</span>.</> : undefined}
        />

        <Band tint label="Wat je hebt afgenomen">
          <SectieKop eyebrow={`React2u ${m.naam}`} titel="Wat je hebt afgenomen" />
          <div className="grid items-start gap-5 lg:grid-cols-12 lg:gap-6">
            <div className="flex flex-col rounded-[28px] bg-white px-6 pb-3 pt-6 shadow-[0_20px_40px_-32px_rgba(50,46,131,0.35)] md:px-8 lg:col-span-7">
              <div className="flex items-baseline justify-between border-b pb-3" style={{ borderColor: LINE }}>
                <span className={`${kop} text-[19px]`} style={{ color: NAVY }}>{inhoud.titel}</span>
                <span className="text-[13px]" style={{ color: MUTE }}>exclusief btw</span>
              </div>
              {t.regels.map(({ regel, bedrag, periode }) => {
                const b = regelbedrag({ bedrag, periode });
                const n = aantalVoor(regel, inhoud.medewerkers);
                const perMedewerker = regel.eenheid === "medewerker_jaar" || regel.eenheid === "medewerker";
                return (
                  <div key={regel.id} className="flex items-start justify-between gap-4 border-b py-4 last:border-b-0" style={{ borderColor: LINE }}>
                    <span className="flex flex-col">
                      <span className="text-[16px] font-bold" style={{ color: NAVY }}>{regel.naam}</span>
                      {perMedewerker && n > 1 && <span className="text-[13.5px]" style={{ color: MUTE }}>{maandprijs(regel).tekst} × {n}</span>}
                    </span>
                    <span className="shrink-0 text-right text-[16px] font-bold tabular-nums" style={{ color: NAVY }}>
                      {b.bedrag === null ? "Op aanvraag" : b.bedrag === 0 ? "Inbegrepen" : `${euro(b.bedrag)} ${b.per === "maand" ? "per maand" : "eenmalig"}`}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-5 lg:col-span-5">
              <Optelling t={t} open={false} naarAkkoord={() => {}} />
              {tarieven.length > 0 && (
                <div className="flex flex-col rounded-[28px] bg-white px-6 pb-3 pt-6 md:px-8">
                  <div className="flex items-baseline justify-between border-b pb-3" style={{ borderColor: LINE }}>
                    <span className={`${kop} text-[19px]`} style={{ color: NAVY }}>Tarieven bij gebruik</span>
                  </div>
                  {tarieven.map((r) => (
                    <div key={r.id} className="flex items-start justify-between gap-4 border-b py-3 last:border-b-0" style={{ borderColor: LINE }}>
                      <span className="text-[15px]" style={{ color: NAVY }}>{r.naam}</span>
                      <span className="shrink-0 text-[15px] font-bold tabular-nums" style={{ color: NAVY }}>{prijsLabel(r)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Band>

        {metTekst && (
          <section aria-label="Over deze offerte" className="bg-white">
            <div className={`${BREED} grid gap-8 py-16 md:py-[112px] lg:grid-cols-12 lg:gap-6`}>
              <div className="flex flex-col gap-4 lg:col-span-4">
                <Eyebrow kleur={m.tekst}>React2u {m.naam}</Eyebrow>
                <h2 className={`${kop} m-0 text-[34px] leading-[1.08] tracking-[-0.9px] md:text-[46px]`} style={{ color: NAVY }}>Over deze offerte</h2>
              </div>
              <div className="lg:col-span-8 lg:col-start-5">
                <details className="group">
                  <summary className={`${knop.rand} cursor-pointer list-none !h-[46px] print:hidden`}>
                    <span className="group-open:hidden">Lees de volledige tekst</span>
                    <span className="hidden group-open:inline">Inklappen</span>
                  </summary>
                  <div className="mt-6 max-w-[720px] print:mt-0">
                    <OfferteTekst tekst={vulIn(inhoud.inhoud, inhoud)} />
                  </div>
                </details>
              </div>
            </div>
          </section>
        )}

        <Band tint={metTekst} label="Voorwaarden en ondertekening">
          <div className="grid items-start gap-5 lg:grid-cols-12 lg:gap-6">
            <div className="rounded-[28px] p-6 md:p-9 lg:col-span-5" style={vlak(m, metTekst)}>
              <h3 className={`${kop} m-0 text-[22px]`} style={{ color: NAVY }}>Voorwaarden</h3>
              <div className="mt-4"><OfferteTekst tekst={vulIn(inhoud.voorwaarden, inhoud).trim() || "- Alle bedragen zijn exclusief btw."} klein /></div>
              <p className="m-0 mt-5 text-[15px]" style={{ color: BODY }}>
                Op deze offerte zijn de{" "}
                <a href={voorwaarden} target="_blank" rel="noopener" className="font-bold underline underline-offset-4" style={{ color: NAVY }}>algemene voorwaarden</a> van React2u van toepassing.
              </p>
            </div>
            <div className="rounded-[28px] border bg-white p-6 md:p-9 lg:col-span-7" style={{ borderColor: LINE }}>
              <h2 className={`${kop} m-0 text-[22px]`} style={{ color: NAVY }}>Ondertekening</h2>
              <div className="mt-6 grid gap-8 sm:grid-cols-2">
                <div className="flex flex-col">
                  <Label>Opdrachtnemer</Label>
                  <p className={`${kop} m-0 mt-2 text-[19px]`} style={{ color: NAVY }}>React2u</p>
                  <p className="m-0 text-[14px]" style={{ color: MUTE }}>{huis.contact.addressLine1}, {huis.contact.addressLine2}, KvK {huis.contact.kvk}</p>
                  <p className={`${handschrift.className} m-0 mt-auto pt-6 text-[38px] leading-none`} style={{ color: NAVY }}>{afzender}</p>
                  <p className="m-0 mt-3 border-t pt-2.5 text-[14px]" style={{ borderColor: LINE, color: MUTE }}>
                    {afzender}{inhoud.verstuurd_at ? `, ${datumLang(inhoud.verstuurd_at)}` : ""}
                  </p>
                </div>
                <div className="flex flex-col">
                  <Label>Opdrachtgever</Label>
                  <p className={`${kop} m-0 mt-2 text-[19px]`} style={{ color: NAVY }}>{inhoud.bedrijf}</p>
                  <p className="m-0 text-[14px]" style={{ color: MUTE }}>Getekend voor akkoord</p>
                  {offerte.handtekening && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={offerte.handtekening} alt={`Handtekening van ${inhoud.getekend_naam}`} className="mt-3 h-auto w-full max-w-[280px]" />
                  )}
                  <p className="m-0 mt-2 border-t pt-2.5 text-[14px]" style={{ borderColor: LINE, color: MUTE }}>
                    {inhoud.getekend_naam}{inhoud.getekend_functie ? `, ${inhoud.getekend_functie}` : ""}, {momentLang(inhoud.getekend_at)}
                  </p>
                </div>
              </div>
              {inhoud.factuur && (
                <div className="mt-7 grid gap-5 rounded-[18px] p-5 sm:grid-cols-2" style={{ background: SOFT }}>
                  <div>
                    <Label>Factuuradres</Label>
                    <p className="m-0 mt-1.5 text-[15px] leading-[1.6]" style={{ color: NAVY }}>
                      {[inhoud.bedrijf, ...factuurRegels(inhoud.factuur)].map((r, i) => <span key={i} className="block">{r}</span>)}
                    </p>
                  </div>
                  <div>
                    <Label>Facturen</Label>
                    <p className="m-0 mt-1.5 text-[15px] leading-[1.6]" style={{ color: NAVY }}>
                      <span className="block break-all">{inhoud.factuur.email}</span>
                      {inhoud.factuur.kvk && <span className="block">KvK {inhoud.factuur.kvk}</span>}
                      {inhoud.factuur.inkoopnummer && <span className="block">Inkoopnummer {inhoud.factuur.inkoopnummer}</span>}
                    </p>
                  </div>
                </div>
              )}
              {offerte.getekend_hash && (
                <p className="m-0 mt-6 text-[13.5px] leading-[1.6]" style={{ color: MUTE }}>
                  Kenmerk van de ondertekende versie: <span className="break-all font-mono text-[12px]">{offerte.getekend_hash}</span>.{" "}
                  <a href={pdf} target="_blank" rel="noopener" className="font-bold underline underline-offset-4" style={{ color: NAVY }}>Het ondertekeningscertificaat</a> staat achterin de pdf.
                </p>
              )}
            </div>
          </div>
        </Band>
      </main>
      <Voet offerte={offerte} voorwaarden={voorwaarden} huis={huis} />
    </>
  );
}
