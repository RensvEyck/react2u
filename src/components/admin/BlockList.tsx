"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { deleteBlock, reorderBlocks, undoDeleteBlock } from "@/app/admin/actions";
import { LuGripVertical, LuPencil, LuTrash2, LuRotateCcw, LuCheck, LuLoaderCircle } from "react-icons/lu";

export type BlockRow = { id: string; title: string; snippet: string; href: string };

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; text: string };

function move<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/**
 * De blokken van een pagina, te herschikken door te slepen (muis en touch) of
 * met de pijltjestoetsen op het handvat.
 *
 * De volgorde verandert meteen op het scherm en wordt daarna opgeslagen. Gaat
 * dat mis, dan springt hij terug — liever dat dan een scherm dat iets anders
 * laat zien dan de site.
 */
export default function BlockList({
  slug, blocks, canUndo,
}: {
  slug: string;
  blocks: BlockRow[];
  /** Staat het versiebeheer aan? Zonder is verwijderen definitief. */
  canUndo: boolean;
}) {
  const [order, setOrder] = useState(blocks.map((b) => b.id));
  // De actuele volgorde voor event handlers. Tijdens het slepen volgen de
  // pointer-events elkaar sneller op dan React rendert; wie dan met `order`
  // uit de laatste render rekent, verplaatst het verkeerde blok of slaat een
  // andere volgorde op dan er op het scherm staat.
  const orderRef = useRef(order);
  const [dragging, setDragging] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [announce, setAnnounce] = useState("");
  const [undo, setUndo] = useState<BlockRow | null>(null);
  const [, startTransition] = useTransition();
  const listRef = useRef<HTMLOListElement>(null);
  // De laatst opgeslagen volgorde: om mee te vergelijken en op terug te vallen.
  const [saved, setSaved] = useState(blocks.map((b) => b.id));

  // Nieuwe of verdwenen blokken van de server verwerken zonder de lijst
  // opnieuw op te bouwen: dan blijven focus, status en "Ongedaan maken" staan.
  // De volgorde komt dan van de server — een teruggezet blok staat daar op zijn
  // oude plek, en dat moet hier ook zo zijn, anders slaat de volgende sleep
  // een volgorde op die niemand zo bedoelde.
  const serverIds = blocks.map((b) => b.id).sort().join();
  const [seenIds, setSeenIds] = useState(serverIds);
  if (seenIds !== serverIds) {
    setSeenIds(serverIds);
    const next = blocks.map((b) => b.id);
    setOrder(next);
    setSaved(next);
  }

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  const apply = (next: string[]) => {
    orderRef.current = next;
    setOrder(next);
  };

  const byId = new Map(blocks.map((b) => [b.id, b]));
  // Een blok dat net verwijderd is, zit niet meer in `blocks` maar misschien
  // nog even in `order`; die slaan we over.
  const rows = order.map((id) => byId.get(id)).filter(Boolean) as BlockRow[];

  useEffect(() => {
    if (status.kind !== "saved") return;
    const t = setTimeout(() => setStatus({ kind: "idle" }), 1800);
    return () => clearTimeout(t);
  }, [status]);

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 9000);
    return () => clearTimeout(t);
  }, [undo]);

  const commit = (next: string[]) => {
    if (next.join() === saved.join()) return;
    setStatus({ kind: "saving" });
    startTransition(async () => {
      try {
        await reorderBlocks(slug, next);
        setSaved(next);
        setStatus({ kind: "saved" });
      } catch {
        apply(saved);
        setStatus({ kind: "error", text: "Volgorde opslaan mislukt — probeer het opnieuw." });
      }
    });
  };

  /* ---------- slepen ---------- */

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(id);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !listRef.current) return;
    const y = e.clientY;
    // Bij de rand van het scherm meescrollen, anders kun je een blok niet
    // voorbij wat zichtbaar is slepen.
    if (y < 90) window.scrollBy(0, -14);
    else if (y > window.innerHeight - 70) window.scrollBy(0, 14);

    const els = [...listRef.current.querySelectorAll<HTMLElement>("[data-block-row]")];
    const current = orderRef.current;
    const from = current.indexOf(dragging);
    let insert = els.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return y < r.top + r.height / 2;
    });
    if (insert === -1) insert = els.length;
    const to = insert > from ? insert - 1 : insert;
    if (from > -1 && to !== from) apply(move(current, from, to));
  };

  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(null);
    commit(orderRef.current);
  };

  /* ---------- toetsenbord ---------- */

  const onKeyDown = (e: React.KeyboardEvent, id: string) => {
    const current = orderRef.current;
    const from = current.indexOf(id);
    const to = e.key === "ArrowUp" ? from - 1 : e.key === "ArrowDown" ? from + 1 : -1;
    if (from < 0 || to < 0 || to >= current.length) return;
    e.preventDefault();
    const next = move(current, from, to);
    apply(next);
    setAnnounce(`${byId.get(id)?.title} staat nu op plek ${to + 1} van ${next.length}.`);
    commit(next);
  };

  /* ---------- verwijderen ---------- */

  const remove = (row: BlockRow) => {
    const question = canUndo
      ? `Blok "${row.title}" verwijderen?`
      : `Blok "${row.title}" definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`;
    if (!window.confirm(question)) return;
    apply(orderRef.current.filter((id) => id !== row.id));
    setSaved((s) => s.filter((id) => id !== row.id));
    if (canUndo) setUndo(row);
    startTransition(async () => {
      await deleteBlock(row.id, slug);
    });
  };

  const restore = (row: BlockRow) => {
    setUndo(null);
    startTransition(async () => {
      const ok = await undoDeleteBlock(row.id, slug);
      if (!ok) setStatus({ kind: "error", text: "Terugzetten lukte niet — kijk in de prullenbak." });
    });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Contentblokken</h2>
        <span className="flex min-h-[20px] items-center gap-1.5 text-[12.5px]" aria-live="polite">
          {status.kind === "saving" && <><LuLoaderCircle className="animate-spin text-[#e75387]" /> <span className="text-black/45">Volgorde opslaan…</span></>}
          {status.kind === "saved" && <><LuCheck className="text-[#0e9f8a]" /> <span className="text-[#0e9f8a]">Volgorde opgeslagen</span></>}
          {status.kind === "error" && <span className="font-medium text-[#e0356b]">{status.text}</span>}
        </span>
      </div>

      <p className="sr-only" aria-live="assertive">{announce}</p>

      <ol
        ref={listRef}
        className="space-y-2.5"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {rows.map((b, i) => {
          const isDragging = dragging === b.id;
          return (
            <li
              key={b.id}
              data-block-row
              className={`acard group flex items-center gap-3 py-3 pl-2 pr-4 transition-shadow ${
                isDragging ? "relative z-10 shadow-[0_18px_40px_-18px_rgba(28,26,78,0.45)] ring-2 ring-[#e75387]/40" : "hover:shadow-md"
              }`}
            >
              <button
                type="button"
                onPointerDown={(e) => onPointerDown(e, b.id)}
                onKeyDown={(e) => onKeyDown(e, b.id)}
                className={`flex h-9 w-7 shrink-0 touch-none items-center justify-center rounded-lg text-black/25 transition hover:bg-black/5 hover:text-black/60 focus-visible:text-[#312e82] ${
                  isDragging ? "cursor-grabbing text-[#e75387]" : "cursor-grab"
                }`}
                aria-label={`${b.title} verplaatsen — sleep, of gebruik pijl omhoog en omlaag`}
              >
                <LuGripVertical className="text-[16px]" />
              </button>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef0ff] text-[13px] font-bold tabular-nums text-[#312e82]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={b.href} className="text-[14.5px] font-semibold text-[#1c1a4e] hover:text-[#e75387]">
                  {b.title}
                </Link>
                {b.snippet && <p className="truncate text-[12.5px] text-black/40">{b.snippet}</p>}
              </div>
              <div className="flex items-center gap-1 opacity-50 transition group-hover:opacity-100 group-focus-within:opacity-100">
                <Link href={b.href} className="rounded-lg p-1.5 text-black/50 hover:bg-black/5 hover:text-[#e75387]" aria-label={`${b.title} bewerken`}>
                  <LuPencil />
                </Link>
                <button
                  type="button"
                  onClick={() => remove(b)}
                  className="rounded-lg p-1.5 text-black/50 hover:bg-[#fdeef4] hover:text-[#e0356b]"
                  aria-label={`${b.title} verwijderen`}
                >
                  <LuTrash2 />
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      {rows.length === 0 && (
        <p className="acard px-6 py-8 text-center text-[14px] text-black/45">Deze pagina heeft nog geen blokken.</p>
      )}

      {undo && (
        <div className="fixed bottom-6 left-1/2 z-[95] flex -translate-x-1/2 lg:left-[calc(50%+124px)] animate-[popIn_0.16s_ease-out] items-center gap-4 rounded-2xl bg-[#1c1a4e] py-3 pl-5 pr-3 text-[14px] text-white shadow-xl motion-reduce:animate-none">
          <span>Blok “{undo.title}” verwijderd</span>
          <button
            type="button"
            onClick={() => restore(undo)}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 font-semibold transition hover:bg-white/20"
          >
            <LuRotateCcw className="text-[14px]" /> Ongedaan maken
          </button>
        </div>
      )}
    </div>
  );
}
