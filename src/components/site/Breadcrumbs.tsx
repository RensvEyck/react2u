import Link from "next/link";
import { LuChevronLeft, LuChevronRight, LuHouse } from "react-icons/lu";

/**
 * Kruimelpad boven aan een pagina. "Home" staat er altijd voor; het laatste
 * item is de huidige pagina en geen link. Op een telefoon alleen een stap
 * terug ("‹ Diensten"): het volledige pad brak daar over twee regels. De
 * structured data (BreadcrumbList) zet de pagina zelf, via `breadcrumbLd()`.
 */
export default function Breadcrumbs({
  crumbs, className = "",
}: {
  crumbs: { label: string; href: string }[];
  className?: string;
}) {
  if (!crumbs.length) return null;
  const terug = crumbs.length > 1 ? crumbs[crumbs.length - 2] : { label: "Home", href: "/" };
  return (
    <nav aria-label="Kruimelpad" className={className}>
      <Link href={terug.href} className="inline-flex items-center gap-1 text-[14.5px] font-medium opacity-80 hover:opacity-100 sm:hidden">
        <LuChevronLeft className="text-[16px]" aria-hidden /> {terug.label}
      </Link>
      <ol className="hidden flex-wrap items-center gap-x-1.5 gap-y-1 text-[14px] font-medium sm:flex">
        <li>
          <Link href="/" className="flex items-center opacity-75 transition-opacity hover:opacity-100">
            <LuHouse className="text-[15px]" aria-hidden />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.href + i} className="flex items-center gap-1.5">
              <LuChevronRight className="text-[13px] opacity-50" aria-hidden />
              {last ? (
                <span aria-current="page">{c.label}</span>
              ) : (
                <Link href={c.href} className="opacity-75 transition-opacity hover:opacity-100">{c.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
