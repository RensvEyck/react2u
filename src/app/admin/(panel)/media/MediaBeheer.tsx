"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { fileSize, HEAVY_IMAGE_BYTES, type Usage } from "@/lib/mediaUsage";
import { fold } from "@/lib/search";
import { LuUpload, LuCopy, LuCheck, LuTrash2, LuSearch, LuLink2, LuTriangleAlert, LuChevronDown, LuFileText } from "react-icons/lu";

type FileEntry = { name: string; url: string; path: string; size: number | null; isImage: boolean };

const IMAGE = /\.(png|jpe?g|webp|gif|svg|avif)$/i;

const FILTERS = [
  { key: "alles", label: "Alles" },
  { key: "gebruikt", label: "In gebruik" },
  { key: "ongebruikt", label: "Niet gebruikt" },
  { key: "zwaar", label: "Te zwaar" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

/** Uploadnaam zonder de tijdstempel ervoor: "1727600000000-logo.png" → "logo.png". */
const displayName = (name: string) => name.replace(/^\d{10,}-/, "");

export default function MediaBeheer({ usage, complete }: { usage: Record<string, Usage[]>; complete: boolean }) {
  const [files, setFiles] = useState<FileEntry[] | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("alles");
  const [open, setOpen] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ophalen en wegschrijven zijn gescheiden. Zo staat er geen setState meer in
  // het effect zelf, en kunnen we na het verlaten van de pagina stoppen met
  // wegschrijven — anders zet een trage lijst-aanroep alsnog state op een
  // component die er niet meer is.
  const fetchFiles = useCallback(async (): Promise<FileEntry[]> => {
    const sb = supabaseBrowser();
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/media/";
    const { data } = await sb.storage.from("media").list("uploads", { limit: 500, sortBy: { column: "created_at", order: "desc" } });
    return (data || [])
      .filter((f) => f.id)
      .map((f) => ({
        name: f.name,
        path: "uploads/" + f.name,
        url: base + "uploads/" + f.name,
        size: typeof f.metadata?.size === "number" ? f.metadata.size : null,
        isImage: IMAGE.test(f.name),
      }));
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

  // Meerdere bestanden na elkaar, met voortgang. Eén mislukte upload stopt de
  // rest niet; de fouten staan daarna samen onder het sleepvlak.
  async function upload(list: File[]) {
    if (!list.length) return;
    setError(null);
    const sb = supabaseBrowser();
    const failed: string[] = [];
    for (let i = 0; i < list.length; i++) {
      setProgress({ done: i, total: list.length });
      const file = list[i];
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
      const { error } = await sb.storage.from("media").upload(`uploads/${Date.now()}-${safe}`, file, { contentType: file.type });
      if (error) failed.push(`${file.name}: ${error.message}`);
    }
    setProgress(null);
    if (failed.length) setError(`Upload mislukt — ${failed.join("; ")}`);
    await load();
  }

  async function remove(f: FileEntry) {
    const used = usage[f.path] || [];
    const message = used.length
      ? `"${displayName(f.name)}" wordt nog gebruikt op:\n\n${used.map((u) => `• ${u.label}`).join("\n")}\n\nNa verwijderen is het daar kapot. Toch verwijderen?`
      : `"${displayName(f.name)}" verwijderen? Het wordt nergens op de site gebruikt${complete ? "" : " (voor zover jij kunt zien)"}.`;
    if (!window.confirm(message)) return;
    // Zonder verwijderrecht meldt Storage geen fout maar een lege lijst.
    const { data, error } = await supabaseBrowser().storage.from("media").remove([f.path]);
    if (error || !data?.length) setError(`Verwijderen mislukt${error ? `: ${error.message}` : " — het bestand staat er nog."}`);
    await load();
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 1500);
  }

  const heavy = (f: FileEntry) => f.isImage && f.size !== null && f.size > HEAVY_IMAGE_BYTES;
  const counts = useMemo(() => {
    const all = files || [];
    return {
      alles: all.length,
      gebruikt: all.filter((f) => usage[f.path]?.length).length,
      ongebruikt: all.filter((f) => !usage[f.path]?.length).length,
      zwaar: all.filter(heavy).length,
    };
  }, [files, usage]);

  const shown = (files || []).filter((f) => {
    if (query && !fold(f.name).includes(fold(query.trim()))) return false;
    if (filter === "gebruikt") return Boolean(usage[f.path]?.length);
    if (filter === "ongebruikt") return !usage[f.path]?.length;
    if (filter === "zwaar") return heavy(f);
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Media</h1>
        <p className="text-[14.5px] text-black/50">
          Upload afbeeldingen of PDF&apos;s en kopieer de URL om te gebruiken in contentblokken of instellingen.
          Bij elk bestand zie je waar het op de site staat. De originele website-afbeeldingen staan veilig in de
          map <code className="rounded bg-black/5 px-1.5 py-0.5 text-[12px]">wp/</code>.
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
          upload([...(e.dataTransfer.files || [])]);
        }}
        disabled={Boolean(progress)}
      >
        <LuUpload className="text-2xl text-[#e75387]" />
        <span className="text-[14.5px] font-semibold text-[#312e82]" aria-live="polite">
          {progress
            ? `Uploaden… ${progress.done + 1} van ${progress.total}`
            : "Sleep bestanden hierheen of klik om te kiezen"}
        </span>
        <span className="text-[12.5px] text-black/40">Afbeeldingen en PDF&apos;s — meerdere tegelijk kan</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          multiple
          className="hidden"
          onChange={(e) => { upload([...(e.target.files || [])]); e.target.value = ""; }}
        />
      </button>
      {error && <p className="text-[13.5px] text-[#e0356b]">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative mr-1 min-w-[220px] flex-1 sm:max-w-[320px]">
          <LuSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-black/35" />
          <input
            className="ainput !py-2 !pl-10 text-[14px]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek op bestandsnaam"
            aria-label="Zoek op bestandsnaam"
          />
        </label>
        {FILTERS.filter((f) => f.key !== "zwaar" || counts.zwaar > 0).map((f) => {
          const active = f.key === filter;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${
                active ? "border-[#312e82] bg-[#312e82] text-white" : "border-black/12 bg-white text-[#312e82] hover:border-[#312e82]"
              }`}
            >
              {f.label}
              <span className={`ml-1.5 text-[12px] ${active ? "text-white/60" : "text-black/35"}`}>{counts[f.key]}</span>
            </button>
          );
        })}
      </div>

      {!complete && (
        <p className="-mt-3 text-[12.5px] text-black/40">
          Je ziet geen concepten van onderdelen waar je geen rechten op hebt; gebruik dáárin telt hier niet mee.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((f) => {
          const used = usage[f.path] || [];
          return (
            <div key={f.url} className="acard group flex flex-col overflow-hidden">
              <div className="relative">
                {f.isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.url} alt={f.name} className="h-36 w-full bg-[#f4f4f9] object-contain" loading="lazy" />
                ) : (
                  <div className="flex h-36 flex-col items-center justify-center gap-1.5 bg-[#f4f4f9] text-black/35">
                    <LuFileText className="text-[30px]" />
                    <span className="text-[11.5px] font-bold tracking-wide">{f.name.split(".").pop()?.toUpperCase()}</span>
                  </div>
                )}
                {heavy(f) && (
                  <span
                    className="apill absolute left-2 top-2 bg-[#fff4e5] !px-2 !py-0.5 !text-[11px] text-[#c77700] shadow-sm"
                    title="Groter dan 600 KB — verkleinen maakt de pagina sneller, vooral op mobiel"
                  >
                    <LuTriangleAlert className="text-[11px]" /> Zwaar
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 px-3 pt-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[#1c1a4e]" title={f.name}>{displayName(f.name)}</p>
                  {f.size !== null && <p className="text-[11.5px] text-black/40">{fileSize(f.size)}</p>}
                </div>
                <button onClick={() => copy(f.url)} className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-[#e75387]" title="Kopieer URL" aria-label="Kopieer URL">
                  {copied === f.url ? <LuCheck className="text-[#0e9f8a]" /> : <LuCopy />}
                </button>
                <button
                  onClick={() => remove(f)}
                  className="rounded-lg p-1.5 text-black/40 opacity-0 transition hover:bg-[#fdeef4] hover:text-[#e0356b] focus:opacity-100 group-hover:opacity-100"
                  title="Verwijderen"
                  aria-label={`${displayName(f.name)} verwijderen`}
                >
                  <LuTrash2 />
                </button>
              </div>
              <div className="mt-auto px-3 pb-3 pt-1.5">
                {used.length === 0 ? (
                  <p className="text-[12px] text-black/35">Niet gebruikt</p>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setOpen(open === f.path ? null : f.path)}
                      aria-expanded={open === f.path}
                      className="flex items-center gap-1 text-[12px] font-semibold text-[#0e9f8a] hover:underline"
                    >
                      <LuLink2 className="text-[12px]" /> Gebruikt op {used.length} {used.length === 1 ? "plek" : "plekken"}
                      <LuChevronDown className={`text-[12px] transition ${open === f.path ? "rotate-180" : ""}`} />
                    </button>
                    {open === f.path && (
                      <ul className="mt-1.5 space-y-1">
                        {used.map((u) => (
                          <li key={u.label + u.href} className="truncate text-[12px]">
                            {u.href ? (
                              <Link href={u.href} className="text-[#312e82] hover:text-[#e75387] hover:underline">{u.label}</Link>
                            ) : (
                              <span className="text-black/50">{u.label}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        {files && shown.length === 0 && (
          <p className="col-span-full text-[13.5px] text-black/40">
            {files.length === 0 ? "Nog geen eigen uploads." : "Geen bestanden in deze weergave."}
          </p>
        )}
        {!files && <p className="col-span-full text-[13.5px] text-black/40">Laden…</p>}
      </div>
    </div>
  );
}
