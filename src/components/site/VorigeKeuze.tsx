"use client";
import { useBewaardeDoelgroep } from "@/lib/doelgroep";
import type { Doelgroep } from "@/lib/nav";

/**
 * "Je vorige keuze" op het startscherm, bij de route die de bezoeker de vorige
 * keer koos. Leest alleen de browser (lib/doelgroep.ts); op de server en bij
 * een eerste bezoek toont hij niets.
 */
export default function VorigeKeuze({ doelgroep, donker }: { doelgroep?: string; donker?: boolean }) {
  const bewaard = useBewaardeDoelgroep();
  if (!doelgroep || bewaard !== (doelgroep as Doelgroep)) return null;
  return (
    <span className={`pointer-events-none relative z-10 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold ${
      donker ? "bg-white/12 text-white" : "bg-white text-primary"
    }`}>
      <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden />
      Je vorige keuze
    </span>
  );
}
