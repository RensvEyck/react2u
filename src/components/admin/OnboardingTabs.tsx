import Link from "next/link";
import { LuBuilding2, LuUsers } from "react-icons/lu";

/**
 * De splitsing in het beheer (Rens, 16 nov 2026): één feature Onboarding in
 * de zijbalk, met twee delen. Werkgever is de hele onboarding van de klant
 * (documenten, werknemersbestand, inrichten), zonder de machtiging van arbo
 * naar arbo. Werknemer is die machtiging: React2u vult de vorige arbodienst
 * in, de werknemers tekenen online met IP-registratie, en React2u verstuurt
 * namens de werkgever de opdracht. Dezelfde tabs boven het register en boven
 * één onboarding.
 */
export default function OnboardingTabs({ actief, werkgever, werknemer, telling }: { actief: "werkgever" | "werknemer"; werkgever: string; werknemer: string; telling?: string }) {
  const tab = (href: string, aan: boolean, icoon: React.ReactNode, label: string, sub?: string) => (
    <Link
      href={href}
      aria-current={aan ? "page" : undefined}
      className={`inline-flex items-center gap-2.5 rounded-[12px] px-4 py-2.5 text-[14px] font-semibold transition-colors ${aan ? "bg-[#312e82] text-white shadow-[0_6px_16px_-8px_rgba(49,46,130,0.6)]" : "text-black/60 hover:bg-black/[0.05] hover:text-[#1c1a4e]"}`}
    >
      <span className={`text-[16px] ${aan ? "text-white/80" : "text-black/40"}`}>{icoon}</span>
      <span>{label}</span>
      {sub && <span className={`text-[12px] font-medium ${aan ? "text-white/65" : "text-black/40"}`}>{sub}</span>}
    </Link>
  );
  return (
    <nav aria-label="Onboarding: werkgever of werknemer" className="inline-flex flex-wrap gap-1 rounded-[14px] bg-black/[0.04] p-1">
      {tab(werkgever, actief === "werkgever", <LuBuilding2 />, "Werkgever")}
      {tab(werknemer, actief === "werknemer", <LuUsers />, "Werknemer", telling)}
    </nav>
  );
}
