"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LuCircleCheck, LuCircleAlert } from "react-icons/lu";

// Elke `redirect(...?fout=x)` in de server actions hoort hier een tekst te
// hebben. Ontbreekt er één, dan krijgt de gebruiker "Er ging iets mis" en moet
// hij raden — precies het geval waarin je juist wilt weten wát er scheelt.
const FOUT_TEKST: Record<string, string> = {
  json: "Opslaan mislukt — ongeldige invoer.",
  "titel-of-slug": "Vul een titel en URL-slug in.",
  "slug-bestaat-al": "Er bestaat al een pagina met deze URL-slug.",
  naam: "Vul een naam in.",
  onvolledig: "Vul een e-mailadres in en kies een rol.",
  "geen-sleutel":
    "Uitnodigen staat uit: SUPABASE_SERVICE_ROLE_KEY ontbreekt in Vercel.",
  uitnodigen:
    "Uitnodigen mislukt. Controleer of /admin/uitnodiging bij de Redirect URLs in Supabase staat.",
  "laatste-beheerder":
    "Geweigerd: er moet minstens één gebruiker overblijven die rollen mag beheren.",
  jezelf: "Je kunt je eigen toegang niet intrekken.",
  systeemrol: "De vaste rol kan niet verwijderd worden.",
  "rol-in-gebruik": "Deze rol is nog aan iemand gekoppeld — verplaats die eerst.",
  "rol-bestaat-al": "Er bestaat al een rol met deze naam.",
  "geen-rechten": "Je hebt geen toegang tot dat onderdeel.",
  "cv-verwijderen": "Het cv kon niet verwijderd worden — de sollicitatie staat er nog.",
  opslaan: "Opslaan mislukt.",
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
