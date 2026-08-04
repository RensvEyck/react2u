"use client";
import { useRef, useTransition } from "react";

const COLORS: Record<string, string> = {
  nieuw: "border-[#e0356b]/30 text-[#e0356b] bg-[#fdeef4]",
  in_behandeling: "border-[#c77700]/30 text-[#c77700] bg-[#fff4e5]",
  afgewezen: "border-black/15 text-black/55 bg-black/[0.04]",
  aangenomen: "border-[#0e9f8a]/30 text-[#0e9f8a] bg-[#e6f7f4]",
};

export default function StatusSelect({
  action, current, options,
}: {
  action: (formData: FormData) => Promise<void>;
  current: string;
  options: [string, string][];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form ref={formRef} action={action}>
      <select
        name="status"
        defaultValue={current}
        disabled={pending}
        onChange={() => startTransition(() => formRef.current?.requestSubmit())}
        className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold outline-none transition ${COLORS[current] || COLORS.nieuw} ${pending ? "opacity-50" : ""}`}
      >
        {options.map(([val, label]) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </select>
    </form>
  );
}
