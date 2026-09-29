import Link from "next/link";
import { kleurVars } from "@/lib/brand";
import { Arrow } from "./DotCloud";

export type Pill = { label: string; href: string; kleur?: string };

/**
 * Linktegels als pil, met een rond pijlknopje — de "oplossingen"-tegels van
 * Acture. Elke tegel draagt de kleur van zijn dienst.
 */
export default function Pills({ items, className = "" }: { items: Pill[]; className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-3 ${className}`}>
      {items.map((it, i) => (
        <li key={`${it.href}-${i}`} style={{ ...kleurVars(it.kleur), "--ri": i % 8 } as React.CSSProperties} data-reveal>
          <Link href={it.href}
            className="group inline-flex items-center gap-4 rounded-full bg-[var(--k-zacht)] py-2 pl-6 pr-2 text-[16.5px] font-semibold text-primary transition-colors duration-300 hover:bg-[var(--k)] hover:text-white">
            {it.label}
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[var(--k)] shadow-[0_2px_8px_-4px_rgba(34,32,90,0.35)] transition-transform duration-300 group-hover:translate-x-0.5">
              <Arrow />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
