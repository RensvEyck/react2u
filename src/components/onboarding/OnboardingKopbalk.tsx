"use client";
import { useEffect, useState } from "react";
import Logo from "@/components/site/Logo";
import { BREED, kop, LAV, LINE, NAVY, PINK, Pijl, SOFT } from "@/components/blocks/Gedeeld";

/*
 * De vaste kopbalk van de onboardingpagina en de balk onderaan op de telefoon,
 * zoals op de contractpagina: logo, het nummer, de stappen als genummerde
 * rondjes die meelopen met waar je bent, de voortgang, de belknop en een
 * dunne lijn eronder die vult terwijl je scrolt.
 */

const MUTE = "#6B6985";

export type KopStap = { id: string; nr: number; titel: string; klaar: boolean };

function Vink({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

/** Hoe ver je bent (0 tot 1), voor de lijn onder de kopbalk. */
function useVoortgang() {
  const [v, setV] = useState(0);
  useEffect(() => {
    let r = 0;
    const meet = () => {
      r = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setV(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    const opScroll = () => { if (!r) r = requestAnimationFrame(meet); };
    meet();
    window.addEventListener("scroll", opScroll, { passive: true });
    window.addEventListener("resize", opScroll);
    return () => { window.removeEventListener("scroll", opScroll); window.removeEventListener("resize", opScroll); cancelAnimationFrame(r); };
  }, []);
  return v;
}

/** Welke stap nu bovenaan staat: de laatste waarvan de bovenkant voorbij de kopbalk is. */
function useActief(ids: string[]) {
  const [actief, setActief] = useState("");
  const sleutel = ids.join(",");
  useEffect(() => {
    const lijst = sleutel.split(",").filter(Boolean);
    let r = 0;
    const meet = () => {
      r = 0;
      let nu = "";
      for (const id of lijst) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 160) nu = id;
      }
      setActief(nu);
    };
    const opScroll = () => { if (!r) r = requestAnimationFrame(meet); };
    meet();
    window.addEventListener("scroll", opScroll, { passive: true });
    return () => { window.removeEventListener("scroll", opScroll); cancelAnimationFrame(r); };
  }, [sleutel]);
  return actief;
}

/** Of een onderdeel in beeld is: dan hoeft de knop ernaartoe niet meer. */
function useInBeeld(id: string) {
  const [inBeeld, setInBeeld] = useState(false);
  useEffect(() => {
    const el = document.getElementById(id);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInBeeld(e.isIntersecting), { rootMargin: "-20% 0px -40% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [id]);
  return inBeeld;
}

export function scrollNaar(id: string) {
  const rustig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: rustig ? "auto" : "smooth", block: "start" });
}

export default function OnboardingKopbalk({
  nummer, stappen, klaar, totaal, tel, telNaam,
}: {
  nummer: string;
  stappen: KopStap[];
  klaar: number;
  totaal: number;
  tel: string;
  telNaam: string;
}) {
  const voortgang = useVoortgang();
  const actief = useActief(stappen.map((s) => s.id));
  const compleet = totaal > 0 && klaar === totaal;
  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur-md" style={{ borderColor: LINE }}>
      <div className={`${BREED} flex h-[72px] items-center justify-between gap-4 md:h-[88px]`}>
        <div className="flex min-w-0 items-center gap-4">
          <Logo className="h-9 w-auto shrink-0 md:h-11" />
          <span className="hidden h-8 w-px sm:block" style={{ background: LINE }} aria-hidden="true" />
          <span className="hidden truncate text-[15px] font-bold sm:block" style={{ color: NAVY }}>Onboarding {nummer}</span>
        </div>
        {stappen.length > 0 && (
          <nav aria-label="Stappen van de onboarding" className="hidden items-center gap-2 xl:flex">
            {stappen.map((s) => {
              const hier = s.id === actief;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  aria-current={hier ? "step" : undefined}
                  aria-label={`Stap ${s.nr}: ${s.titel}${s.klaar ? ", klaar" : ""}`}
                  title={s.titel}
                  className="group flex items-center gap-2"
                >
                  <span
                    className={`${kop} grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] transition-colors`}
                    style={s.klaar ? { background: NAVY, color: "#fff" } : hier ? { background: "#fff", color: PINK, boxShadow: `inset 0 0 0 2px ${PINK}` } : { background: SOFT, color: MUTE }}
                  >
                    {s.klaar ? <Vink /> : s.nr}
                  </span>
                  {hier && <span className="max-w-[220px] truncate text-[14px] font-bold" style={{ color: NAVY }}>{s.titel}</span>}
                </a>
              );
            })}
          </nav>
        )}
        <div className="flex shrink-0 items-center gap-5">
          <span className="hidden items-center gap-3 md:flex" aria-label={`${klaar} van ${totaal} stappen klaar`}>
            <span className="h-2 w-24 overflow-hidden rounded-full" style={{ background: LAV }}>
              <span className="block h-full rounded-full transition-[width]" style={{ width: `${totaal ? (klaar / totaal) * 100 : 0}%`, background: compleet ? "#0A7A4B" : PINK }} />
            </span>
            <span className="text-[14px] font-bold tabular-nums" style={{ color: NAVY }}>{klaar}/{totaal}</span>
          </span>
          <a href={tel} className="hv-btn hv-btn-roze inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-[14.5px] font-bold">
            Bel {telNaam}
          </a>
        </div>
      </div>
      <span aria-hidden className="absolute bottom-[-1px] left-0 h-[2px]" style={{ width: `${voortgang * 100}%`, background: PINK }} />
    </header>
  );
}

/** Op de telefoon: onderaan de knop naar de volgende open stap, tot je erbij bent. */
export function VolgendeBalk({ id, titel, nr }: { id: string; titel: string; nr: number }) {
  const inBeeld = useInBeeld(id);
  return (
    <div className={`geen-print fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-4 py-3 backdrop-blur-md transition-transform sm:hidden ${inBeeld ? "translate-y-full" : ""}`} style={{ borderColor: LINE }}>
      <button type="button" onClick={() => scrollNaar(id)} className="hv-btn hv-btn-roze flex h-[52px] w-full items-center justify-center gap-2.5 rounded-full px-6 text-[15px] font-bold">
        <span className="truncate">Stap {nr}: {titel}</span><Pijl size={14} />
      </button>
    </div>
  );
}
