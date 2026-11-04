import { LuArrowDown, LuArrowUp, LuCheck, LuMinus } from "react-icons/lu";
import type { Oordeel } from "@/lib/uren";

/** Declarabiliteit tegenover de norm: kleur, een teken en de woorden in de titel, nooit alleen kleur. */
const STIJL: Record<Oordeel, { cls: string; tekst: string; Icoon: typeof LuCheck }> = {
  boven: { cls: "bg-[#e3f6ed] text-[#0a7a4b]", tekst: "boven de norm", Icoon: LuArrowUp },
  op: { cls: "bg-[#e3f6ed] text-[#0a7a4b]", tekst: "op de norm", Icoon: LuCheck },
  "net-onder": { cls: "bg-[#fff4e5] text-[#b25e09]", tekst: "net onder de norm", Icoon: LuMinus },
  onder: { cls: "bg-[#fdecea] text-[#b42318]", tekst: "onder de norm", Icoon: LuArrowDown },
};

export function OordeelPil({ procent, oordeel, klein }: { procent: number; oordeel: Oordeel | null; klein?: boolean }) {
  const s = oordeel ? STIJL[oordeel] : null;
  return (
    <span
      className={`relative inline-flex items-center gap-0.5 rounded-full font-semibold tabular-nums ${klein ? "px-1.5 py-0 text-[11px]" : "px-2 py-0.5 text-[12px]"} ${s?.cls ?? "bg-black/[0.05] text-black/55"}`}
      title={s ? `${procent}% declarabel, ${s.tekst}` : `${procent}% declarabel`}
    >
      {s && <s.Icoon className="text-[10px]" aria-hidden />}
      {procent}%
      {s && <span className="sr-only">, {s.tekst}</span>}
    </span>
  );
}
