"use client";
import Link from "next/link";
import { LuUserRoundCheck } from "react-icons/lu";
import type { DekkingPil } from "@/lib/waarneming";

/**
 * Op de klantkaart en de bordkaart (0057): wie er nu, of straks, voor deze
 * klant is zolang de eigen casemanager er niet is. Oranje als er nog geen
 * waarnemer is. Op het bord stopt de klik, anders opent de kaart het paneel.
 */
export default function WaarnemingPil({ pil, klein = false, stopKlik = false }: { pil: DekkingPil; klein?: boolean; stopKlik?: boolean }) {
  const kleur = pil.soort === "open" ? "bg-[#fff4e5] text-[#b86e00]" : pil.soort === "nu" ? "bg-[#e6f6ee] text-[#1b7f4b]" : "bg-[#eef0ff] text-[#312e82]";
  return (
    <Link
      href={`/admin/waarneming/${pil.id}`}
      onClick={stopKlik ? (e) => e.stopPropagation() : undefined}
      onKeyDown={stopKlik ? (e) => e.stopPropagation() : undefined}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full font-semibold hover:underline ${kleur} ${klein ? "px-2 py-0.5 text-[11.5px]" : "px-2.5 py-1 text-[12.5px]"}`}
      data-waarneming-pil={pil.soort}
      title="Waarneming"
    >
      <LuUserRoundCheck className="shrink-0" aria-hidden /> <span className="truncate">{pil.tekst}</span>
    </Link>
  );
}
