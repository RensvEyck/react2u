import { LuCircleCheck } from "react-icons/lu";

export const fieldClass =
  "w-full rounded-lg border border-[#8480ab] bg-white px-4 py-3 text-[16px] text-primary outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-black/40 hover:border-primary/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(49,46,130,0.12)]";

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

/** Bevestiging na een geslaagde inzending. */
export function Bedankt({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="flex gap-4 rounded-xl border border-line bg-white p-6 text-primary">
      <LuCircleCheck className="mt-0.5 shrink-0 text-[24px] text-primary" aria-hidden />
      <p className="font-medium">{children}</p>
    </div>
  );
}
