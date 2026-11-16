import Link from "next/link";
import { LuBuilding2, LuUsers } from "react-icons/lu";

/**
 * De splitsing in het beheer (Rens, 16 nov 2026: "maak in de admin een
 * splitsing onboarding klant en werknemer van klant"): links de onboarding van
 * de klant zelf (wat de klant aanlevert, wat React2u inricht), rechts de
 * werknemers van die klant (het werknemersbestand voor XpertSuite en de
 * machtigingen die zij tekenen). Dezelfde tabs boven het register en boven
 * één onboarding.
 */
export default function OnboardingTabs({ actief, klant, werknemers, telling }: { actief: "klant" | "werknemers"; klant: string; werknemers: string; telling?: string }) {
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
    <nav aria-label="Onboarding: klant of werknemers" className="inline-flex flex-wrap gap-1 rounded-[14px] bg-black/[0.04] p-1">
      {tab(klant, actief === "klant", <LuBuilding2 />, "Onboarding klant")}
      {tab(werknemers, actief === "werknemers", <LuUsers />, "Werknemers van klant", telling)}
    </nav>
  );
}
