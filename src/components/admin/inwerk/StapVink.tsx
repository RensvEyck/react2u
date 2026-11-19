"use client";
import { useOptimistic, useState, useTransition } from "react";
import { LuCheck } from "react-icons/lu";
import type { ZetUitkomst } from "@/app/admin/inwerkreisActions";

/**
 * Een stap van de inwerkreis met zijn vinkje. Zet meteen om (optimistisch) en
 * draait terug met een melding als de database nee zegt, zonder dat de pagina
 * verspringt. `zet` is de server action, al gebonden aan reis en stap; de
 * inhoud van de regel komt als children van de server.
 */
export default function StapVink({
  gedaan, zet, label, children,
}: {
  gedaan: boolean;
  zet: (gedaan: boolean) => Promise<ZetUitkomst>;
  label: string;
  children: React.ReactNode;
}) {
  const [aan, setAan] = useOptimistic(gedaan);
  const [bezig, start] = useTransition();
  const [fout, setFout] = useState<string | null>(null);

  return (
    <div className="flex items-start gap-3.5" data-gedaan={aan ? "ja" : "nee"}>
      <button
        type="button"
        role="checkbox"
        aria-checked={aan}
        aria-label={label}
        aria-busy={bezig}
        onClick={() =>
          start(async () => {
            setFout(null);
            setAan(!aan);
            const uit = await zet(!aan);
            if (!uit.ok) setFout(uit.fout);
          })
        }
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border-2 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#e75387]/25 ${
          aan ? "border-[#0a7a4b] bg-[#0a7a4b] text-white" : "border-black/20 bg-white text-transparent hover:border-[#312e82]"
        }`}
      >
        <LuCheck className="text-[14px]" strokeWidth={3} />
      </button>
      <div className="min-w-0 flex-1">
        {children}
        {fout && <p role="alert" className="mt-1 text-[12.5px] font-medium text-[#b42318]">{fout}</p>}
      </div>
    </div>
  );
}
