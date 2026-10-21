import Link from "next/link";
import { outfit } from "./HomeVerhaal";
import { NAVY, ORANGE, BODY, LAV, kop, Eyebrow, Pijl } from "./Gedeeld";
import { telefoonInTaal, type Taal } from "@/lib/taal";
import type { TarievenSettings } from "@/lib/tarieven";
import PartnerRekenhulp from "./PartnerRekenhulp";
import PartnerFormulier from "./PartnerFormulier";
import Beeld from "@/components/site/Beeld";

type Ctx = { lang?: Taal; tarieven?: TarievenSettings };

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * De eigen blokken van /partners, het partnerprogramma voor accountants,
 * salariskantoren en HR- en verzekeringsadviseurs. De pagina heeft de opzet
 * van een dienstpagina zoals /ready (het blok dienstLabel, met zonderKop),
 * met deze blokken eromheen:
 * - ptKop: een brede foto met een grote roze bol, zoals de tegels van de
 *   startpagina;
 * - ptRekenhulp: kop en breedte zoals de secties van dienstLabel, met het
 *   rekenvoorbeeld als kaart;
 * - ptAanmelden: zoals het kennismaakblok, met het aanmeldformulier.
 */

function anker(d: any) {
  return d.anchor ? { id: d.anchor } : {};
}

/* ---------- Kop: foto met een roze bol, zoals de startpagina ---------- */

/** Diep roze: de kleur van het logo, donker genoeg voor witte tekst (contrast 5,3). */
const ROZE_DIEP = "#CF1468";

/** "Jouw klant, onze casemanager, jouw vergoeding" als drie regels; de laatste krijgt een punt. */
function regels(tagline: string): string[] {
  const delen = String(tagline || "").split(/,\s*/).filter(Boolean);
  return delen.map((r, i) => (i < delen.length - 1 ? `${r},` : `${r}.`));
}

/**
 * Een brede foto met rechtsonder een grote roze bol, in de taal van de tegels
 * op de startpagina (HomeSplit). In de bol de kop: de programmanaam klein, de
 * belofte groot op drie regels met een oranje streep onder het slot. Op de
 * telefoon en tablet staan het roze vlak en de foto onder elkaar, de kop
 * eerst; de bol komt pas vanaf 1024px, waar hij ruim genoeg is voor de tekst.
 */
export function PtKop({ d, asH1 }: { d: any; asH1?: boolean }) {
  const H = asH1 ? "h1" : "h2";
  const lijnen = regels(d.tagline);
  const knoppen: { label: string; href: string }[] = d.knoppen || [];
  const kruimels: { label: string; href?: string }[] = d.kruimels || [];
  return (
    <section aria-label={d.heading} className={`hv ${outfit.variable} px-[6px] pt-[6px] md:px-2 md:pt-2`}>
      <div className="relative flex flex-col gap-[6px] md:gap-2 lg:block lg:h-[680px] lg:overflow-hidden lg:rounded-[36px]">
        <div className="relative rounded-[28px] px-6 pb-10 pt-9 md:rounded-[36px] md:p-14 lg:absolute lg:bottom-[-150px] lg:right-[-110px] lg:z-10 lg:h-[780px] lg:w-[780px] lg:rounded-full lg:p-0" style={{ background: ROZE_DIEP }}>
          <div className="flex flex-col gap-6 lg:absolute lg:left-[120px] lg:top-[140px] lg:w-[450px]">
            {kruimels.length > 0 && (
              <nav aria-label="Kruimelpad" className="flex flex-wrap items-center gap-2.5 text-[14px] font-semibold text-white/75">
                {kruimels.map((kr, i) => kr.href
                  ? <span key={i} className="contents"><Link href={kr.href} className="text-white/75 hover:text-white">{kr.label}</Link><span aria-hidden>/</span></span>
                  : <span key={i} aria-current="page" className="text-white">{kr.label}</span>)}
              </nav>
            )}
            <H className={`${kop} m-0`} style={{ color: "#ffffff" }}>
              {d.eyebrow && (
                <span className="hv-dienst mb-5 flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: "rgba(255,255,255,0.85)" }}>
                  <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: ORANGE }} />{d.eyebrow}
                </span>
              )}
              <span className="block text-[36px] leading-[1.04] tracking-[-1.2px] md:text-[52px] md:tracking-[-1.8px] lg:text-[48px] lg:tracking-[-1.6px]">
                {lijnen.map((r, i) => (
                  <span key={i} className="block">
                    {/* Het slot ("jouw vergoeding.") met een oranje streep eronder. */}
                    {i < lijnen.length - 1 ? r : (
                      <span style={{ backgroundImage: `linear-gradient(${ORANGE}, ${ORANGE})`, backgroundSize: "100% 0.11em", backgroundPosition: "0 94%", backgroundRepeat: "no-repeat" }}>{r}</span>
                    )}
                  </span>
                ))}
              </span>
            </H>
            {d.sub && <p className="m-0 max-w-[420px] text-[16px] leading-[1.6] text-white/90 md:text-[17px]">{d.sub}</p>}
            <div className="flex flex-wrap gap-2.5">
              {knoppen.map((b, i) => (
                <a key={i} href={b.href}
                  className={`hv-btn inline-flex h-[54px] items-center gap-2.5 whitespace-nowrap rounded-full px-6 text-[15px] font-bold ${i === 0 ? "bg-white text-[#322E83] hover:bg-[#ECEBF5]" : "border-[1.5px] border-white/50 text-white hover:bg-white/10"}`}>
                  {b.label}<Pijl />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="relative h-[340px] overflow-hidden rounded-[28px] md:h-[460px] md:rounded-[36px] lg:absolute lg:inset-0 lg:h-auto lg:rounded-none" style={{ background: "#D9D3F0" }}>
          <Beeld src={d.beeld} alt={d.beeldAlt || ""} fill priority sizes="100vw" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: d.beeldFocus || "30% 45%" }} />
        </div>
      </div>
    </section>
  );
}

/* ---------- Rekenvoorbeeld ---------- */

/** In de opzet van de dienstpagina's (dienstLabel): label met stip, kop links, toelichting rechts. */
export function PtRekenhulp({ d, ctx }: { d: any; ctx?: Ctx }) {
  const jaar = ctx?.tarieven?.jaar ?? String(new Date().getFullYear());
  // Geen ondermarge: het blok erna (dienstLabel, dgVragen) heeft zelf
  // bovenmarge, en samen werd dat het dubbele van de rest van de pagina.
  return (
    <section aria-label={d.heading} {...anker(d)} className={`hv ${outfit.variable} scroll-mt-28 bg-white px-5 pt-14 md:px-10 md:pt-[120px] xl:mx-auto xl:max-w-[1200px] xl:px-0`}>
      <div className="flex flex-col gap-8 md:gap-12">
        <div className="grid gap-4 lg:grid-cols-12 lg:items-end lg:gap-6">
          <div className="flex flex-col gap-5 lg:col-span-7">
            {d.eyebrow && (
              <span className="inline-flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: NAVY }}>
                <span className="h-2 w-2 rounded-full" style={{ background: NAVY }} />{d.eyebrow}
              </span>
            )}
            <h2 className={`${kop} m-0 text-[34px] leading-[1.1] tracking-[-0.8px] md:text-[44px] md:tracking-[-1px]`} style={{ color: NAVY }}>{d.heading}</h2>
          </div>
          {d.text && <p className="m-0 text-[16px] leading-[1.7] md:text-[17px] lg:col-span-4 lg:col-start-9" style={{ color: BODY }}>{d.text}</p>}
        </div>
        <PartnerRekenhulp r={d.rekenhulp || {}} jaar={jaar} />
      </div>
    </section>
  );
}

/* ---------- Aanmelden ---------- */

/** "Bel {telefoon} of mail naar {email}." met beide als link. */
function Direct({ tekst, telefoon, email, taal }: { tekst: string; telefoon: string; email: string; taal: Taal }) {
  const link = "font-bold underline underline-offset-4";
  return (
    <>
      {tekst.split(/(\{telefoon\}|\{email\})/).map((deel, i) =>
        deel === "{telefoon}" ? <a key={i} href={`tel:+31${telefoon.replace(/\D/g, "").replace(/^0/, "")}`} className={link} style={{ color: NAVY }}>{telefoonInTaal(telefoon, taal)}</a>
        : deel === "{email}" ? <a key={i} href={`mailto:${email}`} className={link} style={{ color: NAVY }}>{email}</a>
        : deel
      )}
    </>
  );
}

export function PtAanmelden({ d, ctx }: { d: any; ctx?: Ctx }) {
  const ontvang: string[] = d.ontvang || [];
  return (
    <section aria-label={d.heading} {...anker(d)} className={`hv ${outfit.variable} scroll-mt-28 px-[6px] pb-14 pt-4 md:px-10 md:pb-24 md:pt-8 lg:px-16 xl:mx-auto xl:max-w-[1440px] xl:px-[120px]`}>
      <div className="relative grid gap-8 overflow-hidden rounded-[28px] px-5 py-9 md:gap-10 md:rounded-[36px] md:p-14 lg:grid-cols-12 lg:gap-6 lg:p-12 xl:p-[72px]" style={{ background: LAV }}>
        <span aria-hidden className="absolute right-[-120px] top-[-150px] h-[520px] w-[520px] rounded-full" style={{ background: NAVY, opacity: 0.07 }} />
        <div className="relative flex flex-col gap-6 lg:col-span-5">
          {d.eyebrow && <Eyebrow>{d.eyebrow}</Eyebrow>}
          <h2 className={`${kop} m-0 whitespace-pre-line text-[40px] leading-[1.04] tracking-[-1.2px] md:text-[48px] md:tracking-[-1.5px] xl:text-[52px]`} style={{ color: NAVY }}>{d.heading}</h2>
          {d.text && <p className="m-0 text-[17px] leading-[1.65] md:text-[18px]" style={{ color: BODY }}>{d.text}</p>}
          {ontvang.length > 0 && (
            <div className="flex flex-col gap-4 pt-2">
              {d.ontvangKop && <span className="text-[16px] font-bold" style={{ color: NAVY }}>{d.ontvangKop}</span>}
              <ol className="m-0 flex list-none flex-col gap-4 p-0">
                {ontvang.map((o, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[15px] font-bold" style={{ color: NAVY }}>{i + 1}</span>
                    <span className="pt-1.5 text-[16px] leading-[1.55]" style={{ color: BODY }}>{o}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {d.direct && (
            <p className="m-0 pt-2 text-[16px] leading-[1.6]" style={{ color: BODY }}>
              <Direct tekst={d.direct} telefoon={d.telefoon || "085 620 58 00"} email={d.email || "sales@react2u.nl"} taal={ctx?.lang ?? "nl"} />
            </p>
          )}
        </div>
        <div className="relative rounded-[24px] bg-white p-5 shadow-[0_30px_60px_-30px_rgba(50,46,131,0.35)] sm:p-6 md:p-10 lg:col-span-6 lg:col-start-7">
          <PartnerFormulier f={d.form || {}} />
        </div>
      </div>
    </section>
  );
}
