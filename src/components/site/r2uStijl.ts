import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { doelgroepVoorPad, type Doelgroep } from "@/lib/nav";
import { bewaarDoelgroep, useBewaardeDoelgroep } from "@/lib/doelgroep";
import type { ContactInfo } from "@/lib/content";

/*
 * Gedeeld door HeaderR2u en FooterR2u (het nieuwe ontwerp, alleen op staging):
 * letter, kleuren (exact uit het logo), welke variant er geldt en de menu's per doelgroep.
 */

/** Letter van header en footer: DM Sans (uit de root-layout), zoals in het ontwerp. */
export const letter = { className: "r2u-dm" };

export const K = {
  indigo: "#322E83",
  magenta: "#E61674",
  magentaDonker: "#C40F60",
  ivoor: "#F8F5F1",
  tekst2: "#55518A",
  klein: "#6D6A92",
  lijn: "#E6E5EF",
  zacht: "#F3F1FA",
  roze: "#FCE9F0",
  lila: "#D6D2F7",
  rozeLicht: "#FFE3EC",
} as const;

/** Neutraal op `/` en op gedeelde pagina's zonder keuze; anders de doelgroep. */
export type Variant = "neutraal" | Doelgroep;

export function useVariant({ bewaar = false }: { bewaar?: boolean } = {}): Variant {
  const path = usePathname() || "/";
  const vast = path === "/" ? null : doelgroepVoorPad(path);
  const bewaard = useBewaardeDoelgroep();
  useEffect(() => {
    if (bewaar && vast) bewaarDoelgroep(vast);
  }, [bewaar, vast]);
  if (path === "/") return "neutraal";
  return vast ?? bewaard ?? "neutraal";
}

/** "085 - 620 58 00" wordt "085 620 58 00", zoals in het ontwerp. */
export function telefoon(c: ContactInfo) {
  return c.phoneDisplay.replace(/\s*[-–]\s*/g, " ");
}

export type Link2 = { label: string; href: string; sub?: string; kleur?: string; items?: Link2[] };

/** De vijf labels, voor het uitklapmenu Diensten. Elk label heeft zijn eigen kleur. */
export const DIENSTEN: Link2[] = [
  { label: "React2u Resist", sub: "Preventie en vitaliteit", href: "/resist", kleur: "#00A098" },
  { label: "React2u Recover", sub: "Verzuimbegeleiding", href: "/recover", kleur: "#E61674" },
  { label: "React2u Restart", sub: "Re-integratie en loopbaan", href: "/restart", kleur: "#F19001" },
  { label: "React2u Reflex", sub: "Flexbranche en Ziektewet", href: "/reflex", kleur: "#3AA5DD" },
  { label: "React2u Ready", sub: "HR en arbeidsrecht", href: "/ready", kleur: "#322E83" },
];

export const OVER_ONS: Link2[] = [
  { label: "Over React2u", href: "/over-react2u" },
  { label: "Werken bij", href: "/vacatures" },
  { label: "Blog", href: "/blog" },
];

/** De dunne balk bovenaan, rechts. */
export const TOPLINKS: Link2[] = [
  { label: "Over ons", href: "/over-react2u" },
  { label: "Werken bij", href: "/vacatures" },
  { label: "Contact", href: "/contact" },
];

/** Het hoofdmenu van de neutrale header (startpagina en gedeelde pagina's). */
export const MENU_NEUTRAAL: (Link2 & { overOns?: boolean })[] = [
  { label: "Werkgevers", href: "/werkgevers" },
  { label: "Werknemers", href: "/werknemers" },
  { label: "Over ons", href: "/over-react2u", overOns: true },
  { label: "Contact", href: "/contact" },
];

/**
 * Inloggen (portalen). Leeg tot de adressen bekend zijn: zonder adres
 * verschijnt de knop niet, zodat er geen dode link op de site staat.
 */
export const PORTALEN: Record<"neutraal" | Doelgroep, Link2[]> = {
  neutraal: [],
  werkgever: [],
  werknemer: [],
};

/** Het pill-menu per doelgroep. Ankers met pad ervoor, zodat ze ook van elders werken. */
export const MENU: Record<Doelgroep, Link2[]> = {
  werkgever: [
    { label: "Diensten", href: "/werkgevers#diensten", items: DIENSTEN },
    { label: "Werkwijze", href: "/werkgevers#werkwijze" },
    { label: "Tarieven", href: "/werkgevers#tarieven" },
    { label: "Overstappen", href: "/werkgevers#starten" },
    { label: "Vragen", href: "/werkgevers#vragen" },
  ],
  werknemer: [
    { label: "Ziek, wat nu?", href: "/werknemers#wat-nu" },
    { label: "Je rechten", href: "/werknemers#rechten" },
    { label: "Hulp bij herstel", href: "/werknemers#casemanager" },
    { label: "Vragen", href: "/werknemers#vragen" },
  ],
};

/** Rechts in de header: een tweede link en de hoofdknop. */
export const KNOPPEN: Record<"neutraal" | Doelgroep, Link2> = {
  neutraal: { label: "Kennismaken", href: "/contact" },
  werkgever: { label: "Kennismaken", href: "/werkgevers#offerte" },
  werknemer: { label: "Bel je casemanager", href: "tel:" },
};

export const SITE: Record<Doelgroep, { href: string; naam: string; sub: string }> = {
  werkgever: { href: "/werkgevers", naam: "werkgevers", sub: "Grip op verzuim, van preventie tot re-integratie." },
  werknemer: { href: "/werknemers", naam: "werknemers", sub: "Ziek of vastgelopen? We helpen je weer op weg." },
};
