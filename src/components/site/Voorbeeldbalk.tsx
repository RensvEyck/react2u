import { stopVoorbeeld } from "./voorbeeldActie";
import type { Taal } from "@/lib/taal";

const TEKST: Record<Taal, { uitleg: string; stop: string }> = {
  nl: { uitleg: "Voorbeeldmodus: je ziet ook de vacatures die nog concept zijn. Bezoekers zien alleen wat gepubliceerd is.", stop: "Voorbeeld sluiten" },
  en: { uitleg: "Preview mode: you also see vacancies that are still drafts. Visitors only see what is published.", stop: "Close preview" },
};

/**
 * Vaste balk onderaan de site zolang de voorbeeldmodus aan staat (zie
 * src/lib/voorbeeld.ts), zodat een beheerder nooit vergeet dat hij concepten ziet.
 */
export default function Voorbeeldbalk({ taal }: { taal: Taal }) {
  const t = TEKST[taal];
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-[60] flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-3 text-[14px] text-white shadow-[0_-8px_24px_rgba(0,0,0,0.18)]"
      style={{ background: "#E61674", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
      <span className="font-semibold" style={{ color: "#ffffff" }}>{t.uitleg}</span>
      <form action={stopVoorbeeld}>
        <button type="submit" className="rounded-full bg-white px-4 py-1.5 text-[13.5px] font-bold" style={{ color: "#322E83" }}>{t.stop}</button>
      </form>
    </div>
  );
}
