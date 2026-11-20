import type { ContactInfo } from "@/lib/content";
import { kop, LAV, NAVY, Pijl } from "@/components/blocks/Gedeeld";
import { documentInfo, gekozen, hoofdstukkenVoor, ONBOARDING_EMAIL, stapNa, stapVoor, voortgang, type DocumentSleutel, type OnboardingPubliek } from "@/lib/onboarding";
import { StapDoorsturen, type Modus } from "./OnboardingActies";
import { Band, Icoon, knop, Melding, MUTE, outfit, PAGINA_CSS, Stap, TELEFOON, telLink, Voet, voornaam } from "./OnboardingDelen";
import OnboardingKopbalk from "./OnboardingKopbalk";
import OnboardingReveal from "./OnboardingReveal";

/*
 * Eén stap van de onboarding op zijn eigen pagina
 * (/onboarding/<token>/<stap>, en /admin/onboardingvoorbeeld/<id>/<stap>):
 * boven de kopbalk met de weg terug naar het overzicht, een korte strook met
 * waar je bent in het verhaal, dan de stap zelf (links de vaste kolom met
 * nummer, titel, status en acties, rechts de inhoud of het formulier), en
 * onderaan vorige, overzicht en volgende. Zo krijgt elk formulier de aandacht
 * en blijft elke pagina kort.
 */

export default function OnboardingStapPagina({
  o, token, basis, contact, modus, sleutel,
}: {
  o: OnboardingPubliek;
  token: string;
  basis: string;
  contact: ContactInfo;
  modus: Modus;
  sleutel: DocumentSleutel;
}) {
  const d = documentInfo(sleutel);
  const docs = gekozen(o);
  const n = docs.findIndex((x) => x.sleutel === sleutel) + 1;
  const hoofdstukken = hoofdstukkenVoor(o);
  const hi = hoofdstukken.findIndex((h) => h.documenten.includes(sleutel));
  const h = hoofdstukken[hi];
  const v = voortgang(o);
  const vorige = stapVoor(o, sleutel);
  const volgende = stapNa(o, sleutel);
  const tel = telLink(o.afzender_telefoon) || `tel:${contact.phone}`;
  const telTekst = o.afzender_telefoon || contact.phoneDisplay.replace(/\s*-\s*/, " ");
  const mail = o.afzender_email || ONBOARDING_EMAIL;
  const onderdelen = [
    ...hoofdstukken.map((x) => ({ id: `hoofdstuk-${x.id}`, label: x.label, href: `${basis}#hoofdstuk-${x.id}` })),
    { id: "verder", label: "Verder", href: `${basis}#verder` },
  ];
  // Een lange staptitel ("Volgende stap: Wat je wél mag vragen bij ziekteverzuim") wordt op de telefoon afgekort: anders loopt de pagina over.
  const knopNav = "inline-flex h-[52px] min-w-0 max-w-full items-center justify-center gap-2.5 rounded-full px-6 text-[15px] font-bold";

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
        {/* Waar je bent in het verhaal */}
        <section className="px-[6px] pt-2 md:px-6 md:pt-6 xl:px-10">
          <div className="relative mx-auto flex max-w-[1360px] flex-col gap-3 overflow-clip rounded-[28px] px-6 py-6 md:flex-row md:items-center md:justify-between md:rounded-[36px] md:px-14 md:py-8" style={{ background: LAV }}>
            <span aria-hidden className="absolute right-[-120px] top-[-160px] h-[320px] w-[320px] rounded-full" style={{ background: NAVY, opacity: 0.08 }} />
            <div className="relative flex flex-col gap-1.5">
              <p className="m-0 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[14px] font-semibold" style={{ color: MUTE }}>
                <a href={basis} className="hover:underline" style={{ color: MUTE }}>Onboarding {o.nummer}</a>
                <span aria-hidden>/</span>
                <span style={{ color: NAVY }}>{o.bedrijf}</span>
              </p>
              {h && (
                <p className={`${kop} m-0 text-[20px] leading-[1.3] md:text-[24px]`} style={{ color: NAVY }}>
                  Hoofdstuk {hi + 1} van {hoofdstukken.length} · {h.eyebrow}
                </p>
              )}
            </div>
            <div className="relative flex flex-wrap items-center gap-3 text-[14px] font-semibold" style={{ color: MUTE }}>
              <span>Stap {n} van {docs.length}</span>
              <span aria-hidden>·</span>
              <span>{v.klaar} van {v.totaal} klaar</span>
              <a href={tel} className="inline-flex items-center gap-1.5 font-bold" style={{ color: NAVY }}><Icoon d={TELEFOON} size={14} /> Bel {voornaam(o.afzender_naam) || "ons"}</a>
            </div>
          </div>
        </section>

        <Band id="stap" tint={false} label={d.titel}>
          <Stap d={d} n={n} o={o} token={token} basis={basis} modus={modus} tint={false} eerste volgende={volgende} />
        </Band>

        {/* Doorsturen naar een collega */}
        {modus !== "collega" && (
          <section className="px-[6px] pb-6 md:px-6 md:pb-8 xl:px-10" aria-label="Deze stap doorsturen">
            <div className="mx-auto max-w-[1360px] px-6 md:px-14">
              <StapDoorsturen token={token} stap={sleutel} titel={d.titel} modus={modus} contactpersoon={o.contactpersoon} />
            </div>
          </section>
        )}

        {/* Vorige, overzicht, volgende */}
        <section className="px-[6px] pb-10 md:px-6 md:pb-16 xl:px-10" aria-label="Verder in de onboarding">
          <div className="mx-auto flex max-w-[1360px] flex-col gap-3 rounded-[28px] px-6 py-6 md:flex-row md:items-center md:justify-between md:rounded-[36px] md:px-14" style={{ background: LAV }}>
            <div className="flex flex-wrap gap-3">
              {vorige ? (
                <a href={`${basis}/${vorige.sleutel}`} className={`${knop.rand} ${knopNav}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
                  Vorige stap
                </a>
              ) : null}
              <a href={basis} className={`${knop.rand} ${knopNav}`}>Overzicht</a>
            </div>
            {volgende ? (
              <a href={`${basis}/${volgende.sleutel}`} className={`${knop.roze} ${knopNav}`}>
                <span className="truncate">Volgende stap: {volgende.titel}</span>
                <span className="flex shrink-0"><Pijl size={14} /></span>
              </a>
            ) : (
              <a href={`${basis}#verder`} className={`${knop.roze} ${knopNav}`}>
                <span className="truncate">Zo gaat het verder</span>
                <span className="flex shrink-0"><Pijl size={14} /></span>
              </a>
            )}
          </div>
        </section>
      </main>

      <Voet o={o} contact={contact} mail={mail} tel={tel} telTekst={telTekst} />
    </div>
  );
}
