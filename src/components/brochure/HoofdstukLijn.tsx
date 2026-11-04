"use client";

import { useEffect, useState } from "react";

/*
 * De voortgang door de brochure (BrochurePagina.tsx): onder de kopbalk een
 * balk in de reiskleuren van het logo, met op smallere schermen het hoofdstuk
 * waar je bent. Ook opent een link naar een ingeklapte prijslijst
 * (#tarieven-recover) die prijslijst eerst.
 */

type Item = { nr: string; id: string; kort: string };

const NAVY = "#322E83";

/** Het hoofdstuk waarvan de bovenkant het laatst boven 40% van het scherm kwam. */
function useActief(items: Item[]): number {
  const [index, setIndex] = useState(-1);
  useEffect(() => {
    let raf = 0;
    const meet = () => {
      raf = 0;
      const grens = window.innerHeight * 0.4;
      let nu = -1;
      items.forEach((it, i) => {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top <= grens) nu = i;
      });
      setIndex(nu);
    };
    const opScroll = () => {
      if (!raf) raf = requestAnimationFrame(meet);
    };
    meet();
    window.addEventListener("scroll", opScroll, { passive: true });
    window.addEventListener("resize", opScroll);
    return () => {
      window.removeEventListener("scroll", opScroll);
      window.removeEventListener("resize", opScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items]);
  return index;
}

/** Onder de kopbalk: hoe ver je in de brochure bent, en welk hoofdstuk. Opent ook ingeklapte prijslijsten bij een link. */
export function VoortgangBalk({ items }: { items: Item[] }) {
  const index = useActief(items);
  const [deel, setDeel] = useState(0);
  useEffect(() => {
    const meet = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setDeel(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    meet();
    window.addEventListener("scroll", meet, { passive: true });
    window.addEventListener("resize", meet);
    // Een link naar een prijslijst die is ingeklapt: eerst openklappen, dan springen.
    const klik = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
      const doel = a ? document.getElementById(decodeURIComponent(a.getAttribute("href")!.slice(1))) : null;
      const details = doel?.closest("details");
      if (details) details.open = true;
    };
    document.addEventListener("click", klik, true);
    const viaHash = () => {
      const doel = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
      const details = doel?.closest("details");
      if (details) {
        details.open = true;
        doel?.scrollIntoView();
      }
    };
    viaHash();
    return () => {
      window.removeEventListener("scroll", meet);
      window.removeEventListener("resize", meet);
      document.removeEventListener("click", klik, true);
    };
  }, []);
  const h = index >= 0 ? items[index] : null;
  return (
    <div aria-hidden className="absolute inset-x-0 bottom-[-1px] h-[3px]" style={{ background: "transparent" }}>
      <div className="h-full origin-left transition-transform duration-150" style={{ background: "linear-gradient(90deg, #00A098, #3AA5DD 35%, #E61674 68%, #F19001)", transform: `scaleX(${deel})` }} />
      {h && (
        <span className="absolute right-4 top-[7px] rounded-full bg-white/95 px-3 py-1 text-[12px] font-bold shadow-[0_8px_24px_-14px_rgba(50,46,131,0.5)]" style={{ color: NAVY }}>
          {h.nr} · {h.kort}
        </span>
      )}
    </div>
  );
}
