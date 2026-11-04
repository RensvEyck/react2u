import Link from "next/link";
import { Caveat, Outfit } from "next/font/google";
import { LuHeartPulse, LuPhone, LuShieldCheck } from "react-icons/lu";
import Logo from "@/components/site/Logo";
import { BODY, BREED, Keurmerken, KlantenAanHetWoord, KlantenStrook, kop, LINE, MUTE, NAVY, PINK, Pijl, Vink } from "@/components/blocks/Gedeeld";
import { VoortgangBalk } from "@/components/brochure/HoofdstukLijn";
import { Constellatie, Kopregels, Reis, RondeFoto, Stiplabel, Tijdreis } from "@/components/brochure/Stippen";
import type { ContactInfo } from "@/lib/content";
import type { Certificate } from "@/lib/nav";
import { BERICHT_STANDAARD, BROCHURE_EMAIL, type BrochurePubliek } from "@/lib/brochures";
import type { Dienst } from "@/lib/brochureHuisstijl";
import { halveKolom, prijsRijen, type Aansluiting, type PrijsGroep, type Prijslijst } from "@/lib/brochurePrijslijst";
import {
  BEELDEN, DIENSTEN_BROCHURE, DIENSTEN_INTRO, HOOFDSTUKKEN, KLANTEN_KOP, KOSTEN, kostenvoorbeeld, OFFERTE_SNEL, OPENING, OVERSTAP,
  TERMIJNEN, TIJDLIJN, VOORWOORD_BROCHURE, VRAGEN, WERKWIJZE, ZUSTERLABELS,
} from "@/lib/brochureVerhaal";
import { hoofdstukKleur, KLEUR, REIS, ZACHT } from "@/lib/stippenSpoor";
import { datumLang, vulIn } from "@/lib/offertes";
import { ondertekenaarRegel, VOORWOORD } from "@/lib/offerteVoorwoord";

/*
 * De brochurepagina (/brochure/<token>, migratie 0030) voor één prospect.
 *
 * In de beeldtaal van de homepage ("Home S-tier", HomeVerhaal.tsx), zoals ook
 * de offerte die kreeg (Rens, 3-4 nov 2026: "visueel niet een samenhangend
 * verhaal", "ziet er standaard uit", "het verhaal komt niet over"): koppen in
 * de kleuren van het logo, de constellatie van ronde foto's, en de
 * stippenreis als lijn door het hele verhaal (Stippen.tsx):
 * - de inhoud is een reis langs acht stations, de hoofdstukken;
 * - 01 is de reis zonder regie: grijze, lege stations en een onderbroken
 *   spoor, tot het alarm in week 104;
 * - 06 is dezelfde reis met React2u: in kleur, per station wat jij en wij doen;
 * - werkwijze (03) en overstap (08) zijn stations zoals op de homepage.
 * Elk hoofdstuk krijgt de reiskleur van zijn station (hoofdstukKleur).
 * Geen keuzes en geen ondertekening: dat komt in de offerte.
 */

// Dezelfde variabele als de site (.hv .hv-kop leest --font-outfit).
const outfit = Outfit({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-outfit", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], weight: ["500"], variable: "--font-caveat", display: "swap" });

const GRIJS = "#F6F5FB";
const IVOOR = "#F8F5F1";
const TEKST = "#5E5C78";
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

function Omlaag({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

/** Een klein bovenkopje binnen een blok. */
function Label({ children, kleur = PINK }: { children: React.ReactNode; kleur?: string }) {
  return <span className="text-[12.5px] font-bold uppercase tracking-[1.4px]" style={{ color: kleur }}>{children}</span>;
}

/** Een hoofdstuk over de volle breedte, wit of grijs om en om. */
function Hoofdstuk({ id, grijs = false, children }: { id: string; grijs?: boolean; children: React.ReactNode }) {
  const h = HOOFDSTUKKEN.find((x) => x.id === id)!;
  return (
    <section id={h.id} aria-label={h.kort} className="scroll-mt-[88px]" style={{ background: grijs ? GRIJS : "#ffffff" }}>
      <div className={`${BREED} flex flex-col gap-12 py-16 md:gap-14 md:py-[112px]`}>{children}</div>
    </section>
  );
}

/**
 * De kop van een hoofdstuk: het label met de stip in de kleur van zijn station
 * ("03 · Onze werkwijze"), de kop in regels (de eerste indigo, de tweede in de
 * kleur van het station) en de inleiding.
 */
function Kop({ id, regels, lead, rechts }: { id: string; regels: string[]; lead?: React.ReactNode; rechts?: React.ReactNode }) {
  const i = HOOFDSTUKKEN.findIndex((x) => x.id === id);
  const h = HOOFDSTUKKEN[i];
  const kleur = hoofdstukKleur(i);
  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-8">
      <div className="flex flex-col gap-5 lg:col-span-7">
        <Stiplabel kleur={kleur}>{h.nr} · {h.kort}</Stiplabel>
        <Kopregels regels={regels.map((r, k) => [r, k === 0 ? NAVY : kleur] as [string, string])} />
      </div>
      {(lead || rechts) && (
        <div className="flex flex-col gap-4 lg:col-span-5">
          {lead && <div className="m-0 text-[17px] leading-[1.75] md:text-[18px]" style={{ color: TEKST }}>{lead}</div>}
          {rechts}
        </div>
      )}
    </div>
  );
}

/** Een tussenkop binnen een hoofdstuk. */
function Tussenkop({ titel, lead, kleur }: { titel: string; lead?: string; kleur: string }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className={`${kop} m-0 text-[26px] leading-[1.2] tracking-[-0.5px] md:text-[32px]`}>
        <span style={{ color: NAVY }}>{titel}</span>
      </h3>
      {lead && <p className="m-0 max-w-[680px] text-[16.5px] leading-[1.7]" style={{ color: TEKST }}>{lead}</p>}
      <span aria-hidden className="mt-1 flex gap-1.5">{[0, 1, 2].map((k) => <span key={k} className="h-2 w-2 rounded-full" style={{ background: kleur, opacity: 1 - k * 0.3 }} />)}</span>
    </div>
  );
}

/* ---------- 07: de prijslijst, per label in te klappen ---------- */

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

/**
 * Een label of de uurtarieven, in te klappen: de kop met naam en ondertitel
 * is altijd te zien, de tarieven klap je open. Op halve breedte (naast een
 * ander label) in één kolom.
 */
function GroepKaart({ g, half = false, open = false }: { g: PrijsGroep; half?: boolean; open?: boolean }) {
  const kolommen = half ? [halveKolom(g)] : g.kolommen;
  const aantal = g.kolommen.flat().reduce((n, l) => n + l.regels.length, 0);
  return (
    <details id={`tarieven-${g.id}`} open={open} className={`group/g relative scroll-mt-[104px] overflow-hidden rounded-[24px] ${half ? "self-start" : ""}`} style={{ background: g.slug ? g.tint : "#ffffff" }}>
      <summary className="relative flex cursor-pointer list-none items-end justify-between gap-6 px-5 py-5 md:px-8 md:py-6 [&::-webkit-details-marker]:hidden">
        {g.slug && <span aria-hidden className="absolute right-[-44px] top-[-44px] h-[132px] w-[132px] rounded-full" style={{ background: g.kleur, opacity: 0.14 }} />}
        <span className="relative flex min-w-0 flex-col gap-1">
          {g.slug ? (
            <span className={`${kop} flex flex-col text-[15px] leading-[1.1]`} style={{ color: NAVY }}>
              React2u<span className="text-[28px] tracking-[-0.6px]" style={{ color: g.kleur }}>{g.naam}<sup className="text-[12px]" style={{ color: NAVY }}>®</sup></span>
            </span>
          ) : (
            <span className={`${kop} text-[24px] tracking-[-0.4px]`} style={{ color: NAVY }}>{g.naam}</span>
          )}
          {g.ondertitel && <span className="text-[14px] leading-[1.5]" style={{ color: MUTE }}>{g.ondertitel}</span>}
        </span>
        <span className="relative flex shrink-0 items-center gap-3">
          <span className="hidden text-[13.5px] font-bold sm:inline" style={{ color: NAVY }}>
            <span className="group-open/g:hidden">{aantal} tarieven</span><span className="hidden group-open/g:inline">Inklappen</span>
          </span>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white transition-transform group-open/g:rotate-180" style={{ color: NAVY }}><Omlaag size={15} /></span>
        </span>
      </summary>
      <div className="relative border-t-[1.5px] px-5 pb-3 md:px-8" style={{ borderColor: g.kleur }}>
        <div className={`grid gap-x-12 ${kolommen.length > 1 ? "md:grid-cols-2" : ""}`}>
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
      </div>
    </details>
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
  const lijn = HOOFDSTUKKEN.map(({ nr, id, kort }) => ({ nr, id, kort }));
  const drie = prijslijst.aansluitingen.length === 3;
  const kleurVan = (id: string) => hoofdstukKleur(HOOFDSTUKKEN.findIndex((x) => x.id === id));
  const accentWoorden = OPENING.accent.split(" ");

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
        <VoortgangBalk items={lijn} />
      </header>

      {/* De opening: de kop in drie kleuren en de constellatie, zoals "Eén casemanager die je kent" op de homepage. */}
      <section aria-label="Opening" style={{ background: GRIJS }}>
        <div className={`${BREED} grid items-center gap-10 py-14 md:grid-cols-12 md:gap-6 md:py-24 lg:py-[112px]`}>
          <div className="flex flex-col gap-7 md:col-span-6 lg:col-span-6">
            <Stiplabel kleur={KLEUR.teal}>Brochure voor {b.bedrijf}</Stiplabel>
            <h1 className={`${kop} m-0 text-balance leading-[1.03] tracking-[-1.6px]`} style={{ fontSize: "clamp(42px, 5.6vw, 72px)" }}>
              <span className="block" style={{ color: NAVY }}>{OPENING.kop}</span>
              <span className="block" style={{ color: KLEUR.teal }}> {accentWoorden.slice(0, 2).join(" ")}</span>
              {/* "re-integratie" niet afbreken op het streepje. */}
              <span className="block" style={{ color: PINK }}> {accentWoorden.slice(2, -1).join(" ")} <span className="whitespace-nowrap">{accentWoorden.at(-1)}</span></span>
            </h1>
            <p className="m-0 max-w-[560px] text-[17px] leading-[1.75] md:text-[19px]" style={{ color: TEKST }}>{OPENING.onder}</p>
            <div className="flex flex-wrap gap-3">
              <a href="#inhoud" className={knop.roze}>Lees de brochure <Omlaag /></a>
              <a href={pdfHref} className={knop.rand} style={{ background: "transparent" }}>Download als pdf <Pijl size={14} /></a>
            </div>
          </div>
          <div className="md:col-span-6 lg:col-span-6">
            <Constellatie priority fotos={[BEELDEN.opening, BEELDEN.werkwijze, BEELDEN.diensten].map((f) => ({ src: f.src, alt: f.alt }))} />
          </div>
        </div>
      </section>

      {/* Het persoonlijke woord van de afzender, naast het contact. */}
      <section aria-label="Persoonlijk woord" className="bg-white">
        <div className={`${BREED} grid gap-10 py-16 md:py-24 lg:grid-cols-12 lg:gap-12`}>
          <div className="flex flex-col gap-5 lg:col-span-7">
            <Stiplabel kleur={PINK}>Persoonlijk woord</Stiplabel>
            <p className={`${kop} m-0 text-[30px] leading-[1.15] tracking-[-0.6px] md:text-[38px]`} style={{ color: NAVY }}>Beste {voornaam(b.contactpersoon) || "relatie"},</p>
            <div className="flex max-w-[660px] flex-col gap-4 text-[17px] leading-[1.75] md:text-[18px]" style={{ color: TEKST }}>
              {bericht.map((a, i) => <p key={i} className="m-0">{a}</p>)}
            </div>
          </div>
          <aside className="relative flex flex-col gap-5 self-start overflow-hidden rounded-[28px] p-7 md:p-8 lg:col-span-4 lg:col-start-9" style={{ background: GRIJS }}>
            <span aria-hidden className="absolute right-[-30px] top-[-30px] h-[110px] w-[110px] rounded-full" style={{ background: ZACHT[PINK] }} />
            <span aria-hidden className="absolute right-[34px] top-[64px] h-3 w-3 rounded-full" style={{ background: PINK }} />
            <Label kleur={MUTE}>Je contactpersoon</Label>
            <div className="relative flex items-center gap-4">
              <span className={`${kop} grid h-16 w-16 shrink-0 place-items-center rounded-full text-[20px] text-white`} style={{ background: NAVY, boxShadow: "0 0 0 5px #ffffff" }}>{initialen(b.afzender_naam)}</span>
              <span className="flex flex-col">
                <span className="text-[18px] font-bold" style={{ color: NAVY }}>{b.afzender_naam || "Team React2u"}</span>
                <span className="text-[14.5px]" style={{ color: MUTE }}>{b.afzender_functie ? `${b.afzender_functie}, React2u` : "React2u"}</span>
              </span>
            </div>
            <div className="relative flex flex-col gap-2 border-t pt-5 text-[15.5px]" style={{ borderColor: "rgba(50,46,131,0.12)" }}>
              {tel && <a href={tel} className="font-bold hover:underline" style={{ color: NAVY }}>{b.afzender_telefoon}</a>}
              <a href={`mailto:${mail}`} className="font-bold hover:underline" style={{ color: NAVY }}>{mail}</a>
            </div>
            <p className="relative m-0 text-[13.5px]" style={{ color: MUTE }}>Opgesteld op {datumLang(b.verstuurd_at || b.created_at)} voor {b.bedrijf}.</p>
          </aside>
        </div>
      </section>

      {/* De inhoud als stippenreis: acht stations, de hoofdstukken. */}
      <section id="inhoud" aria-label="In deze brochure" className="scroll-mt-[88px]" style={{ background: GRIJS }}>
        <div className={`${BREED} flex flex-col gap-10 pt-16 md:gap-12 md:pt-24 ${"pb-16 md:pb-24"}`}>
          <div className="grid gap-5 md:grid-cols-12 md:items-end md:gap-6">
            <div className="flex flex-col gap-4 md:col-span-7">
              <Stiplabel kleur={KLEUR.teal}>In deze brochure</Stiplabel>
              <Kopregels regels={[["Acht stations,", NAVY], ["één reis.", KLEUR.teal]]} maat="clamp(32px, 3.8vw, 46px)" />
            </div>
            <p className="m-0 text-[17px] leading-[1.75] md:col-span-5 md:col-start-8 md:text-[18px]" style={{ color: TEKST }}>Van de eerste ziektedag tot je overstap. Klik op een station om naar dat hoofdstuk te gaan.</p>
          </div>
          <Reis klein stations={HOOFDSTUKKEN.map((h, i) => ({ kleur: hoofdstukKleur(i), teken: h.nr, titel: h.kort, tekst: h.vraag, href: `#${h.id}` }))} />
        </div>
      </section>

      {/* 01 Hoe het gaat: de reis zonder regie. Grijze, lege stations en een onderbroken spoor. */}
      <Hoofdstuk id="hoe-het-gaat">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="flex flex-col gap-8 lg:sticky lg:top-[120px] lg:col-span-5 lg:self-start">
            <div className="flex flex-col gap-5">
              <Stiplabel kleur={kleurVan("hoe-het-gaat")}>01 · Hoe het gaat</Stiplabel>
              <Kopregels regels={[[TIJDLIJN.titel + ".", NAVY], ["Een klok die je niet ziet.", PINK]]} />
              <p className="m-0 text-[17px] leading-[1.75] md:text-[18px]" style={{ color: TEKST }}>{TIJDLIJN.lead}</p>
            </div>
            <span className="hidden lg:block"><RondeFoto src={BEELDEN["hoe-het-gaat"].src} alt={BEELDEN["hoe-het-gaat"].alt} kleur={PINK} maat={240} /></span>
          </div>
          <div className="lg:col-span-7">
            <Tijdreis
              grijs
              haltes={TIJDLIJN.momenten.map((m, i) => ({
                kleur: i === 0 ? NAVY : PINK,
                wanneer: m.wanneer,
                nadruk: i === 0 || i === TIJDLIJN.momenten.length - 1,
                inhoud: (
                  <div className="flex flex-col gap-2.5">
                    <p className="m-0 text-[17px] leading-[1.55]" style={{ color: i === TIJDLIJN.momenten.length - 1 ? PINK : NAVY, fontWeight: i === TIJDLIJN.momenten.length - 1 ? 700 : 500 }}>{m.wat}</p>
                    <span className="self-start rounded-[16px] rounded-bl-[4px] px-4 py-2 text-[14.5px] italic leading-[1.45]" style={{ background: i === TIJDLIJN.momenten.length - 1 ? ZACHT[PINK] : GRIJS, color: i === TIJDLIJN.momenten.length - 1 ? PINK : TEKST }}>{m.vraag}</span>
                  </div>
                ),
              }))}
            />
          </div>
        </div>
        {/* De slotzin, en daaronder het spoor in kleur: zo loopt het wel, met React2u. */}
        <div className="relative overflow-hidden rounded-[28px] px-7 py-9 md:rounded-[36px] md:px-14 md:py-12" style={{ background: NAVY }}>
          <span aria-hidden className="absolute right-[-120px] top-[-140px] h-[380px] w-[380px] rounded-full" style={{ background: "#3B378F" }} />
          <p className={`${kop} relative m-0 max-w-[880px] text-[26px] leading-[1.25] tracking-[-0.5px] md:text-[34px]`} style={{ color: "#ffffff" }}>
            {TIJDLIJN.slot} <span style={{ color: "#F7A8CB" }}>{TIJDLIJN.slotAccent}</span>
          </p>
          <span aria-hidden className="relative mt-7 flex items-center gap-[7px] overflow-hidden">
            {Array.from({ length: 64 }, (_, i) => {
              const t = i / 63;
              const seg = Math.min(REIS.length - 2, Math.floor(t * (REIS.length - 1)));
              const u = t * (REIS.length - 1) - seg;
              return <span key={i} className="shrink-0 rounded-full" style={{ width: 7 + 3 * Math.sin(Math.PI * u), height: 7 + 3 * Math.sin(Math.PI * u), background: [REIS[seg], REIS[seg + 1]][u < 0.5 ? 0 : 1] }} />;
            })}
          </span>
        </div>
      </Hoofdstuk>

      {/* 02 Voorwoord: het verhaal van Cindy en Susanne, zoals in de offerte. */}
      <Hoofdstuk id="voorwoord" grijs>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-6">
          <div className="flex flex-col gap-7 lg:sticky lg:top-[120px] lg:col-span-5 lg:self-start">
            <div className="relative h-[112px] w-[210px]" aria-hidden="true">
              <span className={`${kop} absolute left-0 top-[8px] grid h-[88px] w-[88px] place-items-center rounded-full text-[28px] text-white`} style={{ background: NAVY, boxShadow: `0 0 0 5px ${GRIJS}` }}>C</span>
              <span className={`${kop} absolute left-[70px] top-[18px] grid h-[88px] w-[88px] place-items-center rounded-full text-[28px] text-white`} style={{ background: kleurVan("voorwoord"), boxShadow: `0 0 0 5px ${GRIJS}` }}>S</span>
              <span className="absolute left-[172px] top-0 h-4 w-4 rounded-full" style={{ background: PINK, opacity: 0.4 }} />
              <span className="absolute left-[180px] top-[84px] h-2.5 w-2.5 rounded-full" style={{ background: PINK }} />
            </div>
            <div className="flex flex-col gap-5">
              <Stiplabel kleur={kleurVan("voorwoord")}>02 · Voorwoord</Stiplabel>
              <Kopregels regels={[[VOORWOORD_BROCHURE.kop, NAVY], [VOORWOORD_BROCHURE.accent, kleurVan("voorwoord")]]} maat="clamp(30px, 3.4vw, 44px)" />
            </div>
            <figure className="m-0 flex flex-col gap-3">
              <span aria-hidden className={`${kop} text-[64px] leading-[0.6]`} style={{ color: PINK }}>“</span>
              <blockquote className="m-0"><p className={`${kop} m-0 text-[20px] leading-[1.45] md:text-[22px]`} style={{ color: NAVY, fontWeight: 500 }}>{VOORWOORD.citaat}</p></blockquote>
              <figcaption className="text-[15px]" style={{ color: MUTE }}><span className="font-bold" style={{ color: NAVY }}>Cindy en Susanne</span>, React2u</figcaption>
            </figure>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <div className="flex max-w-[680px] flex-col gap-6">
              <p className={`${kop} m-0 text-[21px] leading-[1.55] md:text-[24px]`} style={{ color: NAVY, fontWeight: 500 }}>{VOORWOORD.kop}.</p>
              {verhaal.map((a, i) => <p key={i} className="m-0 text-[17px] leading-[1.8] md:text-[18px]" style={{ color: TEKST }}>{a}</p>)}
              <p className="m-0 text-[17px] font-semibold leading-[1.8] md:text-[18px]" style={{ color: NAVY }}>{VOORWOORD_BROCHURE.slot}</p>
              <p className="m-0 text-[17px] md:text-[18px]" style={{ color: TEKST }}>{VOORWOORD.groet}</p>
            </div>
            <div className="mt-6 grid max-w-[680px] grid-cols-2 gap-5 sm:gap-8">
              {VOORWOORD.ondertekenaars.map((o) => (
                <div key={o.naam}>
                  <p className="m-0 text-[46px] leading-none" style={{ color: NAVY, fontFamily: "var(--font-caveat), 'Caveat', cursive" }}>{o.naam}</p>
                  <p className="m-0 mt-2 border-t pt-2 text-[14.5px]" style={{ borderColor: LINE, color: MUTE }}>{ondertekenaarRegel(o)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Hoofdstuk>

      {/* 03 Onze werkwijze: drie stations, zoals de reis op de homepage. */}
      <Hoofdstuk id="werkwijze">
        <Kop id="werkwijze" regels={["Wat je van ons merkt."]} lead={<><strong className="font-bold" style={{ color: PINK }}>“{WERKWIJZE.citaat}”</strong> {WERKWIJZE.lead}</>} />
        <Reis
          stations={WERKWIJZE.punten.map((p, i) => ({
            kleur: [KLEUR.teal, KLEUR.sky, KLEUR.pink][i],
            teken: [<LuPhone key="a" style={{ width: "3.6cqw", height: "3.6cqw" }} strokeWidth={1.7} />, <LuHeartPulse key="b" style={{ width: "3.6cqw", height: "3.6cqw" }} strokeWidth={1.7} />, <LuShieldCheck key="c" style={{ width: "3.6cqw", height: "3.6cqw" }} strokeWidth={1.7} />][i],
            label: p.label,
            titel: p.titel,
            tekst: <>{p.tekst} <strong style={{ color: NAVY }}>{p.kern}.</strong></>,
          }))}
        />
      </Hoofdstuk>

      {/* 04 Wat het kost: de bedragen als cirkels, naar verhouding. */}
      <Hoofdstuk id="kosten" grijs>
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="flex flex-col gap-5 lg:col-span-6">
            <Stiplabel kleur={kleurVan("kosten")}>04 · Wat het kost</Stiplabel>
            <Kopregels regels={[["Eén vastgelopen dossier", NAVY], [`kost je ${k.totaal}.`, PINK]]} />
            <p className="m-0 text-[17px] leading-[1.75] md:text-[18px]" style={{ color: TEKST }}>{KOSTEN.tekst}</p>
          </div>
          {/* Oppervlakte naar verhouding: €63.000 en €31.500 (straal √½). */}
          <div className="relative mx-auto aspect-[690/430] w-full max-w-[640px] lg:col-span-6" style={{ containerType: "inline-size" }}>
            <div className="absolute grid place-items-center rounded-full text-white" style={{ left: "0%", top: "2%", width: "48%", aspectRatio: "1", background: NAVY, boxShadow: "0 30px 60px -30px rgba(50,46,131,.6)" }}>
              <span className="flex flex-col items-start" style={{ marginLeft: "-14%" }}>
                <span className={`${kop} leading-none`} style={{ fontSize: "6.4cqw", fontWeight: 800, letterSpacing: "-0.2cqw" }}>{k.loon}</span>
                <span className="hidden sm:block" style={{ fontSize: "2.1cqw", lineHeight: 1.45, color: "#D6D2F7", maxWidth: "21cqw", marginTop: "0.8cqw" }}>Twee jaar loondoorbetaling. Die heb je hoe dan ook.</span>
              </span>
            </div>
            <div className="absolute grid place-items-center rounded-full text-center text-white" style={{ left: "41%", top: "27%", width: "34%", aspectRatio: "1", background: PINK, boxShadow: `0 0 0 1.2cqw ${GRIJS}, 0 30px 60px -30px rgba(230,22,116,.7)` }}>
              <span className="flex flex-col items-center px-[3cqw]">
                <span className={`${kop} leading-none`} style={{ fontSize: "5.2cqw", fontWeight: 800, letterSpacing: "-0.2cqw" }}>{k.sanctie}</span>
                <span className="hidden sm:block" style={{ fontSize: "1.95cqw", lineHeight: 1.4, marginTop: "0.6cqw" }}>Loonsanctie.<br /><b>Te voorkomen.</b></span>
              </span>
            </div>
            <span aria-hidden className="hv-f2 absolute rounded-full" style={{ left: "80%", top: "34%", width: "6.6%", aspectRatio: "1", background: KLEUR.orange }} />
            <span aria-hidden className="hv-f1 absolute rounded-full" style={{ left: "88%", top: "27%", width: "3.6%", aspectRatio: "1", background: KLEUR.sky }} />
            <span aria-hidden className="hv-f3 absolute rounded-full" style={{ left: "86%", top: "48%", width: "2.4%", aspectRatio: "1", background: KLEUR.teal }} />
            <p className="absolute m-0 hidden sm:block" style={{ left: "79%", top: "56%", width: "21%", fontSize: "1.95cqw", lineHeight: 1.45, color: TEKST }}><b style={{ color: NAVY }}>+ re-integratie en vervanging</b>, nog niet meegeteld.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {[
            { bedrag: k.loon, kop: "Twee jaar loondoorbetaling", tekst: KOSTEN.loon, kleur: NAVY },
            { bedrag: k.sanctie, kop: "Loonsanctie van het UWV", tekst: KOSTEN.sanctie, kleur: PINK },
            { bedrag: "+", kop: "Re-integratie en vervanging", tekst: KOSTEN.bovenop(k.spoor2), kleur: KLEUR.orange },
          ].map((s) => (
            <div key={s.kop} className="flex flex-col gap-2 rounded-[24px] bg-white p-7">
              <span className="flex items-center gap-2.5">
                <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: s.kleur }} />
                <span className={`${kop} text-[30px] leading-none tracking-[-0.8px]`} style={{ color: NAVY }}>{s.bedrag}</span>
              </span>
              <span className="text-[16px] font-bold" style={{ color: NAVY }}>{s.kop}</span>
              <span className="text-[15px] leading-[1.65]" style={{ color: TEKST }}>{s.tekst}</span>
            </div>
          ))}
        </div>
        {k.compleet && (
          <div className="grid gap-8 rounded-[28px] bg-white p-7 md:p-10 lg:grid-cols-12 lg:items-center lg:gap-10">
            <p className={`${kop} m-0 text-[24px] leading-[1.3] tracking-[-0.4px] md:text-[30px] lg:col-span-6`} style={{ color: NAVY }}>
              {KOSTEN.slot} <span style={{ color: PINK }}>{KOSTEN.slotAccent}</span>
            </p>
            <div className="flex flex-col gap-4 border-t pt-6 lg:col-span-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0" style={{ borderColor: LINE }}>
              <Stiplabel kleur={KLEUR.teal}>Eén voorkomen sanctie betaalt</Stiplabel>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                <span className={`${kop} text-[52px] leading-none tracking-[-1.6px]`} style={{ color: NAVY }}>{k.compleet.jaren} jaar</span>
                <span aria-hidden className="flex items-center gap-1.5">
                  {[KLEUR.teal, KLEUR.sky, KLEUR.pink, KLEUR.orange].map((kl, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <span className={`${kop} grid h-10 w-10 place-items-center rounded-full text-[14px] text-white`} style={{ background: kl, fontWeight: 800 }}>{i + 1}</span>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: kl }} /><span className="h-1.5 w-1.5 rounded-full" style={{ background: kl, opacity: 0.6 }} />
                    </span>
                  ))}
                  <span className={`${kop} grid h-10 w-10 place-items-center rounded-full text-[14px] text-white`} style={{ background: `linear-gradient(90deg, ${KLEUR.red} 50%, #F3D3D7 50%)`, fontWeight: 800 }}>½</span>
                </span>
              </div>
              <p className="m-0 text-[15px] leading-[1.6]" style={{ color: TEKST }}>Casemanagement Compleet voor {k.compleet.werknemers} werknemers kost {k.compleet.bedrag} per jaar. Elk station is een jaar.</p>
            </div>
          </div>
        )}
      </Hoofdstuk>

      {/* 05 Onze diensten: de zes labels in hun eigen kleur, zoals op /werkgevers. */}
      <Hoofdstuk id="diensten">
        <Kop id="diensten" regels={["Zes diensten,", "één dak."]} lead={DIENSTEN_INTRO.lead} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {diensten.map((d) => {
            const t = DIENSTEN_BROCHURE[d.slug];
            return (
              <article key={d.slug} className="relative flex flex-col gap-4 overflow-hidden rounded-[28px] px-7 pb-7 pt-7" style={{ background: d.tint }}>
                <span aria-hidden className="absolute right-[-40px] top-[-40px] h-[120px] w-[120px] rounded-full" style={{ background: d.kleur, opacity: 0.16 }} />
                <span className={`${kop} relative flex flex-col text-[19px] leading-[1.1]`} style={{ color: NAVY }}>
                  React2u<span className="text-[30px] tracking-[-0.6px]" style={{ color: d.kleur.toLowerCase() === NAVY.toLowerCase() ? NAVY : d.kleur }}>{d.naam}<sup className="text-[13px]" style={{ color: NAVY }}>®</sup></span>
                </span>
                <span className="text-[15.5px] font-bold leading-[1.45]" style={{ color: NAVY }}>{t.dienst}</span>
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
        {/* Niet zeker? Zoals de contactband op de homepage: een ronde foto met een roze ring. */}
        <div className="relative grid items-center gap-8 overflow-hidden rounded-[28px] px-7 py-9 md:grid-cols-12 md:rounded-[36px] md:px-12 md:py-10" style={{ background: NAVY }}>
          <span aria-hidden className="absolute right-[-120px] top-[-140px] h-[380px] w-[380px] rounded-full" style={{ background: "#3B378F" }} />
          <span className="relative hidden md:col-span-3 md:block">
            <RondeFoto src={BEELDEN["hoe-het-gaat"].src} alt="" ring={PINK} kleur={PINK} maat={170} />
          </span>
          <div className="relative flex flex-col gap-3 md:col-span-6">
            <p className={`${kop} m-0 text-[28px] leading-[1.15] tracking-[-0.6px] md:text-[34px]`} style={{ color: "#ffffff" }}>{DIENSTEN_INTRO.twijfel}</p>
            <p className="m-0 text-[16px] leading-[1.65]" style={{ color: "#D6D2F7" }}>{DIENSTEN_INTRO.twijfelTekst}</p>
          </div>
          <a href={algemeen} className={`${knop.wit} relative md:col-span-3`}><Telefoon size={15} /> {c.phoneDisplay.replace(/\s*-\s*/, " ")}</a>
        </div>
      </Hoofdstuk>

      {/* Tussen 05 en 06: wat werkgevers over ons zeggen. */}
      <KlantenAanHetWoord bg={GRIJS} heading={KLANTEN_KOP} />
      <KlantenStrook />

      {/* 06 Jouw rol: wat je mag vragen, en dezelfde reis als in 01, nu in kleur en met React2u. */}
      <Hoofdstuk id="jouw-rol">
        <Kop id="jouw-rol" regels={["Wat mag je vragen,", "en wat moet je doen?"]} lead={VRAGEN.lead} />
        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          {[
            { ...VRAGEN.mag, kleur: KLEUR.teal, Icoon: Vink },
            { ...VRAGEN.magNiet, kleur: PINK, Icoon: Kruis },
          ].map((kolom) => (
            <div key={kolom.kop} className="relative flex flex-col gap-4 overflow-hidden rounded-[28px] p-7 md:p-8" style={{ background: GRIJS }}>
              <span aria-hidden className="absolute right-[-36px] top-[-36px] h-[110px] w-[110px] rounded-full" style={{ background: ZACHT[kolom.kleur] }} />
              <span className="relative flex flex-col gap-1">
                <span className={`${kop} text-[22px] leading-[1.25]`} style={{ color: kolom.kleur }}>{kolom.kop}</span>
                <span className="text-[14.5px] leading-[1.5]" style={{ color: MUTE }}>{kolom.onder}</span>
              </span>
              <ul className="relative m-0 flex list-none flex-col p-0">
                {kolom.items.map((v) => (
                  <li key={v} className="flex gap-3 border-t py-3 text-[15.5px] leading-[1.5]" style={{ borderColor: LINE, color: NAVY }}>
                    <span className="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full" style={{ background: ZACHT[kolom.kleur], color: kolom.kleur }}><kolom.Icoon size={11} /></span>{v}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="grid gap-4 rounded-[28px] px-7 py-8 md:grid-cols-12 md:items-center md:gap-8 md:px-10" style={{ background: GRIJS }}>
          <p className={`${kop} m-0 text-[24px] leading-[1.25] md:col-span-4`} style={{ color: NAVY }}>{VRAGEN.bedrijfsarts}</p>
          <p className="m-0 text-[16px] leading-[1.7] md:col-span-8" style={{ color: TEKST }}>{VRAGEN.bedrijfsartsTekst}</p>
        </div>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="flex flex-col gap-5 lg:sticky lg:top-[120px] lg:col-span-4 lg:self-start">
            <Stiplabel kleur={kleurVan("jouw-rol")}>Per termijn</Stiplabel>
            <Kopregels regels={[["Dezelfde reis,", NAVY], ["nu met React2u.", kleurVan("jouw-rol")]]} maat="clamp(30px, 3.4vw, 44px)" />
            <p className="m-0 text-[17px] leading-[1.75]" style={{ color: TEKST }}>{TERMIJNEN.lead}</p>
          </div>
          <div className="lg:col-span-8">
            <Tijdreis
              haltes={TERMIJNEN.rijen.map((r, i) => ({
                kleur: REIS[i % REIS.length],
                wanneer: r.moment,
                inhoud: (
                  <div className="flex flex-col gap-3">
                    <span className={`${kop} text-[20px] leading-[1.25]`} style={{ color: NAVY }}>{r.stap}</span>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex flex-col gap-1 rounded-[18px] px-5 py-4" style={{ background: GRIJS }}>
                        <Label kleur={MUTE}>Jij als werkgever</Label>
                        <p className="m-0 text-[15px] leading-[1.6]" style={{ color: TEKST }}>{r.jij}</p>
                      </div>
                      <div className="flex flex-col gap-1 rounded-[18px] px-5 py-4" style={{ background: ZACHT[REIS[i % REIS.length]] }}>
                        <Label kleur={REIS[i % REIS.length] === KLEUR.orange ? "#A35700" : REIS[i % REIS.length] === KLEUR.sky ? "#1C6A93" : REIS[i % REIS.length] === KLEUR.teal ? "#08716B" : "#C2105E"}>React2u</Label>
                        <p className="m-0 text-[15px] leading-[1.6]" style={{ color: NAVY }}>{r.wij}</p>
                      </div>
                    </div>
                  </div>
                ),
              }))}
            />
          </div>
        </div>
      </Hoofdstuk>

      {/* 07 Tarieven: de prijslijst van dit jaar, per label in te klappen. */}
      <Hoofdstuk id="tarieven" grijs>
        <Kop id="tarieven" regels={["Heldere prijzen,", "vooraf bekend."]} lead={`Alle tarieven van ${prijslijst.jaar}, precies zoals op onze prijslijst. Klap een label open voor de losse tarieven. Wat het voor ${b.bedrijf} kost, zetten we graag in een voorstel op maat.`} />
        <nav aria-label="Naar de tarieven van" className="-mt-4 flex flex-wrap gap-2">
          {prijslijst.groepen.map((g) => (
            <a key={g.id} href={`#tarieven-${g.id}`} className="inline-flex h-10 items-center gap-2 rounded-full border bg-white px-4 text-[14px] font-bold transition-colors hover:border-[#322E83]" style={{ color: NAVY, borderColor: LINE }}>
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: g.slug ? g.kleur : NAVY }} />{g.naam}
            </a>
          ))}
        </nav>
        {prijslijst.aansluitingen.length > 0 && (
          <div className={`-mt-4 grid gap-4 md:grid-cols-2 md:gap-5 ${drie ? "xl:grid-cols-12" : ""}`}>
            {prijslijst.aansluitingen.map((a, i) => (
              <AansluitingKaart key={i} a={a} plek={drie ? (a.uitgelicht ? "md:col-span-2 xl:col-span-7 xl:row-span-2" : "xl:col-span-5") : ""} />
            ))}
          </div>
        )}
        <div className="-mt-4 flex flex-col gap-4 md:gap-5">
          {prijsRijen(prijslijst.groepen).map((rij) => (
            rij.length > 1 ? (
              <div key={rij[0].id} className="grid gap-4 md:gap-5 lg:grid-cols-2">
                {rij.map((g) => <GroepKaart key={g.id} g={g} half />)}
              </div>
            ) : <GroepKaart key={rij[0].id} g={rij[0]} open={!rij[0].slug} />
          ))}
          {prijslijst.maatwerk && (
            <div className="grid gap-3 rounded-[24px] bg-white px-5 py-6 md:grid-cols-12 md:items-center md:gap-8 md:px-8 md:py-7">
              <span className="flex flex-col gap-1 md:col-span-4">
                <Label kleur={MUTE}>Op aanvraag</Label>
                <span className={`${kop} text-[22px] leading-[1.2]`} style={{ color: NAVY }}>{prijslijst.maatwerk.titel}</span>
              </span>
              <span className="text-[15px] leading-[1.65] md:col-span-8" style={{ color: BODY }}>{prijslijst.maatwerk.tekst}</span>
            </div>
          )}
        </div>
        <div className="-mt-2 flex flex-col gap-5 border-t pt-6 md:flex-row md:items-center md:justify-between md:gap-8" style={{ borderColor: LINE }}>
          <div className="flex flex-col gap-2">
            <p className="m-0 text-[16px] leading-[1.5]" style={{ color: NAVY }}><strong>{OFFERTE_SNEL.kop}</strong> {OFFERTE_SNEL.tekst}</p>
            <p className="m-0 max-w-[720px] text-[14px] leading-[1.6]" style={{ color: MUTE }}>{prijslijst.geldigheid} Prijswijzigingen voorbehouden.</p>
          </div>
          <a href={offerte} className={`${knop.roze} self-start md:self-auto`}>Vraag een voorstel op maat <Pijl size={14} /></a>
        </div>
      </Hoofdstuk>

      {/* 08 Overstappen: drie stations, en de groep waar React2u bij hoort. */}
      <Hoofdstuk id="overstappen">
        <Kop id="overstappen" regels={["Zo stap je over."]} lead={OVERSTAP.lead} />
        <Reis
          stations={OVERSTAP.stappen.map((s, i) => {
            const [wanneer, wat] = s.kop.split(/:\s*/);
            return { kleur: [KLEUR.teal, KLEUR.sky, KLEUR.pink][i], teken: String(i + 1), label: wanneer, titel: wat ? wat.charAt(0).toUpperCase() + wat.slice(1) : wanneer, tekst: s.tekst };
          })}
        />
        <div className="relative grid gap-6 overflow-hidden rounded-[28px] px-7 py-9 md:grid-cols-12 md:gap-10 md:px-12" style={{ background: GRIJS }}>
          <span aria-hidden className="absolute right-[-40px] top-[-40px] h-[140px] w-[140px] rounded-full" style={{ background: ZACHT[PINK] }} />
          <div className="relative flex flex-col gap-3 md:col-span-7">
            <p className={`${kop} m-0 text-[24px] leading-[1.25] md:text-[28px]`} style={{ color: NAVY }}>{OVERSTAP.geenDatum}</p>
            <p className="m-0 text-[16px] leading-[1.7]" style={{ color: TEKST }}>{OVERSTAP.geenDatumTekst}</p>
          </div>
          <p className="relative m-0 self-center rounded-[20px] bg-white px-5 py-4 text-[15px] leading-[1.6] md:col-span-5" style={{ color: NAVY }}>{OVERSTAP.or}</p>
        </div>
        <div className="flex flex-col gap-8">
          <Tussenkop titel={ZUSTERLABELS.titel} lead={ZUSTERLABELS.lead} kleur={kleurVan("overstappen")} />
          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {ZUSTERLABELS.labels.map((l) => {
              const hier = !l.url;
              return (
                <li key={l.naam} className="relative flex flex-col gap-2 overflow-hidden rounded-[24px] border p-6" style={{ background: hier ? ZACHT[PINK] : "#ffffff", borderColor: hier ? ZACHT[PINK] : LINE }}>
                  <span aria-hidden className="absolute right-[-26px] top-[-26px] h-[80px] w-[80px] rounded-full" style={{ background: l.kleur, opacity: 0.14 }} />
                  {hier && <span className="relative self-start rounded-full px-2.5 py-0.5 text-[11.5px] font-bold uppercase tracking-[1px] text-white" style={{ background: PINK }}>Dit ben je nu</span>}
                  <span className={`${kop} relative text-[22px] leading-[1.2]`} style={{ color: NAVY }}>{l.naam}</span>
                  <span className="relative text-[12px] font-bold uppercase tracking-[1.3px]" style={{ color: l.kleur }}>{l.soort}</span>
                  <span className="relative text-[14.5px] leading-[1.6]" style={{ color: BODY }}>{l.tekst}</span>
                  {l.url ? (
                    <a href={`https://${l.url}`} target="_blank" rel="noopener" className="relative mt-auto inline-flex items-center gap-2 pt-2 text-[14.5px] font-bold hover:underline" style={{ color: NAVY }}>{l.url} <Pijl size={13} /></a>
                  ) : (
                    <span className="relative mt-auto pt-2 text-[14.5px] font-bold" style={{ color: PINK }}>Deze brochure</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </Hoofdstuk>

      {/* De uitnodiging, zoals de contactband van de homepage. */}
      <section aria-label="Kennismaken" className="px-[6px] pb-2 md:px-6 md:pb-6 xl:px-10">
        <div className="relative mx-auto grid max-w-[1360px] items-center gap-10 overflow-hidden rounded-[28px] px-6 py-10 md:rounded-[36px] md:p-14 lg:grid-cols-12 lg:p-16" style={{ background: NAVY }}>
          <span aria-hidden className="absolute right-[-120px] top-[-140px] h-[420px] w-[420px] rounded-full" style={{ background: "#3B378F" }} />
          <span className="relative hidden lg:col-span-3 lg:block"><RondeFoto src={BEELDEN.overstappen.src} alt="" ring={PINK} kleur={PINK} maat={220} /></span>
          <div className="relative flex flex-col gap-4 lg:col-span-5">
            <Stiplabel kleur="#B4ADF2">Kennismaken</Stiplabel>
            <h2 className={`${kop} m-0 leading-[1.05] tracking-[-1.2px]`} style={{ color: "#ffffff", fontSize: "clamp(32px, 3.8vw, 48px)" }}>
              Benieuwd wat het voor {b.bedrijf} betekent? <span style={{ color: "#F7A8CB" }}>Bel gewoon even.</span>
            </h2>
            <p className="m-0 max-w-[520px] text-[16px] leading-[1.65] md:text-[17px]" style={{ color: "#D6D2F7" }}>
              We horen graag hoe jullie organisatie in elkaar zit. Daarna krijg je een voorstel op maat, dat je online bekijkt en ondertekent.
            </p>
          </div>
          <div className="relative flex flex-col gap-3 lg:col-span-4">
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
