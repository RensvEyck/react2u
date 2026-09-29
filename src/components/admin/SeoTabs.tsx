import Link from "next/link";

/** Tabs bovenaan de SEO-schermen. `open404` toont hoeveel 404's wachten. */
export default function SeoTabs({ active, open404 }: { active: "overzicht" | "doorverwijzingen"; open404?: number }) {
  const tabs = [
    { key: "overzicht", label: "Titels & omschrijvingen", href: "/admin/seo" },
    { key: "doorverwijzingen", label: "Doorverwijzingen", href: "/admin/seo/doorverwijzingen", badge: open404 },
  ] as const;
  return (
    <nav className="flex gap-1 border-b border-black/[0.08]" aria-label="SEO-onderdelen">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={isActive ? "page" : undefined}
            className={`-mb-px flex items-center gap-2 border-b-2 px-3.5 pb-3 pt-1 text-[14px] font-semibold transition ${
              isActive ? "border-[#e75387] text-[#312e82]" : "border-transparent text-black/45 hover:text-[#312e82]"
            }`}
          >
            {t.label}
            {"badge" in t && t.badge ? (
              <span className="rounded-full bg-[#e75387] px-1.5 py-px text-[11px] font-bold text-white">{t.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
