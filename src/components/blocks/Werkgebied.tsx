import Link from "next/link";
import { outfit } from "./HomeVerhaal";
import { NAVY, PINK, TEAL, BODY, MUTE, LINE, SOFT, LAV, kop, BREED, Eyebrow, Kruimels, Knop, Vink, Pijl, KopBlok } from "./Gedeeld";
import {
  REGIOS, AANTAL_GEMEENTEN, AANTAL_PROVINCIES, plaatsHref, provincieHref, slugVan,
  type Plaats, type Provincie, type Regio,
} from "@/lib/gemeenten";
import lokaleTeksten from "@/content/plaatsen.json";

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * Werkgebied (canvas: "Sitemap" en "Arbodienst in [plaats]"):
 *  - SitemapOverzicht: alle pagina's per onderwerp en alle gemeenten per
 *    regio en provincie (blok `sitemapOverzicht` op /sitemap);
 *  - PlaatsPagina: /arbodienst-<gemeente>;
 *  - ProvinciePagina: /arbodienst-provincie-<provincie>.
 * Een gemeente kan een eigen tekst krijgen in src/content/plaatsen.json
 * (sleutel = slug). Zonder eigen tekst staat er een algemene alinea.
 */

const LOKAAL = lokaleTeksten as Record<string, { tekst?: string[] }>;

function ContactStrook({ titel, tekst }: { titel: string; tekst: string }) {
  return (
    <section aria-label="Contact" className="bg-white">
      <div className={`${BREED} pb-20 md:pb-[112px]`}>
        <div className="flex flex-col gap-8 rounded-[28px] p-8 md:flex-row md:items-center md:justify-between md:rounded-[32px] md:px-14 md:py-12" style={{ background: NAVY }}>
          <div className="flex flex-col gap-2.5">
            <span className={`${kop} text-[28px] leading-[1.15] md:text-[32px]`} style={{ color: "#ffffff" }}>{titel}</span>
            <span className="text-[17px] leading-[1.6]" style={{ color: "rgba(255,255,255,0.75)" }}>{tekst}</span>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Link href="/kennismaken" className="hv-btn hv-btn-roze inline-flex h-[54px] items-center gap-2.5 rounded-full px-6 text-[15px] font-bold">Plan een kennismaking<Pijl /></Link>
            <a href="tel:+31856205800" className="inline-flex h-[54px] items-center rounded-full bg-white px-6 text-[15px] font-bold" style={{ color: NAVY }}>085 620 58 00</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Sitemap ---------- */

function GemeentenBlok({ provincie, regio }: { provincie: Provincie; regio: Regio }) {
  return (
    <div id={slugVan(provincie.naam)} className="flex scroll-mt-28 flex-col gap-[18px] rounded-[24px] border bg-white px-6 py-7 md:px-8" style={{ borderColor: LINE }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={provincieHref(provincie.naam)} className={`${kop} flex items-center gap-3 text-[20px] md:text-[22px]`} style={{ color: NAVY }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: regio.kleur }} />Arbodienst in {provincie.naam}
        </Link>
        <span className="rounded-full px-3 py-1.5 text-[13.5px] font-bold" style={{ background: SOFT, color: NAVY }}>{provincie.gemeenten.length} gemeenten</span>
      </div>
      <ul className="m-0 list-none columns-2 gap-6 p-0 sm:columns-3 lg:columns-6">
        {provincie.gemeenten.map((g) => (
          <li key={g} className="break-inside-avoid py-[5px] text-[15px] leading-[1.4]">
            <Link href={plaatsHref(g)} title={`Arbodienst ${g}`} className="hover:underline" style={{ color: BODY }}>{g}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SitemapOverzicht({ d, asH1 }: { d: any; asH1?: boolean }) {
  const H = asH1 ? "h1" : "h2";
  const groepen: any[] = d.groups || [];
  const stats = [
    [String(AANTAL_GEMEENTEN), "gemeenten"], [String(AANTAL_PROVINCIES), "provincies"], ["5", "specialismen"], ["1", "vaste casemanager"],
  ];
  return (
    <div className={`hv ${outfit.variable} bg-white`} style={{ color: NAVY }}>
      <section aria-label="Sitemap" className="px-[6px] pt-4 md:px-10 md:pt-8 lg:px-[120px] xl:mx-auto xl:max-w-[1440px]">
        <div className="relative grid gap-10 overflow-hidden rounded-[28px] px-6 py-10 md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center lg:gap-16 lg:p-[72px]" style={{ background: LAV }}>
          <span aria-hidden className="absolute right-[-120px] top-[-150px] h-[520px] w-[520px] rounded-full" style={{ background: NAVY, opacity: 0.07 }} />
          <div className="relative flex flex-col gap-6">
            <Kruimels items={[{ label: "Home", href: "/" }, { label: "Sitemap" }]} />
            <H className={`${kop} m-0 text-[48px] leading-[1] tracking-[-1.6px] md:text-[68px] md:tracking-[-1.8px]`}>{d.heading || "Sitemap"}</H>
            {d.text && <p className="m-0 max-w-[600px] text-[17px] leading-[1.65] md:text-[19px]" style={{ color: BODY }}>{d.text}</p>}
            <div className="flex flex-wrap gap-2.5 pt-1.5"><Knop href="#werkgebied" rand>Naar het werkgebied</Knop></div>
          </div>
          <div className="relative grid grid-cols-2 gap-px overflow-hidden rounded-[24px]" style={{ background: LINE }}>
            {stats.map(([g, l]) => (
              <div key={l} className="flex flex-col gap-1 bg-white px-6 py-6 md:px-7">
                <span className={`${kop} text-[36px] leading-none tracking-[-1px] md:text-[40px]`}>{g}</span>
                <span className="text-[14.5px]" style={{ color: MUTE }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-label="Categorieën" className={`${BREED} flex flex-col gap-10 pb-10 pt-20 md:gap-11 md:pt-[104px]`}>
        <KopBlok eyebrow="Categorieën" kopTekst="Alle pagina’s per onderwerp" tekst="Van de specialismen voor werkgevers tot de informatie voor zieke werknemers." />
        <div className="grid items-start gap-5 md:grid-cols-2 lg:grid-cols-3">
          {groepen.map((g, i) => (
            <div key={i} className="flex flex-col gap-3.5 rounded-[24px] border bg-white px-7 pb-5 pt-7" style={{ borderColor: LINE }}>
              <span className="flex items-baseline justify-between">
                <span className={`${kop} text-[22px]`}>{g.title}</span>
                <span className="text-[13.5px] font-bold" style={{ color: MUTE }}>{(g.links || []).length}</span>
              </span>
              <div className="flex flex-col">
                {(g.links || []).map((l: any, j: number) => {
                  const pdf = /\.pdf$/i.test(l.href);
                  return (
                    <a key={j} href={l.href} target={pdf ? "_blank" : undefined} rel={pdf ? "noopener" : undefined}
                      className="flex items-center justify-between gap-3 border-t py-[11px] text-[16px] font-semibold" style={{ borderColor: LINE, color: NAVY }}>
                      {l.label}<span className="flex" style={{ color: MUTE }}><Pijl size={15} /></span>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="werkgebied" aria-label="Werkgebied" className="scroll-mt-28" style={{ background: SOFT }}>
        <div className={`${BREED} flex flex-col gap-5 py-16 md:py-[104px]`}>
          <KopBlok eyebrow="Werkgebied" kopTekst="Arbodienst in jouw gemeente" tekst={d.geoText || "We begeleiden werkgevers in heel Nederland. Kies je gemeente voor meer over onze aanpak bij jou in de buurt."} />
          <nav aria-label="Provincies" className="flex flex-wrap gap-2 pb-1 pt-2">
            {REGIOS.flatMap((r) => r.provincies.map((p) => (
              <a key={p.naam} href={`#${slugVan(p.naam)}`} className="inline-flex h-10 items-center gap-2 rounded-full border bg-white px-4 text-[14.5px] font-semibold" style={{ borderColor: LINE, color: NAVY }}>
                <span className="h-2 w-2 rounded-full" style={{ background: r.kleur }} />{p.naam}
              </a>
            )))}
          </nav>
          {REGIOS.map((r) => (
            <div key={r.regio} className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 pt-6">
                <span className="h-3 w-3 rounded-full" style={{ background: r.kleur }} />
                <h3 className={`${kop} m-0 text-[24px] tracking-[-0.5px] md:text-[28px]`}>{r.regio}</h3>
                <span className="text-[15px]" style={{ color: MUTE }}>
                  {r.provincies.length} provincies, {r.provincies.reduce((n, p) => n + p.gemeenten.length, 0)} gemeenten
                </span>
              </div>
              {r.provincies.map((p) => <GemeentenBlok key={p.naam} provincie={p} regio={r} />)}
            </div>
          ))}
        </div>
      </section>
      <div className="pt-20 md:pt-[104px]" />
      <ContactStrook titel="Vragen over verzuim in jouw regio?" tekst="Bel of mail ons. We denken graag met je mee." />
    </div>
  );
}

/* ---------- Gemeente en provincie ---------- */

const SPECIALISMEN = [
  { naam: "Resist", href: "/resist", kleur: PINK, sub: "Preventie en vitaliteit", tekst: "Uitval voorkomen begint vóór de ziekmelding." },
  { naam: "Recover", href: "/recover", kleur: TEAL, sub: "Verzuimbegeleiding", tekst: "Van ziekmelding tot herstel, volgens de Wet verbetering poortwachter." },
  { naam: "Restart", href: "/restart", kleur: "#F19001", sub: "Re-integratie en loopbaan", tekst: "Samen weer vooruit, binnen of buiten de organisatie." },
  { naam: "Reflex", href: "/reflex", kleur: "#3AA5DD", sub: "Voor de flexbranche", tekst: "Ziektewet zonder zorgen voor uitzendbureaus en eigenrisicodragers." },
  { naam: "Ready", href: "/ready", kleur: NAVY, sub: "HR en arbeidsrecht", tekst: "Helder advies over contracten, verlof en ontslag bij ziekte." },
];

function Kop({ crumbs, titel, intro }: { crumbs: { label: string; href?: string }[]; titel: string; intro: string }) {
  const punten = ["Contact binnen een werkdag na de ziekmelding", "Casemanager en bedrijfsarts in één team", "SBCA gecertificeerd, en via DNV ISO 9001, 27001 en 27701"];
  return (
    <section aria-label={titel} className="px-[6px] pt-4 md:px-10 md:pt-8 lg:px-[120px] xl:mx-auto xl:max-w-[1440px]">
      <div className="relative grid gap-10 overflow-hidden rounded-[28px] px-6 py-10 md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center lg:gap-16 lg:p-[72px]" style={{ background: LAV }}>
        <span aria-hidden className="absolute right-[-120px] top-[-150px] h-[520px] w-[520px] rounded-full" style={{ background: PINK, opacity: 0.12 }} />
        <div className="relative flex flex-col gap-6">
          <Kruimels items={crumbs} />
          <h1 className={`${kop} m-0 text-[44px] leading-[1] tracking-[-1.4px] md:text-[64px] md:tracking-[-1.8px]`} style={{ color: NAVY }}>{titel}</h1>
          <p className="m-0 max-w-[600px] text-[17px] leading-[1.65] md:text-[19px]" style={{ color: BODY }}>{intro}</p>
          <div className="flex flex-wrap gap-2.5 pt-1.5">
            <Knop href="/kennismaken">Plan een kennismaking</Knop>
            <Knop href="/werkgevers#tarieven" rand>Bekijk tarieven</Knop>
          </div>
        </div>
        <div className="relative flex flex-col gap-[18px] rounded-[24px] bg-white p-7 md:p-8">
          <span className={`${kop} text-[22px]`} style={{ color: NAVY }}>Waarom React2u</span>
          {punten.map((t) => (
            <span key={t} className="flex gap-3 text-[16px] leading-[1.5]" style={{ color: BODY }}>
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full" style={{ background: "#E5F5F4", color: TEAL }}><Vink size={13} /></span>{t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Specialismen() {
  return (
    <section aria-label="Specialismen" style={{ background: SOFT }}>
      <div className={`${BREED} flex flex-col gap-10 py-20 md:py-24`}>
        <KopBlok eyebrow="Specialismen" kopTekst="Vijf specialismen, één casemanager" tekst="Je casemanager houdt het overzicht en schakelt de juiste specialist in." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {SPECIALISMEN.map((s) => (
            <Link key={s.naam} href={s.href} className="hv-btn flex flex-col gap-3 rounded-[22px] border border-t-[3px] bg-white px-6 py-6" style={{ borderColor: LINE, borderTopColor: s.kleur }}>
              <span className={`${kop} text-[21px]`} style={{ color: NAVY }}>React2u {s.naam}</span>
              <span className="text-[14px] font-bold" style={{ color: s.kleur }}>{s.sub}</span>
              <span className="text-[15px] leading-[1.6]" style={{ color: BODY }}>{s.tekst}</span>
              <span className="mt-auto inline-flex items-center gap-2 pt-1.5 text-[14.5px] font-bold" style={{ color: NAVY }}>Lees meer<Pijl size={14} /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Gemeentelinks({ titel, gemeenten, provincie }: { titel: string; gemeenten: string[]; provincie: Provincie }) {
  return (
    <section aria-label={titel} className="bg-white">
      <div className={`${BREED} flex flex-col gap-8 py-20 md:py-24`}>
        <div className="flex flex-col gap-4">
          <Eyebrow>Werkgebied</Eyebrow>
          <h2 className={`${kop} m-0 text-[34px] leading-[1.1] tracking-[-0.9px] md:text-[42px]`} style={{ color: NAVY }}>{titel}</h2>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {gemeenten.map((g) => (
            <Link key={g} href={plaatsHref(g)} className="inline-flex h-11 items-center rounded-full border bg-white px-[18px] text-[15px] font-semibold" style={{ borderColor: LINE, color: NAVY }}>
              Arbodienst {g}
            </Link>
          ))}
        </div>
        <Link href={`/sitemap#${slugVan(provincie.naam)}`} className="inline-flex items-center gap-2.5 self-start text-[16px] font-bold underline underline-offset-[5px]"
          style={{ color: NAVY, textDecorationColor: "rgba(50,46,131,0.35)" }}>
          Alle {provincie.gemeenten.length} gemeenten in {provincie.naam}<Pijl />
        </Link>
      </div>
    </section>
  );
}

/** Andere gemeenten uit dezelfde provincie: de alfabetische buren, niet de geografische. */
function buren(plaats: Plaats, aantal = 9): string[] {
  const lijst = plaats.provincie.gemeenten;
  const i = lijst.indexOf(plaats.naam);
  const rest = [...lijst.slice(i + 1), ...lijst.slice(0, i)];
  return rest.slice(0, aantal);
}

export function PlaatsPagina({ plaats }: { plaats: Plaats }) {
  const eigen = LOKAAL[plaats.slug]?.tekst?.filter(Boolean) ?? [];
  const alinea = eigen.length
    ? eigen
    : [
        `React2u begeleidt werkgevers in ${plaats.naam} en de rest van ${plaats.provincie.naam} bij verzuim, preventie en re-integratie. Je krijgt één vaste casemanager die je organisatie en je mensen kent, en die samenwerkt met de bedrijfsarts.`,
        `Gesprekken met werknemers vinden plaats op locatie of online. Afspraken, rapportages en termijnen staan in één online dossier, zodat je altijd weet waar een traject staat.`,
      ];
  return (
    <div className={`hv ${outfit.variable} bg-white`}>
      <Kop
        crumbs={[{ label: "Home", href: "/" }, { label: "Werkgebied", href: "/sitemap#werkgebied" }, { label: plaats.provincie.naam, href: provincieHref(plaats.provincie.naam) }, { label: plaats.naam }]}
        titel={`Arbodienst in ${plaats.naam}`}
        intro={`Persoonlijke verzuimbegeleiding voor werkgevers in ${plaats.naam}. Je krijgt één vaste casemanager die je organisatie kent, van de eerste ziektedag tot herstel.`}
      />
      <section aria-label={`Verzuim in ${plaats.naam}`} className="bg-white">
        <div className={`${BREED} grid gap-8 py-20 md:py-24 lg:grid-cols-12 lg:gap-6`}>
          <div className="flex flex-col gap-4 lg:col-span-5">
            <Eyebrow>Verzuim in {plaats.naam}</Eyebrow>
            <h2 className={`${kop} m-0 text-[34px] leading-[1.1] tracking-[-0.9px] md:text-[42px]`} style={{ color: NAVY }}>Een arbodienst die je regio kent</h2>
          </div>
          <div className="flex flex-col gap-4 lg:col-span-6 lg:col-start-7">
            {alinea.map((p, i) => <p key={i} className="m-0 text-[17px] leading-[1.75]" style={{ color: BODY }}>{p}</p>)}
          </div>
        </div>
      </section>
      <Specialismen />
      <Gemeentelinks titel={`Meer gemeenten in ${plaats.provincie.naam}`} gemeenten={buren(plaats)} provincie={plaats.provincie} />
      <ContactStrook titel="Benieuwd wat we voor je kunnen doen?" tekst="Plan een kennismaking of bel ons direct. We denken graag met je mee." />
    </div>
  );
}

export function ProvinciePagina({ provincie, regio }: { provincie: Provincie; regio: Regio }) {
  return (
    <div className={`hv ${outfit.variable} bg-white`}>
      <Kop
        crumbs={[{ label: "Home", href: "/" }, { label: "Werkgebied", href: "/sitemap#werkgebied" }, { label: provincie.naam }]}
        titel={`Arbodienst in ${provincie.naam}`}
        intro={`Persoonlijke verzuimbegeleiding voor werkgevers in alle ${provincie.gemeenten.length} gemeenten van ${provincie.naam}. Eén vaste casemanager, korte lijnen en alles in één online dossier.`}
      />
      <Specialismen />
      <section aria-label={`Gemeenten in ${provincie.naam}`} className="bg-white">
        <div className={`${BREED} flex flex-col gap-8 py-20 md:py-24`}>
          <div className="flex flex-col gap-4">
            <Eyebrow>{regio.regio}</Eyebrow>
            <h2 className={`${kop} m-0 text-[34px] leading-[1.1] tracking-[-0.9px] md:text-[42px]`} style={{ color: NAVY }}>Alle gemeenten in {provincie.naam}</h2>
          </div>
          <GemeentenBlok provincie={provincie} regio={regio} />
        </div>
      </section>
      <ContactStrook titel={`Werkgever in ${provincie.naam}?`} tekst="Plan een kennismaking of bel ons direct. We denken graag met je mee." />
    </div>
  );
}
