"use client";
import { useState } from "react";
import { FaPlus, FaMinus } from "react-icons/fa";

export type FaqItem = { question: string; answer: string };

export default function Accordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-2xl border border-black/10 bg-white shadow-sm">
          <button
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-heading font-bold text-primary"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            <span>{item.question}</span>
            {open === i ? <FaMinus className="shrink-0 text-accent" /> : <FaPlus className="shrink-0 text-accent" />}
          </button>
          {open === i && <div className="px-5 pb-5 text-body">{item.answer}</div>}
        </div>
      ))}
    </div>
  );
}
