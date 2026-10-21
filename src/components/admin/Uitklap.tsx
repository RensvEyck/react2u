"use client";
import { useEffect, useRef, useState } from "react";
import { LuChevronDown, LuPlus } from "react-icons/lu";

/**
 * Een kaart die dicht begint en met één klik opengaat, voor een formulier dat
 * je af en toe nodig hebt boven een lijst die je de hele dag gebruikt.
 *
 * Staat het id in de URL (`#nieuw`, bijvoorbeeld vanuit het commandopalet), dan
 * gaat hij meteen open en staat de cursor in het eerste veld.
 */
export default function Uitklap({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const inhoud = useRef<HTMLDivElement>(null);
  const viaHash = useRef(false);

  useEffect(() => {
    const check = () => {
      if (window.location.hash === `#${id}`) {
        viaHash.current = true;
        setOpen(true);
      }
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [id]);

  useEffect(() => {
    if (open && viaHash.current) inhoud.current?.querySelector<HTMLElement>("input, textarea, select")?.focus();
  }, [open]);

  return (
    <div id={id} className="acard scroll-mt-24 overflow-hidden">
      <button
        type="button"
        onClick={() => { viaHash.current = true; setOpen((o) => !o); }}
        aria-expanded={open}
        aria-controls={`${id}-inhoud`}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-[#fafafd]"
      >
        <span className="flex items-center gap-2.5 font-heading text-[15px] font-bold text-[#312e82]">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#fdeef4] text-[#e75387]">
            <LuPlus className="text-[15px]" />
          </span>
          {label}
        </span>
        <LuChevronDown className={`text-[16px] text-black/35 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div id={`${id}-inhoud`} ref={inhoud} hidden={!open} className="border-t border-black/[0.06] px-6 pb-6 pt-5">
        {children}
      </div>
    </div>
  );
}
