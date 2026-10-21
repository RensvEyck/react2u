import Link from "next/link";
import { outfit } from "./HomeVerhaal";
import { NAVY, PINK, TEAL, SKY, ORANGE, BODY, MUTE, LINE, LAV, kop, Eyebrow } from "./Gedeeld";
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
 * - ptKop: een eigen kop in diep roze, met de vergoeding als blikvanger op
 *   twee gestapelde kaarten en zwevende stippen uit het logo;
 * - ptRekenhulp: kop en breedte zoals de secties van dienstLabel, met het
 *   rekenvoorbeeld als kaart;
 * - ptAanmelden: zoals het kennismaakblok, met het aanmeldformulier.
 */

function anker(d: any) {
  return d.anchor ? { id: d.anchor } : {};
}

/* ---------- Kop: diep roze, de vergoeding als blikvanger ---------- */

/** Diep roze: de kleur van het logo, donker genoeg voor witte tekst (contrast 5,3). */
const ROZE_DIEP = "#CF1468";

// [links %, boven %, maat px, kleur, zweef]: stippen uit het logo op het roze vlak.
const STIPPEN: [number, number, number, string, number][] = [
  [56, 10, 18, ORANGE, 1], [62, 78, 12, SKY, 2], [52, 54, 10, "#ffffff", 3], [93, 86, 22, TEAL, 2],
  [97, 40, 10, "#ffffff", 1], [47, 88, 14, ORANGE, 3],
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
      <div className="relative grid gap-12 overflow-hidden rounded-[28px] px-6 pb-12 pt-10 text-white md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-16 lg:p-16"
        style={{ background: d.kleur || ROZE_DIEP }}>
        <span aria-hidden className="absolute right-[-160px] top-[-200px] h-[480px] w-[480px] rounded-full md:h-[560px] md:w-[560px]" style={{ background: PINK }} />
        <span aria-hidden className="absolute bottom-[-220px] left-[-120px] h-[380px] w-[380px] rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
        {STIPPEN.map(([x, y, m, c, f], i) => (
          <span key={i} aria-hidden className={`hv-f${f} absolute hidden rounded-full lg:block`}
            style={{ left: `${x}%`, top: `${y}%`, width: m, height: m, background: c, opacity: c === "#ffffff" ? 0.55 : 1 }} />
        ))}

        <div className="relative flex flex-col gap-5 md:gap-[22px]">
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
          {d.text && <p className="m-0 max-w-[520px] text-[16px] leading-[1.7] text-white/90 md:text-[17px]">{d.text}</p>}
          <div className="flex flex-wrap gap-2.5 pt-2">
            {knoppen.map((b, i) => (
              <a key={i} href={b.href}
                className={`hv-btn inline-flex h-[54px] items-center gap-2.5 rounded-full px-6 text-[15px] font-bold ${i === 0 ? "bg-white text-[#322E83] hover:bg-[#ECEBF5]" : "border-[1.5px] border-white/60 text-white hover:bg-white/10"}`}>
                {b.label}
                <svg className="hn-pijl" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </a>
            ))}
          </div>
        </div>

        {/* De vergoeding op twee gestapelde kaarten: indigo schuin erachter, wit ervoor. */}
        <div className="relative mx-auto w-full max-w-[440px] pb-3 pr-3 lg:mx-0">
          <span aria-hidden className="absolute inset-0 translate-x-3 translate-y-3 rotate-[4deg] rounded-[28px]" style={{ background: NAVY }} />
          <div className="relative flex -rotate-[1.5deg] flex-col gap-5 rounded-[28px] bg-white p-7 shadow-[0_40px_80px_-40px_rgba(40,10,60,0.6)] md:p-9" style={{ color: NAVY }}>
            {k.kop && <span className="text-[13px] font-bold uppercase tracking-[1.4px]" style={{ color: MUTE }}>{k.kop}</span>}
            <div className="flex items-end gap-4">
              <span className={`${kop} text-[88px] leading-[0.85] tracking-[-3px] md:text-[112px] md:tracking-[-4px]`} style={{ color: NAVY }}>{k.groot}</span>
              <span className="pb-1 text-[16px] font-semibold leading-[1.35]" style={{ color: BODY }}>{k.grootTekst}</span>
            </div>
            <div className="flex items-baseline gap-3 border-t pt-5" style={{ borderColor: LINE }}>
              <span className={`${kop} text-[40px] leading-none tracking-[-1px]`} style={{ color: PINK }}>{k.plus}</span>
              <span className="text-[15.5px] leading-[1.4]" style={{ color: BODY }}>{k.plusTekst}</span>
            </div>
            {k.voorbeeldTekst && (
              <div className="flex flex-col gap-1.5 rounded-[18px] px-5 py-4" style={{ background: LAV }}>
                <span className="text-[14px] leading-[1.45]" style={{ color: BODY }}>{vul(k.voorbeeldTekst, { klanten: vb.klanten, medewerkers: vb.medewerkers })}</span>
                <span className="flex items-baseline gap-2">
                  <span className={`${kop} whitespace-nowrap text-[30px] leading-none tracking-[-0.8px] tabular-nums`} style={{ color: NAVY }}>{euroRond(v.jaarEen)}</span>
                  <span className="text-[14px]" style={{ color: BODY }}>{k.voorbeeldNa}</span>
                </span>
              </div>
            )}
            {(k.punten || []).length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {k.punten.map((p: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5 text-[15px] leading-[1.45]" style={{ color: NAVY }}>
                    <span style={{ color: TEAL }}><Vinkje /></span>{p}
                  </li>
                ))}
              </ul>
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
  return (
    <section aria-label={d.heading} {...anker(d)} className={`hv ${outfit.variable} scroll-mt-28 bg-white px-5 py-14 md:px-10 md:py-[120px] xl:mx-auto xl:max-w-[1200px] xl:px-0`}>
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
