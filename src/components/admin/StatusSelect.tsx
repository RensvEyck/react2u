"use client";
import { useRef, useTransition } from "react";

const COLORS: Record<string, string> = {
  nieuw: "border-[#e0356b]/30 text-[#e0356b] bg-[#fdeef4]",
  in_behandeling: "border-[#c77700]/30 text-[#c77700] bg-[#fff4e5]",
  afgewezen: "border-black/15 text-black/55 bg-black/[0.04]",
  aangenomen: "border-[#0e9f8a]/30 text-[#0e9f8a] bg-[#e6f7f4]",
  // Bellijst
  te_bellen: "border-[#e0356b]/30 text-[#e0356b] bg-[#fdeef4]",
  terugbellen: "border-[#c77700]/30 text-[#c77700] bg-[#fff4e5]",
  niet_bereikt: "border-[#c77700]/30 text-[#c77700] bg-[#fff4e5]",
  gebeld: "border-[#312e82]/25 text-[#312e82] bg-[#eef0ff]",
  klant: "border-[#0e9f8a]/30 text-[#0e9f8a] bg-[#e6f7f4]",
  geen_interesse: "border-black/15 text-black/55 bg-black/[0.04]",
};

// Waarden zonder eigen kleur (zoals rollen) krijgen dit, niet de roze van
// "nieuw" — die leest als "hier moet iets gebeuren".
const NEUTRAAL = "border-[#312e82]/20 text-[#312e82] bg-[#f7f7fc]";

/**
 * Een keuzelijst die bij wijzigen meteen opslaat.
 *
 * `name` is het veld waar de server action naar kijkt. Standaard `status`;
 * voor de rol van een gebruiker is dat `role_id`.
 */
export default function StatusSelect({
  action, current, options, name = "status",
}: {
  action: (formData: FormData) => Promise<void>;
  current: string;
  options: [string, string][];
  name?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form ref={formRef} action={action}>
      <select
        name={name}
        defaultValue={current}
        disabled={pending}
        onChange={() => startTransition(() => formRef.current?.requestSubmit())}
        className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold outline-none transition ${COLORS[current] || NEUTRAAL} ${pending ? "opacity-50" : ""}`}
      >
        {options.map(([val, label]) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </select>
    </form>
  );
}
