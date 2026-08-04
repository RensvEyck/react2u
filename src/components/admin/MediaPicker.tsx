"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LuX, LuImage } from "react-icons/lu";

type Entry = { path: string; url: string; isImage: boolean };

async function walk(prefix: string, depth: number): Promise<string[]> {
  const sb = supabaseBrowser();
  const { data } = await sb.storage.from("media").list(prefix, { limit: 200 });
  const out: string[] = [];
  for (const item of data || []) {
    const full = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id) out.push(full);
    else if (depth > 0) out.push(...(await walk(full, depth - 1)));
  }
  return out;
}

export default function MediaPicker({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    (async () => {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/media/";
      const paths = await walk("", 3);
      setEntries(
        paths
          .filter((p) => !p.endsWith(".emptyFolderPlaceholder"))
          .map((p) => ({ path: p, url: base + p, isImage: /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(p) }))
          .sort((a, b) => a.path.localeCompare(b.path))
      );
    })();
  }, []);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#12103c]/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[80vh] w-full max-w-[860px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-[#312e82]">
            <LuImage /> Kies uit media
          </h3>
          <button onClick={onClose} className="rounded-lg p-2 text-black/40 hover:bg-black/5" aria-label="Sluiten"><LuX /></button>
        </div>
        <div className="overflow-y-auto p-6">
          {!entries && <p className="text-black/50">Laden…</p>}
          {entries && entries.length === 0 && <p className="text-black/50">Geen bestanden gevonden.</p>}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {(entries || []).map((e) => (
              <button
                key={e.path}
                onClick={() => onSelect(e.url)}
                className="group overflow-hidden rounded-xl border border-black/[0.07] text-left transition hover:border-[#e75387] hover:shadow-md"
              >
                {e.isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.url} alt="" className="h-28 w-full bg-[#f4f4f9] object-contain" loading="lazy" />
                ) : (
                  <div className="flex h-28 items-center justify-center bg-[#f4f4f9] text-[13px] font-semibold text-black/40">
                    {e.path.split(".").pop()?.toUpperCase()}
                  </div>
                )}
                <p className="truncate px-2.5 py-2 text-[12px] text-black/60 group-hover:text-[#e75387]" title={e.path}>
                  {e.path.split("/").pop()}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
