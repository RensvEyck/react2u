import Link from "next/link";
import { outfit } from "./HomeVerhaal";
import { LuUser, LuPhone, LuShieldCheck, LuFolder, LuMail, LuMapPin, LuClock } from "react-icons/lu";

/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */

/*
 * De neutrale startpagina (ontwerp "Home neutraal"): de splitscreen
 * werkgever | werknemer, waarom React2u, snel naar voor drie soorten
 * bezoekers en contact. Koppen in Outfit, tekst in DM Sans, kleuren uit het logo;
 * de hover-effecten staan in globals.css onder `.hn`.
 */


const INDIGO = "#322E83";
const MAGENTA = "#E61674";
const IVOOR = "#F8F5F1";
const TEKST2 = "#55518A";

type BlockProps = { d: any; asH1?: boolean };

function isExternal(href?: string) {
  return !!href && (href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:"));
}

function Go({ href, className, style, children, ...rest }: {
  href: string; className?: string; style?: React.CSSProperties; children: React.ReactNode; [k: string]: any;
}) {
  if (isExternal(href) || href.startsWith("#")) {
    return <a href={href} className={className} style={style} {...rest}>{children}</a>;
  }
  return <Link href={href} className={className} style={style} {...rest}>{children}</Link>;
}

function Pijl({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="hn-pijl">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Label({ children, kleur = "#C40F60" }: { children: React.ReactNode; kleur?: string }) {
  return (
    <span className="text-[12px] font-bold uppercase tracking-[1.4px] md:text-[13px]" style={{ color: kleur }}>
      {children}
    </span>
  );
}

/** Kop met een magenta tweede deel: "Samen gezond" + "terug aan het werk." */
function Kop({ heading, highlight }: { heading: string; highlight?: string }) {
  return (
    <>
      {heading}
      {highlight && (<><br /><span style={{ color: MAGENTA }}>{highlight}</span></>)}
    </>
  );
}

/* ---------- 1. Splitscreen ---------- */

export function HomeSplit({ d, asH1 }: BlockProps) {
  const choices = ((d.choices as any[]) || []).filter((c) => c?.title && c?.href).slice(0, 2);
  const H = asH1 ? "h1" : "h2";
  return (
    <section className={`hn hn-type ${outfit.variable}`} style={{ background: IVOOR }}>
      <H className="sr-only">{d.heading || "React2u, persoonlijke arbodienst in Eindhoven"}</H>
      <div className="hn-split mx-auto flex max-w-[2400px] flex-col gap-[6px] px-[6px] pb-[6px] md:flex-row md:gap-2 md:px-2 md:pb-2">
        {choices.map((c, i) => {
          const links = i === 0;
          const kleur = links ? INDIGO : MAGENTA;
          const zacht = links ? "#D6D2F7" : "#FFE3EC";
          const label = links ? "#B4ADF2" : "#FFD0E0";
          return (
            <Link key={i} href={c.href} aria-label={c.aria || c.title}
              className="hn-tile group relative h-[380px] overflow-hidden rounded-[28px] md:h-auto md:rounded-[36px]"
              style={{ background: links ? "#D9D3F0" : "#F5D9E4" }}>
              <img src={c.image} alt={c.alt || ""} className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: c.focus || "50% 30%" }} fetchPriority="high" loading="eager" decoding="sync" />
              <span
                className={`hn-orb absolute flex flex-col justify-center rounded-full text-white ${links ? "hn-orb-l" : "hn-orb-r"}`}
                style={{ background: kleur, transformOrigin: links ? "28% 72%" : "72% 72%" }}>
                <span className="hn-orb-e hidden font-bold uppercase md:block" style={{ color: label }}>{c.eyebrow}</span>
                <span className="hn-kop hn-orb-kop leading-none">
                  {String(c.title).replace(/^Ik ben /, "Ik ben ").split(" ").map((t, k) => (
                    <span key={k} className="block">{t}</span>
                  ))}
                </span>
                {c.text && (
                  <span className="hn-orb-t leading-snug" style={{ color: zacht }}>
                    <span className="md:hidden">{c.short || c.text}</span>
                    <span className="hidden md:inline">{c.text}</span>
                  </span>
                )}
                <span className="hn-orb-go mt-1 flex items-center justify-center self-start rounded-full bg-white font-bold"
                  style={{ color: kleur }}>
                  <span className="hn-go-t">{c.button}</span>
                  <Pijl size={18} />
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- 2. Waarom React2u ---------- */

const ICONEN: Record<string, { Icon: any; bg: string; fg: string }> = {
  user: { Icon: LuUser, bg: INDIGO, fg: "#ffffff" },
  phone: { Icon: LuPhone, bg: MAGENTA, fg: "#ffffff" },
  shield: { Icon: LuShieldCheck, bg: "#F29A3A", fg: "#3D2206" },
  folder: { Icon: LuFolder, bg: "#8C7FE8", fg: "#ffffff" },
};

export function HomeWaarom({ d }: BlockProps) {
  const promises = ((d.promises as any[]) || []).filter((p) => p?.title);
  const trust = ((d.trust as any[]) || []).filter((t) => t?.text);
  return (
    <section className={`hn hn-type ${outfit.variable}`} style={{ background: IVOOR }}>
      <div className="mx-[6px] grid gap-7 rounded-[32px] bg-white p-[6px] pb-8 md:mx-2 md:grid-cols-12 md:gap-x-6 md:rounded-[40px] md:p-10 lg:p-[72px]"
        style={{ marginTop: "clamp(56px, 8vw, 120px)" }}>
        <div className="relative h-[340px] overflow-hidden rounded-[28px] md:col-span-5 md:h-auto md:min-h-[620px] md:rounded-[32px] lg:min-h-[700px]"
          style={{ background: "#D9D3F0" }}>
          <img src={d.image} alt={d.alt || ""} loading="lazy" className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: d.focus || "30% 40%" }} />
          {d.badgeText && (
            <span className="absolute bottom-[-80px] left-[-60px] flex h-[230px] w-[230px] flex-col justify-center gap-1 rounded-full pb-[56px] pl-[82px] text-white md:bottom-[-110px] md:left-[-70px] md:h-[330px] md:w-[330px] md:gap-1.5 md:pb-[80px] md:pl-[118px]"
              style={{ background: INDIGO }}>
              <span className="text-[11px] font-bold uppercase tracking-[1.2px] md:text-[13px]" style={{ color: "#B4ADF2" }}>{d.badgeLabel}</span>
              <span className="text-[17px] font-extrabold leading-[1.1] md:text-[22px] md:tracking-[-0.6px]">
                {String(d.badgeText).split("\n").map((t: string, k: number) => <span key={k} className="block">{t}</span>)}
              </span>
            </span>
          )}
        </div>
        <div className="flex flex-col justify-center gap-[18px] px-[14px] md:col-span-7 md:col-start-6 md:gap-7 md:px-0 md:py-3 md:pl-8 lg:pl-12">
          <Label>{d.eyebrow}</Label>
          <h2 className="text-[40px] font-extrabold leading-[0.98] tracking-[-1.7px] md:text-[52px] lg:text-[64px] lg:tracking-[-2.8px]" style={{ color: INDIGO }}>
            <Kop heading={d.heading} highlight={d.highlight} />
          </h2>
          {d.text && <p className="max-w-[560px] text-[16px] leading-[1.6] md:text-[19px]" style={{ color: TEKST2 }}>{d.text}</p>}
          <div className="grid gap-5 md:grid-cols-2 md:gap-x-10 md:gap-y-7">
            {promises.map((p, i) => {
              const ic = ICONEN[p.icon] || ICONEN.user;
              return (
                <div key={i} className="flex gap-4 border-t-[1.5px] pt-5 md:gap-5 md:pt-7" style={{ borderColor: "#E4E0F4" }}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full md:h-[52px] md:w-[52px]" style={{ background: ic.bg, color: ic.fg }}>
                    <ic.Icon className="text-[18px] md:text-[22px]" aria-hidden />
                  </span>
                  <span className="flex flex-col gap-1.5">
                    <span className="text-[18px] font-extrabold leading-[1.2] tracking-[-0.4px] md:text-[21px]" style={{ color: INDIGO }}>{p.title}</span>
                    <span className="text-[15px] leading-[1.55] md:text-[16px]" style={{ color: TEKST2 }}>{p.text}</span>
                  </span>
                </div>
              );
            })}
          </div>
          {trust.length > 0 && (
            <ul className="mt-2 hidden flex-wrap gap-2.5 text-[14px] font-bold md:flex" style={{ color: INDIGO }}>
              {trust.map((t, i) => (
                <li key={i} className="flex items-center gap-2 rounded-full px-4 py-2.5" style={{ background: IVOOR }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: [INDIGO, MAGENTA, "#F29A3A"][i % 3] }} />{t.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- 3. Snel naar ---------- */

const TONEN: Record<string, { bg: string; dot: string; circ: string }> = {
  werkgever: { bg: "#F3F1FA", dot: INDIGO, circ: "#E4E0F4" },
  werknemer: { bg: "#FCE9F0", dot: MAGENTA, circ: "#F8D6E3" },
  werkzoekende: { bg: "#FEF1E3", dot: "#B55F12", circ: "#FBE0C4" },
};

export function HomeSnelNaar({ d }: BlockProps) {
  const cards = ((d.cards as any[]) || []).filter((c) => c?.title);
  return (
    <section className={`hn hn-type ${outfit.variable}`} style={{ background: IVOOR }}>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-[22px] px-[6px] md:gap-12 md:px-10 lg:px-20"
        style={{ paddingTop: "clamp(80px, 10vw, 144px)" }}>
        <div className="flex flex-col gap-3.5 px-[14px] md:flex-row md:items-end md:justify-between md:px-0">
          <div className="flex flex-col gap-3.5 md:gap-[18px]">
            <Label>{d.eyebrow}</Label>
            <h2 className="text-[34px] font-extrabold leading-[1.02] tracking-[-1.4px] md:text-[44px] lg:text-[54px] lg:tracking-[-2.2px]" style={{ color: INDIGO }}>{d.heading}</h2>
          </div>
          {d.text && <p className="hidden max-w-[400px] text-[17px] leading-[1.6] md:block" style={{ color: TEKST2 }}>{d.text}</p>}
        </div>
        <div className="grid gap-2 md:grid-cols-3 md:gap-4">
          {cards.map((c, i) => {
            const t = TONEN[c.tone] || TONEN.werkgever;
            return (
              <div key={i} className="hn-card relative flex flex-col overflow-hidden rounded-[28px] px-6 pb-6 pt-8 md:rounded-[36px] md:px-9 md:pb-9 md:pt-10" style={{ background: t.bg }}>
                <span aria-hidden className="absolute right-[-70px] top-[-70px] h-[200px] w-[200px] rounded-full md:h-[220px] md:w-[220px]" style={{ background: t.circ }} />
                <Go href={c.href} className="relative flex items-center gap-2.5 text-[14px] font-bold" style={{ color: t.dot }}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.dot }} />{c.label}
                </Go>
                <span className="relative mb-6 mt-[18px] text-[28px] font-extrabold leading-[1.04] tracking-[-1px] md:mb-7 md:mt-[22px] md:min-h-[94px] md:text-[26px] lg:text-[30px] lg:tracking-[-1.1px]" style={{ color: INDIGO }}>
                  {String(c.title).split("\n").map((x: string, k: number) => <span key={k} className="block">{x}</span>)}
                </span>
                <div className="relative flex flex-col border-b-[1.5px]" style={{ borderColor: t.circ }}>
                  {((c.links as any[]) || []).map((l, k) => (
                    <Go key={k} href={l.href} className="hn-row flex items-center justify-between border-t-[1.5px] py-4 text-[16px] font-bold md:py-[18px] md:text-[17px]" style={{ borderColor: t.circ, color: INDIGO }}>
                      <span>{l.label}</span><span style={{ color: t.dot }}><Pijl /></span>
                    </Go>
                  ))}
                </div>
                {c.button?.label && (
                  <Go href={c.button.href} className="hn-btn mt-4 flex h-[52px] items-center gap-2.5 self-start rounded-full px-[22px] text-[15px] font-bold text-white md:mt-6 md:h-[54px] md:px-6" style={{ background: t.dot, color: "#ffffff" }}>
                    {c.button.label}<Pijl size={15} />
                  </Go>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- 4. Contact ---------- */

const ROUTE_ICON: Record<string, any> = { phone: LuPhone, mail: LuMail, pin: LuMapPin, clock: LuClock };

export function HomeContact({ d }: BlockProps) {
  const routes = ((d.routes as any[]) || []).filter((r) => r?.value);
  return (
    <section id="contact" className={`hn hn-type ${outfit.variable}`} style={{ background: d.bg || IVOOR, paddingBottom: d.bg ? "clamp(8px, 6vw, 96px)" : 8 }}>
      <div className={`relative ${d.bg ? "mx-[6px] md:mx-10 xl:mx-auto xl:max-w-[1200px]" : "mx-[6px] md:mx-2"} flex flex-col gap-[18px] overflow-hidden rounded-[32px] px-5 pb-4 pt-9 text-white md:grid md:min-h-[480px] md:grid-cols-12 md:items-center md:gap-x-6 md:rounded-[40px] md:px-10 md:py-16 lg:px-[72px]`}
        style={{ background: INDIGO, marginTop: d.bg ? "clamp(64px, 7vw, 96px)" : "clamp(80px, 10vw, 144px)" }}>
        <span aria-hidden className="absolute right-[-90px] top-[-90px] h-[300px] w-[300px] rounded-full md:left-[-120px] md:right-auto md:top-[-140px] md:h-[620px] md:w-[620px]" style={{ background: "#3B378F" }} />
        {d.image && (
          <span className="relative block h-[150px] w-[150px] overflow-hidden rounded-full border-[6px] md:col-span-3 md:h-[240px] md:w-[240px] md:border-8 lg:h-[300px] lg:w-[300px]" style={{ borderColor: MAGENTA, background: "#E9E3F9" }}>
            <img src={d.image} alt={d.alt || ""} loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: d.focus || "52% 22%" }} />
          </span>
        )}
        <div className="relative mt-1.5 flex flex-col gap-3 md:col-span-4 md:col-start-5 md:mt-0 md:gap-5">
          <Label kleur="#B4ADF2">{d.eyebrow}</Label>
          <h2 className="text-[34px] font-extrabold leading-[1.02] tracking-[-1.4px] md:text-[40px] lg:text-[46px] lg:tracking-[-1.8px]" style={{ color: "#ffffff" }}>
            {String(d.heading).split("\n").map((x: string, k: number) => <span key={k} className="block">{x}</span>)}
          </h2>
          {d.text && <p className="text-[16px] leading-[1.6] md:text-[17px]" style={{ color: "#D6D2F7" }}>{d.text}</p>}
        </div>
        <div className="relative flex flex-col border-b-[1.5px] md:col-span-4 md:col-start-9" style={{ borderColor: "#423E97" }}>
          {routes.map((r, i) => {
            const Ic = ROUTE_ICON[r.icon] || LuPhone;
            return (
              <Go key={i} href={r.href} className="hn-row hn-crow flex items-center gap-[18px] border-t-[1.5px] py-4 text-white md:py-[22px]" style={{ borderColor: "#423E97", color: "#ffffff" }}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full md:h-[52px] md:w-[52px]" style={{ background: "#3A3690" }}>
                  <Ic className="text-[18px] md:text-[20px]" aria-hidden />
                </span>
                <span className="flex grow flex-col gap-0.5">
                  <span className="text-[13px] font-semibold" style={{ color: "#B4ADF2" }}>{r.label}</span>
                  <span className="text-[17px] font-extrabold tracking-[-0.3px] md:whitespace-nowrap md:text-[18px] xl:text-[20px]">{r.value}</span>
                </span>
                <span style={{ color: "#B4ADF2" }}><Pijl /></span>
              </Go>
            );
          })}
        </div>
      </div>
    </section>
  );
}
