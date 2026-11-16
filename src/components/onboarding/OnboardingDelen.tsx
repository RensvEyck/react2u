import { Outfit } from "next/font/google";
import Beeld from "@/components/site/Beeld";
import Logo from "@/components/site/Logo";
import { BODY, BREED, Eyebrow, KEURMERKEN, kop, LAV, LINE, NAVY, PINK, Pijl, SOFT, Vink } from "@/components/blocks/Gedeeld";
import type { ContactInfo } from "@/lib/content";
import { DOCUMENTEN as SITE_DOCUMENTEN } from "@/lib/documenten";
import { datumLang } from "@/lib/offertes";
import {
  documentInfo, documentKlaar, INRICHTING, MACHTIGING, machtigingStand, ONBOARDING_EMAIL, taakKan, takenVoor, VERZUIMPROTOCOL, VRAGEN, vultIn, WELKOM,
  type DocumentInfo, type OnboardingPubliek, type TijdlijnStap, type Werknemer,
} from "@/lib/onboarding";
import { AfvinkKnop, VeldenFormulier, WerknemersFormulier, type Modus, MachtigingUitnodigen } from "./OnboardingActies";

/*
 * De bouwstenen van de onboarding voor de klant (migratie 0037), gedeeld door
 * de hub (OnboardingPagina.tsx: de opening en de hoofdstukken als checklist) en
 * de stappagina's (OnboardingStapPagina.tsx: één document per pagina). Alles in
 * de vormgeving van de offertepagina: de banden, de sectiekop, de vaste kolom
 * per stap, de reis, de poster-slinger, de keurmerken, de indigo band en de
 * voet. `basis` is waar de stappen, de pdf's en het Excelbestand vandaan komen:
 * de klantlink (/onboarding/<token>) of het voorbeeld in het beheer
 * (/admin/onboardingvoorbeeld/<id>).
 */

export const outfit = Outfit({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-outfit", display: "swap" });

// Grijs van de site, net iets donkerder voor contrast (zoals de offerte- en contractpagina).
export const MUTE = "#6B6985";
export const NAVY_LICHT = "#3B378F";
export const IVOOR = "#F8F5F1";
export const GROEN = "#0A7A4B";

export const KNOP = "inline-flex h-[52px] items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 text-[15px] font-bold";
export const knop = {
  roze: `hv-btn hv-btn-roze ${KNOP}`,
  rand: `hv-btn hv-btn-rand ${KNOP}`,
  wit: `hv-btn border-[1.5px] border-white bg-white text-[#322E83] ${KNOP}`,
};

// De vlakken met een decoratieve cirkel gebruiken overflow-clip, geen overflow-hidden: een verborgen
// overloop is nog steeds te scrollen, en dan schuift een formulier opzij als de browser een veld in
// beeld scrolt (gezien in de browsertest van het contract).
export const PAGINA_CSS = `
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

export const telLink = (t: string | null) => (t ? `tel:${t.replace(/[^\d+]/g, "")}` : null);
export const voornaam = (n: string | null | undefined) => (n || "").trim().split(/\s+/)[0] || "";
export const initialen = (naam: string | null) =>
  (naam || "React2u").split(/\s+/).filter(Boolean).map((w) => w[0]).filter((c) => /[A-Za-zÀ-ÿ]/.test(c)).slice(0, 2).join("").toUpperCase() || "R";

/* ---------- kleine bouwstenen ---------- */

export function Icoon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
export const TELEFOON = "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z";
export const DOWNLOAD = "M12 3v12m0 0-4-4m4 4 4-4M5 21h14";
export const MAIL = "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm0 2 8 6 8-6";

export function Label({ children, kleur = MUTE }: { children: React.ReactNode; kleur?: string }) {
  return <span className="block text-[12.5px] font-bold uppercase tracking-[1.2px]" style={{ color: kleur }}>{children}</span>;
}

/** De sectiekop van de site: links bovenkopje en kop, rechts een korte toelichting. */
export function SectieKop({ eyebrow, titel, tekst, kleur = PINK, licht = false }: { eyebrow: string; titel: string; tekst?: React.ReactNode; kleur?: string; licht?: boolean }) {
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
export function Band({ id, tint, label, children }: { id: string; tint: boolean; label: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-label={label} className="scroll-mt-[96px]" style={{ background: tint ? LAV : "#ffffff" }}>
      <div className={`${BREED} flex flex-col gap-12 py-16 md:gap-16 md:py-[104px]`}>{children}</div>
    </section>
  );
}

/** De stippen die uit het vinkje spatten als alles klaar is (zoals na het tekenen van een offerte). */
export function Feest() {
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

export const FASE: Record<TijdlijnStap["fase"], { kleur: string; tint: string; naam: string }> = {
  start: { kleur: PINK, tint: "#FDECF4", naam: "De eerste dagen" },
  begeleiding: { kleur: "#00A098", tint: "#E5F6F4", naam: "Begeleiding" },
  uwv: { kleur: NAVY, tint: LAV, naam: "Eerste en tweede ziektejaar" },
  spoed: { kleur: "#F19001", tint: "#FEF3E2", naam: "Altijd" },
};

/**
 * De tijdlijn van ziekmelding tot WIA als één reis: een doorlopende lijn met
 * stippen in de kleur van de fase, links de eerste dagen en de begeleiding,
 * rechts het eerste en tweede ziektejaar. Bij elke stap van React2u of de
 * bedrijfsarts staat "Wij bewaken dit": dat is de belofte van de brief.
 */
export function Reis({ tint }: { tint: boolean }) {
  const kolommen = [
    WELKOM.tijdlijn.filter((t) => t.fase === "start" || t.fase === "begeleiding"),
    WELKOM.tijdlijn.filter((t) => t.fase === "uwv"),
  ];
  const spoed = WELKOM.tijdlijn.find((t) => t.fase === "spoed");
  const masker = tint ? LAV : "#ffffff";
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-x-12 gap-y-6 lg:grid-cols-2">
        {kolommen.map((lijst, k) => (
          <ol key={k} className="relative m-0 flex list-none flex-col p-0">
            <span aria-hidden className="absolute bottom-6 left-[11px] top-8 w-[2px] rounded-full" style={{ background: "rgba(50,46,131,0.14)" }} />
            {lijst.map((t, i) => {
              const f = FASE[t.fase];
              const nieuweFase = i === 0 || lijst[i - 1].fase !== t.fase;
              const wij = /React2u|Bedrijfsarts/.test(t.wie);
              return (
                <li key={i} className={`relative grid grid-cols-[24px_minmax(0,1fr)] gap-x-4 ${nieuweFase && i > 0 ? "mt-3" : ""}`} data-reveal style={{ ["--ri" as string]: i % 4 }}>
                  {nieuweFase && (
                    <span className="col-start-2 mb-2.5 flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[1.3px]" style={{ color: f.kleur }}>
                      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: f.kleur }} />{f.naam}
                    </span>
                  )}
                  <span className="relative z-[1] mt-[3px] grid h-6 w-6 place-items-center rounded-full" style={{ background: masker }}>
                    <span className="h-3.5 w-3.5 rounded-full" style={{ background: f.kleur, boxShadow: `0 0 0 4px ${f.tint}` }} />
                  </span>
                  <div className="flex flex-col gap-0.5 pb-5">
                    <span className="text-[13.5px] font-bold" style={{ color: f.kleur }}>{t.moment}</span>
                    <span className="text-[16px] font-semibold leading-[1.4]" style={{ color: NAVY }}>{t.wat}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px]" style={{ color: MUTE }}>
                      {t.wie}
                      {wij && <span className="rounded-full px-2 py-0.5 text-[11.5px] font-bold" style={{ background: LAV, color: NAVY }}>Wij bewaken dit</span>}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        ))}
      </div>
      {spoed && (
        <div className="flex items-start gap-4 rounded-[22px] p-5 md:items-center md:p-6" style={{ background: FASE.spoed.tint }} data-reveal>
          <span className={`${kop} grid h-11 w-11 shrink-0 place-items-center rounded-full text-[20px] text-white`} style={{ background: FASE.spoed.kleur }}>!</span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[12.5px] font-bold uppercase tracking-[1.3px]" style={{ color: FASE.spoed.kleur }}>{FASE.spoed.naam} · {spoed.moment}</span>
            <span className="text-[16px] font-semibold leading-[1.45]" style={{ color: NAVY }}>{spoed.wat}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function WelkomInhoud({ tint }: { tint: boolean }) {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3 text-[16.5px] leading-[1.75] md:text-[18px]" style={{ color: BODY }}>
        {WELKOM.intro.map((a) => <p key={a} className="m-0">{a}</p>)}
      </div>
      <Reis tint={tint} />
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

/**
 * Het verzuimprotocol zoals de poster: de letters R-E-A-C-T-2U in witte rondjes
 * op de indigo lijn die slingert, met een stippellijn naar het kaartje in de
 * kleur van de stap en een schaduw die iets verschoven staat.
 */
export function ProtocolInhoud({ tint }: { tint: boolean }) {
  const ring = tint ? LAV : "#ffffff";
  return (
    <div className="flex flex-col gap-6">
      <p className="m-0 text-[16.5px] leading-[1.75] md:text-[18px]" style={{ color: BODY }}>{VERZUIMPROTOCOL.intro} Deel het met je medewerkers, of hang de pdf op een plek waar iedereen hem ziet.</p>
      <ol className="relative m-0 flex list-none flex-col gap-3 p-0 md:gap-4">
        <span aria-hidden className="absolute bottom-8 left-[29px] top-8 w-[6px] rounded-full md:left-[41px]" style={{ background: NAVY, opacity: 0.92 }} />
        {VERZUIMPROTOCOL.stappen.map((st, i) => (
          <li key={st.letter} className="relative grid grid-cols-[64px_minmax(0,1fr)] items-center gap-x-4 md:grid-cols-[88px_minmax(0,1fr)] md:gap-x-5" data-reveal style={{ ["--ri" as string]: i % 3 }}>
            <span
              className={`${kop} relative z-[1] grid h-[64px] w-[64px] place-items-center rounded-full bg-white md:h-[76px] md:w-[76px] ${st.letter.length > 1 ? "text-[22px] md:text-[26px]" : "text-[30px] md:text-[36px]"} ${i % 2 ? "md:translate-x-3" : ""}`}
              style={{ color: st.kleur, boxShadow: `0 0 0 5px ${ring}, 0 14px 28px -18px rgba(50,46,131,0.5)` }}
            >
              {st.letter}
            </span>
            <span aria-hidden className={`absolute top-1/2 hidden w-5 border-t-2 border-dotted md:block ${i % 2 ? "left-[100px]" : "left-[88px]"}`} style={{ borderColor: NAVY }} />
            <div className="rounded-[18px] border-[2px] bg-white p-5 md:ml-6 md:p-6" style={{ borderColor: st.kleur, boxShadow: `6px 6px 0 0 ${NAVY}` }}>
              <span className={`${kop} block text-[17px] uppercase tracking-[1.2px] md:text-[18px]`} style={{ color: st.kleur }}>{st.kop}</span>
              <span className="mt-1.5 block text-[15px] leading-[1.65]" style={{ color: BODY }}>{st.tekst}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function VragenInhoud({ tint }: { tint: boolean }) {
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
      {/* De samenvatting in tabelvorm, zoals in het document en de pdf. */}
      <div className="overflow-hidden rounded-[22px] border" style={{ borderColor: tint ? "rgba(50,46,131,0.16)" : LINE, background: tint ? "#ffffff" : "transparent" }} data-reveal>
        <p className={`${kop} m-0 px-6 pt-5 text-[19px]`} style={{ color: NAVY }}>In één oogopslag</p>
        <table className="mt-3 w-full border-collapse text-[15px]">
          <thead>
            <tr className="text-left text-[12.5px] font-bold uppercase tracking-[1.2px]" style={{ color: MUTE, background: tint ? SOFT : "rgba(50,46,131,0.04)" }}>
              <th className="px-6 py-3 font-bold">Onderwerp</th>
              <th className="px-3 py-3 font-bold">Mag je vragen?</th>
              <th className="hidden px-6 py-3 font-bold sm:table-cell">Opmerking</th>
            </tr>
          </thead>
          <tbody>
            {VRAGEN.tabel.map((r) => (
              <tr key={r.onderwerp} className="border-t" style={{ borderColor: LINE }}>
                <td className="px-6 py-3 font-semibold" style={{ color: NAVY }}>
                  {r.onderwerp}
                  <span className="mt-0.5 block text-[13.5px] font-normal sm:hidden" style={{ color: MUTE }}>{r.opmerking}</span>
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[12.5px] font-bold" style={r.mag ? { background: "#E3F6ED", color: GROEN } : { background: "#FDECEA", color: "#B42318" }}>{r.mag ? "Ja" : "Nee"}</span>
                </td>
                <td className="hidden px-6 py-3 sm:table-cell" style={{ color: BODY }}>{r.opmerking}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="group rounded-[22px] border" style={{ borderColor: tint ? "rgba(50,46,131,0.16)" : LINE, background: tint ? "#ffffff" : "transparent" }} data-reveal>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 [&::-webkit-details-marker]:hidden">
          <span className="flex flex-col">
            <span className={`${kop} text-[19px]`} style={{ color: NAVY }}>Belscript bij een ziekmelding</span>
            <span className="text-[14.5px]" style={{ color: MUTE }}>Zeven stappen, letterlijk uit te spreken, en wat je daarna noteert</span>
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
        {/* De toelichting voor de eigen HR-documentatie, uit hetzelfde document. */}
        <div className="mx-6 mb-6 rounded-[16px] p-5" style={{ background: tint ? SOFT : LAV }}>
          <p className="m-0 mb-2 text-[12.5px] font-bold uppercase tracking-[1.2px]" style={{ color: NAVY }}>Voor je eigen dossier</p>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {VRAGEN.intern.map((p) => (
              <li key={p} className="flex gap-2.5 text-[15px] leading-[1.55]" style={{ color: BODY }}>
                <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: NAVY }} />{p}
              </li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  );
}

/* ---------- zekerheid bij jullie gegevens ---------- */

/** Bij het aanleveren van gegevens: de keurmerken die daarover gaan, met wat ze voor de klant betekenen. */
export function Zekerheid({ tint }: { tint: boolean }) {
  const items = [
    { naam: "ISO 27001", kop: "Beveiligd", tekst: "Wat je hier invult gaat over een beveiligde verbinding naar een omgeving die jaarlijks wordt getoetst op informatiebeveiliging." },
    { naam: "ISO 27701", kop: "Privacy", tekst: "Burgerservicenummers gebruiken we alleen om je medewerkers in XpertSuite te zetten. Daarna wissen we ze hier." },
    { naam: "SBCA", kop: "Gecertificeerde arbodienst", tekst: "Onafhankelijke instellingen toetsen elk jaar hoe we werken en hoe we met gegevens omgaan." },
  ].map((i) => ({ ...i, k: KEURMERKEN.find((k) => k.naam === i.naam) }));
  return (
    <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-3 md:gap-4" aria-label="Jullie gegevens in goede handen" data-reveal>
      {items.map((i) => (
        <li key={i.naam} className="flex items-start gap-4 rounded-[20px] p-5" style={tint ? { background: "#ffffff" } : { background: SOFT, border: `1px solid ${LINE}` }}>
          {i.k && (
            <span className="flex h-12 w-14 shrink-0 items-center justify-center">
              <Beeld src={i.k.src} alt={i.k.alt} sizes="56px" className="max-h-12 w-auto max-w-[56px] object-contain" />
            </span>
          )}
          <span className="flex flex-col gap-1">
            <span className="text-[15px] font-bold" style={{ color: NAVY }}>{i.kop} <span className="font-semibold" style={{ color: MUTE }}>· {i.naam}</span></span>
            <span className="text-[14px] leading-[1.55]" style={{ color: BODY }}>{i.tekst}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- een stap ---------- */

/**
 * Eén document als stap: links een kolom die op een groot scherm blijft staan
 * (nummer, titel, status en de acties), rechts de inhoud of het formulier.
 * Op de telefoon komen de acties onder de inhoud, zodat je eerst leest en
 * dan afvinkt.
 */
export function Stap({ d, n, o, token, basis, modus, tint, eerste, volgende }: {
  d: DocumentInfo; n: number; o: OnboardingPubliek; token: string; basis: string; modus: Modus; tint: boolean; eerste: boolean;
  /** De stap hierna, voor het duwtje zodra deze klaar is. */
  volgende?: DocumentInfo | null;
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
          Stap je over van een andere arbodienst en loopt er een verzuimdossier? Dan mag dat dossier alleen met toestemming van de werknemer naar onze bedrijfsarts. Vul hieronder je vorige arbodienst in. Daarna nodig je de medewerkers uit om online te tekenen, en stuur je de getekende machtigingen met één knop als opdracht naar je vorige arbodienst.
        </p>
        <VeldenFormulier token={token} document="machtiging" groepen={MACHTIGING} begin={(antwoord?.data as Record<string, string>) || {}} ingevuld={Boolean(antwoord)} modus={modus} knopTekst="Opslaan en machtiging maken" />
        {antwoord && <MachtigingUitnodigen token={token} lijst={o.machtigingen || []} modus={modus} arbodienst={(antwoord.data as Record<string, string>) || {}} basis={basis} />}
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
        <WerknemersFormulier token={token} begin={((antwoord?.data as { rijen?: Werknemer[] } | undefined)?.rijen) || []} ingevuld={Boolean(antwoord)} modus={modus} excelHref={excel} mail={o.afzender_email || ONBOARDING_EMAIL} />
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
            {/* De stap heeft zijn eigen pagina: de titel is de kop van die pagina. */}
            <h1 id={`kop-${d.sleutel}`} className={`${kop} m-0 text-[28px] leading-[1.1] tracking-[-0.7px] md:text-[34px]`} style={{ color: NAVY }}>{d.titel}</h1>
            <p className="m-0 text-[15.5px] leading-[1.6]" style={{ color: MUTE }}>{d.kort}</p>
          </div>
          <span className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-bold" style={klaar ? { background: "#E3F6ED", color: GROEN } : { background: tint ? "#ffffff" : SOFT, color: MUTE }}>
              {klaar ? <><Vink size={13} /> Klaar{wanneer ? ` · ${datumLang(wanneer)}` : ""}</> : "Nog te doen"}
            </span>
            {!klaar && <span className="text-[13.5px] font-semibold tabular-nums" style={{ color: MUTE }}>± {d.invullen && !invul ? 2 : d.minuten} min</span>}
          </span>
          {klaar && volgende && (
            <a href={`${basis}/${volgende.sleutel}`} className="geen-print inline-flex items-center gap-2 self-start text-[15px] font-bold underline-offset-4 hover:underline" style={{ color: NAVY }}>
              Verder met {volgende.titel.toLowerCase()} <Pijl size={14} />
            </a>
          )}
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
export function Verder({ o, tel, telTekst, mail }: { o: OnboardingPubliek; tel: string; telTekst: string; mail: string }) {
  const taken = takenVoor(o);
  const gedaan = taken.filter((t) => o.taken?.[t.sleutel]);
  const live = taken.length > 0 && gedaan.length === taken.length && o.status === "afgerond";
  const bezig = o.status === "afgerond" && !live;
  const laatste = gedaan.map((t) => o.taken![t.sleutel]!.at).sort().pop();
  return (
    <section id="verder" aria-label="Zo gaat het verder" className="relative scroll-mt-[88px] overflow-clip" style={{ background: live ? GROEN : NAVY }}>
      <span aria-hidden className="absolute right-[-180px] top-[-220px] h-[540px] w-[540px] rounded-full" style={{ background: live ? "#0E8F58" : NAVY_LICHT }} />
      <div className={`${BREED} relative flex flex-col gap-10 py-16 md:gap-[52px] md:py-[104px]`}>
        <SectieKop
          eyebrow={live ? "Jullie zijn live" : bezig ? "Wij zijn aan zet" : "Zo gaat het verder"}
          titel={live ? `Alles staat klaar${laatste ? `, sinds ${datumLang(laatste)}` : ""}.` : bezig ? "Jullie deel is klaar, nu richten wij alles in." : "Daarna gaan wij aan de slag."}
          tekst={
            live
              ? `Jullie omgeving, de medewerkers en de facturatie zijn ingericht. Vanaf nu bewaken wij elke ziekmelding.${o.casemanager ? ` Je vaste casemanager is ${o.casemanager}.` : ""}`
              : bezig
                ? `Hieronder zie je per onderdeel of het al geregeld is: ${gedaan.length} van ${taken.length}. Je hoort van ons zodra jullie live zijn, of als we nog iets nodig hebben.`
                : "Zodra jullie gegevens binnen zijn, richten we alles in. Hier zie je straks per onderdeel of het al geregeld is."
          }
          licht
        />
        <ol className={`m-0 grid list-none gap-6 p-0 md:grid-cols-2 md:gap-8 ${taken.length >= 4 ? "lg:grid-cols-3" : ""}`}>
          {taken.map((t, i) => {
            const at = o.taken?.[t.sleutel]?.at;
            const kan = taakKan(o, t);
            const status = at ? `Geregeld op ${datumLang(at)}` : kan && o.status === "afgerond" ? "Daar werken we nu aan" : t.na && o.documenten.includes(t.na) && !documentKlaar(o, t.na) ? `Zodra ${documentInfo(t.na).titel.toLowerCase()} binnen is` : "Zodra jullie gegevens binnen zijn";
            return (
              <li key={t.sleutel} className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-4 gap-y-1.5 md:flex md:flex-col md:gap-3.5" style={{ ["--ri" as string]: i }} data-reveal>
                <span className="row-span-3 flex items-start gap-3 md:row-span-1 md:items-center">
                  <span className={`${kop} grid h-12 w-12 shrink-0 place-items-center rounded-full text-[19px] ${at ? "onboarding-vink" : ""}`} style={{ background: at ? "#ffffff" : "rgba(255,255,255,0.14)", color: at ? (live ? GROEN : NAVY) : "#ffffff" }}>
                    {at ? <Vink size={18} /> : i + 1}
                  </span>
                </span>
                <span className="text-[13px] font-bold uppercase tracking-[1.3px] md:mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>Stap {i + 1}</span>
                <span className={`${kop} col-start-2 text-[21px] leading-[1.3] text-white`}>{t.klantKop}</span>
                <span className="col-start-2 text-[15.5px] leading-[1.65]" style={{ color: "rgba(255,255,255,0.75)" }}>{t.sleutel === "casemanager" && o.casemanager ? `Je vaste casemanager is ${o.casemanager}: één aanspreekpunt dat jullie organisatie kent.` : t.klant}</span>
                <span className="col-start-2 inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-[13px] font-bold" style={at ? { background: "#ffffff", color: live ? GROEN : NAVY } : { background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)" }}>
                  {at ? <Vink size={12} /> : null} {status}
                </span>
              </li>
            );
          })}
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

export function Voet({ o, contact, mail, tel, telTekst }: { o: OnboardingPubliek; contact: ContactInfo; mail: string; tel: string; telTekst: string }) {
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

/* ---------- de melding en de kaart van een stap op de hub ---------- */

export function Melding({ modus, status }: { modus: Modus; status: OnboardingPubliek["status"] }) {
  if (modus === "klant") return null;
  return (
    <div className="geen-print bg-[#FFF4E5] text-[14px] text-[#7A4A06]">
      <p className={`${BREED} m-0 py-2.5`}>
        {modus === "voorbeeld"
          ? status === "concept"
            ? "Voorbeeld van een concept: de klant ziet dit pas als je de onboarding verstuurt. Invullen kan hier niet."
            : "Voorbeeld: zo ziet de klant de onboarding. Invullen en afvinken doet hij via zijn eigen link."
          : "Je bekijkt deze onboarding als collega. Dit bezoek telt niet mee; wat je invult, staat op naam van de klant."}
      </p>
    </div>
  );
}

/** Eén stap als kaart op de hub: nummer, titel, status en de tijd, en de link naar zijn eigen pagina. */
export function StapKaart({ d, n, o, basis, tint, i }: { d: DocumentInfo; n: number; o: OnboardingPubliek; basis: string; tint: boolean; i: number }) {
  const invul = vultIn(o, d.sleutel);
  const klaar = documentKlaar(o, d.sleutel);
  const soort = invul ? "Online invullen" : d.invullen ? (d.excel ? "Excel invullen" : "Formulier") : "Lezen";
  const wanneer = invul ? o.antwoorden?.[d.sleutel]?.at : o.gelezen?.[d.sleutel];
  const min = d.invullen && !invul ? 2 : d.minuten;
  return (
    <li className="min-w-0" style={{ ["--ri" as string]: i }} data-reveal>
      <a
        href={`${basis}/${d.sleutel}`}
        className="group flex h-full flex-col gap-5 rounded-[24px] p-6 transition-shadow hover:shadow-[0_24px_48px_-32px_rgba(50,46,131,0.45)] md:p-7"
        style={tint ? { background: "#ffffff" } : { background: SOFT, border: `1px solid ${LINE}` }}
      >
        <span className="flex items-start justify-between gap-3">
          <span className={`${kop} grid h-12 w-12 shrink-0 place-items-center rounded-full text-[18px] ${klaar ? "onboarding-vink" : ""}`} style={{ background: klaar ? GROEN : d.tint, color: klaar ? "#ffffff" : d.kleur }}>
            {klaar ? <Vink size={18} /> : n}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-bold" style={klaar ? { background: "#E3F6ED", color: GROEN } : { background: tint ? SOFT : "#ffffff", color: MUTE }}>
            {klaar ? <><Vink size={12} /> Klaar{wanneer ? ` · ${datumLang(wanneer)}` : ""}</> : `± ${min} min`}
          </span>
        </span>
        <span className="flex flex-col gap-1.5">
          <Label kleur={d.kleur}>Stap {n} · {soort}</Label>
          <span className={`${kop} text-[22px] leading-[1.2] tracking-[-0.4px]`} style={{ color: NAVY }}>{d.titel}</span>
          <span className="text-[14.5px] leading-[1.6]" style={{ color: MUTE }}>{d.kort}</span>
          {d.sleutel === "machtiging" && invul && (o.machtigingen?.length ?? 0) > 0 && (
            <span className="mt-1 inline-flex items-center gap-1.5 text-[13.5px] font-bold" style={{ color: machtigingStand(o).getekend === machtigingStand(o).totaal ? GROEN : NAVY }}>
              <Vink size={12} /> {machtigingStand(o).getekend} van {machtigingStand(o).totaal} {machtigingStand(o).totaal === 1 ? "medewerker" : "medewerkers"} getekend
            </span>
          )}
        </span>
        <span className="mt-auto inline-flex items-center gap-2 text-[15px] font-bold" style={{ color: klaar ? MUTE : NAVY }}>
          {klaar ? "Bekijk of pas aan" : invul ? d.invullen : d.lezen} <Pijl size={14} />
        </span>
      </a>
    </li>
  );
}
