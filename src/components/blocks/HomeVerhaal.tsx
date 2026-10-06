import Link from "next/link";
import { ROZE, kopKleur, tekstKleur } from "@/lib/kleuren";
import { Outfit } from "next/font/google";
import { LuShieldCheck, LuMessageSquare, LuHeart, LuRoute, LuCheck } from "react-icons/lu";
import ReisSpeler from "./ReisSpeler";

/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */

/*
 * Middensecties van de startpagina (ontwerp "Home S-tier"):
 *  - homeEenMens: "Eén mens. Eén verhaal. Eén aanspreekpunt." met een
 *    foto-constellatie in de stippen van het logo.
 *  - homeReis: "Zo werkt het", een stippenspoor dat zichzelf tekent langs
 *    Voorkomen, Signaleren, Begeleiden en Verder.
 * Kleuren komen exact uit het logo; koppen in Outfit, tekst in DM Sans.
 * Animaties staan in globals.css onder `.hv`.
 */

export const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

const TEAL = "#00A098";
const SKY = "#3AA5DD";
const ORANGE = "#F19001";
const PINK = ROZE;
const RED = "#CB152B";
const NAVY = "#322E83";
const TEKST = "#5E5C78";
const GRIJS = "#F6F5FB";

type BlockProps = { d: any };

function isExternal(href?: string) {
  return !!href && (href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:"));
}

function Go({ href, className, style, children }: {
  href: string; className?: string; style?: React.CSSProperties; children: React.ReactNode;
}) {
  if (isExternal(href) || href.startsWith("#")) return <a href={href} className={className} style={style}>{children}</a>;
  return <Link href={href} className={className} style={style}>{children}</Link>;
}

function Pijl() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="hn-pijl">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** Label met een stip, zoals in het logo. */
function Label({ children, kleur = TEAL, zacht = "#D7F0EE" }: { children: React.ReactNode; kleur?: string; zacht?: string }) {
  return (
    <span className="inline-flex items-center gap-2 self-start text-[12px] font-bold uppercase tracking-[1.6px] md:text-[13px]" style={{ color: tekstKleur(kleur) }}>
      <span className="grid h-[18px] w-[18px] place-items-center rounded-full" style={{ background: zacht }}>
        <span className="h-[7px] w-[7px] rounded-full" style={{ background: kleur }} />
      </span>
      {children}
    </span>
  );
}

/* ---------- Eén mens. Eén verhaal. Eén aanspreekpunt. ---------- */

// Constellatie op een vlak van 640×620; alles in procenten zodat hij meeschaalt.
const CW = 640, CH = 620;
const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const KLEURSTIPPEN: [number, number, number, string, number][] = [
  [250, 10, 46, TEAL, 2], [318, 36, 34, TEAL, 1], [560, 70, 40, NAVY, 3], [140, 96, 30, SKY, 1],
  [40, 420, 54, ORANGE, 2], [96, 488, 30, ORANGE, 1],
  [460, 330, 62, PINK, 3], [470, 430, 38, RED, 1], [540, 400, 30, RED, 2], [590, 350, 44, RED, 3],
  [200, 560, 34, PINK, 1], [450, 540, 26, PINK, 2],
];
const FOTOPLEKKEN: [number, number, number, number][] = [
  [330, 90, 200, 1], [80, 170, 220, 3], [250, 360, 180, 2],
];

export function HomeEenMens({ d }: BlockProps) {
  const lines: string[] = (d.lines as string[]) || ["Eén mens.", "Eén verhaal.", "Eén aanspreekpunt."];
  const checks = ((d.checks as any[]) || []).filter((c) => c?.text);
  const photos = ((d.photos as any[]) || []).filter((p) => p?.image).slice(0, 3);
  const lineColors = [NAVY, TEAL, PINK];
  return (
    <section aria-label={d.eyebrow || "Waarom React2u"} className={`hv ${outfit.variable}`} style={{ background: GRIJS }}>
      <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 py-20 md:grid-cols-12 md:gap-6 md:px-10 md:py-28 lg:px-16 xl:px-[120px] lg:py-[120px]">
        <div className="flex flex-col gap-6 md:col-span-6 lg:col-span-5">
          {d.eyebrow && <Label>{d.eyebrow}</Label>}
          <h2 className="hv-kop text-[38px] leading-[1.05] tracking-[-1px] md:text-[44px] lg:whitespace-nowrap lg:text-[54px] lg:tracking-[-1.4px]">
            {lines.map((l, i) => (
              <span key={i} className="block" style={{ color: kopKleur(lineColors[i % 3]) }}>{l}</span>
            ))}
          </h2>
          {d.text && <p className="text-[17px] leading-[1.75] md:text-[19px]" style={{ color: TEKST }}>{d.text}</p>}
          {checks.length > 0 && (
            <ul className="flex flex-col gap-3 pt-2">
              {checks.map((c, i) => (
                <li key={i} className="flex items-start gap-3 text-[16px] leading-[1.5]" style={{ color: NAVY }}>
                  <span className="mt-[1px] grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full" style={{ background: "#EEEDF8", color: NAVY }}>
                    <LuCheck className="text-[12px]" strokeWidth={3} aria-hidden />
                  </span>
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="md:col-span-6 lg:col-span-7 lg:col-start-6">
          <div aria-hidden={photos.every((p) => !p.alt)} className="relative ml-auto w-full max-w-[640px]" style={{ aspectRatio: `${CW} / ${CH}` }}>
            {KLEURSTIPPEN.map(([x, y, s, c, f], i) => (
              <span key={`k${i}`} aria-hidden className={`hv-f${f} absolute rounded-full`}
                style={{ left: pct(x, CW), top: pct(y, CH), width: pct(s, CW), aspectRatio: "1", background: c }} />
            ))}
            {photos.map((p, i) => {
              const [x, y, s, f] = FOTOPLEKKEN[i];
              return (
                <span key={`f${i}`} className={`hv-f${f} absolute overflow-hidden rounded-full`}
                  style={{ left: pct(x, CW), top: pct(y, CH), width: pct(s, CW), aspectRatio: "1",
                    boxShadow: "0 0 0 6px #ffffff, 0 30px 60px -30px rgba(50,46,131,.5)" }}>
                  <img src={p.image} alt={p.alt || ""} loading="lazy" className="absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: p.focus || "50% 40%" }} />
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Zo werkt het: de stippenreis ---------- */

const STAP_KLEUR = [TEAL, SKY, PINK, ORANGE];
const STAP_ICOON: Record<string, any> = { shield: LuShieldCheck, chat: LuMessageSquare, heart: LuHeart, route: LuRoute };

// Reis op een vlak van 1200×250: vier stations, daartussen een S-bocht van stippen.
const JW = 1200, JH = 250, R = 66, SEG = 0.9;
const SX = [150, 450, 750, 1050], SY = [110, 150, 110, 150];
// Stations en teksten staan binnen een seconde; alleen de stippen reizen
// daarna nog van station naar station. Eerder wachtten station en tekst op de
// stippen (de laatste tot 4,5 s), en wie meteen naar de knoppen scrolde zag
// een leeg vlak waar stap 3 en 4 hoorden te staan.
const tStation = (i: number) => 0.15 + i * 0.22;
const tSpoor = (i: number) => 0.5 + i * SEG;

function hex(c: string) { return [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)); }
function mix(a: string, b: string, t: number) {
  const A = hex(a), B = hex(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

type Stip = { x: number; y: number; s: number; c: string; delay: number };
const SPOOR: Stip[] = (() => {
  const out: Stip[] = [];
  for (let i = 0; i < 3; i++) {
    const [x0, y0, x1, y1] = [SX[i], SY[i], SX[i + 1], SY[i + 1]];
    const pts: [number, number][] = [];
    for (let k = 0; k < 400; k++) {
      const u = k / 399;
      pts.push([x0 + (x1 - x0) * u, y0 + (y1 - y0) * (3 * u * u - 2 * u * u * u) - 28 * Math.sin(Math.PI * u)]);
    }
    let acc = 0, last = pts[0];
    let gekozen: [number, number][] = [];
    for (const p of pts.slice(1)) {
      acc += Math.hypot(p[0] - last[0], p[1] - last[1]); last = p;
      if (acc >= 19) { gekozen.push(p); acc = 0; }
    }
    gekozen = gekozen.filter((p) => Math.hypot(p[0] - x0, p[1] - y0) > R + 14 && Math.hypot(p[0] - x1, p[1] - y1) > R + 14);
    const start = tSpoor(i);
    gekozen.forEach((p, j) => {
      const t = j / Math.max(gekozen.length - 1, 1);
      out.push({ x: p[0], y: p[1], s: 8 + 4 * Math.sin(Math.PI * t), c: mix(STAP_KLEUR[i], STAP_KLEUR[i + 1], t), delay: start + t * SEG });
    });
  }
  return out;
})();

export function HomeReis({ d }: BlockProps) {
  const steps = ((d.steps as any[]) || []).filter((s) => s?.title).slice(0, 4);
  const buttons = ((d.buttons as any[]) || []).filter((b) => b?.label && b?.href);
  return (
    <section aria-label={d.eyebrow || "Zo werkt het"} className={`hv ${outfit.variable}`} style={{ background: d.bg || "#ffffff" }}>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-12 px-5 pt-20 md:px-10 md:pt-28 lg:px-16 xl:px-[120px] lg:pt-[120px]">
        <div className="grid gap-5 md:grid-cols-12 md:items-end md:gap-6">
          <div className="flex flex-col gap-4 md:col-span-7 lg:col-span-6">
            {d.eyebrow && <Label>{d.eyebrow}</Label>}
            <h2 className="hv-kop text-[34px] leading-[1.1] tracking-[-0.7px] md:text-[40px] lg:text-[46px] lg:tracking-[-0.9px]" style={{ color: NAVY }}>{d.heading}</h2>
          </div>
          {d.text && <p className="text-[17px] leading-[1.75] md:col-span-5 md:col-start-8 lg:col-span-4 lg:col-start-9 lg:text-[18px]" style={{ color: TEKST }}>{d.text}</p>}
        </div>

        <ReisSpeler className="cursor-pointer">
          {/* Breed: het spoor met stations, met de teksten eronder */}
          <div className="hidden md:block">
            <div className="relative mx-auto w-full max-w-[1200px]" style={{ aspectRatio: `${JW} / ${JH}`, containerType: "inline-size" }}>
              {SPOOR.map((p, i) => (
                <span key={i} aria-hidden className="hv-jd absolute rounded-full"
                  style={{ left: pct(p.x - p.s / 2, JW), top: pct(p.y - p.s / 2, JH), width: pct(p.s, JW), aspectRatio: "1",
                    background: p.c, animationDelay: `${p.delay.toFixed(2)}s` }} />
              ))}
              {steps.map((s, i) => {
                const Ic = STAP_ICOON[s.icon] || LuHeart;
                const c = STAP_KLEUR[i];
                return (
                  <span key={i} aria-hidden className="hv-js absolute"
                    style={{ left: pct(SX[i] - R, JW), top: pct(SY[i] - R, JH), width: pct(2 * R, JW), aspectRatio: "1", animationDelay: `${tStation(i).toFixed(2)}s` }}>
                    <span className={`hv-f${[1, 2, 3, 1][i]} absolute inset-0 grid place-items-center rounded-full text-white`}
                      style={{ background: c, boxShadow: `0 0 0 10px #ffffff, 0 30px 60px -28px ${c}` }}>
                      <Ic style={{ width: "3.8cqw", height: "3.8cqw" }} strokeWidth={1.7} />
                      <span className="hv-kop absolute grid place-items-center rounded-full bg-white"
                        style={{ right: "-0.35cqw", top: "-0.35cqw", width: "3.3cqw", height: "3.3cqw", fontSize: "1.4cqw", fontWeight: 800, color: c,
                          boxShadow: "0 6px 16px -6px rgba(50,46,131,.35)" }}>{i + 1}</span>
                    </span>
                  </span>
                );
              })}
            </div>
            <ol className="mx-auto mt-2 grid max-w-[1200px] grid-cols-4 gap-10">
              {steps.map((s, i) => (
                <li key={i} className="hv-jc flex flex-col items-center gap-2 px-2 text-center" style={{ animationDelay: `${(tStation(i) + 0.12).toFixed(2)}s` }}>
                  <span className="text-[13px] font-bold uppercase tracking-[1.3px]" style={{ color: tekstKleur(STAP_KLEUR[i]) }}>{s.label}</span>
                  <span className="hv-kop text-[20px] leading-[1.3] lg:text-[22px]" style={{ color: NAVY }}>{s.title}</span>
                  <span className="text-[15px] leading-[1.75] lg:text-[16px]" style={{ color: TEKST }}>{s.text}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Smal: dezelfde reis van boven naar beneden */}
          <ol className="flex flex-col md:hidden">
            {steps.map((s, i) => {
              const Ic = STAP_ICOON[s.icon] || LuHeart;
              const c = STAP_KLEUR[i];
              const laatste = i === steps.length - 1;
              return (
                <li key={i} className="grid grid-cols-[64px_1fr] gap-x-5">
                  <div className="flex flex-col items-center">
                    <span className="hv-js grid h-16 w-16 shrink-0 place-items-center rounded-full text-white"
                      style={{ background: c, boxShadow: `0 0 0 6px #ffffff, 0 20px 40px -22px ${c}`, animationDelay: `${tStation(i).toFixed(2)}s` }}>
                      <Ic className="text-[26px]" strokeWidth={1.7} aria-hidden />
                    </span>
                    {!laatste && (
                      <span aria-hidden className="flex grow flex-col items-center justify-around gap-2 py-3">
                        {[0, 1, 2, 3].map((k) => (
                          <span key={k} className="hv-jd h-2 w-2 rounded-full"
                            style={{ background: mix(c, STAP_KLEUR[i + 1], k / 3), animationDelay: `${(tStation(i) + 0.3 + k * 0.08).toFixed(2)}s` }} />
                        ))}
                      </span>
                    )}
                  </div>
                  <div className={`hv-jc flex flex-col gap-1.5 pt-2 ${laatste ? "" : "pb-8"}`} style={{ animationDelay: `${(tStation(i) + 0.12).toFixed(2)}s` }}>
                    <span className="text-[12px] font-bold uppercase tracking-[1.3px]" style={{ color: c }}>{i + 1}. {s.label}</span>
                    <span className="hv-kop text-[20px] leading-[1.3]" style={{ color: NAVY }}>{s.title}</span>
                    <span className="text-[15px] leading-[1.7]" style={{ color: TEKST }}>{s.text}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </ReisSpeler>

        {buttons.length > 0 && (
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
            {buttons.map((b, i) => (
              <Go key={i} href={b.href}
                className={`hv-btn ${i === 0 ? "hv-btn-roze" : "hv-btn-rand"} inline-flex h-14 items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-7 text-[16px] font-bold`}>
                {b.label}<Pijl />
              </Go>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
