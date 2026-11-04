"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { registreerPartnerBestand, verwijderPartnerBestand } from "@/app/admin/partnerBestandActions";
import { fileSize } from "@/lib/mediaUsage";
import { ACCEPT, bestandFout, bestandPad, bestandType, PARTNER_BUCKET, type PartnerBestand, type PartnerBestandSoort } from "@/lib/partnerBestanden";
import { LuUpload, LuFileText, LuImage, LuDownload, LuTrash2, LuSignature } from "react-icons/lu";

/**
 * Het uploadvak bij een partner (migratie 0034): voor een resellerovereenkomst
 * die buiten de online route om is verstuurd en getekend, en voor andere
 * stukken van het kantoor. Slepen of kiezen, meerdere tegelijk. Het bestand gaat
 * met de sessie van de collega rechtstreeks de privébucket in; daarna legt
 * registreerPartnerBestand het vast.
 */

const datumKort = (d: string) => new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
const vandaag = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });

export default function PartnerBestanden({ partnerId, kantoor, bestanden }: { partnerId: string; kantoor: string; bestanden: PartnerBestand[] }) {
  const router = useRouter();
  const invoer = useRef<HTMLInputElement>(null);
  const [soort, setSoort] = useState<PartnerBestandSoort>(bestanden.some((b) => b.soort === "overeenkomst") ? "overig" : "overeenkomst");
  const [getekendOp, setGetekendOp] = useState(vandaag());
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
      const pad = bestandPad(partnerId, f.name, Date.now() + i);
      const { error } = await sb.storage.from(PARTNER_BUCKET).upload(pad, f, { contentType: bestandType(f.name) || undefined, upsert: false });
      if (error) {
        mis.push(`${f.name}: uploaden mislukt (${error.message}).`);
        continue;
      }
      const res = await registreerPartnerBestand(partnerId, { pad, naam: f.name, grootte: f.size, soort, getekend_op: soort === "overeenkomst" ? getekendOp : null });
      if (!res.ok) mis.push(`${f.name}: ${res.fout}`);
      else gelukt++;
    }
    setVoortgang(null);
    setFouten(mis);
    if (gelukt) setMelding(gelukt === 1 ? "Bestand geüpload." : `${gelukt} bestanden geüpload.`);
    if (invoer.current) invoer.current.value = "";
    router.refresh();
  }

  function weg(b: PartnerBestand) {
    if (!window.confirm(`"${b.naam}" verwijderen bij ${kantoor}? Dat kan niet ongedaan worden gemaakt.`)) return;
    setFouten([]);
    setMelding(null);
    start(async () => {
      const res = await verwijderPartnerBestand(partnerId, b.id);
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
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="flex min-w-0 items-start gap-3">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${b.soort === "overeenkomst" ? "bg-[#e3f6ed] text-[#0a7a4b]" : "bg-black/[0.04] text-black/50"}`}>
                    {b.soort === "overeenkomst" ? <LuSignature /> : <Icoon />}
                  </span>
                  <span className="min-w-0">
                    <a href={`/admin/partnerbestand/${b.id}`} className="block break-all text-[14px] font-semibold text-[#1c1a4e] hover:text-[#312e82] hover:underline">{b.naam}</a>
                    <span className="block text-[12.5px] text-black/45">
                      {b.soort === "overeenkomst" ? `Getekende resellerovereenkomst${b.getekend_op ? `, getekend op ${datumKort(b.getekend_op)}` : ""}` : "Bestand"}
                      {b.grootte ? ` · ${fileSize(b.grootte)}` : ""} · {datumKort(b.created_at)}{b.geupload_door ? ` door ${b.geupload_door}` : ""}
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <a href={`/admin/partnerbestand/${b.id}`} className="abtn-ghost !py-1.5 text-[13px]" aria-label={`Download ${b.naam}`}><LuDownload /> Download</a>
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

      <fieldset className="flex flex-wrap items-end gap-x-6 gap-y-3 border-0 p-0">
        <legend className="sr-only">Wat upload je?</legend>
        <label className="flex items-center gap-2 text-[13.5px] text-[#1c1a4e]">
          <input type="radio" name="pb-soort" checked={soort === "overeenkomst"} onChange={() => setSoort("overeenkomst")} className="accent-[#312e82]" />
          Getekende resellerovereenkomst
        </label>
        <label className="flex items-center gap-2 text-[13.5px] text-[#1c1a4e]">
          <input type="radio" name="pb-soort" checked={soort === "overig"} onChange={() => setSoort("overig")} className="accent-[#312e82]" />
          Ander bestand
        </label>
        {soort === "overeenkomst" && (
          <label className="flex items-center gap-2 text-[13.5px] text-black/55">
            Getekend op
            <input id="pb-getekend" type="date" className="ainput !w-auto !py-1.5" value={getekendOp} max={vandaag()} onChange={(e) => setGetekendOp(e.target.value)} />
          </label>
        )}
      </fieldset>

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
        <span className="text-[12.5px] text-black/45">Pdf, Word of een scan (jpg, png, heic), tot 20 MB per bestand. Alleen collega&apos;s met het salesrecht zien ze.</span>
      </div>
      {/* Buiten het sleepvlak: anders komt de klik op het veld weer bij het vlak terecht. */}
      <input
        ref={invoer}
        id="pb-bestand"
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
