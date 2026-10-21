"use client";
import { useEffect, useState } from "react";
import { NAVY, PINK, MUTE, LINE } from "./Gedeeld";

/**
 * Op de telefoon: een vaste balk onderaan de vacature met de titel, het
 * salaris en "Solliciteer", zoals bij de grote uitzendbureaus. Verschijnt als
 * de knop in de kop uit beeld is en verdwijnt bij het formulier zelf.
 * Staat de voorbeeldbalk er ook, dan schuift hij daarboven (--voorbeeld-h).
 */
export default function SolliciteerBalk({ titel, salaris, knop }: { titel: string; salaris?: string; knop: string }) {
  const [zichtbaar, setZichtbaar] = useState(false);

  useEffect(() => {
    const kop = document.getElementById("vacature-kop");
    const formulier = document.getElementById("solliciteren");
    if (!kop || !formulier || !("IntersectionObserver" in window)) return;
    let kopInBeeld = true;
    let formulierInBeeld = false;
    const bijwerken = () => setZichtbaar(!kopInBeeld && !formulierInBeeld);
    const obs = new IntersectionObserver((items) => {
      for (const it of items) {
        if (it.target === kop) kopInBeeld = it.isIntersecting;
        if (it.target === formulier) formulierInBeeld = it.isIntersecting;
      }
      bijwerken();
    });
    obs.observe(kop);
    obs.observe(formulier);
    return () => obs.disconnect();
  }, []);

  return (
    <div aria-hidden={!zichtbaar}
      className={`fixed inset-x-0 z-40 border-t bg-white px-4 py-3 shadow-[0_-12px_28px_-18px_rgba(50,46,131,0.45)] transition-transform duration-300 lg:hidden ${zichtbaar ? "translate-y-0" : "pointer-events-none translate-y-full"}`}
      style={{ borderColor: LINE, bottom: "var(--voorbeeld-h, 0px)", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto flex max-w-[640px] items-center justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-bold" style={{ color: NAVY }}>{titel}</span>
          {salaris && <span className="truncate text-[13px] tabular-nums" style={{ color: MUTE }}>{salaris}</span>}
        </span>
        <a href="#solliciteren" tabIndex={zichtbaar ? 0 : -1}
          className="inline-flex h-11 shrink-0 items-center rounded-full px-5 text-[15px] font-bold text-white" style={{ background: PINK }}>
          {knop}
        </a>
      </div>
    </div>
  );
}
