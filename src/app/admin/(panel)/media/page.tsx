"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type FileEntry = { name: string; folder: string; url: string };

export default function MediaAdmin() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/media/";
    const entries: FileEntry[] = [];
    const { data: uploads } = await sb.storage.from("media").list("uploads", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    for (const f of uploads || []) {
      if (f.name) entries.push({ name: f.name, folder: "uploads", url: base + "uploads/" + f.name });
    }
    setFiles(entries);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const sb = supabaseBrowser();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const key = `uploads/${Date.now()}-${safe}`;
    const { error } = await sb.storage.from("media").upload(key, file, { contentType: file.type });
    if (error) setError("Upload mislukt: " + error.message);
    else await load();
    setBusy(false);
    e.target.value = "";
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#312e82] mb-8">Media</h1>
      <div className="rounded-2xl bg-white p-6 shadow-sm mb-8">
        <label className="mb-2 block text-sm font-medium text-black/60">
          Afbeelding of PDF uploaden (kopieer daarna de URL en plak die in een contentblok)
        </label>
        <input type="file" accept="image/*,.pdf" onChange={onUpload} disabled={busy}
          className="rounded-xl border border-black/15 px-4 py-2.5 text-[15px] file:mr-3 file:rounded-full file:border-0 file:bg-[#e75387] file:px-4 file:py-1.5 file:text-white" />
        {busy && <p className="mt-2 text-sm text-black/50">Uploaden…</p>}
        {error && <p className="mt-2 text-sm text-[#e51673]">{error}</p>}
        <p className="mt-3 text-sm text-black/40">
          De originele website-afbeeldingen staan in de map <code>wp/</code> en blijven gewoon werken.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {files.map((f) => (
          <div key={f.url} className="rounded-2xl bg-white p-4 shadow-sm">
            {/\.(png|jpe?g|webp|gif|svg)$/i.test(f.name) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.url} alt={f.name} className="mb-3 h-32 w-full rounded-xl object-contain bg-[#f6f5fb]" />
            ) : (
              <div className="mb-3 flex h-32 items-center justify-center rounded-xl bg-[#f6f5fb] text-black/40">PDF</div>
            )}
            <p className="truncate text-sm text-black/60" title={f.name}>{f.name}</p>
            <button onClick={() => copy(f.url)} className="mt-2 text-sm font-medium text-[#e75387] hover:underline">
              {copied === f.url ? "Gekopieerd!" : "Kopieer URL"}
            </button>
          </div>
        ))}
        {files.length === 0 && <p className="text-black/50">Nog geen eigen uploads.</p>}
      </div>
    </div>
  );
}
