"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  LuArrowRight, LuCheck, LuCircleAlert, LuClipboardPaste, LuDownload, LuFileSpreadsheet, LuIdCard, LuLayoutGrid, LuRotateCcw, LuUpload, LuX,
} from "react-icons/lu";
import {
  cellenUitTekst, IMPORT_VELD_LABEL, importVoorstel, naarStamkaart, rijenUitKlantlijst, STAMKAART_IMPORT, stamkaartTelling, statusInfo, type ImportRij, type ImportVeld,
  type Klant, type KlantStatus, type Kolom, type Voorstel, type Voorstelregel,
} from "@/lib/klanten";
import { importGegevens, klantenNaarRijen, volledigheidNaImport, type ImportGegeven, type Volledigheid } from "@/lib/stamkaart";
import { kanXlsxLezen, lezenXlsx } from "@/lib/xlsxLezen";
import { xlsx } from "@/lib/xlsx";
import { importeerKlanten, type ImportResultaat } from "@/app/admin/klantenActions";
import { StatusPill } from "./bits";

/**
 * Een Excelbestand met klanten inlezen, in drie stappen: het bestand kiezen
 * (of rijen plakken), het controlerapport, en de bevestiging.
 *
 * Het bestand wordt in de browser gelezen (lib/xlsxLezen.ts, zonder
 * dependency); pas na "Importeer" gaat er iets naar de server. Dezelfde
 * bedrijfsnaam is dezelfde kaart, dus een lijst kan later opnieuw.
 *
 * Kolommen met stamkaartgegevens (KvK, adres, facturatie, ...) vullen de
 * stamkaart van al die klanten in één keer; standaard alleen wat daar nog
 * leeg is, met de keuze om te overschrijven. Het rapport laat per klant de
 * waarden zien die erop komen en hoe compleet de stamkaart daarna is, zodat je
 * ziet wat er gebeurt in plaats van alleen welke velden. Vanaf de klantenlijst
 * (`nieuwAls="klant"`) komt een nieuw bedrijf meteen als klant binnen, en kun
 * je in stap 1 de lijst downloaden om in te vullen (`exportKlanten`).
 */

const ROZE = "#c2105e";

type Filter = "alle" | "stamkaart" | "nieuw" | "aandacht" | "ongewijzigd";

export default function KlantImport({
  bestaande, vandaag, onClose, onKlaar, nieuwAls, titel = "Klantlijst importeren", exportKlanten,
}: {
  bestaande: Klant[];
  vandaag: string;
  onClose: () => void;
  /** Na de bevestiging (Sluiten), met het resultaat. */
  onKlaar: (r: ImportResultaat) => void;
  /** Vanaf de klantenlijst: een nieuw bedrijf is minstens klant. */
  nieuwAls?: KlantStatus;
  titel?: string;
  /** De klanten om in stap 1 als Excel te downloaden, aan te vullen en weer in te lezen. */
  exportKlanten?: Klant[];
}) {
  const router = useRouter();
  const [bezig, start] = useTransition();
  const [leest, setLeest] = useState(false);
  const [sleep, setSleep] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);
  const [bron, setBron] = useState<string>("");
  const [kolommen, setKolommen] = useState<Kolom[]>([]);
  const [kopregel, setKopregel] = useState(true);
  const [rijen, setRijen] = useState<ImportRij[]>([]);
  const [overschrijven, setOverschrijven] = useState(false);
  const [plak, setPlak] = useState("");
  const [filter, setFilter] = useState<Filter>("alle");
  const [resultaat, setResultaat] = useState<Extract<ImportResultaat, { ok: true }> | null>(null);

  const voorstel: Voorstel | null = useMemo(
    () => (rijen.length ? importVoorstel(rijen, bestaande, vandaag, { stamkaartOverschrijven: overschrijven, nieuwAls }) : null),
    [rijen, bestaande, vandaag, overschrijven, nieuwAls],
  );
  const perId = useMemo(() => new Map(bestaande.map((k) => [k.id, k])), [bestaande]);
  const metStamkaart = kolommen.some((k) => naarStamkaart(k.veld));
  const sk = voorstel ? stamkaartTelling(voorstel) : null;
  const stap = resultaat ? 3 : voorstel ? 2 : 1;

  function sluit() {
    if (resultaat) onKlaar(resultaat);
    else onClose();
  }

  useEffect(() => {
    const toets = (e: KeyboardEvent) => {
      if (e.key === "Escape") sluit();
    };
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  });

  function verwerk(cellen: string[][], naam: string) {
    const { rijen, kolommen: k, kopregel: kr } = rijenUitKlantlijst(cellen, vandaag);
    setKolommen(k);
    setKopregel(kr);
    setBron(naam);
    setFilter("alle");
    if (!rijen.length) {
      setRijen([]);
      setMelding("Daar kon ik geen klanten uit halen. Staat de bedrijfsnaam in een kolom met de kop 'klant' of 'bedrijf'?");
      return;
    }
    if (!k.some((x) => x.veld === "bedrijf")) {
      setRijen([]);
      setMelding("Ik zie geen kolom met bedrijfsnamen. Zet 'klant' of 'bedrijf' in de kopregel boven die kolom.");
      return;
    }
    setMelding(null);
    setRijen(rijen);
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
      setRijen([]);
      setMelding("Dit bestand kon ik niet lezen. Is het het Excelbestand (.xlsx) of een csv? Anders: plak de rijen hieronder.");
    } finally {
      setLeest(false);
    }
  }

  function download() {
    if (!exportKlanten) return;
    const url = URL.createObjectURL(new Blob([new Uint8Array(xlsx(klantenNaarRijen(exportKlanten), "Klanten"))], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `Klanten React2u ${vandaag}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importeer() {
    if (!voorstel) return;
    const teSturen = voorstel.regels.filter((r) => r.actie === "nieuw" || r.actie === "bijwerken").map((r) => r.rij);
    start(async () => {
      const r = await importeerKlanten(teSturen, { stamkaartOverschrijven: overschrijven, nieuwAls });
      if (!r.ok) return setMelding(r.fout);
      setResultaat(r);
      // Wat erachter staat (het bord, de lijst) meteen bijwerken; de bevestiging blijft staan tot Sluiten.
      router.refresh();
    });
  }

  function opnieuw() {
    setRijen([]);
    setMelding(null);
    setOverschrijven(false);
    setResultaat(null);
    setPlak("");
  }

  const teDoen = voorstel ? voorstel.telling.nieuw + voorstel.telling.bijwerken : 0;
  const aandacht = voorstel ? voorstel.regels.filter((r) => r.waarschuwingen.length).length : 0;
  const metStamkaartWijziging = (r: Voorstelregel) => r.stamkaart.aangevuld.length + r.stamkaart.overschreven.length > 0;
  const tabs: { key: Filter; label: string; n: number }[] = voorstel
    ? [
        { key: "alle", label: "Alles", n: voorstel.regels.length },
        { key: "stamkaart", label: "Stamkaart", n: voorstel.regels.filter(metStamkaartWijziging).length },
        { key: "nieuw", label: "Nieuw", n: voorstel.telling.nieuw },
        { key: "aandacht", label: "Aandacht", n: aandacht },
        { key: "ongewijzigd", label: "Ongewijzigd", n: voorstel.telling.ongewijzigd + voorstel.telling.overslaan },
      ]
    : [];
  const zichtbaar = voorstel
    ? voorstel.regels.filter((r) =>
        filter === "alle" ? true
          : filter === "stamkaart" ? metStamkaartWijziging(r)
            : filter === "nieuw" ? r.actie === "nieuw"
              : filter === "aandacht" ? r.waarschuwingen.length > 0
                : r.actie === "ongewijzigd" || r.actie === "overslaan")
    : [];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[#1c1a4e]/30 backdrop-blur-[2px]" onClick={sluit} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby="kb-import-titel" className="fixed inset-x-2 top-[2vh] z-50 mx-auto flex max-h-[96vh] max-w-[1080px] flex-col overflow-hidden rounded-[22px] bg-[#fbfbfe] shadow-[0_30px_80px_-20px_rgba(28,26,78,0.45)] sm:inset-x-6 sm:top-[3vh] sm:max-h-[94vh]">
        <header className="border-b border-black/[0.06] bg-white px-5 pb-4 pt-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em] text-black/40">
                {nieuwAls ? <><LuIdCard className="text-[13px]" /> Klanten</> : <><LuLayoutGrid className="text-[13px]" /> Klantenbord</>}
              </p>
              <h2 id="kb-import-titel" className="mt-0.5 font-heading text-[21px] font-bold text-[#312e82]">{titel}</h2>
            </div>
            <button type="button" onClick={sluit} className="-mr-2 rounded-lg p-2 text-black/40 hover:bg-black/[0.05] hover:text-[#1c1a4e]" aria-label="Sluiten"><LuX /></button>
          </div>
          <ol className="mt-4 flex items-center gap-2 text-[13px]" aria-label="Stappen">
            {["Bestand", "Controleren", "Klaar"].map((label, i) => {
              const n = i + 1;
              const hier = n === stap;
              const klaar = n < stap;
              return (
                <li key={label} className="flex items-center gap-2" aria-current={hier ? "step" : undefined}>
                  {i > 0 && <span aria-hidden="true" className={`h-px w-5 sm:w-10 ${klaar || hier ? "bg-[#312e82]" : "bg-black/15"}`} />}
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${klaar ? "bg-[#0a7a4b] text-white" : hier ? "bg-[#312e82] text-white" : "bg-black/[0.06] text-black/40"}`}>
                    {klaar ? <LuCheck className="text-[13px]" /> : n}
                  </span>
                  <span className={`font-semibold ${hier ? "text-[#1c1a4e]" : klaar ? "text-black/55" : "text-black/35"}`}>{label}</span>
                </li>
              );
            })}
          </ol>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {melding && (
            <p className="mb-4 flex items-start gap-2 rounded-xl bg-[#fff4e5] px-4 py-3 text-[13.5px] font-semibold text-[#b86e00]" role="alert"><LuCircleAlert className="mt-0.5 shrink-0" /> {melding}</p>
          )}

          {stap === 1 && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="space-y-3">
                <label
                  htmlFor="kb-bestand"
                  className={`group flex min-h-[230px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed px-6 py-10 text-center transition-colors ${sleep ? "border-[#312e82] bg-[#eef0ff]" : "border-[#312e82]/20 bg-white hover:border-[#312e82]/45 hover:bg-[#f7f7fc]"}`}
                  onDragOver={(e) => { e.preventDefault(); setSleep(true); }}
                  onDragLeave={() => setSleep(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setSleep(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) void leesBestand(f);
                  }}
                >
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#eef0ff] text-[26px] text-[#312e82] transition-transform group-hover:-translate-y-0.5"><LuFileSpreadsheet /></span>
                  <span className="font-heading text-[18px] font-bold text-[#1c1a4e]">{leest ? "Bestand lezen…" : "Sleep je Excelbestand hierheen"}</span>
                  <span className="text-[13.5px] text-black/50">of <span className="font-bold text-[#312e82] underline underline-offset-4">kies een bestand</span> · .xlsx of .csv</span>
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
                <details className="group rounded-[16px] border border-black/[0.08] bg-white">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13.5px] font-bold text-[#312e82] [&::-webkit-details-marker]:hidden">
                    <LuClipboardPaste className="text-[15px]" /> Of plak de rijen uit Excel
                  </summary>
                  <div className="space-y-2 border-t border-black/[0.06] px-4 pb-4 pt-3">
                    <p className="text-[13px] text-black/50">Selecteer in Excel de kopregel en de rijen, kopieer, en plak ze hier.</p>
                    <textarea id="kb-plak" className="ainput min-h-[110px] font-mono !text-[13px]" value={plak} onChange={(e) => setPlak(e.target.value)} placeholder={nieuwAls ? "Klant\tKvK-nummer\tBezoekadres\tPostcode\tPlaats\nBakkerij De Korenaar\t17061007\tPaaldijk 11\t5595 XL\tLeende" : "startdatum klant\tklant\tofferte retour\tcontract retour\n1-9-2026\tBakkerij De Korenaar\tja\tja"} spellCheck={false} />
                    <button type="button" className="abtn-ghost !py-1.5 text-[13px]" disabled={!plak.trim()} onClick={() => verwerk(cellenUitTekst(plak), "het plakvak")}>Rijen lezen</button>
                  </div>
                </details>
              </div>

              <aside className="space-y-4 rounded-[20px] bg-white p-5 ring-1 ring-black/[0.06]">
                <p className="font-heading text-[15px] font-bold text-[#1c1a4e]">Zo werkt het</p>
                <ol className="space-y-3.5">
                  {(nieuwAls
                    ? [
                        { kop: "Download de klantenlijst", tekst: "Alle klanten met de velden van de stamkaart als kolommen.", knop: exportKlanten ? <button type="button" onClick={download} className="abtn-ghost mt-2 !py-1.5 text-[13px]"><LuDownload /> Download Excel ({exportKlanten.length} {exportKlanten.length === 1 ? "klant" : "klanten"})</button> : null },
                        { kop: "Vul aan wat ontbreekt", tekst: "Laat de kopregel staan. Een lege cel laat staan wat er al is; een eigen lijst mag ook, met koppen als KvK-nummer of Straat en Huisnummer.", knop: null },
                        { kop: "Lees het bestand in", tekst: "Je ziet eerst per klant wat er op de stamkaart komt. Pas daarna sla je op.", knop: null },
                      ]
                    : [
                        { kop: "Kies je klantlijst", tekst: "Het Excelbestand, een csv, of geplakte rijen.", knop: null },
                        { kop: "Controleer het rapport", tekst: "Per rij: nieuw op het bord, bijwerken of niets, en wat er opvalt.", knop: null },
                        { kop: "Importeer", tekst: "Dezelfde bedrijfsnaam is dezelfde kaart; de lijst kan later opnieuw, zonder dubbelen.", knop: null },
                      ]
                  ).map((s, i) => (
                    <li key={s.kop} className="flex gap-3">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#eef0ff] text-[12px] font-bold text-[#312e82]">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#1c1a4e]">{s.kop}</p>
                        <p className="text-[13px] leading-[1.5] text-black/55">{s.tekst}</p>
                        {s.knop}
                      </div>
                    </li>
                  ))}
                </ol>
                <details className="group border-t border-black/[0.06] pt-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] [&::-webkit-details-marker]:hidden">
                    <span><span className="font-semibold text-[#1c1a4e]">Kolommen die we herkennen</span> <span className="text-black/45">KvK, adres, facturatie{nieuwAls ? "" : ", de vinkjes van het bord"} en meer</span></span>
                    <span className="shrink-0 text-[12.5px] font-semibold text-[#312e82] group-open:hidden">Toon</span>
                    <span className="hidden shrink-0 text-[12.5px] font-semibold text-[#312e82] group-open:inline">Verberg</span>
                  </summary>
                  <div className="mt-3 space-y-2">
                    <VeldTags titel="Stamkaart" kleur="roze" velden={["contactpersoon", "telefoon", "email", ...STAMKAART_IMPORT.map((x) => x.veld), "casemanager"]} />
                    {!nieuwAls && <VeldTags titel="Bord" kleur="indigo" velden={["bedrijf", "startdatum", "offerte_retour", "contract_retour", "formulieren_retour", "koppeling", "facturatie", "stand", "eigenaar", "volgende_actie", "bron"]} />}
                  </div>
                </details>
              </aside>
            </div>
          )}

          {stap === 2 && voorstel && (
            <div className="space-y-5">
              <section className="flex flex-col gap-4 rounded-[20px] bg-white p-5 ring-1 ring-black/[0.06] sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  {metStamkaart && sk ? (
                    <p className="font-heading text-[24px] font-bold leading-tight sm:text-[28px]">
                      <span style={{ color: ROZE }}>{sk.velden} {sk.velden === 1 ? "gegeven" : "gegevens"}</span>{" "}
                      <span className="text-[#1c1a4e]">voor {sk.kaarten} {sk.kaarten === 1 ? "stamkaart" : "stamkaarten"}</span>
                    </p>
                  ) : (
                    <p className="font-heading text-[24px] font-bold leading-tight text-[#1c1a4e] sm:text-[28px]">{teDoen} {teDoen === 1 ? "kaart" : "kaarten"} <span className="text-black/45">op het bord</span></p>
                  )}
                  <p className="mt-1 text-[13px] text-black/50">Gelezen uit {bron}{kopregel ? "" : ", zonder kopregel"} · {voorstel.regels.length} {voorstel.regels.length === 1 ? "rij" : "rijen"}</p>
                </div>
                <ul className="flex flex-wrap gap-1.5" aria-label="Telling">
                  <Telling soort="nieuw" label={nieuwAls ? "Nieuwe klanten" : "Nieuw op het bord"} n={voorstel.telling.nieuw} kleur="#0a7a4b" />
                  <Telling soort="bijwerken" label="Bijwerken" n={voorstel.telling.bijwerken} kleur="#0b6bcb" />
                  <Telling soort="ongewijzigd" label="Ongewijzigd" n={voorstel.telling.ongewijzigd} kleur="#6b6a85" />
                  <Telling soort="overslaan" label="Overslaan" n={voorstel.telling.overslaan} kleur="#b86e00" />
                </ul>
              </section>

              {metStamkaart && (
                <section className="flex flex-col gap-3 rounded-[20px] bg-[#fdecf4]/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" aria-label="Stamkaart">
                  <p className="flex min-w-0 items-start gap-2.5 text-[13.5px] leading-[1.5] text-[#1c1a4e]">
                    <LuIdCard className="mt-0.5 shrink-0 text-[16px]" style={{ color: ROZE }} />
                    <span>
                      {overschrijven
                        ? "Wat er al op de stamkaart staat en anders is in het bestand, wordt vervangen."
                        : sk && sk.behouden
                          ? `${sk.behouden} ${sk.behouden === 1 ? "gegeven staat" : "gegevens staan"} al anders op de stamkaart; dat blijft staan.`
                          : "Alleen lege velden op de stamkaart worden ingevuld; wat er al staat, blijft staan."}
                    </span>
                  </p>
                  <div role="radiogroup" aria-label="Wat er al op de stamkaart staat" className="flex shrink-0 self-start rounded-full bg-white p-1 text-[13px] font-semibold ring-1 ring-black/[0.06] sm:self-auto">
                    <button type="button" id="kb-alleen-leeg" role="radio" aria-checked={!overschrijven} onClick={() => setOverschrijven(false)} className={`rounded-full px-3.5 py-1.5 transition-colors ${!overschrijven ? "bg-[#312e82] text-white" : "text-black/55 hover:text-[#1c1a4e]"}`}>Alleen lege velden</button>
                    <button type="button" id="kb-overschrijven" role="radio" aria-checked={overschrijven} onClick={() => setOverschrijven(true)} className={`rounded-full px-3.5 py-1.5 transition-colors ${overschrijven ? "bg-[#b86e00] text-white" : "text-black/55 hover:text-[#1c1a4e]"}`}>Ook overschrijven</button>
                  </div>
                </section>
              )}

              <Kolommen kolommen={kolommen} />

              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Rijen">
                {tabs.filter((t) => t.key === "alle" || t.n > 0).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={filter === t.key}
                    onClick={() => setFilter(t.key)}
                    className={`apill !py-1.5 text-[13px] ${filter === t.key ? "bg-[#312e82] text-white" : t.key === "aandacht" ? "bg-[#fff4e5] text-[#b86e00] hover:bg-[#ffecd0]" : "bg-black/[0.04] text-black/60 hover:bg-black/[0.07]"}`}
                  >
                    {t.label} <span className={filter === t.key ? "text-white/70" : "opacity-60"}>{t.n}</span>
                  </button>
                ))}
              </div>

              <ul className="space-y-2.5">
                {zichtbaar.map((r) => (
                  <Rij key={r.rij.regel} r={r} b={r.bestaand ? perId.get(r.bestaand.id) ?? null : null} nieuwAls={nieuwAls} metStamkaart={metStamkaart} />
                ))}
              </ul>
            </div>
          )}

          {stap === 3 && resultaat && <Klaar r={resultaat} metStamkaart={metStamkaart} nieuwAls={nieuwAls} />}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] bg-white px-5 py-4 sm:px-7">
          <p className="hidden max-w-[520px] text-[12.5px] leading-[1.5] text-black/45 sm:block">
            {stap === 1 && "Niets wordt opgeslagen voordat je op Importeer klikt."}
            {stap === 2 && `Een gevulde cel wint, een lege laat staan wat er stond${metStamkaart ? (overschrijven ? "; ook op de stamkaart" : "; op de stamkaart alleen in lege velden") : ""}. De status gaat alleen vooruit.`}
            {stap === 3 && "Alles staat in de tijdlijn van elke klant."}
          </p>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            {stap === 2 && <button type="button" className="abtn-ghost !py-2 text-[13.5px]" onClick={opnieuw}><LuRotateCcw /> Ander bestand</button>}
            {stap === 3 && <button type="button" className="abtn-ghost !py-2 text-[13.5px]" onClick={opnieuw}><LuRotateCcw /> Nog een bestand</button>}
            {stap < 3 && (
              // .abtn-ghost staat buiten een laag en wint van `hidden`; de wrapper verbergt hem op een telefoon (daar is het kruisje).
              <span className="hidden sm:contents">
                <button type="button" className="abtn-ghost !py-2 text-[13.5px]" onClick={onClose}>Annuleren</button>
              </span>
            )}
            {stap === 2 && (
              <button type="button" className="abtn !py-2 text-[13.5px] disabled:opacity-40" disabled={bezig || teDoen === 0} onClick={importeer}>
                <LuUpload /> {bezig ? "Importeren…" : teDoen === 0 ? "Niets te importeren" : `Importeer ${teDoen} ${teDoen === 1 ? "rij" : "rijen"}`}
              </button>
            )}
            {stap === 3 && <button type="button" className="abtn !py-2 text-[13.5px]" onClick={sluit}>Sluiten</button>}
          </div>
        </footer>
      </div>
    </>
  );
}

/** Een groep veldnamen als tags, voor "Kolommen die we herkennen". */
function VeldTags({ titel, kleur, velden }: { titel: string; kleur: "roze" | "indigo"; velden: ImportVeld[] }) {
  return (
    <div>
      <p className="mb-1 text-[12px] font-semibold text-black/50">{titel}</p>
      <ul className="flex flex-wrap gap-1">
        {velden.map((v) => (
          <li key={v} className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${kleur === "roze" ? "bg-[#fdecf4] text-[#c2105e]" : "bg-[#eef0ff] text-[#312e82]"}`}>{IMPORT_VELD_LABEL[v]}</li>
        ))}
      </ul>
    </div>
  );
}

function Telling({ soort, label, n, kleur }: { soort: string; label: string; n: number; kleur: string }) {
  return (
    <li className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] ${n ? "bg-black/[0.035]" : "ring-1 ring-black/[0.06]"}`} data-telling={soort}>
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: n ? kleur : "rgba(0,0,0,0.15)" }} />
      <span className={n ? "text-black/60" : "text-black/35"}>{label}</span>
      <b className="tabular-nums" style={{ color: n ? kleur : "rgba(0,0,0,0.3)" }}>{n}</b>
    </li>
  );
}

/** Welke kolom wat werd, ingeklapt als alles herkend is. */
function Kolommen({ kolommen }: { kolommen: Kolom[] }) {
  const gebruikt = kolommen.filter((k) => k.veld);
  const niet = kolommen.filter((k) => !k.veld && k.via !== "leeg");
  return (
    <details className="group rounded-[16px] bg-white ring-1 ring-black/[0.06]" open={niet.length > 0}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 text-[13.5px] [&::-webkit-details-marker]:hidden">
        <span className="font-semibold text-[#1c1a4e]">{gebruikt.length} {gebruikt.length === 1 ? "kolom" : "kolommen"} herkend</span>
        {niet.length > 0 && <span className="font-semibold text-[#b86e00]">· {niet.length} niet gebruikt</span>}
        <span className="ml-auto text-[12.5px] font-semibold text-[#312e82] group-open:hidden">Toon</span>
        <span className="ml-auto hidden text-[12.5px] font-semibold text-[#312e82] group-open:inline">Verberg</span>
      </summary>
      <ul className="flex flex-wrap gap-1.5 border-t border-black/[0.06] px-4 py-3" aria-label="Kolommen">
        {kolommen.map((k) => {
          const stamkaart = naarStamkaart(k.veld);
          const label = k.veld ? IMPORT_VELD_LABEL[k.veld] : k.via === "leeg" ? "leeg" : "niet gebruikt";
          const kopAnders = k.kop && k.veld && k.kop.toLowerCase() !== label.toLowerCase();
          return (
            <li
              key={k.letter}
              data-kolom={k.veld ?? ""}
              title={k.kop ? `Kop in het bestand: ${k.kop}` : "Zonder kop"}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] ${stamkaart ? "bg-[#fdecf4] text-[#c2105e]" : k.veld ? "bg-[#eef0ff] text-[#312e82]" : k.via === "leeg" ? "bg-black/[0.03] text-black/35" : "bg-[#fff4e5] text-[#b86e00]"}`}
            >
              <span className="font-mono text-[11px] font-bold opacity-60">{k.letter}</span>
              {kopAnders && <span className="opacity-70">{k.kop} →</span>}
              <span className="font-semibold">{label}</span>
              {k.via === "inhoud" && <span className="opacity-60">(aan de inhoud)</span>}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

const ACTIE: Record<Voorstelregel["actie"], { label: string; cls: string }> = {
  nieuw: { label: "Nieuw", cls: "bg-[#e3f6ed] text-[#0a7a4b]" },
  bijwerken: { label: "Bijwerken", cls: "bg-[#e6f2ff] text-[#0b6bcb]" },
  ongewijzigd: { label: "Ongewijzigd", cls: "bg-black/[0.05] text-black/50" },
  overslaan: { label: "Overslaan", cls: "bg-[#fff4e5] text-[#b86e00]" },
};

/** De stamkaart vóór en na: één balkje, het donkere deel was er al, het lichte deel komt erbij. */
function Volledig({ voor, na }: { voor: Volledigheid | null; na: Volledigheid }) {
  const breed = (v: Volledigheid) => `${(v.ingevuld / v.totaal) * 100}%`;
  const kleur = na.ingevuld === na.totaal ? "#0a7a4b" : na.ingevuld >= na.totaal / 2 ? "#b86e00" : "#e0356b";
  const erbij = voor ? na.ingevuld - voor.ingevuld : na.ingevuld;
  return (
    <span
      className="inline-flex items-center gap-2"
      title={na.ontbreekt.length ? `Daarna ontbreekt nog: ${na.ontbreekt.join(", ")}` : "Daarna is de stamkaart compleet"}
      data-volledig={`${voor?.ingevuld ?? 0}-${na.ingevuld}`}
    >
      <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-black/[0.07]" aria-hidden="true">
        <span className="absolute inset-y-0 left-0 rounded-full opacity-35" style={{ width: breed(na), background: kleur }} />
        {voor && <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: breed(voor), background: kleur }} />}
      </span>
      <span className="whitespace-nowrap text-[12px] tabular-nums text-black/55">
        {voor && erbij > 0 ? <>{voor.ingevuld} → <b className="text-[#1c1a4e]">{na.ingevuld}</b></> : <b className="text-[#1c1a4e]">{na.ingevuld}</b>}/{na.totaal}
      </span>
    </span>
  );
}

/** Eén rij uit het bestand: wat er met de kaart gebeurt, en per gegeven wat er op de stamkaart komt. */
function Rij({ r, b, nieuwAls, metStamkaart }: { r: Voorstelregel; b: Klant | null; nieuwAls?: KlantStatus; metStamkaart: boolean }) {
  const gegevens = importGegevens(r, b);
  const bord = r.wijzigingen.filter((w) => !w.startsWith("stamkaart:") && !["contactpersoon", "e-mail", "telefoon", "casemanager"].includes(w));
  const vol = r.actie === "overslaan" ? null : volledigheidNaImport(r, b);
  const stil = r.actie === "ongewijzigd" || r.actie === "overslaan";
  return (
    <li data-regel={r.rij.regel} className={`rounded-[18px] bg-white p-4 ring-1 sm:px-5 ${r.waarschuwingen.length ? "ring-[#f0c27a]" : "ring-black/[0.06]"} ${stil ? "opacity-75" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[15px] font-semibold text-[#1c1a4e]">{r.rij.bedrijf || <span className="text-black/35">(geen naam)</span>}</span>
            <span className="text-[12px] tabular-nums text-black/35">regel {r.rij.regel}</span>
          </p>
          {r.bestaand && r.bestaand.bedrijf !== r.rij.bedrijf && <p className="text-[12.5px] text-black/45">staat als {r.bestaand.bedrijf}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Alleen als het bestand iets voor de stamkaart heeft; bij een gewone klantlijst zegt het niets. */}
          {metStamkaart && vol && (gegevens.length > 0 || r.actie === "nieuw") && <Volledig voor={vol.voor} na={vol.na} />}
          <span className={`apill !py-0.5 text-[11.5px] ${ACTIE[r.actie].cls}`}>{ACTIE[r.actie].label}</span>
          <span className="inline-flex items-center gap-1">
            <StatusPill status={r.status} klein />
            {r.bestaand && r.bestaand.status !== r.status && <span className="text-[11.5px] text-black/40">was {statusInfo(r.bestaand.status).label.toLowerCase()}</span>}
          </span>
        </div>
      </div>

      <div data-wat={r.rij.bedrijf}>
        {gegevens.length > 0 && (
          <dl className="mt-3 grid gap-x-6 gap-y-2.5 border-t border-black/[0.05] pt-3 sm:grid-cols-2 lg:grid-cols-3">
            {gegevens.map((g) => <Gegeven key={g.velden.join("-")} g={g} />)}
          </dl>
        )}
        {bord.length > 0 && <p className="mt-2 text-[12.5px] text-black/55"><span className="font-semibold text-black/45">Op het bord:</span> {bord.join(", ")}</p>}
        {r.actie === "nieuw" && !gegevens.length && !bord.length && !r.waarschuwingen.length && (
          <p className="mt-2 text-[12.5px] text-black/40">{nieuwAls ? "Komt erbij als klant." : "Komt erbij op het bord."}</p>
        )}
        {r.waarschuwingen.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {r.waarschuwingen.map((w) => <li key={w} className="flex items-start gap-1.5 text-[12.5px] font-semibold text-[#b86e00]"><LuCircleAlert className="mt-0.5 shrink-0 text-[13px]" /> {w}</li>)}
          </ul>
        )}
      </div>
    </li>
  );
}

function Gegeven({ g }: { g: ImportGegeven }) {
  return (
    <div className="min-w-0" data-gegeven={g.soort} data-velden={g.velden.join(",")}>
      <dt className="flex items-center gap-1.5 text-[11.5px] font-semibold text-black/45">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: g.soort === "aangevuld" ? ROZE : g.soort === "overschreven" ? "#b86e00" : "rgba(0,0,0,0.2)" }} />
        {g.label}
        {g.soort === "overschreven" && <span className="text-[#b86e00]">· vervangt</span>}
        {g.soort === "behouden" && <span>· blijft staan</span>}
      </dt>
      <dd className="mt-0.5 break-words text-[13.5px] leading-[1.45]">
        {g.soort === "behouden" ? (
          <>
            <span className="text-black/65">{g.oud}</span>
            <span className="block text-[12px] text-black/40">in het bestand: <span className="line-through">{g.nieuw}</span></span>
          </>
        ) : g.soort === "overschreven" ? (
          <>
            <span className="font-semibold text-[#1c1a4e]">{g.nieuw}</span>
            <span className="block text-[12px] text-black/40">was <span className="line-through">{g.oud}</span></span>
          </>
        ) : (
          <span className="font-semibold text-[#1c1a4e]">{g.nieuw}</span>
        )}
      </dd>
    </div>
  );
}

/** Stap 3: wat er gebeurd is, met een link naar elke stamkaart. */
function Klaar({ r, metStamkaart, nieuwAls }: { r: Extract<ImportResultaat, { ok: true }>; metStamkaart: boolean; nieuwAls?: KlantStatus }) {
  const gegevens = r.klanten.reduce((n, k) => n + k.gegevens, 0);
  const lijst = [...r.klanten].sort((a, b) => b.gegevens - a.gegevens || a.bedrijf.localeCompare(b.bedrijf, "nl"));
  const toon = lijst.slice(0, 12);
  const delen = [
    r.nieuw ? `${r.nieuw} ${nieuwAls ? (r.nieuw === 1 ? "nieuwe klant" : "nieuwe klanten") : "nieuw op het bord"}` : "",
    r.bijgewerkt ? `${r.bijgewerkt} bijgewerkt` : "",
    r.ongewijzigd ? `${r.ongewijzigd} ongewijzigd` : "",
    r.overgeslagen ? `${r.overgeslagen} overgeslagen` : "",
  ].filter(Boolean);
  return (
    <div className="mx-auto max-w-[640px] py-4 text-center" role="status" data-klaar>
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#e3f6ed] text-[30px] text-[#0a7a4b]"><LuCheck /></span>
      <h3 className="mt-4 font-heading text-[24px] font-bold text-[#1c1a4e]">
        {metStamkaart && r.stamkaarten ? `${r.stamkaarten} ${r.stamkaarten === 1 ? "stamkaart" : "stamkaarten"} aangevuld` : "Geïmporteerd"}
      </h3>
      <p className="mt-1 text-[14px] text-black/55">
        {[metStamkaart && gegevens ? `${gegevens} ${gegevens === 1 ? "gegeven" : "gegevens"}` : "", ...delen].filter(Boolean).join(" · ") || "Niets te doen"}
      </p>
      {toon.length > 0 && (
        <ul className="mt-6 divide-y divide-black/[0.05] overflow-hidden rounded-[18px] bg-white text-left ring-1 ring-black/[0.06]">
          {toon.map((k) => (
            <li key={k.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-[#1c1a4e]">{k.bedrijf}</span>
                <span className="block text-[12.5px] text-black/45">{k.nieuw ? (nieuwAls ? "nieuwe klant" : "nieuw op het bord") : "bijgewerkt"}{k.gegevens ? ` · ${k.gegevens} ${k.gegevens === 1 ? "gegeven" : "gegevens"} op de stamkaart` : ""}</span>
              </span>
              <Link href={`/admin/klanten/${k.id}`} className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[#312e82] hover:underline">Stamkaart <LuArrowRight className="text-[12px]" /></Link>
            </li>
          ))}
          {lijst.length > toon.length && <li className="px-4 py-2.5 text-[12.5px] text-black/45">En nog {lijst.length - toon.length}.</li>}
        </ul>
      )}
    </div>
  );
}
