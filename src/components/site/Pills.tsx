import Link from "next/link";
import { kleurVars } from "@/lib/brand";
import { Arrow } from "./DotCloud";

export type Pill = { label: string; href: string; kleur?: string };

/**
 * Links als label met een gekleurde stip ervoor — de stippen uit het logo. De
 * stip draagt de kleur van de pijler waar de dienst bij hoort.
 */
export default function Pills({ items, className = "" }: { items: Pill[]; className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-2.5 ${className}`}>
      {items.map((it, i) => (
        <li key={`${it.href}-${i}`} style={{ ...kleurVars(it.kleur), "--ri": i % 8 } as React.CSSProperties} data-reveal>
          <Link href={it.href}
            className="group inline-flex items-center gap-2.5 rounded-full border border-black/[0.08] bg-white py-2.5 pl-4 pr-5 text-[16px] font-semibold text-primary transition-[border-color,box-shadow] duration-300 hover:border-[var(--k-vlak)] hover:shadow-[0_8px_20px_-14px_rgba(34,32,90,0.5)]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--k-vlak)]" aria-hidden />
            {it.label}
            <Arrow className="text-[var(--k)] transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
