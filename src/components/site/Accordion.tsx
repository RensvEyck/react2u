"use client";
import { useId, useState } from "react";
import { LuPlus } from "react-icons/lu";
import { Heel } from "@/lib/md";

export type FaqItem = { question: string; answer: string };

/**
 * Uitklapbare vragen, als lijst met scheidingslijnen. Eén tegelijk open; de
 * eerste staat open zodat je meteen ziet hoe het werkt. Het antwoord blijft in
 * de HTML (alleen dichtgeklapt), zodat zoekmachines het ook bij een gesloten
 * vraag lezen.
 */
export default function Accordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const id = useId();
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <h3 className="[text-wrap:pretty]">
              <button
                type="button"
                id={`${id}-q${i}`}
                className="flex w-full items-center justify-between gap-6 py-5 text-left font-heading text-[18px] font-semibold leading-snug text-primary"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`${id}-a${i}`}
              >
                <span><Heel text={item.question} /></span>
                <LuPlus aria-hidden className={`shrink-0 text-[20px] transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`} />
              </button>
            </h3>
            {/* inert: dichtgeklapt telt het antwoord niet mee voor schermlezers
                en toetsenbord, al staat het wel in de HTML. */}
            <div id={`${id}-a${i}`} role="region" aria-labelledby={`${id}-q${i}`} className="fold" data-open={isOpen} inert={!isOpen}>
              <div>
                <p className="pb-6 pr-10 text-[16.5px]"><Heel text={item.answer} /></p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
