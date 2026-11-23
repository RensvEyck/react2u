"use client";
import { useOptimistic, useState, useTransition } from "react";
import { LuArrowBigUp } from "react-icons/lu";
import type { ZetUitkomst } from "@/app/admin/inwerkreisActions";

/**
 * De stemknop bij een idee: één stem per collega, intrekbaar. Zet meteen om
 * (optimistisch) en draait terug met een melding als de database nee zegt.
 * `zet` is de server action, al gebonden aan het idee. Wie niet mag stemmen
 * (eigen idee, afgerond) ziet alleen het aantal.
 */
export default function StemKnop({
  aantal, mijn, mag, zet, groot = false,
}: {
  aantal: number;
  mijn: boolean;
  mag: boolean;
  zet: (aan: boolean) => Promise<ZetUitkomst>;
  groot?: boolean;
}) {
  const [stand, setStand] = useOptimistic({ aantal, mijn });
  const [bezig, start] = useTransition();
  const [fout, setFout] = useState<string | null>(null);
  const maat = groot ? "gap-2 rounded-2xl px-4 py-2.5 text-[15px]" : "gap-1.5 rounded-xl px-2.5 py-1.5 text-[13px]";

  if (!mag) {
    return (
      <span className={`inline-flex items-center font-semibold tabular-nums text-black/45 ${maat}`} data-stemmen={aantal} title={`${aantal} ${aantal === 1 ? "stem" : "stemmen"}`}>
        <LuArrowBigUp className={groot ? "text-[20px]" : "text-[16px]"} aria-hidden /> {aantal}
        <span className="sr-only"> {aantal === 1 ? "stem" : "stemmen"}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        aria-pressed={stand.mijn}
        aria-busy={bezig}
        aria-label={stand.mijn ? `Stem intrekken (${stand.aantal})` : `Stemmen (${stand.aantal})`}
        data-stemmen={stand.aantal}
        onClick={() =>
          start(async () => {
            setFout(null);
            const naar = !stand.mijn;
            setStand({ aantal: stand.aantal + (naar ? 1 : -1), mijn: naar });
            const uit = await zet(naar);
            if (!uit.ok) setFout(uit.fout);
          })
        }
        className={`inline-flex items-center font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#e75387]/25 ${maat} ${
          stand.mijn ? "bg-[#312e82] text-white hover:bg-[#262366]" : "bg-[#f6f5fb] text-[#312e82] hover:bg-[#eef0ff]"
        }`}
      >
        <LuArrowBigUp className={groot ? "text-[20px]" : "text-[16px]"} aria-hidden fill={stand.mijn ? "currentColor" : "none"} /> {stand.aantal}
      </button>
      {fout && <span role="alert" className="mt-1 text-[12px] font-medium text-[#b42318]">{fout}</span>}
    </span>
  );
}
