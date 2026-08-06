"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LuUpload, LuCopy, LuCheck, LuTrash2 } from "react-icons/lu";

type FileEntry = { name: string; url: string; path: string };

export default function MediaBeheer() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ophalen en wegschrijven zijn gescheiden. Zo staat er geen setState meer in
  // het effect zelf, en kunnen we na het verlaten van de pagina stoppen met
  // wegschrijven — anders zet een trage lijst-aanroep alsnog state op een
  // component die er niet meer is.
  const fetchFiles = useCallback(async (): Promise<FileEntry[]> => {
    const sb = supabaseBrowser();
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/media/";
    const { data } = await sb.storage.from("media").list("uploads", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    return (data || [])
      .filter((f) => f.id)
      .map((f) => ({ name: f.name, path: "uploads/" + f.name, url: base + "uploads/" + f.name }));
  }, []);

  const load = useCallback(async () => {
    setFiles(await fetchFiles());
  }, [fetchFiles]);

  useEffect(() => {
    let alive = true;
    fetchFiles().then((entries) => {
      if (alive) setFiles(entries);
    });
    return () => { alive = false; };
  }, [fetchFiles]);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const sb = supabaseBrowser();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const { error } = await sb.storage.from("media").upload(`uploads/${Date.now()}-${safe}`, file, { contentType: file.type });
    if (error) setError("Upload mislukt: " + error.message);
    else await load();
    setBusy(false);
  }

  async function remove(path: string, name: string) {
    if (!window.confirm(`"${name}" definitief verwijderen? Controleer dat het nergens op de site meer gebruikt wordt.`)) return;
    const sb = supabaseBrowser();
    await sb.storage.from("media").remove([path]);
    await load();
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Media</h1>
        <p className="text-[14.5px] text-black/50">
          Upload afbeeldingen of PDF&apos;s en kopieer de URL om te gebruiken in contentblokken of instellingen.
          De originele website-afbeeldingen staan veilig in de map <code className="rounded bg-black/5 px-1.5 py-0.5 text-[12px]">wp/</code>.
        </p>
      </div>

      <button
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-10 transition ${
          dragging ? "border-[#e75387] bg-[#fdeef4]" : "border-black/15 bg-white/60 hover:border-[#e75387]/60"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) upload(f);
        }}
      >
        <LuUpload className="text-2xl text-[#e75387]" />
        <span className="text-[14.5px] font-semibold text-[#312e82]">
          {busy ? "Uploaden…" : "Sleep een bestand hierheen of klik om te kiezen"}
        </span>
        <span className="text-[12.5px] text-black/40">Afbeeldingen en PDF&apos;s</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
        />
      </button>
      {error && <p className="text-[13.5px] text-[#e0356b]">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {files.map((f) => (
          <div key={f.url} className="acard group overflow-hidden">
            {/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(f.name) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.url} alt={f.name} className="h-36 w-full bg-[#f4f4f9] object-contain" loading="lazy" />
            ) : (
              <div className="flex h-36 items-center justify-center bg-[#f4f4f9] text-[13px] font-bold text-black/35">
                {f.name.split(".").pop()?.toUpperCase()}
              </div>
            )}
            <div className="flex items-center gap-1 px-3 py-2.5">
              <p className="min-w-0 flex-1 truncate text-[12.5px] text-black/55" title={f.name}>{f.name}</p>
              <button onClick={() => copy(f.url)} className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-[#e75387]" title="Kopieer URL">
                {copied === f.url ? <LuCheck className="text-[#0e9f8a]" /> : <LuCopy />}
              </button>
              <button onClick={() => remove(f.path, f.name)} className="rounded-lg p-1.5 text-black/40 opacity-0 transition hover:bg-[#fdeef4] hover:text-[#e0356b] group-hover:opacity-100" title="Verwijderen">
                <LuTrash2 />
              </button>
            </div>
          </div>
        ))}
        {files.length === 0 && !busy && (
          <p className="col-span-full text-[13.5px] text-black/40">Nog geen eigen uploads.</p>
        )}
      </div>
    </div>
  );
}
