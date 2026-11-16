import { Outfit } from "next/font/google";
import Logo from "@/components/site/Logo";
import { BODY, BREED, Eyebrow, kop, LAV, LINE, NAVY, PINK, Pijl, SOFT, Vink } from "@/components/blocks/Gedeeld";
import type { ContactInfo } from "@/lib/content";
import { DOCUMENTEN as SITE_DOCUMENTEN } from "@/lib/documenten";
import { datumLang, momentLang, vulIn } from "@/lib/offertes";
import {
  BERICHT_STANDAARD, documentKlaar, gekozen, INRICHTING, MACHTIGING, ONBOARDING_EMAIL, VERZUIMPROTOCOL, voortgang, VRAGEN, vultIn, WELKOM,
  type DocumentInfo, type OnboardingPubliek, type TijdlijnStap, type Werknemer,
} from "@/lib/onboarding";
import { AfvinkKnop, VeldenFormulier, WerknemersFormulier, type Modus } from "./OnboardingActies";
import OnboardingKopbalk, { VolgendeBalk } from "./OnboardingKopbalk";

/*
 * De onboardingpagina (/onboarding/<token>, migratie 0037), en hetzelfde
 * scherm als voorbeeld in het beheer (/admin/onboardingvoorbeeld/<id>). Alles
 * wat een nieuwe klant nodig heeft om te starten, in de vormgeving van de
 * offerte- en contractpagina:
 *
 *  - de kopbalk met de stappen als genummerde rondjes, de voortgang en bellen;
 *  - de opening in de lila tint met het persoonlijke woord, de feiten en rechts
 *    de kaart met de voortgangsring, de stappen en het aanspreekpunt;
 *  - elk gekozen document als een stap op een wit vel: om te lezen en af te
 *    vinken, of om direct online in te vullen; elk ook als pdf, zodat de klant
 *    precies kan doorsturen wat nodig is (het verzuimprotocol voor de
 *    medewerkers, de machtiging voor wie moet tekenen);
 *  - de uitnodiging om te bellen, en de voet van de site.
 *
 * Modus: klant (de echte link), collega (een beheerder opent de link: het
 * bezoek telt niet), voorbeeld (vanuit het beheer, of een concept: niets kan
 * worden opgeslagen). `basis` is waar de pdf's en het Excelbestand vandaan
 * komen: de klantlink of het voorbeeld in het beheer.
 */

const outfit = Outfit({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-outfit", display: "swap" });

// Grijs van de site, net iets donkerder voor contrast (zoals de offerte- en contractpagina).
const MUTE = "#6B6985";
const IVOOR = "#F8F5F1";
const GROEN = "#0A7A4B";

const KNOP = "inline-flex h-[52px] items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 text-[15px] font-bold";
const knop = { roze: `hv-btn hv-btn-roze ${KNOP}`, rand: `hv-btn hv-btn-rand ${KNOP}` };

// De vlakken met een decoratieve cirkel gebruiken overflow-clip, geen overflow-hidden: een verborgen
// overloop is nog steeds te scrollen, en dan schuift een formulier opzij als de browser een veld in
// beeld scrolt (gezien in de browsertest van het contract).
const PAGINA_CSS = `
@media (prefers-reduced-motion: reduce) {
  .onboarding-doc *, .onboarding-doc *::before, .onboarding-doc *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
.onboarding-stip { transform: translate(-50%, -50%) scale(0); opacity: 0; animation: onboarding-stip 1000ms cubic-bezier(.2,.8,.2,1) forwards; }
@keyframes onboarding-stip { 0% { transform: translate(-50%, -50%) scale(0); opacity: 0; } 30% { opacity: 1; } 100% { transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1); opacity: 0; } }
.onboarding-vink { animation: onboarding-vink 520ms cubic-bezier(.2,1.4,.4,1) both; }
@keyframes onboarding-vink { from { transform: scale(.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .onboarding-stip, .onboarding-vink { animation: none; } }
@media print { .onboarding-doc header, .onboarding-doc .geen-print { display: none !important; } }
`;

const telLink = (t: string | null) => (t ? `tel:${t.replace(/[^\d+]/g, "")}` : null);
const voornaam = (n: string | null | undefined) => (n || "").trim().split(/\s+/)[0] || "";
const initialen = (naam: string | null) =>
  (naam || "React2u").split(/\s+/).filter(Boolean).map((w) => w[0]).filter((c) => /[A-Za-zÀ-ÿ]/.test(c)).slice(0, 2).join("").toUpperCase() || "R";

/* ---------- kleine bouwstenen ---------- */

function Icoon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
const TELEFOON = "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z";
const DOWNLOAD = "M12 3v12m0 0-4-4m4 4 4-4M5 21h14";

function Label({ children, kleur = MUTE }: { children: React.ReactNode; kleur?: string }) {
  return <span className="block text-[12.5px] font-bold uppercase tracking-[1.2px]" style={{ color: kleur }}>{children}</span>;
}

/** De stippen die uit het vinkje spatten als alles klaar is (zoals na het tekenen van een contract). */
function Feest() {
  const kleuren = [PINK, NAVY, PINK, "#ffffff"];
  return (
    <span className="pointer-events-none absolute inset-0 motion-reduce:hidden" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => {
        const hoek = (i / 16) * Math.PI * 2;
        const afstand = 58 + (i % 3) * 16;
        const maat = 7 + (i % 3) * 3;
        return (
          <span
            key={i}
            className="onboarding-stip absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: maat, height: maat, background: kleuren[i % kleuren.length],
              boxShadow: kleuren[i % kleuren.length] === "#ffffff" ? `0 0 0 1px ${PINK}` : undefined,
              ["--x" as string]: `${Math.cos(hoek) * afstand}px`,
              ["--y" as string]: `${Math.sin(hoek) * afstand}px`,
              animationDelay: `${150 + (i % 4) * 40}ms`,
            }}
          />
        );
      })}
    </span>
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
        <ol className="m-0 flex list-none flex-col gap-5 border-t px-6 py-6" style={{ borderColor: LINE }}>
          {VRAGEN.script.map((st, n) => (
            <li key={st.kop} className="flex gap-4">
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

function Stap({ d, n, o, token, basis, modus }: { d: DocumentInfo; n: number; o: OnboardingPubliek; token: string; basis: string; modus: Modus }) {
  const invul = vultIn(o, d.sleutel);
  const klaar = documentKlaar(o, d.sleutel);
  const antwoord = o.antwoorden?.[d.sleutel];
  const pdf = `${basis}/pdf/${d.sleutel}`;
  const excel = `${basis}/excel`;
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
    if (antwoord) acties = <a href={`${pdf}?download=1`} className={knop.rand}><Icoon d={DOWNLOAD} size={15} /> Download de ingevulde machtiging</a>;
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
          <a href={excel} className={knop.rand}><Icoon d={DOWNLOAD} size={15} /> Download het Excelbestand</a>
        ) : (
          <a href={`${pdf}?download=1`} className={knop.rand}><Icoon d={DOWNLOAD} size={15} /> Download als pdf</a>
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
    acties = <a href={`${pdf}?download=1`} className="inline-flex items-center gap-2 text-[14.5px] font-bold underline-offset-4 hover:underline" style={{ color: NAVY }}><Icoon d={DOWNLOAD} size={15} /> Download je gegevens als pdf</a>;
  }

  return (
    <section id={`stap-${d.sleutel}`} aria-labelledby={`kop-${d.sleutel}`} className="scroll-mt-[104px] px-[6px] md:px-6 xl:px-10">
      <div className="relative mx-auto flex max-w-[1360px] flex-col gap-8 overflow-clip rounded-[28px] border bg-white px-6 py-8 shadow-[0_24px_48px_-40px_rgba(50,46,131,0.35)] md:rounded-[36px] md:p-12 lg:p-14" style={{ borderColor: LINE }}>
        <span aria-hidden className="absolute right-[-90px] top-[-90px] h-[220px] w-[220px] rounded-full" style={{ background: d.kleur, opacity: 0.07 }} />
        <header className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4 md:gap-5">
            <span className={`${kop} grid h-12 w-12 shrink-0 place-items-center rounded-full text-[18px] md:h-14 md:w-14 md:text-[20px] ${klaar ? "onboarding-vink" : ""}`} style={{ background: klaar ? GROEN : d.tint, color: klaar ? "#fff" : d.kleur }}>
              {klaar ? <Vink size={20} /> : n}
            </span>
            <div className="flex flex-col gap-2">
              <Label kleur={d.kleur}>Stap {n} · {soort}</Label>
              <h3 id={`kop-${d.sleutel}`} className={`${kop} m-0 text-[26px] leading-[1.12] tracking-[-0.6px] md:text-[34px]`} style={{ color: NAVY }}>{d.titel}</h3>
              <p className="m-0 max-w-[640px] text-[15.5px] leading-[1.6]" style={{ color: MUTE }}>{d.kort}</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full px-4 py-2 text-[13.5px] font-bold" style={klaar ? { background: "#E3F6ED", color: GROEN } : { background: SOFT, color: MUTE }}>
            {klaar ? <><Vink size={13} /> Klaar{wanneer ? ` · ${datumLang(wanneer)}` : ""}</> : "Nog te doen"}
          </span>
        </header>
        {inhoud && <div className="relative">{inhoud}</div>}
        {acties && <div className="geen-print relative flex flex-wrap items-center gap-3 border-t pt-6" style={{ borderColor: LINE }}>{acties}</div>}
      </div>
    </section>
  );
}

/* ---------- de voet ---------- */

function Voet({ o, contact, mail, tel, telTekst }: { o: OnboardingPubliek; contact: ContactInfo; mail: string; tel: string; telTekst: string }) {
  const kolomkop = "m-0 text-[15px] font-bold";
  return (
    <footer className="pb-32 pt-12 md:pt-16 lg:pb-16" style={{ background: IVOOR }}>
      <div className={`${BREED} flex flex-col gap-8`}>
        <div className="grid gap-8 rounded-[22px] bg-white px-6 py-9 sm:grid-cols-2 md:px-10 lg:grid-cols-[1.1fr_1fr_1fr_1fr] lg:gap-10">
          <div className="flex flex-col gap-3">
            <Logo className="h-12 w-auto self-start" />
            <p className="m-0 text-[15px]" style={{ color: BODY }}>Jouw mensen, <span className="font-bold" style={{ color: NAVY }}>onze aandacht.</span></p>
          </div>
          <div className="flex flex-col gap-3">
            <p className={kolomkop} style={{ color: NAVY }}>Bezoekadres</p>
            <p className="m-0 text-[15px] leading-[1.75]" style={{ color: BODY }}>React2u<br />{contact.addressLine1}<br />{contact.addressLine2}</p>
          </div>
          <div className="flex flex-col gap-3">
            <p className={kolomkop} style={{ color: NAVY }}>Je aanspreekpunt</p>
            <p className="m-0 text-[15px] leading-[1.75]" style={{ color: BODY }}>
              {o.afzender_naam || "Team React2u"}<br />
              <a href={tel} className="font-bold hover:underline" style={{ color: NAVY }}>{telTekst}</a><br />
              <a href={`mailto:${mail}`} className="font-bold hover:underline" style={{ color: NAVY }}>{mail}</a>
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <p className={kolomkop} style={{ color: NAVY }}>Deze onboarding</p>
            <p className="m-0 text-[15px] leading-[1.75]" style={{ color: BODY }}>
              Onboarding {o.nummer}<br />
              {o.verstuurd_at ? <>Verstuurd op {datumLang(o.verstuurd_at)}<br /></> : null}
              <a href={SITE_DOCUMENTEN.algemeneVoorwaarden} target="_blank" rel="noopener" className="font-bold hover:underline" style={{ color: NAVY }}>Algemene voorwaarden</a><br />
              <a href={SITE_DOCUMENTEN.privacyverklaring} target="_blank" rel="noopener" className="font-bold hover:underline" style={{ color: NAVY }}>Privacyverklaring</a>
            </p>
          </div>
        </div>
        <p className="m-0 text-[13.5px]" style={{ color: MUTE }}>© {new Date().getFullYear()} React2u. KvK {contact.kvk}, btw {contact.btw}.</p>
      </div>
    </footer>
  );
}

/* ---------- de pagina ---------- */

export default function OnboardingPagina({
  o, token, basis, contact, modus, vers = false,
}: {
  o: OnboardingPubliek;
  token: string;
  basis: string;
  contact: ContactInfo;
  modus: Modus;
  /** Net klaar (minder dan een kwartier geleden): dan de felicitatie met de stippen. */
  vers?: boolean;
}) {
  const docs = gekozen(o);
  const v = voortgang(o);
  const procent = v.totaal ? Math.round((v.klaar / v.totaal) * 100) : 0;
  const compleet = v.totaal > 0 && v.klaar === v.totaal;
  const tel = telLink(o.afzender_telefoon) || `tel:${contact.phone}`;
  const telTekst = o.afzender_telefoon || contact.phoneDisplay.replace(/\s*-\s*/, " ");
  const mail = o.afzender_email || ONBOARDING_EMAIL;
  const bericht = vulIn(o.bericht || BERICHT_STANDAARD, { bedrijf: o.bedrijf, contactpersoon: o.contactpersoon })
    .split(/\n\s*\n/).map((a) => a.trim()).filter(Boolean);
  const omtrek = 2 * Math.PI * 52;
  const volgende = docs.find((d) => !documentKlaar(o, d.sleutel));
  const volgendeNr = volgende ? docs.indexOf(volgende) + 1 : 0;
  const feiten = [
    { label: "Onboarding", waarde: o.nummer },
    ...(o.verstuurd_at ? [{ label: "Verstuurd op", waarde: datumLang(o.verstuurd_at) }] : []),
    { label: "Stappen", waarde: `${v.klaar} van ${v.totaal} klaar` },
    { label: "Je aanspreekpunt", waarde: o.afzender_naam || "Team React2u" },
  ];

  return (
    <div className={`hv ${outfit.variable} onboarding-doc min-h-screen`} style={{ background: SOFT }}>
      <style>{PAGINA_CSS}</style>
      <OnboardingKopbalk
        nummer={o.nummer}
        stappen={docs.map((d, i) => ({ id: `stap-${d.sleutel}`, nr: i + 1, titel: d.titel, klaar: documentKlaar(o, d.sleutel) }))}
        klaar={v.klaar}
        totaal={v.totaal}
        tel={tel}
        telNaam={voornaam(o.afzender_naam) || "ons"}
      />
      {modus !== "klant" && (
        <div className="geen-print bg-[#FFF4E5] text-[14px] text-[#7A4A06]">
          <p className={`${BREED} m-0 py-2.5`}>
            {modus === "voorbeeld"
              ? o.status === "concept"
                ? "Voorbeeld van een concept: de klant ziet dit pas als je de onboarding verstuurt. Invullen kan hier niet."
                : "Voorbeeld: zo ziet de klant de onboarding. Invullen en afvinken doet hij via zijn eigen link."
              : "Je bekijkt deze onboarding als collega. Dit bezoek telt niet mee; wat je invult, staat op naam van de klant."}
          </p>
        </div>
      )}

      <main className="flex flex-col gap-4 pb-4 md:gap-6 md:pb-8">
        <section className="px-[6px] pt-2 md:px-6 md:pt-6 xl:px-10">
          <div className="relative mx-auto grid max-w-[1360px] gap-10 overflow-clip rounded-[28px] px-6 pb-8 pt-10 md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-14 lg:p-16 xl:p-[72px]" style={{ background: LAV }}>
            <span aria-hidden className="absolute right-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full md:h-[560px] md:w-[560px]" style={{ background: NAVY, opacity: 0.1 }} />
            <span aria-hidden className="absolute bottom-[-120px] left-[38%] hidden h-[220px] w-[220px] rounded-full lg:block" style={{ background: PINK, opacity: 0.08 }} />
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
              <div className="geen-print flex flex-wrap gap-3 pt-1">
                <a href={`#stap-${(volgende || docs[0])?.sleutel}`} className={knop.roze}>
                  {compleet ? "Bekijk je documenten" : v.klaar ? "Ga verder waar je was" : "Begin met stap 1"} <Pijl size={14} />
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
                        <span className={`${kop} grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px]`} style={{ background: klaar ? GROEN : d.tint, color: klaar ? "#fff" : d.kleur }}>
                          {klaar ? <Vink size={12} /> : i + 1}
                        </span>
                        <span className={`flex-1 text-[15px] font-semibold ${klaar ? "line-through decoration-[1.5px] opacity-60" : ""}`} style={{ color: NAVY }}>{d.titel}</span>
                        {vultIn(o, d.sleutel) && !klaar && <span className="rounded-full px-2.5 py-1 text-[11.5px] font-bold" style={{ background: "#FDECF4", color: PINK }}>Invullen</span>}
                      </a>
                    </li>
                  );
                })}
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
          <section className="px-[6px] md:px-6 xl:px-10" aria-label="Jullie onboarding is compleet">
            <div className="relative mx-auto flex max-w-[1360px] flex-col gap-3 overflow-clip rounded-[28px] px-6 py-8 md:flex-row md:items-center md:justify-between md:rounded-[36px] md:px-14" style={{ background: NAVY }}>
              <span aria-hidden className="absolute right-[-120px] top-[-140px] h-[300px] w-[300px] rounded-full bg-white opacity-[0.06]" />
              <div className="relative flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-white" style={{ background: GROEN }}><Vink size={20} /></span>
                <span className="flex flex-col">
                  <span className={`${kop} text-[22px] text-white`}>Jullie onboarding is compleet</span>
                  <span className="text-[15px] text-white/75">{o.afgerond_at ? `Afgerond ${momentLang(o.afgerond_at)}. ` : ""}We richten alles in en nemen contact op als we nog iets nodig hebben.</span>
                </span>
              </div>
            </div>
          </section>
        )}

        {docs.map((d, i) => <Stap key={d.sleutel} d={d} n={i + 1} o={o} token={token} basis={basis} modus={modus} />)}

        <section className="px-[6px] pb-6 md:px-6 md:pb-10 xl:px-10">
          <div className="relative mx-auto grid max-w-[1360px] gap-6 overflow-clip rounded-[28px] px-6 py-10 md:grid-cols-[1fr_auto] md:items-center md:rounded-[36px] md:p-14" style={{ background: NAVY }}>
            <span aria-hidden className="absolute right-[-120px] top-[-140px] h-[360px] w-[360px] rounded-full bg-white opacity-[0.06]" />
            <div className="relative flex flex-col gap-3">
              <Eyebrow kleur="rgba(255,255,255,0.85)">Vragen?</Eyebrow>
              <h2 className={`${kop} m-0 text-[30px] leading-[1.12] tracking-[-0.8px] text-white md:text-[40px]`}>We helpen je graag op weg.</h2>
              <p className="m-0 max-w-[560px] text-[16px] leading-[1.7] text-white/75">Wil je wegwijs worden in het verzuimsysteem? Plan een afspraak op kantoor of online, dan lopen we het samen door.</p>
            </div>
            <div className="geen-print relative flex flex-wrap gap-3">
              <a href={tel} className={`hv-btn ${KNOP} border-[1.5px] border-white bg-white text-[#322E83]`}><Icoon d={TELEFOON} size={15} /> Bel {telTekst}</a>
              <a href={`mailto:${mail}?subject=${encodeURIComponent(`Onboarding ${o.bedrijf}`)}`} className={`hv-btn ${KNOP} border-[1.5px] border-white/40 text-white`}>Mail {voornaam(o.afzender_naam) || "ons"} <Pijl size={14} /></a>
            </div>
          </div>
        </section>
      </main>

      <Voet o={o} contact={contact} mail={mail} tel={tel} telTekst={telTekst} />

      {volgende && modus !== "voorbeeld" && <VolgendeBalk id={`stap-${volgende.sleutel}`} titel={volgende.titel} nr={volgendeNr} />}
    </div>
  );
}
