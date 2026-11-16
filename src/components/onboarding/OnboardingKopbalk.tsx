"use client";
import { useEffect, useState } from "react";
import Logo from "@/components/site/Logo";
import { BREED, LAV, LINE, NAVY, PINK, Pijl } from "@/components/blocks/Gedeeld";

/*
 * De vaste kopbalk van de onboardingpagina en de balk onderaan op de telefoon,
 * zoals op de offerte- en contractpagina: logo, het nummer, de hoofdstukken van
 * het verhaal met een streep onder het hoofdstuk waar je bent, de voortgang
 * van de stappen, de belknop en een dunne lijn eronder die vult terwijl je
 * scrolt.
 */

export type Onderdeel = { id: string; label: string };

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

/** Welk hoofdstuk nu bovenaan staat: het laatste waarvan de bovenkant voorbij de kopbalk is. */
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
  nummer, onderdelen, klaar, totaal, tel, telNaam,
}: {
  nummer: string;
  onderdelen: Onderdeel[];
  klaar: number;
  totaal: number;
  tel: string;
  telNaam: string;
}) {
  const voortgang = useVoortgang();
  const actief = useActief(onderdelen.map((o) => o.id));
  const compleet = totaal > 0 && klaar === totaal;
  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur-md" style={{ borderColor: LINE }}>
      <div className={`${BREED} flex h-[72px] items-center justify-between gap-4 md:h-[88px]`}>
        <div className="flex min-w-0 items-center gap-4">
          <Logo className="h-9 w-auto shrink-0 md:h-11" />
          <span className="hidden h-8 w-px sm:block" style={{ background: LINE }} aria-hidden="true" />
          <span className="hidden truncate text-[15px] font-bold sm:block" style={{ color: NAVY }}>Onboarding {nummer}</span>
        </div>
        {onderdelen.length > 0 && (
          <nav aria-label="Hoofdstukken van de onboarding" className="hidden items-center gap-7 xl:flex">
            {onderdelen.map((o) => {
              const hier = o.id === actief;
              return (
                <a key={o.id} href={`#${o.id}`} aria-current={hier ? "true" : undefined} className="relative py-2 text-[15px] font-bold transition-colors" style={{ color: hier ? PINK : NAVY }}>
                  {o.label}
                  <span aria-hidden className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full transition-opacity" style={{ background: PINK, opacity: hier ? 1 : 0 }} />
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
