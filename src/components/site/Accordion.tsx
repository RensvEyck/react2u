"use client";
import { useId, useState } from "react";
import { LuPlus } from "react-icons/lu";

export type FaqItem = { question: string; answer: string };

/**
 * Uitklapbare vragen. Eén tegelijk open; de eerste staat open zodat je meteen
 * ziet hoe het werkt. Het antwoord blijft in de HTML (alleen dichtgeklapt),
 * zodat zoekmachines het ook bij een gesloten vraag lezen.
 */
export default function Accordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const id = useId();
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}
            className={`rounded-[22px] border bg-white transition-[border-color,box-shadow] duration-300 ${
              isOpen ? "border-primary/15 shadow-[0_18px_40px_-28px_rgba(34,32,90,0.45)]" : "border-black/[0.07]"
            }`}>
            <h3>
              <button
                type="button"
                id={`${id}-q${i}`}
                className="flex w-full items-center justify-between gap-5 px-6 py-5 text-left font-heading text-[18px] font-bold leading-snug text-primary md:px-7"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`${id}-a${i}`}
              >
                <span>{item.question}</span>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-[background-color,color,transform] duration-300 ${
                  isOpen ? "rotate-45 bg-accent text-white" : "bg-soft text-primary"
                }`} aria-hidden>
                  <LuPlus className="text-[18px]" />
                </span>
              </button>
            </h3>
            {/* inert: dichtgeklapt telt het antwoord niet mee voor schermlezers
                en toetsenbord, al staat het wel in de HTML. */}
            <div id={`${id}-a${i}`} role="region" aria-labelledby={`${id}-q${i}`} className="fold" data-open={isOpen} inert={!isOpen}>
              <div>
                <p className="px-6 pb-6 text-[16.5px] md:px-7">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
