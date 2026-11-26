import Link from "next/link";
import type { IconType } from "react-icons";
import {
  LuArrowLeftRight, LuArrowRight, LuBookOpen, LuCalendarCheck, LuHandshake, LuLayoutDashboard, LuLock, LuPhone, LuRoute, LuTags,
} from "react-icons/lu";
import { WetenIcoon } from "@/components/onboarding/OnboardingWeten";
import { WETEN, type WetenOnderwerp } from "@/lib/onboardingWeten";
import { leesTijd, PORTAAL_WETEN, portaalVragen, type PortaalIcoon, type PortaalOnderwerp } from "@/lib/portaalWeten";

/*
 * Goed om te weten in Mijn React2u: de tegels per onderwerp, de inhoud van een
 * onderwerp (uitleg, in het kort, vragen en antwoorden) en de kaart op het
 * dashboard. In de vormgeving van het beheer (acard, font-heading), met de
 * kleur van het onderwerp als accent. De onderwerpen staan in
 * lib/portaalWeten.ts; wat de klant leest komt uit lib/onboardingWeten.ts.
 */

const ICOON: Record<PortaalIcoon, IconType> = {
  telefoon: LuPhone,
  agenda: LuCalendarCheck,
  slot: LuLock,
  handdruk: LuHandshake,
  labels: LuTags,
  route: LuRoute,
  wissel: LuArrowLeftRight,
  portaal: LuLayoutDashboard,
};

export function PortaalIcoonVan({ icoon, className }: { icoon: PortaalIcoon; className?: string }) {
  const I = ICOON[icoon];
  return <I className={className} />;
}

/** Eén onderwerp voor collega's als tegel. */
export function PortaalTegel({ w, n }: { w: PortaalOnderwerp; n: number }) {
  return (
    <article className="acard flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lg" data-weten={w.slug}>
      <div className="flex items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[20px]" style={{ color: w.kleur, background: w.tint }}>
          <PortaalIcoonVan icoon={w.icoon} />
        </span>
        <div className="min-w-0">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em]" style={{ color: w.kleur }}>Onderwerp {n}</p>
          <h3 className="font-heading text-[17px] font-bold leading-[1.25] text-[#1c1a4e]">
            <Link href={`/admin/weten/${w.slug}`} className="hover:text-[#312e82] hover:underline">{w.titel}</Link>
          </h3>
        </div>
      </div>
      <p className="text-[13.5px] leading-[1.55] text-black/55">{w.kort}</p>
      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        <span className="text-[12.5px] text-black/45">{w.vragen.length} vragen · ± {leesTijd(w)} min</span>
        <Link href={`/admin/weten/${w.slug}`} className="flex items-center gap-1 text-[13px] font-semibold text-[#312e82] hover:underline">
          Uitleg en vragen <LuArrowRight className="text-[13px]" />
        </Link>
      </div>
    </article>
  );
}

/** Eén onderwerp uit de onboarding van de klant als tegel, kleiner: zo leest de klant het. */
export function KlantTegel({ w, n }: { w: WetenOnderwerp; n: number }) {
  return (
    <article className="acard flex items-start gap-3.5 p-4 transition hover:-translate-y-0.5 hover:shadow-lg" data-klant-weten={w.slug}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ color: w.kleur, background: w.tint }}>
        <WetenIcoon d={w.icoon} size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-black/40">Onderwerp {n} van {WETEN.length}</p>
        <h3 className="font-heading text-[15px] font-bold leading-[1.3] text-[#1c1a4e]">
          <Link href={`/admin/weten/klant/${w.slug}`} className="hover:text-[#312e82] hover:underline">{w.titel}</Link>
        </h3>
        <p className="mt-1 text-[12.5px] text-black/45">{w.vragen.length} vragen · ± {leesTijd(w)} min</p>
      </div>
    </article>
  );
}

/** De inhoud van een onderwerp voor collega's: de uitleg en de vragen, in de kaarten van het beheer. */
export function PortaalInhoud({ w }: { w: PortaalOnderwerp }) {
  return (
    <div className="space-y-5">
      <section className="acard p-6" aria-label="Uitleg">
        <div className="space-y-3.5 text-[15px] leading-[1.7] text-[#1c1a4e]/80">
          {w.uitleg.map((a) => <p key={a}>{a}</p>)}
        </div>
      </section>
      <section className="acard p-6" aria-labelledby={`vragen-${w.slug}`}>
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em]" style={{ color: w.kleur }}>Vragen en antwoorden</p>
        <h2 id={`vragen-${w.slug}`} className="mt-1 font-heading text-[19px] font-bold text-[#312e82]">Wat collega&apos;s hierover vragen</h2>
        <div className="mt-3 border-t border-black/[0.06]">
          {w.vragen.map((v, i) => (
            <details key={v.vraag} name={`portaal-${w.slug}`} className="group border-b border-black/[0.06]" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-[14.5px] font-semibold text-[#1c1a4e] [&::-webkit-details-marker]:hidden">
                <span>{v.vraag}</span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/[0.1] bg-white text-[#312e82] transition-colors group-open:border-[#312e82] group-open:bg-[#312e82] group-open:text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                    <path d="M5 12h14" /><path d="M12 5v14" className="group-open:hidden" />
                  </svg>
                </span>
              </summary>
              <p className="max-w-[680px] pb-4 text-[14px] leading-[1.65] text-black/60">{v.antwoord}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

/** In het kort, als kaart in de kleur van het onderwerp. */
export function InHetKort({ w }: { w: PortaalOnderwerp }) {
  return (
    <section className="rounded-[16px] p-5" style={{ background: w.tint }} aria-label="In het kort">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em]" style={{ color: w.kleur }}>In het kort</p>
      <ul className="mt-2.5 space-y-2.5">
        {w.kern.map((k) => (
          <li key={k} className="flex items-start gap-2.5 text-[13.5px] font-medium leading-[1.5] text-[#1c1a4e]">
            <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white" style={{ background: w.kleur }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
            </span>
            {k}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Op het dashboard van Mijn React2u: de ingang naar Goed om te weten. */
export function WetenKaart() {
  return (
    <section className="acard flex flex-wrap items-center gap-4 px-5 py-4" id="goed-om-te-weten" aria-labelledby="goed-om-te-weten-kop">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ecebf5] text-[18px] text-[#312e82]"><LuBookOpen /></span>
      <span className="min-w-[200px] flex-1">
        <span id="goed-om-te-weten-kop" className="block text-[14.5px] font-semibold text-[#1c1a4e]">Goed om te weten</span>
        <span className="block text-[12.5px] text-black/45">
          {PORTAAL_WETEN.length} onderwerpen over hoe we werken, met {portaalVragen()} vragen en antwoorden, en de {WETEN.length} onderwerpen die de klant leest.
        </span>
      </span>
      <Link href="/admin/weten" className="abtn-ghost !px-3.5 !py-2 text-[13.5px]">Bekijken <LuArrowRight /></Link>
    </section>
  );
}
