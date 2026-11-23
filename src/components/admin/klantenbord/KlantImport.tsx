"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { LuCircleAlert, LuFileSpreadsheet, LuIdCard, LuUpload, LuX } from "react-icons/lu";
import {
  cellenUitTekst, IMPORT_VELD_LABEL, importVoorstel, naarStamkaart, rijenUitKlantlijst, stamkaartTelling, statusInfo, type ImportRij, type Klant, type KlantStatus,
  type Kolom, type StamkaartImportVeld, type Voorstel,
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
 *
 * Kolommen met stamkaartgegevens (KvK, adres, facturatie, ...) vullen de
 * stamkaart van al die klanten in één keer; standaard alleen wat daar nog
 * leeg is, met de keuze om te overschrijven. Vanaf de klantenlijst
 * (`nieuwAls="klant"`) komt een nieuw bedrijf meteen als klant binnen.
 */
export default function KlantImport({
  bestaande, vandaag, onClose, onKlaar, nieuwAls, titel = "Klantlijst importeren",
}: {
  bestaande: Klant[];
  vandaag: string;
  onClose: () => void;
  onKlaar: (r: ImportResultaat) => void;
  /** Vanaf de klantenlijst: een nieuw bedrijf is minstens klant. */
  nieuwAls?: KlantStatus;
  titel?: string;
}) {
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
  const voorstel: Voorstel | null = useMemo(
    () => (rijen.length ? importVoorstel(rijen, bestaande, vandaag, { stamkaartOverschrijven: overschrijven, nieuwAls }) : null),
    [rijen, bestaande, vandaag, overschrijven, nieuwAls],
  );
  const metStamkaart = kolommen.some((k) => naarStamkaart(k.veld));
  const sk = voorstel ? stamkaartTelling(voorstel) : null;

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

  function importeer() {
    if (!voorstel) return;
    const teSturen = voorstel.regels.filter((r) => r.actie === "nieuw" || r.actie === "bijwerken").map((r) => r.rij);
    start(async () => {
      const r = await importeerKlanten(teSturen, { stamkaartOverschrijven: overschrijven, nieuwAls });
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
            <h2 id="kb-import-titel" className="font-heading text-[20px] font-bold text-[#312e82]">{titel}</h2>
            <p className="text-[13.5px] text-black/50">
              {nieuwAls
                ? "Je Excelbestand met klanten en hun gegevens. Je ziet eerst wat we eruit lezen; daarna vult het de stamkaarten. Dezelfde bedrijfsnaam is dezelfde klant; een bedrijf dat er nog niet is, komt erbij als klant."
                : "Je Excelbestand met de klantlijst. Je ziet eerst wat we eruit lezen; daarna zet je het op het bord. Dezelfde bedrijfsnaam wordt dezelfde kaart, dus je kunt de lijst later opnieuw importeren."}
            </p>
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
                <p className="mt-2">
                  <b>Voor de stamkaart</b>: KvK-nummer, rechtsvorm, branche, website, aantal werknemers, algemeen telefoonnummer en e-mailadres, bezoekadres (ook als straat en huisnummer apart staan), postcode, plaats, postadres, functie contactpersoon, factuur e-mail, btw-nummer, IBAN, tenaamstelling, debiteurnummer en bevoegd ondertekenaar. KvK, IBAN en e-mailadressen worden gecontroleerd; wat niet klopt, zie je in het rapport.
                </p>
                {nieuwAls && <p className="mt-2">Tip: exporteer eerst de klantenlijst naar Excel, vul aan wat ontbreekt en importeer hetzelfde bestand weer.</p>}
              </div>
            </>
          )}

          {melding && (
            <p className="flex items-start gap-2 rounded-xl bg-[#fff4e5] px-4 py-3 text-[13.5px] font-semibold text-[#b86e00]" role="alert"><LuCircleAlert className="mt-0.5 shrink-0" /> {melding}</p>
          )}

          {voorstel && (
            <>
              {/* Op een telefoon twee tellers naast elkaar, anders duwen ze het rapport onder de vouw. */}
              <div className={`grid grid-cols-2 gap-2 sm:gap-3 ${sk && metStamkaart ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
                <Cijfer label={nieuwAls ? "Nieuwe klanten" : "Nieuw op het bord"} n={voorstel.telling.nieuw} kleur="text-[#0a7a4b]" />
                <Cijfer label="Bijwerken" n={voorstel.telling.bijwerken} kleur="text-[#0b6bcb]" />
                <Cijfer label="Ongewijzigd" n={voorstel.telling.ongewijzigd} kleur="text-black/60" />
                <Cijfer label="Overslaan" n={voorstel.telling.overslaan} kleur={voorstel.telling.overslaan ? "text-[#b86e00]" : "text-black/60"} />
                {sk && metStamkaart && <Cijfer label="Stamkaarten aangevuld" n={sk.kaarten} kleur="text-[#c2105e]" sub={`${sk.velden} ${sk.velden === 1 ? "gegeven" : "gegevens"}`} />}
              </div>

              {metStamkaart && (
                <section className="flex flex-wrap items-start justify-between gap-3 rounded-[14px] bg-[#fdecf4]/60 px-4 py-3" aria-label="Stamkaart">
                  <p className="flex min-w-0 flex-1 items-start gap-2 text-[13px] text-[#1c1a4e]">
                    <LuIdCard className="mt-0.5 shrink-0 text-[15px] text-[#c2105e]" />
                    <span>
                      De roze kolommen gaan naar de stamkaart.{" "}
                      {overschrijven
                        ? "Wat er al stond en anders is in het bestand, wordt overschreven."
                        : sk && sk.behouden
                          ? `${sk.behouden} ${sk.behouden === 1 ? "gegeven verschilt" : "gegevens verschillen"} van wat er al op de stamkaart staat; dat blijft staan.`
                          : "Alleen lege velden worden aangevuld; wat er al staat, blijft staan."}
                    </span>
                  </p>
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-[13px] font-semibold text-[#1c1a4e]">
                    <input id="kb-overschrijven" type="checkbox" className="h-4 w-4 accent-[#c2105e]" checked={overschrijven} onChange={(e) => setOverschrijven(e.target.checked)} />
                    Overschrijf wat er al op de stamkaart staat
                  </label>
                </section>
              )}

              <section className="rounded-[14px] border border-black/[0.08]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] px-4 py-2.5">
                  <h3 className="text-[13px] font-bold text-[#1c1a4e]">Gelezen uit {bron}{kopregel ? "" : ", zonder kopregel"}</h3>
                  <p className="text-[12.5px] text-black/45">{metOpmerking ? `${metOpmerking} ${metOpmerking === 1 ? "rij vraagt" : "rijen vragen"} aandacht` : "Niets opvallends"}</p>
                </div>
                <ul className="flex flex-wrap gap-1.5 px-4 py-3" aria-label="Kolommen">
                  {kolommen.map((k) => (
                    <li key={k.letter} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] ${naarStamkaart(k.veld) ? "bg-[#fdecf4] text-[#c2105e]" : k.veld ? "bg-[#eef0ff] text-[#312e82]" : k.via === "leeg" ? "bg-black/[0.03] text-black/35" : "bg-[#fff4e5] text-[#b86e00]"}`} title={k.kop ? `Kop: ${k.kop}` : "Zonder kop"} data-kolom={k.veld ?? ""}>
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
                        <td className="px-3 py-2 text-black/60" data-wat={r.rij.bedrijf}>
                          {r.wijzigingen.filter((w) => !w.startsWith("stamkaart:")).length > 0 && <span className="block">{r.wijzigingen.filter((w) => !w.startsWith("stamkaart:")).join(", ")}</span>}
                          <Stamkaart aangevuld={r.stamkaart.aangevuld} overschreven={r.stamkaart.overschreven} behouden={r.stamkaart.behouden} />
                          {r.waarschuwingen.map((w) => <span key={w} className="mt-0.5 flex items-start gap-1 text-[#b86e00]"><LuCircleAlert className="mt-0.5 shrink-0 text-[12px]" /> {w}</span>)}
                          {!r.wijzigingen.length && !r.waarschuwingen.length && !r.stamkaart.aangevuld.length && r.actie === "nieuw" && <span className="text-black/35">komt erbij</span>}
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
          <p className="hidden text-[12.5px] text-black/45 sm:block">
            {voorstel
              ? `Een gevulde cel wint, een lege laat staan wat er stond${metStamkaart ? (overschrijven ? "; ook op de stamkaart" : "; op de stamkaart alleen in lege velden") : ""}. De status gaat alleen vooruit; een inactieve kaart blijft inactief.`
              : "Niets wordt opgeslagen voordat je op Importeer klikt."}
          </p>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            {voorstel && <button type="button" className="abtn-ghost !py-2 text-[13.5px]" onClick={() => { setRijen([]); setMelding(null); setOverschrijven(false); }}>Ander bestand</button>}
            {/* .abtn-ghost staat buiten een laag en wint van `hidden`; de wrapper verbergt hem op een telefoon (daar is het kruisje). */}
            <span className="hidden sm:contents">
              <button type="button" className="abtn-ghost !py-2 text-[13.5px]" onClick={onClose}>Annuleren</button>
            </span>
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

function Cijfer({ label, n, kleur, sub }: { label: string; n: number; kleur: string; sub?: string }) {
  return (
    <div className="rounded-[14px] border border-black/[0.08] px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-black/45">{label}</p>
      <p className={`mt-1 font-heading text-[24px] font-bold leading-none ${kleur}`}>{n}</p>
      {sub && <p className="mt-1 text-[12px] text-black/45">{sub}</p>}
    </div>
  );
}

/** Wat de rij met de stamkaart doet: aanvullen (roze), overschrijven (oranje) en wat blijft staan (grijs). */
function Stamkaart({ aangevuld, overschreven, behouden }: { aangevuld: StamkaartImportVeld[]; overschreven: StamkaartImportVeld[]; behouden: StamkaartImportVeld[] }) {
  if (!aangevuld.length && !overschreven.length && !behouden.length) return null;
  const naam = (v: StamkaartImportVeld) => IMPORT_VELD_LABEL[v].toLowerCase();
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-1">
      {aangevuld.length > 0 && <span className="rounded-full bg-[#fdecf4] px-2 py-0.5 text-[11.5px] font-semibold text-[#c2105e]" data-stamkaart="aangevuld">stamkaart: {aangevuld.map(naam).join(", ")}</span>}
      {overschreven.length > 0 && <span className="rounded-full bg-[#fff4e5] px-2 py-0.5 text-[11.5px] font-semibold text-[#b86e00]" data-stamkaart="overschreven">overschrijft: {overschreven.map(naam).join(", ")}</span>}
      {behouden.length > 0 && <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11.5px] text-black/55" data-stamkaart="behouden" title="Staat al anders op de stamkaart; zet overschrijven aan om het bestand te laten winnen">blijft staan: {behouden.map(naam).join(", ")}</span>}
    </span>
  );
}
