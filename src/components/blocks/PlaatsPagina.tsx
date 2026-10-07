import Link from "next/link";
import { outfit } from "./HomeVerhaal";
import { NAVY, PINK, TEAL, BODY, MUTE, LINE, SOFT, LAV, kop, BREED, Eyebrow, Kruimels, Knop, Vink, Pijl, KopBlok, Strook } from "./Gedeeld";
import { ContactStrook, GemeentenBlok } from "./Werkgebied";
import {
  REGIOS, isGeindexeerd, plaatsHref, provincieHref, slugVan,
  type Plaats, type Provincie, type Regio,
} from "@/lib/gemeenten";
import { LABEL_INFO, REISTIJD_TEKST, SOORT_TEKST, plaatsTekst, type PlaatsTekst } from "@/lib/plaatsteksten";

/*
 * De werkgebiedpagina's (canvas: "Arbodienst in [plaats]"):
 *  - PlaatsPagina: /arbodienst-<gemeente>. Een gemeente met een eigen tekst in
 *    src/content/plaatsen.json (lib/plaatsteksten.ts) krijgt een pagina die
 *    alleen over die gemeente gaat: eigen kop en intro, een feitenkaart met
 *    streek en kernen, het werk dat er is met de verzuimhoek erbij, en de
 *    buurgemeenten. Zonder eigen tekst staat er een algemene alinea en blijft
 *    de pagina op noindex (lib/gemeenten.ts).
 *  - ProvinciePagina: /arbodienst-provincie-<provincie>.
 * Alleen voor de server: dit bestand haalt de hele tekstset (1 MB) binnen en
 * hoort dus niet in BlockRenderer of andere code die de admin in de browser laadt.
 */

/* ---------- Gemeente en provincie ---------- */

const SPECIALISMEN = [
  { naam: "Resist", href: "/resist", kleur: TEAL, sub: "Preventie en vitaliteit", tekst: "Uitval voorkomen begint vóór de ziekmelding." },
  { naam: "Recover", href: "/recover", kleur: PINK, sub: "Verzuimbegeleiding", tekst: "Van ziekmelding tot herstel, volgens de Wet verbetering poortwachter." },
  { naam: "Restart", href: "/restart", kleur: "#F19001", sub: "Re-integratie en loopbaan", tekst: "Samen weer vooruit, binnen of buiten de organisatie." },
  { naam: "Reflex", href: "/reflex", kleur: "#3AA5DD", sub: "Voor de flexbranche", tekst: "Ziektewet zonder zorgen voor uitzendbureaus en eigenrisicodragers." },
  { naam: "Ready", href: "/ready", kleur: NAVY, sub: "HR en arbeidsrecht", tekst: "Helder advies over contracten, verlof en ontslag bij ziekte." },
];

function Kop({ crumbs, titel, intro, kaart }: { crumbs: { label: string; href?: string }[]; titel: string; intro: string; kaart?: React.ReactNode }) {
  const punten = ["Contact binnen een werkdag na de ziekmelding", "Casemanager en bedrijfsarts in één team", "SBCA gecertificeerd, en via DNV ISO 9001, 27001 en 27701"];
  return (
    <section aria-label={titel} className="px-[6px] pt-4 md:px-10 md:pt-8 lg:px-16 xl:px-[120px] xl:mx-auto xl:max-w-[1440px]">
      <div className="relative grid gap-8 overflow-hidden rounded-[28px] px-5 py-9 md:gap-10 md:rounded-[36px] md:p-14 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-center xl:gap-16 xl:p-[72px]" style={{ background: LAV }}>
        <span aria-hidden className="absolute right-[-120px] top-[-150px] h-[520px] w-[520px] rounded-full" style={{ background: PINK, opacity: 0.12 }} />
        <div className="relative flex flex-col gap-6">
          <Kruimels items={crumbs} />
          <h1 className={`${kop} m-0 text-[44px] leading-[1] tracking-[-1.4px] md:text-[64px] md:tracking-[-1.8px]`} style={{ color: NAVY }}>{titel}</h1>
          <p className="m-0 max-w-[600px] text-[17px] leading-[1.65] md:text-[19px]" style={{ color: BODY }}>{intro}</p>
          <div className="flex flex-wrap gap-2.5 pt-1.5">
            <Knop href="/kennismaken">Plan een kennismaking</Knop>
            <Knop href="/verzuimabonnementen" rand>Bekijk tarieven</Knop>
          </div>
        </div>
        {kaart ?? (
          <div className="relative flex flex-col gap-4 rounded-[24px] bg-white p-6 md:gap-[18px] md:p-8">
            <span className={`${kop} text-[22px]`} style={{ color: NAVY }}>Waarom React2u</span>
            {punten.map((t) => (
              <span key={t} className="flex gap-3 text-[16px] leading-[1.5]" style={{ color: BODY }}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full" style={{ background: "#E5F5F4", color: TEAL }}><Vink size={13} /></span>{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Specialismen() {
  return (
    <section aria-label="Specialismen" style={{ background: SOFT }}>
      <div className={`${BREED} flex flex-col gap-10 py-14 md:py-24`}>
        <KopBlok eyebrow="Specialismen" kopTekst="Vijf specialismen, één casemanager" tekst="Je casemanager houdt het overzicht en schakelt de juiste specialist in." />
        <Strook n={SPECIALISMEN.length} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {SPECIALISMEN.map((s) => (
            <Link key={s.naam} href={s.href} className="hv-btn flex flex-col gap-3 rounded-[22px] border border-t-[3px] bg-white px-6 py-6" style={{ borderColor: LINE, borderTopColor: s.kleur }}>
              <span className={`${kop} text-[21px]`} style={{ color: NAVY }}>React2u {s.naam}</span>
              <span className="text-[14px] font-bold" style={{ color: s.kleur }}>{s.sub}</span>
              <span className="text-[15px] leading-[1.6]" style={{ color: BODY }}>{s.tekst}</span>
              <span className="mt-auto inline-flex items-center gap-2 pt-1.5 text-[14.5px] font-bold" style={{ color: NAVY }}>Lees meer<Pijl size={14} /></span>
            </Link>
          ))}
        </Strook>
      </div>
    </section>
  );
}

function Gemeentelinks({ titel, gemeenten, provincie }: { titel: string; gemeenten: string[]; provincie: Provincie }) {
  return (
    <section aria-label={titel} className="bg-white">
      <div className={`${BREED} flex flex-col gap-8 py-14 md:py-24`}>
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
        <Link href={provincieHref(provincie.naam)} className="inline-flex items-center gap-2.5 self-start text-[16px] font-bold underline underline-offset-[5px]"
          style={{ color: NAVY, textDecorationColor: "rgba(50,46,131,0.35)" }}>
          Alle {provincie.gemeenten.length} gemeenten in {provincie.naam}<Pijl />
        </Link>
      </div>
    </section>
  );
}

/**
 * Andere gemeenten uit dezelfde provincie: eerst de gemeenten met een eigen
 * plek in Google (zo verwijzen die naar elkaar), aangevuld met de alfabetische
 * buren, niet de geografische.
 */
function buren(plaats: Plaats, aantal = 9): string[] {
  const lijst = plaats.provincie.gemeenten;
  const i = lijst.indexOf(plaats.naam);
  const rest = [...lijst.slice(i + 1), ...lijst.slice(0, i)];
  const eerst = rest.filter((g) => isGeindexeerd(slugVan(g)));
  return [...eerst, ...rest.filter((g) => !eerst.includes(g))].slice(0, aantal);
}

/** De feiten van de gemeente in het kaartje naast de kop: wat voor plaats, welke streek en kernen, hoe ver van Eindhoven. */
function PlaatsKaart({ plaats, t }: { plaats: Plaats; t: PlaatsTekst }) {
  const rijen: { label: string; waarde: React.ReactNode }[] = [
    { label: "Wat", waarde: SOORT_TEKST[t.soort] },
    ...(t.streek ? [{ label: "Streek", waarde: t.streek }] : []),
    { label: "Provincie", waarde: <Link href={provincieHref(plaats.provincie.naam)} className="underline underline-offset-4" style={{ textDecorationColor: "rgba(50,46,131,0.35)" }}>{plaats.provincie.naam}</Link> },
    ...(t.reistijd ? [{ label: "Vanaf ons kantoor", waarde: REISTIJD_TEKST[t.reistijd] }] : []),
  ];
  return (
    <div className="relative flex flex-col rounded-[24px] bg-white p-6 md:p-8">
      <span className={`${kop} pb-2 text-[22px]`} style={{ color: NAVY }}>Over {plaats.naam}</span>
      {rijen.map((r) => (
        <div key={r.label} className="flex flex-col gap-0.5 border-t py-3" style={{ borderColor: LINE }}>
          <span className="text-[13px] font-bold" style={{ color: MUTE }}>{r.label}</span>
          <span className="text-[16px] leading-[1.5]" style={{ color: NAVY }}>{r.waarde}</span>
        </div>
      ))}
      {(t.kernen ?? []).length > 0 && (
        <div className="flex flex-col gap-2 border-t py-3" style={{ borderColor: LINE }}>
          <span className="text-[13px] font-bold" style={{ color: MUTE }}>Kernen</span>
          <span className="flex flex-wrap gap-1.5">
            {t.kernen!.map((k) => <span key={k} className="rounded-full px-3 py-1 text-[14px] font-semibold" style={{ background: SOFT, color: NAVY }}>{k}</span>)}
          </span>
        </div>
      )}
    </div>
  );
}

/** Het werk dat er in de gemeente is, met per sector wat verzuim daar kenmerkt en het label dat erbij past. */
function Sectoren({ plaats, t }: { plaats: Plaats; t: PlaatsTekst }) {
  const sectoren = t.sectoren ?? [];
  if (!sectoren.length) return null;
  return (
    <section aria-label={`Werk en verzuim in ${plaats.naam}`} style={{ background: SOFT }}>
      <div className={`${BREED} flex flex-col gap-8 py-14 md:gap-10 md:py-24`}>
        <KopBlok eyebrow={`Werk in ${plaats.naam}`} kopTekst={`Waar verzuim in ${plaats.naam} vandaan komt`} tekst="Per sector kijken we naar wat uitval veroorzaakt en welk specialisme daarbij past. Je casemanager schakelt de juiste specialist in." />
        <Strook n={sectoren.length} className={`grid gap-4 md:grid-cols-2 ${sectoren.length >= 4 ? "lg:grid-cols-4" : sectoren.length === 3 ? "lg:grid-cols-3" : ""}`}>
          {sectoren.map((sct) => {
            const l = LABEL_INFO[sct.label];
            return (
              <div key={sct.naam} className="flex flex-col gap-3 rounded-[22px] border border-t-[3px] bg-white px-6 py-6" style={{ borderColor: LINE, borderTopColor: l.kleur }}>
                <span className={`${kop} text-[21px] leading-[1.2]`} style={{ color: NAVY }}>{sct.naam}</span>
                <span className="text-[15.5px] leading-[1.6]" style={{ color: BODY }}>{sct.verzuim}</span>
                {/* Naam en omschrijving onder elkaar: naast elkaar braken ze in een smalle kaart per stuk af. */}
                <Link href={l.href} className="mt-auto grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-x-2.5 border-t pt-4" style={{ borderColor: LINE, color: NAVY }}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.kleur }} />
                  <span className="flex flex-col">
                    <span className="text-[14.5px] font-bold leading-[1.3]">React2u {l.naam}</span>
                    <span className="text-[13px] font-semibold leading-[1.35]" style={{ color: MUTE }}>{l.wat}</span>
                  </span>
                  <Pijl size={14} />
                </Link>
              </div>
            );
          })}
        </Strook>
      </div>
    </section>
  );
}

export function PlaatsPagina({ plaats }: { plaats: Plaats }) {
  const t = plaatsTekst(plaats.slug);
  const alinea = t?.tekst ?? [
    `React2u begeleidt werkgevers in ${plaats.naam} en de rest van ${plaats.provincie.naam} bij verzuim, preventie en re-integratie. Je krijgt één vaste casemanager die je organisatie en je mensen kent, en die samenwerkt met de bedrijfsarts.`,
    `Gesprekken met werknemers vinden plaats op locatie of online. Afspraken, rapportages en termijnen staan in één online dossier, zodat je altijd weet waar een traject staat.`,
  ];
  // Buren uit de eigen tekst (echt aangrenzend), anders de alfabetische buren.
  const eigenBuren = (t?.buren ?? []).filter((b) => plaats.provincie.gemeenten.includes(b) || REGIOS.some((r) => r.provincies.some((p) => p.gemeenten.includes(b))));
  const burenLijst = eigenBuren.length ? eigenBuren : buren(plaats);
  return (
    <div className={`hv ${outfit.variable} bg-white`}>
      <Kop
        crumbs={[{ label: "Home", href: "/" }, { label: "Werkgebied", href: "/sitemap#werkgebied" }, { label: plaats.provincie.naam, href: provincieHref(plaats.provincie.naam) }, { label: plaats.naam }]}
        titel={`Arbodienst in ${plaats.naam}`}
        intro={t?.intro || `Persoonlijke verzuimbegeleiding voor werkgevers in ${plaats.naam}. Je krijgt één vaste casemanager die je organisatie kent, van de eerste ziektedag tot herstel.`}
        kaart={t ? <PlaatsKaart plaats={plaats} t={t} /> : undefined}
      />
      <section aria-label={`Verzuim in ${plaats.naam}`} className="bg-white">
        <div className={`${BREED} grid gap-8 py-14 md:py-24 lg:grid-cols-12 lg:gap-6`}>
          <div className="flex flex-col gap-4 lg:col-span-5">
            <Eyebrow>Verzuim in {plaats.naam}</Eyebrow>
            <h2 className={`${kop} m-0 text-[34px] leading-[1.1] tracking-[-0.9px] md:text-[42px]`} style={{ color: NAVY }}>{t?.kop || "Een arbodienst die je regio kent"}</h2>
          </div>
          <div className="flex flex-col gap-4 lg:col-span-6 lg:col-start-7">
            {alinea.map((p, i) => <p key={i} className="m-0 text-[17px] leading-[1.75]" style={{ color: BODY }}>{p}</p>)}
          </div>
        </div>
      </section>
      {t?.sectoren?.length ? <Sectoren plaats={plaats} t={t} /> : <Specialismen />}
      <Gemeentelinks titel={eigenBuren.length ? `Gemeenten rond ${plaats.naam}` : `Meer gemeenten in ${plaats.provincie.naam}`} gemeenten={burenLijst} provincie={plaats.provincie} />
      <ContactStrook titel={t ? `Werkgever in ${plaats.naam}?` : "Benieuwd wat we voor je kunnen doen?"} tekst="Plan een kennismaking of bel ons direct. We denken graag met je mee." />
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
        <div className={`${BREED} flex flex-col gap-8 py-14 md:py-24`}>
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
