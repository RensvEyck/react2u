import type { ContactInfo } from "@/lib/content";
import Logo from "@/components/site/Logo";
import { BODY, BREED, kop, LAV, LINE, NAVY, PINK, Pijl, Vink } from "@/components/blocks/Gedeeld";
import { DOCUMENTEN as SITE_DOCUMENTEN } from "@/lib/documenten";
import { datumLang, momentLang, vulIn } from "@/lib/offertes";
import { aandachtspunten, BERICHT_STANDAARD, CHECKLIST, EVALUATIE_EMAIL, MINUTEN, voortgang, type EvaluatiePubliek } from "@/lib/evaluatie";
import { DOWNLOAD, Feest, Icoon, IVOOR, MAIL, NAVY_LICHT, outfit, PAGINA_CSS, TELEFOON } from "@/components/onboarding/OnboardingDelen";
import OnboardingKopbalk from "@/components/onboarding/OnboardingKopbalk";
import OnboardingReveal from "@/components/onboarding/OnboardingReveal";
import EvaluatieFormulier, { type Modus } from "./EvaluatieFormulier";
import { GROEN, initialen, KNOP, knop, Label, MUTE, ONDERDELEN, SectieKop, telLink, voornaam } from "./EvaluatieDelen";

/*
 * De klantevaluatie voor de klant (/evaluatie/<token>, migratie 0043), en
 * hetzelfde scherm als voorbeeld in het beheer (/admin/evaluatievoorbeeld/<id>).
 * Dezelfde opbouw als de hub van de onboarding (OnboardingPagina.tsx):
 *
 *  - de kopbalk met de vier delen, de voortgang van de checklist en bellen;
 *  - de opening in de lila tint: het persoonlijke woord van de afzender, de
 *    feiten (het bezoek, de tijd die het kost), en rechts de kaart met de
 *    voortgangsring, de vier delen en het aanspreekpunt;
 *  - na het invullen een band "dank je wel" met de pdf;
 *  - het formulier zelf, in vier banden (EvaluatieFormulier.tsx);
 *  - de indigo band "Zo gaat het verder" en de voet.
 *
 * Modus: klant (de echte link), collega (een beheerder opent de link: het
 * bezoek telt niet, invullen mag, bijvoorbeeld samen tijdens het bezoek),
 * voorbeeld (vanuit het beheer, of een concept: niets kan worden opgeslagen).
 */

export default function EvaluatiePagina({
  e, token, basis, contact, modus, vers = false,
}: {
  e: EvaluatiePubliek;
  token: string;
  /** De klantlink of het voorbeeld in het beheer: daaronder staat de pdf. */
  basis: string;
  contact: ContactInfo;
  modus: Modus;
  /** Net ingevuld (minder dan een kwartier geleden): dan de felicitatie met de stippen. */
  vers?: boolean;
}) {
  const a = e.antwoorden;
  const v = voortgang(a);
  const procent = Math.round((v.klaar / v.totaal) * 100);
  const ingevuld = Boolean(e.ingevuld_at);
  const punten = aandachtspunten(a);
  const tel = telLink(e.afzender_telefoon) || `tel:${contact.phone}`;
  const telTekst = e.afzender_telefoon || contact.phoneDisplay.replace(/\s*-\s*/, " ");
  const mail = e.afzender_email || EVALUATIE_EMAIL;
  const bericht = vulIn(e.bericht || BERICHT_STANDAARD, { bedrijf: e.bedrijf, contactpersoon: e.contactpersoon })
    .split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  const omtrek = 2 * Math.PI * 52;
  const bezoek = e.bezoek_datum ? `${datumLang(e.bezoek_datum)}${e.bezoek_tijd ? `, ${e.bezoek_tijd}` : ""}` : null;
  const feiten = [
    { label: "Evaluatie", waarde: e.nummer },
    ...(bezoek ? [{ label: "Ons gesprek", waarde: bezoek }] : []),
    ...(e.verstuurd_at ? [{ label: "Verstuurd op", waarde: datumLang(e.verstuurd_at) }] : []),
    { label: "Checklist", waarde: `${v.klaar} van ${v.totaal} beantwoord` },
    ...(ingevuld ? [] : [{ label: "Invullen duurt", waarde: `ongeveer ${MINUTEN} minuten` }]),
    { label: "Je aanspreekpunt", waarde: e.afzender_naam || "Team React2u" },
  ];
  const onderdelen = [...ONDERDELEN.map((o) => ({ id: o.id, label: o.label })), { id: "verder", label: "Verder" }];
  // Welke delen al iets bevatten, voor de kaart rechts.
  const gedaan: Record<string, boolean> = {
    checklist: v.klaar === v.totaal && v.totaal > 0,
    dienstverlening: Boolean(a?.evaluatie || a?.wensen),
    afspraken: Boolean(a?.afspraken || a?.volgend_bezoek),
    acties: Boolean(a?.acties.length),
  };

  return (
    <div className={`hv ${outfit.variable} onboarding-doc min-h-screen bg-white`}>
      <style>{PAGINA_CSS}</style>
      <OnboardingReveal />
      <OnboardingKopbalk titel="Klantevaluatie" navLabel="Delen van de evaluatie" nummer={e.nummer} onderdelen={onderdelen} klaar={v.klaar} totaal={v.totaal} tel={tel} telNaam="ons" />
      {modus !== "klant" && (
        <div className="geen-print bg-[#FFF4E5] text-[14px] text-[#7A4A06]">
          <p className={`${BREED} m-0 py-2.5`}>
            {modus === "voorbeeld"
              ? e.status === "concept"
                ? "Voorbeeld van een concept: de klant ziet dit pas als je de evaluatie verstuurt. Invullen kan hier niet."
                : "Voorbeeld: zo ziet de klant de evaluatie. Invullen doet hij via zijn eigen link."
              : "Je bekijkt deze evaluatie als collega. Dit bezoek telt niet mee; wat je invult, staat op naam van de klant."}
          </p>
        </div>
      )}

      <main>
        <section id="opening" className="px-[6px] pt-2 md:px-6 md:pt-6 xl:px-10">
          <div className="relative mx-auto grid max-w-[1360px] gap-10 overflow-clip rounded-[28px] px-6 pb-8 pt-10 md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-14 lg:p-16 xl:p-[72px]" style={{ background: LAV }}>
            <span aria-hidden className="absolute right-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full md:h-[560px] md:w-[560px]" style={{ background: NAVY, opacity: 0.1 }} />
            <span aria-hidden className="absolute bottom-[-120px] left-[38%] hidden h-[220px] w-[220px] rounded-full lg:block" style={{ background: PINK, opacity: 0.08 }} />
            <span aria-hidden className="hv-f1 absolute left-[57%] top-[14%] hidden h-4 w-4 rounded-full lg:block" style={{ background: "#00A098", opacity: 0.6 }} />
            <span aria-hidden className="hv-f2 absolute left-[61%] top-[34%] hidden h-3 w-3 rounded-full lg:block" style={{ background: "#F19001", opacity: 0.65 }} />
            <span aria-hidden className="hv-f3 absolute left-[55%] top-[46%] hidden h-2.5 w-2.5 rounded-full lg:block" style={{ background: PINK, opacity: 0.55 }} />
            <div className="relative flex flex-col gap-6">
              <p className="m-0 flex flex-col gap-0.5 text-[14px] font-semibold sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5" style={{ color: MUTE }}>
                <span>Klantevaluatie {e.nummer}</span><span aria-hidden className="hidden sm:inline">/</span><span style={{ color: NAVY }}>{e.bedrijf}</span>
              </p>
              <div>
                <h1 className={`${kop} m-0 text-[24px] leading-[1.05] tracking-[-0.4px] md:text-[32px]`} style={{ color: NAVY }}>
                  React2u
                  <span className="mt-1 block text-[46px] leading-[1.02] tracking-[-1.4px] md:text-[72px] md:tracking-[-2.2px]">
                    Hoe gaat het<span style={{ color: PINK }}>?</span>
                  </span>
                  <span className="hv-dienst mt-4 block text-[18px] font-bold leading-[1.5] tracking-normal md:text-[21px]">De jaarlijkse evaluatie: samen kijken wat goed gaat, wat beter kan en wat je komend jaar nodig hebt.</span>
                </h1>
              </div>
              <div className="flex max-w-[620px] flex-col gap-3 border-t pt-6" style={{ borderColor: "rgba(50,46,131,0.12)" }}>
                <p className={`${kop} m-0 text-[24px] leading-[1.25] tracking-[-0.4px] md:text-[28px]`} style={{ color: NAVY }}>Beste {voornaam(e.contactpersoon) || "relatie"},</p>
                <div className="flex flex-col gap-3 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: BODY }}>
                  {bericht.map((x, i) => <p key={i} className="m-0">{x}</p>)}
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
              <div className="geen-print flex flex-wrap gap-3 pt-1">
                <a href="#checklist" className={knop.roze}>
                  {ingevuld ? "Bekijk of pas aan" : v.klaar ? "Ga verder met de checklist" : "Begin met de checklist"} <Pijl size={14} />
                </a>
                <a href={tel} className={knop.rand}><Icoon d={TELEFOON} size={15} /> Bel ons</a>
              </div>
            </div>

            <aside className="relative flex flex-col gap-6 rounded-[24px] bg-white p-6 shadow-[0_30px_70px_-40px_rgba(50,46,131,0.45)] md:p-8">
              <div className="flex items-center gap-5">
                <span className="relative shrink-0">
                  {ingevuld && vers && <Feest />}
                  <svg width="120" height="120" viewBox="0 0 120 120" className={`relative ${ingevuld ? "onboarding-vink" : ""}`} role="img" aria-label={`${procent}% van de checklist beantwoord`}>
                    <circle cx="60" cy="60" r="52" fill="none" stroke={LAV} strokeWidth="10" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke={ingevuld ? GROEN : PINK} strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={`${(omtrek * procent) / 100} ${omtrek}`} transform="rotate(-90 60 60)" />
                    <text x="60" y="58" textAnchor="middle" className="hv-kop" style={{ fontSize: 28, fontWeight: 700, fill: NAVY }}>{procent}%</text>
                    <text x="60" y="78" textAnchor="middle" style={{ fontSize: 12, fill: MUTE }}>{v.klaar} van {v.totaal}</text>
                  </svg>
                </span>
                <div className="flex flex-col gap-1">
                  <Label>Jullie evaluatie</Label>
                  <p className={`${kop} m-0 text-[21px] leading-[1.25]`} style={{ color: NAVY }}>
                    {ingevuld ? "Ingevuld, dank je wel!" : v.klaar ? `Nog ${v.totaal - v.klaar} ${v.totaal - v.klaar === 1 ? "punt" : "punten"} te gaan` : "Vier korte delen"}
                  </p>
                  {ingevuld && (
                    <span className="text-[14px] font-bold" style={{ color: punten.length ? "#B86E00" : GROEN }}>
                      {punten.length ? `${punten.length} ${punten.length === 1 ? "aandachtspunt" : "aandachtspunten"} voor ons gesprek` : "Alles geregeld of niet van toepassing"}
                    </span>
                  )}
                </div>
              </div>
              <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
                {ONDERDELEN.map((o, i) => {
                  const klaar = gedaan[o.id];
                  return (
                    <li key={o.id}>
                      <a href={`#${o.id}`} className="flex items-center gap-3 rounded-[14px] px-2 py-1.5 transition-colors hover:bg-[#F6F5FB]">
                        <span className={`${kop} grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px]`} style={{ background: klaar ? GROEN : LAV, color: klaar ? "#fff" : NAVY }}>
                          {klaar ? <Vink size={12} /> : i + 1}
                        </span>
                        <span className="flex-1 text-[15px] font-semibold" style={{ color: NAVY }}>{o.label}</span>
                        <span className="text-[12px] font-semibold tabular-nums" style={{ color: MUTE }}>{o.id === "checklist" ? `${v.klaar}/${v.totaal}` : klaar ? "ingevuld" : "mag leeg"}</span>
                      </a>
                    </li>
                  );
                })}
              </ol>
              <div className="flex items-center gap-3 border-t pt-5" style={{ borderColor: LINE }}>
                <span className={`${kop} flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-[15px] text-white`} style={{ background: NAVY }} aria-hidden="true">{initialen(e.afzender_naam)}</span>
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="text-[15px] font-bold" style={{ color: NAVY }}>{e.afzender_naam || "Team React2u"}</span>
                  <span className="truncate text-[13.5px]" style={{ color: MUTE }}>{e.afzender_functie ? `${e.afzender_functie}, React2u` : "Je aanspreekpunt bij React2u"}</span>
                  <a href={`mailto:${mail}`} className="truncate text-[13.5px] font-bold hover:underline" style={{ color: NAVY }}>{mail}</a>
                </span>
                <a href={tel} aria-label="Bel React2u" className="hv-btn hv-btn-rand flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                  <Icoon d={TELEFOON} size={16} />
                </a>
              </div>
            </aside>
          </div>
        </section>

        {ingevuld && (
          <section className="px-[6px] pt-4 md:px-6 md:pt-6 xl:px-10" aria-label="Je evaluatie is ingevuld">
            <div className="relative mx-auto flex max-w-[1360px] flex-col gap-3 overflow-clip rounded-[28px] px-6 py-8 md:flex-row md:items-center md:justify-between md:rounded-[36px] md:px-14" style={{ background: NAVY }}>
              <span aria-hidden className="absolute right-[-120px] top-[-140px] h-[300px] w-[300px] rounded-full" style={{ background: NAVY_LICHT }} />
              <div className="relative flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-white" style={{ background: GROEN }}><Vink size={20} /></span>
                <span className="flex flex-col">
                  <span className={`${kop} text-[22px] text-white`}>Dank je wel, je evaluatie is binnen</span>
                  <span className="text-[15px] text-white/75">Ingevuld {momentLang(e.ingevuld_at)}{e.ingevuld_door ? ` door ${e.ingevuld_door}` : ""}. Aanpassen kan tot ons gesprek; wij werken met de laatste versie.</span>
                </span>
              </div>
              <a href={`${basis}/pdf?download=1`} className={`${knop.wit} geen-print relative`}><Icoon d={DOWNLOAD} size={15} /> Download als pdf</a>
            </div>
          </section>
        )}

        <div className="h-10 md:h-16" />

        <EvaluatieFormulier token={token} modus={modus} begin={a} contactpersoon={e.contactpersoon} ingevuld={ingevuld} pdfHref={`${basis}/pdf`} />

        {/* Zo gaat het verder */}
        <section id="verder" aria-label="Zo gaat het verder" className="relative scroll-mt-[88px] overflow-clip" style={{ background: NAVY }}>
          <span aria-hidden className="absolute right-[-180px] top-[-220px] h-[540px] w-[540px] rounded-full" style={{ background: NAVY_LICHT }} />
          <div className={`${BREED} relative flex flex-col gap-10 py-16 md:gap-[52px] md:py-[104px]`}>
            <SectieKop
              eyebrow="Zo gaat het verder"
              titel={bezoek ? `We bespreken het op ${bezoek}.` : "Daarna bespreken we het samen."}
              tekst={`${voornaam(e.afzender_naam) || "Je aanspreekpunt"} neemt je antwoorden door en komt met een voorstel voor wat er nog niet geregeld is. De afspraken en acties uit ons gesprek zetten we erbij; je houdt de evaluatie als pdf.`}
              licht
            />
            <ol className="m-0 grid list-none gap-6 p-0 md:grid-cols-3 md:gap-8">
              {[
                { kop: "Jij vult in", tekst: `De checklist (${CHECKLIST.length} punten) en wat je kwijt wilt over onze dienstverlening en komend jaar.` },
                { kop: "Wij lezen mee", tekst: "Wat nog niet geregeld is, zetten we klaar voor het gesprek: met een voorstel waar dat helpt." },
                { kop: "Samen afspraken", tekst: "In ons gesprek leggen we de afspraken en acties vast; die komen in dezelfde evaluatie." },
              ].map((st, i) => (
                <li key={st.kop} className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-4 gap-y-1.5 md:flex md:flex-col md:gap-3.5" style={{ ["--ri" as string]: i }} data-reveal>
                  <span className={`${kop} row-span-2 grid h-12 w-12 shrink-0 place-items-center rounded-full text-[19px] text-white md:row-span-1`} style={{ background: "rgba(255,255,255,0.14)" }}>{i + 1}</span>
                  <span className={`${kop} text-[21px] leading-[1.3] text-white`}>{st.kop}</span>
                  <span className="col-start-2 text-[15.5px] leading-[1.65] md:col-start-auto" style={{ color: "rgba(255,255,255,0.75)" }}>{st.tekst}</span>
                </li>
              ))}
            </ol>
            <div className="flex flex-col gap-6 border-t pt-10 md:flex-row md:items-center md:justify-between" style={{ borderColor: "rgba(255,255,255,0.14)" }} data-reveal>
              <div className="flex flex-col gap-2">
                <p className={`${kop} m-0 text-[24px] text-white md:text-[28px]`}>Liever eerst even bellen?</p>
                <p className="m-0 max-w-[560px] text-[16px] leading-[1.7]" style={{ color: "rgba(255,255,255,0.75)" }}>
                  Bel of mail ons gerust, ook als je de evaluatie liever samen invult tijdens ons gesprek.
                </p>
              </div>
              <div className="geen-print flex flex-wrap gap-3">
                <a href={tel} className={knop.wit}><Icoon d={TELEFOON} size={15} /> Bel {telTekst}</a>
                <a href={`mailto:${mail}?subject=${encodeURIComponent(`Klantevaluatie ${e.bedrijf}`)}`} className={`hv-btn ${KNOP} border-[1.5px] border-white/40 text-white hover:bg-white/10`}><Icoon d={MAIL} size={15} /> Mail ons</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="pb-16 pt-12 md:pt-16" style={{ background: IVOOR }}>
        <div className={`${BREED} flex flex-col gap-8`}>
          <div className="grid gap-8 rounded-[22px] bg-white px-6 py-9 sm:grid-cols-2 md:px-10 lg:grid-cols-[1.1fr_1fr_1fr_1fr] lg:gap-10">
            <div className="flex flex-col gap-3">
              <Logo className="h-12 w-auto self-start" />
              <p className="m-0 text-[15px]" style={{ color: BODY }}>Jouw mensen, <span className="font-bold" style={{ color: NAVY }}>onze aandacht.</span></p>
            </div>
            <div className="flex flex-col gap-3">
              <p className="m-0 text-[15px] font-bold" style={{ color: NAVY }}>Bezoekadres</p>
              <p className="m-0 text-[15px] leading-[1.75]" style={{ color: BODY }}>React2u<br />{contact.addressLine1}<br />{contact.addressLine2}</p>
            </div>
            <div className="flex flex-col gap-3">
              <p className="m-0 text-[15px] font-bold" style={{ color: NAVY }}>Je aanspreekpunt</p>
              <p className="m-0 text-[15px] leading-[1.75]" style={{ color: BODY }}>
                {e.afzender_naam || "Team React2u"}<br />
                <a href={tel} className="font-bold hover:underline" style={{ color: NAVY }}>{telTekst}</a><br />
                <a href={`mailto:${mail}`} className="font-bold hover:underline" style={{ color: NAVY }}>{mail}</a>
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <p className="m-0 text-[15px] font-bold" style={{ color: NAVY }}>Deze evaluatie</p>
              <p className="m-0 text-[15px] leading-[1.75]" style={{ color: BODY }}>
                Klantevaluatie {e.nummer}<br />
                {e.verstuurd_at ? <>Verstuurd op {datumLang(e.verstuurd_at)}<br /></> : null}
                <a href={`${basis}/pdf?download=1`} className="font-bold hover:underline" style={{ color: NAVY }}>Als pdf</a><br />
                <a href={SITE_DOCUMENTEN.privacyverklaring} target="_blank" rel="noopener" className="font-bold hover:underline" style={{ color: NAVY }}>Privacyverklaring</a>
              </p>
            </div>
          </div>
          <p className="m-0 text-[13.5px]" style={{ color: MUTE }}>© {new Date().getFullYear()} React2u. KvK {contact.kvk}, btw {contact.btw}.</p>
        </div>
      </footer>
    </div>
  );
}
