import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import { doelgroepVoorPad, type Doelgroep } from "@/lib/nav";
import { bewaarDoelgroep, useBewaardeDoelgroep } from "@/lib/doelgroep";
import type { ContactInfo } from "@/lib/content";

/*
 * Gedeeld door HeaderR2u en FooterR2u (het nieuwe ontwerp, alleen op staging):
 * letter, kleuren, welke variant er geldt en de menu's per doelgroep.
 */

export const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const K = {
  indigo: "#2A2677",
  magenta: "#C8306A",
  ivoor: "#F8F5F1",
  tekst2: "#55518A",
  klein: "#6D6A92",
  lijn: "#E4E0F4",
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

export type Link2 = { label: string; href: string; sub?: string };

export const OVER_ONS: Link2[] = [
  { label: "Over React2u", href: "/over-react2u", sub: "Wie we zijn en hoe we werken" },
  { label: "Werken bij", href: "/vacatures", sub: "Vacatures en open sollicitatie" },
  { label: "Blog", href: "/blog", sub: "Nieuws en achtergrond over verzuim" },
];

/** Het pill-menu per doelgroep. Ankers met pad ervoor, zodat ze ook van elders werken. */
export const MENU: Record<Doelgroep, Link2[]> = {
  werkgever: [
    { label: "Diensten", href: "/werkgevers#diensten" },
    { label: "Werkwijze", href: "/werkgevers#werkwijze" },
    { label: "ERD en Ziektewet", href: "/werkgevers#erd" },
    { label: "Tarieven", href: "/werkgevers#tarieven" },
    { label: "Vragen", href: "/werkgevers#vragen" },
  ],
  werknemer: [
    { label: "Ziek, wat nu?", href: "/werknemers#wat-nu" },
    { label: "Verzuimperiode", href: "/werknemers#tijdlijn" },
    { label: "Je rechten", href: "/werknemers#rechten" },
    { label: "Privacy", href: "/werknemers#privacy" },
    { label: "Casemanager", href: "/werknemers#casemanager" },
    { label: "Vragen", href: "/werknemers#vragen" },
  ],
};

/** Rechts in de header: een tweede link en de hoofdknop. */
export const KNOPPEN: Record<Doelgroep, { tweede: Link2; hoofd: Link2 & { kort: string } }> = {
  werkgever: {
    tweede: { label: "Medewerker ziek melden", href: "/werkgevers#werkwijze" },
    hoofd: { label: "Offerte aanvragen", kort: "Offerte", href: "/werkgevers#offerte" },
  },
  werknemer: {
    tweede: { label: "Contact", href: "/werknemers#contact" },
    hoofd: { label: "Ziek melden", kort: "Ziek melden", href: "/werknemers#ziekmelden" },
  },
};

export const SITE: Record<Doelgroep, { href: string; naam: string; sub: string }> = {
  werkgever: { href: "/werkgevers", naam: "werkgevers", sub: "Grip op verzuim, van preventie tot re-integratie." },
  werknemer: { href: "/werknemers", naam: "werknemers", sub: "Ziek of vastgelopen? We helpen je weer op weg." },
};
