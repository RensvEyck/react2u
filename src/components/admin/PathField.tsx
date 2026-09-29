"use client";
import { useId, useMemo, useRef, useState } from "react";
import { findRanges, score, terms } from "@/lib/search";
import Highlight from "./Highlight";

export type PathOption = { path: string; label: string; kind: string };

/**
 * Invoerveld voor een adres op de site, met suggesties uit de bestaande
 * pagina's, artikelen en vacatures. Vrij typen blijft mogelijk — ook een
 * externe https-URL — de lijst is hulp, geen keuzelijst.
 *
 * Gewoon een <input name=…>, zodat het in een server-action-formulier past.
 */
export default function PathField({
  name, options, defaultValue = "", placeholder, autoFocus, required,
}: {
  name: string;
  options: PathOption[];
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const t = terms(value);
    if (!t.length) return options.slice(0, 8);
    return options
      .map((o) => ({ o, s: score({ title: o.label, subtitle: o.path }, t) }))
      .filter((m) => m.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map((m) => m.o);
  }, [value, options]);

  const pick = (o: PathOption) => {
    setValue(o.path);
    setOpen(false);
    inputRef.current?.focus();
  };

  const show = open && matches.length > 0 && !matches.some((m) => m.path === value);
  const current = Math.min(active, matches.length - 1);
  const t = terms(value);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        name={name}
        value={value}
        onChange={(e) => { setValue(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!show) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((current + 1) % matches.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((current - 1 + matches.length) % matches.length); }
          else if (e.key === "Enter") { e.preventDefault(); pick(matches[current]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        className="ainput font-mono !text-[14px]"
        placeholder={placeholder}
        autoFocus={autoFocus}
        required={required}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
      />
      {show && (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-[280px] overflow-y-auto rounded-xl border border-black/[0.08] bg-white p-1.5 shadow-[0_16px_40px_-16px_rgba(28,26,78,0.35)]"
        >
          {matches.map((o, i) => (
            <div
              key={o.path}
              role="option"
              aria-selected={i === current}
              onMouseDown={(e) => { e.preventDefault(); pick(o); }}
              onMouseMove={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ${i === current ? "bg-[#f1f0fb]" : ""}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-[#1c1a4e]">
                  <Highlight text={o.label} ranges={findRanges(o.label, t)} />
                </span>
                <span className="block truncate font-mono text-[12px] text-black/40">
                  <Highlight text={o.path} ranges={findRanges(o.path, t)} />
                </span>
              </span>
              <span className="apill shrink-0 bg-black/[0.05] !px-2 !py-0 !text-[11px] text-black/45">{o.kind}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
