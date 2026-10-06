import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";

/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */

/*
 * De werknemerspagina (ontwerp "D-Werknemers"): splitscreen met de werknemer
 * groot rechts, daarna wat je nu doet, je verzuimperiode, rechten en plichten,
 * privacy, je casemanager, coaching, vragen en contact. Eigen letter (Plus
 * Jakarta Sans) en eigen kleuren; hover en uitklappen staan in globals.css
 * onder `.wn`.
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
const LAV = "#F3F1FA";
const LABEL = "#A8245A";

/** Vier stapkleuren, op volgorde: indigo, lila, oranje, magenta. */
const STAP = [
  { bg: INDIGO, fg: "#ffffff" },
  { bg: LILA, fg: "#ffffff" },
  { bg: ORANJE, fg: "#3D2206" },
  { bg: MAGENTA, fg: "#ffffff" },
];

type BlockProps = { d: any; asH1?: boolean };

const WRAP = "mx-auto w-full max-w-[1440px] px-5 md:px-10 lg:px-14 xl:px-20";
const H2 = "text-[34px] font-extrabold leading-[1.02] tracking-[-1.3px] md:text-[44px] lg:text-[48px] lg:leading-none lg:tracking-[-2px] xl:text-[60px] xl:tracking-[-2.4px]";
const SEC = `wn ${jakarta.className}`;

function list<T = any>(x: unknown, key = "title"): T[] {
  return ((x as any[]) || []).filter((i) => i && (typeof i === "string" || i[key]));
}

function isExternal(href?: string) {
  return !!href && (href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:"));
}

function Go({ href, className, style, children, ...rest }: {
  href: string; className?: string; style?: React.CSSProperties; children: React.ReactNode; [k: string]: any;
}) {
  if (isExternal(href) || href.startsWith("#")) {
    const nieuw = href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {};
    return <a href={href} className={className} style={style} {...nieuw} {...rest}>{children}</a>;
  }
  return <Link href={href} className={className} style={style} {...rest}>{children}</Link>;
}

function Pijl({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="wn-pijl">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Tel({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}

function Label({ children, kleur = LABEL, className = "" }: { children: React.ReactNode; kleur?: string; className?: string }) {
  return (
    <span className={`text-[13px] font-bold uppercase tracking-[1.2px] lg:text-[14px] ${className}`} style={{ color: kleur }}>
      {children}
    </span>
  );
}

/** Kop met regelafbreking (\n) die pas vanaf desktop een nieuwe regel wordt. */
function Regels({ text, altijd, md }: { text?: string; altijd?: boolean; md?: boolean }) {
  const r = String(text || "").split("\n");
  const cls = altijd ? "block" : md ? "md:block" : "lg:block";
  return (
    <>
      {r.map((t, k) => (
        <span key={k} className={cls}>{t}{k < r.length - 1 ? " " : ""}</span>
      ))}
    </>
  );
}

/** Tekst die op mobiel korter mag: `kort` onder 768px, anders `lang`. */
function Kort({ lang, kort }: { lang?: string; kort?: string }) {
  if (!kort || kort === lang) return <>{lang}</>;
  return (<><span className="md:hidden">{kort}</span><span className="hidden md:inline">{lang}</span></>);
}

/** Kop + tekst naast elkaar op desktop (rechten, privacy). */
function Kopregel({ d, max = 470 }: { d: any; max?: number }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-20">
      <div className="flex flex-col gap-3 lg:gap-4">
        <Label>{d.eyebrow}</Label>
        <h2 className={H2} style={{ color: INDIGO }}><Regels text={d.heading} altijd /></h2>
      </div>
      {d.text && (
        <p className="text-[15px] leading-[1.6] lg:mb-1.5 lg:text-[18px]" style={{ color: TEKST2, maxWidth: max }}>
          <Kort lang={d.text} kort={d.textShort} />
        </p>
      )}
    </div>
  );
}

/* ---------- 1. Splitscreen: werkgever smal, werknemer groot ---------- */

export function WnSplit({ d, asH1 }: BlockProps) {
  const H = asH1 ? "h1" : "h2";
  const wg = d.werkgever || {};
  const b1 = d.button || {};
  const b2 = d.button2 || {};
  return (
    <section aria-label="Kies wie je bent" className={SEC} style={{ background: "#ffffff" }}>
      <div className="wn-split flex flex-col gap-[6px] px-[6px] md:h-[clamp(540px,calc(100svh-184px),768px)] md:flex-row-reverse md:gap-2 md:px-2 md:pb-2 lg:h-[clamp(580px,calc(100svh-196px),768px)]">
        {/* Werknemer: groot, met de h1 */}
        <div className="wn-tile wn-wn relative h-[528px] overflow-hidden rounded-[28px] md:h-auto md:rounded-[36px]" style={{ background: "#F5D9E4" }}>
          <img src={d.image} alt={d.alt || ""} fetchPriority="high" loading="eager" decoding="sync"
            className="wn-foto wn-foto-f absolute left-0 top-0 h-[270px] w-full object-cover md:h-full"
            style={{ ["--f-m" as any]: d.focusMobile || d.focus || "46% 18%", ["--f-d" as any]: d.focus || "28% 20%" }} />
          <div className="wn-orb absolute flex flex-col text-white
              left-[-100px] top-[184px] h-[580px] w-[580px] gap-3 rounded-full pl-[120px] pr-[122px] pt-16
              md:left-auto md:right-[-70px] md:top-auto md:bottom-[-100px] md:h-[520px] md:w-[520px] md:gap-3.5 md:pl-[80px] md:pr-[84px] md:pt-[72px]
              lg:right-[-80px] lg:bottom-[-150px] lg:h-[620px] lg:w-[620px] lg:gap-4 lg:pl-[108px] lg:pr-[104px] lg:pt-[98px]
              xl:bottom-[-170px] xl:h-[720px] xl:w-[720px] xl:gap-[18px] xl:pl-[128px] xl:pr-[120px] xl:pt-[116px]"
            style={{ background: MAGENTA, transformOrigin: "60% 40%" }}>
            <span className="text-[12px] font-bold uppercase tracking-[1.2px] md:text-[13px]" style={{ color: "#FFD0E0" }}>{d.eyebrow}</span>
            <H className="text-[33px] font-extrabold leading-[1.02] tracking-[-1.2px] md:text-[32px] lg:text-[40px] lg:leading-none lg:tracking-[-1.5px] xl:text-[46px] xl:tracking-[-1.8px]" style={{ color: "#ffffff" }}>
              <Regels text={d.heading} md />
            </H>
            {d.text && (
              <p className="text-[15px] leading-[1.55] md:max-w-[400px] md:text-[15px] lg:text-[16px] xl:text-[17px]" style={{ color: "#FFE3EC" }}>
                <Kort lang={d.text} kort={d.textShort} />
              </p>
            )}
            <div className="mt-1.5 hidden flex-wrap gap-2 md:flex lg:gap-2.5">
              {b1.label && (
                <Go href={b1.href} className="wn-btn flex h-12 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-extrabold lg:h-[52px] lg:gap-2.5 lg:px-5 lg:text-[15px] xl:h-14 xl:px-6 xl:text-[16px]" style={{ color: MAGENTA }}>
                  <Tel />{b1.label}
                </Go>
              )}
              {b2.label && (
                <Go href={b2.href} className="wn-btn flex h-12 items-center rounded-full px-4 text-[14px] font-bold text-white lg:h-[52px] lg:px-5 lg:text-[15px] xl:h-14 xl:px-6 xl:text-[16px]" style={{ background: INDIGO, color: "#ffffff" }}>
                  {b2.label}
                </Go>
              )}
            </div>
          </div>
          <div className="absolute inset-x-[14px] bottom-[14px] grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-2 md:hidden">
            {b1.label && (
              <Go href={b1.href} className="flex h-[52px] items-center justify-center gap-2 rounded-full bg-white text-[15px] font-extrabold" style={{ color: MAGENTA }}>
                <Tel size={16} />{b1.labelShort || b1.label}
              </Go>
            )}
            {b2.label && (
              <Go href={b2.href} className="flex h-[52px] items-center justify-center rounded-full text-[15px] font-bold text-white" style={{ background: INDIGO, color: "#ffffff" }}>
                {b2.labelShort || b2.label}
              </Go>
            )}
          </div>
        </div>

        {/* Werkgever: smal, de hele tegel is een link */}
        {wg.href && (
          <Link href={wg.href} aria-label={wg.aria || wg.title}
            className="wn-tile wn-wg relative h-[150px] overflow-hidden rounded-[28px] md:h-auto md:rounded-[36px]" style={{ background: "#D9D3F0" }}>
            <img src={wg.image} alt={wg.alt || ""} loading="eager"
              className="wn-foto wn-foto-f absolute inset-0 h-full w-full object-cover"
              style={{ ["--f-m" as any]: wg.focusMobile || wg.focus || "40% 22%", ["--f-d" as any]: wg.focus || "52% 30%" }} />
            <span className="wn-orb absolute flex flex-col justify-center text-white
                right-[-40px] top-[-60px] h-[250px] w-[250px] gap-2 rounded-full pl-11 pt-10
                md:right-auto md:top-auto md:left-[-60px] md:bottom-[-84px] md:h-[280px] md:w-[280px] md:gap-2.5 md:pl-[92px] md:pt-0 md:pb-[60px]
                xl:left-[-70px] xl:bottom-[-96px] xl:h-[344px] xl:w-[344px] xl:gap-3 xl:pl-[118px] xl:pb-[72px]"
              style={{ background: INDIGO, transformOrigin: "30% 70%" }}>
              <span className="text-[11px] font-bold uppercase tracking-[1.1px] md:text-[12px] xl:text-[13px] xl:tracking-[1.2px]" style={{ color: "#B4ADF2" }}>{wg.eyebrow}</span>
              <span className="flex items-center gap-2.5 md:flex-col md:items-start md:gap-3">
                <span className="text-[21px] font-extrabold leading-none tracking-[-0.6px] md:text-[26px] xl:text-[32px] xl:tracking-[-1.1px]">
                  <Regels text={String(wg.title || "").replace(/^Ik ben /, "Ik ben\n")} altijd />
                </span>
                <span className="flex items-center gap-2.5 text-[15px] font-bold md:mt-1">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white md:h-11 md:w-11 xl:h-12 xl:w-12" style={{ color: INDIGO }}>
                    <Pijl size={17} />
                  </span>
                  <span className="hidden md:inline">{wg.button}</span>
                </span>
              </span>
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}

/* ---------- 2. Op deze pagina ---------- */

export function WnInhoud({ d }: BlockProps) {
  const links = list(d.links, "href");
  return (
    <nav aria-label={d.label || "Op deze pagina"} className={`${SEC} hidden md:block`} style={{ background: "#ffffff" }}>
      <div className={`${WRAP} flex flex-wrap items-center gap-2.5 pt-8 text-[15px] font-bold`}>
        <span className="mr-2.5 text-[13px] font-bold uppercase tracking-[1.2px]" style={{ color: "#6D6A92" }}>{d.label}</span>
        {links.map((l: any, i) => (
          <a key={i} href={l.href} className="wn-chip rounded-full border-[1.5px] px-[18px] py-[11px]" style={{ borderColor: LIJN, color: INDIGO }}>
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

/* ---------- 3. Wat moet je nu doen ---------- */

export function WnWatNu({ d }: BlockProps) {
  const steps = list(d.steps);
  return (
    <section id={d.anchor || "wat-nu"} className={SEC} style={{ background: "#ffffff" }}>
      <div className={`${WRAP} flex flex-col gap-4 pt-[52px] lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-6 lg:gap-y-0 lg:pt-20`}>
        {/* Beeld desktop */}
        <div className="relative hidden aspect-[519/520] lg:col-span-5 lg:block">
          <span className="absolute left-0 top-[3.85%] aspect-square w-[88.6%] overflow-hidden rounded-full border-[8px] xl:border-[10px]"
            style={{ background: "#E9E3F9", borderColor: LILA }}>
            <img src={d.image} alt={d.alt || ""} loading="lazy" className="absolute left-[-63%] top-[-1.7%] h-auto w-[187%] max-w-none" />
          </span>
          {d.badgeText && (
            <span className="absolute left-[61.7%] top-[63.5%] flex aspect-square w-[35.5%] flex-col items-center justify-center gap-1 rounded-full text-center text-white" style={{ background: INDIGO }}>
              <span className="text-[12px] font-semibold xl:text-[13px]" style={{ color: "#D6D2F7" }}>{d.badgeLabel}</span>
              <span className="text-[20px] font-extrabold leading-[1.05] tracking-[-0.8px] xl:text-[26px]"><Regels text={d.badgeText} altijd /></span>
            </span>
          )}
          <span aria-hidden className="absolute left-[77.8%] top-[2.3%] aspect-square w-[10%] rounded-full" style={{ background: ORANJE }} />
          <span aria-hidden className="absolute left-[4.6%] top-[84.6%] aspect-square w-[5%] rounded-full" style={{ background: MAGENTA }} />
        </div>

        <div className="flex flex-col gap-4 lg:col-span-6 lg:col-start-7 lg:gap-5">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-3 lg:gap-5">
              <Label>{d.eyebrow}</Label>
              <h2 className="text-[34px] font-extrabold leading-[1.02] tracking-[-1.3px] md:text-[44px] lg:text-[50px] lg:leading-none lg:tracking-[-2px] xl:text-[56px] xl:tracking-[-2.2px]" style={{ color: INDIGO }}><Regels text={d.heading} /></h2>
            </div>
            <span className="relative h-[112px] w-[112px] shrink-0 overflow-hidden rounded-full border-[5px] lg:hidden" style={{ background: "#E9E3F9", borderColor: LILA }}>
              <img src={d.image} alt="" aria-hidden="true" loading="lazy" className="absolute left-[-104px] top-[-2px] h-auto w-[260px] max-w-none" />
            </span>
          </div>
          {d.text && <p className="max-w-[540px] text-[16px] leading-[1.6] lg:text-[18px]" style={{ color: TEKST2 }}>{d.text}</p>}
          <ol className="flex flex-col border-t-[1.5px] lg:mt-1" style={{ borderColor: LIJN }}>
            {steps.map((s: any, i) => {
              const k = STAP[i % 4];
              return (
                <li key={i} className="flex gap-3.5 border-b-[1.5px] py-4 lg:gap-[22px]" style={{ borderColor: LIJN }}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] font-extrabold lg:h-[52px] lg:w-[52px] lg:text-[18px]" style={{ background: k.bg, color: k.fg }}>{i + 1}</span>
                  <span className="flex flex-col gap-[3px] lg:gap-1.5">
                    <span className="text-[17px] font-extrabold tracking-[-0.3px] lg:text-[21px] lg:tracking-[-0.4px]" style={{ color: INDIGO }}>{s.title}</span>
                    <span className="text-[14px] leading-[1.5] lg:text-[16px] lg:leading-[1.55]" style={{ color: TEKST2 }}><Kort lang={s.text} kort={s.textShort} /></span>
                    {s.action && (
                      <span className="mt-0.5 flex gap-1.5 text-[13px] font-bold lg:items-center lg:gap-2 lg:text-[15px]" style={{ color: LABEL }}>
                        <span aria-hidden className="font-extrabold">→</span>{s.action}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------- 4. Je verzuimperiode (tijdlijn) ---------- */

export function WnTijdlijn({ d }: BlockProps) {
  const steps = list(d.steps);
  const chips = list(d.chips, "text");
  const rijen: any[][] = [];
  for (let i = 0; i < steps.length; i += 4) rijen.push(steps.slice(i, i + 4));
  const youLabel = d.youLabel || "Wat jij doet";
  return (
    <section id={d.anchor || "tijdlijn"} className={SEC} style={{ background: "#ffffff" }}>
      <div className="mx-[6px] mt-11 rounded-[32px] px-[18px] pb-[30px] pt-10 md:mx-2 md:px-8 lg:mt-[90px] lg:rounded-[40px] lg:px-14 lg:pb-14 lg:pt-20 xl:px-[72px]" style={{ background: LAV }}>
        <div className="mx-auto flex max-w-[1296px] flex-col gap-6 lg:gap-11">
          <div className="flex flex-col gap-3 px-1 lg:flex-row lg:items-end lg:justify-between lg:gap-20 lg:px-0">
            <div className="flex flex-col gap-3 lg:gap-4">
              <Label>{d.eyebrow}</Label>
              <h2 className={H2} style={{ color: INDIGO }}><Regels text={d.heading} /></h2>
            </div>
            <div className="flex max-w-[440px] flex-col gap-3 lg:gap-[18px] lg:pb-1.5">
              {d.text && <p className="text-[15px] leading-[1.6] lg:text-[18px]" style={{ color: TEKST2 }}>{d.text}</p>}
              {chips.length > 0 && (
                <ul className="flex flex-wrap gap-1.5 lg:gap-2">
                  {chips.map((c: any, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-full bg-white px-3 py-[7px] text-[13px] font-bold lg:gap-2.5 lg:px-4 lg:py-[9px] lg:text-[15px]" style={{ color: INDIGO }}>
                      <span className="h-2 w-2 rounded-full lg:h-2.5 lg:w-2.5" style={{ background: i % 2 ? ORANJE : MAGENTA }} />{c.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Mobiel en tablet: verticale lijst */}
          <ol className="relative flex flex-col rounded-[24px] bg-white px-4 pb-1.5 pt-[22px] lg:hidden">
            <span aria-hidden className="absolute bottom-[60px] left-[33px] top-10 w-0.5" style={{ background: LIJN }} />
            {steps.map((s: any, i) => {
              const k = STAP[i % 4];
              return (
                <li key={i} className="relative flex gap-3.5 pb-[18px]">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[14px] font-extrabold" style={{ background: k.bg, color: k.fg, boxShadow: "0 0 0 5px #ffffff" }}>{i + 1}</span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: LABEL }}>{s.when}</span>
                    <span className="text-[16px] font-extrabold leading-[1.25] tracking-[-0.2px]" style={{ color: INDIGO }}><Kort lang={s.title} kort={s.titleShort} /></span>
                    <span className="text-[14px] leading-[1.45]" style={{ color: TEKST2 }}><Kort lang={s.text} kort={s.textShort} /></span>
                    {s.you && (
                      <span className="mt-0.5 text-[13px] font-semibold leading-[1.45]" style={{ color: INDIGO }}>
                        <span className="md:hidden"><span className="font-extrabold" style={{ color: LABEL }}>Jij: </span>{s.youShort || s.you}</span>
                        <span className="hidden md:inline"><span className="font-extrabold" style={{ color: LABEL }}>{youLabel}: </span>{s.you}</span>
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>

          {/* Desktop: rijen van vier met een doorlopende lijn */}
          <div className="hidden flex-col gap-10 lg:flex">
            {rijen.map((rij, r) => {
              const laatste = r === rijen.length - 1;
              const n = rij.length;
              const right = laatste ? `calc((100% - 72px) / 4 * ${5 - n} + ${(4 - n) * 24}px - 28px)` : "0px";
              return (
                <ol key={r} start={r * 4 + 1} className="relative grid grid-cols-4 gap-6">
                  <span aria-hidden className="absolute top-[27px] h-0.5" style={{ left: r === 0 ? 28 : 0, right, background: "#D9D4F0" }} />
                  {rij.map((s: any, j) => {
                    const i = r * 4 + j;
                    const k = STAP[i % 4];
                    return (
                      <li key={j} className="relative flex flex-col gap-3">
                        <span className="mb-2.5 grid h-14 w-14 place-items-center rounded-full text-[18px] font-extrabold" style={{ background: k.bg, color: k.fg, boxShadow: `0 0 0 10px ${LAV}` }}>{i + 1}</span>
                        <span className="text-[13px] font-bold uppercase tracking-[1.2px]" style={{ color: LABEL }}>{s.when}</span>
                        <span className="text-[20px] font-extrabold leading-[1.15] tracking-[-0.5px] xl:text-[22px]" style={{ color: INDIGO }}>{s.title}</span>
                        <span className="text-[15px] leading-[1.55]" style={{ color: TEKST2 }}>{s.text}</span>
                        {s.you && (
                          <span className="mt-auto flex flex-col gap-1 rounded-[20px] bg-white px-[18px] py-4">
                            <span className="text-[12px] font-bold uppercase tracking-[1px]" style={{ color: LABEL }}>{youLabel}</span>
                            <span className="text-[15px] font-semibold leading-[1.5]" style={{ color: INDIGO }}>{s.you}</span>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              );
            })}
          </div>

          {d.note && (
            <p className="flex items-center gap-3 px-1 text-[13px] leading-[1.5] lg:-mt-6 lg:px-0 lg:text-[15px]" style={{ color: TEKST2 }}>
              <span aria-hidden className="hidden h-2 w-2 shrink-0 rounded-full lg:block" style={{ background: LILA }} />{d.note}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- 5. Rechten en plichten ---------- */

const RECHT_DOT = [MAGENTA, ORANJE, LILA, "#ffffff"];

export function WnRechten({ d }: BlockProps) {
  const rights = list(d.rights);
  const duties = list(d.duties);
  return (
    <section id={d.anchor || "rechten"} className={SEC} style={{ background: "#ffffff" }}>
      <div className={`${WRAP} flex flex-col gap-3 pt-11 lg:gap-10 lg:pt-[90px]`}>
        <div className="mb-1.5 lg:mb-0"><Kopregel d={d} /></div>
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
          {/* Je rechten */}
          <div className="relative -mx-3.5 flex flex-col overflow-hidden rounded-[26px] px-5 pb-2 pt-6 text-white md:mx-0 lg:gap-6 lg:rounded-[32px] lg:p-10 xl:p-11" style={{ background: INDIGO }}>
            <span aria-hidden className="absolute right-[-54px] top-[-54px] h-[150px] w-[150px] rounded-full lg:right-[-110px] lg:top-[-110px] lg:h-[300px] lg:w-[300px]" style={{ background: "#3A3690" }} />
            <span aria-hidden className="absolute right-8 top-[30px] h-5 w-5 rounded-full lg:right-[70px] lg:top-16 lg:h-10 lg:w-10" style={{ background: ORANJE }} />
            <h3 className="relative mb-2.5 text-[22px] font-extrabold tracking-[-0.6px] lg:mb-0 lg:text-[34px] lg:tracking-[-1.2px]" style={{ color: "#ffffff" }}>{d.rightsTitle}</h3>
            <ul className="relative flex flex-col lg:border-t-[1.5px]" style={{ borderColor: "#4A4598" }}>
              {rights.map((r: any, i) => (
                <li key={i} className={`flex gap-3 border-t-[1.5px] py-3 lg:gap-[18px] lg:border-t-0 lg:py-4 ${i < rights.length - 1 ? "lg:border-b-[1.5px]" : "lg:pb-0 lg:pt-[18px]"}`} style={{ borderColor: "#4A4598" }}>
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full lg:h-3.5 lg:w-3.5" style={{ background: RECHT_DOT[i % 4] }} />
                  <span className="flex flex-col gap-0.5 lg:gap-1">
                    <span className="text-[15px] font-extrabold leading-[1.35] lg:text-[19px]">{r.title}</span>
                    <span className="text-[13px] leading-[1.45] lg:text-[15px] lg:leading-[1.55]" style={{ color: "#D6D2F7" }}><Kort lang={r.text} kort={r.textShort} /></span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {/* Wat er van jou verwacht wordt */}
          <div className="relative -mx-3.5 flex flex-col gap-3 overflow-hidden rounded-[26px] px-5 pb-5 pt-6 md:mx-0 lg:gap-6 lg:rounded-[32px] lg:p-10 xl:p-11" style={{ background: "#FCE9F0" }}>
            <h3 className="mb-0.5 text-[22px] font-extrabold leading-[1.1] tracking-[-0.6px] lg:mb-0 lg:text-[34px] lg:tracking-[-1.2px]" style={{ color: INDIGO }}>{d.dutiesTitle}</h3>
            <ol className="flex flex-col gap-3 lg:gap-5">
              {duties.map((t: any, i) => (
                <li key={i} className="flex items-center gap-3 lg:items-start lg:gap-[18px]">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-extrabold text-white lg:h-10 lg:w-10 lg:text-[14px]" style={{ background: MAGENTA }}>{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex flex-col gap-1 lg:pt-[7px]">
                    <span className="text-[15px] font-extrabold leading-[1.35] lg:text-[19px]" style={{ color: INDIGO }}>{t.title}</span>
                    {t.text && <span className="hidden text-[15px] leading-[1.55] md:block" style={{ color: "#7A2A4C" }}>{t.text}</span>}
                  </span>
                </li>
              ))}
            </ol>
            {d.note && (
              <p className="mt-0.5 border-t-[1.5px] pt-3 text-[13px] leading-[1.5] lg:mt-auto lg:pt-5 lg:text-[14px] lg:leading-[1.55]" style={{ borderColor: "#F2C6D7", color: "#7A2A4C" }}>
                <Kort lang={d.note} kort={d.noteShort} />
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 6. Wie weet wat over jou (privacy) ---------- */

const PRIV_TONEN: Record<string, { bg: string; fg: string; label: string; text: string; pill: string; pillFg: string; circ: string; tekstM: string }> = {
  indigo: { bg: INDIGO, fg: "#ffffff", label: "#B4ADF2", text: "#D6D2F7", pill: LAV, pillFg: INDIGO, circ: "#3A3690", tekstM: "#D6D2F7" },
  oranje: { bg: "#FEF1E3", fg: INDIGO, label: "#8A4A0E", text: "#6B4A2A", pill: "#FEF1E3", pillFg: "#6B4A2A", circ: "#FCE3C6", tekstM: "#6B4A2A" },
  roze: { bg: "#FCE9F0", fg: INDIGO, label: LABEL, text: "#7A2A4C", pill: "#FCE9F0", pillFg: LABEL, circ: "#F8D6E3", tekstM: "#7A2A4C" },
};

export function WnPrivacy({ d }: BlockProps) {
  const cards = list(d.cards);
  const link = d.link || {};
  return (
    <section id={d.anchor || "privacy"} className={SEC} style={{ background: "#ffffff" }}>
      <div className={`${WRAP} flex flex-col gap-2.5 pt-11 lg:gap-10 lg:pt-[90px]`}>
        <div className="mb-2 lg:mb-0"><Kopregel d={d} max={420} /></div>

        {/* Mobiel en tablet: kaarten */}
        <ul className="flex flex-col gap-2.5 md:grid md:grid-cols-3 md:gap-3 lg:hidden">
          {cards.map((c: any, i) => {
            const t = PRIV_TONEN[c.tone] || PRIV_TONEN.indigo;
            return (
              <li key={i} className="relative -mx-3.5 flex min-h-[76px] flex-col gap-1 overflow-hidden rounded-[24px] pb-[18px] pl-[92px] pr-5 pt-5 md:mx-0 md:pl-5 md:pt-16" style={{ background: t.bg, color: t.fg }}>
                <span aria-hidden className="absolute left-[-36px] top-1/2 -mt-[58px] h-[116px] w-[116px] rounded-full md:left-[-30px] md:top-[-50px] md:mt-0" style={{ background: t.circ }} />
                <span className="relative text-[19px] font-extrabold tracking-[-0.4px]">{c.title}</span>
                <span className="relative text-[14px] leading-[1.5]" style={{ color: t.tekstM }}>
                  <span className="font-extrabold" style={{ color: t.label }}>Weet: </span><Kort lang={c.text} kort={c.textShort} />
                </span>
                {c.note && (
                  <span className="relative text-[14px] leading-[1.5]" style={{ color: c.tone === "indigo" ? "#ffffff" : t.tekstM }}>
                    <span className="font-extrabold" style={{ color: t.label }}>Let op: </span><Kort lang={c.note} kort={c.noteShort} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {/* Desktop: drie overlappende cirkels */}
        <ul className="hidden justify-center lg:flex">
          {cards.map((c: any, i) => {
            const t = PRIV_TONEN[c.tone] || PRIV_TONEN.indigo;
            return (
              <li key={i} className={`flex w-[300px] flex-col items-center gap-5 xl:w-[344px] ${i > 0 ? "-ml-6" : ""}`}>
                <div className="relative flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-full px-9 text-center xl:px-12"
                  style={{ background: t.bg, color: t.fg, zIndex: i + 1, boxShadow: "0 0 0 10px #ffffff" }}>
                  <span className="text-[12px] font-bold uppercase tracking-[1.2px] xl:text-[13px]" style={{ color: t.label }}>{c.label}</span>
                  <span className="text-[24px] font-extrabold leading-[1.05] tracking-[-0.9px] xl:text-[28px]">{c.title}</span>
                  <span className="text-[14px] leading-[1.55] xl:text-[15px]" style={{ color: t.text }}>{c.text}</span>
                </div>
                {c.note && (
                  <div className="flex w-[280px] items-start gap-3 xl:w-[320px]">
                    <span className="mt-px shrink-0 rounded-full px-2.5 py-[5px] text-[12px] font-extrabold uppercase tracking-[0.8px]" style={{ background: t.pill, color: t.pillFg }}>Let op</span>
                    <span className="text-[15px] leading-[1.55]" style={{ color: TEKST2 }}>{c.note}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {(d.footStrong || link.label) && (
          <div className="flex flex-col gap-2 pt-2 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:rounded-full lg:border-[1.5px] lg:py-3.5 lg:pl-8 lg:pr-3.5" style={{ borderColor: LIJN }}>
            <p className="text-[14px] leading-[1.55] lg:text-[16px] lg:leading-[1.5]" style={{ color: TEKST2 }}>
              <strong className="font-extrabold" style={{ color: INDIGO }}>{d.footStrong}</strong>{" "}
              <Kort lang={d.footText} kort={d.footTextShort} />
            </p>
            {link.label && link.href && (
              <Go href={link.href} className="wn-row wn-privlink flex shrink-0 items-center gap-2.5 self-start text-[15px] font-bold lg:h-[52px] lg:gap-3 lg:self-auto lg:rounded-full lg:pl-5 lg:pr-2" style={{ color: INDIGO }}>
                {link.label}
                <span className="wn-privpijl grid h-10 w-10 place-items-center rounded-full border-[1.5px] lg:h-[38px] lg:w-[38px] lg:border-0" style={{ borderColor: LIJN }}><Pijl size={15} /></span>
              </Go>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- 7. Je casemanager ---------- */

const CM_DOT = [MAGENTA, ORANJE, LILA, INDIGO];

export function WnCasemanager({ d }: BlockProps) {
  const items = list(d.items);
  return (
    <section id={d.anchor || "casemanager"} className={SEC} style={{ background: "#ffffff" }}>
      <div className={`${WRAP} flex flex-col gap-4 pt-11 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-6 lg:gap-y-0 lg:pt-[90px]`}>
        <div className="flex flex-col gap-4 lg:col-span-6 lg:gap-6">
          <div className="flex flex-col gap-3 lg:gap-6">
            <Label>{d.eyebrow}</Label>
            <h2 className={H2} style={{ color: INDIGO }}><Regels text={d.heading} altijd /></h2>
          </div>
          {d.text && <p className="max-w-[540px] text-[15px] leading-[1.6] lg:text-[18px]" style={{ color: TEKST2 }}>{d.text}</p>}
          <ul className="grid grid-cols-2 gap-2 lg:mt-2 lg:gap-x-8 lg:gap-y-6">
            {items.map((it: any, i) => (
              <li key={i} className="flex flex-col gap-2.5 rounded-[20px] bg-[#F3F1FA] p-4 lg:gap-2 lg:rounded-none lg:bg-transparent lg:p-0">
                <span className="h-3 w-3 rounded-full lg:mb-1.5 lg:h-5 lg:w-5" style={{ background: CM_DOT[i % 4] }} />
                <span className="text-[15px] font-extrabold leading-[1.25] lg:text-[20px] lg:tracking-[-0.4px]" style={{ color: INDIGO }}><Kort lang={it.title} kort={it.titleShort} /></span>
                {it.text && <span className="hidden text-[15px] leading-[1.55] lg:block" style={{ color: TEKST2 }}>{it.text}</span>}
              </li>
            ))}
          </ul>
          {d.note && (
            <p className="flex items-baseline gap-2.5 text-[13px] leading-[1.55] lg:mt-1 lg:gap-3 lg:border-t-[1.5px] lg:pt-5 lg:text-[15px]" style={{ color: TEKST2, borderColor: LIJN }}>
              <span aria-hidden className="h-2 w-2 shrink-0 -translate-y-px rounded-full" style={{ background: MAGENTA }} />
              <Kort lang={d.note} kort={d.noteShort} />
            </p>
          )}
        </div>

        {/* Beeld: mobiel boven de tekst, desktop rechts */}
        <div className="relative order-first h-[230px] w-full max-w-[400px] lg:order-none lg:col-span-5 lg:col-start-8 lg:h-auto lg:max-w-none lg:aspect-[519/560]">
          <span className="absolute right-0 top-0 aspect-square w-[226px] overflow-hidden rounded-full border-[6px] lg:w-[86.7%] lg:border-[8px] xl:border-[10px]" style={{ background: "#DCD6F2", borderColor: MAGENTA }}>
            <img src={d.image} alt={d.alt || ""} loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: d.focus || "50% 40%" }} />
          </span>
          {(d.badgeTitle || d.badgeLabel) && (
            <span className="absolute left-0 top-[70px] flex aspect-square w-[150px] flex-col items-center justify-center gap-[3px] rounded-full px-4 text-center text-white lg:left-[1.9%] lg:top-[56.8%] lg:w-[46.2%] lg:gap-1.5 lg:px-[30px]"
              style={{ background: INDIGO, boxShadow: "0 0 0 7px #ffffff" }}>
              <span className="text-[10px] font-bold uppercase tracking-[0.8px] lg:text-[11px] xl:text-[12px] xl:tracking-[1px]" style={{ color: "#B4ADF2" }}>{d.badgeLabel}</span>
              <span className="text-[15px] font-extrabold leading-[1.15] lg:text-[19px] lg:leading-[1.1] xl:text-[22px] xl:tracking-[-0.5px]">{d.badgeTitle}</span>
              {d.badgeText && <span className="text-[11px] leading-[1.35] lg:text-[13px] lg:leading-[1.45] xl:text-[14px]" style={{ color: "#D6D2F7" }}>{d.badgeText}</span>}
            </span>
          )}
          <span aria-hidden className="absolute right-[6.9%] top-[78.6%] hidden aspect-square w-[17.7%] rounded-full lg:block" style={{ background: ORANJE }} />
          <span aria-hidden className="absolute left-[26px] top-2 h-9 w-9 rounded-full lg:hidden" style={{ background: ORANJE }} />
          <span aria-hidden className="absolute left-[13.5%] top-[16%] hidden aspect-square w-[5.8%] rounded-full lg:block" style={{ background: LILA }} />
        </div>
      </div>
    </section>
  );
}

/* ---------- 8. Vastgelopen, maar niet ziek? (coaching) ---------- */

const COACH_DOT = [ORANJE, MAGENTA, INDIGO];

export function WnCoaching({ d }: BlockProps) {
  const topics = list(d.topics);
  const steps = list(d.steps, "text");
  const btn = d.button || {};
  return (
    <section id={d.anchor || "coaching"} className={SEC} style={{ background: "#ffffff" }}>
      <div className="relative mx-[6px] mt-11 overflow-hidden rounded-[32px] px-[18px] pb-5 pt-9 md:mx-2 md:px-8 lg:mt-[90px] lg:rounded-[40px] lg:px-14 lg:pb-16 lg:pt-[72px] xl:px-[72px]" style={{ background: "#FEF1E3" }}>
        <span aria-hidden className="absolute right-[-80px] top-[-80px] h-[220px] w-[220px] rounded-full lg:right-[-130px] lg:top-[-170px] lg:h-[440px] lg:w-[440px]" style={{ background: "#FCE3C6" }} />
        <div className="relative mx-auto flex max-w-[1296px] flex-col gap-3.5 lg:gap-10">
          <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-6">
            {/* Beeld desktop */}
            <div className="relative hidden aspect-[519/420] lg:col-span-5 lg:block">
              <span className="absolute left-0 top-0 aspect-square w-[81%] overflow-hidden rounded-full border-[8px] xl:border-[10px]" style={{ background: "#F6D9B8", borderColor: ORANJE }}>
                <img src={d.image} alt={d.alt || ""} loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: d.focus || "50% 30%" }} />
              </span>
              <span aria-hidden className="absolute left-[65.5%] top-[71.4%] aspect-square w-[19.3%] rounded-full" style={{ background: INDIGO, boxShadow: "0 0 0 8px #FEF1E3" }} />
              <span aria-hidden className="absolute left-[71.7%] top-[6.7%] aspect-square w-[5.8%] rounded-full" style={{ background: MAGENTA }} />
            </div>
            <div className="flex flex-col gap-3.5 lg:col-span-6 lg:col-start-7 lg:gap-5">
              <div className="flex items-end justify-between gap-2.5 px-1 lg:px-0">
                <div className="flex flex-col gap-3 lg:gap-5">
                  <Label><Kort lang={d.eyebrow} kort={d.eyebrowShort} /></Label>
                  <h2 className={H2} style={{ color: INDIGO }}><Regels text={d.heading} /></h2>
                </div>
                <span className="relative h-[124px] w-[124px] shrink-0 overflow-hidden rounded-full border-[5px] lg:hidden" style={{ background: "#F6D9B8", borderColor: ORANJE }}>
                  <img src={d.image} alt="" aria-hidden="true" loading="lazy" className="absolute left-[-48px] top-[-4px] h-auto w-[240px] max-w-none" />
                </span>
              </div>
              {d.text && <p className="px-1 text-[15px] leading-[1.6] lg:px-0 lg:text-[18px]" style={{ color: "#6B4A2A" }}><Kort lang={d.text} kort={d.textShort} /></p>}
              <ul className="flex flex-wrap gap-1.5 px-1 lg:mt-1.5 lg:flex-col lg:flex-nowrap lg:gap-2 lg:px-0">
                {topics.map((t: any, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[13px] font-bold lg:items-baseline lg:gap-4 lg:rounded-[20px] lg:px-[22px] lg:py-3.5 lg:text-[17px] lg:font-extrabold" style={{ color: INDIGO }}>
                    <span className="h-2 w-2 shrink-0 rounded-full lg:h-3 lg:w-3" style={{ background: COACH_DOT[i % 3] }} />
                    <span className="shrink-0">{t.title}</span>
                    {t.text && <span className="hidden text-[15px] font-normal xl:inline" style={{ color: TEKST2 }}>{t.text}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Zo begin je */}
          <div className="mt-1 flex flex-col gap-3 rounded-[24px] bg-white px-[18px] pb-[18px] pt-5 lg:mt-0 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-6 lg:rounded-[32px] lg:px-10 lg:py-[30px]">
            <div className="flex flex-col gap-2 lg:col-span-12 lg:mb-6 xl:col-span-3 xl:mb-0">
              <span className="text-[17px] font-extrabold lg:text-[26px] lg:tracking-[-0.6px]" style={{ color: INDIGO }}>{d.startTitle}</span>
              {d.startText && <span className="hidden text-[15px] leading-[1.5] lg:block" style={{ color: TEKST2 }}>{d.startText}</span>}
            </div>
            <ol className="relative flex flex-col gap-3 lg:col-span-9 lg:grid lg:grid-cols-3 lg:gap-6 xl:col-span-7 xl:col-start-4">
              {steps.length > 1 && (
                <span aria-hidden className="absolute left-[22px] top-[21px] hidden h-0.5 lg:block"
                  style={{ right: `calc((100% - ${(steps.length - 1) * 24}px) / ${steps.length} - 22px)`, background: "#F6E1CB" }} />
              )}
              {steps.map((s: any, i) => (
                <li key={i} className="relative flex items-center gap-3 lg:flex-col lg:items-start">
                  <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full text-[13px] font-extrabold lg:h-11 lg:w-11 lg:text-[16px]" style={{ background: ORANJE, color: "#3D2206", boxShadow: "0 0 0 8px #ffffff" }}>{i + 1}</span>
                  <span className="text-[14px] leading-[1.45] lg:text-[15px] lg:leading-[1.5]" style={{ color: INDIGO }}><Kort lang={s.text} kort={s.textShort} /></span>
                </li>
              ))}
            </ol>
            {btn.label && btn.href && (
              <Go href={btn.href} className="wn-btn mt-1 flex h-[50px] items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-[22px] text-[15px] font-bold text-white lg:col-span-3 lg:col-start-10 lg:mt-0 lg:h-14 lg:justify-self-end xl:col-span-2 xl:col-start-11" style={{ background: INDIGO, color: "#ffffff" }}>
                <Tel size={17} />
                <span className="lg:hidden">{btn.labelShort || btn.label}</span>
                <span className="hidden lg:inline">{btn.label}</span>
              </Go>
            )}
          </div>

          {d.note && (
            <p className="flex items-center gap-3 px-1 text-[13px] leading-[1.5] lg:-mt-6 lg:px-0 lg:text-[15px]" style={{ color: "#6B4A2A" }}>
              <span aria-hidden className="hidden h-2 w-2 shrink-0 rounded-full lg:block" style={{ background: ORANJE }} />
              <Kort lang={d.note} kort={d.noteShort} />
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- 9. Veelgestelde vragen ---------- */

export function WnVragen({ d }: BlockProps) {
  const items = list(d.items, "question").filter((i: any) => i.answer);
  const naam = `wn-faq-${d.anchor || "vragen"}`;
  return (
    <section id={d.anchor || "vragen"} className={SEC} style={{ background: "#ffffff" }}>
      {/* Oude links wijzen naar #veelgestelde-vragen. */}
      <span id="veelgestelde-vragen" aria-hidden className="block" />
      <div className={`${WRAP} flex flex-col gap-3.5 pt-11 lg:grid lg:grid-cols-12 lg:gap-x-6 lg:pt-[90px]`}>
        <div className="flex flex-col gap-3 lg:col-span-4 lg:gap-6">
          <span className="flex items-center justify-between gap-3">
            <Label>{d.eyebrow}</Label>
            <span className="flex items-center lg:hidden">
              <span aria-hidden className="relative z-[1] -mr-1.5 h-[22px] w-[22px] rounded-full" style={{ background: MAGENTA, boxShadow: "0 0 0 4px #ffffff" }} />
              <span className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border-4" style={{ background: "#E9E3F9", borderColor: ORANJE }}>
                <img src={d.image} alt="" aria-hidden="true" loading="lazy" className="absolute left-[-16px] top-[-4px] h-auto w-[150px] max-w-none" />
              </span>
            </span>
          </span>
          <h2 className="text-[34px] font-extrabold leading-[1.02] tracking-[-1.3px] md:text-[44px] lg:text-[40px] lg:leading-none lg:tracking-[-1.6px] xl:text-[52px] xl:tracking-[-2px]" style={{ color: INDIGO }}>{d.heading}</h2>
          {d.text && <p className="text-[15px] leading-[1.6] lg:text-[17px]" style={{ color: TEKST2 }}><Kort lang={d.text} kort={d.textShort} /></p>}
          {d.image && (
            <div className="relative mt-2 hidden aspect-[342/302] w-full max-w-[342px] lg:block">
              <span className="absolute left-0 top-0 aspect-square w-[87.7%] overflow-hidden rounded-full border-8" style={{ background: "#E9E3F9", borderColor: ORANJE }}>
                <img src={d.image} alt={d.alt || ""} loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: d.focus || "12% 35%" }} />
              </span>
              <span aria-hidden className="absolute left-[71.9%] top-[68.2%] aspect-square w-[28.1%] rounded-full" style={{ background: MAGENTA, boxShadow: "0 0 0 8px #ffffff" }} />
            </div>
          )}
        </div>
        <div className="mt-1.5 flex flex-col border-t-[1.5px] lg:col-span-7 lg:col-start-6 lg:mt-0 lg:self-start" style={{ borderColor: LIJN }}>
          {items.map((it: any, i) => (
            <details key={i} name={naam} open={i === 0} className="wn-faq border-b-[1.5px] py-4 lg:py-5" style={{ borderColor: LIJN }}>
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-extrabold leading-[1.3] lg:gap-6 lg:text-[21px] lg:tracking-[-0.4px]" style={{ color: INDIGO }}>
                {it.question}
                <span className="wn-faq-ico grid h-10 w-10 shrink-0 place-items-center rounded-full border-[1.5px] lg:h-11 lg:w-11" style={{ borderColor: LIJN }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                    <path className="wn-faq-v" d="M12 5v14" /><path d="M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p className="mt-2 text-[15px] leading-[1.6] lg:mt-3.5 lg:pr-[68px] lg:text-[17px]" style={{ color: TEKST2 }}>{it.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 10. Contact en ziek melden ---------- */

function Mail({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function Klembord({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4v2h6V4M9 12h6M12 9v6" />
    </svg>
  );
}

export function WnContact({ d }: BlockProps) {
  const routes = [
    { r: d.phone, Icon: Tel, bg: MAGENTA },
    { r: d.mail, Icon: Mail, bg: INDIGO },
  ].filter((x) => x.r?.value && x.r?.href);
  const ziek = d.ziek || {};
  const zb = ziek.button || {};
  return (
    <section id={d.anchor || "contact"} className={SEC} style={{ background: "#ffffff", paddingBottom: 8 }}>
      <div className="relative mx-[6px] mt-11 flex flex-col gap-5 overflow-hidden rounded-[32px] px-3.5 pb-3.5 pt-11 text-white md:mx-2 md:px-8 md:pb-8 lg:mt-[90px] lg:rounded-[40px] lg:px-14 lg:py-[68px] xl:px-[72px]" style={{ background: MAGENTA }}>
        <span aria-hidden className="absolute right-[-90px] top-[-90px] h-[240px] w-[240px] rounded-full lg:bottom-[-330px] lg:left-[-170px] lg:right-auto lg:top-auto lg:h-[540px] lg:w-[540px]" style={{ background: "#B02A5D" }} />
        <span aria-hidden className="absolute bottom-[150px] left-[330px] hidden h-16 w-16 rounded-full xl:block" style={{ background: ORANJE }} />
        <div className="relative mx-auto grid w-full max-w-[1296px] gap-5 lg:grid-cols-12 lg:gap-x-6">
          <div className="flex flex-col gap-3 px-2.5 lg:col-span-5 lg:gap-6 lg:px-0">
            <Label kleur="#FFD0E0">{d.eyebrow}</Label>
            <h2 className="text-[38px] font-extrabold leading-none tracking-[-1.5px] md:text-[48px] lg:text-[56px] lg:leading-[0.98] lg:tracking-[-2.4px] xl:text-[64px] xl:tracking-[-2.6px]" style={{ color: "#ffffff" }}>
              <Regels text={d.heading} altijd />
            </h2>
            {d.text && <p className="max-w-[400px] text-[16px] leading-[1.6] lg:text-[18px]" style={{ color: "#FFE3EC" }}><Kort lang={d.text} kort={d.textShort} /></p>}
          </div>
          <div className="flex flex-col gap-2 lg:col-span-6 lg:col-start-7 lg:gap-3">
            {routes.map(({ r, Icon, bg }, i) => (
              <Go key={i} href={r.href} className="wn-row wn-kaart flex items-center gap-3.5 rounded-[22px] bg-white p-[18px] lg:gap-[22px] lg:rounded-[28px] lg:px-7 lg:py-[26px]" style={{ color: INDIGO }}>
                <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full text-white lg:h-14 lg:w-14" style={{ background: bg }}><Icon size={20} /></span>
                <span className="flex min-w-0 grow flex-col gap-0.5 lg:gap-[3px]">
                  <span className="text-[12px] font-bold uppercase tracking-[1px] lg:text-[13px]" style={{ color: LABEL }}>{r.label}</span>
                  <span className="text-[20px] font-extrabold tracking-[-0.4px] lg:text-[26px] lg:tracking-[-0.6px]">{r.value}</span>
                  {r.sub && <span className="text-[13px] lg:text-[15px]" style={{ color: TEKST2 }}>{r.sub}</span>}
                </span>
                <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-full border-[1.5px] md:grid" style={{ borderColor: LIJN }}><Pijl size={15} /></span>
              </Go>
            ))}
            {(ziek.text || zb.label) && (
              <div id="ziekmelden" className="flex flex-col gap-3.5 rounded-[22px] px-[18px] pb-[18px] pt-5 text-white lg:rounded-[28px] lg:px-7 lg:py-[26px] xl:flex-row xl:items-center xl:gap-[22px]" style={{ background: INDIGO }}>
                <span className="flex items-start gap-3.5 lg:items-center lg:gap-[22px] xl:grow">
                  <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full lg:h-14 lg:w-14" style={{ background: ORANJE, color: "#3D2206" }}><Klembord size={20} /></span>
                  <span className="flex flex-col gap-[3px]">
                    <span className="text-[12px] font-bold uppercase tracking-[1px] lg:text-[13px]" style={{ color: "#B4ADF2" }}>{ziek.label}</span>
                    <span className="text-[14px] leading-[1.5] lg:text-[15px]" style={{ color: "#D6D2F7" }}><Kort lang={ziek.text} kort={ziek.textShort} /></span>
                  </span>
                </span>
                {zb.label && zb.href && (
                  <Go href={zb.href} className="wn-btn flex h-[50px] shrink-0 items-center justify-center rounded-full bg-white px-[22px] text-[15px] font-bold lg:h-[52px] lg:self-start xl:self-auto" style={{ color: INDIGO }}>
                    <Kort lang={zb.label} kort={zb.labelShort} />
                  </Go>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
