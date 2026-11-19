"use client";
import { useOptimistic, useState, useTransition } from "react";
import type { ZetUitkomst } from "@/app/admin/inwerkreisActions";

/**
 * De schakelaar van een inwerkreis (0051): aan, of uit. Zet meteen om en
 * draait terug met een melding als het niet lukt. `zet` is de server action,
 * al gebonden aan de reis.
 */
export default function AanUit({ aan, zet, label }: { aan: boolean; zet: (aan: boolean) => Promise<ZetUitkomst>; label: string }) {
  const [staat, setStaat] = useOptimistic(aan);
  const [bezig, start] = useTransition();
  const [fout, setFout] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={staat}
        aria-label={label}
        aria-busy={bezig}
        onClick={() =>
          start(async () => {
            setFout(null);
            setStaat(!staat);
            const uit = await zet(!staat);
            if (!uit.ok) setFout(uit.fout);
          })
        }
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#e75387]/25 ${staat ? "bg-[#0a7a4b]" : "bg-black/20"}`}
      >
        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${staat ? "translate-x-5" : "translate-x-0"}`} />
      </button>
      <span className={`text-[12.5px] font-semibold ${staat ? "text-[#0a7a4b]" : "text-black/45"}`} aria-hidden>{staat ? "Aan" : "Uit"}</span>
      {fout && <span role="alert" className="text-[12px] font-medium text-[#b42318]">{fout}</span>}
    </span>
  );
}
