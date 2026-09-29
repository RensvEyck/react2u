import Breadcrumbs from "./Breadcrumbs";

/**
 * Kop voor pagina's die niet uit blokken bestaan (blog, vacatures): kruimelpad,
 * kop en intro op het neutrale vlak — dezelfde vormtaal als de hero-blokken.
 */
export default function PageHeader({
  crumbs = [], eyebrow, title, children, narrow = false,
}: {
  crumbs?: { label: string; href: string }[];
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <section data-tone="band" className="border-b border-line bg-soft">
      <div className={`container-site pb-14 pt-8 md:pb-20 md:pt-10 ${narrow ? "max-w-[900px]" : ""}`}>
        <Breadcrumbs crumbs={crumbs} className="mb-8 text-primary" />
        {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
        <h1 className="max-w-[860px] text-[2.25rem] font-bold leading-[1.08] tracking-[-0.025em] sm:text-[2.9rem] lg:text-[3.5rem]">
          {title}
        </h1>
        {children && <div className="mt-6 max-w-[680px] text-[18px] leading-relaxed md:text-[19px]">{children}</div>}
      </div>
    </section>
  );
}
