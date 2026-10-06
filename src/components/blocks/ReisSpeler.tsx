"use client";
import { useEffect, useRef } from "react";

/**
 * Speelt de stippenreis af zodra hij in beeld komt (klasse `hv-go`).
 * Zonder JavaScript of bij prefers-reduced-motion staat alles gewoon stil
 * en zichtbaar: pas na `hv-armed` worden de stippen eerst verborgen.
 * Klik op de reis om hem opnieuw af te spelen.
 */
export default function ReisSpeler({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const play = () => {
      el.classList.remove("hv-go");
      void el.offsetWidth;
      el.classList.add("hv-go");
    };
    el.classList.add("hv-armed");
    el.addEventListener("click", play);
    if (!("IntersectionObserver" in window)) {
      play();
      return () => el.removeEventListener("click", play);
    }
    // Al bij een klein stuk in beeld afspelen: op een telefoon is de reis
    // hoger dan het scherm, en wie snel doorscrolt moet de stappen niet missen.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          play();
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      el.removeEventListener("click", play);
    };
  }, []);

  return (
    <div ref={ref} className={`hv-reis ${className || ""}`}>
      {children}
    </div>
  );
}
