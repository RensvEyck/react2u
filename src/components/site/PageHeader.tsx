import Breadcrumbs from "./Breadcrumbs";
import DotCloud from "./DotCloud";

/**
 * Kop voor pagina's die niet uit blokken bestaan (blog, vacatures, 404): een
 * lichte band die onder de zwevende header doorloopt, met kruimelpad, kop en
 * intro. Dezelfde vormtaal als het hero-blok, zonder beeld.
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
    <section className="hero-pull relative isolate overflow-hidden bg-soft">
      <DotCloud className="pointer-events-none absolute -right-10 top-1/2 -z-10 hidden w-[340px] -translate-y-1/3 opacity-[0.14] md:block" />
      <div className={`container-site pb-14 pt-8 md:pb-20 md:pt-12 ${narrow ? "max-w-[900px]" : ""}`}>
        <Breadcrumbs crumbs={crumbs} className="mb-8 text-primary" />
        {eyebrow && <p className="eyebrow mb-4" data-reveal>{eyebrow}</p>}
        <h1 className="max-w-[860px] text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.025em] md:text-[3.5rem]" data-reveal>
          {title}
        </h1>
        {children && <div className="mt-6 max-w-[680px] text-[19px] md:text-[20px]" data-reveal>{children}</div>}
      </div>
    </section>
  );
}
