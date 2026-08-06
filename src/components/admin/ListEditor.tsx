"use client";
import { useState } from "react";
import MediaPicker from "./MediaPicker";
import { LuPlus, LuTrash2, LuChevronUp, LuChevronDown, LuImage } from "react-icons/lu";

export type FieldSpec = {
  name: string;
  label: string;
  placeholder?: string;
  /** Toont een knop om uit de mediabibliotheek te kiezen. */
  media?: boolean;
  /** Beperkt die keuze tot afbeeldingen. Zet dit waar het veld een <img> vult. */
  alleenAfbeeldingen?: boolean;
  /** Laat de waarde als miniatuur zien (voor logo's). */
  preview?: boolean;
};

type Row = Record<string, string>;

/**
 * Bewerker voor een vrije lijst regels. Velden gaan als `naam.index` naar de
 * server action; die leest de aanwezige indices in plaats van te tellen, zodat
 * een gat na verwijderen geen probleem is.
 */
export default function ListEditor({
  fields, initial, addLabel, emptyLabel,
}: {
  fields: FieldSpec[];
  initial: Row[];
  addLabel: string;
  emptyLabel: string;
}) {
  const [rows, setRows] = useState<Row[]>(initial.length ? initial : []);
  const [picking, setPicking] = useState<{ row: number; field: string } | null>(null);

  const blank = () => Object.fromEntries(fields.map((f) => [f.name, ""]));

  const update = (i: number, name: string, value: string) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [name]: value } : r)));

  const remove = (i: number) => setRows((rs) => rs.filter((_, j) => j !== i));

  const move = (i: number, dir: -1 | 1) =>
    setRows((rs) => {
      const to = i + dir;
      if (to < 0 || to >= rs.length) return rs;
      const copy = [...rs];
      [copy[i], copy[to]] = [copy[to], copy[i]];
      return copy;
    });

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <p className="rounded-xl bg-[#fafafd] px-4 py-6 text-center text-[13.5px] text-black/40">{emptyLabel}</p>
      )}

      {rows.map((row, i) => (
        <div key={i} className="rounded-xl border border-black/[0.08] bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[12.5px] font-semibold uppercase tracking-wide text-black/35">
              Regel {i + 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button" onClick={() => move(i, -1)} disabled={i === 0}
                className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 disabled:opacity-25"
                aria-label="Omhoog"
              >
                <LuChevronUp className="text-[15px]" />
              </button>
              <button
                type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1}
                className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 disabled:opacity-25"
                aria-label="Omlaag"
              >
                <LuChevronDown className="text-[15px]" />
              </button>
              <button
                type="button" onClick={() => remove(i)}
                className="rounded-lg p-1.5 text-[#e0356b] hover:bg-[#fdeef4]"
                aria-label="Verwijderen"
              >
                <LuTrash2 className="text-[15px]" />
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            {fields.some((f) => f.preview) && (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/[0.08] bg-[#fafafd]">
                {row[fields.find((f) => f.preview)!.name] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row[fields.find((f) => f.preview)!.name]} alt="" className="h-full w-full object-contain" />
                ) : (
                  <LuImage className="text-[18px] text-black/20" />
                )}
              </div>
            )}

            <div className="grid flex-1 gap-3">
              {fields.map((f) => (
                <div key={f.name}>
                  <label className="alabel">{f.label}</label>
                  <div className="flex gap-2">
                    <input
                      className="ainput"
                      name={`${f.name}.${i}`}
                      value={row[f.name] ?? ""}
                      placeholder={f.placeholder}
                      onChange={(e) => update(i, f.name, e.target.value)}
                    />
                    {f.media && (
                      <button
                        type="button"
                        onClick={() => setPicking({ row: i, field: f.name })}
                        className="abtn-ghost shrink-0 !py-2 text-[13px]"
                      >
                        <LuImage className="text-[13px]" /> Kies
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setRows((rs) => [...rs, blank()])}
        className="abtn-ghost !py-2 text-[13.5px]"
      >
        <LuPlus className="text-[14px]" /> {addLabel}
      </button>

      {picking && (
        <MediaPicker
          alleenAfbeeldingen={fields.find((f) => f.name === picking.field)?.alleenAfbeeldingen}
          onClose={() => setPicking(null)}
          onSelect={(url) => {
            update(picking.row, picking.field, url);
            setPicking(null);
          }}
        />
      )}
    </div>
  );
}
