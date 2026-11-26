import type { ContactInfo } from "@/lib/content";
import { kop, LAV, LINE, NAVY, Pijl, SOFT } from "@/components/blocks/Gedeeld";
import { gidsVoor } from "@/lib/gidsen";
import { inkt } from "@/lib/kleur";
import { documentInfo, gekozen, hoofdstukkenVoor, ONBOARDING_EMAIL, voortgang, type OnboardingPubliek } from "@/lib/onboarding";
import { leesMinuten, WETEN, wetenNa, wetenNummer, wetenVoor, wetenVoorgaand } from "@/lib/onboardingWeten";
import type { Modus } from "./OnboardingActies";
import { Band, Icoon, knop, Label, Melding, MUTE, outfit, PAGINA_CSS, SectieKop, TELEFOON, telLink, Voet, voornaam } from "./OnboardingDelen";
import OnboardingKopbalk from "./OnboardingKopbalk";
import OnboardingReveal from "./OnboardingReveal";
import { WetenIcoon, WetenInhoud, WetenTegels } from "./OnboardingWeten";

/*
 * Eén onderwerp van Goed om te weten op zijn eigen pagina
 * (/onboarding/<token>/weten/<slug>, en /admin/onboardingvoorbeeld/<id>/weten/<slug>),
 * in de opzet van een stappagina: de kopbalk met de weg terug, een strook met
 * waar je bent, dan links de vaste kolom (pictogram, titel, leestijd, de stap
 * en de gids die erbij horen) en rechts de uitleg met de vragen en antwoorden.
 * Onderaan de andere onderwerpen en vorige, overzicht en volgende.
 */

export default function OnboardingWetenPagina({ o, basis, contact, modus, slug }: {
  o: OnboardingPubliek;
  basis: string;
  contact: ContactInfo;
  modus: Modus;
  slug: string;
}) {
  const w = wetenVoor(slug)!;
  const n = wetenNummer(slug);
  const vorige = wetenVoorgaand(slug);
  const volgende = wetenNa(slug);
  const hoofdstukken = hoofdstukkenVoor(o);
  const v = voortgang(o);
  const tel = telLink(o.afzender_telefoon) || `tel:${contact.phone}`;
  const telTekst = o.afzender_telefoon || contact.phoneDisplay.replace(/\s*-\s*/, " ");
  const mail = o.afzender_email || ONBOARDING_EMAIL;
  const stap = w.stap && o.documenten.includes(w.stap) && !documentInfo(w.stap).verborgen ? documentInfo(w.stap) : null;
  const gids = w.gids ? gidsVoor(w.gids) : null;
  const meer = gids ? { href: `/${gids.slug}`, label: `De gids ${gids.naam.toLowerCase()} op react2u.nl` } : w.meer ?? null;
  const tekst = inkt(w.kleur);
  const onderdelen = [
    ...hoofdstukken.map((x) => ({ id: `hoofdstuk-${x.id}`, label: x.label, href: `${basis}#hoofdstuk-${x.id}` })),
    { id: "weten", label: "Goed om te weten", href: `${basis}#weten` },
    { id: "verder", label: "Verder", href: `${basis}#verder` },
  ];
  const knopNav = "inline-flex h-[52px] items-center justify-center gap-2.5 rounded-full px-6 text-[15px] font-bold";

  return (
    <div className={`hv ${outfit.variable} onboarding-doc min-h-screen bg-white`}>
      <style>{PAGINA_CSS}</style>
      <OnboardingReveal />
      <OnboardingKopbalk
        nummer={o.nummer}
        onderdelen={onderdelen}
        klaar={v.klaar}
        totaal={v.totaal}
        tel={tel}
        telNaam={voornaam(o.afzender_naam) || "ons"}
        terug={{ href: basis, label: "Overzicht" }}
      />
      <Melding modus={modus} status={o.status} />

      <main>
        {/* Waar je bent */}
        <section className="px-[6px] pt-2 md:px-6 md:pt-6 xl:px-10">
          <div className="relative mx-auto flex max-w-[1360px] flex-col gap-3 overflow-clip rounded-[28px] px-6 py-6 md:flex-row md:items-center md:justify-between md:rounded-[36px] md:px-14 md:py-8" style={{ background: LAV }}>
            <span aria-hidden className="absolute right-[-120px] top-[-160px] h-[320px] w-[320px] rounded-full" style={{ background: w.kleur, opacity: 0.1 }} />
            <div className="relative flex flex-col gap-1.5">
              <p className="m-0 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[14px] font-semibold" style={{ color: MUTE }}>
                <a href={basis} className="hover:underline" style={{ color: MUTE }}>Onboarding {o.nummer}</a>
                <span aria-hidden>/</span>
                <span style={{ color: NAVY }}>{o.bedrijf}</span>
              </p>
              <p className={`${kop} m-0 text-[20px] leading-[1.3] md:text-[24px]`} style={{ color: NAVY }}>
                <a href={`${basis}#weten`} className="hover:underline">Goed om te weten</a> · Onderwerp {n} van {WETEN.length}
              </p>
            </div>
            <div className="relative flex flex-wrap items-center gap-3 text-[14px] font-semibold" style={{ color: MUTE }}>
              <span>{w.vragen.length} vragen</span>
              <span aria-hidden>·</span>
              <span>± {leesMinuten(w)} min lezen</span>
              <a href={tel} className="inline-flex items-center gap-1.5 font-bold" style={{ color: NAVY }}><Icoon d={TELEFOON} size={14} /> Bel {voornaam(o.afzender_naam) || "ons"}</a>
            </div>
          </div>
        </section>

        <Band id={`weten-${w.slug}`} tint={false} label={w.titel}>
          <article aria-labelledby={`kop-weten-${w.slug}`} className="grid gap-8 lg:grid-cols-12 lg:gap-10" data-reveal>
            {/* Links de kolom die op een groot scherm blijft staan, zoals bij een stap. */}
            <div className="flex flex-col gap-6 lg:sticky lg:top-[120px] lg:col-span-4 lg:self-start">
              <span className="grid h-14 w-14 place-items-center rounded-full" style={{ background: w.tint, color: tekst }}>
                <WetenIcoon d={w.icoon} size={26} />
              </span>
              <div className="flex flex-col gap-2.5">
                <Label kleur={tekst}>Goed om te weten · {n} van {WETEN.length}</Label>
                <h1 id={`kop-weten-${w.slug}`} className={`${kop} m-0 text-[28px] leading-[1.1] tracking-[-0.7px] md:text-[34px]`} style={{ color: NAVY }}>{w.titel}</h1>
                <p className="m-0 text-[15.5px] leading-[1.6]" style={{ color: MUTE }}>{w.kort}</p>
              </div>
              <span className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-bold" style={{ background: SOFT, color: MUTE }}>{w.vragen.length} vragen en antwoorden</span>
                <span className="text-[13.5px] font-semibold tabular-nums" style={{ color: MUTE }}>± {leesMinuten(w)} min</span>
              </span>
              {(stap || meer) && (
                <div className="flex flex-col gap-3 border-t pt-5" style={{ borderColor: LINE }}>
                  <Label>Lees ook</Label>
                  {stap && (
                    <a href={`${basis}/${stap.sleutel}`} className="inline-flex items-start gap-2.5 text-[15px] font-bold leading-[1.4] underline-offset-4 hover:underline" style={{ color: NAVY }}>
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px]" style={{ background: stap.tint, color: inkt(stap.kleur) }}>{gekozen(o).findIndex((d) => d.sleutel === stap.sleutel) + 1}</span>
                      <span>In deze onboarding: {stap.titel}</span>
                    </a>
                  )}
                  {meer && (
                    <a href={meer.href} target="_blank" rel="noopener" className="inline-flex items-start gap-2.5 text-[15px] font-bold leading-[1.4] underline-offset-4 hover:underline" style={{ color: NAVY }}>
                      <Pijl size={14} /><span>{meer.label}</span>
                    </a>
                  )}
                </div>
              )}
            </div>
            <div className="min-w-0 lg:col-span-8">
              <WetenInhoud w={w} />
            </div>
          </article>
        </Band>

        <Band id="andere" tint label="Andere onderwerpen">
          <SectieKop eyebrow="Goed om te weten" titel="Andere onderwerpen." tekst={`Nog ${WETEN.length - 1} onderwerpen met uitleg en vragen. Of ga terug naar het overzicht van je onboarding.`} />
          <WetenTegels basis={basis} tint behalve={w.slug} label="Andere onderwerpen" />
        </Band>

        {/* Vorige, overzicht, volgende */}
        <section className="px-[6px] pb-10 pt-6 md:px-6 md:pb-16 md:pt-8 xl:px-10" aria-label="Verder in Goed om te weten">
          <div className="mx-auto flex max-w-[1360px] flex-col gap-3 rounded-[28px] px-6 py-6 md:flex-row md:items-center md:justify-between md:rounded-[36px] md:px-14" style={{ background: LAV }}>
            <div className="flex flex-wrap gap-3">
              {vorige ? (
                <a href={`${basis}/weten/${vorige.slug}`} className={`${knop.rand} ${knopNav}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
                  Vorige onderwerp
                </a>
              ) : null}
              <a href={`${basis}#weten`} className={`${knop.rand} ${knopNav}`}>Overzicht</a>
            </div>
            {volgende ? (
              <a href={`${basis}/weten/${volgende.slug}`} className={`${knop.roze} ${knopNav}`}>Volgende: {volgende.titel} <Pijl size={14} /></a>
            ) : (
              <a href={`${basis}#verder`} className={`${knop.roze} ${knopNav}`}>Zo gaat het verder <Pijl size={14} /></a>
            )}
          </div>
        </section>
      </main>

      <Voet o={o} contact={contact} mail={mail} tel={tel} telTekst={telTekst} />
    </div>
  );
}
