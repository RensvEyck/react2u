"use client";
import { useEffect, useState, useTransition } from "react";
import { LuCircleAlert, LuFileSpreadsheet, LuUpload, LuX } from "react-icons/lu";
import {
  cellenUitTekst, IMPORT_VELD_LABEL, importVoorstel, rijenUitKlantlijst, statusInfo, type Klant, type Kolom, type Voorstel,
} from "@/lib/klanten";
import { kanXlsxLezen, lezenXlsx } from "@/lib/xlsxLezen";
import { importeerKlanten, type ImportResultaat } from "@/app/admin/klantenActions";
import { StatusPill } from "./bits";

/**
 * De klantlijst (klantlijst.xlsx) importeren: het bestand lezen in de browser
 * (lib/xlsxLezen.ts, zonder dependency), eerst een controlerapport (welke
 * kolom wat is, wat nieuw is, wat bijgewerkt wordt, wat opvalt) en pas na
 * "Importeer" naar de server. Dezelfde bedrijfsnaam is dezelfde kaart, dus
 * de lijst kan later opnieuw: zonder dubbelen.
 */
export default function KlantImport({ bestaande, vandaag, onClose, onKlaar }: { bestaande: Klant[]; vandaag: string; onClose: () => void; onKlaar: (r: ImportResultaat) => void }) {
  const [bezig, start] = useTransition();
  const [leest, setLeest] = useState(false);
  const [sleep, setSleep] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);
  const [bron, setBron] = useState<string>("");
  const [kolommen, setKolommen] = useState<Kolom[]>([]);
  const [kopregel, setKopregel] = useState(true);
  const [voorstel, setVoorstel] = useState<Voorstel | null>(null);
  const [plak, setPlak] = useState("");

  useEffect(() => {
    const toets = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  }, [onClose]);

  function verwerk(cellen: string[][], naam: string) {
    const { rijen, kolommen: k, kopregel: kr } = rijenUitKlantlijst(cellen, vandaag);
    setKolommen(k);
    setKopregel(kr);
    setBron(naam);
    if (!rijen.length) {
      setVoorstel(null);
      setMelding("Daar kon ik geen klanten uit halen. Staat de bedrijfsnaam in een kolom met de kop 'klant' of 'bedrijf'?");
      return;
    }
    if (!k.some((x) => x.veld === "bedrijf")) {
      setVoorstel(null);
      setMelding("Ik zie geen kolom met bedrijfsnamen. Zet 'klant' of 'bedrijf' in de kopregel boven die kolom.");
      return;
    }
    setMelding(null);
    setVoorstel(importVoorstel(rijen, bestaande, vandaag));
  }

  async function leesBestand(bestand: File) {
    setLeest(true);
    setMelding(null);
    try {
      const naam = bestand.name.toLowerCase();
      if (naam.endsWith(".csv") || naam.endsWith(".txt") || naam.endsWith(".tsv")) verwerk(cellenUitTekst(await bestand.text()), bestand.name);
      else if (!kanXlsxLezen()) setMelding("Deze browser kan het Excelbestand niet lezen. Bewaar de lijst als csv, of plak de rijen hieronder.");
      else verwerk(await lezenXlsx(await bestand.arrayBuffer()), bestand.name);
    } catch {
      setVoorstel(null);
      setMelding("Dit bestand kon ik niet lezen. Is het het Excelbestand (.xlsx) of een csv? Anders: plak de rijen hieronder.");
    } finally {
      setLeest(false);
    }
  }

  function importeer() {
    if (!voorstel) return;
    const rijen = voorstel.regels.filter((r) => r.actie === "nieuw" || r.actie === "bijwerken").map((r) => r.rij);
    start(async () => {
      const r = await importeerKlanten(rijen);
      if (!r.ok) return setMelding(r.fout);
      onKlaar(r);
    });
  }

  const teDoen = voorstel ? voorstel.telling.nieuw + voorstel.telling.bijwerken : 0;
  const metOpmerking = voorstel ? voorstel.regels.filter((r) => r.waarschuwingen.length).length : 0;
  const ACTIE: Record<string, { label: string; cls: string }> = {
    nieuw: { label: "Nieuw", cls: "bg-[#e3f6ed] text-[#0a7a4b]" },
    bijwerken: { label: "Bijwerken", cls: "bg-[#e6f2ff] text-[#0b6bcb]" },
    ongewijzigd: { label: "Ongewijzigd", cls: "bg-black/[0.05] text-black/50" },
    overslaan: { label: "Overslaan", cls: "bg-[#fff4e5] text-[#b86e00]" },
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[#1c1a4e]/25 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby="kb-import-titel" className="fixed inset-x-3 top-[4vh] z-50 mx-auto flex max-h-[92vh] max-w-[1040px] flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl sm:inset-x-6">
        <header className="flex items-start justify-between gap-4 border-b border-black/[0.06] px-6 py-5">
          <div>
            <h2 id="kb-import-titel" className="font-heading text-[20px] font-bold text-[#312e82]">Klantlijst importeren</h2>
            <p className="text-[13.5px] text-black/50">Je Excelbestand met de klantlijst. Je ziet eerst wat we eruit lezen; daarna zet je het op het bord. Dezelfde bedrijfsnaam wordt dezelfde kaart, dus je kunt de lijst later opnieuw importeren.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-black/40 hover:bg-black/[0.05] hover:text-[#1c1a4e]" aria-label="Sluiten"><LuX /></button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {!voorstel && (
            <>
              <label
                htmlFor="kb-bestand"
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[16px] border-2 border-dashed px-5 py-9 text-center transition-colors ${sleep ? "border-[#312e82] bg-[#f6f5fb]" : "border-black/15 bg-white hover:border-black/30"}`}
                onDragOver={(e) => { e.preventDefault(); setSleep(true); }}
                onDragLeave={() => setSleep(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setSleep(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) void leesBestand(f);
                }}
              >
                <LuFileSpreadsheet className="text-[30px] text-[#312e82]" />
                <span className="text-[15px] font-bold text-[#312e82]">{leest ? "Bestand lezen…" : "Sleep je klantlijst hierheen"}</span>
                <span className="text-[13.5px] text-black/50">of <span className="font-bold text-[#312e82] underline underline-offset-4">kies een bestand</span> (.xlsx of .csv)</span>
                <input
                  id="kb-bestand"
                  type="file"
                  accept=".xlsx,.csv,.txt,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void leesBestand(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <details className="group rounded-[14px] border border-black/[0.08] px-4 py-3">
                <summary className="cursor-pointer list-none text-[13.5px] font-bold text-[#312e82]">Of plak de rijen uit Excel</summary>
                <div className="mt-3 space-y-2">
                  <p className="text-[13px] text-black/50">Selecteer in Excel de kopregel en de rijen, kopieer, en plak ze hier.</p>
                  <textarea id="kb-plak" className="ainput min-h-[110px] font-mono !text-[13px]" value={plak} onChange={(e) => setPlak(e.target.value)} placeholder={"startdatum klant\tklant\tofferte retour\tcontract retour\n1-9-2026\tBakkerij De Korenaar\tja\tja"} spellCheck={false} />
                  <button type="button" className="abtn-ghost !py-1.5 text-[13px]" disabled={!plak.trim()} onClick={() => verwerk(cellenUitTekst(plak), "het plakvak")}>Rijen lezen</button>
                </div>
              </details>
              <div className="rounded-[14px] bg-[#f7f7fc] px-4 py-3 text-[13px] text-black/60">
                <p className="font-semibold text-[#1c1a4e]">Wat we uit de kolommen halen</p>
                <p className="mt-1">
                  <b>klant</b> (de bedrijfsnaam), <b>startdatum</b>, de vinkjes <b>offerte retour</b>, <b>contract retour</b>, <b>formulieren retour</b>, <b>koppeling</b> en <b>naar Exact/facturatie</b>, en een kolom met vrije tekst als <b>laatste stand</b>. Een kolom met namen van mensen wordt de contactpersoon. De status op het bord volgt uit de vinkjes en de stand: contract retour is inrichten, offerte retour is akkoord, &quot;ingericht&quot; is klant.
                </p>
              </div>
            </>
          )}

          {melding && (
            <p className="flex items-start gap-2 rounded-xl bg-[#fff4e5] px-4 py-3 text-[13.5px] font-semibold text-[#b86e00]" role="alert"><LuCircleAlert className="mt-0.5 shrink-0" /> {melding}</p>
          )}

          {voorstel && (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <Cijfer label="Nieuw op het bord" n={voorstel.telling.nieuw} kleur="text-[#0a7a4b]" />
                <Cijfer label="Bijwerken" n={voorstel.telling.bijwerken} kleur="text-[#0b6bcb]" />
                <Cijfer label="Ongewijzigd" n={voorstel.telling.ongewijzigd} kleur="text-black/60" />
                <Cijfer label="Overslaan" n={voorstel.telling.overslaan} kleur={voorstel.telling.overslaan ? "text-[#b86e00]" : "text-black/60"} />
              </div>

              <section className="rounded-[14px] border border-black/[0.08]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] px-4 py-2.5">
                  <h3 className="text-[13px] font-bold text-[#1c1a4e]">Gelezen uit {bron}{kopregel ? "" : ", zonder kopregel"}</h3>
                  <p className="text-[12.5px] text-black/45">{metOpmerking ? `${metOpmerking} ${metOpmerking === 1 ? "rij vraagt" : "rijen vragen"} aandacht` : "Niets opvallends"}</p>
                </div>
                <ul className="flex flex-wrap gap-1.5 px-4 py-3" aria-label="Kolommen">
                  {kolommen.map((k) => (
                    <li key={k.letter} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] ${k.veld ? "bg-[#eef0ff] text-[#312e82]" : k.via === "leeg" ? "bg-black/[0.03] text-black/35" : "bg-[#fff4e5] text-[#b86e00]"}`} title={k.kop ? `Kop: ${k.kop}` : "Zonder kop"}>
                      <span className="font-mono font-bold">{k.letter}</span>
                      <span className="font-semibold">{k.veld ? IMPORT_VELD_LABEL[k.veld] : k.via === "leeg" ? "leeg" : "niet gebruikt"}</span>
                      {k.via === "inhoud" && <span className="text-black/40">(aan de inhoud)</span>}
                    </li>
                  ))}
                </ul>
              </section>

              <div className="overflow-x-auto rounded-[14px] border border-black/[0.08]">
                <table className="w-full min-w-[720px] text-[13px]">
                  <thead>
                    <tr className="border-b border-black/[0.06] text-left text-[11px] font-bold uppercase tracking-[0.08em] text-black/45">
                      <th className="px-3 py-2">Regel</th>
                      <th className="px-3 py-2">Bedrijf</th>
                      <th className="px-3 py-2">Wordt</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Wat verandert</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voorstel.regels.map((r) => (
                      <tr key={r.rij.regel} className="border-b border-black/[0.05] align-top last:border-b-0">
                        <td className="px-3 py-2 tabular-nums text-black/45">{r.rij.regel}</td>
                        <td className="px-3 py-2">
                          <span className="font-semibold text-[#1c1a4e]">{r.rij.bedrijf || <span className="text-black/35">(geen naam)</span>}</span>
                          {r.bestaand && r.bestaand.bedrijf !== r.rij.bedrijf && <span className="block text-[12px] text-black/45">staat als {r.bestaand.bedrijf}</span>}
                          {r.rij.contactpersoon && <span className="block text-[12px] text-black/45">{r.rij.contactpersoon}</span>}
                          {r.rij.stand && <span className="block truncate text-[12px] text-black/45" title={r.rij.stand}>{r.rij.stand}</span>}
                        </td>
                        <td className="px-3 py-2"><span className={`apill !py-0.5 text-[11.5px] ${ACTIE[r.actie].cls}`}>{ACTIE[r.actie].label}</span></td>
                        <td className="px-3 py-2">
                          <StatusPill status={r.status} klein />
                          {r.bestaand && r.bestaand.status !== r.status && <span className="block text-[11.5px] text-black/40">was {statusInfo(r.bestaand.status).label.toLowerCase()}</span>}
                        </td>
                        <td className="px-3 py-2 text-black/60">
                          {r.wijzigingen.length > 0 && <span className="block">{r.wijzigingen.join(", ")}</span>}
                          {r.waarschuwingen.map((w) => <span key={w} className="mt-0.5 flex items-start gap-1 text-[#b86e00]"><LuCircleAlert className="mt-0.5 shrink-0 text-[12px]" /> {w}</span>)}
                          {!r.wijzigingen.length && !r.waarschuwingen.length && r.actie === "nieuw" && <span className="text-black/35">komt erbij</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] px-6 py-4">
          <p className="text-[12.5px] text-black/45">
            {voorstel ? "Een gevulde cel wint, een lege laat staan wat er stond. De status gaat alleen vooruit; een inactieve kaart blijft inactief." : "Niets wordt opgeslagen voordat je op Importeer klikt."}
          </p>
          <div className="flex items-center gap-2">
            {voorstel && <button type="button" className="abtn-ghost !py-2 text-[13.5px]" onClick={() => { setVoorstel(null); setMelding(null); }}>Ander bestand</button>}
            <button type="button" className="abtn-ghost !py-2 text-[13.5px]" onClick={onClose}>Annuleren</button>
            {voorstel && (
              <button type="button" className="abtn !py-2 text-[13.5px] disabled:opacity-40" disabled={bezig || teDoen === 0} onClick={importeer}>
                <LuUpload /> {bezig ? "Importeren…" : teDoen === 0 ? "Niets te importeren" : `Importeer ${teDoen} ${teDoen === 1 ? "rij" : "rijen"}`}
              </button>
            )}
          </div>
        </footer>
      </div>
    </>
  );
}

function Cijfer({ label, n, kleur }: { label: string; n: number; kleur: string }) {
  return (
    <div className="rounded-[14px] border border-black/[0.08] px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-black/45">{label}</p>
      <p className={`mt-1 font-heading text-[24px] font-bold leading-none ${kleur}`}>{n}</p>
    </div>
  );
}
