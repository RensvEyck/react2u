import Tabs from "./Tabs";

/** Tabs bovenaan de SEO-schermen. `open404` toont hoeveel 404's wachten. */
export default function SeoTabs({ active, open404 }: { active: "overzicht" | "doorverwijzingen"; open404?: number }) {
  return (
    <Tabs
      label="SEO-onderdelen"
      active={active}
      tabs={[
        { key: "overzicht", label: "Titels & omschrijvingen", href: "/admin/seo" },
        { key: "doorverwijzingen", label: "Doorverwijzingen", href: "/admin/seo/doorverwijzingen", badge: open404 },
      ]}
    />
  );
}
