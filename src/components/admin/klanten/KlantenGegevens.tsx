"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LuCircleCheck, LuDownload, LuUpload, LuX } from "react-icons/lu";
import type { Klant } from "@/lib/klanten";
import { klantenNaarRijen } from "@/lib/stamkaart";
import { xlsx } from "@/lib/xlsx";
import KlantImport from "@/components/admin/klantenbord/KlantImport";
import type { ImportResultaat } from "@/app/admin/klantenActions";

/**
 * De gegevens van alle klanten in één keer (Rens, 23 nov 2026): de
 * klantenlijst naar Excel, met de bedrijfsnaam en de stamkaart als kolommen,
 * en een Excelbestand weer inlezen om de stamkaarten aan te vullen. Dezelfde
 * import als op het bord (KlantImport), maar een nieuw bedrijf komt hier
 * meteen als klant binnen. Wie downloadt, aanvult en hetzelfde bestand weer
 * importeert, vult alle stamkaarten zonder te typen.
 */
export default function KlantenGegevens({ klanten, alle, vandaag }: { klanten: Klant[]; alle: Klant[]; vandaag: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string } | null>(null);

  function exporteer() {
    const bytes = xlsx(klantenNaarRijen(klanten), "Klanten");
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `Klanten React2u ${vandaag}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function klaar(r: ImportResultaat) {
    setOpen(false);
    if (!r.ok) return setMelding({ ok: false, tekst: r.fout });
    const delen = [
      r.stamkaarten ? `${r.stamkaarten} ${r.stamkaarten === 1 ? "stamkaart" : "stamkaarten"} aangevuld` : "",
      r.nieuw ? `${r.nieuw} ${r.nieuw === 1 ? "nieuwe klant" : "nieuwe klanten"}` : "",
      r.bijgewerkt ? `${r.bijgewerkt} bijgewerkt` : "",
      r.ongewijzigd ? `${r.ongewijzigd} ongewijzigd` : "",
      r.overgeslagen ? `${r.overgeslagen} overgeslagen` : "",
    ].filter(Boolean);
    setMelding({ ok: true, tekst: `Geïmporteerd: ${delen.join(", ") || "niets te doen"}.` });
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={exporteer} className="abtn-ghost" disabled={!klanten.length} title="De klanten met hun stamkaart als Excelbestand">
        <LuDownload /> Exporteer naar Excel
      </button>
      <button type="button" onClick={() => { setMelding(null); setOpen(true); }} className="abtn-ghost">
        <LuUpload /> Gegevens importeren
      </button>
      {melding && (
        <p role={melding.ok ? "status" : "alert"} className={`flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold ${melding.ok ? "bg-[#e3f6ed] text-[#0a7a4b]" : "bg-[#fdecea] text-[#b42318]"}`}>
          {melding.ok && <LuCircleCheck className="shrink-0" />}
          <span className="flex-1">{melding.tekst}</span>
          <button type="button" onClick={() => setMelding(null)} className="rounded p-1 opacity-60 hover:opacity-100" aria-label="Melding sluiten"><LuX /></button>
        </p>
      )}
      {open && <KlantImport bestaande={alle} vandaag={vandaag} nieuwAls="klant" titel="Klantgegevens importeren" onClose={() => setOpen(false)} onKlaar={klaar} />}
    </>
  );
}
