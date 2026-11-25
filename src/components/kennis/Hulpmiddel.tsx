import Link from "next/link";
import { LuCalendarCheck, LuListChecks, LuShieldAlert } from "react-icons/lu";
import { outfit } from "@/components/blocks/HomeVerhaal";
import { NAVY, BODY, MUTE, LINE, SOFT, LAV, kop, BREED, Eyebrow, Kruimels, Pijl } from "@/components/blocks/Gedeeld";
import { GidsKaart } from "@/components/blocks/Gids";
import { DIENST_KLEUR, DIENST_TINT, gidsVoor, type GidsDienst } from "@/lib/gidsen";
import { DIENSTEN } from "@/lib/organisatie";
import { HULPMIDDELEN, type Hulpmiddel } from "@/lib/kennis";
import { inkt } from "@/lib/kleur";

/*
 * De vaste onderdelen van een hulpmiddelpagina in de kennisbank: de kop met
 * kruimelpad en de vraag als H1, de kaart in lijsten, en de voet met de gids
 * die erbij hoort, de andere hulpmiddelen en "Zo helpt React2u". Het
 * hulpmiddel zelf (de planner, de check, het formulier) staat ertussen.
 */

export const HULPMIDDEL_ICOON = {
  planner: LuCalendarCheck,
  check: LuShieldAlert,
  checklist: LuListChecks,
} as const;

export function HulpmiddelKaart({ h, compact = false }: { h: Hulpmiddel; compact?: boolean }) {
  const Icoon = HULPMIDDEL_ICOON[h.soort];
  return (
    <Link href={`/kennis/${h.slug}`} className={`hv-btn relative flex flex-col gap-3 overflow-hidden rounded-[24px] border bg-white ${compact ? "p-5" : "p-6 md:p-7"}`} style={{ borderColor: LINE, color: NAVY }}>
      <span className="grid h-12 w-12 place-items-center rounded-full" style={{ background: "#E5F5F4", color: "#007A6D" }}><Icoon size={22} aria-hidden /></span>
      <span className="text-[13px] font-bold uppercase tracking-[1.2px]" style={{ color: MUTE }}>Hulpmiddel · {h.naam}</span>
      <span className={`${kop} ${compact ? "text-[19px]" : "text-[21px] md:text-[22px]"} leading-[1.22] tracking-[-0.3px]`}>{h.vraag}</span>
      {!compact && <span className="text-[15px] leading-[1.55]" style={{ color: BODY }}>{h.kort}</span>}
      <span className="mt-auto flex items-center gap-2 pt-2 text-[14.5px] font-bold">{h.soort === "checklist" ? "Vraag de checklist aan" : h.soort === "planner" ? "Open de planner" : "Doe de check"}<Pijl size={14} /></span>
    </Link>
  );
}

export function HulpmiddelKop({ h, children }: { h: Hulpmiddel; children?: React.ReactNode }) {
  const Icoon = HULPMIDDEL_ICOON[h.soort];
  return (
    <div className={`hv ${outfit.variable} bg-white`} style={{ color: NAVY }}>
      <section aria-label={h.naam} className="px-[6px] pt-4 md:px-10 md:pt-8 xl:mx-auto xl:max-w-[1280px]">
        <div className="relative overflow-hidden rounded-[28px] px-6 py-10 md:rounded-[36px] md:p-14 lg:p-16" style={{ background: LAV }}>
          <span aria-hidden className="absolute right-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full md:h-[520px] md:w-[520px]" style={{ background: NAVY, opacity: 0.07 }} />
          <div className="relative flex max-w-[820px] flex-col gap-5 md:gap-6">
            <Kruimels items={[{ label: "Home", href: "/" }, { label: "Werkgevers", href: "/werkgevers" }, { label: "Kennis", href: "/kennis" }, { label: h.naam }]} />
            <span className="inline-flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: "#007A6D" }}>
              <Icoon size={16} aria-hidden />Hulpmiddel
            </span>
            <h1 className={`${kop} m-0 text-[34px] leading-[1.05] tracking-[-1.1px] hyphens-auto [overflow-wrap:anywhere] md:text-[50px] md:tracking-[-1.5px]`} lang="nl">{h.vraag}</h1>
            <p className="m-0 max-w-[720px] text-[18px] leading-[1.6] md:text-[20px]" style={{ color: BODY }}>{h.kort}</p>
            {children}
          </div>
        </div>
      </section>
    </div>
  );
}

/** De voet: de gids die erbij hoort, de andere hulpmiddelen en de dienst. */
export function HulpmiddelVoet({ h, dienst }: { h: Hulpmiddel; dienst: GidsDienst }) {
  const gids = gidsVoor(h.gids);
  const andere = HULPMIDDELEN.filter((x) => x.slug !== h.slug);
  const d = DIENSTEN[dienst];
  const c = DIENST_KLEUR[dienst];
  const t = DIENST_TINT[dienst];
  return (
    <div className={`hv ${outfit.variable} bg-white`}>
      <section aria-label="Verder lezen" style={{ background: SOFT }}>
        <div className={`${BREED} grid gap-8 py-14 md:py-[96px] lg:grid-cols-12 lg:gap-6`}>
          <div className="flex flex-col gap-4 lg:col-span-4">
            <Eyebrow kleur="#007A6D">Verder lezen</Eyebrow>
            <h2 className={`${kop} m-0 text-[30px] leading-[1.1] tracking-[-0.8px] md:text-[38px]`} style={{ color: NAVY }}>De uitleg achter dit hulpmiddel</h2>
            <p className="m-0 text-[16px] leading-[1.65]" style={{ color: BODY }}>De gids legt de regels uit; de andere hulpmiddelen helpen je het dossier op orde te houden.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-3">
            {gids && <div className="flex sm:col-span-2 lg:col-span-1"><GidsKaart gids={gids} compact /></div>}
            {andere.map((x) => <HulpmiddelKaart key={x.slug} h={x} compact />)}
          </div>
        </div>
      </section>
      <section aria-label="Zo helpt React2u" className="px-[6px] pt-6 md:px-10 md:pt-10 xl:mx-auto xl:max-w-[1280px]">
        <div className="relative grid gap-8 overflow-hidden rounded-[28px] px-6 py-10 md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center lg:gap-16" style={{ background: t }}>
          <span aria-hidden className="absolute bottom-[-200px] left-[-140px] h-[460px] w-[460px] rounded-full" style={{ background: c, opacity: 0.1 }} />
          <div className="relative flex flex-col gap-4">
            <span className="inline-flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: inkt(c) }}>
              <span className="h-2 w-2 rounded-full" style={{ background: c }} />Zo helpt React2u
            </span>
            <h2 className={`${kop} m-0 text-[30px] leading-[1.1] tracking-[-0.8px] md:text-[38px]`} style={{ color: NAVY }}>Liever iemand die het dossier voor je bewaakt?</h2>
            <p className="m-0 max-w-[600px] text-[16.5px] leading-[1.7]" style={{ color: BODY }}>Een vaste casemanager houdt elke termijn in de gaten, de bedrijfsarts doet de beoordeling en het dossier is altijd compleet voor UWV. Ook als je nu nog bij een andere arbodienst zit.</p>
          </div>
          <div className="relative flex flex-col gap-2.5 rounded-[24px] bg-white p-6 md:p-7">
            <span className={`${kop} text-[19px] leading-[1.15]`} style={{ color: NAVY }}>React2u <span style={{ color: inkt(c) }}>{d.naam}</span></span>
            <span className="text-[15px] font-bold" style={{ color: NAVY }}>{d.nl}</span>
            <Link href={`/${dienst}`} className="hv-btn hv-btn-roze mt-2 inline-flex h-[52px] items-center justify-center gap-2.5 rounded-full px-6 text-[15px] font-bold">Meer over React2u {d.naam}<Pijl /></Link>
            <Link href="/kennismaken" className="hv-btn hv-btn-rand inline-flex h-[52px] items-center justify-center gap-2.5 rounded-full px-6 text-[15px] font-bold">Kennismaken<Pijl /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
