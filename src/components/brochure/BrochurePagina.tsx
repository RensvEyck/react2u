import Link from "next/link";
import { Caveat, Outfit } from "next/font/google";
import Logo from "@/components/site/Logo";
import { BODY, BREED, Eyebrow, Keurmerken, KlantenAanHetWoord, KlantenStrook, kop, LAV, LINE, MUTE, NAVY, PINK, Pijl, SOFT, Vink } from "@/components/blocks/Gedeeld";
import type { ContactInfo } from "@/lib/content";
import type { Certificate } from "@/lib/nav";
import { BERICHT_STANDAARD, BROCHURE_EMAIL, type BrochurePubliek } from "@/lib/brochures";
import type { Dienst } from "@/lib/brochureHuisstijl";
import { halveKolom, prijsRijen, type Aansluiting, type PrijsGroep, type Prijslijst } from "@/lib/brochurePrijslijst";
import { datumLang, vulIn } from "@/lib/offertes";
import { ondertekenaarRegel, VOORWOORD } from "@/lib/offerteVoorwoord";

/*
 * De brochurepagina (/brochure/<token>, migratie 0030): alles wat React2u
 * voor één prospect kan betekenen, in de vormgeving van de site. Het
 * persoonlijke woord van de afzender, de zes diensten als de dienstenkaarten
 * op /werkgevers, de prijslijst van dit jaar zoals op papier, het verhaal van
 * Cindy en Susanne, de klanten en keurmerken, en overal de uitnodiging om te
 * bellen. Geen keuzes en geen ondertekening: dat komt in de offerte.
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
                  // Op de telefoon de eenheid onder de titel: naast elkaar braken ze allebei af.
                  <span className="flex flex-col gap-0.5 pb-1 pt-5 text-[12.5px] font-bold uppercase tracking-[1.1px] sm:flex-row sm:items-baseline sm:justify-between sm:gap-4" style={{ color: g.tekst }}>
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
    <section id="tarieven" aria-label={`Tarieven ${p.jaar}`} className="scroll-mt-[96px] bg-white px-[6px] pb-16 md:px-6 md:pb-[112px] xl:px-10">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-10 rounded-[28px] px-[14px] py-10 sm:px-6 md:gap-12 md:rounded-[36px] md:p-14 lg:p-16 xl:p-[72px]" style={{ background: SOFT }}>
        <div className="px-2 sm:px-0">
          <SectieKop
            eyebrow={`Tarieven ${p.jaar}`}
            titel="Heldere prijzen, vooraf bekend"
            tekst={`Alle tarieven van ${p.jaar} op een rij, precies zoals op onze prijslijst. Wat het voor ${bedrijf} kost, zetten we graag in een voorstel op maat.`}
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

        <div className="flex flex-col gap-4 border-t pt-6 md:flex-row md:items-center md:justify-between md:gap-8" style={{ borderColor: "rgba(50,46,131,0.12)" }}>
          <p className="m-0 max-w-[720px] px-2 text-[14px] leading-[1.6] sm:px-0" style={{ color: MUTE }}>
            {p.geldigheid} Prijswijzigingen voorbehouden.
          </p>
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
  // Het voorwoord zonder de zinnen over "dit voorstel": dat komt pas met de offerte.
  const verhaal = VOORWOORD.alineas.slice(1, -1).map((a) => vulIn(a, { bedrijf: b.bedrijf }));
  const tarievenVan = new Set(prijslijst.groepen.map((g) => g.slug).filter(Boolean));

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
                <span className="text-[15px] leading-[1.6]" style={{ color: BODY }}>{d.omschrijving}</span>
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {d.punten.map((p, j) => (
                    <li key={j} className="flex min-w-0 gap-2.5 text-[14.5px] leading-[1.45] [overflow-wrap:anywhere]" style={{ color: NAVY }}>
                      <span className="mt-0.5 shrink-0" style={{ color: d.kleur }}><Vink size={14} /></span>{p}
                    </li>
                  ))}
                </ul>
                <span className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3">
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
            ))}
          </div>
        </div>
      </section>

      <Tarieven p={prijslijst} bedrijf={b.bedrijf} offerte={offerte} />

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
