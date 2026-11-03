import Link from "next/link";
import { Caveat, Outfit } from "next/font/google";
import Logo from "@/components/site/Logo";
import { BODY, BREED, Keurmerken, KlantenAanHetWoord, KlantenStrook, kop, LAV, LINE, MUTE, NAVY, PINK, Pijl, SOFT, Vink } from "@/components/blocks/Gedeeld";
import type { ContactInfo } from "@/lib/content";
import type { Certificate } from "@/lib/nav";
import { BERICHT_STANDAARD, BROCHURE_EMAIL, type BrochurePubliek } from "@/lib/brochures";
import type { Dienst } from "@/lib/brochureHuisstijl";
import { halveKolom, prijsRijen, type Aansluiting, type PrijsGroep, type Prijslijst } from "@/lib/brochurePrijslijst";
import {
  DIENSTEN_BROCHURE, DIENSTEN_INTRO, hoofdstuk, HOOFDSTUKKEN, KLANTEN_KOP, KOSTEN, kostenvoorbeeld, OFFERTE_SNEL, OPENING, OVERSTAP, TERMIJNEN,
  TIJDLIJN, VOORWOORD_BROCHURE, VRAGEN, WERKWIJZE, ZUSTERLABELS,
} from "@/lib/brochureVerhaal";
import { datumLang, vulIn } from "@/lib/offertes";
import { ondertekenaarRegel, VOORWOORD } from "@/lib/offerteVoorwoord";

/*
 * De brochurepagina (/brochure/<token>, migratie 0030) voor één prospect, in
 * de vormgeving van de site. Na de opening met het persoonlijke woord van de
 * afzender volgt het verhaal in acht genummerde hoofdstukken
 * (lib/brochureVerhaal.ts): van een ziekmelding op maandagochtend, via onze
 * werkwijze, de kosten, de diensten en jouw rol, naar de tarieven en de
 * overstap. Elk hoofdstuk opent met dezelfde kop: een doorlopende indigo lijn
 * met nummer, naam en "01 / 08". Geen keuzes en geen ondertekening: dat komt
 * in de offerte.
 */

// Dezelfde variabele als de site (.hv .hv-kop leest --font-outfit).
const outfit = Outfit({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-outfit", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], weight: ["500"], variable: "--font-caveat", display: "swap" });

const IVOOR = "#F8F5F1";
const ROZE_LICHT = "#F7A8CB";
const KNOP = "inline-flex h-[52px] items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 text-[15px] font-bold";
const knop = {
  roze: `hv-btn hv-btn-roze ${KNOP}`,
  rand: `hv-btn hv-btn-rand ${KNOP}`,
  wit: `hv-btn border-[1.5px] border-white bg-white text-[#322E83] ${KNOP}`,
};

type Huis = { contact: ContactInfo; certificaten: Certificate[] };

const telLink = (t: string | null) => (t ? `tel:${t.replace(/[^\d+]/g, "")}` : null);
const voornaam = (n: string | null | undefined) => (n || "").trim().split(/\s+/)[0] || "";
const initialen = (naam: string | null) => {
  const delen = (naam || "React2u").trim().split(/\s+/);
  return ((delen[0]?.[0] || "R") + (delen.length > 1 ? delen[delen.length - 1][0] : "")).toUpperCase();
};

function Telefoon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
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

function Kruis({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/**
 * De kop van elk hoofdstuk, de lijn door de brochure: een indigo streep met
 * het nummer, de naam en hoe ver je bent, daaronder de titel en de inleiding.
 */
function HoofdstukKop({ id, titel, accent, lead, licht = false }: { id: string; titel: string; accent?: string; lead?: React.ReactNode; licht?: boolean }) {
  const h = hoofdstuk(id);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 border-t-2 pt-4" style={{ borderColor: licht ? "rgba(255,255,255,0.35)" : NAVY }}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-bold" style={{ background: licht ? "#ffffff" : NAVY, color: licht ? NAVY : "#ffffff" }}>{h.nr}</span>
        <span className="text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: licht ? ROZE_LICHT : PINK }}>{h.kort}</span>
        <span className="ml-auto text-[13px] font-semibold tabular-nums" style={{ color: licht ? "rgba(255,255,255,0.6)" : MUTE }}>{h.nr} / {String(HOOFDSTUKKEN.length).padStart(2, "0")}</span>
      </div>
      <h2 className={`${kop} m-0 max-w-[920px] leading-[1.08] tracking-[-0.9px]`} style={{ color: licht ? "#ffffff" : NAVY, fontSize: "clamp(30px, 4vw, 46px)" }}>
        {titel}
        {accent && <> <span style={{ color: licht ? ROZE_LICHT : PINK }}>{accent}</span></>}
      </h2>
      {lead && <div className="m-0 max-w-[700px] text-[16px] leading-[1.7] md:text-[17px]" style={{ color: licht ? "rgba(255,255,255,0.8)" : BODY }}>{lead}</div>}
    </div>
  );
}

/** Een hoofdstuk over de volle breedte. */
function Hoofdstuk({ id, bg = "#ffffff", children }: { id: string; bg?: string; children: React.ReactNode }) {
  const h = hoofdstuk(id);
  return (
    <section id={h.id} aria-label={h.kort} className="scroll-mt-[96px]" style={{ background: bg }}>
      <div className={`${BREED} flex flex-col gap-10 py-14 md:gap-12 md:py-20`}>{children}</div>
    </section>
  );
}

/** Een tussenkop binnen een hoofdstuk. */
function Tussenkop({ titel, lead }: { titel: string; lead?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className={`${kop} m-0 text-[24px] leading-[1.2] tracking-[-0.4px] md:text-[28px]`} style={{ color: NAVY }}>{titel}</h3>
      {lead && <p className="m-0 max-w-[700px] text-[16px] leading-[1.7]" style={{ color: BODY }}>{lead}</p>}
    </div>
  );
}

/* ---------- De prijslijst: de indeling van de gedrukte prijslijst ---------- */

const RIJLIJN = "rgba(50,46,131,0.12)";

function AansluitingKaart({ a, plek }: { a: Aansluiting; plek: string }) {
  const donker = a.uitgelicht;
  const tekst = donker ? "#ffffff" : NAVY;
  const zacht = donker ? "rgba(255,255,255,0.78)" : BODY;
  return (
    <article className={`relative flex flex-col gap-4 overflow-hidden rounded-[24px] p-6 md:p-8 ${plek}`} style={{ background: donker ? NAVY : "#ffffff", boxShadow: donker ? "none" : "0 24px 48px -36px rgba(50,46,131,0.35)" }}>
      <span aria-hidden className="absolute right-[-50px] top-[-50px] h-[150px] w-[150px] rounded-full" style={{ background: donker ? "#ffffff" : NAVY, opacity: donker ? 0.06 : 0.05 }} />
      {a.badge && <span className="relative text-[12.5px] font-bold uppercase tracking-[1.4px]" style={{ color: donker ? "#F7A8CB" : MUTE }}>{a.badge}</span>}
      <span className="relative flex flex-col gap-1">
        <span className={`${kop} leading-[0.95] ${a.bedrag ? (donker ? "text-[56px] tracking-[-1.8px] md:text-[72px]" : "text-[44px] tracking-[-1.2px]") : "text-[36px] tracking-[-0.8px]"}`} style={{ color: tekst }}>{a.prijs}</span>
        {a.per && <span className="text-[14px]" style={{ color: zacht }}>{a.per}</span>}
      </span>
      <span className="relative flex flex-col gap-2 border-t pt-4" style={{ borderColor: donker ? "rgba(255,255,255,0.15)" : LINE }}>
        <span className={`${kop} text-[20px] leading-[1.2]`} style={{ color: tekst }}>{a.naam}</span>
        {a.tekst && <span className="text-[15px] leading-[1.6]" style={{ color: zacht }}>{a.tekst}</span>}
      </span>
      {donker && a.punten.length > 0 && (
        <ul className="relative m-0 flex list-none flex-col gap-2.5 p-0">
          {a.punten.map((p) => (
            <li key={p} className="flex gap-3 text-[15px]" style={{ color: tekst }}>
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ background: "rgba(255,255,255,0.12)" }}><Vink size={11} /></span>{p}
            </li>
          ))}
        </ul>
      )}
      {donker && a.voorbeeld && (
        <div className="relative flex flex-col rounded-[18px] px-5 py-2" style={{ background: "rgba(255,255,255,0.08)" }}>
          {a.voorbeeld.kop && <span className="pb-1 pt-3 text-[12.5px] font-bold uppercase tracking-[1.2px]" style={{ color: zacht }}>{a.voorbeeld.kop}</span>}
          {a.voorbeeld.regels.map((r) => (
            <span key={r.naam} className="flex items-baseline justify-between gap-4 border-t py-2.5 text-[15px]" style={{ borderColor: "rgba(255,255,255,0.12)", color: tekst }}>
              <span>{r.naam}</span><span className="shrink-0 font-bold">{r.prijs}</span>
            </span>
          ))}
        </div>
      )}
      {a.noot && <span className="relative mt-auto text-[13.5px] leading-[1.55]" style={{ color: zacht }}>{a.noot}</span>}
    </article>
  );
}

/** Een label of de uurtarieven. Op halve breedte (naast een ander label) in één kolom, de ondertitel onder de naam. */
function GroepKaart({ g, half = false }: { g: PrijsGroep; half?: boolean }) {
  const kolommen = half ? [halveKolom(g)] : g.kolommen;
  return (
    <article id={`tarieven-${g.id}`} aria-label={g.slug ? `React2u ${g.naam}` : g.naam} className="relative scroll-mt-[104px] overflow-hidden rounded-[24px] px-5 pb-3 pt-6 md:px-8 md:pt-7" style={{ background: g.tint }}>
      {g.slug && <span aria-hidden className="absolute right-[-44px] top-[-44px] h-[132px] w-[132px] rounded-full" style={{ background: g.kleur, opacity: 0.14 }} />}
      <div className={`relative flex flex-col gap-1.5 border-b-[1.5px] pb-4 ${half ? "" : "md:flex-row md:items-end md:justify-between md:gap-8"}`} style={{ borderColor: g.kleur }}>
        {g.slug ? (
          <span className={`${kop} flex flex-col text-[15px] leading-[1.1]`} style={{ color: NAVY }}>
            React2u<span className="text-[28px] tracking-[-0.6px]" style={{ color: g.kleur }}>{g.naam}<sup className="text-[12px]" style={{ color: NAVY }}>®</sup></span>
          </span>
        ) : (
          <span className={`${kop} text-[24px] tracking-[-0.4px]`} style={{ color: NAVY }}>{g.naam}</span>
        )}
        {g.ondertitel && <span className={`text-[14px] leading-[1.5] ${half ? "" : "md:max-w-[460px] md:text-right"}`} style={{ color: MUTE }}>{g.ondertitel}</span>}
      </div>
      <div className={`relative grid gap-x-12 ${kolommen.length > 1 ? "md:grid-cols-2" : ""}`}>
        {kolommen.map((kolom, k) => (
          <div key={k} className="flex min-w-0 flex-col">
            {kolom.map((lijst, li) => (
              <div key={li} className="flex flex-col">
                {g.metTitels && lijst.titel && (
                  // Op de telefoon en in twee smalle kolommen (tablet) de eenheid onder de titel: naast elkaar braken ze allebei af.
                  <span className="flex flex-col gap-0.5 pb-1 pt-5 text-[12.5px] font-bold uppercase tracking-[1.1px] sm:flex-row sm:items-baseline sm:justify-between sm:gap-4 md:flex-col md:items-start md:gap-0.5 lg:flex-row lg:items-baseline lg:gap-4" style={{ color: g.tekst }}>
                    {lijst.titel}{lijst.per && <span className="font-semibold normal-case tracking-normal sm:shrink-0" style={{ color: MUTE }}>{lijst.per}</span>}
                  </span>
                )}
                {lijst.regels.map((r, ri) => (
                  <div key={ri} className="flex items-start justify-between gap-4 border-b py-3 last:border-b-0" style={{ borderColor: RIJLIJN }}>
                    <span className="flex min-w-0 flex-col [overflow-wrap:anywhere]">
                      <span className="text-[15px] font-semibold leading-[1.4]" style={{ color: NAVY }}>{r.naam}</span>
                      {r.sub && <span className="text-[13.5px] leading-[1.45]" style={{ color: MUTE }}>{r.sub}</span>}
                    </span>
                    <span className={`shrink-0 whitespace-nowrap ${r.bedrag ? "text-[15.5px] font-bold" : "pt-0.5 text-[13.5px] font-semibold"}`} style={{ color: r.bedrag ? NAVY : MUTE }}>{r.prijs}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </article>
  );
}

function Tarieven({ p, bedrijf, offerte }: { p: Prijslijst; bedrijf: string; offerte: string }) {
  const drie = p.aansluitingen.length === 3;
  return (
    <section id="tarieven" aria-label={`Tarieven ${p.jaar}`} className="scroll-mt-[96px] bg-white px-[6px] md:px-6 xl:px-10">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-10 rounded-[28px] px-[14px] py-10 sm:px-6 md:gap-12 md:rounded-[36px] md:p-14 lg:p-16 xl:p-[72px]" style={{ background: SOFT }}>
        <div className="px-2 sm:px-0">
          <HoofdstukKop
            id="tarieven"
            titel="Heldere prijzen, vooraf bekend"
            lead={`Alle tarieven van ${p.jaar} op een rij, precies zoals op onze prijslijst. Wat het voor ${bedrijf} kost, zetten we graag in een voorstel op maat.`}
          />
        </div>
        <nav aria-label="Naar de tarieven van" className="-mt-2 flex flex-wrap gap-2 px-2 sm:px-0 md:-mt-4">
          {p.groepen.map((g) => (
            <a key={g.id} href={`#tarieven-${g.id}`} className="inline-flex h-10 items-center gap-2 rounded-full border bg-white px-4 text-[14px] font-bold transition-colors hover:border-[#322E83]" style={{ color: NAVY, borderColor: LINE }}>
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: g.slug ? g.kleur : NAVY }} />{g.naam}
            </a>
          ))}
        </nav>

        {p.aansluitingen.length > 0 && (
          <div className={`grid gap-4 md:grid-cols-2 md:gap-5 ${drie ? "xl:grid-cols-12" : ""}`}>
            {p.aansluitingen.map((a, i) => (
              <AansluitingKaart key={i} a={a} plek={drie ? (a.uitgelicht ? "md:col-span-2 xl:col-span-7 xl:row-span-2" : "xl:col-span-5") : ""} />
            ))}
          </div>
        )}

        <div className="flex flex-col gap-4 md:gap-5">
          {prijsRijen(p.groepen).map((rij) => (
            rij.length > 1 ? (
              <div key={rij[0].id} className="grid gap-4 md:gap-5 lg:grid-cols-2">
                {rij.map((g) => <GroepKaart key={g.id} g={g} half />)}
              </div>
            ) : <GroepKaart key={rij[0].id} g={rij[0]} />
          ))}
          {p.maatwerk && (
            <div className="grid gap-3 rounded-[24px] px-5 py-6 md:grid-cols-12 md:items-center md:gap-8 md:px-8 md:py-7" style={{ background: LAV }}>
              <span className="flex flex-col gap-1 md:col-span-4">
                <span className="text-[12.5px] font-bold uppercase tracking-[1.4px]" style={{ color: MUTE }}>Op aanvraag</span>
                <span className={`${kop} text-[22px] leading-[1.2]`} style={{ color: NAVY }}>{p.maatwerk.titel}</span>
              </span>
              <span className="text-[15px] leading-[1.65] md:col-span-8" style={{ color: BODY }}>{p.maatwerk.tekst}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5 border-t pt-6 md:flex-row md:items-center md:justify-between md:gap-8" style={{ borderColor: "rgba(50,46,131,0.12)" }}>
          <div className="flex flex-col gap-2 px-2 sm:px-0">
            <p className="m-0 text-[16px] leading-[1.5]" style={{ color: NAVY }}><strong>{OFFERTE_SNEL.kop}</strong> {OFFERTE_SNEL.tekst}</p>
            <p className="m-0 max-w-[720px] text-[14px] leading-[1.6]" style={{ color: MUTE }}>{p.geldigheid} Prijswijzigingen voorbehouden.</p>
          </div>
          <a href={offerte} className={`${knop.roze} self-start md:self-auto`}>Vraag een voorstel op maat <Pijl size={14} /></a>
        </div>
      </div>
    </section>
  );
}

export default function BrochurePagina({ brochure: b, diensten, prijslijst, huis, modus, pdfHref }: {
  brochure: BrochurePubliek;
  diensten: Dienst[];
  prijslijst: Prijslijst;
  huis: Huis;
  modus: "klant" | "collega";
  pdfHref: string;
}) {
  const c = huis.contact;
  const tel = telLink(b.afzender_telefoon);
  const mail = b.afzender_email || BROCHURE_EMAIL;
  const naam = voornaam(b.afzender_naam);
  const bericht = vulIn(b.bericht || BERICHT_STANDAARD, { bedrijf: b.bedrijf, contactpersoon: b.contactpersoon })
    .split(/\n\s*\n/)
    .map((a) => a.trim())
    .filter(Boolean);
  const kennismaken = `mailto:${mail}?subject=${encodeURIComponent(`Kennismaken: ${b.bedrijf}`)}`;
  const offerte = `mailto:${mail}?subject=${encodeURIComponent(`Offerte voor ${b.bedrijf}`)}`;
  // Het voorwoord van de offerte zonder de zinnen over "dit voorstel": dat komt pas met de offerte.
  const verhaal = VOORWOORD.alineas.slice(1, -1).map((a) => vulIn(a, { bedrijf: b.bedrijf }));
  const tarievenVan = new Set(prijslijst.groepen.map((g) => g.slug).filter(Boolean));
  const k = kostenvoorbeeld(prijslijst);
  const algemeen = telLink(c.phone) || `tel:${c.phone}`;

  return (
    <div className={`hv ${outfit.variable} ${caveat.variable} min-h-screen bg-white`}>
      {modus === "collega" && (
        <div className="bg-[#FFF4E5] text-[14px] text-[#7A4A06]">
          <p className={`${BREED} m-0 py-2.5`}>Je bekijkt deze brochure als collega. Dit bezoek telt niet mee.</p>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur-md" style={{ borderColor: LINE }}>
        <div className={`${BREED} flex h-[72px] items-center justify-between gap-4 md:h-[88px]`}>
          <div className="flex min-w-0 items-center gap-4">
            <Logo className="h-9 w-auto shrink-0 md:h-11" />
            <span className="hidden h-8 w-px sm:block" style={{ background: LINE }} aria-hidden="true" />
            <span className="hidden truncate text-[15px] font-bold sm:block" style={{ color: NAVY }}>Brochure voor {b.bedrijf}</span>
          </div>
          <div className="flex shrink-0 items-center gap-5">
            <a href="#inhoud" className="hidden text-[15px] font-bold hover:underline lg:inline" style={{ color: NAVY }}>Inhoud</a>
            <a href="#tarieven" className="hidden text-[15px] font-bold hover:underline lg:inline" style={{ color: NAVY }}>Tarieven {prijslijst.jaar}</a>
            {tel && (
              <a href={tel} className="inline-flex items-center gap-2 text-[15px] font-bold" style={{ color: NAVY }}>
                <Telefoon size={15} /> <span className="hidden md:inline">Bel {naam || "ons"}</span><span className="md:hidden">Bellen</span>
              </a>
            )}
            <a href={kennismaken} className={`${knop.roze} !h-11 hidden px-5 text-[14.5px] sm:inline-flex`}>Kennismaken <Pijl size={14} /></a>
          </div>
        </div>
      </header>

      {/* De opening: de belofte van de brochure en het woord van de afzender. */}
      <section className="px-[6px] pt-2 md:px-6 md:pt-6 xl:px-10">
        <div className="relative mx-auto grid max-w-[1360px] gap-10 overflow-hidden rounded-[28px] px-6 pb-8 pt-10 md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:gap-14 lg:p-16 xl:p-[72px]" style={{ background: LAV }}>
          <span aria-hidden className="absolute right-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full md:h-[560px] md:w-[560px]" style={{ background: NAVY, opacity: 0.1 }} />
          <span aria-hidden className="absolute bottom-[-120px] left-[38%] hidden h-[220px] w-[220px] rounded-full lg:block" style={{ background: PINK, opacity: 0.08 }} />
          <div className="relative flex flex-col gap-6">
            <p className="m-0 flex flex-col gap-0.5 text-[14px] font-semibold sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5" style={{ color: MUTE }}>
              <span>Brochure {b.nummer}</span><span aria-hidden className="hidden sm:inline">/</span><span style={{ color: NAVY }}>voor {b.bedrijf}</span>
            </p>
            <div className="flex flex-col gap-4">
              {/* Op 1024 px staat de kop naast het contactblok in een smalle kolom: daar kleiner. */}
              <h1 className={`${kop} m-0 text-[40px] leading-[1.04] tracking-[-1.2px] md:text-[58px] md:tracking-[-1.8px] lg:text-[44px] lg:tracking-[-1.2px] xl:text-[58px] xl:tracking-[-1.8px]`} style={{ color: NAVY }}>
                {OPENING.kop}<br />
                {/* "re-integratie" niet afbreken op het streepje. */}
                <span style={{ color: PINK }}>{OPENING.accent.split(" ").slice(0, -1).join(" ")} <span className="whitespace-nowrap">{OPENING.accent.split(" ").at(-1)}</span></span>
              </h1>
              <p className="m-0 max-w-[600px] text-[17px] leading-[1.6] md:text-[19px]" style={{ color: NAVY }}>{OPENING.onder}</p>
            </div>
            <div className="flex max-w-[600px] flex-col gap-3 border-t pt-6" style={{ borderColor: "rgba(50,46,131,0.12)" }}>
              <p className={`${kop} m-0 text-[22px] leading-[1.25] tracking-[-0.4px] md:text-[26px]`} style={{ color: NAVY }}>
                Beste {voornaam(b.contactpersoon) || "relatie"},
              </p>
              <div className="flex flex-col gap-3 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: BODY }}>
                {bericht.map((a, i) => <p key={i} className="m-0">{a}</p>)}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="#inhoud" className={knop.roze}>Lees de brochure <Omlaag /></a>
              <a href={pdfHref} className={knop.rand} style={{ background: "transparent" }}>Download als pdf <Pijl size={14} /></a>
            </div>
          </div>
          <aside className="relative flex flex-col gap-5 rounded-[24px] bg-white p-6 shadow-[0_24px_48px_-36px_rgba(50,46,131,0.45)] md:p-8">
            <p className="m-0 text-[12.5px] font-bold uppercase tracking-[1.2px]" style={{ color: MUTE }}>Je contactpersoon</p>
            <div className="flex items-center gap-4">
              <span className={`${kop} grid h-14 w-14 shrink-0 place-items-center rounded-full text-[18px]`} style={{ background: LAV, color: NAVY }}>{initialen(b.afzender_naam)}</span>
              <span className="flex flex-col">
                <span className="text-[18px] font-bold" style={{ color: NAVY }}>{b.afzender_naam || "Team React2u"}</span>
                <span className="text-[14.5px]" style={{ color: MUTE }}>{b.afzender_functie ? `${b.afzender_functie}, React2u` : "React2u"}</span>
              </span>
            </div>
            <div className="flex flex-col gap-2 border-t pt-5 text-[15.5px]" style={{ borderColor: LINE }}>
              {tel && <a href={tel} className="font-bold hover:underline" style={{ color: NAVY }}>{b.afzender_telefoon}</a>}
              <a href={`mailto:${mail}`} className="font-bold hover:underline" style={{ color: NAVY }}>{mail}</a>
            </div>
            <p className="m-0 text-[13.5px]" style={{ color: MUTE }}>Opgesteld op {datumLang(b.verstuurd_at || b.created_at)} voor {b.bedrijf}.</p>
          </aside>
        </div>
      </section>

      {/* De inhoud: acht hoofdstukken, één lijn. */}
      <section id="inhoud" aria-label="In deze brochure" className="scroll-mt-[96px] bg-white">
        <div className={`${BREED} flex flex-col gap-6 pb-4 pt-14 md:pt-20`}>
          <div className="flex flex-col gap-2 border-t-2 pt-4 md:flex-row md:items-baseline md:justify-between md:gap-8" style={{ borderColor: NAVY }}>
            <h2 className={`${kop} m-0 text-[24px] tracking-[-0.4px]`} style={{ color: NAVY }}>In deze brochure</h2>
            <p className="m-0 text-[15px]" style={{ color: MUTE }}>Van de eerste ziektedag tot je overstap, in acht hoofdstukken.</p>
          </div>
          <ol className="m-0 grid list-none gap-x-8 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {HOOFDSTUKKEN.map((h) => (
              <li key={h.nr}>
                <a href={`#${h.id}`} className="group flex h-full gap-4 border-b py-4" style={{ borderColor: LINE }}>
                  <span className={`${kop} w-9 shrink-0 text-[26px] leading-none tabular-nums`} style={{ color: PINK }}>{h.nr}</span>
                  <span className="flex flex-col gap-1">
                    <span className="text-[16px] font-bold group-hover:underline" style={{ color: NAVY }}>{h.kort}</span>
                    <span className="text-[14px] leading-[1.5]" style={{ color: BODY }}>{h.vraag}</span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 01 Hoe het gaat: de klok die op maandagochtend gaat lopen. */}
      <Hoofdstuk id="hoe-het-gaat">
        <HoofdstukKop id="hoe-het-gaat" titel={TIJDLIJN.titel} lead={TIJDLIJN.lead} />
        <ol className="m-0 flex list-none flex-col border-t p-0" style={{ borderColor: LINE }}>
          {TIJDLIJN.momenten.map((m) => (
            <li key={m.wanneer} className="grid gap-1.5 border-b py-4 md:grid-cols-[120px_minmax(0,1fr)_minmax(0,340px)] md:items-center md:gap-8 md:py-5" style={{ borderColor: LINE }}>
              <span className={`${kop} text-[18px] md:text-[20px]`} style={{ color: PINK }}>{m.wanneer}</span>
              <span className="text-[16px] leading-[1.55]" style={{ color: NAVY }}>{m.wat}</span>
              <span className="text-[15px] italic leading-[1.5] md:border-l md:pl-6" style={{ color: MUTE, borderColor: LINE }}>{m.vraag}</span>
            </li>
          ))}
        </ol>
        <p className={`${kop} m-0 max-w-[860px] text-[24px] leading-[1.3] tracking-[-0.4px] md:text-[30px]`} style={{ color: NAVY }}>
          {TIJDLIJN.slot} <span style={{ color: PINK }}>{TIJDLIJN.slotAccent}</span>
        </p>
      </Hoofdstuk>

      {/* 02 Voorwoord: het verhaal van Cindy en Susanne, zoals in de offerte. */}
      <Hoofdstuk id="voorwoord" bg={SOFT}>
        <HoofdstukKop id="voorwoord" titel={VOORWOORD_BROCHURE.kop} accent={VOORWOORD_BROCHURE.accent} />
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col gap-4 lg:sticky lg:top-[120px] lg:col-span-5 lg:self-start">
            <h3 className={`${kop} m-0 text-[24px] leading-[1.2] tracking-[-0.4px] md:text-[28px]`} style={{ color: NAVY }}>{VOORWOORD.kop}</h3>
            <blockquote className="m-0 flex flex-col gap-3">
              <span aria-hidden className={`${kop} text-[64px] leading-[0.6]`} style={{ color: PINK }}>“</span>
              <p className={`${kop} m-0 text-[20px] leading-[1.45] md:text-[22px]`} style={{ color: NAVY, fontWeight: 500 }}>{VOORWOORD.citaat}</p>
            </blockquote>
          </div>
          <div className="flex flex-col gap-5 text-[16px] leading-[1.75] md:text-[17px] lg:col-span-6 lg:col-start-7" style={{ color: BODY }}>
            {verhaal.map((a, i) => <p key={i} className="m-0">{a}</p>)}
            <p className="m-0 font-semibold" style={{ color: NAVY }}>{VOORWOORD_BROCHURE.slot}</p>
            <p className="m-0">{VOORWOORD.groet}</p>
            <div className="grid gap-6 sm:grid-cols-2">
              {VOORWOORD.ondertekenaars.map((o) => (
                <div key={o.naam} className="flex flex-col gap-1 border-t pt-4" style={{ borderColor: LINE }}>
                  <span className="text-[26px] leading-none" style={{ color: NAVY, fontFamily: "var(--font-caveat), 'Caveat', cursive" }}>{o.naam}</span>
                  <span className="text-[14px]" style={{ color: MUTE }}>{ondertekenaarRegel(o)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Hoofdstuk>

      {/* 03 Onze werkwijze: drie afspraken. */}
      <Hoofdstuk id="werkwijze">
        <HoofdstukKop id="werkwijze" titel={WERKWIJZE.titel} />
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-8">
          <p className={`${kop} m-0 text-[26px] leading-[1.25] tracking-[-0.5px] md:text-[32px] lg:col-span-5`} style={{ color: PINK }}>“{WERKWIJZE.citaat}”</p>
          <p className="m-0 text-[16px] leading-[1.7] md:text-[17px] lg:col-span-6 lg:col-start-7" style={{ color: BODY }}>{WERKWIJZE.lead}</p>
        </div>
        <ol className="m-0 flex list-none flex-col border-t p-0" style={{ borderColor: LINE }}>
          {WERKWIJZE.punten.map((p, i) => (
            <li key={p.titel} className="grid gap-3 border-b py-7 md:grid-cols-[80px_minmax(0,1fr)_240px] md:gap-8 md:py-8" style={{ borderColor: LINE }}>
              <span className={`${kop} text-[40px] leading-none tabular-nums md:text-[48px]`} style={{ color: "#D9D6EF" }}>{String(i + 1).padStart(2, "0")}</span>
              <span className="flex flex-col gap-2">
                <span className={`${kop} text-[21px] leading-[1.25]`} style={{ color: NAVY }}>{p.titel}</span>
                <span className="text-[16px] leading-[1.7]" style={{ color: BODY }}>{p.tekst}</span>
              </span>
              <span className="flex flex-col gap-1 md:border-l md:pl-6" style={{ borderColor: LINE }}>
                <span className="text-[12.5px] font-bold uppercase tracking-[1.4px]" style={{ color: PINK }}>{p.label}</span>
                <span className={`${kop} text-[18px] leading-[1.3]`} style={{ color: NAVY }}>{p.kern}</span>
              </span>
            </li>
          ))}
        </ol>
      </Hoofdstuk>

      {/* 04 Wat het kost: de rekensom, in indigo. */}
      <section id="kosten" aria-label="Wat het kost" className="scroll-mt-[96px] px-[6px] md:px-6 xl:px-10">
        <div className="relative mx-auto flex max-w-[1360px] flex-col gap-10 overflow-hidden rounded-[28px] px-6 py-12 md:rounded-[36px] md:p-14 lg:p-16 xl:p-[72px]" style={{ background: NAVY }}>
          <span aria-hidden className="absolute right-[-140px] top-[-160px] h-[460px] w-[460px] rounded-full" style={{ background: "#3B378F" }} />
          <div className="relative flex flex-col gap-10">
            <HoofdstukKop id="kosten" titel={KOSTEN.titel} licht />
            <div className="flex flex-col gap-3">
              <span className={`${kop} leading-[0.9] tracking-[-3px]`} style={{ color: "#C9C2FF", fontSize: "clamp(72px, 13vw, 168px)" }}>{k.totaal}</span>
              <span className="text-[15px] font-bold" style={{ color: ROZE_LICHT }}>{KOSTEN.onder}</span>
            </div>
            <p className="m-0 max-w-[780px] text-[16px] leading-[1.7] md:text-[17px]" style={{ color: "rgba(255,255,255,0.8)" }}>{KOSTEN.tekst}</p>
            <div className="grid gap-8 border-t pt-8 md:grid-cols-3 md:gap-0" style={{ borderColor: "rgba(255,255,255,0.2)" }}>
              {[
                { bedrag: k.loon, kop: "Twee jaar loondoorbetaling", tekst: KOSTEN.loon },
                { bedrag: k.sanctie, kop: "Loonsanctie van het UWV", tekst: KOSTEN.sanctie },
                { bedrag: "+", kop: "Re-integratie en vervanging", tekst: KOSTEN.bovenop(k.spoor2) },
              ].map((s, i) => (
                <div key={s.kop} className={`flex flex-col gap-2 ${i ? "md:border-l md:pl-8" : ""} md:pr-8`} style={{ borderColor: "rgba(255,255,255,0.2)" }}>
                  <span className={`${kop} text-[36px] leading-none tracking-[-1px] text-white md:text-[40px]`}>{s.bedrag}</span>
                  <span className="text-[15px] font-bold text-white">{s.kop}</span>
                  <span className="text-[14.5px] leading-[1.6]" style={{ color: "rgba(255,255,255,0.72)" }}>{s.tekst}</span>
                </div>
              ))}
            </div>
            <p className={`${kop} m-0 max-w-[860px] text-[24px] leading-[1.3] tracking-[-0.4px] text-white md:text-[30px]`}>
              {KOSTEN.slot} <span style={{ color: ROZE_LICHT }}>{KOSTEN.slotAccent}</span>
            </p>
            {k.compleet && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2 rounded-[22px] border p-7" style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.18)" }}>
                  <span className={`${kop} text-[36px] leading-none tracking-[-1px] text-white`}>{k.sanctie}</span>
                  <span className="text-[15px] font-bold text-white">Het deel dat je kunt voorkomen</span>
                  <span className="text-[14.5px] leading-[1.6]" style={{ color: "rgba(255,255,255,0.72)" }}>De loondoorbetaling blijft. De sanctie krijg je alleen als het dossier niet op orde is.</span>
                </div>
                <div className="flex flex-col gap-2 rounded-[22px] bg-white p-7">
                  <span className={`${kop} text-[36px] leading-none tracking-[-1px]`} style={{ color: NAVY }}>{k.compleet.bedrag}</span>
                  <span className="text-[15px] font-bold" style={{ color: NAVY }}>Een jaar Casemanagement Compleet voor {k.compleet.werknemers} werknemers</span>
                  <span className="text-[14.5px] leading-[1.6]" style={{ color: BODY }}>Eén voorkomen sanctie betaalt {k.compleet.jaren} jaar dienstverlening.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 05 Onze diensten: de zes labels in hun eigen kleur. */}
      <Hoofdstuk id="diensten">
        <HoofdstukKop id="diensten" titel={DIENSTEN_INTRO.titel} lead={DIENSTEN_INTRO.lead} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {diensten.map((d) => {
            const t = DIENSTEN_BROCHURE[d.slug];
            return (
              <article key={d.slug} className="relative flex flex-col gap-4 overflow-hidden rounded-[26px] px-6 pb-7 pt-7" style={{ background: d.tint }}>
                <span aria-hidden className="absolute right-[-40px] top-[-40px] h-[120px] w-[120px] rounded-full" style={{ background: d.kleur, opacity: 0.16 }} />
                <span className={`${kop} relative flex flex-col text-[19px] leading-[1.1]`} style={{ color: NAVY }}>
                  React2u<span className="text-[30px] tracking-[-0.6px]" style={{ color: d.kleur.toLowerCase() === NAVY.toLowerCase() ? NAVY : d.kleur }}>{d.naam}<sup className="text-[13px]" style={{ color: NAVY }}>®</sup></span>
                </span>
                <span className="text-[15px] leading-[1.45]" style={{ color: NAVY }}><strong>{t.dienst}</strong></span>
                <span className="text-[15px] leading-[1.6]" style={{ color: BODY }}>{t.tekst}</span>
                <ul className="m-0 flex list-none flex-col gap-2 border-t p-0 pt-4" style={{ borderColor: "rgba(50,46,131,0.12)" }}>
                  {t.punten.map((p) => (
                    <li key={p} className="flex min-w-0 gap-2.5 text-[14.5px] leading-[1.45] [overflow-wrap:anywhere]" style={{ color: NAVY }}>
                      <span className="mt-0.5 shrink-0" style={{ color: d.kleur }}><Vink size={14} /></span>{p}
                    </li>
                  ))}
                </ul>
                <span className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
                  <Link href={d.href} target="_blank" rel="noopener" className="hv-btn hv-btn-rand inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-bold" style={{ background: "transparent" }}>
                    Lees meer op de site<Pijl size={14} />
                  </Link>
                  {tarievenVan.has(d.slug) && (
                    <a href={`#tarieven-${d.slug}`} className="inline-flex h-11 items-center gap-1.5 text-[14.5px] font-bold underline-offset-4 hover:underline" style={{ color: NAVY }}>
                      Tarieven <Omlaag />
                    </a>
                  )}
                </span>
              </article>
            );
          })}
        </div>
        <div className="grid gap-5 rounded-[24px] px-6 py-7 md:grid-cols-12 md:items-center md:gap-8 md:px-10" style={{ background: NAVY }}>
          <p className={`${kop} m-0 text-[22px] leading-[1.25] text-white md:col-span-4`}>{DIENSTEN_INTRO.twijfel}</p>
          <p className="m-0 text-[15px] leading-[1.6] md:col-span-5" style={{ color: "rgba(255,255,255,0.8)" }}>{DIENSTEN_INTRO.twijfelTekst}</p>
          <a href={algemeen} className={`${kop} text-[22px] tracking-[-0.3px] md:col-span-3 md:text-right`} style={{ color: ROZE_LICHT }}>{c.phoneDisplay.replace(/\s*-\s*/, " ")}</a>
        </div>
      </Hoofdstuk>

      {/* 06 Jouw rol: wat je mag vragen, en wat je per termijn doet. */}
      <Hoofdstuk id="jouw-rol" bg={SOFT}>
        <HoofdstukKop id="jouw-rol" titel="Wat mag je vragen," accent="en wat moet je doen?" />
        <Tussenkop titel={VRAGEN.titel} lead={VRAGEN.lead} />
        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          {[
            { ...VRAGEN.mag, kleur: "#08716B", tint: "#E5F5F4", rand: "#BFE6E3", Icoon: Vink },
            { ...VRAGEN.magNiet, kleur: "#C2105E", tint: "#FDECF4", rand: "#F7C6DC", Icoon: Kruis },
          ].map((kolom) => (
            <div key={kolom.kop} className="flex flex-col gap-4 rounded-[24px] border p-6 md:p-8" style={{ background: kolom.tint, borderColor: kolom.rand }}>
              <span className="flex flex-col gap-1">
                <span className={`${kop} text-[21px] leading-[1.25]`} style={{ color: kolom.kleur }}>{kolom.kop}</span>
                <span className="text-[14px] leading-[1.5]" style={{ color: MUTE }}>{kolom.onder}</span>
              </span>
              <ul className="m-0 flex list-none flex-col p-0">
                {kolom.items.map((v) => (
                  <li key={v} className="flex gap-3 border-t py-3 text-[15.5px] leading-[1.5]" style={{ borderColor: kolom.rand, color: NAVY }}>
                    <span className="mt-1 shrink-0" style={{ color: kolom.kleur }}><kolom.Icoon size={13} /></span>{v}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="grid gap-4 rounded-[24px] px-6 py-7 md:grid-cols-12 md:items-center md:gap-8 md:px-10" style={{ background: NAVY }}>
          <p className={`${kop} m-0 text-[22px] leading-[1.25] text-white md:col-span-4`}>{VRAGEN.bedrijfsarts}</p>
          <p className="m-0 text-[15px] leading-[1.65] md:col-span-8" style={{ color: "rgba(255,255,255,0.82)" }}>{VRAGEN.bedrijfsartsTekst}</p>
        </div>

        <div className="mt-4 flex flex-col gap-8">
          <Tussenkop titel={TERMIJNEN.titel} lead={TERMIJNEN.lead} />
          <div className="overflow-hidden rounded-[24px] bg-white">
            <div className="hidden grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)] gap-8 px-8 py-4 text-[12.5px] font-bold uppercase tracking-[1.4px] text-white md:grid" style={{ background: NAVY }}>
              <span>Moment</span><span>Jij als werkgever</span><span>React2u</span>
            </div>
            <ol className="m-0 list-none p-0">
              {TERMIJNEN.rijen.map((r) => (
                <li key={r.stap} className="grid gap-3 border-t px-6 py-5 first:border-t-0 md:grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)] md:gap-8 md:px-8 md:py-6" style={{ borderColor: LINE }}>
                  <span className="flex flex-col items-start gap-1.5">
                    <span className="rounded-full px-2.5 py-0.5 text-[12.5px] font-bold" style={{ background: "#FDECF4", color: "#C2105E" }}>{r.moment}</span>
                    <span className={`${kop} text-[18px]`} style={{ color: NAVY }}>{r.stap}</span>
                  </span>
                  <span className="text-[15px] leading-[1.6]" style={{ color: BODY }}>
                    <span className="mb-1 block text-[12px] font-bold uppercase tracking-[1.2px] md:hidden" style={{ color: MUTE }}>Jij als werkgever</span>
                    {r.jij}
                  </span>
                  <span className="flex gap-2.5 text-[15px] leading-[1.6]" style={{ color: NAVY }}>
                    <span className="mt-1 shrink-0" style={{ color: "#08716B" }}><Vink size={13} /></span>
                    <span><span className="mb-1 block text-[12px] font-bold uppercase tracking-[1.2px] md:hidden" style={{ color: MUTE }}>React2u</span>{r.wij}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Hoofdstuk>

      {/* Tussen 06 en 07: wat werkgevers over ons zeggen. */}
      <KlantenAanHetWoord bg="#ffffff" heading={KLANTEN_KOP} />
      <KlantenStrook />

      {/* 07 Tarieven: de prijslijst van dit jaar. */}
      <Tarieven p={prijslijst} bedrijf={b.bedrijf} offerte={offerte} />

      {/* 08 Overstappen, en de groep waar React2u bij hoort. */}
      <Hoofdstuk id="overstappen">
        <HoofdstukKop id="overstappen" titel={OVERSTAP.titel} lead={OVERSTAP.lead} />
        <ol className="m-0 grid list-none gap-8 p-0 md:grid-cols-3 md:gap-6">
          {OVERSTAP.stappen.map((s, i) => (
            <li key={s.kop} className="flex flex-col gap-3 border-t-2 pt-5" style={{ borderColor: PINK }}>
              <span className={`${kop} text-[44px] leading-none tabular-nums`} style={{ color: "#D9D6EF" }}>{String(i + 1).padStart(2, "0")}</span>
              <span className={`${kop} text-[20px]`} style={{ color: NAVY }}>{s.kop}</span>
              <span className="text-[15.5px] leading-[1.65]" style={{ color: BODY }}>{s.tekst}</span>
            </li>
          ))}
        </ol>
        <div className="flex max-w-[820px] flex-col gap-3 border-l-4 py-1 pl-6" style={{ borderColor: PINK }}>
          <p className={`${kop} m-0 text-[22px] leading-[1.25]`} style={{ color: NAVY }}>{OVERSTAP.geenDatum}</p>
          <p className="m-0 text-[15.5px] leading-[1.65]" style={{ color: BODY }}>{OVERSTAP.geenDatumTekst}</p>
          <p className="m-0 rounded-[14px] px-4 py-3 text-[14.5px] leading-[1.55]" style={{ background: "#FFF4E5", color: "#7A4A06" }}>{OVERSTAP.or}</p>
        </div>

        <div className="mt-4 flex flex-col gap-8">
          <Tussenkop titel={ZUSTERLABELS.titel} lead={ZUSTERLABELS.lead} />
          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {ZUSTERLABELS.labels.map((l) => {
              const hier = !l.url;
              return (
                <li key={l.naam} className="relative flex flex-col gap-2 rounded-[22px] border p-6" style={{ background: hier ? "#FDECF4" : "#ffffff", borderColor: hier ? "#F7C6DC" : LINE }}>
                  {hier && <span className="absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold uppercase tracking-[1px] text-white" style={{ background: PINK }}>Dit ben je nu</span>}
                  <span className={`${kop} text-[22px] leading-[1.2]`} style={{ color: NAVY }}>{l.naam}</span>
                  <span className="text-[12px] font-bold uppercase tracking-[1.3px]" style={{ color: l.kleur }}>{l.soort}</span>
                  <span className="text-[14.5px] leading-[1.6]" style={{ color: BODY }}>{l.tekst}</span>
                  {l.url ? (
                    <a href={`https://${l.url}`} target="_blank" rel="noopener" className="mt-auto inline-flex items-center gap-2 pt-2 text-[14.5px] font-bold hover:underline" style={{ color: NAVY }}>{l.url} <Pijl size={13} /></a>
                  ) : (
                    <span className="mt-auto pt-2 text-[14.5px] font-bold" style={{ color: PINK }}>Deze brochure</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </Hoofdstuk>

      {/* De uitnodiging, in de indigo band van de site. */}
      <section aria-label="Kennismaken" className="px-[6px] pb-2 md:px-6 md:pb-6 xl:px-10">
        <div className="relative mx-auto grid max-w-[1360px] gap-8 overflow-hidden rounded-[28px] px-6 py-10 md:rounded-[36px] md:p-14 lg:grid-cols-12 lg:items-center lg:p-16" style={{ background: NAVY }}>
          <span aria-hidden className="absolute right-[-120px] top-[-140px] h-[420px] w-[420px] rounded-full" style={{ background: "#3B378F" }} />
          <div className="relative flex flex-col gap-4 lg:col-span-7">
            <span className="text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: "#B4ADF2" }}>Kennismaken</span>
            {/* Kleur inline: de algemene kopstijl van de site wint anders van de Tailwind-klasse. */}
            <h2 className={`${kop} m-0 leading-[1.05] tracking-[-1.2px]`} style={{ color: "#ffffff", fontSize: "clamp(34px, 4.4vw, 52px)" }}>
              Benieuwd wat het voor {b.bedrijf} betekent?<br />Bel gewoon even.
            </h2>
            <p className="m-0 max-w-[560px] text-[16px] leading-[1.65] md:text-[17px]" style={{ color: "#D6D2F7" }}>
              We horen graag hoe jullie organisatie in elkaar zit. Daarna krijg je een voorstel op maat, dat je online bekijkt en ondertekent.
            </p>
          </div>
          <div className="relative flex flex-col gap-3 lg:col-span-4 lg:col-start-9">
            {tel && <a href={tel} className={knop.wit}><Telefoon size={15} /> Bel {b.afzender_naam || "ons"}</a>}
            <a href={kennismaken} className={knop.roze}>Plan een kennismaking <Pijl size={14} /></a>
            <a href={offerte} className="inline-flex items-center justify-center gap-2 text-[15px] font-bold text-white hover:underline">Of vraag direct een offerte aan <Pijl size={14} /></a>
          </div>
        </div>
      </section>

      <Keurmerken />

      <footer className="pb-12 pt-10 md:pt-14" style={{ background: IVOOR }}>
        <div className={`${BREED} flex flex-col gap-8`}>
          <div className="grid gap-8 rounded-[22px] bg-white px-6 py-9 sm:grid-cols-2 md:px-10 lg:grid-cols-[1.1fr_1fr_1fr_1fr] lg:gap-10">
            <div className="flex flex-col gap-3">
              <Logo className="h-12 w-auto self-start" />
              <p className="m-0 text-[15px]" style={{ color: BODY }}>Jouw mensen, <span className="font-bold" style={{ color: NAVY }}>onze aandacht.</span></p>
            </div>
            <div className="flex flex-col gap-3">
              <p className="m-0 text-[15px] font-bold" style={{ color: NAVY }}>Bezoekadres</p>
              <p className="m-0 text-[15px] leading-[1.75]" style={{ color: BODY }}>React2u<br />{c.addressLine1}<br />{c.addressLine2}</p>
            </div>
            <div className="flex flex-col gap-3">
              <p className="m-0 text-[15px] font-bold" style={{ color: NAVY }}>Contact</p>
              <p className="m-0 text-[15px] leading-[1.75]" style={{ color: BODY }}>
                <a href={`tel:${c.phone}`} className="font-bold hover:underline" style={{ color: NAVY }}>{c.phoneDisplay.replace(/\s*-\s*/, " ")}</a><br />
                Ma t/m vr 9.00 tot 17.00 uur<br />
                <a href={`mailto:${mail}`} className="font-bold hover:underline" style={{ color: NAVY }}>{mail}</a>
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <p className="m-0 text-[15px] font-bold" style={{ color: NAVY }}>Deze brochure</p>
              <p className="m-0 text-[15px] leading-[1.75]" style={{ color: BODY }}>
                Brochure {b.nummer}<br />
                <a href={`${pdfHref}?download=1`} className="font-bold hover:underline" style={{ color: NAVY }}>Download als pdf</a><br />
                <Link href="/" className="font-bold hover:underline" style={{ color: NAVY }}>react2u.nl</Link>
              </p>
            </div>
          </div>
          <p className="m-0 text-[13.5px]" style={{ color: MUTE }}>© {new Date().getFullYear()} React2u. KvK {c.kvk}, btw {c.btw}.</p>
        </div>
      </footer>
    </div>
  );
}
