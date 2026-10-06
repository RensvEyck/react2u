import { LuCircleCheck, LuExternalLink } from "react-icons/lu";
import { bevestigdNaarTekst } from "@/lib/bevestiging";

export const fieldClass =
  "w-full rounded-lg border border-[#8480ab] bg-white px-4 py-3 text-[16px] text-primary outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-bijtekst hover:border-primary/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(49,46,130,0.12)]";

/**
 * Een formulierveld met een zichtbaar label. Alleen een placeholder is niet
 * genoeg: die verdwijnt zodra je typt, en schermlezers lezen hem niet overal
 * voor.
 */
export function Field({
  label, optional, children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-[14.5px] font-semibold text-primary">
        {label}
        {optional && <span className="text-[13px] font-normal text-body">optioneel</span>}
      </span>
      {children}
    </label>
  );
}

/**
 * Bevestiging na een geslaagde inzending: wat er nu gebeurt (dezelfde tekst
 * als in de bevestigingsmail, lib/bevestiging.ts), eventueel een knop en waar
 * de bevestiging per mail heen is.
 */
export function Bedankt({
  kop, children, knop, naar,
}: {
  kop?: string;
  children: React.ReactNode;
  knop?: { label: string; href: string };
  /** E-mailadres waar een bevestiging heen is; alleen als die echt verstuurd is. */
  naar?: string;
}) {
  return (
    <div role="status" className="flex gap-4 rounded-xl border border-line bg-white p-6 text-primary">
      <LuCircleCheck className="mt-0.5 shrink-0 text-[24px] text-primary" aria-hidden />
      <div className="space-y-3">
        {kop && <p className="font-heading text-[20px] font-bold leading-tight">{kop}</p>}
        <p className="font-medium">{children}</p>
        {knop && (
          <a href={knop.href} target="_blank" rel="noopener" className="btn btn-sm">
            {knop.label} <LuExternalLink aria-hidden className="text-[15px]" />
          </a>
        )}
        {naar && <p className="text-[14px] text-body">{bevestigdNaarTekst(naar)}</p>}
      </div>
    </div>
  );
}
