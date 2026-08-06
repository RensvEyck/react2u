"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LuCircleCheck, LuCircleAlert } from "react-icons/lu";

const FOUT_TEKST: Record<string, string> = {
  json: "Opslaan mislukt — ongeldige invoer.",
  "titel-of-slug": "Vul een titel en URL-slug in.",
  "slug-bestaat-al": "Er bestaat al een pagina met deze URL-slug.",
};

export default function Toast() {
  const params = useSearchParams();
  const ok = params.get("opgeslagen");
  const fout = params.get("fout");
  // Zichtbaarheid wordt afgeleid, niet gezet. Zou een effect hier setState
  // doen, dan volgt er een tweede render op elke navigatie — en flikkert de
  // melding bij het terugkomen op dezelfde pagina. Nu onthouden we alleen
  // wélke melding is weggetikt; alles daarbuiten volgt daaruit.
  const [dismissed, setDismissed] = useState<string | null>(null);
  const key = ok || fout ? `${ok ?? ""}|${fout ?? ""}` : null;
  const visible = key !== null && dismissed !== key;

  useEffect(() => {
    if (!key) return;
    const t = setTimeout(() => setDismissed(key), 3800);
    return () => clearTimeout(t);
  }, [key]);

  if (!visible) return null;
  const isOk = !!ok && !fout;
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[100] animate-[fadeIn_0.2s_ease-out]">
      <div className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 text-[14.5px] font-semibold text-white shadow-xl ${isOk ? "bg-[#0e9f8a]" : "bg-[#e0356b]"}`}>
        {isOk ? <LuCircleCheck className="text-lg" /> : <LuCircleAlert className="text-lg" />}
        {isOk ? "Opgeslagen — de site is bijgewerkt." : FOUT_TEKST[fout || ""] || "Er ging iets mis."}
      </div>
    </div>
  );
}
