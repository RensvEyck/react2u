"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Laat elementen met `data-reveal` zacht in beeld komen tijdens het scrollen.
 *
 * Volgorde is belangrijk: eerst wordt alles wat al in beeld staat als
 * zichtbaar gemarkeerd, pas daarna komt `js-reveal` op <html> (die verbergt de
 * rest). Zo knippert er niets boven de vouw, en zonder JavaScript — of als dit
 * script faalt — blijft alles gewoon zichtbaar. Bij prefers-reduced-motion
 * zet de CSS het effect uit.
 *
 * Draait opnieuw na elke paginawissel, want dan staan er nieuwe elementen.
 */
export default function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>(".site-root [data-reveal]:not(.is-in)")];
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const vh = window.innerHeight;
    const pending: HTMLElement[] = [];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) el.classList.add("is-in");
      else pending.push(el);
    }
    document.documentElement.classList.add("js-reveal");

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    pending.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
