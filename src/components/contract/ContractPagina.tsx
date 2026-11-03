"use client";
import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Outfit } from "next/font/google";
import { LuCheck } from "react-icons/lu";
import Logo from "@/components/site/Logo";
import { BODY, BREED, Eyebrow, kop, LAV, LINE, NAVY, PINK, Pijl, SOFT } from "@/components/blocks/Gedeeld";
import Handtekening from "@/components/offerte/Handtekening";
import { CONTRACT_EMAIL, CONTRACT_FOUT, comparitieOpdrachtgever, comparitieOpdrachtnemer, contractFeiten, contractInhoud, contractKort, looptijdNu, normaliseerOpdrachtgever, opdrachtgeverFout, plaatsUit, versieTekst, type ContractPubliek, type Opdrachtgever } from "@/lib/contracten";
import { CONTRACT_SLOT, CONTRACT_TITEL, type ContractStructuur } from "@/lib/contractTekst";
import type { ContactInfo } from "@/lib/content";
import { DOCUMENTEN } from "@/lib/documenten";
import { inlineDelen } from "@/lib/mdInline";
import { ONDERTEKENAAR } from "@/lib/offerteOndertekenaar";
import { datumLang, isNaam, momentLang } from "@/lib/offertes";
import { ondertekenContract, vraagContractCode } from "@/app/(offerte)/contract/actions";

/*
 * Het basiscontract zoals de klant het ziet (/contract/<token>, migratie 0031),
 * en hetzelfde scherm als voorbeeld in het beheer. In de vormgeving van de site
 * en de offerte (Rens, 3 nov 2026: "in nieuwe stijl"), in de kleuren van
 * React2u zelf zoals de brochure: een basiscontract hoort bij de arbodienst,
 * niet bij één label.
 *
 *  - de opening in de lila tint met de grote cirkel: wat dit is, de looptijd,
 *    en rechts "In het kort" met de afspraken in gewone woorden;
 *  - het contract als document op een wit vel, met links een inhoudsopgave die
 *    meeloopt; de kop met de partijen vult zich terwijl de klant onderaan zijn
 *    gegevens invult;
 *  - ondertekenen in drie stappen: handtekening, je organisatie, code uit je
 *    mail. Namens React2u staat de handtekening van de bestuurder er al.
 *
 * Modus: klant (de echte link), collega (een beheerder opent de link: niets
 * telt, tekenen niet), voorbeeld (vanuit het beheer, ook voor een concept).
 */

const outfit = Outfit({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-outfit", display: "swap" });

// Grijs van de site, net iets donkerder voor contrast (zoals de offertepagina).
const MUTE = "#6B6985";
const NAVY_LICHT = "#3B378F";
const IVOOR = "#F8F5F1";

export type Modus = "klant" | "collega" | "voorbeeld";

const KNOP = "inline-flex h-[52px] items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 text-[15px] font-bold disabled:opacity-60";
const knop = {
  roze: `hv-btn hv-btn-roze ${KNOP}`,
  rand: `hv-btn hv-btn-rand ${KNOP}`,
};
const veld =
  "h-[52px] w-full rounded-[14px] border border-[#DCDAE8] bg-white px-4 text-[16px] text-[#322E83] outline-none transition-[border-color,box-shadow] placeholder:text-[#A9A7BC] focus:border-[#322E83] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)] disabled:bg-[#F6F5FB] disabled:text-[#A9A7BC]";

// De vlakken met een decoratieve cirkel gebruiken overflow-clip, geen overflow-hidden: een verborgen
// overloop is nog steeds te scrollen, en dan schuift het tekenblok opzij als de browser een veld of
// knop in beeld scrollt (gezien in de browsertest).
const PAGINA_CSS = `
@media (prefers-reduced-motion: reduce) {
  .contract-doc *, .contract-doc *::before, .contract-doc *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
.contract-stip { transform: translate(-50%, -50%) scale(0); opacity: 0; animation: contract-stip 1000ms cubic-bezier(.2,.8,.2,1) forwards; }
@keyframes contract-stip { 0% { transform: translate(-50%, -50%) scale(0); opacity: 0; } 30% { opacity: 1; } 100% { transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1); opacity: 0; } }
.contract-vink { animation: contract-vink 520ms cubic-bezier(.2,1.4,.4,1) both; }
@keyframes contract-vink { from { transform: scale(.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .contract-stip, .contract-vink { animation: none; } }
@media print { .contract-doc header, .contract-doc .geen-print { display: none !important; } }
`;

type Huis = { contact: ContactInfo };

const telLink = (t: string | null) => (t ? `tel:${t.replace(/[^\d+]/g, "")}` : null);
const voornaam = (n: string | null | undefined) => (n || "").trim().split(/\s+/)[0] || "";
const initialen = (naam: string | null) =>
  (naam || "React2u").split(/\s+/).filter(Boolean).map((w) => w[0]).filter((c) => /[A-Za-zÀ-ÿ]/.test(c)).slice(0, 2).join("").toUpperCase() || "R";
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/* ---------- kleine bouwstenen ---------- */

function Vink({ size = 14, dik = 2.8 }: { size?: number; dik?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={dik} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

function Icoon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
const TELEFOON = "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z";
const OMLAAG = "M12 5v14M6 13l6 6 6-6";
const DOWNLOAD = "M12 3v12m0 0-4-4m4 4 4-4M5 21h14";
const MAIL = "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm0 2 8 6 8-6";
const SLOT = "M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zm2 0V7a4 4 0 0 1 8 0v4";
const DOCUMENT = "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zm0 0v5h5M9 13h6M9 17h4";

function Label({ children, licht = false }: { children: React.ReactNode; licht?: boolean }) {
  return <span className="block text-[12.5px] font-bold uppercase tracking-[1.2px]" style={{ color: licht ? "rgba(255,255,255,0.72)" : MUTE }}>{children}</span>;
}

/** Tekst uit het contract: **vet** en links, nooit HTML. */
function Inline({ tekst }: { tekst: string }) {
  return (
    <>
      {inlineDelen(tekst).map((d, i) =>
        d.soort === "vet" ? (
          <strong key={i} style={{ color: NAVY }}>{d.tekst}</strong>
        ) : d.soort === "link" ? (
          <a key={i} href={d.href} target="_blank" rel="noopener" className="font-bold underline underline-offset-4" style={{ color: NAVY }}>{d.tekst}</a>
        ) : (
          <Fragment key={i}>{d.tekst}</Fragment>
        ),
      )}
    </>
  );
}

/** Een zin uit de kop van het contract, met de plekken die nog ingevuld worden als stippellijn. */
function MetOpenPlekken({ tekst }: { tekst: string }) {
  const delen = tekst.split("[ ]");
  return (
    <>
      {delen.map((d, i) => (
        <Fragment key={i}>
          {d}
          {i < delen.length - 1 && (
            <span className="mx-0.5 inline-block min-w-[88px] translate-y-[2px] border-b-2 border-dotted align-baseline" style={{ borderColor: "#B9B6D3" }} aria-label="nog in te vullen">&nbsp;</span>
          )}
        </Fragment>
      ))}
    </>
  );
}

function SectieKop({ eyebrow, titel, tekst, kleur = PINK }: { eyebrow: string; titel: string; tekst?: React.ReactNode; kleur?: string }) {
  return (
    <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-6">
      <div className="flex flex-col gap-4 lg:col-span-7">
        <Eyebrow kleur={kleur}>{eyebrow}</Eyebrow>
        <h2 className={`${kop} m-0 leading-[1.1] tracking-[-0.9px]`} style={{ color: NAVY, fontSize: "clamp(32px, 4vw, 46px)" }}>{titel}</h2>
      </div>
      {tekst && <div className="m-0 text-[16px] leading-[1.7] md:text-[17px] lg:col-span-4 lg:col-start-9" style={{ color: BODY }}>{tekst}</div>}
    </div>
  );
}

function scrollNaar(id: string) {
  const rustig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: rustig ? "auto" : "smooth", block: "start" });
}

/** Hoe ver je bent (0 tot 1), voor de lijn onder de kopbalk. */
function useVoortgang() {
  const [v, setV] = useState(0);
  useEffect(() => {
    let r = 0;
    const meet = () => {
      r = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setV(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    const opScroll = () => { if (!r) r = requestAnimationFrame(meet); };
    meet();
    window.addEventListener("scroll", opScroll, { passive: true });
    window.addEventListener("resize", opScroll);
    return () => { window.removeEventListener("scroll", opScroll); window.removeEventListener("resize", opScroll); cancelAnimationFrame(r); };
  }, []);
  return v;
}

/** Welk onderdeel nu bovenaan staat: het laatste waarvan de bovenkant voorbij de kopbalk is. */
function useActief(ids: string[]) {
  const [actief, setActief] = useState(ids[0] || "");
  const sleutel = ids.join(",");
  useEffect(() => {
    const lijst = sleutel.split(",").filter(Boolean);
    let r = 0;
    const meet = () => {
      r = 0;
      let nu = lijst[0] || "";
      for (const id of lijst) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 160) nu = id;
      }
      setActief(nu);
    };
    const opScroll = () => { if (!r) r = requestAnimationFrame(meet); };
    meet();
    window.addEventListener("scroll", opScroll, { passive: true });
    return () => { window.removeEventListener("scroll", opScroll); cancelAnimationFrame(r); };
  }, [sleutel]);
  return actief;
}

/** Of een onderdeel in beeld is: dan hoeft de knop ernaartoe niet meer. */
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

/** De datum van vandaag, pas in de browser (anders verschillen server en browser rond middernacht). */
function useVandaag() {
  const [d, setD] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setD(new Date().toISOString()), 0);
    return () => clearTimeout(t);
  }, []);
  return d;
}

/* ---------- de pagina ---------- */

export default function ContractPagina({
  contract, token, modus, contact, vers = false,
}: {
  contract: ContractPubliek;
  token?: string;
  modus: Modus;
  contact: ContactInfo;
  /** Net getekend (minder dan een kwartier geleden): dan de felicitatie. */
  vers?: boolean;
}) {
  const huis: Huis = { contact };
  return (
    <div className={`hv ${outfit.variable} contract-doc min-h-screen bg-white`}>
      <style>{PAGINA_CSS}</style>
      {contract.status === "getekend" && contract.getekend_inhoud ? (
        <Getekend contract={contract} token={token} modus={modus} vers={vers} huis={huis} />
      ) : (
        <Ondertekenen contract={contract} token={token} modus={modus} huis={huis} />
      )}
    </div>
  );
}

/* ---------- kop, melding en voet ---------- */

type Onderdeel = { id: string; label: string };

function Kopbalk({ contract, actie, onderdelen = [] }: { contract: ContractPubliek; actie?: React.ReactNode; onderdelen?: Onderdeel[] }) {
  const tel = telLink(contract.afzender_telefoon);
  const voortgang = useVoortgang();
  const actief = useActief(onderdelen.map((o) => o.id));
  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur-md" style={{ borderColor: LINE }}>
      <div className={`${BREED} flex h-[72px] items-center justify-between gap-4 md:h-[88px]`}>
        <div className="flex min-w-0 items-center gap-4">
          <Logo className="h-9 w-auto shrink-0 md:h-11" />
          <span className="hidden h-8 w-px sm:block" style={{ background: LINE }} aria-hidden="true" />
          <span className="hidden truncate text-[15px] font-bold sm:block" style={{ color: NAVY }}>Contract {contract.nummer}</span>
        </div>
        {onderdelen.length > 0 && (
          <nav aria-label="Onderdelen van het contract" className="hidden items-center gap-7 xl:flex">
            {onderdelen.map((o) => {
              const hier = o.id === actief;
              return (
                <a key={o.id} href={`#${o.id}`} aria-current={hier ? "true" : undefined} className="relative py-2 text-[15px] font-bold" style={{ color: hier ? PINK : NAVY }}>
                  {o.label}
                  <span aria-hidden className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full transition-opacity" style={{ background: PINK, opacity: hier ? 1 : 0 }} />
                </a>
              );
            })}
          </nav>
        )}
        <div className="flex shrink-0 items-center gap-5">
          {tel && (
            <a href={tel} className="inline-flex items-center gap-2 text-[15px] font-bold" style={{ color: NAVY }}>
              <Icoon d={TELEFOON} size={15} /> <span className="hidden md:inline">Bel {voornaam(contract.afzender_naam) || "ons"}</span><span className="md:hidden">Bellen</span>
            </a>
          )}
          {actie && <div className="hidden sm:block">{actie}</div>}
        </div>
      </div>
      <span aria-hidden className="absolute bottom-[-1px] left-0 h-[2px]" style={{ width: `${voortgang * 100}%`, background: PINK }} />
    </header>
  );
}

function Melding({ modus }: { modus: Modus }) {
  if (modus === "klant") return null;
  return (
    <div className="geen-print bg-[#FFF4E5] text-[14px] text-[#7A4A06]">
      <p className={`${BREED} m-0 py-2.5`}>
        {modus === "voorbeeld"
          ? "Voorbeeld: zo ziet de klant het contract. Tekenen kan hier niet."
          : "Je bekijkt dit contract als collega. Dit bezoek telt niet mee en ondertekenen kan alleen de klant."}
      </p>
    </div>
  );
}

function Voet({ contract, huis, pdf }: { contract: ContractPubliek; huis: Huis; pdf: string | null }) {
  const c = huis.contact;
  const mail = contract.afzender_email || CONTRACT_EMAIL;
  const kolomkop = "m-0 text-[15px] font-bold";
  return (
    <footer className="pb-32 pt-12 md:pt-16 lg:pb-16" style={{ background: IVOOR }}>
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
              <a href={`tel:${c.phone}`} className="font-bold hover:underline" style={{ color: NAVY }}>{c.phoneDisplay.replace(/\s*-\s*/, " ")}</a><br />
              Ma t/m vr 9.00 tot 17.00 uur<br />
              <a href={`mailto:${mail}`} className="font-bold hover:underline" style={{ color: NAVY }}>{mail}</a>
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <p className={kolomkop} style={{ color: NAVY }}>Dit contract</p>
            <p className="m-0 text-[15px] leading-[1.75]" style={{ color: BODY }}>
              Contract {contract.nummer}<br />
              Tekst {versieTekst((contract.getekend_inhoud ?? contract).tekst_versie)}<br />
              {pdf && <><a href={`${pdf}?download=1`} className="font-bold hover:underline" style={{ color: NAVY }}>Download als pdf</a><br /></>}
              <a href={DOCUMENTEN.algemeneVoorwaarden} target="_blank" rel="noopener" className="font-bold hover:underline" style={{ color: NAVY }}>Algemene voorwaarden</a>
            </p>
          </div>
        </div>
        <p className="m-0 text-[13.5px]" style={{ color: MUTE }}>© {new Date().getFullYear()} React2u. KvK {c.kvk}, btw {c.btw}.</p>
      </div>
    </footer>
  );
}

/* ---------- de opening ---------- */

function Opening({ contract, zin, tekst, feiten, knoppen, kaart }: {
  contract: ContractPubliek;
  zin: React.ReactNode;
  tekst: React.ReactNode;
  feiten: { label: string; waarde: string; sub?: string }[];
  knoppen: React.ReactNode;
  kaart: React.ReactNode;
}) {
  return (
    <section className="px-[6px] pt-2 md:px-6 md:pt-6 xl:px-10">
      <div className="relative mx-auto grid max-w-[1360px] gap-10 overflow-clip rounded-[28px] px-6 pb-8 pt-10 md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-14 lg:p-16 xl:p-[72px]" style={{ background: LAV }}>
        <span aria-hidden className="absolute right-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full md:h-[560px] md:w-[560px]" style={{ background: NAVY, opacity: 0.1 }} />
        <span aria-hidden className="absolute bottom-[-120px] left-[38%] hidden h-[220px] w-[220px] rounded-full lg:block" style={{ background: PINK, opacity: 0.08 }} />
        <div className="relative flex flex-col gap-6">
          <p className="m-0 flex flex-col gap-0.5 text-[14px] font-semibold sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5" style={{ color: MUTE }}>
            <span>Contract {contract.nummer}</span><span aria-hidden className="hidden sm:inline">/</span><span style={{ color: NAVY }}>{contract.bedrijf}</span>
          </p>
          <div>
            {/* Kleur inline: de algemene kopstijl van de site wint anders van de Tailwind-klasse. */}
            <h1 className={`${kop} m-0 text-[24px] leading-[1.05] tracking-[-0.4px] md:text-[32px]`} style={{ color: NAVY }}>
              React2u
              <span className="mt-1 block text-[50px] leading-[1.02] tracking-[-1.6px] md:text-[76px] md:tracking-[-2.2px]">
                Basiscontract<span style={{ color: PINK }}>.</span>
              </span>
              <span className="hv-dienst mt-4 block text-[18px] font-bold leading-[1.5] tracking-normal md:text-[21px]">Arbodienstverlening.</span>
            </h1>
            <p className="m-0 text-[18px] leading-[1.5] md:text-[21px]" style={{ color: NAVY }}><em>Tussen React2u en {contract.bedrijf}</em></p>
          </div>
          <div className="flex max-w-[620px] flex-col gap-3 border-t pt-6" style={{ borderColor: "rgba(50,46,131,0.12)" }}>
            <p className={`${kop} m-0 text-[24px] leading-[1.25] tracking-[-0.4px] md:text-[28px]`} style={{ color: NAVY }}>{zin}</p>
            <div className="text-[16px] leading-[1.7] md:text-[17px]" style={{ color: BODY }}>{tekst}</div>
          </div>
          <dl className="m-0 flex flex-wrap gap-x-10 gap-y-4">
            {feiten.map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="text-[13px]" style={{ color: MUTE }}>{f.label}</dt>
                <dd className="m-0 mt-0.5 text-[16px] font-bold" style={{ color: NAVY }}>{f.waarde}</dd>
                {f.sub && <dd className="m-0 text-[13px]" style={{ color: MUTE }}>{f.sub}</dd>}
              </div>
            ))}
          </dl>
          <div className="geen-print flex flex-wrap gap-3 pt-1">{knoppen}</div>
        </div>
        <div className="relative">{kaart}</div>
      </div>
    </section>
  );
}

/** De witte kaart in de opening: de afspraken in gewone woorden, en de contactpersoon. */
function KortKaart({ contract }: { contract: ContractPubliek }) {
  const tel = telLink(contract.afzender_telefoon);
  const kort = contractKort(contract);
  return (
    <div className="rounded-[24px] bg-white p-6 shadow-[0_30px_70px_-40px_rgba(50,46,131,0.45)] md:p-8">
      <div className="flex items-start justify-between gap-4">
        <Label>In het kort</Label>
        <span className="h-3 w-3 rounded-full" style={{ background: PINK }} aria-hidden="true" />
      </div>
      <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
        {kort.map((r) => (
          <li key={r} className="flex items-start gap-2.5 text-[15.5px] leading-[1.45]" style={{ color: NAVY }}>
            <span className="mt-0.5 shrink-0" style={{ color: PINK }}><Vink size={17} /></span>{r}
          </li>
        ))}
      </ul>
      <p className="m-0 mt-4 text-[13px] leading-[1.5]" style={{ color: MUTE }}>De volledige tekst hieronder is leidend.</p>
      <div className="mt-6 flex items-center gap-3 border-t pt-5" style={{ borderColor: LINE }}>
        <span className={`${kop} flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-[15px] text-white`} style={{ background: NAVY }} aria-hidden="true">
          {initialen(contract.afzender_naam)}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="m-0 text-[15px] font-bold" style={{ color: NAVY }}>{contract.afzender_naam || "React2u"}</p>
          <p className="m-0 truncate text-[13.5px]" style={{ color: MUTE }}>Je contactpersoon bij React2u</p>
        </div>
        {tel && (
          <a href={tel} aria-label={`Bel ${contract.afzender_naam || "React2u"}`} className="hv-btn hv-btn-rand flex h-10 w-10 items-center justify-center rounded-full">
            <Icoon d={TELEFOON} size={16} />
          </a>
        )}
      </div>
    </div>
  );
}

/* ---------- het contract als document ---------- */

const artikelId = (nr: string) => `artikel-${nr}`;

/**
 * Het contract op een wit vel: de partijen, de overwegingen en de artikelen,
 * met links een inhoudsopgave die meeloopt. `partijen` zijn de twee zinnen uit
 * de kop, met open plekken zolang de klant iets nog niet heeft ingevuld.
 */
function Tekst({ s, partijen, titel, eyebrow, tekst, metOndertekenen = false }: {
  s: ContractStructuur;
  partijen: [string, string];
  titel: string;
  eyebrow: string;
  tekst?: React.ReactNode;
  metOndertekenen?: boolean;
}) {
  const inhoud: Onderdeel[] = [
    { id: "partijen", label: "De ondergetekenden" },
    { id: "overwegingen", label: "Overwegingen" },
    ...s.artikelen.map((a) => ({ id: artikelId(a.nr), label: `${a.nr}. ${a.titel}` })),
    ...(metOndertekenen ? [{ id: "ondertekenen", label: "Ondertekenen" }] : []),
  ];
  const actief = useActief(inhoud.map((o) => o.id));
  return (
    <section id="contract" aria-label="Het contract" className="scroll-mt-[96px]" style={{ background: SOFT }}>
      <div className={`${BREED} flex flex-col gap-10 py-16 md:gap-14 md:py-[112px]`}>
        <SectieKop eyebrow={eyebrow} titel={titel} tekst={tekst} />
        <div className="grid items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[300px_minmax(0,1fr)]">
          <nav aria-label="Inhoud van het contract" className="geen-print hidden lg:sticky lg:top-[112px] lg:block">
            <Label>Inhoud</Label>
            <ol className="m-0 mt-4 flex list-none flex-col border-l p-0" style={{ borderColor: LINE }}>
              {inhoud.map((o) => {
                const hier = o.id === actief;
                return (
                  <li key={o.id}>
                    <a
                      href={`#${o.id}`}
                      aria-current={hier ? "true" : undefined}
                      className="-ml-px block border-l-2 py-1.5 pl-4 text-[14.5px] leading-[1.4] transition-colors"
                      style={{ borderColor: hier ? PINK : "transparent", color: hier ? NAVY : MUTE, fontWeight: hier ? 700 : 500 }}
                    >
                      {o.label}
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>

          <article className="min-w-0 rounded-[28px] border bg-white px-6 py-9 shadow-[0_24px_48px_-40px_rgba(50,46,131,0.35)] md:px-12 md:py-14 xl:px-16" style={{ borderColor: LINE }}>
            <header className="flex flex-col gap-2 border-b pb-7" style={{ borderColor: LINE }}>
              <Label>Contract</Label>
              <h3 className={`${kop} m-0 text-[28px] leading-[1.15] tracking-[-0.6px] md:text-[34px]`} style={{ color: NAVY }}>{CONTRACT_TITEL}</h3>
            </header>

            <details className="geen-print mt-6 rounded-[14px] p-4 lg:hidden" style={{ background: SOFT }}>
              <summary className="cursor-pointer text-[15px] font-bold" style={{ color: NAVY }}>Inhoud</summary>
              <ol className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0">
                {inhoud.map((o) => <li key={o.id}><a href={`#${o.id}`} className="text-[14.5px] font-semibold underline-offset-4 hover:underline" style={{ color: NAVY }}>{o.label}</a></li>)}
              </ol>
            </details>

            <div id="partijen" className="scroll-mt-[112px] pt-8">
              <p className="m-0 text-[17px] font-bold" style={{ color: NAVY }}>De ondergetekenden:</p>
              <ol className="m-0 mt-4 flex list-none flex-col gap-4 p-0">
                {partijen.map((t, i) => (
                  <li key={i} className="grid grid-cols-[32px_minmax(0,1fr)] text-[16px] leading-[1.75] md:text-[16.5px]" style={{ color: BODY }}>
                    <span className="font-bold tabular-nums" style={{ color: NAVY }}>{i + 1}.</span>
                    <span><MetOpenPlekken tekst={t} /></span>
                  </li>
                ))}
              </ol>
            </div>

            <div id="overwegingen" className="scroll-mt-[112px] pt-10">
              <p className="m-0 text-[17px] font-bold" style={{ color: NAVY }}>{s.overwegingenKop}:</p>
              <ol className="m-0 mt-4 flex list-none flex-col gap-4 p-0">
                {s.overwegingen.map((o, i) => (
                  <li key={i} className="grid grid-cols-[32px_minmax(0,1fr)] gap-y-2 text-[16px] leading-[1.75] md:text-[16.5px]" style={{ color: BODY }}>
                    <span className={`${kop} mt-[3px] grid h-[24px] w-[24px] place-items-center rounded-full text-[12.5px]`} style={{ background: LAV, color: NAVY }}>{o.letter}</span>
                    <span className="flex flex-col gap-2">{o.alineas.map((a, j) => <span key={j}><Inline tekst={a} /></span>)}</span>
                  </li>
                ))}
              </ol>
            </div>

            {s.artikelen.map((a) => (
              <section key={a.nr} id={artikelId(a.nr)} aria-label={`Artikel ${a.nr}: ${a.titel}`} className="scroll-mt-[112px] border-t pt-9 mt-10" style={{ borderColor: LINE }}>
                <p className="m-0 text-[12.5px] font-bold uppercase tracking-[1.4px]" style={{ color: PINK }}>Artikel {a.nr}</p>
                <h4 className={`${kop} m-0 mt-1.5 text-[22px] leading-[1.25] tracking-[-0.4px] md:text-[26px]`} style={{ color: NAVY }}>{a.titel}</h4>
                <div className="mt-5 flex flex-col gap-4">
                  {a.bepalingen.map((b, i) => (
                    <div
                      key={i}
                      className={`grid gap-y-2 text-[16px] leading-[1.75] md:text-[16.5px] ${b.diepte > 1 ? "grid-cols-[60px_minmax(0,1fr)] pl-0 md:pl-10" : "grid-cols-[48px_minmax(0,1fr)]"}`}
                      style={{ color: BODY }}
                    >
                      <span className="pt-px text-[14.5px] font-bold tabular-nums" style={{ color: NAVY }}>{b.nr}</span>
                      <span className="flex flex-col gap-2.5">{b.alineas.map((t, j) => <span key={j}><Inline tekst={t} /></span>)}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <p className="m-0 mt-10 border-t pt-8 text-[16.5px] font-bold" style={{ borderColor: LINE, color: NAVY }}>{CONTRACT_SLOT}</p>
            <Documenten />
          </article>
        </div>
      </div>
    </section>
  );
}

/** De documenten waar het contract naar verwijst, als pdf van de site. */
function Documenten() {
  const lijst = [
    { href: DOCUMENTEN.algemeneVoorwaarden, naam: "Algemene voorwaarden", waar: "artikel 8.1" },
    { href: DOCUMENTEN.privacyverklaring, naam: "Privacyreglement", waar: "artikel 5.2 en 8.2" },
    { href: DOCUMENTEN.klachtenregeling, naam: "Klachtenregeling", waar: "artikel 4.4" },
  ];
  return (
    <div className="mt-8 rounded-[20px] p-5 md:p-6" style={{ background: SOFT }}>
      <Label>Documenten bij dit contract</Label>
      <ul className="m-0 mt-3 grid list-none gap-2 p-0 sm:grid-cols-3">
        {lijst.map((d) => (
          <li key={d.href}>
            <a href={d.href} target="_blank" rel="noopener" className="flex h-full items-start gap-3 rounded-[14px] bg-white p-3.5 transition-shadow hover:shadow-[0_0_0_1.5px_#322E83]">
              <span className="mt-0.5 shrink-0" style={{ color: PINK }}><Icoon d={DOCUMENT} size={18} /></span>
              <span className="flex flex-col">
                <span className="text-[14.5px] font-bold leading-[1.3]" style={{ color: NAVY }}>{d.naam}</span>
                <span className="text-[13px]" style={{ color: MUTE }}>{d.waar}, pdf</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- voor het tekenen ---------- */

type OrgVeld = keyof Opdrachtgever;

function Ondertekenen({ contract, token, modus, huis }: { contract: ContractPubliek; token?: string; modus: Modus; huis: Huis }) {
  const vooraf = normaliseerOpdrachtgever(contract.opdrachtgever);
  const [og, setOg] = useState<Record<OrgVeld, string>>({
    naam: vooraf.naam || contract.bedrijf, adres: vooraf.adres || "", postcode: vooraf.postcode || "", plaats: vooraf.plaats || "", kvk: vooraf.kvk || "",
  });
  const [naam, setNaam] = useState(contract.contactpersoon || "");
  const [functie, setFunctie] = useState("");
  const open = contract.status === "verstuurd" || (modus === "voorbeeld" && contract.status === "concept");
  const kanTekenen = contract.status === "verstuurd" && modus === "klant" && Boolean(token);
  const concept = token ? `/contract/${token}/concept` : `/admin/contractvoorbeeld/${contract.id}/concept`;
  const bijTekenen = useInBeeld("ondertekenen");

  const s = useMemo(() => contractInhoud({ ...contract, opdrachtgever: normaliseerOpdrachtgever(og) }), [contract, og]);
  const partijen: [string, string] = [
    comparitieOpdrachtnemer(contract.opdrachtnemer),
    comparitieOpdrachtgever(normaliseerOpdrachtgever(og), { naam, functie }),
  ];
  const onderdelen = [
    { id: "contract", label: "Het contract" },
    { id: "ondertekenen", label: "Ondertekenen" },
  ];

  return (
    <>
      <Kopbalk
        contract={contract}
        onderdelen={onderdelen}
        actie={open ? <button type="button" onClick={() => scrollNaar("ondertekenen")} className={`${knop.roze} !h-[48px] px-5`}>Ondertekenen<Pijl size={14} /></button> : null}
      />
      <Melding modus={modus} />
      <main>
        <Opening
          contract={contract}
          zin={<>Beste {voornaam(contract.contactpersoon) || "relatie"}, dit is het contract bij je arbodienst.</>}
          tekst={
            <p className="m-0">
              Sinds 1 juli 2017 vraagt de Arbowet dat elke werkgever een basiscontract heeft met zijn arbodienst. Hierin staat wat je van ons kunt
              verwachten: de begeleiding bij verzuim, het open spreekuur bij de bedrijfsarts, de second opinion en hoe we met de gegevens van je mensen
              omgaan. Lees het rustig door; akkoord? Dan teken je onderaan, online.
            </p>
          }
          feiten={contractFeiten(contract)}
          knoppen={
            <>
              <button type="button" onClick={() => scrollNaar("contract")} className={knop.roze}>Lees het contract <Icoon d={OMLAAG} /></button>
              <a href={concept} className={knop.rand}><Icoon d={DOWNLOAD} size={15} /> Download als pdf</a>
            </>
          }
          kaart={<KortKaart contract={contract} />}
        />
        <div className="h-10 md:h-16" />

        <Tekst
          s={s}
          partijen={partijen}
          eyebrow="Het contract"
          titel="Wat we met elkaar afspreken"
          tekst="De tekst van het Basiscontract Arbodienstverlening. De kop vult zich met de gegevens die je onderaan invult."
          metOndertekenen
        />

        <section id="ondertekenen" aria-label="Ondertekenen" className="scroll-mt-[96px] px-[6px] py-10 md:px-6 md:py-16 xl:px-10">
          <div className="relative mx-auto max-w-[1360px] overflow-clip rounded-[28px] px-5 py-10 md:rounded-[36px] md:p-14 lg:p-16" style={{ background: LAV }}>
            <span aria-hidden className="absolute right-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full md:h-[560px] md:w-[560px]" style={{ background: NAVY, opacity: 0.1 }} />
            <div className="relative flex flex-col gap-10">
              <SectieKop
                eyebrow="Ondertekenen"
                titel="Teken voor akkoord."
                tekst={<>Je tekent namens <strong style={{ color: NAVY }}>{contract.bedrijf}</strong>. Daarna krijg je het getekende contract als pdf, met het ondertekeningscertificaat.</>}
              />
              <div className="rounded-[24px] bg-white p-5 shadow-[0_30px_70px_-40px_rgba(50,46,131,0.45)] md:p-10">
                <Formulier
                  contract={contract}
                  token={token}
                  modus={modus}
                  open={open}
                  kanTekenen={kanTekenen}
                  huis={huis}
                  og={og}
                  setOg={setOg}
                  naam={naam}
                  setNaam={setNaam}
                  functie={functie}
                  setFunctie={setFunctie}
                  concept={concept}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Voet contract={contract} huis={huis} pdf={concept} />

      {/* Op de telefoon: onderaan de knop naar ondertekenen, tot je erbij bent. */}
      {open && (
        <div className={`geen-print fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-4 py-3 backdrop-blur-md transition-transform sm:hidden ${bijTekenen ? "translate-y-full" : ""}`} style={{ borderColor: LINE }}>
          <button type="button" onClick={() => scrollNaar("ondertekenen")} className={`${knop.roze} w-full`}>Ondertekenen<Pijl size={14} /></button>
        </div>
      )}
    </>
  );
}

function Formulier({
  contract, token, modus, open, kanTekenen, huis, og, setOg, naam, setNaam, functie, setFunctie, concept,
}: {
  contract: ContractPubliek;
  token?: string;
  modus: Modus;
  open: boolean;
  kanTekenen: boolean;
  huis: Huis;
  og: Record<OrgVeld, string>;
  setOg: React.Dispatch<React.SetStateAction<Record<OrgVeld, string>>>;
  naam: string;
  setNaam: (s: string) => void;
  functie: string;
  setFunctie: (s: string) => void;
  concept: string;
}) {
  const router = useRouter();
  const vandaag = useVandaag();
  const [email, setEmail] = useState(contract.email || "");
  // Null: de plaats van ondertekening volgt de vestigingsplaats, tot iemand hier iets anders invult.
  const [plaats, setPlaats] = useState<string | null>(null);
  const [png, setPng] = useState<string | null>(null);
  const [akkoord, setAkkoord] = useState(false);
  const [stap, setStap] = useState<"gegevens" | "code">("gegevens");
  const [code, setCode] = useState("");
  const [wacht, setWacht] = useState(0);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, start] = useTransition();
  const uit = !open;
  const vast = uit || stap === "code";
  const tekenPlaats = plaats ?? og.plaats;
  const veldOg = (k: OrgVeld) => (e: React.ChangeEvent<HTMLInputElement>) => setOg((o) => ({ ...o, [k]: e.target.value }));
  const statutair = og.naam.trim() || contract.bedrijf;

  useEffect(() => {
    if (wacht <= 0) return;
    const t = setTimeout(() => setWacht((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wacht]);

  function controleer(): string | null {
    if (!png) return "Zet je handtekening in het vak, of kies Typen.";
    if (!isNaam(naam)) return CONTRACT_FOUT.naam;
    if (functie.trim().length < 2) return CONTRACT_FOUT.functie;
    if (!EMAIL.test(email.trim())) return "Vul een geldig e-mailadres in; daar sturen we de code heen.";
    const of = opdrachtgeverFout(normaliseerOpdrachtgever(og));
    if (of) return CONTRACT_FOUT[of];
    if (tekenPlaats.trim().length < 2) return CONTRACT_FOUT.plaats;
    if (!akkoord) return CONTRACT_FOUT.akkoord;
    return null;
  }

  function stuurCode() {
    if (!token) return;
    setFout(null);
    start(async () => {
      const res = await vraagContractCode(token, email.trim());
      if (!res.ok) return setFout(res.fout || "De code kon niet worden verstuurd.");
      setStap("code");
      setCode("");
      setWacht(30);
    });
  }

  function teken(c: string) {
    if (!token || !png) return;
    setFout(null);
    start(async () => {
      const res = await ondertekenContract(token, {
        naam: naam.trim(), functie: functie.trim(), email: email.trim(), plaats: tekenPlaats.trim(), handtekening: png, akkoord, code: c,
        opdrachtgever: normaliseerOpdrachtgever(og),
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

  function verstuur(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);
    if (!kanTekenen || !token) {
      setFout(modus === "klant" ? "Dit contract kan niet meer worden ondertekend." : "In het voorbeeld en als collega kan er niet worden getekend.");
      return;
    }
    const f = controleer();
    if (f) return setFout(f);
    if (stap === "gegevens") return stuurCode();
    if (code.length !== 6) return setFout("Vul de code van 6 cijfers uit de mail in.");
    teken(code);
  }

  const gegevensKlaar =
    isNaam(naam) && functie.trim().length >= 2 && EMAIL.test(email.trim()) && !opdrachtgeverFout(normaliseerOpdrachtgever(og)) && tekenPlaats.trim().length >= 2 && akkoord;
  const stappen = [
    { label: "Handtekening", klaar: Boolean(png) },
    { label: "Jij en je organisatie", klaar: gegevensKlaar },
    { label: "Code uit je mail", klaar: false },
  ];
  const huidig = stap === "code" ? 2 : !png ? 0 : !gegevensKlaar ? 1 : 2;
  const veldLabel = "text-[14.5px] font-bold";
  const opdrachtnemer = contract.opdrachtnemer;

  return (
    <div>
      {!uit && (
        <ol aria-label="Zo teken je" className="m-0 mb-8 flex list-none items-center gap-2 p-0 sm:gap-3">
          {stappen.map((st, i) => {
            const klaar = st.klaar && i !== huidig;
            const nu = i === huidig;
            return (
              <li key={st.label} className={`flex items-center gap-2 sm:gap-3 ${i < stappen.length - 1 ? "flex-1" : ""}`} aria-current={nu ? "step" : undefined}>
                <span
                  className={`${kop} grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] transition-colors`}
                  style={klaar ? { background: NAVY, color: "#fff" } : nu ? { background: "#fff", color: PINK, boxShadow: `inset 0 0 0 2px ${PINK}` } : { background: SOFT, color: MUTE }}
                >
                  {klaar ? <Vink size={14} dik={3} /> : i + 1}
                </span>
                <span className="whitespace-nowrap text-[13.5px] font-bold sm:text-[14.5px]" style={{ color: nu || klaar ? NAVY : MUTE }}>
                  <span className={nu ? "" : "hidden sm:inline"}>{st.label}</span>
                </span>
                {i < stappen.length - 1 && <span aria-hidden className="h-px min-w-4 flex-1" style={{ background: klaar ? NAVY : LINE }} />}
              </li>
            );
          })}
        </ol>
      )}

      <form onSubmit={verstuur} noValidate>
        {/* De twee handtekeningen, zoals onderaan het Word-contract */}
        <div className="grid gap-8 md:grid-cols-2 md:gap-6">
          <div>
            <Label>Opdrachtnemer</Label>
            <p className="m-0 mt-2 text-[14px]" style={{ color: MUTE }}>Te {plaatsUit(opdrachtnemer)}, {datumLang(contract.verstuurd_at || contract.created_at)}</p>
            <p className={`${kop} m-0 text-[20px]`} style={{ color: NAVY }}>React2u</p>
            <div className="mt-3 flex h-[44px] items-center">
              <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-bold" style={{ background: LAV, color: NAVY }}>
                <Vink size={12} /> Getekend door React2u
              </span>
            </div>
            {/* Namens React2u tekent de bestuurder (lib/offerteOndertekenaar.ts). */}
            <div className="relative mt-2.5 flex aspect-[10/3] items-end overflow-hidden rounded-[16px] border px-[6%] pb-[5%]" style={{ borderColor: LINE, background: SOFT }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ONDERTEKENAAR.handtekening} alt={`Handtekening van ${ONDERTEKENAAR.naam}`} className="relative z-10 h-[88%] w-auto" />
              <span className="absolute inset-x-[6%] bottom-[24%] border-b" style={{ borderColor: "#D6D4E4" }} aria-hidden="true" />
            </div>
            <p className="m-0 mt-2.5 text-[14px]" style={{ color: MUTE }}>Ondergetekende: {ONDERTEKENAAR.naam}, {ONDERTEKENAAR.functie}</p>
          </div>
          <div>
            <Label>Opdrachtgever</Label>
            <p className="m-0 mt-2 text-[14px]" style={{ color: MUTE }}>Te {tekenPlaats.trim() || "…"}, {vandaag ? datumLang(vandaag) : "…"}</p>
            <p className={`${kop} m-0 text-[20px]`} style={{ color: NAVY }}>{statutair}</p>
            <div className="mt-3">
              {!uit ? (
                <Handtekening naam={naam} onChange={(p) => { setPng(p); if (p) setFout(null); }} />
              ) : (
                <>
                  <div className="h-[44px]" />
                  <div className="mt-2.5 aspect-[10/3] rounded-[16px] border border-dashed" style={{ borderColor: "#D6D4E4" }} />
                </>
              )}
            </div>
            <p className="m-0 mt-2.5 text-[14px]" style={{ color: MUTE }}>
              Ondergetekende: {naam.trim() || "je naam"}{functie.trim() ? `, ${functie.trim()}` : ""}
            </p>
          </div>
        </div>

        {/* Wie tekent */}
        <div className="mt-9 grid items-start gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className={veldLabel} style={{ color: NAVY }}>Volledige naam</span>
            <input id="ct-naam" className={veld} value={naam} onChange={(e) => setNaam(e.target.value)} autoComplete="name" required disabled={vast} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={veldLabel} style={{ color: NAVY }}>Functie</span>
            <input id="ct-functie" className={veld} value={functie} onChange={(e) => setFunctie(e.target.value)} autoComplete="organization-title" placeholder="Bijvoorbeeld directeur" required disabled={vast} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={veldLabel} style={{ color: NAVY }}>E-mailadres</span>
            <input id="ct-email" className={veld} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required disabled={vast} aria-describedby="ct-email-uitleg" />
            <span id="ct-email-uitleg" className="text-[13.5px]" style={{ color: MUTE }}>Hier sturen we de code naartoe.</span>
          </label>
        </div>

        {/* De organisatie, zoals in de kop van het contract */}
        <fieldset className="m-0 mt-7 min-w-0 rounded-[22px] border-0 p-5 md:p-7" style={{ background: SOFT }} disabled={vast}>
          <legend className="sr-only">Je organisatie</legend>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className={`${kop} m-0 text-[19px]`} style={{ color: NAVY }}>Je organisatie, zoals in het handelsregister</p>
            <p className="m-0 text-[13.5px]" style={{ color: MUTE }}>
              {alIngevuld(contract) ? `Al ingevuld door ${voornaam(contract.afzender_naam) || "React2u"}; klopt het?` : "Deze gegevens komen in de kop van het contract."}
            </p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-6">
            <label className="flex flex-col gap-1.5 md:col-span-4">
              <span className={veldLabel} style={{ color: NAVY }}>Statutaire naam</span>
              <input id="ct-onaam" className={veld} value={og.naam} onChange={veldOg("naam")} autoComplete="organization" />
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className={veldLabel} style={{ color: NAVY }}>KvK-nummer</span>
              <input id="ct-kvk" className={veld} value={og.kvk} onChange={veldOg("kvk")} inputMode="numeric" placeholder="8 cijfers" />
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-3">
              <span className={veldLabel} style={{ color: NAVY }}>Straat en huisnummer</span>
              <input id="ct-adres" className={veld} value={og.adres} onChange={veldOg("adres")} autoComplete="address-line1" />
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-1">
              <span className={veldLabel} style={{ color: NAVY }}>Postcode</span>
              <input id="ct-postcode" className={veld} value={og.postcode} onChange={veldOg("postcode")} autoComplete="postal-code" />
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className={veldLabel} style={{ color: NAVY }}>Vestigingsplaats</span>
              <input id="ct-plaats" className={veld} value={og.plaats} onChange={veldOg("plaats")} autoComplete="address-level2" />
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className={veldLabel} style={{ color: NAVY }}>Getekend te</span>
              <input id="ct-tekenplaats" className={veld} value={tekenPlaats} onChange={(e) => setPlaats(e.target.value)} placeholder="Plaats" />
            </label>
          </div>
          {/* Zo komt het in het contract: dezelfde zin als in de kop en de pdf. */}
          <div className="mt-5 rounded-[16px] border-l-[3px] bg-white px-4 py-3.5 md:px-5" style={{ borderColor: PINK }} aria-live="polite">
            <Label>Zo staat het in het contract</Label>
            <p className="m-0 mt-1.5 text-[15px] leading-[1.65]" style={{ color: BODY }}>
              <MetOpenPlekken tekst={comparitieOpdrachtgever(normaliseerOpdrachtgever(og), { naam, functie })} />
            </p>
          </div>
        </fieldset>

        <label className={`mt-5 flex items-start gap-3 rounded-[16px] border-[1.5px] p-4 text-[15px] leading-[1.55] transition-colors md:px-5 ${uit ? "opacity-60" : "cursor-pointer"} ${akkoord ? "border-[#322E83] bg-[#F6F5FB]" : "border-[#E6E5EF]"}`} style={{ color: BODY }}>
          <input type="checkbox" checked={akkoord} onChange={(e) => setAkkoord(e.target.checked)} disabled={vast} className="mt-0.5 h-5 w-5 shrink-0 accent-[#322E83]" />
          <span>
            Ik ga akkoord met dit basiscontract en de{" "}
            <a href={DOCUMENTEN.algemeneVoorwaarden} target="_blank" rel="noopener" className="font-bold underline underline-offset-4" style={{ color: NAVY }}>algemene voorwaarden</a>{" "}
            van React2u, en ik ben bevoegd om <strong style={{ color: NAVY }}>{statutair}</strong> te vertegenwoordigen.
          </span>
        </label>

        {fout && <p role="alert" className="m-0 mt-4 rounded-[14px] bg-[#FDECEA] px-4 py-3 text-[15px] text-[#8A1C12]">{fout}</p>}

        {!uit && stap === "code" ? (
          <div className="relative mt-6 overflow-clip rounded-[22px] p-5 md:p-7" style={{ background: NAVY }} aria-live="polite">
            <span aria-hidden className="absolute -right-[60px] -top-[80px] h-[220px] w-[220px] rounded-full" style={{ background: NAVY_LICHT }} />
            <div className="relative flex items-start gap-4">
              <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full sm:flex" style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}><Icoon d={MAIL} size={20} /></span>
              <div className="min-w-0">
                <p className={`${kop} m-0 text-[22px] leading-[1.25]`} style={{ color: "#ffffff" }}>Nog één stap: de code uit je mail</p>
                <p className="m-0 mt-1.5 text-[15px] leading-[1.55]" style={{ color: "rgba(255,255,255,0.82)" }}>
                  We stuurden een code van 6 cijfers naar <strong className="text-white [overflow-wrap:break-word]">{email.trim()}</strong>. Zo weten we zeker dat jij het bent die tekent.
                </p>
              </div>
            </div>
            <div className="relative mt-5 flex flex-col gap-3 sm:pl-[60px] md:flex-row md:items-center">
              <input
                id="ct-code"
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
            <p className="m-0 flex max-w-[520px] items-start gap-2 text-[13px] leading-[1.5] md:order-1" style={{ color: MUTE }}>
              <span className="mt-0.5"><Icoon d={SLOT} size={14} /></span>
              Je krijgt eerst een code per mail. Als bewijs leggen we je naam, functie, je bevestigde e-mailadres, het tijdstip, je IP-adres en de getekende versie vast; het getekende contract krijg je als pdf.
            </p>
            <button type="submit" disabled={bezig} className={`${knop.roze} !h-[56px] w-full !text-[16px] md:order-2 md:w-auto`}>
              {bezig ? "Code versturen…" : <>Onderteken het contract<Pijl /></>}
            </button>
          </div>
        ) : (
          <p className="m-0 mt-5 text-[15px]" style={{ color: MUTE }}>Ondertekenen kan hier niet.</p>
        )}
        <p className="geen-print m-0 mt-5 text-[14px]" style={{ color: MUTE }}>
          Eerst intern bespreken?{" "}
          <a href={concept} className="font-bold underline underline-offset-4" style={{ color: NAVY }}>Download het contract als pdf</a>
          {huis.contact.phoneDisplay ? <>, of bel ons op <a href={`tel:${huis.contact.phone}`} className="font-bold" style={{ color: NAVY }}>{huis.contact.phoneDisplay.replace(/\s*-\s*/, " ")}</a></> : null}.
        </p>
      </form>
    </div>
  );
}

/** Of sales de gegevens van de organisatie al heeft ingevuld. */
function alIngevuld(c: ContractPubliek) {
  const o = normaliseerOpdrachtgever(c.opdrachtgever);
  return Boolean(o.kvk || o.adres);
}

/* ---------- na ondertekening ---------- */

function Feest() {
  const kleuren = [PINK, NAVY, PINK, "#ffffff"];
  return (
    <span className="pointer-events-none absolute inset-0 motion-reduce:hidden" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => {
        const hoek = (i / 16) * Math.PI * 2;
        const afstand = 58 + (i % 3) * 16;
        const maat = 7 + (i % 3) * 3;
        return (
          <span
            key={i}
            className="contract-stip absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: maat, height: maat, background: kleuren[i % kleuren.length],
              boxShadow: kleuren[i % kleuren.length] === "#ffffff" ? `0 0 0 1px ${PINK}` : undefined,
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

function Getekend({ contract, token, modus, vers, huis }: { contract: ContractPubliek; token?: string; modus: Modus; vers: boolean; huis: Huis }) {
  const inhoud = contract.getekend_inhoud!;
  const og = inhoud.opdrachtgever || {};
  const pdf = token ? `/contract/${token}/pdf` : `/admin/contractvoorbeeld/${contract.id}/pdf`;
  const s = contractInhoud(inhoud);
  const nu = looptijdNu(inhoud.ingangsdatum, inhoud.einddatum);
  const partijen: [string, string] = [
    comparitieOpdrachtnemer(inhoud.opdrachtnemer),
    comparitieOpdrachtgever(og, { naam: inhoud.getekend_naam, functie: inhoud.getekend_functie }),
  ];
  return (
    <>
      <Kopbalk contract={contract} actie={<a href={`${pdf}?download=1`} className={`${knop.rand} !h-[48px] md:!h-[52px]`}><Icoon d={DOWNLOAD} size={15} /> Pdf</a>} />
      <Melding modus={modus} />
      <main>
        <Opening
          contract={{ ...contract, bedrijf: og.naam || contract.bedrijf }}
          zin={vers ? <>Gelukt, {voornaam(inhoud.getekend_naam)}! Het contract is rond.</> : <>Ondertekend door {inhoud.getekend_naam}</>}
          tekst={
            <p className="m-0">
              Het basiscontract arbodienstverlening tussen React2u en {og.naam || inhoud.bedrijf}, ondertekend op {momentLang(inhoud.getekend_at)} te {inhoud.getekend_plaats}.
              {vers ? ` Het getekende contract staat als pdf in je mail op ${inhoud.getekend_email}.` : ""}
            </p>
          }
          feiten={[
            ...contractFeiten(inhoud).slice(0, 2),
            { label: nu.verlengd ? "Verlengd tot" : "Loopt tot", waarde: datumLang(nu.periodeEinde), sub: `opzeggen uiterlijk ${datumLang(nu.opzeggenUiterlijk)}` },
          ]}
          knoppen={
            <>
              <a href={`${pdf}?download=1`} className={knop.roze}><Icoon d={DOWNLOAD} size={15} /> Download het getekende contract</a>
              <a href={pdf} target="_blank" rel="noopener" className={knop.rand}>Bekijk de pdf<Pijl /></a>
            </>
          }
          kaart={
            <div className="rounded-[24px] bg-white p-6 text-center shadow-[0_30px_70px_-40px_rgba(50,46,131,0.45)] md:p-8">
              <span className="relative mx-auto flex h-24 w-24 items-center justify-center">
                {vers && <Feest />}
                <span className={`flex h-[72px] w-[72px] items-center justify-center rounded-full text-white ${vers ? "contract-vink" : ""}`} style={{ background: NAVY }}>
                  <LuCheck className="text-[34px]" strokeWidth={3} aria-hidden />
                </span>
              </span>
              <p className={`${kop} m-0 mt-4 text-[24px]`} style={{ color: NAVY }}>Ondertekend</p>
              <p className="m-0 mt-1 text-[15px]" style={{ color: MUTE }}>{momentLang(inhoud.getekend_at)}</p>
              <dl className="m-0 mt-6 grid grid-cols-2 gap-4 border-t pt-5 text-left" style={{ borderColor: LINE }}>
                <div><dt className="text-[13px]" style={{ color: MUTE }}>Namens React2u</dt><dd className="m-0 text-[15px] font-bold" style={{ color: NAVY }}>{ONDERTEKENAAR.naam}</dd></div>
                <div><dt className="text-[13px]" style={{ color: MUTE }}>Namens {og.naam || inhoud.bedrijf}</dt><dd className="m-0 text-[15px] font-bold" style={{ color: NAVY }}>{inhoud.getekend_naam}</dd></div>
              </dl>
              {inhoud.bevestiging && (
                <span className="mt-5 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-bold" style={{ background: LAV, color: NAVY }}>
                  <Vink size={12} /> E-mailadres bevestigd met een code
                </span>
              )}
            </div>
          }
        />
        <div className="h-10 md:h-16" />

        <section aria-label="Ondertekening" className="bg-white">
          <div className={`${BREED} flex flex-col gap-10 pb-16 md:gap-14 md:pb-[112px]`}>
            <SectieKop eyebrow="Ondertekening" titel="Aldus overeengekomen" tekst="Beide handtekeningen, met plaats en datum. De getekende versie staat vast en kan niet meer worden gewijzigd." />
            <div className="grid gap-5 md:grid-cols-2">
              <Handtekeningvak
                rol="Opdrachtnemer"
                plaats={`Te ${plaatsUit(inhoud.opdrachtnemer)}, ${datumLang(inhoud.verstuurd_at || inhoud.getekend_at)}`}
                partij="React2u"
                beeld={ONDERTEKENAAR.handtekening}
                wie={`${ONDERTEKENAAR.naam}, ${ONDERTEKENAAR.functie}`}
              />
              <Handtekeningvak
                rol="Opdrachtgever"
                plaats={`Te ${inhoud.getekend_plaats}, ${datumLang(inhoud.getekend_at)}`}
                partij={og.naam || inhoud.bedrijf}
                beeld={contract.handtekening}
                wie={`${inhoud.getekend_naam}, ${inhoud.getekend_functie}`}
              />
            </div>
            {contract.getekend_hash && (
              <p className="m-0 max-w-[880px] text-[14px] leading-[1.6]" style={{ color: MUTE }}>
                Kenmerk van de ondertekende versie: <span className="break-all font-mono text-[12.5px]">{contract.getekend_hash}</span>.{" "}
                <a href={pdf} target="_blank" rel="noopener" className="font-bold underline underline-offset-4" style={{ color: NAVY }}>Het ondertekeningscertificaat</a> staat achterin de pdf.
              </p>
            )}
          </div>
        </section>

        <Tekst s={s} partijen={partijen} eyebrow="Het contract" titel="Wat we hebben afgesproken" tekst="De tekst zoals hij is getekend, met beide partijen in de kop." />
      </main>
      <Voet contract={contract} huis={huis} pdf={pdf} />
    </>
  );
}

function Handtekeningvak({ rol, plaats, partij, beeld, wie }: { rol: string; plaats: string; partij: string; beeld: string | null; wie: string }) {
  return (
    <div className="flex flex-col rounded-[24px] border p-6 md:p-8" style={{ borderColor: LINE }}>
      <Label>{rol}</Label>
      <p className="m-0 mt-2 text-[14px]" style={{ color: MUTE }}>{plaats}</p>
      <p className={`${kop} m-0 text-[20px]`} style={{ color: NAVY }}>{partij}</p>
      <div className="mt-4 flex h-[110px] items-end">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {beeld && <img src={beeld} alt={`Handtekening van ${wie.split(",")[0]}`} className="h-full w-auto max-w-full object-contain object-left" />}
      </div>
      <p className="m-0 mt-2 border-t pt-2.5 text-[14px]" style={{ borderColor: LINE, color: MUTE }}>Ondergetekende: {wie}</p>
    </div>
  );
}
