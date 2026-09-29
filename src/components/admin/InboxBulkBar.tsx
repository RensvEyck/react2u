"use client";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { LuMailOpen, LuTrash2, LuX, LuLoaderCircle } from "react-icons/lu";

// Zelfde id als het formulier in postvak-in/page.tsx.
const BULK_FORM = "inbox-bulk";

const boxes = () =>
  [...document.querySelectorAll<HTMLInputElement>(`input[type=checkbox][form="${BULK_FORM}"]`)];

function Buttons({ count }: { count: number }) {
  const { pending, data } = useFormStatus();
  const busy = (v: string) => pending && data?.get("intent") === v;
  return (
    <>
      <button
        name="intent"
        value="gelezen"
        disabled={pending}
        title="Berichten worden gelezen; nieuwe sollicitaties gaan naar In behandeling"
        className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 font-semibold transition hover:bg-white/20 disabled:opacity-50"
      >
        {busy("gelezen") ? <LuLoaderCircle className="animate-spin text-[14px]" /> : <LuMailOpen className="text-[14px]" />} Gelezen
      </button>
      <button
        name="intent"
        value="verwijderen"
        disabled={pending}
        onClick={(e) => {
          if (!window.confirm(`${count} ${count === 1 ? "item" : "items"} definitief verwijderen, inclusief cv's? Dit kan niet ongedaan worden gemaakt.`)) e.preventDefault();
        }}
        className="flex items-center gap-1.5 rounded-xl bg-[#e0356b] px-3 py-1.5 font-semibold transition hover:bg-[#c92a5d] disabled:opacity-50"
      >
        {busy("verwijderen") ? <LuLoaderCircle className="animate-spin text-[14px]" /> : <LuTrash2 className="text-[14px]" />} Verwijderen
      </button>
    </>
  );
}

/**
 * Zwevende balk voor bulkacties in het Postvak IN.
 *
 * De vinkjes staan in de kaarten, die zelf al formulieren bevatten; formulieren
 * nesten mag niet. Daarom verwijzen de vinkjes met `form="inbox-bulk"` naar het
 * formulier waar deze balk in staat, en tellen we ze hier via het DOM.
 */
export default function InboxBulkBar() {
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const sync = () => {
      const all = boxes();
      setTotal(all.length);
      setCount(all.filter((b) => b.checked).length);
    };
    sync();
    document.addEventListener("change", sync);
    return () => document.removeEventListener("change", sync);
  }, []);

  const setAll = (checked: boolean) => {
    boxes().forEach((b) => { b.checked = checked; });
    setCount(checked ? boxes().length : 0);
  };

  if (count === 0) return null;
  return (
    <div
      role="toolbar"
      aria-label="Acties voor de selectie"
      className="fixed bottom-6 left-1/2 z-[95] flex -translate-x-1/2 animate-[popIn_0.16s_ease-out] items-center gap-2 rounded-2xl bg-[#1c1a4e] py-2.5 pl-4 pr-2.5 text-[13.5px] text-white shadow-xl motion-reduce:animate-none lg:left-[calc(50%+124px)]"
    >
      <span className="mr-1 whitespace-nowrap font-semibold tabular-nums">{count} geselecteerd</span>
      {count < total && (
        <button type="button" onClick={() => setAll(true)} className="whitespace-nowrap rounded-xl px-2.5 py-1.5 text-white/70 hover:bg-white/10 hover:text-white">
          Alle {total}
        </button>
      )}
      <Buttons count={count} />
      <button type="button" onClick={() => setAll(false)} className="rounded-xl p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Selectie wissen">
        <LuX className="text-[15px]" />
      </button>
    </div>
  );
}
