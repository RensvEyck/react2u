"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { LuPhone, LuMail } from "react-icons/lu";
import ContactForm from "@/components/site/ContactForm";

/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */

/*
 * De werkgeverspagina (ontwerp "D-Werkgevers", 1440 en 390): kop werkgever |
 * werknemer, waarom React2u, diensten, de poortwachter-tijdlijn, ERD/ZW, zo
 * start je, tarieven, klanten, vragen en de offerte. Eigen letter (Plus
 * Jakarta Sans) en eigen kleuren, zoals de startpagina; hover en focus staan
 * in globals.css onder `.wg`.
 *
 * Client-component vanwege de veegbare tijdlijn op mobiel (pijlen en teller).
 * Al het andere werkt zonder JavaScript; de uitklappers zijn <details>.
 */

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const INDIGO = "#2A2677";
const MAGENTA = "#C8306A";
const ORANJE = "#F29A3A";
const LILA = "#8C7FE8";
const TEKST2 = "#55518A";
const LIJN = "#E4E0F4";

type BlockProps = { d: any; asH1?: boolean };

function isExternal(href?: string) {
  return !!href && (href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:"));
}

function Go({ href, className, style, children, ...rest }: {
  href: string; className?: string; style?: React.CSSProperties; children: React.ReactNode; [k: string]: any;
}) {
  if (!href || isExternal(href) || href.startsWith("#")) {
    return <a href={href || "#"} className={className} style={style} {...rest}>{children}</a>;
  }
  return <Link href={href} className={className} style={style} {...rest}>{children}</Link>;
}

function Pijl({ size = 16, links = false }: { size?: number; links?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="wg-pijl">
      <path d={links ? "M19 12H5M11 6l-6 6 6 6" : "M5 12h14M13 6l6 6-6 6"} />
    </svg>
  );
}

function Label({ children, kleur = "#A8245A", className = "", klein }: { children: React.ReactNode; kleur?: string; className?: string; klein?: boolean }) {
  return (
    <span className={`${klein ? "text-[12px] md:text-[13px]" : "text-[13px] lg:text-[14px]"} font-bold uppercase tracking-[1.2px] ${className}`} style={{ color: kleur }}>
      {children}
    </span>
  );
}

/** Nummer in een cirkel; de kleuren lopen rond zoals in het ontwerp. */
const RONDJES = [
  { bg: INDIGO, fg: "#ffffff" },
  { bg: LILA, fg: "#ffffff" },
  { bg: ORANJE, fg: "#3D2206" },
  { bg: MAGENTA, fg: "#ffffff" },
];

function Foto({ src, alt, focus, className = "", style }: { src?: string; alt?: string; focus?: string; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`block overflow-hidden rounded-full ${className}`} style={{ background: "#DCD6F2", ...style }}>
      {src && <img src={src} alt={alt || ""} loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: focus || "50% 35%" }} />}
    </span>
  );
}

/** Tekstlink met een pijl in een rondje ("Alle tarieven →"). */
function RondLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Go href={href} className={`wg-row flex items-center gap-3 self-start text-[15px] font-bold lg:text-[16px] ${className}`} style={{ color: INDIGO }}>
      {children}
      <span className="grid h-11 w-11 place-items-center rounded-full border-[1.5px]" style={{ borderColor: LIJN }}><Pijl /></span>
    </Go>
  );
}

/**
 * Een kop met vaste regelafbrekingen ("\n" in de tekst) zoals in het ontwerp.
 * Standaard alleen vanaf desktop; op mobiel loopt de kop gewoon door.
 */
function Regels({ tekst, altijd }: { tekst?: string; altijd?: boolean }) {
  const delen = String(tekst || "").split("\n");
  return (
    <>
      {delen.map((t, i) => (
        <span key={i}>{i > 0 && <>{" "}<br className={altijd ? "" : "hidden lg:inline"} /></>}{t}</span>
      ))}
    </>
  );
}

const SECTIE = "mx-auto max-w-[1440px] px-5 md:px-10 xl:px-20";
const RUIMTE = { paddingTop: "clamp(48px, 7.2vw, 104px)" };
const VLAK_MARGE = { marginTop: "clamp(48px, 7.2vw, 104px)" };

/* ---------- 1. Kop: werkgever | werknemer ---------- */

export function WgSplit({ d, asH1 }: BlockProps) {
  const H = asH1 ? "h1" : "h2";
  const wn = d.werknemer || {};
  return (
    <section aria-label="Kies wie je bent" className={`wg ${jakarta.className}`}>
      <div className="wg-split flex flex-col gap-[6px] px-[6px] md:h-[clamp(520px,calc(100svh-150px),680px)] md:flex-row md:gap-2 md:px-2">
        {/* Werkgever: groot, met de h1 */}
        <div className="wg-tile wg-tile-wg relative h-[514px] overflow-hidden rounded-[28px] md:h-auto md:rounded-[36px]" style={{ background: "#D9D3F0" }}>
          <img src={d.image} alt={d.alt || ""} className="absolute inset-0 h-full w-full object-cover md:hidden"
            style={{ objectPosition: d.focusMobiel || d.focus || "42% 20%" }} fetchPriority="high" loading="eager" />
          <img src={d.image} alt={d.alt || ""} className="absolute inset-0 hidden h-full w-full object-cover md:block"
            style={{ objectPosition: d.focus || "62% 30%" }} loading="eager" />
          <span aria-hidden className="wg-orb absolute rounded-full
            bottom-[-298px] left-[-130px] h-[640px] w-[640px]
            md:bottom-[-260px] md:left-[-90px] md:h-[680px] md:w-[680px]
            xl:bottom-[-266px] xl:h-[720px] xl:w-[720px]" style={{ background: INDIGO }} />
          <div className="absolute bottom-[26px] left-[22px] right-[22px] flex flex-col gap-3 text-white md:bottom-[44px] md:left-[64px] md:right-auto md:w-[380px] md:gap-4 xl:bottom-[52px] xl:left-[96px] xl:w-[404px]">
            <Label kleur="#B4ADF2" klein>{d.eyebrow}</Label>
            <H className="text-[31px] font-extrabold leading-[1.02] tracking-[-1.2px] text-white md:text-[40px] md:leading-none md:tracking-[-1.6px] xl:text-[44px] xl:tracking-[-1.8px]">
              {d.heading}
            </H>
            {d.text && <p className="text-[15px] leading-[1.55] md:text-[16px]" style={{ color: "#D6D2F7" }}>{d.text}</p>}
            <div className="mt-1 flex gap-2 md:mt-1.5 md:gap-2.5">
              {((d.buttons as any[]) || []).filter((b) => b?.label).map((b, i) => (
                <Go key={i} href={b.href} className="wg-btn flex-1 rounded-full px-2 py-[14px] text-center text-[14px] font-bold md:flex-none md:px-[22px] md:py-[15px] md:text-[15px]"
                  style={i === 0 ? { background: MAGENTA, color: "#ffffff" } : { background: "#ffffff", color: INDIGO }}>
                  {b.label}
                </Go>
              ))}
            </div>
          </div>
        </div>

        {/* Werknemer: smal, als link */}
        {wn.href && (
          <Link href={wn.href} aria-label={wn.aria || wn.title}
            className="wg-tile wg-tile-wn group relative flex h-[150px] items-center overflow-hidden rounded-[28px] px-[22px] md:block md:h-auto md:rounded-[36px] md:px-0"
            style={{ background: MAGENTA }}>
            {/* Mobiel: foto in een rondje rechtsboven */}
            <span className="absolute right-[-34px] top-[-24px] h-[200px] w-[200px] overflow-hidden rounded-full border-[6px] border-white md:hidden" style={{ background: "#F5D9E4" }}>
              <img src={wn.image} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 20%" }} loading="eager" />
            </span>
            {/* Vanaf tablet: foto van rand tot rand, roze cirkel rechtsonder */}
            <img src={wn.image} alt={wn.alt || ""} className="absolute inset-0 hidden h-full w-full object-cover md:block"
              style={{ objectPosition: wn.focus || "48% 30%", background: "#F5D9E4" }} loading="eager" />
            <span aria-hidden className="wg-orb absolute bottom-[-70px] right-[-80px] hidden h-[400px] w-[400px] rounded-full md:block" style={{ background: MAGENTA }} />
            <span className="relative flex flex-col gap-1.5 text-white md:absolute md:bottom-[60px] md:right-[38px] md:w-[220px] md:gap-2.5">
              <Label kleur="#FFD0E0" klein>{wn.eyebrow}</Label>
              <span className="text-[24px] font-extrabold leading-none tracking-[-0.8px] md:text-[32px] md:tracking-[-1.2px]">
                {String(wn.title || "").replace(/^Ik ben /, "Ik ben\n").split("\n").map((t: string, k: number) => <span key={k} className="block">{t}</span>)}
              </span>
              <span className="hidden text-[15px] leading-[1.5] md:block" style={{ color: "#FFE3EC" }}>{wn.text}</span>
              <span className="mt-0.5 flex items-center gap-2 text-[13px] md:mt-0.5" style={{ color: "#FFE3EC" }}>
                <span className="wg-go grid h-8 w-8 place-items-center rounded-full bg-white md:h-12 md:w-12" style={{ color: MAGENTA }}><Pijl size={15} /></span>
                <span className="md:hidden">{wn.short}</span>
              </span>
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}

/* ---------- 2. Waarom React2u ---------- */

export function WgWaarom({ d }: BlockProps) {
  const items = ((d.items as any[]) || []).filter((p) => p?.title);
  const dos = d.dossier;
  const badges = (d.badges as any[]) || [];
  return (
    <section className={`wg ${jakarta.className}`}>
      <div className={`${SECTIE} flex flex-col gap-[18px] lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-6`} style={RUIMTE}>
        {/* Beeld: mobiel bovenaan met twee rondjes, desktop rechts met het dossier */}
        <div className="relative h-[250px] w-full max-w-[350px] lg:order-last lg:col-span-6 lg:col-start-7 lg:h-[500px] lg:max-w-none xl:col-span-5 xl:col-start-8 xl:h-[600px]">
          <Foto src={d.image} alt={d.alt} focus={d.focusMobiel || d.focus}
            className="absolute left-0 top-0 h-[240px] w-[240px] border-[7px] lg:hidden" style={{ borderColor: LILA }} />
          <Foto src={d.image} alt={d.alt} focus={d.focus}
            className="absolute left-0 top-0 hidden h-[400px] w-[400px] border-[10px] lg:block xl:h-[480px] xl:w-[480px]" style={{ borderColor: LILA }} />
          <span aria-hidden className="absolute left-[350px] top-[24px] hidden h-[60px] w-[60px] rounded-full lg:block xl:left-[420px] xl:top-[30px] xl:h-[72px] xl:w-[72px]" style={{ background: MAGENTA }} />
          {badges[0] && (
            <span className="absolute right-3 top-0 flex h-[92px] w-[92px] flex-col items-center justify-center rounded-full lg:hidden" style={{ background: ORANJE, color: "#3D2206" }}>
              <span className="text-[20px] font-extrabold leading-tight">{badges[0].value}</span>
              <span className="text-[12px] font-bold">{badges[0].label}</span>
            </span>
          )}
          {badges[1] && (
            <span className="absolute right-0 top-[116px] flex h-[134px] w-[134px] flex-col items-center justify-center rounded-full text-center text-white lg:hidden" style={{ background: INDIGO }}>
              <span className="text-[46px] font-extrabold leading-none">{badges[1].value}</span>
              <span className="text-[12px] font-semibold" style={{ color: "#D6D2F7" }}>{badges[1].label}</span>
            </span>
          )}
          {dos && (
            <div aria-hidden className="absolute left-[80px] top-[270px] hidden w-[360px] flex-col gap-3.5 rounded-[28px] border-[1.5px] bg-white px-[26px] py-6 lg:flex xl:left-[130px] xl:top-[340px] xl:w-[380px]"
              style={{ borderColor: LIJN, boxShadow: "0 24px 48px -28px rgba(42,38,119,0.35)", color: INDIGO }}>
              <span className="flex items-center justify-between">
                <span className="text-[13px] font-bold uppercase tracking-[1.2px]" style={{ color: "#A8245A" }}>{dos.label}</span>
                <span className="text-[13px] font-semibold" style={{ color: TEKST2 }}>{dos.sub}</span>
              </span>
              <span className="flex flex-col gap-2.5 text-[15px]">
                {((dos.rows as any[]) || []).map((r, i) => (
                  <span key={i} className="flex items-center gap-3">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={r.later ? { border: "2px solid #C9C3E6" } : { background: [INDIGO, LILA, MAGENTA][i % 3] }} />
                    <span className="w-16 font-bold" style={{ color: r.later ? "#6D6A92" : TEKST2 }}>{r.when}</span>
                    <span className={r.later ? "font-semibold" : "font-bold"} style={r.later ? { color: TEKST2 } : undefined}>{r.title}</span>
                    {r.now && <span className="ml-auto rounded-full px-2.5 py-1 text-[12px] font-bold" style={{ color: "#A8245A", background: "#FCE9F0" }}>Nu</span>}
                  </span>
                ))}
              </span>
              <span className="flex items-center gap-3 border-t-[1.5px] pt-3.5" style={{ borderColor: LIJN }}>
                <span className="h-9 w-9 shrink-0 rounded-full border-2" style={{ background: "#FEF1E3", borderColor: ORANJE }} />
                <span className="flex flex-col">
                  <span className="text-[12px]" style={{ color: TEKST2 }}>{dos.footLabel}</span>
                  <span className="text-[15px] font-extrabold">{dos.footText}</span>
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-[18px] lg:col-span-6 lg:gap-7">
          <Label>{d.eyebrow}</Label>
          <h2 className="text-[34px] font-extrabold leading-[1.02] tracking-[-1.3px] md:text-[48px] lg:text-[52px] lg:leading-none lg:tracking-[-2px] xl:text-[60px] xl:tracking-[-2.4px]" style={{ color: INDIGO }}>
            {d.heading}
          </h2>
          {d.text && <p className="hidden max-w-[520px] text-[18px] leading-[1.65] lg:block" style={{ color: TEKST2 }}>{d.text}</p>}
          <div className="flex flex-col border-t-[1.5px] lg:mt-1" style={{ borderColor: LIJN }}>
            {items.map((p, i) => {
              const r = RONDJES[[0, 2, 3][i % 3]];
              return (
                <div key={i} className="flex gap-3.5 border-b-[1.5px] py-3.5 lg:gap-[22px] lg:py-[22px]" style={{ borderColor: LIJN }}>
                  <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full text-[14px] font-extrabold lg:h-12 lg:w-12 lg:text-[17px]" style={{ background: r.bg, color: r.fg }}>{i + 1}</span>
                  <span className="flex flex-col gap-0.5 lg:gap-1">
                    <span className="text-[16px] font-extrabold lg:text-[20px] lg:tracking-[-0.3px]" style={{ color: INDIGO }}>
                      <span className="lg:hidden">{p.shortTitle || p.title}</span><span className="hidden lg:inline">{p.title}</span>
                    </span>
                    <span className="text-[14px] leading-[1.5] lg:text-[16px] lg:leading-[1.55]" style={{ color: TEKST2 }}>
                      <span className="lg:hidden">{p.short || p.text}</span><span className="hidden lg:inline">{p.text}</span>
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 3. Diensten ---------- */

const TONEN: Record<string, { bg: string; dot: string; tekst: string; lijn: string; bullet: string; rand?: string; knop: string }> = {
  lila: { bg: "#F3F1FA", dot: INDIGO, tekst: TEKST2, lijn: "#DCD6F2", bullet: INDIGO, knop: "#ffffff" },
  oranje: { bg: "#FEF1E3", dot: ORANJE, tekst: "#6B4A2A", lijn: "#F4D8B8", bullet: "#D97F1E", knop: "#ffffff" },
  roze: { bg: "#FCE9F0", dot: MAGENTA, tekst: "#7A2A4C", lijn: "#F2CADA", bullet: MAGENTA, knop: "#ffffff" },
  paars: { bg: "#EEEBFC", dot: LILA, tekst: TEKST2, lijn: "#D9D3F5", bullet: "#6F61D9", knop: "#ffffff" },
  wit: { bg: "#ffffff", dot: INDIGO, tekst: TEKST2, lijn: LIJN, bullet: INDIGO, rand: LIJN, knop: "#F3F1FA" },
};

function Lijst({ items, bullet, className = "" }: { items: string[]; bullet: string; className?: string }) {
  return (
    <ul className={`flex flex-col gap-[9px] text-[14px] leading-[1.4] ${className}`}>
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5"><span className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: bullet }} />{t}</li>
      ))}
    </ul>
  );
}

export function WgDiensten({ d }: BlockProps) {
  const items = ((d.items as any[]) || []).filter((x) => x?.title);
  const [eerste, ...rest] = items;
  const nr = (i: number) => String(i + 1).padStart(2, "0");
  return (
    <section id="diensten" className={`wg ${jakarta.className}`}>
      <div className={`${SECTIE} flex flex-col gap-5 md:gap-12`} style={RUIMTE}>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-20">
          <div className="flex flex-col gap-3 md:gap-4">
            <Label>{d.eyebrow}</Label>
            <h2 className="max-w-[560px] text-[36px] font-extrabold leading-[1.02] tracking-[-1.4px] md:max-w-[420px] md:text-[52px] md:leading-none md:tracking-[-2px] xl:text-[60px] xl:tracking-[-2.4px]" style={{ color: INDIGO }}>
              <Regels tekst={d.heading} />
            </h2>
          </div>
          <div className="flex max-w-[420px] flex-col gap-5 md:pb-1">
            <p className="text-[15px] leading-[1.55] md:text-[18px] md:leading-[1.6]" style={{ color: TEKST2 }}>
              <span className="md:hidden">{d.textShort || d.text}</span><span className="hidden md:inline">{d.text}</span>
            </p>
            {d.button?.label && <RondLink href={d.button.href} className="hidden md:flex">{d.button.label}</RondLink>}
          </div>
        </div>

        {/* Mobiel: de eerste dienst open, de rest uitklapbaar */}
        <div className="flex flex-col gap-2.5 md:hidden">
          {eerste && <DienstUitgelicht item={eerste} nummer={nr(0)} />}
          {rest.map((it, i) => {
            const t = TONEN[it.tone] || TONEN.lila;
            return (
              <details key={i} className="wg-acc wg-dienst rounded-[22px]" style={{ background: t.bg, border: t.rand ? `1.5px solid ${t.rand}` : undefined, color: INDIGO }}>
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-3.5 py-4 pl-5 pr-4">
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: t.dot }} />
                  <span className="flex grow flex-col gap-0.5">
                    <span className="text-[17px] font-extrabold leading-[1.2]">{it.title}</span>
                    <span className="text-[13px]" style={{ color: t.tekst }}>{it.short}</span>
                  </span>
                  <span aria-hidden className="wg-plus grid h-10 w-10 shrink-0 place-items-center rounded-full text-[20px]" style={{ background: t.knop }}>
                    <span className="wg-plus-open">+</span><span className="wg-plus-dicht">−</span>
                  </span>
                </summary>
                <div className="flex flex-col gap-3.5 px-5 pb-5" style={{ color: t.tekst }}>
                  <p className="text-[15px] leading-[1.55]">{it.text}</p>
                  <div className="flex flex-col gap-2 border-t-[1.5px] pt-3.5" style={{ borderColor: t.lijn, color: INDIGO }}>
                    <span className="text-[11px] font-bold uppercase tracking-[1.2px]" style={{ color: t.tekst }}>Wat je krijgt</span>
                    <Lijst items={it.list || []} bullet={t.bullet} />
                  </div>
                  <Go href={it.href} className="wg-row flex items-center gap-2 self-start text-[15px] font-bold" style={{ color: INDIGO }}>
                    Meer over {lower(it.title)}<Pijl size={15} />
                  </Go>
                </div>
              </details>
            );
          })}
        </div>

        {/* Tablet en desktop: raster van kaarten */}
        <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4 xl:grid-rows-[470px_420px]">
          {items.map((it, i) => {
            if (it.tone === "indigo") return <DienstUitgelicht key={i} item={it} nummer={nr(i)} groot />;
            const t = TONEN[it.tone] || TONEN.lila;
            if (it.image) {
              return (
                <Go key={i} href={it.href} className="wg-card relative grid grid-cols-[minmax(0,1fr)_200px] gap-6 overflow-hidden rounded-[32px] border-[1.5px] px-9 py-8 md:col-span-2 lg:grid-cols-[minmax(0,1fr)_250px]"
                  style={{ borderColor: t.rand || LIJN, background: t.bg, color: INDIGO }}>
                  <span className="flex flex-col justify-between gap-8">
                    <span className="flex items-center gap-3.5"><span className="h-5 w-5 rounded-full" style={{ background: t.dot }} /><span className="text-[14px] font-bold" style={{ color: TEKST2 }}>{nr(i)}</span></span>
                    <span className="flex flex-col gap-3">
                      <span className="text-[30px] font-extrabold leading-[1.05] tracking-[-1px]">{it.title}</span>
                      <span className="text-[15px] leading-[1.55]" style={{ color: t.tekst }}>{it.text}</span>
                      <span className="mt-1 flex flex-col gap-[9px] border-t-[1.5px] pt-4" style={{ borderColor: t.lijn }}>
                        <span className="text-[12px] font-bold uppercase tracking-[1.2px]" style={{ color: t.tekst }}>Wat je krijgt</span>
                        <Lijst items={it.list || []} bullet={t.bullet} />
                      </span>
                    </span>
                  </span>
                  <span className="relative">
                    <Foto src={it.image} alt={it.alt} focus={it.focus} className="absolute left-0 top-[34px] h-[200px] w-[200px] border-8 lg:h-[250px] lg:w-[250px]" style={{ borderColor: ORANJE }} />
                    <span className="wg-go absolute bottom-[26px] right-1.5 grid h-[52px] w-[52px] place-items-center rounded-full text-white" style={{ background: INDIGO }}><Pijl size={18} /></span>
                  </span>
                </Go>
              );
            }
            return (
              <Go key={i} href={it.href} className="wg-card flex min-h-[420px] flex-col justify-between gap-8 rounded-[32px] p-8" style={{ background: t.bg, color: INDIGO }}>
                <span className="flex items-center justify-between">
                  <span className="h-5 w-5 rounded-full" style={{ background: t.dot }} />
                  <span className="text-[14px] font-bold" style={{ color: t.tekst }}>{nr(i)}</span>
                </span>
                <span className="flex flex-col gap-3">
                  <span className="text-[24px] font-extrabold leading-[1.1] tracking-[-0.6px]">{it.title}</span>
                  <span className="text-[15px] leading-[1.55]" style={{ color: t.tekst }}>{it.text}</span>
                  <span className="mt-1 flex flex-col gap-[9px] border-t-[1.5px] pt-4" style={{ borderColor: t.lijn }}>
                    <span className="text-[12px] font-bold uppercase tracking-[1.2px]" style={{ color: t.tekst }}>Wat je krijgt</span>
                    <Lijst items={it.list || []} bullet={t.bullet} />
                  </span>
                </span>
              </Go>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function lower(s: string) {
  // "Preventie en vitaliteit" -> "preventie en vitaliteit"; afkortingen (RI&E, ERD/ZW, WVP) blijven.
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function DienstUitgelicht({ item, nummer, groot }: { item: any; nummer: string; groot?: boolean }) {
  return (
    <Go href={item.href}
      className={`wg-card relative flex flex-col overflow-hidden rounded-[26px] px-[22px] pb-6 pt-[26px] text-white md:col-span-2 md:justify-between md:rounded-[32px] md:p-11 ${groot ? "md:min-h-[470px]" : ""}`}
      style={{ background: INDIGO, color: "#ffffff" }}>
      <span aria-hidden className="absolute right-[-70px] top-[-70px] h-[200px] w-[200px] rounded-full md:right-[-120px] md:top-[-120px] md:h-[380px] md:w-[380px]" style={{ background: "#3A3690" }} />
      <span aria-hidden className="absolute right-9 top-11 h-[34px] w-[34px] rounded-full md:right-[104px] md:top-[22px] md:h-[60px] md:w-[60px]" style={{ background: MAGENTA }} />
      <span aria-hidden className="absolute right-11 top-[118px] hidden h-7 w-7 rounded-full md:block" style={{ background: ORANJE }} />
      <span className="relative flex items-center gap-1.5 md:gap-2">
        <span className="rounded-full bg-white px-2.5 py-1.5 text-[12px] font-bold md:px-3 md:py-[7px] md:text-[13px]" style={{ color: INDIGO }}>{nummer}</span>
        {item.badge && <span className="rounded-full border-[1.5px] px-2.5 py-[5px] text-[12px] font-bold md:px-3 md:py-1.5 md:text-[13px]" style={{ borderColor: "#5A56A8" }}>{item.badge}</span>}
      </span>
      <span className="relative mt-[18px] flex flex-col gap-3.5 md:mt-8 md:gap-[18px]">
        <span className="text-[26px] font-extrabold leading-[1.05] tracking-[-1px] md:max-w-[440px] md:text-[40px] md:leading-[1.02] md:tracking-[-1.6px] xl:text-[44px]">{item.title}</span>
        <span className="max-w-[480px] text-[15px] leading-[1.55] md:text-[17px] md:leading-[1.6]" style={{ color: "#D6D2F7" }}>
          <span className="md:hidden">{item.short || item.text}</span><span className="hidden md:inline">{item.text}</span>
        </span>
        <span className="flex flex-col gap-2 border-t-[1.5px] pt-3.5 text-[14px] leading-[1.4] md:gap-2.5 md:pt-[18px] md:text-[15px]" style={{ borderColor: "#4A4598" }}>
          <span className="text-[11px] font-bold uppercase tracking-[1.2px] md:text-[12px]" style={{ color: "#B4ADF2" }}>Wat je krijgt</span>
          {((item.list as string[]) || []).map((t, k) => (
            <span key={k} className="flex gap-2.5 md:items-center md:gap-3"><span className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full md:mt-0 md:h-2 md:w-2" style={{ background: ORANJE }} />{t}</span>
          ))}
        </span>
      </span>
    </Go>
  );
}

/* ---------- 4. Werkwijze: de poortwachter-tijdlijn ---------- */

function Alert({ alert, donker }: { alert?: any; donker?: boolean }) {
  if (!alert?.title) return null;
  return (
    <div className={`flex flex-col gap-2.5 rounded-[22px] p-5 lg:gap-3 lg:rounded-[28px] lg:p-7 ${donker ? "text-white" : ""}`}
      style={{ background: donker ? INDIGO : "#ffffff", color: donker ? "#ffffff" : INDIGO }}>
      <span className="flex items-center gap-2.5 lg:gap-3">
        <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full text-[16px] font-extrabold lg:h-10 lg:w-10 lg:text-[19px]" style={{ background: ORANJE, color: "#3D2206" }}>!</span>
        <span className="text-[17px] font-extrabold lg:text-[19px]">{alert.title}</span>
      </span>
      <span className="text-[14px] leading-[1.55] lg:text-[15px] lg:leading-[1.6]" style={{ color: donker ? "#D6D2F7" : TEKST2 }}>{alert.text}</span>
    </div>
  );
}

export function WgWerkwijze({ d }: BlockProps) {
  const steps = ((d.steps as any[]) || []).filter((s) => s?.title);
  const rail = useRef<HTMLDivElement>(null);
  const [actief, setActief] = useState(0);
  const naar = (i: number) => {
    const el = rail.current;
    const kaart = el?.children[i] as HTMLElement | undefined;
    if (!el || !kaart) return;
    el.scrollTo({ left: kaart.offsetLeft - el.offsetLeft - 16, behavior: "smooth" });
  };
  const opScroll = () => {
    const el = rail.current;
    if (!el) return;
    const kaart = el.children[0] as HTMLElement | undefined;
    const stap = kaart ? kaart.offsetWidth + 10 : 292;
    setActief(Math.max(0, Math.min(steps.length - 1, Math.round(el.scrollLeft / stap))));
  };

  return (
    <section id="werkwijze" className={`wg ${jakarta.className}`}>
      <div className="mx-[6px] flex flex-col gap-[22px] rounded-[32px] pb-4 pt-11 md:mx-2 lg:grid lg:grid-cols-12 lg:gap-x-6 lg:gap-y-12 lg:rounded-[40px] lg:px-14 lg:py-[88px] xl:px-[72px]"
        style={{ ...VLAK_MARGE, background: "#F3F1FA", color: INDIGO }}>
        <div className="flex flex-col gap-3 px-[22px] md:px-10 lg:col-span-12 lg:gap-6 lg:px-0 xl:col-span-4">
          <Label>{d.eyebrow}</Label>
          <h2 className="text-[33px] font-extrabold leading-[1.02] tracking-[-1.3px] md:text-[44px] lg:max-w-[560px] lg:text-[52px] lg:leading-none lg:tracking-[-2px]"><Regels tekst={d.heading} /></h2>
          <p className="text-[15px] leading-[1.55] lg:max-w-[560px] lg:text-[17px] lg:leading-[1.6]" style={{ color: TEKST2 }}>
            <span className="lg:hidden">{d.textShort || d.text}</span><span className="hidden lg:inline">{d.text}</span>
          </p>
          <div className="mt-2 hidden xl:block"><Alert alert={d.alert} /></div>
        </div>

        {/* Desktop: tabel met tijdlijn */}
        <div className="hidden flex-col lg:col-span-12 lg:flex xl:col-span-8 xl:col-start-5">
          <div className="grid grid-cols-[176px_minmax(0,1fr)_minmax(0,1fr)] gap-x-6 pb-3.5 pl-[72px] text-[12px] font-bold uppercase tracking-[1.2px] xl:grid-cols-[196px_minmax(0,1fr)_minmax(0,1fr)]" style={{ color: TEKST2 }}>
            <span>{d.colMoment}</span><span>{d.colJij}</span><span style={{ color: "#A8245A" }}>{d.colWij}</span>
          </div>
          <ol className="relative flex flex-col">
            <span aria-hidden className="absolute bottom-10 left-[23px] top-10 w-0.5" style={{ background: "#D9D4F0" }} />
            {steps.map((s, i) => {
              const r = RONDJES[[0, 1, 2, 3][i % 4]];
              return (
                <li key={i} className="relative grid grid-cols-[48px_176px_minmax(0,1fr)_minmax(0,1fr)] gap-x-6 border-t-[1.5px] py-3.5 last:border-b-[1.5px] xl:grid-cols-[48px_196px_minmax(0,1fr)_minmax(0,1fr)]" style={{ borderColor: LIJN }}>
                  <span className="grid h-12 w-12 place-items-center rounded-full text-[16px] font-extrabold" style={{ background: r.bg, color: r.fg, boxShadow: "0 0 0 6px #F3F1FA" }}>{i + 1}</span>
                  <span className="flex flex-col">
                    <span className="text-[13px] font-bold" style={{ color: "#A8245A" }}>{s.when}</span>
                    <span className="text-[19px] font-extrabold leading-[1.25] tracking-[-0.4px]">{s.title}</span>
                  </span>
                  <span className="pt-0.5 text-[15px] leading-[1.5]"><span className="sr-only">{d.colJij}: </span>{s.jij}</span>
                  <span className="pt-0.5 text-[15px] leading-[1.5]" style={{ color: TEKST2 }}><span className="sr-only">{d.colWij}: </span>{s.wij}</span>
                </li>
              );
            })}
          </ol>
          <div className="mt-8 xl:hidden"><Alert alert={d.alert} /></div>
        </div>

        {/* Mobiel en tablet: veegbare kaarten */}
        <div className="flex flex-col gap-[22px] lg:hidden">
          <div aria-hidden className="relative flex justify-between px-[22px] md:px-10">
            <span className="absolute left-9 right-9 top-3.5 h-0.5 md:left-[52px] md:right-[52px]" style={{ background: "#D9D4F0" }} />
            {steps.map((_, i) => (
              <span key={i} className="relative grid h-[30px] w-[30px] place-items-center rounded-full text-[12px] font-extrabold"
                style={i === actief ? { background: INDIGO, color: "#ffffff" } : { background: "#ffffff", color: TEKST2, border: "1.5px solid #D9D4F0" }}>
                {i + 1}
              </span>
            ))}
          </div>
          <div ref={rail} onScroll={opScroll} role="region" aria-label="Tijdlijn poortwachter, veeg voor meer" tabIndex={0}
            className="wg-rail flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 md:px-9">
            {steps.map((s, i) => {
              const r = RONDJES[i % 4];
              return (
                <div key={i} className="flex w-[282px] shrink-0 snap-start flex-col gap-3 rounded-[24px] bg-white p-5" aria-label={`Moment ${i + 1} van ${steps.length}`}>
                  <span className="flex items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[15px] font-extrabold" style={{ background: r.bg, color: r.fg }}>{i + 1}</span>
                    <span className="flex flex-col">
                      <span className="text-[12px] font-bold" style={{ color: "#A8245A" }}>{s.when}</span>
                      <span className="text-[18px] font-extrabold leading-[1.15]">{s.title}</span>
                    </span>
                  </span>
                  <span className="flex flex-col gap-[3px]">
                    <span className="text-[11px] font-bold uppercase tracking-[1.1px]" style={{ color: TEKST2 }}>{d.colJij}</span>
                    <span className="text-[14px] leading-[1.5]">{s.jij}</span>
                  </span>
                  <span className="flex flex-col gap-[3px] border-t-[1.5px] pt-2.5" style={{ borderColor: LIJN }}>
                    <span className="text-[11px] font-bold uppercase tracking-[1.1px]" style={{ color: "#A8245A" }}>{d.colWij}</span>
                    <span className="text-[14px] leading-[1.5]" style={{ color: TEKST2 }}>{s.wij}</span>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between pl-[22px] pr-4 md:px-10">
            <span className="text-[13px] font-bold" style={{ color: TEKST2 }} aria-live="polite">{actief + 1} van {steps.length} · veeg voor meer</span>
            <span className="flex gap-2">
              <button type="button" aria-label="Vorig moment" onClick={() => naar(Math.max(0, actief - 1))} disabled={actief === 0}
                className="wg-pijlknop grid h-11 w-11 place-items-center rounded-full border-[1.5px] bg-white disabled:opacity-40" style={{ borderColor: "#D9D4F0", color: INDIGO }}>
                <Pijl links />
              </button>
              <button type="button" aria-label="Volgend moment" onClick={() => naar(Math.min(steps.length - 1, actief + 1))} disabled={actief === steps.length - 1}
                className="wg-pijlknop grid h-11 w-11 place-items-center rounded-full text-white disabled:opacity-40" style={{ background: INDIGO }}>
                <Pijl />
              </button>
            </span>
          </div>
          <div className="mx-2.5 md:mx-10"><Alert alert={d.alert} donker /></div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 5. ERD/ZW ---------- */

export function WgErd({ d }: BlockProps) {
  const rows = ((d.rows as any[]) || []).filter((r) => r?.title);
  const kleuren = [INDIGO, ORANJE, MAGENTA];
  return (
    <section id="erd" className={`wg ${jakarta.className}`}>
      <div className={`${SECTIE} flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-6`} style={{ ...RUIMTE, color: INDIGO }}>
        <div className="relative h-[210px] w-full max-w-[350px] lg:col-span-5 lg:h-[400px] lg:max-w-none xl:h-[480px]">
          <Foto src={d.image} alt={d.alt} focus={d.focus} className="absolute left-0 top-0 h-[210px] w-[210px] border-[7px] lg:top-2.5 lg:h-[380px] lg:w-[380px] lg:border-[10px] xl:h-[460px] xl:w-[460px]" style={{ borderColor: INDIGO }} />
          {d.badge?.title && (
            <span className="absolute left-[186px] top-[96px] flex h-[104px] w-[104px] flex-col items-center justify-center rounded-full lg:left-[290px] lg:top-[250px] lg:h-[140px] lg:w-[140px] xl:left-[360px] xl:top-[300px] xl:h-40 xl:w-40" style={{ background: ORANJE, color: "#3D2206" }}>
              <span className="text-[24px] font-extrabold leading-none tracking-[-1px] lg:text-[30px] xl:text-[34px]">{d.badge.title}</span>
              <span className="text-[12px] font-bold lg:text-[14px]">{d.badge.sub}</span>
            </span>
          )}
          <span aria-hidden className="absolute left-[330px] top-0 hidden h-11 w-11 rounded-full lg:block xl:left-[400px]" style={{ background: MAGENTA }} />
        </div>
        <div className="flex flex-col gap-5 lg:col-span-6 lg:col-start-7 lg:gap-[26px]">
          <Label>{d.eyebrow}</Label>
          <h2 className="text-[34px] font-extrabold leading-[1.02] tracking-[-1.3px] md:text-[46px] lg:text-[48px] lg:leading-none lg:tracking-[-2px] xl:text-[56px] xl:tracking-[-2.2px]">{d.heading}</h2>
          <p className="text-[16px] leading-[1.6] lg:text-[18px] lg:leading-[1.65]" style={{ color: TEKST2 }}>
            <span className="lg:hidden">{d.textShort || d.text}</span><span className="hidden lg:inline">{d.text}</span>
          </p>
          <div className="flex flex-col border-t-[1.5px]" style={{ borderColor: LIJN }}>
            {rows.map((r, i) => (
              <div key={i} className="flex gap-3.5 border-b-[1.5px] py-3.5 md:grid md:grid-cols-[14px_170px_minmax(0,1fr)] md:gap-x-[18px] md:py-[18px]" style={{ borderColor: LIJN }}>
                <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full md:mt-[5px] md:h-3.5 md:w-3.5" style={{ background: kleuren[i % 3] }} />
                <span className="flex flex-col gap-0.5 md:contents">
                  <span className="text-[16px] font-extrabold md:text-[17px]">{r.title}</span>
                  <span className="text-[14px] leading-[1.5] md:text-[16px] md:leading-[1.55]" style={{ color: TEKST2 }}>{r.text}</span>
                </span>
              </div>
            ))}
          </div>
          {d.link?.label && <RondLink href={d.link.href} className="mt-1">{d.link.label}</RondLink>}
        </div>
      </div>
    </section>
  );
}

/* ---------- 6. Zo start je ---------- */

export function WgStarten({ d }: BlockProps) {
  const steps = ((d.steps as any[]) || []).filter((s) => s?.title);
  return (
    <section id="starten" className={`wg ${jakarta.className}`}>
      <div className="relative mx-[6px] flex flex-col gap-[22px] overflow-hidden rounded-[32px] px-4 pb-4 pt-11 text-white md:mx-2 md:px-10 md:pb-10 lg:grid lg:grid-cols-12 lg:gap-x-6 lg:rounded-[40px] lg:px-14 lg:py-20 xl:px-[72px]"
        style={{ ...VLAK_MARGE, background: INDIGO, color: "#ffffff" }}>
        <span aria-hidden className="absolute bottom-[-220px] left-[-160px] hidden h-[540px] w-[540px] rounded-full lg:block" style={{ background: "#3A3690" }} />
        {/* Mobiel: foto rechtsboven */}
        <Foto src={d.image} alt={d.alt} focus={d.focus} className="absolute right-[-24px] top-[-24px] h-[150px] w-[150px] border-[6px] lg:hidden" style={{ borderColor: ORANJE, background: "#3A3690" }} />

        <div className="relative flex flex-col gap-3 px-1.5 lg:col-span-5 lg:gap-6 lg:px-0">
          <Label kleur="#B4ADF2">{d.eyebrow}</Label>
          <h2 className="text-[36px] font-extrabold leading-[1.02] tracking-[-1.4px] md:text-[48px] lg:text-[56px] lg:leading-none xl:text-[60px] xl:tracking-[-2.4px]" style={{ color: "#ffffff" }}>{d.heading}</h2>
          <p className="max-w-[420px] text-[15px] leading-[1.6] lg:text-[18px]" style={{ color: "#D6D2F7" }}>
            <span className="lg:hidden">{d.textShort || d.text}</span><span className="hidden lg:inline">{d.text}</span>
          </p>
          {d.button?.label && (
            <Go href={d.button.href} className="wg-btn mt-1 hidden self-start rounded-full px-6 py-4 text-[15px] font-bold lg:block" style={{ background: MAGENTA, color: "#ffffff" }}>{d.button.label}</Go>
          )}
          {d.call?.href && (
            <Go href={d.call.href} className="wg-row mt-3 hidden items-center gap-5 lg:flex" style={{ color: "#ffffff" }}>
              <span className="relative h-[116px] w-[116px] shrink-0 overflow-hidden rounded-full border-[6px]" style={{ borderColor: ORANJE, background: "#3A3690" }}>
                {d.image && <img src={d.image} alt={d.alt || ""} loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: d.focus || "55% 25%" }} />}
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-[15px]" style={{ color: "#D6D2F7" }}>{d.call.label}</span>
                <span className="text-[22px] font-extrabold tracking-[-0.4px]">{d.call.value}</span>
              </span>
            </Go>
          )}
        </div>

        <ol className="relative flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-3 lg:col-span-7 lg:col-start-6 lg:self-start xl:col-span-6 xl:col-start-7">
          {steps.map((s, i) => {
            const r = [{ bg: "#ffffff", fg: INDIGO }, RONDJES[1], RONDJES[2], RONDJES[3]][i % 4];
            return (
              <li key={i} className="flex items-center gap-3.5 rounded-[20px] px-3.5 py-3 md:flex-col md:items-start md:rounded-[28px] md:p-7" style={{ background: "#3A3690" }}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] font-extrabold md:h-12 md:w-12 md:text-[17px]" style={{ background: r.bg, color: r.fg }}>{i + 1}</span>
                <span className="flex flex-col gap-0.5 md:gap-3.5">
                  <span className="text-[16px] font-extrabold md:text-[21px] md:tracking-[-0.4px]">{s.title}</span>
                  <span className="text-[13px] leading-[1.45] md:text-[15px] md:leading-[1.55]" style={{ color: "#D6D2F7" }}>{s.text}</span>
                </span>
              </li>
            );
          })}
        </ol>

        {d.button?.label && (
          <Go href={d.button.href} className="wg-btn relative rounded-full p-4 text-center text-[15px] font-bold lg:hidden" style={{ background: MAGENTA, color: "#ffffff" }}>{d.button.label}</Go>
        )}
        {d.call?.href && (
          <Go href={d.call.href} className="relative -mt-1.5 pb-2 pt-1 text-center text-[14px] font-bold lg:hidden" style={{ color: "#ffffff" }}>
            {d.call.label} {d.call.value}
          </Go>
        )}
      </div>
    </section>
  );
}

/* ---------- 7. Tarieven ---------- */

export function WgTarieven({ d }: BlockProps) {
  const pakketten = ((d.pakketten as any[]) || []).filter((p) => p?.naam);
  return (
    <section id="tarieven" className={`wg ${jakarta.className}`}>
      <div className={`${SECTIE} flex flex-col gap-3 lg:grid lg:grid-cols-12 lg:gap-x-6`} style={{ ...RUIMTE, color: INDIGO }}>
        <div className="mb-2 flex flex-col gap-3 lg:col-span-12 lg:mb-10 lg:max-w-[560px] lg:gap-5 xl:col-span-3 xl:mb-0">
          <Label>{d.eyebrow}</Label>
          <h2 className="text-[36px] font-extrabold leading-[1.02] tracking-[-1.4px] md:text-[46px] lg:text-[52px] lg:leading-none lg:tracking-[-2px] xl:text-[56px] xl:tracking-[-2.2px]">{d.heading}</h2>
          <p className="text-[15px] leading-[1.6] lg:text-[17px]" style={{ color: TEKST2 }}>
            <span className="lg:hidden">{d.textShort || d.text}</span><span className="hidden lg:inline">{d.text}</span>
          </p>
          {d.link?.label && <RondLink href={d.link.href} className="mt-1 hidden xl:flex">{d.link.label}</RondLink>}
        </div>

        {/* Mobiel: compacte rijen */}
        <div className="flex flex-col gap-3 md:hidden">
          {pakketten.map((p, i) => {
            const donker = !!p.featured;
            return (
              <Go key={i} href={p.button?.href || d.link?.href || "/verzuimabonnementen"}
                className="wg-card relative flex items-center justify-between gap-3 overflow-hidden rounded-[22px] px-5 py-[18px]"
                style={donker ? { background: INDIGO, color: "#ffffff" } : { border: `1.5px solid ${LIJN}`, color: INDIGO }}>
                <span className="relative flex flex-col gap-0.5">
                  <span className="text-[12px]" style={{ color: donker ? "#D6D2F7" : TEKST2 }}>{p.voor}</span>
                  <span className="text-[17px] font-extrabold leading-[1.2]">{p.naam}</span>
                </span>
                <span className="relative flex shrink-0 flex-col items-end text-right">
                  <span className="text-[22px] font-extrabold tracking-[-0.6px]">{p.prijs}</span>
                  <span className="text-[11px]" style={{ color: donker ? "#D6D2F7" : TEKST2 }}>{p.periode}</span>
                </span>
              </Go>
            );
          })}
          {d.note && <p className="text-[13px]" style={{ color: TEKST2 }}>{d.note}</p>}
          {d.link?.label && <RondLink href={d.link.href} className="mt-1">{d.link.label}</RondLink>}
        </div>

        {/* Vanaf tablet: drie kaarten */}
        <div className="hidden md:flex md:flex-col md:gap-3 lg:col-span-12 xl:col-span-8 xl:col-start-5">
          <div className="grid grid-cols-3 items-stretch gap-3.5">
            {pakketten.map((p, i) => {
              const donker = !!p.featured;
              const zacht = donker ? "#D6D2F7" : TEKST2;
              return (
                <div key={i} className={`wg-card relative flex flex-col gap-4 overflow-hidden rounded-[28px] p-6 xl:p-7 ${donker ? "text-white" : ""}`}
                  style={donker ? { background: INDIGO } : { border: `1.5px solid ${LIJN}` }}>
                  {donker && <span aria-hidden className="absolute right-[-60px] top-[-60px] h-[180px] w-[180px] rounded-full" style={{ background: MAGENTA }} />}
                  <span className="relative text-[14px] font-semibold" style={{ color: zacht }}>{p.voor}</span>
                  <h3 className="relative -mt-2 text-[20px] font-extrabold leading-[1.15] xl:text-[22px]" style={{ color: donker ? "#ffffff" : INDIGO }}>{p.naam}</h3>
                  <span className="relative text-[36px] font-extrabold leading-none tracking-[-1.6px] xl:text-[42px]">{p.prijs}</span>
                  <span className="relative -mt-1 text-[14px]" style={{ color: zacht }}>{p.periode}</span>
                  <ul className="relative flex flex-col gap-2.5 border-t-[1.5px] pt-4 text-[14px]" style={{ borderColor: donker ? "#4A4598" : LIJN }}>
                    {((p.items as string[]) || []).map((t, k) => (
                      <li key={k} className="flex items-center gap-2.5"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: donker ? ORANJE : MAGENTA }} />{t}</li>
                    ))}
                  </ul>
                  {p.button?.label && (
                    <Go href={p.button.href} className={`wg-btn relative mt-auto rounded-full p-4 text-center text-[15px] font-bold ${donker ? "" : "wg-btn-rand"}`}
                      style={donker ? { background: MAGENTA, color: "#ffffff" } : { border: `1.5px solid ${INDIGO}`, color: INDIGO }}>
                      {p.button.label}
                    </Go>
                  )}
                </div>
              );
            })}
          </div>
          {d.note && <p className="text-[13px]" style={{ color: TEKST2 }}>{d.note}</p>}
          {d.link?.label && <RondLink href={d.link.href} className="xl:hidden">{d.link.label}</RondLink>}
        </div>
      </div>
    </section>
  );
}

/* ---------- 8. Klanten ---------- */

function Stipjes({ klein }: { klein?: boolean }) {
  return (
    <span aria-hidden className="flex gap-1.5 lg:gap-2">
      {[MAGENTA, ORANJE, LILA].map((c) => <span key={c} className={klein ? "h-3.5 w-3.5 rounded-full" : "h-[18px] w-[18px] rounded-full"} style={{ background: c }} />)}
    </span>
  );
}

export function WgBewijs({ d }: BlockProps) {
  const logos = ((d.logos as any[]) || []).filter((l) => l?.image);
  return (
    <section className={`wg ${jakarta.className}`}>
      <div className={`${SECTIE} flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-6`} style={{ ...RUIMTE, color: INDIGO }}>
        <div className="flex items-center gap-4 lg:relative lg:col-span-5 lg:block lg:h-[320px] xl:col-span-4 xl:h-[360px]">
          <Foto src={d.image} alt={d.alt} focus={d.focus} className="relative h-[150px] w-[150px] shrink-0 border-[6px] lg:absolute lg:left-0 lg:top-0 lg:h-[320px] lg:w-[320px] lg:border-[10px] xl:h-[360px] xl:w-[360px]" style={{ borderColor: ORANJE }} />
          <span aria-hidden className="absolute left-[260px] top-[240px] hidden h-16 w-16 rounded-full lg:block xl:left-[296px] xl:top-[270px]" style={{ background: INDIGO }} />
          <span className="flex flex-col gap-3 lg:hidden">
            <Stipjes klein />
            <Label className="leading-[1.4]">{d.eyebrow}</Label>
          </span>
        </div>
        <div className="flex flex-col gap-5 lg:col-span-7 lg:col-start-6 lg:gap-6">
          <span className="hidden lg:block"><Stipjes /></span>
          <Label className="hidden lg:block">{d.eyebrow}</Label>
          <h2 className="text-[24px] font-bold leading-[1.25] tracking-[-0.6px] lg:text-[34px] lg:leading-[1.22] lg:tracking-[-1px]">{d.heading}</h2>
          {logos.length > 0 && (
            <ul className="mt-1 grid grid-cols-3 gap-2 md:grid-cols-5 lg:mt-2 lg:gap-2.5">
              {logos.map((l, i) => (
                <li key={i} className="wg-logo grid h-[52px] place-items-center rounded-[14px] px-3 lg:h-[72px] lg:rounded-[18px] lg:px-4" style={{ background: "#F7F6FB" }}>
                  <img src={l.image} alt={l.alt || "Klantlogo"} loading="lazy" className="max-h-[30px] max-w-full object-contain lg:max-h-[40px]" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- 9. Vragen ---------- */

export function WgVragen({ d }: BlockProps) {
  const items = ((d.items as any[]) || []).filter((x) => x?.question && x?.answer);
  return (
    <section id="vragen" className={`wg ${jakarta.className}`}>
      <div className={`${SECTIE} flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:gap-x-6`} style={{ ...RUIMTE, color: INDIGO }}>
        <div className="flex items-end justify-between gap-3 lg:col-span-5 lg:flex-col lg:items-start lg:justify-start lg:gap-6 xl:col-span-4">
          <span className="flex flex-col gap-3 lg:gap-6">
            <Label>{d.eyebrow}</Label>
            <h2 className="text-[34px] font-extrabold leading-[1.02] tracking-[-1.3px] md:text-[46px] lg:text-[52px] lg:leading-none lg:tracking-[-2px] xl:text-[56px] xl:tracking-[-2.2px]">{d.heading}</h2>
          </span>
          <span className="relative h-24 w-24 shrink-0 lg:hidden">
            <Foto src={d.image} alt={d.alt} focus={d.focus} className="absolute inset-0 border-[5px]" style={{ borderColor: LILA }} />
          </span>
          <div className="mt-2 hidden items-center gap-[22px] lg:flex">
            <span className="relative h-[150px] w-[150px] shrink-0">
              <Foto src={d.image} alt={d.alt} focus={d.focus} className="absolute inset-0 border-[7px]" style={{ borderColor: LILA }} />
            </span>
            <span className="flex flex-col gap-3.5">
              <span className="text-[16px] leading-[1.55]" style={{ color: TEKST2 }}>{d.text}</span>
              {d.phone?.href && (
                <Go href={d.phone.href} className="wg-row flex items-center gap-2.5 text-[16px] font-bold" style={{ color: INDIGO }}>
                  <span className="grid h-11 w-11 place-items-center rounded-full text-white" style={{ background: INDIGO }}><LuPhone aria-hidden className="text-[17px]" /></span>
                  {d.phone.label}
                </Go>
              )}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:col-span-7 lg:col-start-6 lg:gap-2.5 lg:pt-1">
          {items.map((it, i) => (
            <details key={i} className="wg-acc wg-faq rounded-[22px] border-[1.5px] lg:rounded-[28px]" open={i === 0}>
              <summary className="flex min-h-[62px] cursor-pointer list-none items-center justify-between gap-3 py-2.5 pl-[18px] pr-3 text-left text-[16px] font-extrabold leading-[1.3] lg:min-h-[64px] lg:gap-5 lg:pl-7 lg:text-[19px]">
                <h3 className="font-extrabold">{it.question}</h3>
                <span aria-hidden className="wg-plus grid h-10 w-10 shrink-0 place-items-center rounded-full border-[1.5px] text-[20px] font-semibold lg:h-11 lg:w-11 lg:text-[22px]">
                  <span className="wg-plus-open">+</span><span className="wg-plus-dicht">−</span>
                </span>
              </summary>
              <p className="max-w-[600px] pb-5 pl-[18px] pr-5 text-[14px] leading-[1.6] lg:pb-[26px] lg:pl-7 lg:pr-12 lg:text-[16px]" style={{ color: TEKST2 }}>{it.answer}</p>
            </details>
          ))}
        </div>

        {d.phone?.href && (
          <Go href={d.phone.href} className="text-[15px] font-bold lg:hidden" style={{ color: INDIGO }}>
            Staat je vraag er niet bij? <span style={{ color: MAGENTA }}>Bel {d.phone.label}</span>
          </Go>
        )}
      </div>
    </section>
  );
}

/* ---------- 10. Offerte ---------- */

const ROUTE_ICON: Record<string, any> = { phone: LuPhone, mail: LuMail };

export function WgOfferte({ d }: BlockProps) {
  const routes = ((d.routes as any[]) || []).filter((r) => r?.label && r?.href);
  return (
    <section id="offerte" className={`wg ${jakarta.className}`} style={{ paddingBottom: 8 }}>
      <div className="relative mx-[6px] flex flex-col gap-5 overflow-hidden rounded-[32px] px-3.5 pb-3.5 pt-11 text-white md:mx-2 md:px-10 md:pb-10 lg:grid lg:grid-cols-12 lg:gap-x-6 lg:rounded-[40px] lg:px-14 lg:py-20 xl:px-[72px]"
        style={{ ...VLAK_MARGE, background: MAGENTA, color: "#ffffff" }}>
        <span aria-hidden className="absolute right-[-90px] top-[-90px] h-60 w-60 rounded-full lg:bottom-[-220px] lg:left-[-140px] lg:right-auto lg:top-auto lg:h-[540px] lg:w-[540px]" style={{ background: "#B02A5D" }} />
        <Foto src={d.image} alt={d.alt} focus={d.focus} className="absolute right-[18px] top-[26px] h-[104px] w-[104px] border-[5px] border-white lg:hidden" style={{ background: "#F5D9E4" }} />
        <Foto src={d.image} alt={d.alt} focus={d.focus} className="absolute bottom-[72px] left-[300px] hidden h-[160px] w-[160px] border-8 border-white lg:block xl:left-[392px] xl:h-[190px] xl:w-[190px]" style={{ background: "#F5D9E4" }} />
        <span aria-hidden className="absolute bottom-[210px] left-[440px] hidden h-10 w-10 rounded-full lg:block xl:bottom-[228px] xl:left-[560px]" style={{ background: ORANJE }} />

        <div className="relative flex flex-col gap-3.5 px-2.5 lg:col-span-5 lg:gap-6 lg:px-0">
          <Label kleur="#FFD0E0">{d.eyebrow}</Label>
          <h2 className="pr-[110px] text-[38px] font-extrabold leading-none tracking-[-1.5px] md:pr-0 md:text-[52px] lg:text-[56px] lg:leading-[0.98] xl:text-[64px] xl:tracking-[-2.6px]" style={{ color: "#ffffff" }}>
            <Regels tekst={d.heading} altijd />
          </h2>
          {d.text && <p className="max-w-[400px] text-[15px] leading-[1.6] lg:text-[18px]" style={{ color: "#FFE3EC" }}>{d.text}</p>}
          <div className="mt-1 hidden flex-col gap-3 lg:flex">
            {routes.map((r, i) => {
              const Ic = ROUTE_ICON[r.icon] || LuPhone;
              return (
                <Go key={i} href={r.href} className="wg-row flex items-center gap-4 text-[20px] font-extrabold xl:text-[22px]" style={{ color: "#ffffff" }}>
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white" style={{ color: MAGENTA }}><Ic aria-hidden className="text-[19px]" /></span>
                  {r.label}
                </Go>
              );
            })}
          </div>
        </div>

        <div className="wg-form relative flex flex-col gap-3.5 rounded-[24px] bg-white px-[18px] py-[22px] lg:col-span-6 lg:col-start-7 lg:rounded-[28px] lg:p-7" style={{ color: INDIGO }}>
          <ContactForm />
          {routes.length > 0 && (
            <p className="text-center text-[14px] font-bold lg:hidden">
              Of {routes.map((r, i) => (
                <span key={i}>{i > 0 && " · "}<a href={r.href} style={{ color: INDIGO }}>{r.icon === "phone" ? `bel ${r.label}` : r.label}</a></span>
              ))}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
