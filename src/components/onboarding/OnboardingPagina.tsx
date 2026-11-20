import type { ContactInfo } from "@/lib/content";
import type { Certificate } from "@/lib/nav";
import { kop, LAV, LINE, NAVY, PINK, Pijl, Vink } from "@/components/blocks/Gedeeld";
import { BODY } from "@/components/blocks/Gedeeld";
import { datumLang, momentLang, vulIn } from "@/lib/offertes";
import {
  benodigdheden, BERICHT_STANDAARD, documentKlaar, gekozen, hoofdstukkenVoor, ONBOARDING_EMAIL, totaleMinuten, volgendeStap, voortgang, vultIn,
  type DocumentInfo, type OnboardingPubliek, takenVoor } from "@/lib/onboarding";
import type { Modus } from "./OnboardingActies";
import {
  Band, Feest, GROEN, Icoon, initialen, knop, Label, Melding, MUTE, NAVY_LICHT, outfit, PAGINA_CSS, SectieKop, StapKaart, TELEFOON, telLink, Verder,
  Voet, voornaam, Zekerheid,
} from "./OnboardingDelen";
import OnboardingKopbalk, { VolgendeBalk } from "./OnboardingKopbalk";
import OnboardingReveal from "./OnboardingReveal";

/*
 * De hub van de onboarding (/onboarding/<token>, migratie 0037), en hetzelfde
 * scherm als voorbeeld in het beheer (/admin/onboardingvoorbeeld/<id>): de
 * thuisbasis waar de klant altijd naar terugkomt (Rens, 16 nov 2026: "maak het
 * perfect naar eigen inzicht"), zoals de beste onboardings een checklist als
 * thuisbasis hebben en één taak per scherm.
 *
 *  - de kopbalk met de hoofdstukken, de voortgang en bellen;
 *  - de opening in de lila tint: het persoonlijke woord van de afzender, de
 *    feiten, wat je bij de hand moet hebben, en rechts de kaart met de
 *    voortgangsring, de stappen per hoofdstuk en het aanspreekpunt;
 *  - de drie hoofdstukken als banden, om en om wit en lila, elk met zijn
 *    stappen als kaarten die naar hun eigen pagina gaan
 *    (OnboardingStapPagina.tsx): zo werken we samen, jullie gegevens, delen
 *    met je team;
 *  - de indigo band "Zo gaat het verder" en de voet van de site.
 *
 * Modus: klant (de echte link), collega (een beheerder opent de link: het
 * bezoek telt niet), voorbeeld (vanuit het beheer, of een concept: niets kan
 * worden opgeslagen).
 */

export default function OnboardingPagina({
  o, basis, contact, certificaten, modus, vers = false,
}: {
  o: OnboardingPubliek;
  /** De klantlink of het voorbeeld in het beheer: daaronder staan de stappen, de pdf's en het Excelbestand. */
  basis: string;
  contact: ContactInfo;
  /** De certificaten uit Instellingen, voor de keurmerken bij Jullie gegevens (lib/keurmerken.ts). */
  certificaten: Certificate[];
  modus: Modus;
  /** Net klaar (minder dan een kwartier geleden): dan de felicitatie met de stippen. */
  vers?: boolean;
}) {
  const docs = gekozen(o);
  const hoofdstukken = hoofdstukkenVoor(o);
  const v = voortgang(o);
  const procent = v.totaal ? Math.round((v.klaar / v.totaal) * 100) : 0;
  const compleet = v.totaal > 0 && v.klaar === v.totaal;
  const takenGedaan = takenVoor(o).filter((t) => o.taken?.[t.sleutel]).length;
  const live = compleet && takenVoor(o).length > 0 && takenGedaan === takenVoor(o).length;
  const tel = telLink(o.afzender_telefoon) || `tel:${contact.phone}`;
  const telTekst = o.afzender_telefoon || contact.phoneDisplay.replace(/\s*-\s*/, " ");
  const mail = o.afzender_email || ONBOARDING_EMAIL;
  const bericht = vulIn(o.bericht || BERICHT_STANDAARD, { bedrijf: o.bedrijf, contactpersoon: o.contactpersoon })
    .split(/\n\s*\n/).map((a) => a.trim()).filter(Boolean);
  const omtrek = 2 * Math.PI * 52;
  const volgende = volgendeStap(o);
  const nummerVan = (d: DocumentInfo) => docs.indexOf(d) + 1;
  const nodig = benodigdheden(o);
  const minuten = totaleMinuten(o);
  const feiten = [
    { label: "Onboarding", waarde: o.nummer },
    ...(o.verstuurd_at ? [{ label: "Verstuurd op", waarde: datumLang(o.verstuurd_at) }] : []),
    { label: "Stappen", waarde: `${v.klaar} van ${v.totaal} klaar` },
    ...(compleet ? [] : [{ label: "Samen ongeveer", waarde: `${minuten} minuten` }]),
    { label: "Je aanspreekpunt", waarde: o.afzender_naam || "Team React2u" },
  ];
  const onderdelen = [...hoofdstukken.map((h) => ({ id: `hoofdstuk-${h.id}`, label: h.label })), { id: "verder", label: "Verder" }];
  const startHref = `${basis}/${(volgende || docs[0])?.sleutel}`;

  return (
    <div className={`hv ${outfit.variable} onboarding-doc min-h-screen bg-white`}>
      <style>{PAGINA_CSS}</style>
      <OnboardingReveal />
      <OnboardingKopbalk nummer={o.nummer} onderdelen={onderdelen} klaar={v.klaar} totaal={v.totaal} tel={tel} telNaam={voornaam(o.afzender_naam) || "ons"} />
      <Melding modus={modus} status={o.status} />

      <main>
        <section id="opening" className="px-[6px] pt-2 md:px-6 md:pt-6 xl:px-10">
          <div className="relative mx-auto grid max-w-[1360px] gap-10 overflow-clip rounded-[28px] px-6 pb-8 pt-10 md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-14 lg:p-16 xl:p-[72px]" style={{ background: LAV }}>
            <span aria-hidden className="absolute right-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full md:h-[560px] md:w-[560px]" style={{ background: NAVY, opacity: 0.1 }} />
            <span aria-hidden className="absolute bottom-[-120px] left-[38%] hidden h-[220px] w-[220px] rounded-full lg:block" style={{ background: PINK, opacity: 0.08 }} />
            {/* De stippen van het logo, zachtjes zwevend tussen de brief en de kaart. */}
            <span aria-hidden className="hv-f1 absolute left-[57%] top-[14%] hidden h-4 w-4 rounded-full lg:block" style={{ background: "#00A098", opacity: 0.6 }} />
            <span aria-hidden className="hv-f2 absolute left-[61%] top-[34%] hidden h-3 w-3 rounded-full lg:block" style={{ background: "#F19001", opacity: 0.65 }} />
            <span aria-hidden className="hv-f3 absolute left-[55%] top-[46%] hidden h-2.5 w-2.5 rounded-full lg:block" style={{ background: PINK, opacity: 0.55 }} />
            <span aria-hidden className="hv-f2 absolute left-[63%] top-[62%] hidden h-2 w-2 rounded-full lg:block" style={{ background: "#3AA5DD", opacity: 0.6 }} />
            <div className="relative flex flex-col gap-6">
              <p className="m-0 flex flex-col gap-0.5 text-[14px] font-semibold sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5" style={{ color: MUTE }}>
                <span>Onboarding {o.nummer}</span><span aria-hidden className="hidden sm:inline">/</span><span style={{ color: NAVY }}>{o.bedrijf}</span>
              </p>
              <div>
                {/* Kleur inline: de algemene kopstijl van de site wint anders van de Tailwind-klasse. */}
                <h1 className={`${kop} m-0 text-[24px] leading-[1.05] tracking-[-0.4px] md:text-[32px]`} style={{ color: NAVY }}>
                  React2u
                  <span className="mt-1 block text-[50px] leading-[1.02] tracking-[-1.6px] md:text-[76px] md:tracking-[-2.2px]">
                    Welkom<span style={{ color: PINK }}>.</span>
                  </span>
                  <span className="hv-dienst mt-4 block text-[18px] font-bold leading-[1.5] tracking-normal md:text-[21px]">Alles om goed te starten met jullie arbodienst, op één plek.</span>
                </h1>
              </div>
              <div className="flex max-w-[620px] flex-col gap-3 border-t pt-6" style={{ borderColor: "rgba(50,46,131,0.12)" }}>
                <p className={`${kop} m-0 text-[24px] leading-[1.25] tracking-[-0.4px] md:text-[28px]`} style={{ color: NAVY }}>Beste {voornaam(o.contactpersoon) || "relatie"},</p>
                <div className="flex flex-col gap-3 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: BODY }}>
                  {bericht.map((a, i) => <p key={i} className="m-0">{a}</p>)}
                </div>
              </div>
              <dl className="m-0 flex flex-wrap gap-x-10 gap-y-4">
                {feiten.map((f) => (
                  <div key={f.label} className="min-w-0">
                    <dt className="text-[13px]" style={{ color: MUTE }}>{f.label}</dt>
                    <dd className="m-0 mt-0.5 text-[16px] font-bold" style={{ color: NAVY }}>{f.waarde}</dd>
                  </div>
                ))}
              </dl>
              {nodig.length > 0 && !compleet && (
                <div className="flex flex-col gap-3 rounded-[18px] border px-5 py-4" style={{ borderColor: "rgba(50,46,131,0.14)", background: "rgba(255,255,255,0.55)" }}>
                  <Label>Handig om bij de hand te hebben</Label>
                  <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                    {nodig.map((n) => (
                      <li key={n} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13.5px] font-semibold" style={{ color: NAVY }}>
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: PINK }} />{n}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="geen-print flex flex-wrap gap-3 pt-1">
                <a href={startHref} className={knop.roze}>
                  {compleet ? "Bekijk je documenten" : v.klaar ? `Ga verder met stap ${nummerVan(volgende!)}` : "Begin met stap 1"} <Pijl size={14} />
                </a>
                <a href={tel} className={knop.rand}><Icoon d={TELEFOON} size={15} /> Bel {voornaam(o.afzender_naam) || "ons"}</a>
              </div>
            </div>

            <aside className="relative flex flex-col gap-6 rounded-[24px] bg-white p-6 shadow-[0_30px_70px_-40px_rgba(50,46,131,0.45)] md:p-8">
              <div className="flex items-center gap-5">
                <span className="relative shrink-0">
                  {compleet && vers && <Feest />}
                  <svg width="120" height="120" viewBox="0 0 120 120" className={`relative ${compleet ? "onboarding-vink" : ""}`} role="img" aria-label={`${procent}% klaar`}>
                    <circle cx="60" cy="60" r="52" fill="none" stroke={LAV} strokeWidth="10" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke={compleet ? GROEN : PINK} strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={`${(omtrek * procent) / 100} ${omtrek}`} transform="rotate(-90 60 60)" />
                    <text x="60" y="58" textAnchor="middle" className="hv-kop" style={{ fontSize: 28, fontWeight: 700, fill: NAVY }}>{procent}%</text>
                    <text x="60" y="78" textAnchor="middle" style={{ fontSize: 12, fill: MUTE }}>{v.klaar} van {v.totaal}</text>
                  </svg>
                </span>
                <div className="flex flex-col gap-1">
                  <Label>Jullie voortgang</Label>
                  <p className={`${kop} m-0 text-[21px] leading-[1.25]`} style={{ color: NAVY }}>
                    {live ? "Jullie zijn live!" : compleet ? "Alles klaar, dank je wel!" : `Nog ${v.totaal - v.klaar} ${v.totaal - v.klaar === 1 ? "stap" : "stappen"} te gaan`}
                  </p>
                  {compleet && (
                    <a href="#verder" className="text-[14px] font-bold underline-offset-4 hover:underline" style={{ color: live ? GROEN : PINK }}>
                      {live ? "Alles is ingericht" : `React2u: ${takenGedaan} van ${takenVoor(o).length} geregeld`} <span aria-hidden>↓</span>
                    </a>
                  )}
                </div>
              </div>
              <ol className="m-0 flex list-none flex-col gap-4 p-0">
                {hoofdstukken.map((h, hi) => (
                  <li key={h.id} className="flex flex-col gap-1">
                    <a href={`#hoofdstuk-${h.id}`} className="px-2 text-[12px] font-bold uppercase tracking-[1.2px] hover:underline" style={{ color: MUTE }}>Hoofdstuk {hi + 1} · {h.label}</a>
                    <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
                      {h.docs.map((d) => {
                        const klaar = documentKlaar(o, d.sleutel);
                        return (
                          <li key={d.sleutel}>
                            <a href={`${basis}/${d.sleutel}`} className="flex items-center gap-3 rounded-[14px] px-2 py-1.5 transition-colors hover:bg-[#F6F5FB]">
                              <span className={`${kop} grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px]`} style={{ background: klaar ? GROEN : d.tint, color: klaar ? "#fff" : d.kleur }}>
                                {klaar ? <Vink size={12} /> : nummerVan(d)}
                              </span>
                              <span className={`flex-1 text-[15px] font-semibold ${klaar ? "line-through decoration-[1.5px] opacity-60" : ""}`} style={{ color: NAVY }}>{d.titel}</span>
                              {!klaar && <span className="text-[12px] font-semibold tabular-nums" style={{ color: MUTE }}>{d.invullen && !vultIn(o, d.sleutel) ? 2 : d.minuten} min</span>}
                              {vultIn(o, d.sleutel) && !klaar && <span className="rounded-full px-2.5 py-1 text-[11.5px] font-bold" style={{ background: "#FDECF4", color: PINK }}>Invullen</span>}
                            </a>
                          </li>
                        );
                      })}
                    </ol>
                  </li>
                ))}
              </ol>
              <div className="flex items-center gap-3 border-t pt-5" style={{ borderColor: LINE }}>
                <span className={`${kop} flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-[15px] text-white`} style={{ background: NAVY }} aria-hidden="true">{initialen(o.afzender_naam)}</span>
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="text-[15px] font-bold" style={{ color: NAVY }}>{o.afzender_naam || "Team React2u"}</span>
                  <span className="truncate text-[13.5px]" style={{ color: MUTE }}>{o.afzender_functie ? `${o.afzender_functie}, React2u` : "Je aanspreekpunt bij React2u"}</span>
                  <a href={`mailto:${mail}`} className="truncate text-[13.5px] font-bold hover:underline" style={{ color: NAVY }}>{mail}</a>
                </span>
                <a href={tel} aria-label={`Bel ${o.afzender_naam || "React2u"}`} className="hv-btn hv-btn-rand flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                  <Icoon d={TELEFOON} size={16} />
                </a>
              </div>
            </aside>
          </div>
        </section>

        {compleet && (
          <section className="px-[6px] pt-4 md:px-6 md:pt-6 xl:px-10" aria-label="Jullie onboarding is compleet">
            <div className="relative mx-auto flex max-w-[1360px] flex-col gap-3 overflow-clip rounded-[28px] px-6 py-8 md:flex-row md:items-center md:justify-between md:rounded-[36px] md:px-14" style={{ background: NAVY }}>
              <span aria-hidden className="absolute right-[-120px] top-[-140px] h-[300px] w-[300px] rounded-full" style={{ background: NAVY_LICHT }} />
              <div className="relative flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-white" style={{ background: GROEN }}><Vink size={20} /></span>
                <span className="flex flex-col">
                  <span className={`${kop} text-[22px] text-white`}>Jullie onboarding is compleet</span>
                  <span className="text-[15px] text-white/75">{o.afgerond_at ? `Afgerond ${momentLang(o.afgerond_at)}. ` : ""}We richten alles in en nemen contact op als we nog iets nodig hebben.</span>
                </span>
              </div>
              <a href="#verder" className={`${knop.wit} geen-print relative`}>Wat er nu gebeurt <Pijl size={14} /></a>
            </div>
          </section>
        )}

        <div className="h-10 md:h-16" />

        {hoofdstukken.map((h, hi) => {
          const tint = hi % 2 === 1;
          return (
            <Band key={h.id} id={`hoofdstuk-${h.id}`} tint={tint} label={h.eyebrow}>
              <SectieKop eyebrow={`Hoofdstuk ${hi + 1} van ${hoofdstukken.length} · ${h.eyebrow}`} titel={h.titel} tekst={h.tekst} />
              {h.id === "gegevens" && <Zekerheid tint={tint} certificaten={certificaten} />}
              <ol className={`m-0 grid list-none gap-4 p-0 md:grid-cols-2 ${h.docs.length >= 3 ? "xl:grid-cols-3" : ""}`}>
                {h.docs.map((d, i) => <StapKaart key={d.sleutel} d={d} n={nummerVan(d)} o={o} basis={basis} tint={tint} i={i} />)}
              </ol>
            </Band>
          );
        })}

        <Verder o={o} tel={tel} telTekst={telTekst} mail={mail} />
      </main>

      <Voet o={o} contact={contact} mail={mail} tel={tel} telTekst={telTekst} />

      {volgende && modus !== "voorbeeld" && <VolgendeBalk href={`${basis}/${volgende.sleutel}`} titel={volgende.titel} nr={nummerVan(volgende)} />}
    </div>
  );
}
