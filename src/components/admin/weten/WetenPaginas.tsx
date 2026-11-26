import Link from "next/link";
import { LuArrowLeft, LuArrowRight } from "react-icons/lu";
import { outfit } from "@/components/onboarding/OnboardingDelen";
import { WetenIcoon, WetenInhoud } from "@/components/onboarding/OnboardingWeten";
import { aantalVragen, leesMinuten, WETEN, wetenNa, wetenNummer, wetenVoor, wetenVoorgaand } from "@/lib/onboardingWeten";
import { leesTijd, PORTAAL_WETEN, portaalVragen, portaalWetenNa, portaalWetenVoor, portaalWetenVoorgaand } from "@/lib/portaalWeten";
import { InHetKort, KlantTegel, PortaalIcoonVan, PortaalInhoud, PortaalTegel } from "./Weten";

/*
 * De drie schermen van Goed om te weten in Mijn React2u, los van de routes
 * (die doen alleen de toegang en de 404): het overzicht met de tegels, één
 * onderwerp voor collega's, en één onderwerp zoals de klant het leest.
 */

const TERUG = "inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#312e82] hover:underline";
const EYEBROW = "text-[11.5px] font-semibold uppercase tracking-[0.06em]";

export function WetenOverzicht() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Goed om te weten</h1>
        <p className="max-w-[640px] text-[14.5px] leading-[1.6] text-black/50">
          Hoe we werken, per onderwerp: een korte uitleg, de punten om te onthouden en de vragen die collega&apos;s stellen. Daaronder wat de klant leest in zijn onboarding, zodat je weet wat hem al is verteld.
        </p>
      </div>

      <section aria-labelledby="zo-werken-we" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="zo-werken-we" className="font-heading text-[18px] font-bold text-[#1c1a4e]">Zo werken we</h2>
          <span className="text-[13px] text-black/45">{PORTAAL_WETEN.length} onderwerpen · {portaalVragen()} vragen en antwoorden</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" id="weten-collega">
          {PORTAAL_WETEN.map((w, i) => <PortaalTegel key={w.slug} w={w} n={i + 1} />)}
        </div>
      </section>

      <section aria-labelledby="wat-de-klant-leest" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="wat-de-klant-leest" className="font-heading text-[18px] font-bold text-[#1c1a4e]">Wat de klant leest</h2>
            <p className="text-[13.5px] text-black/50">De negen onderwerpen van Goed om te weten in de onboarding van elke klant, woord voor woord.</p>
          </div>
          <span className="text-[13px] text-black/45">{WETEN.length} onderwerpen · {aantalVragen()} vragen en antwoorden</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" id="weten-klant">
          {WETEN.map((w, i) => <KlantTegel key={w.slug} w={w} n={i + 1} />)}
        </div>
      </section>
    </div>
  );
}

/** Eén onderwerp voor collega's: uitleg, in het kort, vragen en antwoorden; rechts wat de klant leest en de andere onderwerpen. */
export function PortaalOnderwerpWeergave({ slug }: { slug: string }) {
  const w = portaalWetenVoor(slug)!;
  const n = PORTAAL_WETEN.findIndex((x) => x.slug === slug) + 1;
  const vorige = portaalWetenVoorgaand(slug);
  const volgende = portaalWetenNa(slug);
  const klant = w.klant ? wetenVoor(w.klant) : null;
  const andere = PORTAAL_WETEN.filter((x) => x.slug !== slug);

  return (
    <div className="space-y-6">
      <Link href="/admin/weten" className={TERUG}><LuArrowLeft /> Goed om te weten</Link>

      <header className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[26px]" style={{ color: w.kleur, background: w.tint }}>
          <PortaalIcoonVan icoon={w.icoon} />
        </span>
        <div className="min-w-0">
          <p className={EYEBROW} style={{ color: w.kleur }}>Onderwerp {n} van {PORTAAL_WETEN.length}</p>
          <h1 className="font-heading text-[26px] font-bold leading-[1.15] text-[#312e82]">{w.titel}</h1>
          <p className="mt-1 max-w-[640px] text-[14.5px] leading-[1.6] text-black/50">{w.kort}</p>
          <p className="mt-1.5 text-[12.5px] text-black/45">{w.vragen.length} vragen en antwoorden · ± {leesTijd(w)} min lezen</p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="min-w-0 space-y-5">
          <PortaalInhoud w={w} />
          <nav className="acard flex flex-wrap items-center justify-between gap-3 px-5 py-4" aria-label="Vorige en volgende onderwerp">
            {vorige ? <Link href={`/admin/weten/${vorige.slug}`} className={`${TERUG} max-w-full`}><LuArrowLeft className="shrink-0" /> <span className="min-w-0 truncate">{vorige.titel}</span></Link> : <span />}
            {volgende ? (
              <Link href={`/admin/weten/${volgende.slug}`} className="abtn max-w-full !py-2 text-[13.5px]"><span className="min-w-0 truncate">Volgende: {volgende.titel}</span> <LuArrowRight className="shrink-0" /></Link>
            ) : (
              <Link href="/admin/weten" className="abtn !py-2 text-[13.5px]">Terug naar het overzicht <LuArrowRight /></Link>
            )}
          </nav>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-[84px]">
          <InHetKort w={w} />
          {klant && (
            <section className="acard p-5" aria-label="Wat de klant leest">
              <p className={`${EYEBROW} text-black/40`}>Wat de klant leest</p>
              <Link href={`/admin/weten/klant/${klant.slug}`} className="mt-1.5 block text-[14px] font-semibold leading-[1.4] text-[#1c1a4e] hover:text-[#312e82] hover:underline">{klant.titel}</Link>
              <p className="mt-1 text-[12.5px] text-black/45">Zo staat het in de onboarding van elke klant.</p>
            </section>
          )}
          <section className="acard p-5" aria-label="Andere onderwerpen">
            <p className={`${EYEBROW} text-black/40`}>Andere onderwerpen</p>
            <ul className="mt-2 divide-y divide-black/[0.05]">
              {andere.map((x) => (
                <li key={x.slug}>
                  <Link href={`/admin/weten/${x.slug}`} className="flex items-center gap-2.5 py-2 text-[13.5px] font-medium text-[#1c1a4e] hover:text-[#312e82] hover:underline">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[13px]" style={{ color: x.kleur, background: x.tint }}><PortaalIcoonVan icoon={x.icoon} /></span>
                    <span className="min-w-0 truncate">{x.titel}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

/** Eén onderwerp zoals de klant het leest in zijn onboarding, met rechts het onderwerp voor collega's dat erbij hoort. */
export function KlantOnderwerpWeergave({ slug }: { slug: string }) {
  const w = wetenVoor(slug)!;
  const n = wetenNummer(slug);
  const vorige = wetenVoorgaand(slug);
  const volgende = wetenNa(slug);
  const eigen = PORTAAL_WETEN.find((p) => p.klant === slug) ?? null;
  const andere = WETEN.filter((x) => x.slug !== slug);

  return (
    <div className="space-y-6">
      <Link href="/admin/weten" className={TERUG}><LuArrowLeft /> Goed om te weten</Link>

      <header className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ color: w.kleur, background: w.tint }}>
          <WetenIcoon d={w.icoon} size={26} />
        </span>
        <div className="min-w-0">
          <p className={`${EYEBROW} text-black/40`}>Wat de klant leest · onderwerp {n} van {WETEN.length}</p>
          <h1 className="font-heading text-[26px] font-bold leading-[1.15] text-[#312e82]">{w.titel}</h1>
          <p className="mt-1 max-w-[640px] text-[14.5px] leading-[1.6] text-black/50">Zo staat het, woord voor woord, in de onboarding van elke klant onder Goed om te weten. {w.vragen.length} vragen · ± {leesMinuten(w)} min.</p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="min-w-0 space-y-5">
          <section className={`acard hv ${outfit.variable} p-6 md:p-8`} aria-label="Zoals de klant het leest">
            <WetenInhoud w={w} />
          </section>
          <nav className="acard flex flex-wrap items-center justify-between gap-3 px-5 py-4" aria-label="Vorige en volgende onderwerp">
            {vorige ? <Link href={`/admin/weten/klant/${vorige.slug}`} className={`${TERUG} max-w-full`}><LuArrowLeft className="shrink-0" /> <span className="min-w-0 truncate">{vorige.titel}</span></Link> : <span />}
            {volgende ? (
              <Link href={`/admin/weten/klant/${volgende.slug}`} className="abtn max-w-full !py-2 text-[13.5px]"><span className="min-w-0 truncate">Volgende: {volgende.titel}</span> <LuArrowRight className="shrink-0" /></Link>
            ) : (
              <Link href="/admin/weten" className="abtn !py-2 text-[13.5px]">Terug naar het overzicht <LuArrowRight /></Link>
            )}
          </nav>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-[84px]">
          {eigen && (
            <section className="acard p-5" aria-label="Hoe wij dit doen">
              <p className={`${EYEBROW} text-black/40`}>Hoe wij dit doen</p>
              <Link href={`/admin/weten/${eigen.slug}`} className="mt-1.5 block text-[14px] font-semibold leading-[1.4] text-[#1c1a4e] hover:text-[#312e82] hover:underline">{eigen.titel}</Link>
              <p className="mt-1 text-[12.5px] text-black/45">Het onderwerp voor collega&apos;s dat hierbij hoort.</p>
            </section>
          )}
          <section className="acard p-5" aria-label="Andere onderwerpen van de klant">
            <p className={`${EYEBROW} text-black/40`}>De klant leest ook</p>
            <ul className="mt-2 divide-y divide-black/[0.05]">
              {andere.map((x) => (
                <li key={x.slug}>
                  <Link href={`/admin/weten/klant/${x.slug}`} className="flex items-center gap-2.5 py-2 text-[13.5px] font-medium text-[#1c1a4e] hover:text-[#312e82] hover:underline">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ color: x.kleur, background: x.tint }}><WetenIcoon d={x.icoon} size={13} /></span>
                    <span className="min-w-0 truncate">{x.titel}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
