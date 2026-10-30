"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Caveat, Outfit } from "next/font/google";
import { LuCalendarCheck, LuCheck, LuHandshake, LuPenLine, LuRoute } from "react-icons/lu";
import Logo from "@/components/site/Logo";
import Beeld from "@/components/site/Beeld";
import ReisSpeler from "@/components/blocks/ReisSpeler";
import { BODY, BREED, Eyebrow, KEURMERKEN, KLANTEN, kop, LINE, NAVY, ORANGE, PINK, Pijl, SKY, SOFT, TEAL } from "@/components/blocks/Gedeeld";
import { CONTACT_FALLBACK, type ContactInfo } from "@/lib/content";
import type { Certificate } from "@/lib/nav";
import { woordenboek } from "@/lib/woordenboek";
import Handtekening from "./Handtekening";
import OfferteTekst from "./OfferteTekst";
import { ondertekenaarRegel, VOORWOORD, VOORWOORD_VAN } from "@/lib/offerteVoorwoord";
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
 * In de beeldtaal van de "Home S-tier"-blokken van de site (HomeVerhaal.tsx),
 * want "offerte is zo belangrijk dat het past in de look en feel van de
 * huisstijl" (Rens, 30 okt 2026):
 *  - de opening als "Eén casemanager die je kent": een kop in twee kleuren en
 *    rechts de stippenconstellatie uit het logo, met drie medaillons waar de
 *    site foto's heeft (het bedrag, de contactpersoon, het label);
 *  - "Zo gaat het verder" als de stippenreis: gekleurde stations met een
 *    spoor van stippen dat zichzelf tekent;
 *  - klanten aan het woord, de klantlogo's en de keurmerken van de site;
 *  - het akkoord in de indigo contactband ("Een vraag? Bel gewoon even.");
 *  - de voet zoals de footer van de site.
 * Geen foto's (Rens, 29 okt). Animaties staan uit bij "minder beweging".
 *
 * Modus:
 *  - klant      de echte link: keuze wordt bewaard, tekenen kan;
 *  - collega    een beheerder opent de echte link: niets telt, tekenen niet;
 *  - voorbeeld  vanuit het beheer, ook voor een concept.
 */

// Dezelfde variabele als de site (.hv .hv-kop leest --font-outfit).
const outfit = Outfit({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-outfit", display: "swap" });
const handschrift = Caveat({ subsets: ["latin"], weight: ["600"], display: "swap" });

// Grijs van de site (#77758F), net iets donkerder: 4,5:1 op wit en lila.
const MUTE = "#6B6985";
// Teal als tekst: de merkteal is te licht voor kleine letters op wit.
const TEAL_TEKST = "#08716B";
const CHECK = "#E5F5F4";
const RED = "#CA152A";
// De achtergrond van de footer van de site (r2uStijl.ts).
const IVOOR = "#F8F5F1";

export type Modus = "klant" | "collega" | "voorbeeld";

/** Wat React2u zelf meegeeft: bedrijfsgegevens en certificaten (Instellingen), zoals in de footer van de site. */
type Huis = { contact: ContactInfo; certificaten: Certificate[] };

type Dienstlabel = { naam: string; kleur: string; tint: string };

/** Kleur en pasteltint per label, zoals op de dienstenkaarten van de site. */
const LABELKLEUR: Record<string, { kleur: string; tint: string }> = {
  Recover: { kleur: PINK, tint: "#FDECF4" },
  Resist: { kleur: TEAL, tint: "#E5F5F4" },
  Restart: { kleur: ORANGE, tint: "#FEF3E3" },
};
function labelVan(vorm: Vorm): Dienstlabel {
  const naam = DIENSTLABEL[vorm].replace(/^React2u\s+/i, "");
  return { naam, ...(LABELKLEUR[naam] || { kleur: NAVY, tint: "#ECEBF5" }) };
}

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
  witrand: `hv-btn border-[1.5px] border-white/50 text-white hover:bg-white/10 ${KNOP}`,
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

/** Initialen in een cirkel met een witte rand, zoals de fotocirkels van de site. */
function Avatar({ naam, maat = 44, kleur = NAVY, rand = "#ffffff" }: { naam: string | null; maat?: number; kleur?: string; rand?: string }) {
  return (
    <span
      className={`${kop} flex shrink-0 items-center justify-center rounded-full text-white`}
      style={{ width: maat, height: maat, fontSize: maat * 0.36, background: kleur, boxShadow: `0 0 0 ${Math.max(3, Math.round(maat / 16))}px ${rand}` }}
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

/** Het label met de stip in een zacht rondje, zoals op de startpagina (HomeVerhaal.tsx). */
function Stiplabel({ children, kleur = TEAL, zacht = "#D7F0EE" }: { children: React.ReactNode; kleur?: string; zacht?: string }) {
  return (
    <span className="inline-flex items-center gap-2 self-start text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: kleur }}>
      <span className="grid h-[18px] w-[18px] place-items-center rounded-full" style={{ background: zacht }}>
        <span className="h-[7px] w-[7px] rounded-full" style={{ background: kleur }} />
      </span>
      {children}
    </span>
  );
}

/** De sectiekop van de site: links bovenkopje en kop, rechts een korte toelichting. */
function SectieKop({ eyebrow, kleur, titel, tekst, licht = false }: { eyebrow: string; kleur?: string; titel: string; tekst?: React.ReactNode; licht?: boolean }) {
  return (
    <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-6">
      <div className="flex flex-col gap-4 lg:col-span-7">
        <Eyebrow kleur={licht ? "rgba(255,255,255,0.85)" : kleur}>{eyebrow}</Eyebrow>
        <h2 className={`${kop} m-0 leading-[1.1] tracking-[-0.9px]`} style={{ color: licht ? "#ffffff" : NAVY, fontSize: "clamp(32px, 4vw, 46px)" }}>{titel}</h2>
      </div>
      {tekst && <div className="m-0 text-[16px] leading-[1.7] md:text-[17px] lg:col-span-4 lg:col-start-9" style={{ color: licht ? "rgba(255,255,255,0.82)" : BODY }}>{tekst}</div>}
    </div>
  );
}

/** Een band van rand tot rand, wit of lichtlila, met de maten van de site. */
function Band({ id, lila = false, children, label }: { id?: string; lila?: boolean; children: React.ReactNode; label?: string }) {
  return (
    <section id={id} aria-label={label} className="scroll-mt-[96px]" style={{ background: lila ? SOFT : "#ffffff" }}>
      <div className={`${BREED} flex flex-col gap-10 py-16 md:gap-14 md:py-[112px]`}>{children}</div>
    </section>
  );
}

/** Een vlak binnen een band: wit op lila, lila op wit. */
const vlak = (lila: boolean): React.CSSProperties => ({ background: lila ? "#ffffff" : SOFT });

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
    <div className={`hv ${outfit.variable} offerte-doc min-h-screen bg-white`}>
      <style>{PAGINA_CSS}</style>
      {getekend ? (
        <Getekend offerte={offerte} token={token} voorwaarden={voorwaarden} modus={modus} vers={vers} huis={huis} />
      ) : (
        <Document offerte={offerte} token={token} modus={modus} voorwaarden={voorwaarden} huis={huis} />
      )}
    </div>
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

/* ---------- de opening: de stippenconstellatie ---------- */

// Constellatie op een vlak van 640 × 600, zoals op de startpagina; alles in procenten zodat hij meeschaalt.
const CW = 640, CH = 600;
const pct = (v: number, of: number) => `${(v / of) * 100}%`;
// [x, y, maat, kleur, zweefritme]
const STIPPEN: [number, number, number, string, number][] = [
  [196, 18, 42, TEAL, 2], [262, 0, 26, TEAL, 1], [584, 74, 34, NAVY, 3], [58, 128, 30, SKY, 1], [128, 196, 18, SKY, 2],
  [18, 470, 52, ORANGE, 2], [104, 548, 26, ORANGE, 1],
  [560, 380, 56, PINK, 3], [606, 470, 30, RED, 1], [520, 540, 22, RED, 2], [470, 586, 14, PINK, 1], [236, 566, 20, PINK, 2],
];
// [x, y, maat, zweefritme] van de drie medaillons: bedrag, contactpersoon, label.
const PLEKKEN: [number, number, number, number][] = [
  [262, 72, 286, 1], [22, 232, 206, 3], [300, 374, 184, 2],
];

/**
 * De constellatie van de opening: stippen in de kleuren van het logo, en drie
 * medaillons met een witte rand waar de site foto's heeft. Tekstgrootte in
 * cqw, zodat alles meeschaalt met de breedte. Speelt één keer af (stippen
 * ploppen, medaillons komen op) en zweeft dan zacht; stil bij minder beweging.
 */
function Constellatie({ medaillons }: { medaillons: [React.ReactNode, React.ReactNode, React.ReactNode] }) {
  const kleur = ["#ffffff", NAVY, "#ffffff"];
  return (
    <ReisSpeler>
      <div className="relative mx-auto w-full max-w-[600px]" style={{ aspectRatio: `${CW} / ${CH}`, containerType: "inline-size" }}>
        {STIPPEN.map(([x, y, s, c, f], i) => (
          <span key={i} aria-hidden className="hv-jd absolute" style={{ left: pct(x, CW), top: pct(y, CH), width: pct(s, CW), aspectRatio: "1", animationDelay: `${(0.25 + i * 0.05).toFixed(2)}s` }}>
            <span className={`hv-f${f} absolute inset-0 rounded-full`} style={{ background: c }} />
          </span>
        ))}
        {PLEKKEN.map(([x, y, s, f], i) => (
          <span key={`m${i}`} className="hv-js absolute" style={{ left: pct(x, CW), top: pct(y, CH), width: pct(s, CW), aspectRatio: "1", animationDelay: `${(0.05 + i * 0.14).toFixed(2)}s` }}>
            <span
              className={`hv-f${f} absolute inset-0 flex flex-col items-center justify-center rounded-full text-center`}
              style={{ background: kleur[i], boxShadow: "0 0 0 1.1cqw #ffffff, 0 30px 60px -30px rgba(50,46,131,.55)" }}
            >
              {medaillons[i]}
            </span>
          </span>
        ))}
      </div>
    </ReisSpeler>
  );
}

/** Het bedrag in het grote medaillon: groot, met kleinere letters als het bedrag lang is. */
function PrijsMedaillon({ t, kop: titel = "Jouw voorstel" }: { t: Totalen; kop?: string }) {
  const hoofd = hoofdbedrag(t);
  const getoond = useTelwaarde(hoofd?.bedrag ?? 0);
  const tekst = hoofd ? euro(getoond) : "Op aanvraag";
  const maat = tekst.length > 9 ? 6.4 : tekst.length > 7 ? 7.6 : 8.8;
  return (
    <>
      <span className="font-bold uppercase" style={{ color: MUTE, fontSize: "1.9cqw", letterSpacing: "0.25cqw" }}>{titel}</span>
      <span className={`${kop} tabular-nums`} style={{ color: NAVY, fontSize: `${maat}cqw`, lineHeight: 1.05, letterSpacing: "-0.25cqw", marginTop: "1cqw" }}>{tekst}</span>
      {hoofd && <span style={{ color: BODY, fontSize: "2.5cqw", marginTop: "0.4cqw" }}>{hoofd.per}</span>}
      <span style={{ color: MUTE, fontSize: "1.9cqw", marginTop: "0.9cqw" }}>exclusief btw</span>
    </>
  );
}

function ContactMedaillon({ naam, functie }: { naam: string | null; functie: string | null }) {
  return (
    <>
      <span className={kop} style={{ color: "#ffffff", fontSize: "7.4cqw", lineHeight: 1 }}>{initialen(naam)}</span>
      <span className="font-bold" style={{ color: "#ffffff", fontSize: "2.2cqw", marginTop: "1.6cqw", maxWidth: "80%" }}>{naam || "React2u"}</span>
      <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "1.8cqw", marginTop: "0.3cqw" }}>{functie ? "je contactpersoon" : "React2u"}</span>
    </>
  );
}

function LabelMedaillon({ label }: { label: Dienstlabel }) {
  return (
    <span className="absolute inset-0 flex flex-col items-center justify-center rounded-full" style={{ background: label.tint }}>
      <span className={kop} style={{ color: NAVY, fontSize: "2.6cqw", lineHeight: 1.1 }}>React2u</span>
      <span className={kop} style={{ color: label.kleur, fontSize: "4.8cqw", lineHeight: 1.05, letterSpacing: "-0.1cqw" }}>
        {label.naam}<sup style={{ color: NAVY, fontSize: "1.8cqw" }}>®</sup>
      </span>
    </span>
  );
}

/**
 * De opening, als "Eén casemanager die je kent" op de startpagina: links de
 * kop in twee kleuren, de afspraken en de knoppen, rechts de constellatie.
 */
function Opening({ label, regels, tekst, feiten, punten, knoppen, constellatie }: {
  label: React.ReactNode;
  regels: [string, string];
  tekst: React.ReactNode;
  feiten?: [string, string][];
  punten?: string[];
  knoppen: React.ReactNode;
  constellatie: React.ReactNode;
}) {
  return (
    <section style={{ background: SOFT }}>
      <div className={`${BREED} grid items-center gap-10 pb-14 pt-10 md:pb-20 md:pt-14 lg:grid-cols-12 lg:gap-8 lg:pb-[88px] lg:pt-[64px]`}>
        <div className="flex flex-col gap-6 lg:col-span-6">
          {label}
          {/* Kleur inline: de algemene kopstijl van de site staat buiten de Tailwind-lagen en wint anders */}
          <h1 className={`${kop} m-0 text-balance text-[36px] leading-[1.06] tracking-[-1px] md:text-[44px] md:tracking-[-1.2px] xl:text-[50px] xl:tracking-[-1.4px]`}>
            <span className="block" style={{ color: NAVY }}>{regels[0]}</span>
            <span className="block" style={{ color: TEAL }}>{regels[1]}</span>
          </h1>
          <div className="m-0 max-w-[540px] text-[17px] leading-[1.75] md:text-[18px]" style={{ color: BODY }}>{tekst}</div>
          {feiten && feiten.length > 0 && (
            <dl className="m-0 grid max-w-[540px] grid-cols-2 gap-x-6 gap-y-4 border-y py-5 sm:flex sm:flex-wrap sm:gap-x-10" style={{ borderColor: "#E3E1EE" }}>
              {feiten.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-[13px]" style={{ color: MUTE }}>{k}</dt>
                  <dd className="m-0 mt-0.5 text-[16px] font-bold" style={{ color: NAVY }}>{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {punten && punten.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {punten.map((p) => (
                <li key={p} className="flex items-start gap-3 text-[16px] leading-[1.5]" style={{ color: NAVY }}>
                  <span className="mt-[1px] grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full" style={{ background: "#EEEDF8", color: NAVY }}><Vink size={12} dik={3} /></span>
                  {p}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-3 pt-1 print:hidden">{knoppen}</div>
        </div>
        <div className="lg:col-span-6">{constellatie}</div>
      </div>
    </section>
  );
}

/* ---------- het document ---------- */

function Document({ offerte, token, modus, voorwaarden, huis }: { offerte: OffertePubliek; token?: string; modus: Modus; voorwaarden: string; huis: Huis }) {
  const regels = useMemo(() => normaliseerRegels(offerte.regels), [offerte.regels]);
  const [keuze, setKeuze] = useState<string[]>(() => herstelKeuze(regels, offerte.keuze));
  const totalen = useMemo(() => berekenTotalen(regels, keuze, offerte.medewerkers), [regels, keuze, offerte.medewerkers]);
  const open = (offerte.status === "verstuurd" && !offerte.verlopen) || (modus === "voorbeeld" && offerte.status === "concept");
  const kanTekenen = offerte.status === "verstuurd" && !offerte.verlopen && modus === "klant" && Boolean(token);
  const kanKiezen = offerte.status === "verstuurd" || modus === "voorbeeld";
  const [afwijzen, setAfwijzen] = useState(false);
  const vorm: Vorm = VORMEN[offerte.vorm] ? offerte.vorm : "verzuimbegeleiding";
  const label = labelVan(vorm);
  const heeftKeuze = regels.some((r) => r.soort === "optie" || r.soort === "keuze");
  const bijAkkoord = useInBeeld("akkoord");
  // Wit en lila om en om, wat er ook in de offerte staat.
  const banden = ["voorwoord", ...(offerte.intro ? ["persoonlijk"] : []), ...(offerte.inhoud?.trim() ? ["over"] : []), "keuze", "verder", "vertrouwen", "akkoord"];
  const lila = (id: string) => banden.indexOf(id) % 2 === 1;

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
          label={<Stiplabel kleur={label.kleur} zacht={label.tint}>Offerte {offerte.nummer}</Stiplabel>}
          regels={[offerte.titel, `voor ${offerte.bedrijf}`]}
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
          constellatie={
            <Constellatie
              medaillons={[
                <PrijsMedaillon key="p" t={totalen} kop={open && heeftKeuze ? "Jouw keuze" : "Jouw voorstel"} />,
                <ContactMedaillon key="c" naam={offerte.afzender_naam} functie={offerte.afzender_functie} />,
                <LabelMedaillon key="l" label={label} />,
              ]}
            />
          }
        />

        <Voorwoord offerte={offerte} lila={lila("voorwoord")} />

        {offerte.intro && (
          <section aria-label="Een persoonlijk woord" style={{ background: lila("persoonlijk") ? SOFT : "#ffffff" }}>
            <div className={`${BREED} py-16 md:py-[112px]`}>
              <figure className="m-0 mx-auto flex max-w-[920px] flex-col gap-8 rounded-[28px] px-6 py-9 sm:px-10 md:px-14 md:py-14" style={vlak(lila("persoonlijk"))}>
                <div className="flex items-center gap-4">
                  <Avatar naam={offerte.afzender_naam} maat={60} rand={lila("persoonlijk") ? "#ffffff" : SOFT} />
                  <div className="leading-tight">
                    <Eyebrow>Een persoonlijk woord</Eyebrow>
                    <p className="m-0 mt-1.5 text-[15px]" style={{ color: MUTE }}>Van {offerte.afzender_naam || "React2u"}{offerte.afzender_functie ? `, ${offerte.afzender_functie}` : ""}</p>
                  </div>
                </div>
                <blockquote className="m-0">
                  <p className="m-0 whitespace-pre-line text-[17px] leading-[1.8] md:text-[19px]" style={{ color: BODY }}>{vulIn(offerte.intro, offerte)}</p>
                </blockquote>
                <figcaption className={`${handschrift.className} text-[44px] leading-none`} style={{ color: NAVY }}>{offerte.afzender_naam || "React2u"}</figcaption>
              </figure>
            </div>
          </section>
        )}

        {offerte.inhoud?.trim() && (
          <section aria-label="Over deze offerte" style={{ background: lila("over") ? SOFT : "#ffffff" }}>
            <div className={`${BREED} grid gap-8 py-16 md:py-[112px] lg:grid-cols-12 lg:gap-6`}>
              <div className="flex flex-col gap-4 lg:col-span-4">
                <Eyebrow kleur={label.kleur}>{label.naam}</Eyebrow>
                <h2 className={`${kop} m-0 text-[34px] leading-[1.08] tracking-[-0.9px] md:text-[46px]`} style={{ color: NAVY }}>Over deze offerte</h2>
              </div>
              <div className="rounded-[28px] p-6 md:p-10 lg:col-span-8 lg:col-start-5" style={vlak(lila("over"))}>
                <Toelichting tekst={vulIn(offerte.inhoud, offerte)} achter={lila("over") ? "#ffffff" : SOFT} />
              </div>
            </div>
          </section>
        )}

        <Band id="keuze" lila={lila("keuze")}>
          <SectieKop
            eyebrow={heeftKeuze ? "Stel je offerte samen" : "Wat je krijgt"}
            kleur={TEAL}
            titel={heeftKeuze ? "Kies wat bij jullie past" : "Dit doen we voor je"}
            tekst={heeftKeuze ? "Kies je aansluiting en zet extra's aan of uit. Rechts zie je meteen wat het per maand kost." : "Wat we voor je doen en wat het kost, precies zoals in de prijslijst."}
          />
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-6">
            <div className="flex min-w-0 flex-col gap-12 lg:col-span-8">
              {secties(regels).map((s) => (
                <Sectie key={s.naam} sectie={s} keuze={keuze} klik={klik} medewerkers={offerte.medewerkers} kanKiezen={kanKiezen} />
              ))}
            </div>
            {/* Op een groot scherm loopt het overzicht mee langs de keuzes */}
            <div className="hidden lg:col-span-4 lg:block">
              <Overzicht
                offerte={offerte}
                totalen={totalen}
                label={label}
                open={open}
                heeftKeuze={heeftKeuze}
                bijAkkoord={bijAkkoord}
                naarAkkoord={naarAkkoord}
                conceptHref={conceptHref}
              />
            </div>
          </div>
          <Optelling t={totalen} open={open} naarAkkoord={naarAkkoord} />
        </Band>

        <Band lila={lila("verder")} label="Zo gaat het verder">
          <SectieKop eyebrow="Zo gaat het verder" titel="Na je akkoord" tekst="Je tekent online met een code uit je mail. Daarna plannen we samen de start." />
          <Reis stappen={offerte.vervolg} achter={lila("verder") ? SOFT : "#ffffff"} />
          <div className="grid gap-6 rounded-[28px] p-6 md:grid-cols-12 md:p-10" style={vlak(lila("verder"))}>
            <div className="md:col-span-7">
              <h3 className={`${kop} m-0 text-[22px]`} style={{ color: NAVY }}>Voorwaarden</h3>
              <div className="mt-4"><OfferteTekst tekst={vulIn(offerte.voorwaarden, offerte).trim() || "- Alle bedragen zijn exclusief btw."} klein /></div>
            </div>
            <p className="m-0 text-[15px] leading-[1.7] md:col-span-4 md:col-start-9 md:self-end" style={{ color: BODY }}>
              {offerte.geldig_tot ? `Deze offerte is geldig tot en met ${datumLang(offerte.geldig_tot)}. ` : ""}Op deze offerte zijn de{" "}
              <a href={voorwaarden} target="_blank" rel="noopener" className="font-bold underline underline-offset-4" style={{ color: NAVY }}>algemene voorwaarden</a> van React2u van toepassing.
            </p>
          </div>
        </Band>

        <Vertrouwen huis={huis} lila={lila("vertrouwen")} />

        <section id="akkoord" aria-label="Akkoord" className="scroll-mt-[96px]" style={{ background: lila("akkoord") ? SOFT : "#ffffff" }}>
          <div className={`${BREED} py-10 md:py-16`}>
            <div className="relative overflow-hidden rounded-[28px] px-5 py-12 sm:px-8 md:px-12 md:py-16 xl:px-[72px] xl:py-[88px]" style={{ background: NAVY }}>
              {/* Het lichtere vlak van de contactband van de site */}
              <span aria-hidden className="absolute -left-[180px] -top-[300px] h-[560px] w-[560px] rounded-full md:-left-[200px] md:-top-[420px] md:h-[900px] md:w-[900px]" style={{ background: "rgba(255,255,255,0.05)" }} />
              <div className="relative grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-6">
                <div className="flex flex-col gap-5 lg:col-span-6">
                  <span className="text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: "rgba(255,255,255,0.75)" }}>Akkoord</span>
                  <h2 className={`${kop} m-0 text-[36px] leading-[1.05] tracking-[-1px] md:text-[48px] md:tracking-[-1.3px]`}>
                    <span className="block" style={{ color: "#ffffff" }}>Teken voor akkoord.</span>
                    <span className="block" style={{ color: "#8FD8D2" }}>Wij doen de rest.</span>
                  </h2>
                  <p className="m-0 max-w-[480px] text-[16px] leading-[1.7] md:text-[17px]" style={{ color: "rgba(255,255,255,0.8)" }}>
                    {open ? "Zet je handtekening en bevestig met de code uit je mail. De getekende offerte krijg je meteen als pdf." : "Ondertekenen kan bij deze offerte niet meer. Neem gerust contact op."}
                  </p>
                </div>
                <ContactRijen offerte={offerte} huis={huis} />
              </div>
              <div className="relative mt-10 rounded-[24px] bg-white p-5 sm:p-7 md:mt-14 md:p-10">
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

/** Bellen en mailen in de indigo band, zoals de contactband van de site. */
function ContactRijen({ offerte, huis }: { offerte: OffertePubliek; huis: Huis }) {
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
        <li key={r.groot} className="border-t last:border-b" style={{ borderColor: "rgba(255,255,255,0.14)" }}>
          <a href={r.href} className="hv-btn group flex items-center gap-4 py-5 text-white">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>{r.icoon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>{r.klein}</span>
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
function Overzicht({ offerte, totalen, label, open, heeftKeuze, bijAkkoord, naarAkkoord, conceptHref }: {
  offerte: OffertePubliek; totalen: Totalen; label: Dienstlabel; open: boolean; heeftKeuze: boolean; bijAkkoord: boolean; naarAkkoord: () => void; conceptHref: string | null;
}) {
  const tel = telLink(offerte.afzender_telefoon);
  return (
    <aside aria-label="Jouw voorstel" className="sticky top-[112px] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_70px_-40px_rgba(50,46,131,0.45)]" style={{ border: `1px solid ${LINE}` }}>
      <div className="relative px-7 pb-5 pt-6" style={{ background: label.tint }}>
        <span aria-hidden className="absolute -right-[36px] -top-[36px] h-[110px] w-[110px] rounded-full" style={{ background: label.kleur, opacity: 0.16 }} />
        <span className="relative flex items-start justify-between gap-3">
          <span className={`${kop} flex flex-col text-[15px] leading-[1.1]`} style={{ color: NAVY }}>
            React2u<span className="text-[24px] tracking-[-0.5px]" style={{ color: label.kleur }}>{label.naam}<sup className="text-[11px]" style={{ color: NAVY }}>®</sup></span>
          </span>
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
                <span className="shrink-0 font-bold tabular-nums" style={{ color: b.bedrag === 0 ? TEAL_TEKST : NAVY }}>
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
          <p className="m-0 mt-6 flex items-center gap-2 text-[15px] font-bold" style={{ color: TEAL_TEKST }}><Vink size={15} /> Je ondertekent hieronder</p>
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
 * hun initialen tussen de stippen, de kop en de uitgelichte zin zoals de
 * klantcitaten van de site; rechts de brief, met de eerste alinea als intro
 * en onderaan hun twee handtekeningen. Op een groot scherm blijft links staan.
 */
function Voorwoord({ offerte, lila }: { offerte: OffertePubliek; lila: boolean }) {
  const v = VOORWOORD;
  const achter = lila ? SOFT : "#ffffff";
  const [eerste, ...rest] = v.alineas;
  return (
    <section aria-labelledby="voorwoord-kop" style={{ background: achter }}>
      <div className={`${BREED} grid gap-10 py-16 md:py-[112px] lg:grid-cols-12 lg:gap-6`}>
        <div className="flex flex-col gap-7 lg:sticky lg:top-[120px] lg:col-span-5 lg:self-start xl:col-span-4">
          <div className="relative h-[120px] w-[220px]" aria-hidden="true">
            {([[0, 26, 10, TEAL, 2], [176, 4, 16, ORANGE, 1], [204, 74, 12, PINK, 3], [150, 102, 8, SKY, 2], [58, 108, 9, RED, 1]] as [number, number, number, string, number][]).map(([x, y, s, c, f], i) => (
              <span key={i} className={`hv-f${f} absolute rounded-full`} style={{ left: x, top: y, width: s, height: s, background: c }} />
            ))}
            <span className="absolute left-[22px] top-[14px]"><Avatar naam={v.ondertekenaars[0]?.naam || "C"} maat={88} rand={achter} /></span>
            <span className="absolute left-[92px] top-[24px]"><Avatar naam={v.ondertekenaars[1]?.naam || "S"} maat={88} kleur={TEAL} rand={achter} /></span>
          </div>
          <div className="flex flex-col gap-4">
            <Eyebrow>Voorwoord</Eyebrow>
            <h2 id="voorwoord-kop" className={`${kop} m-0 text-[34px] leading-[1.08] tracking-[-0.9px] md:text-[46px]`} style={{ color: NAVY }}>{v.kop}</h2>
          </div>
          <figure className="m-0 flex flex-col gap-3">
            <span aria-hidden className={`${kop} text-[64px] leading-[0.6]`} style={{ color: PINK }}>“</span>
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
        <div key={gi} role="radiogroup" aria-label={`Kies: ${sectie.naam}`} className={`grid gap-5 ${lijst.length >= 2 ? "md:grid-cols-2" : ""}`}>
          {lijst.map((r) => <KeuzeKaart key={r.id} r={r} aan={keuze.includes(r.id)} klik={() => klik(r.id)} medewerkers={medewerkers} kanKiezen={kanKiezen} />)}
        </div>
      ))}

      {vast.length > 0 && (
        <div className="flex flex-col rounded-[22px] border bg-white px-6 py-2 md:px-7" style={{ borderColor: LINE }}>
          {vast.map((r) => (
            <div key={r.id} className="flex items-start gap-3.5 border-b py-4 last:border-b-0" style={{ borderColor: LINE }}>
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full" style={{ background: CHECK, color: TEAL_TEKST }} aria-hidden="true"><Vink size={12} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-[16px] font-bold" style={{ color: NAVY }}>{r.naam}</span>
                  <span className="text-[16px] font-bold tabular-nums" style={{ color: r.prijs === 0 ? TEAL_TEKST : NAVY }}>{maandprijs(r).tekst}</span>
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
                  className={`flex w-full items-start gap-4 rounded-[22px] border-[1.5px] bg-white p-5 text-left transition-[border-color,box-shadow,transform] disabled:cursor-default enabled:active:scale-[0.995] md:px-7 ${aan ? "border-[#322E83] shadow-[0_18px_36px_-28px_rgba(50,46,131,0.55)]" : "border-[#E6E5EF] enabled:hover:border-[#B9B6DA]"}`}
                >
                  <span className={`relative mt-0.5 inline-flex h-[26px] w-[46px] shrink-0 rounded-full transition-colors print:hidden ${aan ? "bg-[#322E83]" : "bg-[#DCDAE8]"}`} aria-hidden="true">
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
 * Een keuze als de prijskaarten op de tarievenpagina: wit met een rand, en
 * indigo als hij gekozen is. Het bedrag is wat de organisatie per maand
 * betaalt; per medewerker en de prijslijst staan eronder.
 */
function KeuzeKaart({ r, aan, klik, medewerkers, kanKiezen }: { r: Regel; aan: boolean; klik: () => void; medewerkers: number | null; kanKiezen: boolean }) {
  const mp = maandprijs(r);
  const perMedewerker = r.eenheid === "medewerker_jaar" || r.eenheid === "medewerker";
  const b = bedragVoor(r, medewerkers);
  const organisatie = perMedewerker && b && b.bedrag ? regelbedrag(b) : null;
  const n = aantalVoor(r, medewerkers);
  const tekst = aan ? "#ffffff" : NAVY;
  const zacht = aan ? "rgba(255,255,255,0.78)" : BODY;
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
      {aan && <span aria-hidden className="absolute -right-[60px] -top-[60px] h-[180px] w-[180px] rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />}
      <span className="relative flex items-start justify-between gap-4">
        <span className={`${kop} text-[22px] leading-[1.2]`} style={{ color: tekst }}>{r.naam}</span>
        {r.badge && <span className="shrink-0 rounded-md px-2.5 py-1 text-[13px] font-bold" style={{ background: aan ? PINK : SOFT, color: aan ? "#ffffff" : NAVY }}>{r.badge}</span>}
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
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ background: aan ? "rgba(255,255,255,0.12)" : CHECK, color: aan ? "#ffffff" : TEAL }}><Vink size={11} /></span>
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
      <span aria-hidden className="absolute -left-[12%] top-1/2 aspect-square w-[46%] -translate-y-1/2 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
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

/* ---------- zo gaat het verder: de stippenreis ---------- */

const STAP_KLEUR = [TEAL, SKY, PINK, ORANGE];
const STAP_ICOON = [LuPenLine, LuCalendarCheck, LuHandshake, LuRoute];
// Reis op een vlak van 1200 × 250, zoals op de startpagina: stations, daartussen een S-bocht van stippen.
const JW = 1200, JH = 250, JR = 66, SEG = 0.9;
const tStation = (i: number) => 0.15 + i * 0.22;
const tSpoor = (i: number) => 0.5 + i * SEG;

function hex(c: string) { return [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)); }
function mix(a: string, b: string, t: number) {
  const A = hex(a), B = hex(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

type Stip = { x: number; y: number; s: number; c: string; delay: number };
/** Stations en het spoor voor 2 tot 4 stappen (de reis van HomeVerhaal, met een variabel aantal stations). */
function reisVoor(n: number) {
  const sx = Array.from({ length: n }, (_, i) => (n === 1 ? JW / 2 : 150 + (i * 900) / (n - 1)));
  const sy = sx.map((_, i) => (i % 2 ? 150 : 110));
  const spoor: Stip[] = [];
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0, x1, y1] = [sx[i], sy[i], sx[i + 1], sy[i + 1]];
    const pts: [number, number][] = [];
    for (let k = 0; k < 400; k++) {
      const u = k / 399;
      pts.push([x0 + (x1 - x0) * u, y0 + (y1 - y0) * (3 * u * u - 2 * u * u * u) - 28 * Math.sin(Math.PI * u)]);
    }
    let acc = 0, last = pts[0];
    let gekozen: [number, number][] = [];
    for (const p of pts.slice(1)) {
      acc += Math.hypot(p[0] - last[0], p[1] - last[1]); last = p;
      if (acc >= 19) { gekozen.push(p); acc = 0; }
    }
    gekozen = gekozen.filter((p) => Math.hypot(p[0] - x0, p[1] - y0) > JR + 14 && Math.hypot(p[0] - x1, p[1] - y1) > JR + 14);
    const start = tSpoor(i);
    gekozen.forEach((p, j) => {
      const t = j / Math.max(gekozen.length - 1, 1);
      spoor.push({ x: p[0], y: p[1], s: 8 + 4 * Math.sin(Math.PI * t), c: mix(STAP_KLEUR[i % 4], STAP_KLEUR[(i + 1) % 4], t), delay: start + t * SEG });
    });
  }
  return { sx, sy, spoor };
}

/**
 * De vervolgstappen als de stippenreis van de startpagina. Stappen die al
 * gedaan zijn (na ondertekening de eerste) krijgen een vinkje.
 */
function Reis({ stappen: eigen, klaar = 0, achter = "#ffffff" }: { stappen: Stap[] | null | undefined; klaar?: number; achter?: string }) {
  const lijst = normaliseerVervolg(eigen);
  const stappen = (lijst.length ? lijst : VERVOLG_STANDAARD).slice(0, 4);
  const { sx, sy, spoor } = useMemo(() => reisVoor(stappen.length), [stappen.length]);
  return (
    <ReisSpeler>
      {/* Breed: het spoor met stations, met de teksten eronder */}
      <div className="hidden md:block">
        <div className="relative mx-auto w-full max-w-[1200px]" style={{ aspectRatio: `${JW} / ${JH}`, containerType: "inline-size" }} aria-hidden="true">
          {spoor.map((p, i) => (
            <span key={i} className="hv-jd absolute rounded-full"
              style={{ left: pct(p.x - p.s / 2, JW), top: pct(p.y - p.s / 2, JH), width: pct(p.s, JW), aspectRatio: "1", background: p.c, animationDelay: `${p.delay.toFixed(2)}s` }} />
          ))}
          {stappen.map((_, i) => {
            const gedaan = i < klaar;
            const Ic = gedaan ? LuCheck : STAP_ICOON[i % 4];
            const c = STAP_KLEUR[i % 4];
            return (
              <span key={i} className="hv-js absolute"
                style={{ left: pct(sx[i] - JR, JW), top: pct(sy[i] - JR, JH), width: pct(2 * JR, JW), aspectRatio: "1", animationDelay: `${tStation(i).toFixed(2)}s` }}>
                <span className={`hv-f${[1, 2, 3, 1][i % 4]} absolute inset-0 grid place-items-center rounded-full text-white`}
                  style={{ background: c, boxShadow: `0 0 0 10px ${achter}, 0 30px 60px -28px ${c}` }}>
                  <Ic style={{ width: "3.8cqw", height: "3.8cqw" }} strokeWidth={gedaan ? 2.6 : 1.7} />
                  <span className={`${kop} absolute grid place-items-center rounded-full bg-white`}
                    style={{ right: "-0.35cqw", top: "-0.35cqw", width: "3.3cqw", height: "3.3cqw", fontSize: "1.4cqw", fontWeight: 800, color: c, boxShadow: "0 6px 16px -6px rgba(50,46,131,.35)" }}>{i + 1}</span>
                </span>
              </span>
            );
          })}
        </div>
        <ol className="m-0 mx-auto mt-2 grid max-w-[1200px] list-none gap-10 p-0" style={{ gridTemplateColumns: `repeat(${stappen.length}, minmax(0, 1fr))` }}>
          {stappen.map((s, i) => (
            <li key={`${s.kop}-${i}`} className="hv-jc flex flex-col items-center gap-2 px-2 text-center" style={{ animationDelay: `${(tStation(i) + 0.12).toFixed(2)}s` }}>
              <span className="text-[13px] font-bold uppercase tracking-[1.3px]" style={{ color: i < klaar ? TEAL_TEKST : STAP_KLEUR[i % 4] }}>{i < klaar ? "Gedaan" : `Stap ${i + 1}`}</span>
              <span className={`${kop} text-[20px] leading-[1.3] lg:text-[22px]`} style={{ color: NAVY }}>{s.kop}</span>
              {s.tekst && <span className="text-[15px] leading-[1.75] lg:text-[16px]" style={{ color: BODY }}>{s.tekst}</span>}
            </li>
          ))}
        </ol>
      </div>

      {/* Smal: dezelfde reis van boven naar beneden */}
      <ol className="m-0 flex list-none flex-col p-0 md:hidden">
        {stappen.map((s, i) => {
          const gedaan = i < klaar;
          const Ic = gedaan ? LuCheck : STAP_ICOON[i % 4];
          const c = STAP_KLEUR[i % 4];
          const laatste = i === stappen.length - 1;
          return (
            <li key={`${s.kop}-${i}`} className="grid grid-cols-[64px_1fr] gap-x-5">
              <div className="flex flex-col items-center">
                <span className="hv-js grid h-16 w-16 shrink-0 place-items-center rounded-full text-white"
                  style={{ background: c, boxShadow: `0 0 0 6px ${achter}, 0 20px 40px -22px ${c}`, animationDelay: `${tStation(i).toFixed(2)}s` }}>
                  <Ic className="text-[26px]" strokeWidth={gedaan ? 2.6 : 1.7} aria-hidden />
                </span>
                {!laatste && (
                  <span aria-hidden className="flex grow flex-col items-center justify-around gap-2 py-3">
                    {[0, 1, 2, 3].map((k) => (
                      <span key={k} className="hv-jd h-2 w-2 rounded-full"
                        style={{ background: mix(c, STAP_KLEUR[(i + 1) % 4], k / 3), animationDelay: `${(tStation(i) + 0.3 + k * 0.08).toFixed(2)}s` }} />
                    ))}
                  </span>
                )}
              </div>
              <div className={`hv-jc flex flex-col gap-1.5 pt-2 ${laatste ? "" : "pb-8"}`} style={{ animationDelay: `${(tStation(i) + 0.12).toFixed(2)}s` }}>
                <span className="text-[13px] font-bold uppercase tracking-[1.3px]" style={{ color: gedaan ? TEAL_TEKST : c }}>{gedaan ? "Gedaan" : `Stap ${i + 1}`}</span>
                <span className={`${kop} text-[20px] leading-[1.3]`} style={{ color: NAVY }}>{s.kop}</span>
                {s.tekst && <span className="text-[15px] leading-[1.7]" style={{ color: BODY }}>{s.tekst}</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </ReisSpeler>
  );
}

/* ---------- vertrouwen: klanten aan het woord en de keurmerken ---------- */

/** Klanten aan het woord, de klantlogo's en de keurmerken, zoals op de site (Gedeeld.tsx). */
function Vertrouwen({ huis, lila }: { huis: Huis; lila: boolean }) {
  const g = woordenboek("nl").gedeeld;
  return (
    <Band lila={lila} label="Klanten en kwaliteit">
      <SectieKop
        eyebrow={g.ervaringenEyebrow}
        titel={g.ervaringenKop}
        tekst="React2u is een gecertificeerde arbodienst. Onafhankelijke instellingen toetsen elk jaar hoe we werken en hoe we met gegevens omgaan."
      />
      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        {g.citaten.map((q) => (
          <figure key={q.naam} className="m-0 flex flex-col justify-between gap-7 rounded-[28px] p-6 sm:gap-8 sm:p-8 md:p-10" style={vlak(lila)}>
            <blockquote className="m-0 flex flex-col gap-4">
              <span aria-hidden className={`${kop} text-[64px] leading-[0.6]`} style={{ color: PINK }}>“</span>
              <p className={`${kop} m-0 text-[19px] leading-[1.45] sm:text-[20px] md:text-[22px]`} style={{ color: NAVY, fontWeight: 500 }}>{q.tekst}</p>
            </blockquote>
            <figcaption className="flex items-center justify-between gap-6 border-t pt-6" style={{ borderColor: LINE }}>
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
      <div className="mb-9 flex flex-col gap-3 rounded-[20px] p-5 sm:flex-row sm:items-center sm:justify-between md:px-7" style={{ background: SOFT }}>
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
              <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-bold" style={{ background: CHECK, color: TEAL_TEKST }}>
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
            <span aria-hidden className="absolute -right-[60px] -top-[80px] h-[220px] w-[220px] rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
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

/** Stippen in de kleuren van het logo die uit het vinkje springen; alleen bij een verse ondertekening, en niet bij verminderde beweging. */
function Feest() {
  const kleuren = [NAVY, PINK, TEAL, ORANGE, SKY, RED];
  return (
    <span className="pointer-events-none absolute inset-0 motion-reduce:hidden" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => {
        const hoek = (i / 16) * Math.PI * 2;
        const afstand = 34 + (i % 3) * 7;
        const maat = 2.2 + (i % 3) * 0.9;
        return (
          <span
            key={i}
            className="offerte-stip absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: `${maat}cqw`,
              height: `${maat}cqw`,
              background: kleuren[i % kleuren.length],
              ["--x" as string]: `${Math.cos(hoek) * afstand}cqw`,
              ["--y" as string]: `${Math.sin(hoek) * afstand}cqw`,
              animationDelay: `${300 + (i % 4) * 40}ms`,
            }}
          />
        );
      })}
    </span>
  );
}

const FEEST_CSS = `
.offerte-stip { transform: translate(-50%, -50%) scale(0); opacity: 0; animation: offerte-stip 1100ms cubic-bezier(.2,.8,.2,1) forwards; }
@keyframes offerte-stip {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  30% { opacity: 1; }
  100% { transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) { .offerte-stip { animation: none; } }
`;

/** Het medaillon na ondertekening: een teal vinkje, ondertekend en wanneer. */
function GetekendMedaillon({ moment, vers }: { moment: string; vers: boolean }) {
  return (
    <>
      {vers && <Feest />}
      <span className="grid place-items-center rounded-full text-white" style={{ background: TEAL, width: "12cqw", height: "12cqw" }}>
        <LuCheck style={{ width: "6cqw", height: "6cqw" }} strokeWidth={3} aria-hidden />
      </span>
      <span className={kop} style={{ color: NAVY, fontSize: "4.4cqw", marginTop: "1.8cqw", lineHeight: 1.1 }}>Ondertekend</span>
      <span style={{ color: MUTE, fontSize: "2cqw", marginTop: "0.6cqw", maxWidth: "76%" }}>{moment}</span>
    </>
  );
}

function Getekend({ offerte, token, voorwaarden, modus, vers, huis }: { offerte: OffertePubliek; token?: string; voorwaarden: string; modus: Modus; vers: boolean; huis: Huis }) {
  const inhoud = offerte.getekend_inhoud!;
  // De pdf met het ondertekeningscertificaat: via het token, of in het voorbeeld via het beheer.
  const pdf = token ? `/offerte/${token}/pdf` : `/admin/offertevoorbeeld/${offerte.id}/pdf`;
  const regels = normaliseerRegels(inhoud.regels);
  const t = berekenTotalen(regels, inhoud.keuze, inhoud.medewerkers);
  const tarieven = regels.filter((r) => r.soort === "tarief");
  const vorm: Vorm = inhoud.vorm && VORMEN[inhoud.vorm] ? inhoud.vorm : "verzuimbegeleiding";
  const label = labelVan(vorm);
  const afzender = inhoud.afzender_naam || offerte.afzender_naam || "React2u";
  const metTekst = Boolean(inhoud.inhoud?.trim());
  return (
    <>
      <style>{FEEST_CSS}</style>
      <Kopbalk offerte={offerte} actie={<a href={`${pdf}?download=1`} className={`${knop.rand} !h-[48px] md:!h-[52px]`}><Download /> Pdf</a>} />
      <Melding modus={modus} />

      <main>
        <Opening
          label={<Stiplabel>Offerte {inhoud.nummer} is ondertekend</Stiplabel>}
          regels={vers ? [`Gelukt, ${voornaam(inhoud.getekend_naam)}!`, "Welkom bij React2u."] : [`Ondertekend door ${inhoud.getekend_naam}`, "Welkom bij React2u."]}
          tekst={
            <p className="m-0">
              <span className="hidden print:inline">{inhoud.titel}. </span>
              {inhoud.titel} voor {inhoud.bedrijf}
              {inhoud.betreft ? ` (${VORMEN[vorm].betreft || "betreft"}: ${inhoud.betreft})` : ""}, ondertekend op {momentLang(inhoud.getekend_at)}.
              {vers ? ` De getekende offerte staat als pdf in je mail op ${inhoud.getekend_email}.` : ""}
            </p>
          }
          punten={inhoud.bevestiging ? ["E-mailadres bevestigd met een code", "De getekende versie ligt vast, met een kenmerk"] : ["De getekende versie ligt vast, met een kenmerk"]}
          knoppen={
            <>
              <a href={`${pdf}?download=1`} className={knop.roze}><Download /> Download de getekende offerte</a>
              <a href={pdf} target="_blank" rel="noopener" className={knop.rand}>Bekijk de pdf<Pijl /></a>
            </>
          }
          constellatie={
            <Constellatie
              medaillons={[
                <GetekendMedaillon key="g" moment={momentLang(inhoud.getekend_at)} vers={vers} />,
                <ContactMedaillon key="c" naam={afzender} functie={inhoud.afzender_functie ?? offerte.afzender_functie} />,
                <LabelMedaillon key="l" label={label} />,
              ]}
            />
          }
        />

        <Band label="Zo gaat het verder">
          <SectieKop
            eyebrow="Zo gaat het verder"
            titel="De eerste stap is gezet"
            tekst={offerte.afzender_telefoon ? <>Vragen over de start? Bel {voornaam(afzender) || "ons"} op <span className="whitespace-nowrap">{offerte.afzender_telefoon}</span>.</> : undefined}
          />
          <Reis stappen={inhoud.vervolg ?? offerte.vervolg} klaar={1} />
        </Band>

        <Band lila label="Wat je hebt afgenomen">
          <SectieKop eyebrow={label.naam} kleur={label.kleur} titel="Wat je hebt afgenomen" />
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
                <Eyebrow kleur={label.kleur}>{label.naam}</Eyebrow>
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

        <Band lila={metTekst} label="Voorwaarden en ondertekening">
          <div className="grid items-start gap-5 lg:grid-cols-12 lg:gap-6">
            <div className="rounded-[28px] p-6 md:p-9 lg:col-span-5" style={vlak(metTekst)}>
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
