import Link from "next/link";
import { outfit } from "./HomeVerhaal";
import { NAVY, PINK, TEAL, SKY, ORANGE, BODY, LAV, kop, Eyebrow } from "./Gedeeld";
import { euroRond, partnerVergoeding } from "@/lib/partners";
import { telefoonInTaal, vul, type Taal } from "@/lib/taal";
import type { TarievenSettings } from "@/lib/tarieven";
import PartnerRekenhulp from "./PartnerRekenhulp";
import PartnerFormulier from "./PartnerFormulier";

type Ctx = { lang?: Taal; tarieven?: TarievenSettings };

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * De eigen blokken van /partners, het partnerprogramma voor accountants,
 * salariskantoren en HR- en verzekeringsadviseurs. De pagina heeft de opzet
 * van een dienstpagina zoals /ready (het blok dienstLabel, met zonderKop),
 * met deze blokken eromheen:
 * - ptKop: een eigen kop in twee tegels zoals de startpagina: links diep roze
 *   met de tekst en de knoppen, rechts lila met de vergoeding in een indigo bol;
 * - ptRekenhulp: kop en breedte zoals de secties van dienstLabel, met het
 *   rekenvoorbeeld als kaart;
 * - ptAanmelden: zoals het kennismaakblok, met het aanmeldformulier.
 */

function anker(d: any) {
  return d.anchor ? { id: d.anchor } : {};
}

/* ---------- Kop: twee tegels, zoals de startpagina ---------- */

/** Diep roze: de kleur van het logo, donker genoeg voor witte tekst (contrast 5,3). */
const ROZE_DIEP = "#CF1468";
/** De lila tegel en de tinten in de bol, als de werkgeverstegel van de startpagina (HomeSplit). */
const LILA = "#D9D3F0";
const BOL_LABEL = "#B4ADF2";
const BOL_TEKST = "#D6D2F7";

// [links %, boven %, maat px, kleur, zweef]: stippen uit het logo op de lila tegel, boven de bol.
const STIPPEN: [number, number, number, string, number][] = [
  [9, 9, 16, ORANGE, 1], [20, 24, 10, TEAL, 2], [6, 31, 8, SKY, 3], [27, 8, 9, PINK, 2],
];

function Vinkje() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

export function PtKop({ d, asH1 }: { d: any; asH1?: boolean }) {
  const H = asH1 ? "h1" : "h2";
  const kruimels: { label: string; href?: string }[] = d.kruimels || [];
  const knoppen: { label: string; href: string }[] = d.knoppen || [];
  const k = d.kaart || {};
  const vb = d.voorbeeld || {};
  const v = partnerVergoeding({
    klanten: Number(vb.klanten) || 0, medewerkers: Number(vb.medewerkers) || 0, tarief: Number(vb.tarief) || 0,
    pctJaarEen: Number(vb.pctJaarEen) || 0, pctVervolg: Number(vb.pctVervolg) || 0,
  });
  return (
    <section aria-label={d.heading} className={`hv ${outfit.variable} px-[6px] pt-4 md:px-10 md:pt-8 xl:mx-auto xl:max-w-[1280px]`}>
      <div className="grid gap-[6px] md:gap-2 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">

        {/* Links, op diep roze: wie het programma is voor en de knoppen. */}
        <div className="relative overflow-hidden rounded-[28px] px-6 pb-10 pt-9 text-white md:rounded-[36px] md:p-14 lg:p-12 xl:p-16"
          style={{ background: d.kleur || ROZE_DIEP }}>
          <span aria-hidden className="absolute right-[-200px] top-[-240px] h-[480px] w-[480px] rounded-full" style={{ background: PINK }} />
          <div className="relative flex h-full flex-col justify-center gap-5 md:gap-[22px]">
            {kruimels.length > 0 && (
              <nav aria-label="Kruimelpad" className="flex flex-wrap items-center gap-2.5 text-[14px] font-semibold text-white/75">
                {kruimels.map((kr, i) => kr.href
                  ? <span key={i} className="contents"><Link href={kr.href} className="text-white/75 hover:text-white">{kr.label}</Link><span>/</span></span>
                  : <span key={i} aria-current="page" className="text-white">{kr.label}</span>)}
              </nav>
            )}
            <div>
              <H className={`${kop} m-0 text-[26px] leading-[1.05] tracking-[-0.4px] md:text-[34px]`} style={{ color: "#ffffff" }}>
                React2u<br />
                <span className="mt-1 inline-block text-[64px] tracking-[-2px] md:text-[96px] md:tracking-[-3px]">{d.naam}</span>
                <span className="hv-dienst mt-5 block text-[18px] font-bold leading-[1.5] tracking-normal md:mt-[22px] md:text-[21px]">{d.label}</span>
              </H>
              {d.tagline && <p className="m-0 text-[18px] leading-[1.5] text-white md:text-[21px]"><em>{d.tagline}</em></p>}
            </div>
            {d.text && <p className="m-0 max-w-[540px] text-[16px] leading-[1.7] text-white/90 md:text-[17px]">{d.text}</p>}
            <div className="flex flex-wrap gap-2.5 pt-2">
              {knoppen.map((b, i) => (
                <a key={i} href={b.href}
                  className={`hv-btn inline-flex h-[54px] items-center gap-2.5 rounded-full px-6 text-[15px] font-bold ${i === 0 ? "bg-white text-[#322E83] hover:bg-[#ECEBF5]" : "border-[1.5px] border-white/60 text-white hover:bg-white/10"}`}>
                  {b.label}
                  <svg className="hn-pijl" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </a>
              ))}
            </div>
            {(k.punten || []).length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-2 p-0 pt-1 md:flex-row md:flex-wrap md:gap-x-6">
                {k.punten.map((p: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-[14.5px] leading-[1.45] text-white/90"><Vinkje />{p}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Rechts, op lila: de vergoeding in een indigo bol zoals de tegels van de
            startpagina, met het rekenvoorbeeld als kaartje erboven. */}
        <div className="relative h-[500px] overflow-hidden rounded-[28px] md:h-[540px] md:rounded-[36px] lg:h-auto lg:min-h-[560px]" style={{ background: LILA }}>
          {STIPPEN.map(([x, y, m, c, f], i) => (
            <span key={i} aria-hidden className={`hv-f${f} absolute rounded-full`}
              style={{ left: `${x}%`, top: `${y}%`, width: m, height: m, background: c }} />
          ))}
          {k.voorbeeldTekst && (
            <div className="absolute right-5 top-5 flex max-w-[250px] rotate-[2deg] flex-col gap-1.5 rounded-[20px] bg-white px-5 py-4 shadow-[0_24px_48px_-24px_rgba(50,46,131,0.5)] md:right-8 md:top-8 md:max-w-[280px]">
              <span className="text-[14px] leading-[1.45]" style={{ color: BODY }}>{vul(k.voorbeeldTekst, { klanten: vb.klanten, medewerkers: vb.medewerkers })}</span>
              <span className="flex items-baseline gap-2">
                <span className={`${kop} whitespace-nowrap text-[30px] leading-none tracking-[-0.8px] tabular-nums`} style={{ color: NAVY }}>{euroRond(v.jaarEen)}</span>
                <span className="text-[14px]" style={{ color: BODY }}>{k.voorbeeldNa}</span>
              </span>
            </div>
          )}
          <span aria-hidden className="absolute bottom-[-150px] left-[-90px] h-[480px] w-[480px] rounded-full md:bottom-[-170px] md:left-[-130px] md:h-[640px] md:w-[640px]" style={{ background: NAVY }} />
          <div className="absolute bottom-9 left-7 flex max-w-[290px] flex-col gap-3 md:bottom-14 md:left-14 md:max-w-[340px] lg:left-10 lg:max-w-[300px] xl:left-14 xl:max-w-[340px]">
            {k.kop && <span className="text-[13px] font-bold uppercase tracking-[1.4px]" style={{ color: BOL_LABEL }}>{k.kop}</span>}
            <span className={`${kop} text-[96px] leading-[0.8] tracking-[-3px] md:text-[128px] md:tracking-[-4px]`} style={{ color: "#ffffff" }}>{k.groot}</span>
            <span className="text-[16px] font-semibold leading-[1.35]" style={{ color: BOL_TEKST }}>{k.grootTekst}</span>
            {k.plus && (
              <span className="mt-2 flex items-center gap-3">
                <span className={`${kop} shrink-0 rounded-full px-3.5 py-2 text-[20px] leading-none`} style={{ background: PINK, color: "#ffffff" }}>{k.plus}</span>
                <span className="text-[15px] leading-[1.35]" style={{ color: BOL_TEKST }}>{k.plusTekst}</span>
              </span>
            )}
          </div>
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
