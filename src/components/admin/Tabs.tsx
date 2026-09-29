import Link from "next/link";

export type Tab = { key: string; label: string; href: string; badge?: number };

/** Tabs bovenaan een scherm met onderdelen, zoals SEO en Bezoek. */
export default function Tabs({ tabs, active, label }: { tabs: Tab[]; active: string; label: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-black/[0.08]" aria-label={label}>
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={isActive ? "page" : undefined}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3.5 pb-3 pt-1 text-[14px] font-semibold transition ${
              isActive ? "border-[#e75387] text-[#312e82]" : "border-transparent text-black/45 hover:text-[#312e82]"
            }`}
          >
            {t.label}
            {t.badge ? <span className="rounded-full bg-[#e75387] px-1.5 py-px text-[11px] font-bold text-white">{t.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
