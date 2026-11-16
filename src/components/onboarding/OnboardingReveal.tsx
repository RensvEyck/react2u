"use client";
import { useEffect } from "react";

/*
 * Laat de onderdelen van de onboardingpagina zacht in beeld komen tijdens het
 * scrollen, zoals Reveal.tsx dat op de site doet (`data-reveal`). Eerst wordt
 * alles wat al in beeld staat gemarkeerd, pas daarna krijgt de pagina
 * `js-reveal` (die verbergt de rest): niets knippert boven de vouw, en zonder
 * JavaScript blijft alles gewoon zichtbaar. Het kenmerk `data-in` staat buiten
 * React: na opslaan rendert de pagina opnieuw, en een klasse zou dan weer
 * verdwijnen. Nieuwe onderdelen (na zo'n render) pikt een MutationObserver op.
 */
export default function OnboardingReveal() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".onboarding-doc");
    if (!root) return;
    const toon = (el: Element) => el.setAttribute("data-in", "");
    const nieuw = () => [...root.querySelectorAll<HTMLElement>("[data-reveal]:not([data-in])")];
    if (!("IntersectionObserver" in window)) {
      nieuw().forEach(toon);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          toon(e.target);
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    const vh = window.innerHeight;
    for (const el of nieuw()) {
      const r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) toon(el);
      else io.observe(el);
    }
    root.classList.add("js-reveal");
    const mo = new MutationObserver(() => nieuw().forEach((el) => io.observe(el)));
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}
