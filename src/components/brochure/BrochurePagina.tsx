import Link from "next/link";
import { Caveat, Outfit } from "next/font/google";
import Logo from "@/components/site/Logo";
import { BODY, BREED, Eyebrow, Keurmerken, KlantenAanHetWoord, KlantenStrook, kop, LAV, LINE, MUTE, NAVY, PINK, Pijl, SOFT, Vink } from "@/components/blocks/Gedeeld";
import type { ContactInfo } from "@/lib/content";
import type { Certificate } from "@/lib/nav";
import { BERICHT_STANDAARD, BROCHURE_EMAIL, type BrochurePubliek } from "@/lib/brochures";
import type { Dienst } from "@/lib/brochureHuisstijl";
import { datumLang, vulIn } from "@/lib/offertes";
import { ondertekenaarRegel, VOORWOORD } from "@/lib/offerteVoorwoord";

/*
 * De brochurepagina (/brochure/<token>, migratie 0030): alles wat React2u
 * voor één prospect kan betekenen, in de vormgeving van de site. Geen prijzen
 * en geen keuzes, dat komt in de offerte; wel het persoonlijke woord van de
 * afzender, de zes diensten als de dienstenkaarten op /werkgevers, het
 * verhaal van Cindy en Susanne, de klanten en keurmerken, en overal de
 * uitnodiging om te bellen.
 */

// Dezelfde variabele als de site (.hv .hv-kop leest --font-outfit).
const outfit = Outfit({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-outfit", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], weight: ["500"], variable: "--font-caveat", display: "swap" });

const IVOOR = "#F8F5F1";
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

/** De sectiekop van de site: links bovenkopje en kop, rechts een korte toelichting. */
function SectieKop({ eyebrow, titel, tekst, licht = false }: { eyebrow: string; titel: string; tekst?: React.ReactNode; licht?: boolean }) {
  return (
    <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-6">
      <div className="flex flex-col gap-4 lg:col-span-7">
        <Eyebrow kleur={licht ? "rgba(255,255,255,0.85)" : PINK}>{eyebrow}</Eyebrow>
        <h2 className={`${kop} m-0 leading-[1.1] tracking-[-0.9px]`} style={{ color: licht ? "#ffffff" : NAVY, fontSize: "clamp(32px, 4vw, 46px)" }}>{titel}</h2>
      </div>
      {tekst && <div className="m-0 text-[16px] leading-[1.7] md:text-[17px] lg:col-span-4 lg:col-start-9" style={{ color: licht ? "rgba(255,255,255,0.8)" : BODY }}>{tekst}</div>}
    </div>
  );
}

export default function BrochurePagina({ brochure: b, diensten, huis, modus, pdfHref }: {
  brochure: BrochurePubliek;
  diensten: Dienst[];
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
  // Het voorwoord zonder de zinnen over "dit voorstel": dat komt pas met de offerte.
  const verhaal = VOORWOORD.alineas.slice(1, -1).map((a) => vulIn(a, { bedrijf: b.bedrijf }));

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
            {tel && (
              <a href={tel} className="inline-flex items-center gap-2 text-[15px] font-bold" style={{ color: NAVY }}>
                <Telefoon size={15} /> <span className="hidden md:inline">Bel {naam || "ons"}</span><span className="md:hidden">Bellen</span>
              </a>
            )}
            <a href={kennismaken} className={`${knop.roze} !h-11 hidden px-5 text-[14.5px] sm:inline-flex`}>Kennismaken <Pijl size={14} /></a>
          </div>
        </div>
      </header>

      {/* De opening: de tint van React2u zelf, met de belofte van de site en het woord van de afzender. */}
      <section className="px-[6px] pt-2 md:px-6 md:pt-6 xl:px-10">
        <div className="relative mx-auto grid max-w-[1360px] gap-10 overflow-hidden rounded-[28px] px-6 pb-8 pt-10 md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:gap-14 lg:p-16 xl:p-[72px]" style={{ background: LAV }}>
          <span aria-hidden className="absolute right-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full md:h-[560px] md:w-[560px]" style={{ background: NAVY, opacity: 0.1 }} />
          <span aria-hidden className="absolute bottom-[-120px] left-[38%] hidden h-[220px] w-[220px] rounded-full lg:block" style={{ background: PINK, opacity: 0.08 }} />
          <div className="relative flex flex-col gap-6">
            <p className="m-0 flex flex-col gap-0.5 text-[14px] font-semibold sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5" style={{ color: MUTE }}>
              <span>Brochure {b.nummer}</span><span aria-hidden className="hidden sm:inline">/</span><span style={{ color: NAVY }}>{b.bedrijf}</span>
            </p>
            <div>
              <h1 className={`${kop} m-0 text-[24px] leading-[1.05] tracking-[-0.4px] md:text-[32px]`} style={{ color: NAVY }}>
                React2u
                <span className="mt-2 block text-[44px] leading-[1.02] tracking-[-1.4px] md:text-[64px] md:tracking-[-2px]">
                  Jouw mensen,<br /><span style={{ color: PINK }}>onze aandacht.</span>
                </span>
              </h1>
              <p className="m-0 mt-4 text-[18px] leading-[1.5] md:text-[21px]" style={{ color: NAVY }}><em>Zes specialismen, los af te nemen.</em></p>
            </div>
            <div className="flex max-w-[600px] flex-col gap-3 border-t pt-6" style={{ borderColor: "rgba(50,46,131,0.12)" }}>
              <p className={`${kop} m-0 text-[24px] leading-[1.25] tracking-[-0.4px] md:text-[28px]`} style={{ color: NAVY }}>
                Beste {voornaam(b.contactpersoon) || "relatie"},
              </p>
              <div className="flex flex-col gap-3 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: BODY }}>
                {bericht.map((a, i) => <p key={i} className="m-0">{a}</p>)}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="#diensten" className={knop.roze}>Bekijk de diensten <Omlaag /></a>
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

      {/* De zes diensten, als de dienstenkaarten op /werkgevers. */}
      <section id="diensten" aria-label="Onze specialismen" className="scroll-mt-[96px] bg-white">
        <div className={`${BREED} flex flex-col gap-10 py-16 md:gap-14 md:py-[112px]`}>
          <SectieKop
            eyebrow="Onze specialismen"
            titel="Zes specialismen, elk een eigen team"
            tekst="Elk specialisme neem je los af. Je kiest alleen wat bij jullie past, met dezelfde vaste casemanager en hetzelfde online dossier."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {diensten.map((d) => (
              <article key={d.slug} className="relative flex flex-col gap-4 overflow-hidden rounded-[26px] px-6 pb-7 pt-7" style={{ background: d.tint }}>
                <span aria-hidden className="absolute right-[-40px] top-[-40px] h-[120px] w-[120px] rounded-full" style={{ background: d.kleur, opacity: 0.16 }} />
                <span className={`${kop} relative flex flex-col text-[19px] leading-[1.1]`} style={{ color: NAVY }}>
                  React2u<span className="text-[30px] tracking-[-0.6px]" style={{ color: d.kleur.toLowerCase() === NAVY.toLowerCase() ? NAVY : d.kleur }}>{d.naam}<sup className="text-[13px]" style={{ color: NAVY }}>®</sup></span>
                </span>
                <span className="text-[15px] leading-[1.45]" style={{ color: NAVY }}>
                  <strong>{d.dienst}</strong><br /><em>{d.tagline}</em>
                </span>
                <span className="text-[15px] leading-[1.6]" style={{ color: BODY }}>{d.tekst}</span>
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {d.punten.map((p, j) => (
                    <li key={j} className="flex min-w-0 gap-2.5 text-[14.5px] leading-[1.45] [overflow-wrap:anywhere]" style={{ color: NAVY }}>
                      <span className="mt-0.5 shrink-0" style={{ color: d.kleur }}><Vink size={14} /></span>{p}
                    </li>
                  ))}
                </ul>
                <Link href={d.href} target="_blank" rel="noopener" className="hv-btn hv-btn-rand mt-auto inline-flex h-11 items-center gap-2 self-start rounded-full px-5 text-[14.5px] font-bold" style={{ background: "transparent" }}>
                  Lees meer op de site<Pijl size={14} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Het verhaal van Cindy en Susanne, zoals het voorwoord van de offerte. */}
      <section aria-label={VOORWOORD.kop} style={{ background: SOFT }}>
        <div className={`${BREED} grid gap-10 py-16 md:py-[112px] lg:grid-cols-12 lg:gap-8`}>
          <div className="flex flex-col gap-5 lg:col-span-5">
            <Eyebrow>Over React2u</Eyebrow>
            <h2 className={`${kop} m-0 leading-[1.08] tracking-[-0.9px]`} style={{ color: NAVY, fontSize: "clamp(32px, 4vw, 46px)" }}>{VOORWOORD.kop}</h2>
            <blockquote className="m-0 mt-2 flex flex-col gap-3">
              <span aria-hidden className={`${kop} text-[64px] leading-[0.6]`} style={{ color: PINK }}>“</span>
              <p className={`${kop} m-0 text-[20px] leading-[1.45] md:text-[22px]`} style={{ color: NAVY, fontWeight: 500 }}>{VOORWOORD.citaat}</p>
            </blockquote>
          </div>
          <div className="flex flex-col gap-5 text-[16px] leading-[1.75] md:text-[17px] lg:col-span-6 lg:col-start-7" style={{ color: BODY }}>
            {verhaal.map((a, i) => <p key={i} className="m-0">{a}</p>)}
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
      </section>

      <KlantenStrook />
      <KlantenAanHetWoord />
      <Keurmerken />

      {/* De uitnodiging, in de indigo band van de site. */}
      <section aria-label="Kennismaken" className="px-[6px] pb-2 md:px-6 md:pb-6 xl:px-10">
        <div className="relative mx-auto grid max-w-[1360px] gap-8 overflow-hidden rounded-[28px] px-6 py-10 md:rounded-[36px] md:p-14 lg:grid-cols-12 lg:items-center lg:p-16" style={{ background: NAVY }}>
          <span aria-hidden className="absolute right-[-120px] top-[-140px] h-[420px] w-[420px] rounded-full" style={{ background: "#3B378F" }} />
          <div className="relative flex flex-col gap-4 lg:col-span-7">
            <Eyebrow kleur="#B4ADF2">Kennismaken</Eyebrow>
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
