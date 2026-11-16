import { Outfit } from "next/font/google";
import Logo from "@/components/site/Logo";
import { BODY, BREED, Eyebrow, kop, LAV, LINE, NAVY, PINK, Pijl, SOFT, Vink } from "@/components/blocks/Gedeeld";
import type { ContactInfo } from "@/lib/content";
import { DOCUMENTEN as SITE_DOCUMENTEN } from "@/lib/documenten";
import { datumLang, momentLang, vulIn } from "@/lib/offertes";
import {
  BERICHT_STANDAARD, documentKlaar, gekozen, hoofdstukkenVoor, INRICHTING, MACHTIGING, ONBOARDING_EMAIL, takenVoor, VERZUIMPROTOCOL, voortgang, VRAGEN,
  vultIn, WELKOM, type DocumentInfo, type OnboardingPubliek, type TijdlijnStap, type Werknemer,
} from "@/lib/onboarding";
import { AfvinkKnop, VeldenFormulier, WerknemersFormulier, type Modus } from "./OnboardingActies";
import OnboardingKopbalk, { VolgendeBalk } from "./OnboardingKopbalk";
import OnboardingReveal from "./OnboardingReveal";

/*
 * De onboardingpagina (/onboarding/<token>, migratie 0037), en hetzelfde
 * scherm als voorbeeld in het beheer (/admin/onboardingvoorbeeld/<id>). Eén
 * doorlopend verhaal in de vormgeving van de offertepagina (Rens, 16 nov 2026:
 * "S tier zoals de offerte module, een duidelijke, soepele overgang in de
 * verhaallijnen en professioneel"):
 *
 *  - de kopbalk met de hoofdstukken, de voortgang van de stappen en bellen;
 *  - de opening in de lila tint: het persoonlijke woord van de afzender, de
 *    feiten, en rechts de kaart met de voortgangsring, de stappen per
 *    hoofdstuk en het aanspreekpunt;
 *  - drie hoofdstukken als banden van rand tot rand, om en om wit en lila
 *    (HOOFDSTUKKEN in lib/onboarding.ts): zo werken we samen, je medewerkers
 *    voorbereiden, jullie gegevens. Elke stap heeft links een vaste kolom met
 *    nummer, titel, status en acties, en rechts de inhoud of het formulier;
 *  - de indigo band "Zo gaat het verder": wat React2u daarna doet, en bellen;
 *  - de voet van de site. Alles komt zacht in beeld tijdens het scrollen.
 *
 * Modus: klant (de echte link), collega (een beheerder opent de link: het
 * bezoek telt niet), voorbeeld (vanuit het beheer, of een concept: niets kan
 * worden opgeslagen). `basis` is waar de pdf's en het Excelbestand vandaan
 * komen: de klantlink of het voorbeeld in het beheer.
 */

const outfit = Outfit({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-outfit", display: "swap" });

// Grijs van de site, net iets donkerder voor contrast (zoals de offerte- en contractpagina).
const MUTE = "#6B6985";
const NAVY_LICHT = "#3B378F";
const IVOOR = "#F8F5F1";
const GROEN = "#0A7A4B";

const KNOP = "inline-flex h-[52px] items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 text-[15px] font-bold";
const knop = {
  roze: `hv-btn hv-btn-roze ${KNOP}`,
  rand: `hv-btn hv-btn-rand ${KNOP}`,
  wit: `hv-btn border-[1.5px] border-white bg-white text-[#322E83] ${KNOP}`,
};

// De vlakken met een decoratieve cirkel gebruiken overflow-clip, geen overflow-hidden: een verborgen
// overloop is nog steeds te scrollen, en dan schuift een formulier opzij als de browser een veld in
// beeld scrolt (gezien in de browsertest van het contract).
const PAGINA_CSS = `
.onboarding-doc.js-reveal [data-reveal]:not([data-in]) { opacity: 0; transform: translate3d(0, 22px, 0); }
.onboarding-doc.js-reveal [data-reveal] { transition: opacity .8s cubic-bezier(.2,.75,.2,1), transform .8s cubic-bezier(.2,.75,.2,1); transition-delay: calc(var(--ri, 0) * 80ms); }
.onboarding-stip { transform: translate(-50%, -50%) scale(0); opacity: 0; animation: onboarding-stip 1000ms cubic-bezier(.2,.8,.2,1) forwards; }
@keyframes onboarding-stip { 0% { transform: translate(-50%, -50%) scale(0); opacity: 0; } 30% { opacity: 1; } 100% { transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1); opacity: 0; } }
.onboarding-vink { animation: onboarding-vink 520ms cubic-bezier(.2,1.4,.4,1) both; }
@keyframes onboarding-vink { from { transform: scale(.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .onboarding-doc *, .onboarding-doc *::before, .onboarding-doc *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
  .onboarding-doc.js-reveal [data-reveal]:not([data-in]) { opacity: 1; transform: none; }
  .onboarding-stip, .onboarding-vink { animation: none; }
}
@media print { .onboarding-doc header, .onboarding-doc .geen-print { display: none !important; } .onboarding-doc [data-reveal] { opacity: 1 !important; transform: none !important; } }
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
const MAIL = "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm0 2 8 6 8-6";

function Label({ children, kleur = MUTE }: { children: React.ReactNode; kleur?: string }) {
  return <span className="block text-[12.5px] font-bold uppercase tracking-[1.2px]" style={{ color: kleur }}>{children}</span>;
}

/** De sectiekop van de site: links bovenkopje en kop, rechts een korte toelichting. */
function SectieKop({ eyebrow, titel, tekst, kleur = PINK, licht = false }: { eyebrow: string; titel: string; tekst?: React.ReactNode; kleur?: string; licht?: boolean }) {
  return (
    <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-6" data-reveal>
      <div className="flex flex-col gap-4 lg:col-span-7">
        <Eyebrow kleur={licht ? "rgba(255,255,255,0.85)" : kleur}>{eyebrow}</Eyebrow>
        <h2 className={`${kop} m-0 leading-[1.1] tracking-[-0.9px]`} style={{ color: licht ? "#ffffff" : NAVY, fontSize: "clamp(32px, 4vw, 46px)" }}>{titel}</h2>
      </div>
      {tekst && <div className="m-0 text-[16px] leading-[1.7] md:text-[17px] lg:col-span-4 lg:col-start-9" style={{ color: licht ? "rgba(255,255,255,0.8)" : BODY }}>{tekst}</div>}
    </div>
  );
}

/** Een band van rand tot rand, wit of in de lila tint, met de maten van de site. */
function Band({ id, tint, label, children }: { id: string; tint: boolean; label: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-label={label} className="scroll-mt-[96px]" style={{ background: tint ? LAV : "#ffffff" }}>
      <div className={`${BREED} flex flex-col gap-12 py-16 md:gap-16 md:py-[104px]`}>{children}</div>
    </section>
  );
}

/** De stippen die uit het vinkje spatten als alles klaar is (zoals na het tekenen van een offerte). */
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

function WelkomInhoud({ tint }: { tint: boolean }) {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3 text-[16.5px] leading-[1.75] md:text-[18px]" style={{ color: BODY }}>
        {WELKOM.intro.map((a) => <p key={a} className="m-0">{a}</p>)}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {(["start", "begeleiding", "uwv", "spoed"] as const).map((f, i) => (
          <div key={f} className={`rounded-[22px] p-5 md:p-6 ${f === "uwv" ? "md:row-span-2" : ""}`} style={{ background: f === "uwv" && tint ? "#ffffff" : FASE[f].tint, ["--ri" as string]: i }} data-reveal>
            <p className="m-0 mb-3 flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[1.3px]" style={{ color: FASE[f].kleur }}>
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: FASE[f].kleur }} />{FASE[f].naam}
            </p>
            <ol className="m-0 flex list-none flex-col p-0">
              {WELKOM.tijdlijn.filter((t) => t.fase === f).map((t, n) => (
                <li key={n} className="grid grid-cols-[104px_1fr] gap-3 border-t py-3 first:border-t-0 first:pt-0 last:pb-0" style={{ borderColor: "rgba(50,46,131,0.1)" }}>
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
      <figure className="m-0 flex flex-col gap-3" data-reveal>
        <span aria-hidden className={`${kop} text-[64px] leading-[0.6]`} style={{ color: PINK }}>“</span>
        <blockquote className="m-0">
          <p className={`${kop} m-0 text-[21px] leading-[1.45] md:text-[24px]`} style={{ color: NAVY, fontWeight: 500 }}>{WELKOM.geruststelling}</p>
        </blockquote>
      </figure>
      <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
        {WELKOM.secties.map((s, i) => (
          <div key={s.kop} className="flex flex-col gap-2.5" style={{ ["--ri" as string]: i }} data-reveal>
            <h4 className={`${kop} m-0 text-[20px] tracking-[-0.3px]`} style={{ color: NAVY }}>{s.kop}</h4>
            {s.alineas.map((a) => <p key={a} className="m-0 text-[15.5px] leading-[1.7]" style={{ color: BODY }}>{a}</p>)}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProtocolInhoud({ tint }: { tint: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <p className="m-0 text-[16.5px] leading-[1.75] md:text-[18px]" style={{ color: BODY }}>{VERZUIMPROTOCOL.intro} Deel het met je medewerkers, of hang de pdf op een plek waar iedereen hem ziet.</p>
      <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
        {VERZUIMPROTOCOL.stappen.map((st, i) => (
          <li key={st.letter} className="flex flex-col gap-3 rounded-[22px] p-5 md:p-6" style={{ background: tint ? "#ffffff" : SOFT, ["--ri" as string]: i }} data-reveal>
            <span className={`${kop} grid h-14 w-14 place-items-center rounded-full text-white ${st.letter.length > 1 ? "text-[20px]" : "text-[26px]"}`} style={{ background: st.kleur }}>{st.letter}</span>
            <span className={`${kop} text-[19px] tracking-[-0.2px]`} style={{ color: st.kleur }}>{st.kop}</span>
            <span className="text-[15px] leading-[1.65]" style={{ color: BODY }}>{st.tekst}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function VragenInhoud({ tint }: { tint: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <p className="m-0 text-[16.5px] leading-[1.75] md:text-[18px]" style={{ color: BODY }}>{VRAGEN.intro}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[22px] p-6" style={{ background: "#EEF8F3" }} data-reveal>
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
          <div className="rounded-[22px] p-6" style={{ background: "#FDF0EF", ["--ri" as string]: 1 }} data-reveal>
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
          <div className="rounded-[22px] p-6" style={{ background: tint ? "#ffffff" : LAV, ["--ri" as string]: 2 }} data-reveal>
            <p className="m-0 mb-3 text-[12.5px] font-bold uppercase tracking-[1.3px]" style={{ color: NAVY }}>Wat de bedrijfsarts doorgeeft</p>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {VRAGEN.bedrijfsarts.punten.map((p) => (
                <li key={p} className="flex gap-2.5 text-[15px] leading-[1.55]" style={{ color: BODY }}>
                  <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: NAVY }} />{p}
                </li>
              ))}
            </ul>
            <p className="m-0 mt-3 text-[14px]" style={{ color: MUTE }}>{VRAGEN.bedrijfsarts.voorbeeld}</p>
          </div>
        </div>
      </div>
      <details className="group rounded-[22px] border" style={{ borderColor: tint ? "rgba(50,46,131,0.16)" : LINE, background: tint ? "#ffffff" : "transparent" }} data-reveal>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 [&::-webkit-details-marker]:hidden">
          <span className="flex flex-col">
            <span className={`${kop} text-[19px]`} style={{ color: NAVY }}>Belscript bij een ziekmelding</span>
            <span className="text-[14.5px]" style={{ color: MUTE }}>Zeven stappen, letterlijk uit te spreken</span>
          </span>
          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[20px] transition-transform group-open:rotate-45" style={{ background: LAV, color: NAVY }}>+</span>
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

/**
 * Eén document als stap: links een kolom die op een groot scherm blijft staan
 * (nummer, titel, status en de acties), rechts de inhoud of het formulier.
 * Op de telefoon komen de acties onder de inhoud, zodat je eerst leest en
 * dan afvinkt.
 */
function Stap({ d, n, o, token, basis, modus, tint, eerste }: {
  d: DocumentInfo; n: number; o: OnboardingPubliek; token: string; basis: string; modus: Modus; tint: boolean; eerste: boolean;
}) {
  const invul = vultIn(o, d.sleutel);
  const klaar = documentKlaar(o, d.sleutel);
  const antwoord = o.antwoorden?.[d.sleutel];
  const pdf = `${basis}/pdf/${d.sleutel}`;
  const excel = `${basis}/excel`;
  const soort = invul ? "Online invullen" : d.invullen ? (d.excel ? "Excel invullen" : "Formulier") : "Lezen";
  const wanneer = invul ? antwoord?.at : o.gelezen?.[d.sleutel];
  const kaart: React.CSSProperties = tint
    ? { background: "#ffffff", boxShadow: "0 30px 70px -40px rgba(50,46,131,0.45)" }
    : { background: SOFT, border: `1px solid ${LINE}` };

  let inhoud: React.ReactNode = null;
  let acties: React.ReactNode = null;
  let formulier = false;
  if (d.sleutel === "welkom") inhoud = <WelkomInhoud tint={tint} />;
  if (d.sleutel === "verzuimprotocol") inhoud = <ProtocolInhoud tint={tint} />;
  if (d.sleutel === "vragen") inhoud = <VragenInhoud tint={tint} />;

  if (invul && d.sleutel === "inrichting") {
    formulier = true;
    inhoud = <VeldenFormulier token={token} document="inrichting" groepen={INRICHTING} begin={(antwoord?.data as Record<string, string>) || { bedrijfsnaam: o.bedrijf }} ingevuld={Boolean(antwoord)} modus={modus} knopTekst="Gegevens opslaan" />;
    if (antwoord) acties = <a href={`${pdf}?download=1`} className={knop.rand}><Icoon d={DOWNLOAD} size={15} /> Je gegevens als pdf</a>;
  } else if (invul && d.sleutel === "machtiging") {
    formulier = true;
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
    formulier = true;
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
      <div className="rounded-[22px] p-6 md:p-8" style={kaart}>
        <p className="m-0 text-[16px] leading-[1.7]" style={{ color: BODY }}>
          {d.sleutel === "werknemers"
            ? `Download het Excelbestand, vul per medewerker een regel in en mail het naar ${o.afzender_email || ONBOARDING_EMAIL}. Laat de kolomnamen staan: zo lezen we het direct in.`
            : d.sleutel === "machtiging"
              ? "Laat zieke medewerkers met een lopend dossier bij je vorige arbodienst deze machtiging tekenen, en stuur hem naar ons. Zo kan hun dossier naar onze bedrijfsarts."
              : `Download het formulier, vul het in en mail het naar ${o.afzender_email || ONBOARDING_EMAIL}.`}
        </p>
      </div>
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
  }

  return (
    <section
      id={`stap-${d.sleutel}`}
      aria-labelledby={`kop-${d.sleutel}`}
      className={`grid scroll-mt-[104px] gap-8 lg:grid-cols-12 lg:gap-10 ${eerste ? "" : "border-t pt-12 md:pt-16"}`}
      style={{ borderColor: tint ? "rgba(50,46,131,0.14)" : LINE }}
      data-reveal
    >
      {/* Op een groot scherm één kolom die blijft staan; op de telefoon staan kop, inhoud en acties onder elkaar. */}
      <div className="contents lg:col-span-4 lg:flex lg:flex-col lg:gap-6 lg:self-start lg:sticky lg:top-[120px]">
        <div className="order-1 flex flex-col gap-5">
          <span className={`${kop} grid h-14 w-14 place-items-center rounded-full text-[21px] ${klaar ? "onboarding-vink" : ""}`} style={{ background: klaar ? GROEN : tint ? "#ffffff" : d.tint, color: klaar ? "#ffffff" : d.kleur }}>
            {klaar ? <Vink size={22} /> : n}
          </span>
          <div className="flex flex-col gap-2.5">
            <Label kleur={d.kleur}>Stap {n} · {soort}</Label>
            <h3 id={`kop-${d.sleutel}`} className={`${kop} m-0 text-[28px] leading-[1.1] tracking-[-0.7px] md:text-[34px]`} style={{ color: NAVY }}>{d.titel}</h3>
            <p className="m-0 text-[15.5px] leading-[1.6]" style={{ color: MUTE }}>{d.kort}</p>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-[13.5px] font-bold" style={klaar ? { background: "#E3F6ED", color: GROEN } : { background: tint ? "#ffffff" : SOFT, color: MUTE }}>
            {klaar ? <><Vink size={13} /> Klaar{wanneer ? ` · ${datumLang(wanneer)}` : ""}</> : "Nog te doen"}
          </span>
        </div>
        {acties && <div className="geen-print order-3 flex flex-wrap gap-3 lg:order-2">{acties}</div>}
      </div>
      <div className="order-2 min-w-0 lg:order-none lg:col-span-8">
        {formulier ? <div className="rounded-[28px] p-6 md:p-10" style={kaart}>{inhoud}</div> : inhoud}
      </div>
    </section>
  );
}

/* ---------- zo gaat het verder ---------- */

/** De indigo band van de offertepagina: wat React2u doet zodra jullie gegevens binnen zijn, en bellen. */
function Verder({ o, tel, telTekst, mail }: { o: OnboardingPubliek; tel: string; telTekst: string; mail: string }) {
  const taken = takenVoor(o);
  return (
    <section id="verder" aria-label="Zo gaat het verder" className="relative scroll-mt-[88px] overflow-clip" style={{ background: NAVY }}>
      <span aria-hidden className="absolute right-[-180px] top-[-220px] h-[540px] w-[540px] rounded-full" style={{ background: NAVY_LICHT }} />
      <div className={`${BREED} relative flex flex-col gap-10 py-16 md:gap-[52px] md:py-[104px]`}>
        <SectieKop
          eyebrow="Zo gaat het verder"
          titel="Daarna gaan wij aan de slag."
          tekst="Zodra jullie gegevens binnen zijn, richten we alles in. Je hoort van ons als we klaar zijn, of als we nog iets nodig hebben."
          licht
        />
        <ol className={`m-0 grid list-none gap-6 p-0 md:grid-cols-2 md:gap-8 ${taken.length >= 4 ? "lg:grid-cols-3" : ""}`}>
          {taken.map((t, i) => (
            <li key={t.sleutel} className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-4 gap-y-1.5 md:flex md:flex-col md:gap-3.5" style={{ ["--ri" as string]: i }} data-reveal>
              <span className="row-span-2 flex items-start gap-3 md:row-span-1 md:items-center">
                <span className={`${kop} grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-[19px]`} style={{ color: NAVY }}>{i + 1}</span>
              </span>
              <span className="text-[13px] font-bold uppercase tracking-[1.3px] md:mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>Stap {i + 1}</span>
              <span className={`${kop} col-start-2 text-[21px] leading-[1.3] text-white`}>{t.klantKop}</span>
              <span className="col-start-2 text-[15.5px] leading-[1.65]" style={{ color: "rgba(255,255,255,0.75)" }}>{t.klant}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-6 border-t pt-10 md:flex-row md:items-center md:justify-between" style={{ borderColor: "rgba(255,255,255,0.14)" }} data-reveal>
          <div className="flex flex-col gap-2">
            <p className={`${kop} m-0 text-[24px] text-white md:text-[28px]`}>Vragen? We helpen je graag op weg.</p>
            <p className="m-0 max-w-[560px] text-[16px] leading-[1.7]" style={{ color: "rgba(255,255,255,0.75)" }}>
              Bel of mail {voornaam(o.afzender_naam) || "ons"} gerust, ook tussendoor. Wil je wegwijs worden in het verzuimsysteem? Plan een afspraak op kantoor of online.
            </p>
          </div>
          <div className="geen-print flex flex-wrap gap-3">
            <a href={tel} className={knop.wit}><Icoon d={TELEFOON} size={15} /> Bel {telTekst}</a>
            <a href={`mailto:${mail}?subject=${encodeURIComponent(`Onboarding ${o.bedrijf}`)}`} className={`hv-btn ${KNOP} border-[1.5px] border-white/40 text-white hover:bg-white/10`}><Icoon d={MAIL} size={15} /> Mail {voornaam(o.afzender_naam) || "ons"}</a>
          </div>
        </div>
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
  const hoofdstukken = hoofdstukkenVoor(o);
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
  const nummerVan = (d: DocumentInfo) => docs.indexOf(d) + 1;
  const feiten = [
    { label: "Onboarding", waarde: o.nummer },
    ...(o.verstuurd_at ? [{ label: "Verstuurd op", waarde: datumLang(o.verstuurd_at) }] : []),
    { label: "Stappen", waarde: `${v.klaar} van ${v.totaal} klaar` },
    { label: "Je aanspreekpunt", waarde: o.afzender_naam || "Team React2u" },
  ];
  const onderdelen = [...hoofdstukken.map((h) => ({ id: `hoofdstuk-${h.id}`, label: h.label })), { id: "verder", label: "Verder" }];

  return (
    <div className={`hv ${outfit.variable} onboarding-doc min-h-screen bg-white`}>
      <style>{PAGINA_CSS}</style>
      <OnboardingReveal />
      <OnboardingKopbalk nummer={o.nummer} onderdelen={onderdelen} klaar={v.klaar} totaal={v.totaal} tel={tel} telNaam={voornaam(o.afzender_naam) || "ons"} />
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

      <main>
        <section id="opening" className="px-[6px] pt-2 md:px-6 md:pt-6 xl:px-10">
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
              <ol className="m-0 flex list-none flex-col gap-4 p-0">
                {hoofdstukken.map((h, hi) => (
                  <li key={h.id} className="flex flex-col gap-1">
                    <a href={`#hoofdstuk-${h.id}`} className="px-2 text-[12px] font-bold uppercase tracking-[1.2px] hover:underline" style={{ color: MUTE }}>Hoofdstuk {hi + 1} · {h.label}</a>
                    <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
                      {h.docs.map((d) => {
                        const klaar = documentKlaar(o, d.sleutel);
                        return (
                          <li key={d.sleutel}>
                            <a href={`#stap-${d.sleutel}`} className="flex items-center gap-3 rounded-[14px] px-2 py-1.5 transition-colors hover:bg-[#F6F5FB]">
                              <span className={`${kop} grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px]`} style={{ background: klaar ? GROEN : d.tint, color: klaar ? "#fff" : d.kleur }}>
                                {klaar ? <Vink size={12} /> : nummerVan(d)}
                              </span>
                              <span className={`flex-1 text-[15px] font-semibold ${klaar ? "line-through decoration-[1.5px] opacity-60" : ""}`} style={{ color: NAVY }}>{d.titel}</span>
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
              <a href="#verder" className={`${knop.wit} relative geen-print`}>Wat er nu gebeurt <Pijl size={14} /></a>
            </div>
          </section>
        )}

        <div className="h-10 md:h-16" />

        {hoofdstukken.map((h, hi) => {
          const tint = hi % 2 === 1;
          return (
            <Band key={h.id} id={`hoofdstuk-${h.id}`} tint={tint} label={h.eyebrow}>
              <SectieKop eyebrow={`Hoofdstuk ${hi + 1} van ${hoofdstukken.length} · ${h.eyebrow}`} titel={h.titel} tekst={h.tekst} />
              {h.docs.map((d, di) => <Stap key={d.sleutel} d={d} n={nummerVan(d)} o={o} token={token} basis={basis} modus={modus} tint={tint} eerste={di === 0} />)}
            </Band>
          );
        })}

        <Verder o={o} tel={tel} telTekst={telTekst} mail={mail} />
      </main>

      <Voet o={o} contact={contact} mail={mail} tel={tel} telTekst={telTekst} />

      {volgende && modus !== "voorbeeld" && <VolgendeBalk id={`stap-${volgende.sleutel}`} titel={volgende.titel} nr={nummerVan(volgende)} />}
    </div>
  );
}
