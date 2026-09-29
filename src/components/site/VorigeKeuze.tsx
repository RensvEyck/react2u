"use client";
import { useBewaardeDoelgroep } from "@/lib/doelgroep";
import type { Doelgroep } from "@/lib/nav";

/**
 * "Je vorige keuze" op het startscherm, bij de route die de bezoeker de vorige
 * keer koos. Leest alleen de browser (lib/doelgroep.ts); op de server en bij
 * een eerste bezoek toont hij niets.
 */
export default function VorigeKeuze({ doelgroep }: { doelgroep?: string }) {
  const bewaard = useBewaardeDoelgroep();
  if (!doelgroep || bewaard !== (doelgroep as Doelgroep)) return null;
  return (
    <span className="inline-flex items-center rounded-md bg-soft px-2 py-0.5 text-[12.5px] font-semibold text-primary">
      Je vorige keuze
    </span>
  );
}
