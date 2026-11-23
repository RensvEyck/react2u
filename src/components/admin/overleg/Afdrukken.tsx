"use client";
import { LuPrinter } from "react-icons/lu";

/** Een knop om de notulen af te drukken of als pdf te bewaren. */
export default function Afdrukken() {
  return (
    <button type="button" onClick={() => window.print()} className="geen-print abtn-ghost !py-2 text-[13.5px]">
      <LuPrinter /> Afdrukken of pdf
    </button>
  );
}
