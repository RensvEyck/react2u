"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LuDownload, LuFileText, LuImage, LuSignature, LuTrash2, LuUpload } from "react-icons/lu";
import { supabaseBrowser } from "@/lib/supabase/client";
import { registreerKlantBestand, verwijderKlantBestand } from "@/app/admin/stamkaartActions";
import { fileSize } from "@/lib/mediaUsage";
import { ACCEPT, BESTAND_SOORTEN, bestandFout, bestandPad, bestandSoortLabel, bestandType, KLANT_BUCKET, type KlantBestand, type KlantBestandSoort } from "@/lib/klantBestanden";
import { datumLang } from "@/lib/offertes";

/**
 * Het uploadvak bij een klant (migratie 0048), naar het voorbeeld van de
 * partnerbestanden: slepen of kiezen, meerdere tegelijk. Het bestand gaat met
 * de sessie van de collega rechtstreeks de privébucket in; daarna legt
 * registreerKlantBestand het vast. Downloaden via /admin/klantbestand/<id>.
 */
export default function KlantBestanden({ klantId, bedrijf, bestanden }: { klantId: string; bedrijf: string; bestanden: KlantBestand[] }) {
  const router = useRouter();
  const invoer = useRef<HTMLInputElement>(null);
  const [soort, setSoort] = useState<KlantBestandSoort>("overig");
  const [omschrijving, setOmschrijving] = useState("");
  const [slepen, setSlepen] = useState(false);
  const [voortgang, setVoortgang] = useState<{ klaar: number; totaal: number } | null>(null);
  const [fouten, setFouten] = useState<string[]>([]);
  const [melding, setMelding] = useState<string | null>(null);
  const [bezig, start] = useTransition();

  // Na elkaar, met voortgang; één mislukt bestand houdt de rest niet tegen.
  async function upload(lijst: File[]) {
    if (!lijst.length || voortgang) return;
    setFouten([]);
    setMelding(null);
    const mis: string[] = [];
    const sb = supabaseBrowser();
    let gelukt = 0;
    for (let i = 0; i < lijst.length; i++) {
      setVoortgang({ klaar: i, totaal: lijst.length });
      const f = lijst[i];
      const fout = bestandFout(f);
      if (fout) {
        mis.push(fout);
        continue;
      }
      const pad = bestandPad(klantId, f.name, Date.now() + i);
      const { error } = await sb.storage.from(KLANT_BUCKET).upload(pad, f, { contentType: bestandType(f.name) || undefined, upsert: false });
      if (error) {
        mis.push(`${f.name}: uploaden mislukt (${error.message}).`);
        continue;
      }
      const res = await registreerKlantBestand(klantId, { pad, naam: f.name, grootte: f.size, soort, omschrijving: omschrijving || null });
      if (!res.ok) mis.push(`${f.name}: ${res.fout}`);
      else gelukt++;
    }
    setVoortgang(null);
    setFouten(mis);
    if (gelukt) {
      setMelding(gelukt === 1 ? "Bestand geüpload." : `${gelukt} bestanden geüpload.`);
      setOmschrijving("");
    }
    if (invoer.current) invoer.current.value = "";
    router.refresh();
  }

  function weg(b: KlantBestand) {
    if (!window.confirm(`"${b.naam}" verwijderen bij ${bedrijf}? Dat kan niet ongedaan worden gemaakt.`)) return;
    setFouten([]);
    setMelding(null);
    start(async () => {
      const res = await verwijderKlantBestand(klantId, b.id);
      if (!res.ok) setFouten([res.fout || "Verwijderen mislukt."]);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {bestanden.length > 0 && (
        <ul className="divide-y divide-black/[0.05] rounded-[14px] border border-black/[0.06]">
          {bestanden.map((b) => {
            const Icoon = b.type?.startsWith("image/") ? LuImage : LuFileText;
            return (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" data-bestand={b.id}>
                <span className="flex min-w-0 items-start gap-3">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${b.soort === "overeenkomst" ? "bg-[#e3f6ed] text-[#0a7a4b]" : "bg-black/[0.04] text-black/50"}`}>
                    {b.soort === "overeenkomst" ? <LuSignature /> : <Icoon />}
                  </span>
                  <span className="min-w-0">
                    <a href={`/admin/klantbestand/${b.id}`} className="block break-all text-[14px] font-semibold text-[#1c1a4e] hover:text-[#312e82] hover:underline">{b.naam}</a>
                    <span className="block text-[12.5px] text-black/45">
                      {bestandSoortLabel(b.soort)}{b.omschrijving ? `: ${b.omschrijving}` : ""}
                      {b.grootte ? ` · ${fileSize(b.grootte)}` : ""} · {datumLang(b.created_at)}{b.geupload_door ? ` door ${b.geupload_door.split("@")[0]}` : ""}
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <a href={`/admin/klantbestand/${b.id}`} className="abtn-ghost !py-1.5 text-[13px]" aria-label={`Download ${b.naam}`}><LuDownload /> Download</a>
                  <button type="button" onClick={() => weg(b)} disabled={bezig} aria-label={`Verwijder ${b.naam}`}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-black/45 hover:bg-[#fdeef4] hover:text-[#e0356b] disabled:opacity-50">
                    <LuTrash2 className="text-[13px]" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <fieldset className="flex flex-wrap gap-x-5 gap-y-2 border-0 p-0">
          <legend className="alabel">Wat upload je?</legend>
          {BESTAND_SOORTEN.map((s) => (
            <label key={s.key} className="flex items-center gap-2 text-[13.5px] text-[#1c1a4e]" title={s.uitleg}>
              <input type="radio" name="kb-soort" value={s.key} checked={soort === s.key} onChange={() => setSoort(s.key)} className="accent-[#312e82]" />
              {s.label}
            </label>
          ))}
        </fieldset>
        <label className="min-w-[220px] flex-1">
          <span className="alabel">Omschrijving (mag leeg)</span>
          <input id="kb-omschrijving" className="ainput !py-1.5 !text-[14px]" value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} placeholder="Bijvoorbeeld: getekend contract per post, 12 november" maxLength={300} />
        </label>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Bestanden uploaden: sleep ze hierheen of kies ze"
        onClick={() => invoer.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); invoer.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setSlepen(true); }}
        onDragLeave={() => setSlepen(false)}
        onDrop={(e) => { e.preventDefault(); setSlepen(false); upload(Array.from(e.dataTransfer.files)); }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-[16px] border-2 border-dashed px-6 py-8 text-center transition-colors ${slepen ? "border-[#312e82] bg-[#eef0ff]" : "border-black/[0.12] hover:border-[#312e82]/50 hover:bg-black/[0.015]"}`}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef0ff] text-[20px] text-[#312e82]"><LuUpload /></span>
        <span className="text-[14.5px] font-semibold text-[#1c1a4e]">
          {voortgang ? `Uploaden… ${voortgang.klaar + 1} van ${voortgang.totaal}` : "Sleep bestanden hierheen, of klik om ze te kiezen"}
        </span>
        <span className="text-[12.5px] text-black/45">Pdf, Word, Excel of een scan (jpg, png, heic), tot 20 MB per bestand.</span>
      </div>
      {/* Buiten het sleepvlak: anders komt de klik op het veld weer bij het vlak terecht. */}
      <input
        ref={invoer}
        id="kb-bestand"
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => upload(Array.from(e.target.files || []))}
      />

      {melding && <p role="status" className="text-[13.5px] font-semibold text-[#0a7a4b]">{melding}</p>}
      {fouten.length > 0 && (
        <div role="alert" className="rounded-[10px] bg-[#fdecea] px-3 py-2 text-[13.5px] text-[#b42318]">
          {fouten.map((f) => <p key={f}>{f}</p>)}
        </div>
      )}
    </div>
  );
}
