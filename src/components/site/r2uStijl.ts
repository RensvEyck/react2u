import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { doelgroepVoorPad, type Doelgroep } from "@/lib/nav";
import { bewaarDoelgroep, useBewaardeDoelgroep } from "@/lib/doelgroep";
import { isStart, pad, telefoonInTaal, type Taal } from "@/lib/taal";
import { woordenboek } from "@/lib/woordenboek";
import type { ContactInfo } from "@/lib/content";

/*
 * Gedeeld door HeaderR2u en FooterR2u (het nieuwe ontwerp, op staging en op de
 * Engelse site): letter, kleuren (exact uit het logo), welke variant er geldt
 * en de menu's per doelgroep en per taal. De teksten komen uit het woordenboek
 * (lib/woordenboek), de adressen uit de koppeltabel (lib/taal.ts).
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

/** Neutraal op `/` (en `/en`) en op gedeelde pagina's zonder keuze; anders de doelgroep. */
export type Variant = "neutraal" | Doelgroep;

export function useVariant({ bewaar = false }: { bewaar?: boolean } = {}): Variant {
  const path = usePathname() || "/";
  const start = isStart(path);
  const vast = start ? null : doelgroepVoorPad(path);
  const bewaard = useBewaardeDoelgroep();
  useEffect(() => {
    if (bewaar && vast) bewaarDoelgroep(vast);
  }, [bewaar, vast]);
  if (start) return "neutraal";
  return vast ?? bewaard ?? "neutraal";
}

/** "085 - 620 58 00" wordt "085 620 58 00", zoals in het ontwerp; in het Engels "+31 85 620 58 00". */
export function telefoon(c: ContactInfo, taal: Taal = "nl") {
  return telefoonInTaal(c.phoneDisplay, taal);
}

export type Link2 = { label: string; href: string; sub?: string; kleur?: string; items?: Link2[] };

export type Menus = {
  /** De vijf labels, voor het uitklapmenu Diensten. Elk label heeft zijn eigen kleur. */
  DIENSTEN: Link2[];
  OVER_ONS: Link2[];
  /** De dunne balk bovenaan, rechts. */
  TOPLINKS: Link2[];
  /** Het hoofdmenu van de neutrale header (startpagina en gedeelde pagina's). */
  MENU_NEUTRAAL: (Link2 & { overOns?: boolean })[];
  /** Het pill-menu per doelgroep. Ankers met pad ervoor, zodat ze ook van elders werken. */
  MENU: Record<Doelgroep, Link2[]>;
  /** Rechts in de header: de hoofdknop. `href: "tel:"` wordt het telefoonnummer uit de instellingen. */
  KNOPPEN: Record<Variant, Link2>;
  /** Inloggen (portalen). */
  PORTALEN: Record<Variant, Link2[]>;
  SITE: Record<Doelgroep, { href: string; naam: string; label: string }>;
};

/** Beide portalen draaien in XpertSuite; /inloggen legt het uit. */
const XPERTSUITE = "https://login.xpertsuite.nl/Account/LogOn";

/**
 * De menu's in een taal. Een Engelse pagina die er nog niet is, krijgt via
 * pad() het Nederlandse adres: beter een Nederlandse pagina dan een 404.
 */
export function menus(taal: Taal): Menus {
  const t = woordenboek(taal).header;
  const link = (l: { label: string; slug: string; anker?: string; sub?: string; kleur?: string }): Link2 => ({
    label: l.label,
    href: pad(taal, l.slug, l.anker),
    ...(l.sub ? { sub: l.sub } : {}),
    ...(l.kleur ? { kleur: l.kleur } : {}),
  });
  const DIENSTEN = t.diensten.map((d) => link({ label: `React2u ${d.naam}`, slug: d.slug, sub: d.sub, kleur: d.kleur }));
  const perDoelgroep = (items: typeof t.menuWerkgever): Link2[] =>
    items.map((l) => ({ ...link(l), ...(l.diensten ? { items: DIENSTEN } : {}) }));
  const knop = (k: { label: string; slug: string }): Link2 => (k.slug === "tel:" ? { label: k.label, href: "tel:" } : link(k));
  const werkgeversportaal: Link2 = { ...t.portalen.werkgever, href: XPERTSUITE };
  const mijnDossier: Link2 = { ...t.portalen.werknemer, href: XPERTSUITE };
  return {
    DIENSTEN,
    OVER_ONS: t.overOns.map(link),
    TOPLINKS: t.toplinks.map(link),
    MENU_NEUTRAAL: t.menuNeutraal.map((l) => ({ ...link(l), ...(l.overOns ? { overOns: true } : {}) })),
    MENU: { werkgever: perDoelgroep(t.menuWerkgever), werknemer: perDoelgroep(t.menuWerknemer) },
    KNOPPEN: { neutraal: knop(t.knop.neutraal), werkgever: knop(t.knop.werkgever), werknemer: knop(t.knop.werknemer) },
    PORTALEN: { neutraal: [werkgeversportaal, mijnDossier], werkgever: [werkgeversportaal], werknemer: [mijnDossier] },
    SITE: {
      werkgever: { href: pad(taal, "werkgevers"), naam: t.doelgroepNaam.werkgever, label: t.werkgevers },
      werknemer: { href: pad(taal, "werknemers"), naam: t.doelgroepNaam.werknemer, label: t.werknemers },
    },
  };
}
