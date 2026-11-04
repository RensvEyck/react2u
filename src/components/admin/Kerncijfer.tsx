import Link from "next/link";
import { LuDatabase, LuTrendingDown, LuTrendingUp } from "react-icons/lu";

/**
 * Eén kerncijfer bovenaan een overzicht (salesdashboard, omzet), in de stijl
 * van die op /admin/offertes, met een optionele vergelijking (+12% t.o.v. …).
 */
export function Kerncijfer({
  label, waarde, achter, sub, href, accent, verschil,
}: {
  label: string;
  waarde: string;
  achter?: string;
  sub?: string;
  href?: string;
  accent?: boolean;
  /** Verandering in procenten, met waartegen ("t.o.v. vorige maand"). */
  verschil?: { procent: number; tegen: string } | null;
}) {
  const inhoud = (
    <>
      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-black/45">{label}</p>
      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
        <span className={`font-heading text-[26px] font-bold leading-none tabular-nums sm:text-[28px] ${accent ? "text-[#0a7a4b]" : "text-[#1c1a4e]"}`}>{waarde}</span>
        {achter && <span className="text-[13px] text-black/40">{achter}</span>}
      </p>
      {verschil && (
        <p className={`mt-1.5 flex items-center gap-1 text-[12.5px] font-medium ${verschil.procent >= 0 ? "text-[#0a7a4b]" : "text-[#b25e09]"}`}>
          {verschil.procent >= 0 ? <LuTrendingUp className="text-[13px]" /> : <LuTrendingDown className="text-[13px]" />}
          {verschil.procent >= 0 ? "+" : ""}{verschil.procent}% {verschil.tegen}
        </p>
      )}
      {sub && <p className="mt-1 text-[12.5px] leading-snug text-black/45">{sub}</p>}
    </>
  );
  const cls = `acard block p-5 ${accent ? "!border-[#0a7a4b]/20 bg-[#f3fbf7]" : ""}`;
  return href ? <Link href={href} className={`${cls} transition hover:-translate-y-0.5 hover:shadow-lg`}>{inhoud}</Link> : <div className={cls}>{inhoud}</div>;
}

/** Procentuele verandering, of null als er niets was om mee te vergelijken. */
export function verandering(nu: number, toen: number | null | undefined): number | null {
  if (!toen || toen <= 0) return null;
  return Math.round(((nu - toen) / toen) * 100);
}

/** De melding zolang een migratie nog niet gedraaid is. */
export function MigratieNodig({ bestand, wat }: { bestand: string; wat: string }) {
  return (
    <div className="acard flex items-start gap-4 p-6">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef0ff] text-[18px] text-[#312e82]"><LuDatabase /></span>
      <div>
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Nog één stap: de database bijwerken</h2>
        <p className="mt-1 text-[14px] text-black/55">
          {wat} Voer <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[13px]">supabase/migrations/{bestand}</code> uit in Supabase.
        </p>
      </div>
    </div>
  );
}
