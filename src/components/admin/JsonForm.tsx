"use client";
import { useState } from "react";

/* Generic editor: renders form fields for any JSON structure (strings, booleans,
   arrays of strings/objects, nested objects) and submits the result as JSON. */
/* eslint-disable @typescript-eslint/no-explicit-any */

const input =
  "w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-[15px] outline-none focus:border-[#e75387]";

const FIELD_LABELS: Record<string, string> = {
  eyebrow: "Bovenkop", heading: "Kop", text: "Tekst", body: "Tekst", intro: "Introtekst",
  button: "Knop", button2: "Tweede knop", buttons: "Knoppen", label: "Knoptekst", href: "Link",
  image: "Afbeelding (URL)", imageAlt: "Alt-tekst", imagePosition: "Afbeelding links/rechts",
  cards: "Kaarten", items: "Items", title: "Titel", description: "Omschrijving", icon: "Icoon",
  question: "Vraag", answer: "Antwoord", faq: "FAQ-items", logos: "Logo's", alt: "Alt-tekst",
  columns: "Kolommen", words: "Woorden", before: "Tekst ervoor", after: "Tekst erna",
  style: "Stijl", phone: "Telefoon (tel:)", phoneDisplay: "Telefoon (weergave)", email: "E-mail",
  address: "Adres", formHeading: "Formulier-kop", images: "Afbeeldingen",
};

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

function Field({ value, onChange, path }: { value: any; onChange: (v: any) => void; path: string }) {
  if (typeof value === "string") {
    const long = value.length > 70 || value.includes("\n");
    return long ? (
      <textarea className={input} rows={Math.min(12, Math.max(3, value.split("\n").length + 1))} value={value} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <input className={input} value={value} onChange={(e) => onChange(e.target.value)} />
    );
  }
  if (typeof value === "boolean")
    return <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#e75387]" />;
  if (typeof value === "number")
    return <input type="number" className={input} value={value} onChange={(e) => onChange(Number(e.target.value))} />;
  if (Array.isArray(value)) {
    return (
      <div className="space-y-3">
        {value.map((item, i) => (
          <div key={i} className="rounded-xl border border-black/10 bg-[#f9f9fc] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-black/40">Item {i + 1}</span>
              <div className="flex gap-2 text-sm">
                <button type="button" disabled={i === 0} className="rounded border border-black/10 px-2 disabled:opacity-30"
                  onClick={() => { const a = [...value]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; onChange(a); }}>↑</button>
                <button type="button" disabled={i === value.length - 1} className="rounded border border-black/10 px-2 disabled:opacity-30"
                  onClick={() => { const a = [...value]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; onChange(a); }}>↓</button>
                <button type="button" className="rounded border border-black/10 px-2 text-[#e51673]"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}>Verwijder</button>
              </div>
            </div>
            <Field value={item} onChange={(v) => onChange(value.map((it, j) => (j === i ? v : it)))} path={`${path}.${i}`} />
          </div>
        ))}
        <button type="button" className="rounded-lg border border-dashed border-black/20 px-4 py-2 text-sm text-black/60 hover:border-[#e75387] hover:text-[#e75387]"
          onClick={() => onChange([...value, value.length ? emptyLike(value[0]) : ""])}>
          + Item toevoegen
        </button>
      </div>
    );
  }
  if (value && typeof value === "object") {
    return (
      <div className="space-y-4">
        {Object.entries(value).map(([k, v]) => (
          <div key={k}>
            <label className="mb-1 block text-sm font-medium text-black/60">{labelFor(k)}</label>
            <Field value={v} onChange={(nv) => onChange({ ...value, [k]: nv })} path={`${path}.${k}`} />
          </div>
        ))}
      </div>
    );
  }
  return <input className={input} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
}

export default function JsonForm({ initial, action }: { initial: any; action: (formData: FormData) => Promise<void> }) {
  const [data, setData] = useState<any>(initial);
  const [busy, setBusy] = useState(false);
  return (
    <form
      action={async (fd) => { setBusy(true); fd.set("json", JSON.stringify(data)); await action(fd); }}
      className="rounded-2xl bg-white p-6 shadow-sm"
    >
      <Field value={data} onChange={setData} path="root" />
      <div className="mt-6 flex items-center gap-4">
        <button className="btn !py-2.5 !px-6 text-[15px]" disabled={busy}>{busy ? "Opslaan…" : "Opslaan"}</button>
        <span className="text-sm text-black/40">Tip: tekstvelden ondersteunen **vet**, &quot;- &quot; voor lijstjes en een lege regel voor een nieuwe alinea.</span>
      </div>
    </form>
  );
}
