import { Outfit } from "next/font/google";
import Logo from "@/components/site/Logo";
import { BODY, BREED, Eyebrow, kop, LAV, LINE, MUTE, NAVY, PINK, Pijl, SOFT, Vink } from "@/components/blocks/Gedeeld";
import type { ContactInfo } from "@/lib/content";
import { datumLang, momentLang, vulIn } from "@/lib/offertes";
import {
  BERICHT_STANDAARD, documentKlaar, gekozen, INRICHTING, MACHTIGING, ONBOARDING_EMAIL, VERZUIMPROTOCOL, voortgang, VRAGEN, vultIn, WELKOM,
  type DocumentInfo, type OnboardingPubliek, type TijdlijnStap, type Werknemer,
} from "@/lib/onboarding";
import { AfvinkKnop, VeldenFormulier, WerknemersFormulier, type Modus } from "./OnboardingActies";

/*
 * De onboardingpagina (/onboarding/<token>, migratie 0037): alles wat een
 * nieuwe klant nodig heeft om te starten, in de vormgeving van de site. Boven
 * het welkom met de voortgang, daaronder elk gekozen document als een stap:
 * om te lezen en af te vinken, of om direct online in te vullen. Elk document
 * is ook als pdf te downloaden, zodat de klant precies kan doorsturen wat
 * nodig is (het verzuimprotocol voor de medewerkers, de machtiging voor wie
 * moet tekenen).
 */

const outfit = Outfit({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-outfit", display: "swap" });

const KNOP = "inline-flex h-[50px] items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 text-[15px] font-bold";
const knop = { roze: `hv-btn hv-btn-roze ${KNOP}`, rand: `hv-btn hv-btn-rand ${KNOP}` };

const telLink = (t: string | null) => (t ? `tel:${t.replace(/[^\d+]/g, "")}` : null);
const voornaam = (n: string | null | undefined) => (n || "").trim().split(/\s+/)[0] || "";
const initialen = (naam: string | null) => {
  const d = (naam || "React2u").trim().split(/\s+/);
  return ((d[0]?.[0] || "R") + (d.length > 1 ? d[d.length - 1][0] : "")).toUpperCase();
};

function Download({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  );
}

/* ---------- de inhoud per leesdocument ---------- */

const FASE: Record<TijdlijnStap["fase"], { kleur: string; tint: string; naam: string }> = {
  start: { kleur: PINK, tint: "#FDECF4", naam: "De eerste dagen" },
  begeleiding: { kleur: "#00A098", tint: "#E5F6F4", naam: "Begeleiding" },
  uwv: { kleur: NAVY, tint: LAV, naam: "Eerste en tweede ziektejaar" },
  spoed: { kleur: "#F19001", tint: "#FEF3E2", naam: "Altijd" },
};

function WelkomInhoud() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: BODY }}>
        {WELKOM.intro.map((a) => <p key={a} className="m-0">{a}</p>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {(["start", "begeleiding", "uwv", "spoed"] as const).map((f) => (
          <div key={f} className={`rounded-[22px] p-5 md:p-6 ${f === "uwv" ? "lg:row-span-2" : ""}`} style={{ background: FASE[f].tint }}>
            <p className="m-0 mb-3 flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[1.3px]" style={{ color: FASE[f].kleur }}>
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: FASE[f].kleur }} />{FASE[f].naam}
            </p>
            <ol className="m-0 flex list-none flex-col p-0">
              {WELKOM.tijdlijn.filter((t) => t.fase === f).map((t, i) => (
                <li key={i} className="grid grid-cols-[104px_1fr] gap-3 border-t py-3 first:border-t-0 first:pt-0 last:pb-0" style={{ borderColor: "rgba(50,46,131,0.1)" }}>
                  <span className="text-[14.5px] font-bold" style={{ color: FASE[f].kleur }}>{t.moment}</span>
                  <span className="flex flex-col">
                    <span className="text-[15px] font-semibold leading-[1.45]" style={{ color: NAVY }}>{t.wat}</span>
                    <span className="text-[13.5px]" style={{ color: MUTE }}>{t.wie}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <p className={`${kop} m-0 border-l-[3px] pl-5 text-[20px] leading-[1.4] tracking-[-0.3px] md:text-[22px]`} style={{ color: NAVY, borderColor: PINK }}>{WELKOM.geruststelling}</p>
      <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
        {WELKOM.secties.map((s) => (
          <div key={s.kop} className="flex flex-col gap-2.5">
            <h4 className={`${kop} m-0 text-[19px] tracking-[-0.2px]`} style={{ color: NAVY }}>{s.kop}</h4>
            {s.alineas.map((a) => <p key={a} className="m-0 text-[15.5px] leading-[1.7]" style={{ color: BODY }}>{a}</p>)}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProtocolInhoud() {
  return (
    <div className="flex flex-col gap-6">
      <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: BODY }}>{VERZUIMPROTOCOL.intro} Deel het met je medewerkers, of hang de pdf op een plek waar iedereen hem ziet.</p>
      <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
        {VERZUIMPROTOCOL.stappen.map((st) => (
          <li key={st.letter} className="flex flex-col gap-3 rounded-[22px] p-5 md:p-6" style={{ background: SOFT }}>
            <span className={`${kop} grid h-14 w-14 place-items-center rounded-full text-white ${st.letter.length > 1 ? "text-[20px]" : "text-[26px]"}`} style={{ background: st.kleur }}>{st.letter}</span>
            <span className={`${kop} text-[19px] tracking-[-0.2px]`} style={{ color: st.kleur }}>{st.kop}</span>
            <span className="text-[15px] leading-[1.65]" style={{ color: BODY }}>{st.tekst}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function VragenInhoud() {
  return (
    <div className="flex flex-col gap-8">
      <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: BODY }}>{VRAGEN.intro}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[22px] p-6" style={{ background: "#EEF8F3" }}>
          <p className="m-0 mb-4 text-[12.5px] font-bold uppercase tracking-[1.3px] text-[#0A7A4B]">Dit mag je vragen</p>
          <div className="flex flex-col gap-4">
            {VRAGEN.welVragen.map((g) => (
              <div key={g.kop}>
                <p className="m-0 text-[16px] font-bold" style={{ color: NAVY }}>{g.kop}</p>
                <ul className="m-0 mt-1.5 flex list-none flex-col gap-1.5 p-0">
                  {g.punten.map((p) => (
                    <li key={p} className="flex gap-2.5 text-[15px] leading-[1.55]" style={{ color: BODY }}>
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#0A7A4B] text-white"><Vink size={11} /></span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-[22px] p-6" style={{ background: "#FDF0EF" }}>
            <p className="m-0 mb-4 text-[12.5px] font-bold uppercase tracking-[1.3px] text-[#B42318]">Dit vraag je niet</p>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {VRAGEN.nietVragen.map((p) => (
                <li key={p} className="flex gap-2.5 text-[15px] leading-[1.55]" style={{ color: BODY }}>
                  <span aria-hidden className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#B42318] text-[13px] font-bold text-white">×</span>{p}
                </li>
              ))}
            </ul>
            <p className="m-0 mt-3 text-[14px]" style={{ color: MUTE }}>{VRAGEN.nietToelichting}</p>
          </div>
          <div className="rounded-[22px] p-6" style={{ background: LAV }}>
            <p className="m-0 mb-3 text-[12.5px] font-bold uppercase tracking-[1.3px]" style={{ color: NAVY }}>Wat de bedrijfsarts doorgeeft</p>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {VRAGEN.bedrijfsarts.punten.map((p) => <li key={p} className="text-[15px] leading-[1.55]" style={{ color: BODY }}>• {p}</li>)}
            </ul>
            <p className="m-0 mt-3 text-[14px]" style={{ color: MUTE }}>{VRAGEN.bedrijfsarts.voorbeeld}</p>
          </div>
        </div>
      </div>
      <details className="group rounded-[22px] border" style={{ borderColor: LINE }}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 [&::-webkit-details-marker]:hidden">
          <span className="flex flex-col">
            <span className={`${kop} text-[19px]`} style={{ color: NAVY }}>Belscript bij een ziekmelding</span>
            <span className="text-[14.5px]" style={{ color: MUTE }}>Zeven stappen, letterlijk uit te spreken</span>
          </span>
          <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full text-[20px] transition-transform group-open:rotate-45" style={{ background: LAV, color: NAVY }}>+</span>
        </summary>
        <ol className="m-0 flex list-none flex-col gap-5 border-t px-6 py-6 p-0" style={{ borderColor: LINE }}>
          {VRAGEN.script.map((st, n) => (
            <li key={st.kop} className="flex gap-4 px-6">
              <span className={`${kop} grid h-9 w-9 shrink-0 place-items-center rounded-full text-[15px]`} style={{ background: "#FEF3E2", color: "#B86E00" }}>{n + 1}</span>
              <span className="flex flex-col gap-1">
                <span className="text-[15.5px] font-bold" style={{ color: NAVY }}>{st.kop}</span>
                <span className="text-[15.5px] italic leading-[1.6]" style={{ color: BODY }}>“{st.zin}”</span>
                {st.noot && <span className="text-[14px]" style={{ color: MUTE }}>{st.noot}</span>}
              </span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

/* ---------- een stap ---------- */

function Stap({ d, n, o, token, modus }: { d: DocumentInfo; n: number; o: OnboardingPubliek; token: string; modus: Modus }) {
  const invul = vultIn(o, d.sleutel);
  const klaar = documentKlaar(o, d.sleutel);
  const antwoord = o.antwoorden?.[d.sleutel];
  const pdf = `/onboarding/${token}/pdf/${d.sleutel}`;
  const excel = `/onboarding/${token}/excel`;
  const soort = invul ? "Online invullen" : d.invullen ? (d.excel ? "Excel invullen" : "Formulier") : "Lezen";
  const wanneer = invul ? antwoord?.at : o.gelezen?.[d.sleutel];

  let inhoud: React.ReactNode = null;
  let acties: React.ReactNode = null;
  if (d.sleutel === "welkom") inhoud = <WelkomInhoud />;
  if (d.sleutel === "verzuimprotocol") inhoud = <ProtocolInhoud />;
  if (d.sleutel === "vragen") inhoud = <VragenInhoud />;

  if (invul && d.sleutel === "inrichting") {
    inhoud = <VeldenFormulier token={token} document="inrichting" groepen={INRICHTING} begin={(antwoord?.data as Record<string, string>) || { bedrijfsnaam: o.bedrijf }} ingevuld={Boolean(antwoord)} modus={modus} knopTekst="Gegevens opslaan" />;
  } else if (invul && d.sleutel === "machtiging") {
    inhoud = (
      <div className="flex flex-col gap-6">
        <p className="m-0 text-[16px] leading-[1.7]" style={{ color: BODY }}>
          Stap je over van een andere arbodienst en loopt er een verzuimdossier? Dan mag dat dossier alleen met toestemming van de werknemer naar onze bedrijfsarts. Vul hieronder je vorige arbodienst in; daarna download je de machtiging, al ingevuld, om de werknemer te laten tekenen.
        </p>
        <VeldenFormulier token={token} document="machtiging" groepen={MACHTIGING} begin={(antwoord?.data as Record<string, string>) || {}} ingevuld={Boolean(antwoord)} modus={modus} knopTekst="Opslaan en machtiging maken" />
      </div>
    );
    if (antwoord) acties = <a href={`${pdf}?download=1`} className={knop.rand} style={{ background: "transparent" }}><Download /> Download de ingevulde machtiging</a>;
  } else if (invul && d.sleutel === "werknemers") {
    inhoud = (
      <div className="flex flex-col gap-6">
        <p className="m-0 text-[16px] leading-[1.7]" style={{ color: BODY }}>
          Met deze gegevens zetten we jullie medewerkers in ons verzuimsysteem, zodat een ziekmelding meteen goed binnenkomt. Je kunt tussendoor opslaan en later verder.
        </p>
        <WerknemersFormulier token={token} begin={((antwoord?.data as { rijen?: Werknemer[] } | undefined)?.rijen) || []} ingevuld={Boolean(antwoord)} modus={modus} excelHref={excel} />
      </div>
    );
  } else if (!invul && d.invullen) {
    // Een formulier dat niet online gaat: downloaden, invullen, terugmailen.
    inhoud = (
      <p className="m-0 text-[16px] leading-[1.7]" style={{ color: BODY }}>
        {d.sleutel === "werknemers"
          ? `Download het Excelbestand, vul per medewerker een regel in en mail het naar ${o.afzender_email || ONBOARDING_EMAIL}. Laat de kolomnamen staan: zo lezen we het direct in.`
          : d.sleutel === "machtiging"
            ? "Laat zieke medewerkers met een lopend dossier bij je vorige arbodienst deze machtiging tekenen, en stuur hem naar ons. Zo kan hun dossier naar onze bedrijfsarts."
            : `Download het formulier, vul het in en mail het naar ${o.afzender_email || ONBOARDING_EMAIL}.`}
      </p>
    );
  }

  if (!invul) {
    acties = (
      <>
        {d.sleutel === "werknemers" ? (
          <a href={excel} className={knop.rand} style={{ background: "transparent" }}><Download /> Download het Excelbestand</a>
        ) : (
          <a href={`${pdf}?download=1`} className={knop.rand} style={{ background: "transparent" }}><Download /> Download als pdf</a>
        )}
        <AfvinkKnop
          token={token}
          document={d.sleutel}
          klaar={klaar}
          modus={modus}
          tekst={d.invullen ? "Ingevuld en gemaild" : d.sleutel === "verzuimprotocol" ? "Gedeeld met mijn medewerkers" : "Gelezen"}
        />
      </>
    );
  } else if (d.sleutel === "inrichting" && antwoord) {
    acties = <a href={`${pdf}?download=1`} className="text-[14.5px] font-bold underline-offset-4 hover:underline" style={{ color: NAVY }}>Download je gegevens als pdf</a>;
  }

  return (
    <section id={`stap-${d.sleutel}`} aria-labelledby={`kop-${d.sleutel}`} className="scroll-mt-[104px] px-[6px] md:px-6 xl:px-10">
      <div className="relative mx-auto flex max-w-[1360px] flex-col gap-8 overflow-clip rounded-[28px] border bg-white px-6 py-8 md:rounded-[36px] md:p-12 lg:p-14" style={{ borderColor: LINE }}>
        <span aria-hidden className="absolute right-[-90px] top-[-90px] h-[220px] w-[220px] rounded-full" style={{ background: d.kleur, opacity: 0.07 }} />
        <header className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4 md:gap-5">
            <span className={`${kop} grid h-12 w-12 shrink-0 place-items-center rounded-full text-[18px] md:h-14 md:w-14 md:text-[20px]`} style={{ background: klaar ? "#0A7A4B" : d.tint, color: klaar ? "#fff" : d.kleur }}>
              {klaar ? <Vink size={20} /> : n}
            </span>
            <div className="flex flex-col gap-2">
              <span className="text-[12.5px] font-bold uppercase tracking-[1.3px]" style={{ color: d.kleur }}>{soort}</span>
              <h3 id={`kop-${d.sleutel}`} className={`${kop} m-0 text-[26px] leading-[1.12] tracking-[-0.6px] md:text-[34px]`} style={{ color: NAVY }}>{d.titel}</h3>
              <p className="m-0 max-w-[640px] text-[15.5px] leading-[1.6]" style={{ color: MUTE }}>{d.kort}</p>
            </div>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-2 self-start rounded-full px-4 py-2 text-[13.5px] font-bold ${klaar ? "bg-[#E3F6ED] text-[#0A7A4B]" : ""}`} style={klaar ? undefined : { background: SOFT, color: MUTE }}>
            {klaar ? <><Vink size={13} /> Klaar{wanneer ? ` · ${datumLang(wanneer)}` : ""}</> : "Nog te doen"}
          </span>
        </header>
        {inhoud && <div className="relative">{inhoud}</div>}
        {acties && <div className="relative flex flex-wrap items-start gap-3 border-t pt-6" style={{ borderColor: LINE }}>{acties}</div>}
      </div>
    </section>
  );
}

/* ---------- de pagina ---------- */

export default function OnboardingPagina({ o, token, contact, modus }: { o: OnboardingPubliek; token: string; contact: ContactInfo; modus: Modus }) {
  const docs = gekozen(o);
  const v = voortgang(o);
  const procent = v.totaal ? Math.round((v.klaar / v.totaal) * 100) : 0;
  const compleet = v.totaal > 0 && v.klaar === v.totaal;
  const tel = telLink(o.afzender_telefoon) || `tel:${contact.phone}`;
  const telTekst = o.afzender_telefoon || contact.phoneDisplay;
  const mail = o.afzender_email || ONBOARDING_EMAIL;
  const bericht = vulIn(o.bericht || BERICHT_STANDAARD, { bedrijf: o.bedrijf, contactpersoon: o.contactpersoon })
    .split(/\n\s*\n/).map((a) => a.trim()).filter(Boolean);
  const omtrek = 2 * Math.PI * 52;

  return (
    <div className={`hv ${outfit.variable} min-h-screen`} style={{ background: SOFT }}>
      {modus !== "klant" && (
        <div className="bg-[#FFF4E5] text-[14px] text-[#7A4A06]">
          <p className={`${BREED} m-0 py-2.5`}>
            {modus === "concept" ? "Voorbeeld van een concept: de klant ziet dit pas als je de onboarding verstuurt. Invullen kan nog niet." : "Je bekijkt deze onboarding als collega. Dit bezoek telt niet mee."}
          </p>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur-md" style={{ borderColor: LINE }}>
        <div className={`${BREED} flex h-[72px] items-center justify-between gap-4 md:h-[84px]`}>
          <div className="flex min-w-0 items-center gap-4">
            <Logo className="h-9 w-auto shrink-0 md:h-11" />
            <span className="hidden h-8 w-px sm:block" style={{ background: LINE }} aria-hidden="true" />
            <span className="hidden truncate text-[15px] font-bold sm:block" style={{ color: NAVY }}>Onboarding voor {o.bedrijf}</span>
          </div>
          <div className="flex shrink-0 items-center gap-5">
            <span className="hidden items-center gap-3 md:flex" aria-label={`${v.klaar} van ${v.totaal} stappen klaar`}>
              <span className="h-2 w-28 overflow-hidden rounded-full" style={{ background: LAV }}>
                <span className="block h-full rounded-full" style={{ width: `${procent}%`, background: compleet ? "#0A7A4B" : PINK }} />
              </span>
              <span className="text-[14px] font-bold" style={{ color: NAVY }}>{v.klaar}/{v.totaal}</span>
            </span>
            <a href={tel} className={`${knop.roze} !h-11 px-5 text-[14.5px]`}>Bel {voornaam(o.afzender_naam) || "ons"}</a>
          </div>
        </div>
      </header>

      <main className="flex flex-col gap-4 pb-16 pt-2 md:gap-6 md:pb-24 md:pt-6">
        <section className="px-[6px] md:px-6 xl:px-10">
          <div className="relative mx-auto grid max-w-[1360px] gap-10 overflow-clip rounded-[28px] px-6 pb-8 pt-10 md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-14 lg:p-16" style={{ background: LAV }}>
            <span aria-hidden className="absolute right-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full md:h-[560px] md:w-[560px]" style={{ background: NAVY, opacity: 0.1 }} />
            <span aria-hidden className="absolute bottom-[-120px] left-[38%] hidden h-[220px] w-[220px] rounded-full lg:block" style={{ background: PINK, opacity: 0.08 }} />
            <div className="relative flex flex-col gap-6">
              <p className="m-0 flex flex-wrap items-center gap-2.5 text-[14px] font-semibold" style={{ color: MUTE }}>
                <span>Onboarding {o.nummer}</span><span aria-hidden>/</span><span style={{ color: NAVY }}>{o.bedrijf}</span>
              </p>
              <h1 className={`${kop} m-0 text-[44px] leading-[1.02] tracking-[-1.4px] md:text-[64px] md:tracking-[-2px]`} style={{ color: NAVY }}>
                Welkom bij React2u.<br /><span style={{ color: PINK }}>Samen goed van start.</span>
              </h1>
              <div className="flex max-w-[620px] flex-col gap-3 border-t pt-6" style={{ borderColor: "rgba(50,46,131,0.12)" }}>
                <p className={`${kop} m-0 text-[24px] leading-[1.25] tracking-[-0.4px] md:text-[28px]`} style={{ color: NAVY }}>Beste {voornaam(o.contactpersoon) || "relatie"},</p>
                <div className="flex flex-col gap-3 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: BODY }}>
                  {bericht.map((a, i) => <p key={i} className="m-0">{a}</p>)}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href={`#stap-${docs.find((d) => !documentKlaar(o, d.sleutel))?.sleutel || docs[0]?.sleutel}`} className={knop.roze}>
                  {compleet ? "Bekijk je documenten" : v.klaar ? "Ga verder waar je was" : "Begin met stap 1"} <Pijl size={14} />
                </a>
              </div>
            </div>

            <aside className="relative flex flex-col gap-6 rounded-[24px] bg-white p-6 shadow-[0_24px_48px_-36px_rgba(50,46,131,0.45)] md:p-8">
              <div className="flex items-center gap-5">
                <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0" role="img" aria-label={`${procent}% klaar`}>
                  <circle cx="60" cy="60" r="52" fill="none" stroke={LAV} strokeWidth="10" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke={compleet ? "#0A7A4B" : PINK} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${(omtrek * procent) / 100} ${omtrek}`} transform="rotate(-90 60 60)" />
                  <text x="60" y="58" textAnchor="middle" className="hv-kop" style={{ fontSize: 28, fontWeight: 700, fill: NAVY }}>{procent}%</text>
                  <text x="60" y="78" textAnchor="middle" style={{ fontSize: 12, fill: MUTE }}>{v.klaar} van {v.totaal}</text>
                </svg>
                <div className="flex flex-col gap-1">
                  <p className="m-0 text-[12.5px] font-bold uppercase tracking-[1.2px]" style={{ color: MUTE }}>Jullie voortgang</p>
                  <p className={`${kop} m-0 text-[21px] leading-[1.25]`} style={{ color: NAVY }}>
                    {compleet ? "Alles klaar, dank je wel!" : `Nog ${v.totaal - v.klaar} ${v.totaal - v.klaar === 1 ? "stap" : "stappen"} te gaan`}
                  </p>
                </div>
              </div>
              <ol className="m-0 flex list-none flex-col gap-1 p-0">
                {docs.map((d, i) => {
                  const klaar = documentKlaar(o, d.sleutel);
                  return (
                    <li key={d.sleutel}>
                      <a href={`#stap-${d.sleutel}`} className="flex items-center gap-3 rounded-[14px] px-2 py-2 transition-colors hover:bg-[#F6F5FB]">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold" style={{ background: klaar ? "#0A7A4B" : d.tint, color: klaar ? "#fff" : d.kleur }}>
                          {klaar ? <Vink size={12} /> : i + 1}
                        </span>
                        <span className={`flex-1 text-[15px] font-semibold ${klaar ? "line-through decoration-[1.5px] opacity-60" : ""}`} style={{ color: NAVY }}>{d.titel}</span>
                        {vultIn(o, d.sleutel) && !klaar && <span className="rounded-full px-2.5 py-1 text-[11.5px] font-bold" style={{ background: "#FDECF4", color: PINK }}>Invullen</span>}
                      </a>
                    </li>
                  );
                })}
              </ol>
              <div className="flex items-center gap-4 border-t pt-5" style={{ borderColor: LINE }}>
                <span className={`${kop} grid h-12 w-12 shrink-0 place-items-center rounded-full text-[16px]`} style={{ background: LAV, color: NAVY }}>{initialen(o.afzender_naam)}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[16px] font-bold" style={{ color: NAVY }}>{o.afzender_naam || "Team React2u"}</span>
                  <span className="truncate text-[14px]" style={{ color: MUTE }}>{o.afzender_functie ? `${o.afzender_functie}, React2u` : "Je aanspreekpunt bij React2u"}</span>
                  <a href={`mailto:${mail}`} className="truncate text-[14px] font-bold hover:underline" style={{ color: NAVY }}>{mail}</a>
                </span>
              </div>
            </aside>
          </div>
        </section>

        {compleet && (
          <section className="px-[6px] md:px-6 xl:px-10">
            <div className="mx-auto flex max-w-[1360px] flex-col gap-3 rounded-[28px] px-6 py-8 md:flex-row md:items-center md:justify-between md:rounded-[36px] md:px-14" style={{ background: NAVY }}>
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#0A7A4B] text-white"><Vink size={20} /></span>
                <span className="flex flex-col">
                  <span className={`${kop} text-[22px] text-white`}>Jullie onboarding is compleet</span>
                  <span className="text-[15px] text-white/75">{o.afgerond_at ? `Afgerond op ${momentLang(o.afgerond_at)}. ` : ""}We richten alles in en nemen contact op als we nog iets nodig hebben.</span>
                </span>
              </div>
            </div>
          </section>
        )}

        {docs.map((d, i) => <Stap key={d.sleutel} d={d} n={i + 1} o={o} token={token} modus={modus} />)}

        <section className="px-[6px] md:px-6 xl:px-10">
          <div className="relative mx-auto grid max-w-[1360px] gap-6 overflow-clip rounded-[28px] px-6 py-10 md:grid-cols-[1fr_auto] md:items-center md:rounded-[36px] md:p-14" style={{ background: NAVY }}>
            <span aria-hidden className="absolute right-[-120px] top-[-140px] h-[360px] w-[360px] rounded-full bg-white opacity-[0.06]" />
            <div className="relative flex flex-col gap-3">
              <Eyebrow kleur="rgba(255,255,255,0.85)">Vragen?</Eyebrow>
              <h2 className={`${kop} m-0 text-[30px] leading-[1.12] tracking-[-0.8px] text-white md:text-[40px]`}>We helpen je graag op weg.</h2>
              <p className="m-0 max-w-[560px] text-[16px] leading-[1.7] text-white/75">Wil je wegwijs worden in het verzuimsysteem? Plan een afspraak op kantoor of online, dan lopen we het samen door.</p>
            </div>
            <div className="relative flex flex-wrap gap-3">
              <a href={tel} className={`hv-btn ${KNOP} border-[1.5px] border-white bg-white text-[#322E83]`}>Bel {telTekst} <Pijl size={14} /></a>
              <a href={`mailto:${mail}?subject=${encodeURIComponent(`Onboarding ${o.bedrijf}`)}`} className={`hv-btn ${KNOP} border-[1.5px] border-white/40 text-white`}>Mail ons</a>
            </div>
          </div>
        </section>

        <footer className={`${BREED} flex flex-col gap-2 pt-4 text-[13.5px] md:flex-row md:justify-between`} style={{ color: MUTE }}>
          <span>React2u II B.V. h.o.d.n. React2u · {contact.addressLine1}, {contact.addressLine2} · KvK {contact.kvk}</span>
          <span>{contact.phoneDisplay} · {contact.email}</span>
        </footer>
      </main>
    </div>
  );
}
