"use client";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { RenderBlockBody } from "@/components/blocks/BlockRenderer";
import MediaPicker from "./MediaPicker";
import { LuPlus, LuTrash2, LuChevronUp, LuChevronDown, LuImage, LuEye, LuHistory, LuRotateCcw } from "react-icons/lu";
import { when } from "@/lib/dashboard";
import { FIELD_LABELS } from "@/lib/blockFields";
import { LEAVE_QUESTION, setUnsaved } from "@/lib/unsaved";

/* Editor voor blok-data: genereert formuliervelden voor elke JSON-structuur
   en toont rechts een live preview van het blok. */
/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */


const IMAGE_KEYS = new Set(["image", "og_image", "logo"]);

function labelFor(key: string) {
  return FIELD_LABELS[key] || key;
}

function emptyLike(v: any): any {
  if (typeof v === "string") return "";
  if (typeof v === "number") return 0;
  if (typeof v === "boolean") return false;
  if (Array.isArray(v)) return [];
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, emptyLike(val)]));
  return "";
}

function Field({
  value, onChange, fieldKey, openPicker,
}: {
  value: any;
  onChange: (v: any) => void;
  fieldKey: string;
  openPicker: (cb: (url: string) => void) => void;
}) {
  if (typeof value === "string") {
    const isImage = IMAGE_KEYS.has(fieldKey);
    const long = !isImage && (value.length > 70 || value.includes("\n"));
    if (isImage) {
      return (
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-2">
            <input className="ainput" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" />
            <button type="button" onClick={() => openPicker(onChange)} className="abtn-ghost !py-1.5 text-[13px]">
              <LuImage className="text-[14px]" /> Kies uit media
            </button>
          </div>
          {value && (
            <img src={value} alt="" className="h-[74px] w-[74px] shrink-0 rounded-xl border border-black/[0.07] bg-[#f4f4f9] object-contain" />
          )}
        </div>
      );
    }
    return long ? (
      <textarea
        className="ainput leading-relaxed"
        rows={Math.min(14, Math.max(3, value.split("\n").length + 1))}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    ) : (
      <input className="ainput" value={value} onChange={(e) => onChange(e.target.value)} />
    );
  }
  if (typeof value === "boolean")
    return <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#e75387]" />;
  if (typeof value === "number")
    return <input type="number" className="ainput" value={value} onChange={(e) => onChange(Number(e.target.value))} />;
  if (Array.isArray(value)) {
    return (
      <div className="space-y-3">
        {value.map((item, i) => (
          <div key={i} className="rounded-xl border border-black/[0.08] bg-[#fafafd] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-black/35">Item {i + 1}</span>
              <div className="flex gap-1.5">
                <button type="button" disabled={i === 0} aria-label="Omhoog"
                  className="rounded-lg border border-black/10 p-1.5 text-black/50 hover:bg-white disabled:opacity-25"
                  onClick={() => { const a = [...value]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; onChange(a); }}><LuChevronUp className="text-[13px]" /></button>
                <button type="button" disabled={i === value.length - 1} aria-label="Omlaag"
                  className="rounded-lg border border-black/10 p-1.5 text-black/50 hover:bg-white disabled:opacity-25"
                  onClick={() => { const a = [...value]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; onChange(a); }}><LuChevronDown className="text-[13px]" /></button>
                <button type="button" aria-label="Verwijderen"
                  className="rounded-lg border border-black/10 p-1.5 text-black/50 hover:bg-[#fdeef4] hover:text-[#e0356b]"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}><LuTrash2 className="text-[13px]" /></button>
              </div>
            </div>
            <Field value={item} onChange={(v) => onChange(value.map((it, j) => (j === i ? v : it)))} fieldKey={fieldKey} openPicker={openPicker} />
          </div>
        ))}
        <button type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/20 py-2.5 text-[13.5px] font-semibold text-black/45 transition hover:border-[#e75387] hover:text-[#e75387]"
          onClick={() => onChange([...value, value.length ? emptyLike(value[0]) : ""])}>
          <LuPlus /> Item toevoegen
        </button>
      </div>
    );
  }
  if (value && typeof value === "object") {
    return (
      <div className="space-y-4">
        {Object.entries(value).map(([k, v]) => (
          <div key={k}>
            <label className="alabel">{labelFor(k)}</label>
            <Field value={v} onChange={(nv) => onChange({ ...value, [k]: nv })} fieldKey={k} openPicker={openPicker} />
          </div>
        ))}
      </div>
    );
  }
  return <input className="ainput" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
}

export type BlockVersion = {
  id: number;
  at: string;
  who: string | null;
  changed: string[];
  current: boolean;
  data: any;
};

/** Knop die zelf weet of zijn formulier bezig is — ook na een redirect naar dezelfde pagina. */
function SaveButton({ dirty }: { dirty: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="abtn disabled:cursor-default disabled:opacity-55 disabled:hover:translate-y-0" disabled={pending || !dirty} aria-keyshortcuts="Meta+S Control+S">
      {pending ? "Opslaan…" : dirty ? "Opslaan" : "Opgeslagen"}
      {!pending && <kbd className="rounded-md bg-white/20 px-1.5 py-px text-[11px] font-semibold">⌘S</kbd>}
    </button>
  );
}

export default function BlockEditor({
  type, initial, action, versions = [],
}: {
  type: string;
  initial: any;
  action: (formData: FormData) => Promise<void>;
  versions?: BlockVersion[];
}) {
  const [data, setData] = useState<any>(initial);
  const [picker, setPicker] = useState<((url: string) => void) | null>(null);
  const [viewing, setViewing] = useState<BlockVersion | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Vergelijken met wat er opgeslagen is. `initial` komt na opslaan opnieuw
  // van de server, dus dit klopt ook direct na een save.
  const dirty = JSON.stringify(data) !== JSON.stringify(initial);

  // ⌘S / Ctrl+S slaat op, overal op deze pagina.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Niet ongemerkt werk kwijtraken: bij sluiten of herladen vraagt de browser
  // het, en bij een klik op een link binnen de admin vragen wij het. Next kan
  // een navigatie niet tegenhouden, dus dat gebeurt in de capture-fase, vóór
  // Link de klik ziet.
  useEffect(() => {
    setUnsaved(dirty);
    return () => setUnsaved(false);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey) return;
      if (!window.confirm(LEAVE_QUESTION)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const shown = viewing ? viewing.data : data;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(380px,480px)_1fr]">
      <form
        ref={formRef}
        action={async (fd) => { fd.set("json", JSON.stringify(data)); await action(fd); }}
        className="acard flex max-h-[calc(100vh-160px)] flex-col self-start overflow-hidden"
      >
        <div className="flex-1 overflow-y-auto p-6">
          <Field value={data} onChange={setData} fieldKey="root" openPicker={(cb) => setPicker(() => cb)} />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] bg-white/95 px-6 py-4">
          {dirty ? (
            <span className="flex items-center gap-2 text-[12.5px] font-medium text-[#c77700]">
              <span className="h-2 w-2 rounded-full bg-[#c77700]" /> Niet opgeslagen
            </span>
          ) : (
            <span className="text-[12.5px] text-black/40">**vet** · &quot;- &quot; lijst · lege regel = alinea</span>
          )}
          <SaveButton dirty={dirty} />
        </div>
      </form>

      <div className="acard self-start overflow-hidden">
        <div className="relative flex items-center gap-2 border-b border-black/[0.06] px-5 py-3 text-[13px] font-semibold text-black/50">
          <LuEye /> {viewing ? "Oudere versie" : "Live voorbeeld"}
          {versions.length > 1 && (
            <button
              type="button"
              onClick={() => setShowVersions((v) => !v)}
              aria-expanded={showVersions}
              className="ml-auto flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] font-semibold text-[#312e82] hover:bg-[#eef0ff]"
            >
              <LuHistory className="text-[14px]" /> Versies ({versions.length})
            </button>
          )}
          {showVersions && (
            <div className="absolute right-3 top-full z-20 mt-1.5 max-h-[360px] w-[320px] overflow-y-auto rounded-xl border border-black/[0.08] bg-white p-1.5 shadow-[0_16px_40px_-16px_rgba(28,26,78,0.35)]">
              {versions.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => { setViewing(v.current ? null : v); setShowVersions(false); }}
                  className={`block w-full rounded-lg px-3 py-2 text-left transition hover:bg-[#f1f0fb] ${
                    (viewing?.id ?? versions.find((x) => x.current)?.id) === v.id ? "bg-[#f1f0fb]" : ""
                  }`}
                >
                  <span className="flex items-center gap-2 text-[13.5px] font-semibold text-[#1c1a4e]">
                    {when(v.at)}
                    {v.current && <span className="apill bg-[#e6f7f4] !px-1.5 !py-0 !text-[10.5px] text-[#0e9f8a]">Live</span>}
                  </span>
                  <span className="block text-[12px] font-normal text-black/45">
                    {v.who ? `door ${v.who === "Jij" ? "jou" : v.who}` : "beginversie"}
                    {v.changed.length > 0 && ` · ${v.changed.join(", ")}`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {viewing && (
          <div className="flex flex-wrap items-center gap-2 border-b border-[#312e82]/10 bg-[#f4f3fd] px-5 py-2.5 text-[13px] text-[#1c1a4e]">
            <span className="mr-auto">Je bekijkt de versie van <strong>{when(viewing.at)}</strong>.</span>
            <button
              type="button"
              onClick={() => { setData(viewing.data); setViewing(null); }}
              className="flex items-center gap-1.5 rounded-lg bg-[#312e82] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-[#23205f]"
            >
              <LuRotateCcw className="text-[13px]" /> In editor laden
            </button>
            <button type="button" onClick={() => setViewing(null)} className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-[#312e82] hover:bg-white">
              Terug naar huidige
            </button>
          </div>
        )}
        <div className="overflow-hidden bg-white">
          {/* zoom in plaats van transform: scale. Een transform verkleint alleen
              wat je ziet; de ruimte blijft even hoog, met een wit vlak eronder. */}
          <div className="pointer-events-none w-full select-none" style={{ zoom: 0.55 }}>
            <RenderBlockBody type={type} data={shown} />
          </div>
        </div>
      </div>

      {picker && (
        <MediaPicker
          onClose={() => setPicker(null)}
          onSelect={(url) => { picker(url); setPicker(null); }}
        />
      )}
    </div>
  );
}
