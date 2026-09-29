import Tabs from "./Tabs";

/** Tabs bovenaan de bezoekschermen. `warm` toont hoeveel warme bedrijven er zijn. */
export default function BezoekTabs({ active, warm }: { active: "overzicht" | "bedrijven"; warm?: number }) {
  return (
    <Tabs
      label="Bezoek-onderdelen"
      active={active}
      tabs={[
        { key: "overzicht", label: "Overzicht", href: "/admin/bezoek" },
        { key: "bedrijven", label: "Bedrijven", href: "/admin/bezoek/bedrijven", badge: warm },
      ]}
    />
  );
}
