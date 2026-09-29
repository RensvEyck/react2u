"use client";
import { useState } from "react";
import { RenderBlockBody } from "@/components/blocks/BlockRenderer";
import MediaPicker from "./MediaPicker";
import { LuPlus, LuTrash2, LuChevronUp, LuChevronDown, LuImage, LuEye } from "react-icons/lu";

/* Editor voor blok-data: genereert formuliervelden voor elke JSON-structuur
   en toont rechts een live preview van het blok. */
/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */

const FIELD_LABELS: Record<string, string> = {
  eyebrow: "Bovenkop", heading: "Kop", text: "Tekst", body: "Tekst", intro: "Introtekst",
  button: "Knop", button2: "Tweede knop", buttons: "Knoppen", label: "Knoptekst", href: "Link",
  image: "Afbeelding", imageAlt: "Alt-tekst (SEO)", imagePosition: "Afbeelding links/rechts",
  cards: "Kaarten", items: "Items", title: "Titel", description: "Omschrijving", icon: "Icoon",
  question: "Vraag", answer: "Antwoord", faq: "FAQ-items", logos: "Logo's", alt: "Alt-tekst",
  columns: "Kolommen", words: "Woorden", before: "Tekst ervoor", after: "Tekst erna",
  style: "Stijl", phone: "Telefoon (tel:)", phoneDisplay: "Telefoon (weergave)", email: "E-mail",
  address: "Adres", formHeading: "Formulier-kop", images: "Afbeeldingen",
  highlight: "Woord met markeerstift", badge: "Label op de foto", logosLabel: "Tekst bij de logo's",
  layout: "Opmaak (leeg of center)", kleur: "Kleur (blauw, teal, rood, oranje, roze, indigo)",
  groep: "Pijler (preventie, verzuim of ontwikkeling)",
  quote: "Citaat", quoteName: "Naam bij citaat", quoteRole: "Functie bij citaat",
  value: "Cijfer of kernwoord", count: "Aantal artikelen", imageShape: "Beeldvorm (rounded of circle)",
};

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

export default function BlockEditor({
  type, initial, action,
}: {
  type: string;
  initial: any;
  action: (formData: FormData) => Promise<void>;
}) {
  const [data, setData] = useState<any>(initial);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<((url: string) => void) | null>(null);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(380px,480px)_1fr]">
      <form
        action={async (fd) => { setBusy(true); fd.set("json", JSON.stringify(data)); await action(fd); }}
        className="acard flex max-h-[calc(100vh-160px)] flex-col self-start overflow-hidden"
      >
        <div className="flex-1 overflow-y-auto p-6">
          <Field value={data} onChange={setData} fieldKey="root" openPicker={(cb) => setPicker(() => cb)} />
        </div>
        <div className="flex items-center justify-between border-t border-black/[0.06] bg-white/95 px-6 py-4">
          <span className="text-[12.5px] text-black/40">**vet** · &quot;- &quot; lijst · lege regel = alinea</span>
          <button className="abtn" disabled={busy}>{busy ? "Opslaan…" : "Opslaan"}</button>
        </div>
      </form>

      <div className="acard self-start overflow-hidden">
        <div className="flex items-center gap-2 border-b border-black/[0.06] px-5 py-3 text-[13px] font-semibold text-black/50">
          <LuEye /> Live voorbeeld
        </div>
        <div className="overflow-hidden bg-white">
          <div className="pointer-events-none w-[182%] origin-top-left scale-[0.55] select-none">
            <RenderBlockBody type={type} data={data} />
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
