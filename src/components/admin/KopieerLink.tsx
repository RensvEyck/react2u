"use client";
import { useState } from "react";
import { LuCheck, LuCopy } from "react-icons/lu";

/** Een link in een selecteerbaar veld met een kopieerknop, zoals bij de uitnodigingslink. */
export default function KopieerLink({ link, label }: { link: string; label: string }) {
  const [gekopieerd, setGekopieerd] = useState(false);
  async function kopieer() {
    try {
      await navigator.clipboard.writeText(link);
      setGekopieerd(true);
      setTimeout(() => setGekopieerd(false), 2000);
    } catch {
      // Geen klembord (oude browser, geen https): het veld is selecteerbaar.
    }
  }
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input className="ainput flex-1 font-mono !text-[13px]" readOnly value={link} aria-label={label} onFocus={(e) => e.currentTarget.select()} />
      <button type="button" onClick={kopieer} className="abtn shrink-0">
        {gekopieerd ? <><LuCheck /> Gekopieerd</> : <><LuCopy /> Kopieer link</>}
      </button>
    </div>
  );
}
