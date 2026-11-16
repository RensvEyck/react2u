"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { nodigMachtigingUit, slaOnboardingOp, stuurStapDoor, verstuurOverdracht, verwijderMachtiging, vinkOnboardingAf, type OnboardingState } from "@/app/(offerte)/onboarding/actions";
import {
  controleerWerknemers, dubbeleWerknemers, rijenUitCellen, rijenUitPlak, schoneWerknemers, WERKNEMER_KOLOMMEN, type MachtigingStand, type VeldGroep, type Werknemer,
} from "@/lib/onboarding";
import { kanXlsxLezen, lezenXlsx } from "@/lib/xlsxLezen";
import { datumLang, momentLang } from "@/lib/offertes";

/*
 * Wat de klant op zijn onboardingpagina doet: een document afvinken, een
 * formulier invullen, of zijn medewerkers invoeren. Na opslaan ververst de
 * pagina, zodat de voortgang bovenaan meteen klopt.
 */

const NAVY = "#322E83";
// Dezelfde knop- en veldstijl als de contractpagina (ContractPagina.tsx).
const KNOP = "inline-flex h-[52px] items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 text-[15px] font-bold disabled:opacity-60";
const knoppen = { roze: `hv-btn hv-btn-roze ${KNOP}`, rand: `hv-btn hv-btn-rand ${KNOP}` };
const veld =
  "h-[52px] w-full rounded-[14px] border bg-white px-4 text-[16px] text-[#322E83] outline-none transition-[border-color,box-shadow] placeholder:text-[#A9A7BC] focus:border-[#322E83] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)] disabled:bg-[#F6F5FB] disabled:text-[#A9A7BC]";
const rand = (fout?: string) => (fout ? "border-[#D92D20] bg-[#FFF8F7]" : "border-[#DCDAE8]");
const veldLabel = "text-[14.5px] font-bold";

/**
 * klant: de echte link; collega: een beheerder opent de link (het bezoek telt
 * niet, invullen mag wel, bijvoorbeeld samen aan de telefoon); voorbeeld: vanuit
 * het beheer of een concept, dan kan er niets worden opgeslagen.
 */
export type Modus = "klant" | "collega" | "voorbeeld";

function Vink() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Melding({ state, klaar }: { state: OnboardingState | null; klaar: string }) {
  if (!state) return null;
  return state.ok ? (
    <p role="status" className="m-0 flex items-center gap-2 rounded-[14px] bg-[#E3F6ED] px-4 py-3 text-[15px] font-semibold text-[#0A7A4B]"><Vink /> {klaar}</p>
  ) : (
    <p role="alert" className="m-0 rounded-[14px] bg-[#FDECEA] px-4 py-3 text-[15px] text-[#B42318]">{state.fout}</p>
  );
}

const CONCEPT = "Dit is een voorbeeld. De klant vult dit in via zijn eigen link, zodra de onboarding verstuurd is.";

/** Afvinken: gelezen, of gedownload en geregeld. */
export function AfvinkKnop({ token, document, klaar, tekst, modus }: { token: string; document: string; klaar: boolean; tekst: string; modus: Modus }) {
  const [bezig, start] = useTransition();
  const [state, setState] = useState<OnboardingState | null>(null);
  const router = useRouter();
  if (klaar) {
    return (
      <span className="inline-flex h-[52px] items-center gap-2 rounded-full bg-[#E3F6ED] px-5 text-[15px] font-bold text-[#0A7A4B]">
        <Vink /> Afgevinkt
      </span>
    );
  }
  return (
    <span className="flex flex-col gap-2">
      <button
        type="button"
        className={knoppen.roze}
        disabled={bezig || modus === "voorbeeld"}
        title={modus === "voorbeeld" ? CONCEPT : undefined}
        onClick={() =>
          start(async () => {
            const r = await vinkOnboardingAf(token, document);
            setState(r);
            if (r.ok) router.refresh();
          })
        }
      >
        <Vink /> {bezig ? "Even geduld…" : tekst}
      </button>
      {state && !state.ok && <Melding state={state} klaar="" />}
    </span>
  );
}

/** Een formulier met vaste velden: de inrichting, of de gegevens van de vorige arbodienst. */
export function VeldenFormulier({
  token, document, groepen, begin, ingevuld, modus, knopTekst,
}: {
  token: string; document: string; groepen: VeldGroep[]; begin: Record<string, string>; ingevuld: boolean; modus: Modus; knopTekst: string;
}) {
  const [waarden, setWaarden] = useState<Record<string, string>>(begin);
  const [state, setState] = useState<OnboardingState | null>(null);
  const [bezig, start] = useTransition();
  const router = useRouter();
  const fouten = state?.velden || {};
  // Hoe ver je bent met de verplichte velden: zo zie je meteen wat er nog moet.
  const verplicht = groepen.flatMap((g) => g.velden).filter((v) => v.verplicht);
  const verplichtKlaar = verplicht.filter((v) => (waarden[v.naam] || "").trim()).length;

  return (
    <form
      className="flex flex-col gap-8"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        // Ook met Enter in een veld: in het voorbeeld wordt niets opgeslagen.
        if (modus === "voorbeeld") return setState({ ok: false, fout: CONCEPT });
        start(async () => {
          const r = await slaOnboardingOp(token, document, waarden, waarden.contact_naam);
          setState(r);
          if (r.ok) router.refresh();
        });
      }}
    >
      {verplicht.length > 0 && (
        <p className="m-0 flex items-center gap-3 text-[13.5px] font-semibold" style={{ color: "#6B6985" }} aria-live="polite">
          <span className="h-1.5 w-28 overflow-hidden rounded-full bg-[#ECEBF5]">
            <span className="block h-full rounded-full bg-[#322E83] transition-[width]" style={{ width: `${Math.round((verplichtKlaar / verplicht.length) * 100)}%` }} />
          </span>
          Verplichte velden: {verplichtKlaar} van {verplicht.length}
        </p>
      )}
      {groepen.map((g) => (
        <fieldset key={g.titel} className="m-0 flex flex-col gap-4 border-0 p-0">
          <legend className="mb-1 p-0">
            <span className="hv-kop block text-[20px] font-semibold tracking-[-0.3px]" style={{ color: NAVY }}>{g.titel}</span>
            {g.tekst && <span className="mt-1 block text-[15px] text-[#77758F]">{g.tekst}</span>}
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {g.velden.map((v) => {
              const id = `ob-${document}-${v.naam}`;
              const fout = fouten[v.naam];
              const lang = v.naam === "afdelingen";
              return (
                <label key={v.naam} htmlFor={id} className={`flex flex-col gap-1.5 ${v.half ? "" : "sm:col-span-2"}`}>
                  <span className={veldLabel} style={{ color: NAVY }}>{v.label}{v.verplicht && <span className="text-[#E61674]"> *</span>}</span>
                  {lang ? (
                    <textarea
                      id={id}
                      className={`${veld} ${rand(fout)} h-auto min-h-[90px] py-3`}
                      value={waarden[v.naam] || ""}
                      onChange={(e) => setWaarden({ ...waarden, [v.naam]: e.target.value })}
                      maxLength={v.max ?? 200}
                      aria-invalid={Boolean(fout)}
                    />
                  ) : (
                    <input
                      id={id}
                      className={`${veld} ${rand(fout)}`}
                      type={v.type || "text"}
                      value={waarden[v.naam] || ""}
                      onChange={(e) => setWaarden({ ...waarden, [v.naam]: e.target.value })}
                      maxLength={v.max ?? 200}
                      autoComplete={v.autocomplete}
                      aria-invalid={Boolean(fout)}
                      aria-describedby={fout || v.hint ? `${id}-uitleg` : undefined}
                    />
                  )}
                  {(fout || v.hint) && (
                    <span id={`${id}-uitleg`} className={`text-[13.5px] ${fout ? "font-semibold text-[#B42318]" : "text-[#77758F]"}`}>{fout || v.hint}</span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="flex flex-col gap-3">
        <Melding state={state} klaar="Opgeslagen. Dank je wel!" />
        <div className="flex flex-wrap items-center gap-4">
          <button className={knoppen.roze} disabled={bezig || modus === "voorbeeld"} title={modus === "voorbeeld" ? CONCEPT : undefined}>
            <Vink /> {bezig ? "Opslaan…" : ingevuld ? "Wijzigingen opslaan" : knopTekst}
          </button>
          {modus === "voorbeeld" && <span className="text-[14px] text-[#77758F]">{CONCEPT}</span>}
        </div>
      </div>
    </form>
  );
}

const leeg = (): Werknemer => ({});
const naamVan = (w: Werknemer) => [w.roepnaam || w.voorletters, w.tussenvoegsels, w.achternaam].filter(Boolean).join(" ");

type Wijze = "handmatig" | "excel";

/**
 * Wat er uit een geüpload of geplakt bestand kwam, vóór het toevoegen. `rijen`
 * zijn de nieuwe medewerkers; `bijwerken` de rijen met een BSN dat er al staat
 * (die werken de bestaande kaart bij: downloaden, in Excel aanvullen, uploaden).
 */
type Voorstel = { rijen: Werknemer[]; bijwerken: Werknemer[]; bron: string; kopregel: boolean; dubbel: number; fouten: Record<number, Record<string, string>> };

/** Eén van de twee manieren om de medewerkers aan te leveren, als grote keuzekaart. */
function KeuzeKaart({ aan, titel, tekst, onClick }: { aan: boolean; titel: string; tekst: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={aan}
      onClick={onClick}
      className="flex items-start gap-4 rounded-[18px] border-2 bg-white p-5 text-left transition-[border-color,box-shadow]"
      style={{ borderColor: aan ? NAVY : "#E6E5EF", boxShadow: aan ? "0 0 0 3px rgba(50,46,131,0.12)" : "none" }}
    >
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-white" style={{ borderColor: aan ? NAVY : "#C9C7DA", background: aan ? NAVY : "white" }} aria-hidden="true">
        {aan && <Vink />}
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-[16px] font-bold" style={{ color: NAVY }}>{titel}</span>
        <span className="text-[14px] leading-[1.55] text-[#77758F]">{tekst}</span>
      </span>
    </button>
  );
}

/**
 * Het werknemersbestand. Eerst kiest de klant hoe hij aanlevert: handmatig
 * (per medewerker een kaart) of via Excel (het lege bestand downloaden,
 * invullen en de rijen hier plakken). Daarna ziet hij alleen wat bij die
 * keuze hoort; de kaarten zijn in beide gevallen na te kijken en aan te passen.
 */
export function WerknemersFormulier({ token, begin, ingevuld, modus, excelHref, mail }: {
  token: string; begin: Werknemer[]; ingevuld: boolean; modus: Modus; excelHref: string; mail: string;
}) {
  const [wijze, setWijze] = useState<Wijze | null>(begin.length ? "handmatig" : null);
  const [rijen, setRijen] = useState<Werknemer[]>(begin);
  const [open, setOpen] = useState<number>(-1);
  const [state, setState] = useState<OnboardingState | null>(null);
  const [bezig, start] = useTransition();
  const router = useRouter();
  const fouten = state?.rijen || {};
  const [plak, setPlak] = useState("");
  const [plakMelding, setPlakMelding] = useState<string | null>(null);
  const [voorstel, setVoorstel] = useState<Voorstel | null>(null);
  const [leest, setLeest] = useState(false);
  const [sleep, setSleep] = useState(false);
  const leegIs = (r: Werknemer) => Object.values(r).every((w) => !w);

  function kies(w: Wijze) {
    setWijze(w);
    setPlakMelding(null);
    setVoorstel(null);
    setOpen(-1);
    if (w === "handmatig" && rijen.length === 0) {
      setRijen([leeg()]);
      setOpen(0);
    }
  }

  /**
   * Het controlerapport vóór het toevoegen: wat er gelezen is, wat er al stond
   * (zelfde BSN, overgeslagen), wat dubbel in het bestand zit, en welke rijen
   * aandacht vragen. Pas na "toevoegen" komen ze als kaarten in de lijst.
   */
  function maakVoorstel(gelezen: Werknemer[], kopregel: boolean, bron: string) {
    setPlakMelding(null);
    if (!gelezen.length) {
      setVoorstel(null);
      setPlakMelding(`Daar kon ik geen medewerkers uit halen${bron === "het plakvak" ? ". Kopieer de rijen uit Excel, het liefst met de kopregel erbij." : `. Vul het lege bestand in, met de kolomnamen in de eerste rij.`}`);
      return;
    }
    const dubbel = new Set(dubbeleWerknemers(gelezen));
    const uniek = gelezen.filter((_, i) => !dubbel.has(i));
    const bestaand = new Set(rijen.map((r) => r.bsn).filter(Boolean));
    const nieuw = uniek.filter((r) => !r.bsn || !bestaand.has(r.bsn));
    const bijwerken = uniek.filter((r) => r.bsn && bestaand.has(r.bsn));
    // De controle over wat het wordt: de bijgewerkte bestaande rijen, dan de nieuwe (zo staan ze straks ook),
    // eerst schoongemaakt zoals de server dat doet (postcode in hoofdletters, BSN zonder streepjes).
    const straks = [...samengevoegd(rijen, bijwerken), ...nieuw];
    setVoorstel({ rijen: nieuw, bijwerken, bron, kopregel, dubbel: dubbel.size, fouten: controleerWerknemers(schoneWerknemers(straks)) });
  }

  /** Bestaande rijen met dezelfde BSN bijgewerkt: een gevulde cel uit het bestand wint, een lege laat staan wat er stond. */
  function samengevoegd(basisRijen: Werknemer[], bijwerken: Werknemer[]): Werknemer[] {
    if (!bijwerken.length) return basisRijen.filter((r) => !leegIs(r));
    const perBsn = new Map(bijwerken.map((r) => [r.bsn, r]));
    return basisRijen.filter((r) => !leegIs(r)).map((r) => (r.bsn && perBsn.has(r.bsn) ? { ...r, ...perBsn.get(r.bsn)! } : r));
  }

  async function leesBestand(bestand: File) {
    setLeest(true);
    try {
      const naam = bestand.name.toLowerCase();
      if (naam.endsWith(".csv") || naam.endsWith(".txt")) {
        const { rijen: r, kopregel } = rijenUitPlak(await bestand.text());
        maakVoorstel(r, kopregel, bestand.name);
      } else if (!kanXlsxLezen()) {
        setPlakMelding("Deze browser kan het Excelbestand niet lezen. Plak de rijen hieronder, of mail het bestand.");
      } else {
        const { rijen: r, kopregel } = rijenUitCellen(await lezenXlsx(await bestand.arrayBuffer()));
        maakVoorstel(r, kopregel, bestand.name);
      }
    } catch {
      setVoorstel(null);
      setPlakMelding("Dit bestand kon ik niet lezen. Is het het Excelbestand (.xlsx) of een csv? Anders: plak de rijen hieronder, of mail het bestand.");
    } finally {
      setLeest(false);
    }
  }

  function voegVoorstelToe() {
    if (!voorstel) return;
    setRijen([...samengevoegd(rijen, voorstel.bijwerken), ...voorstel.rijen]);
    const fouten = voorstel.fouten;
    const aantalFout = Object.keys(fouten).length;
    setState(aantalFout ? { ok: false, fout: `${aantalFout} ${aantalFout === 1 ? "medewerker vraagt" : "medewerkers vragen"} nog aandacht: tik op de naam en kijk de velden met een rode rand na.`, rijen: fouten } : null);
    setOpen(-1);
    setPlak("");
    setVoorstel(null);
    const n = voorstel.rijen.length;
    const b = voorstel.bijwerken.length;
    setPlakMelding(`${n ? `${n} ${n === 1 ? "medewerker" : "medewerkers"} toegevoegd` : ""}${n && b ? ", " : ""}${b ? `${b} bijgewerkt` : ""}. Kijk ze hieronder na en sla op.`);
  }

  const zet = (i: number, k: string, w: string) => setRijen(rijen.map((r, n) => (n === i ? { ...r, [k]: w } : r)));
  const stapKop = "hv-kop grid h-9 w-9 shrink-0 place-items-center rounded-full text-[15px] font-semibold";

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (modus === "voorbeeld") return setState({ ok: false, fout: CONCEPT });
        start(async () => {
          const r = await slaOnboardingOp(token, "werknemers", { rijen });
          setState(r);
          if (r.rijen) {
            const eerste = Number(Object.keys(r.rijen)[0]);
            if (!Number.isNaN(eerste)) setOpen(eerste);
          }
          if (r.ok) {
            setOpen(-1);
            router.refresh();
          }
        });
      }}
    >
      <div role="radiogroup" aria-label="Hoe wil je de medewerkers aanleveren?" className="grid gap-3 sm:grid-cols-2">
        <KeuzeKaart aan={wijze === "handmatig"} onClick={() => kies("handmatig")} titel="Handmatig invullen" tekst="Per medewerker een kaart met de gegevens. Handig tot zo'n tien medewerkers." />
        <KeuzeKaart aan={wijze === "excel"} onClick={() => kies("excel")} titel="Via Excel" tekst="Download het bestand, vul het in Excel in en upload het weer. Handig bij veel medewerkers." />
      </div>

      {wijze === "excel" && (
        <ol className="m-0 flex list-none flex-col gap-4 rounded-[18px] border border-[#E6E5EF] bg-white p-5 md:p-6">
          <li className="flex items-start gap-4">
            <span className={stapKop} style={{ background: "#E5F6F4", color: "#00786F" }}>1</span>
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="text-[16px] font-bold" style={{ color: NAVY }}>Download het Excelbestand</span>
              <span className="text-[14px] text-[#77758F]">
                De 37 kolommen van ons verzuimsysteem, met de kolomnamen in de eerste rij.{rijen.filter((r) => !leegIs(r)).length > 0 ? ` De ${rijen.filter((r) => !leegIs(r)).length} ${rijen.filter((r) => !leegIs(r)).length === 1 ? "medewerker die er al staat, staat" : "medewerkers die er al staan, staan"} erin: vul aan in Excel en upload het bestand weer.` : ""}
              </span>
              <a href={excelHref} className={`${knoppen.rand} max-w-full self-start`} style={{ background: "transparent" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" /></svg> Download het bestand</a>
            </span>
          </li>
          <li className="flex items-start gap-4">
            <span className={stapKop} style={{ background: "#E5F6F4", color: "#00786F" }}>2</span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[16px] font-bold" style={{ color: NAVY }}>Vul het in Excel in</span>
              <span className="text-[14px] text-[#77758F]">Per medewerker een rij. Laat de kolomnamen staan; kolommen die je niet gebruikt mag je leeg laten.</span>
            </span>
          </li>
          <li className="flex items-start gap-4">
            <span className={stapKop} style={{ background: "#E5F6F4", color: "#00786F" }}>3</span>
            <span className="flex min-w-0 flex-1 flex-col gap-3">
              <span className="text-[16px] font-bold" style={{ color: NAVY }}>Upload het ingevulde bestand</span>
              <span className="text-[14px] text-[#77758F]">Sleep het bestand hierheen of kies het op je computer (.xlsx of .csv). Je ziet eerst wat we eruit lezen; daarna voeg je de medewerkers toe.</span>
              <label
                htmlFor="wn-bestand"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[16px] border-2 border-dashed px-5 py-7 text-center transition-colors"
                style={{ borderColor: sleep ? NAVY : "#C9C7DA", background: sleep ? "#F6F5FB" : "white" }}
                onDragOver={(e) => { e.preventDefault(); setSleep(true); }}
                onDragLeave={() => setSleep(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setSleep(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) void leesBestand(f);
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4m0 0-4 4m4-4 4 4M4 20h16" /></svg>
                <span className="text-[15px] font-bold" style={{ color: NAVY }}>{leest ? "Bestand lezen…" : "Sleep je bestand hierheen"}</span>
                <span className="text-[13.5px] text-[#77758F]">of <span className="font-bold underline underline-offset-4" style={{ color: NAVY }}>kies een bestand</span></span>
                <input
                  id="wn-bestand"
                  type="file"
                  accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void leesBestand(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <details className="group">
                <summary className="cursor-pointer list-none text-[14px] font-bold underline-offset-4 hover:underline" style={{ color: NAVY }}>Of plak de rijen uit Excel</summary>
                <div className="mt-3 flex flex-col gap-2">
                  <span className="text-[14px] text-[#77758F]">Selecteer in Excel de kopregel en de rijen, kopieer, en plak ze in dit vak.</span>
                  <label htmlFor="wn-plak" className="sr-only">Geplakte rijen uit Excel</label>
                  <textarea
                    id="wn-plak"
                    className={`${veld} ${rand()} h-auto min-h-[120px] py-3 font-mono text-[13.5px]`}
                    value={plak}
                    onChange={(e) => setPlak(e.target.value)}
                    placeholder={"Burgerservicenummer\troepnaam\tEigen_achternaam\t…\n123456782\tJan\tJansen\t…"}
                    spellCheck={false}
                  />
                  <button type="button" className={`${knoppen.rand} self-start`} style={{ background: "transparent" }} disabled={!plak.trim()} onClick={() => { const r = rijenUitPlak(plak); maakVoorstel(r.rijen, r.kopregel, "het plakvak"); }}>
                    Rijen lezen
                  </button>
                </div>
              </details>
              {plakMelding && !voorstel && <span className="text-[14px] font-semibold" style={{ color: NAVY }} role="status">{plakMelding}</span>}
              {voorstel && (
                <div className="flex flex-col gap-3 rounded-[16px] border p-4" style={{ borderColor: Object.keys(voorstel.fouten).length ? "#F4B9B2" : "#BFE3D6", background: Object.keys(voorstel.fouten).length ? "#FFF8F7" : "#F3FBF7" }} role="status">
                  <span className="text-[15px] font-bold" style={{ color: NAVY }}>
                    {voorstel.rijen.length + voorstel.bijwerken.length} {voorstel.rijen.length + voorstel.bijwerken.length === 1 ? "medewerker" : "medewerkers"} gelezen uit {voorstel.bron}{voorstel.kopregel ? "" : ", zonder kopregel: in de volgorde van onze velden"}.
                  </span>
                  {(voorstel.bijwerken.length > 0 || voorstel.dubbel > 0) && (
                    <span className="text-[14px] text-[#77758F]">
                      {voorstel.bijwerken.length > 0 && `${voorstel.rijen.length} nieuw, ${voorstel.bijwerken.length} ${voorstel.bijwerken.length === 1 ? "stond er al en wordt bijgewerkt" : "stonden er al en worden bijgewerkt"} (zelfde BSN). `}
                      {voorstel.dubbel > 0 && `${voorstel.dubbel} dubbel in het bestand, één keer meegenomen.`}
                    </span>
                  )}
                  {Object.keys(voorstel.fouten).length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[14px] font-semibold text-[#B42318]">{Object.keys(voorstel.fouten).length} {Object.keys(voorstel.fouten).length === 1 ? "rij vraagt" : "rijen vragen"} aandacht; je kunt ze na het toevoegen per kaart aanvullen:</span>
                      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13.5px] text-[#77758F]">
                        {Object.entries(voorstel.fouten).slice(0, 8).map(([i, f]) => (
                          <li key={i}>
                            <span className="font-semibold" style={{ color: NAVY }}>{naamVan([...samengevoegd(rijen, voorstel.bijwerken), ...voorstel.rijen][Number(i)] || {}) || `Rij ${Number(i) + 1}`}:</span>{" "}
                            {Object.entries(f).map(([k, m]) => `${WERKNEMER_KOLOMMEN.find((x) => x.naam === k)?.label.toLowerCase() || k} ${m.toLowerCase()}`).join(" · ")}
                          </li>
                        ))}
                        {Object.keys(voorstel.fouten).length > 8 && <li>En nog {Object.keys(voorstel.fouten).length - 8}.</li>}
                      </ul>
                    </div>
                  ) : (
                    <span className="text-[14px] font-semibold" style={{ color: "#0A7A4B" }}>Alles ziet er goed uit.</span>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" className={`${knoppen.roze} h-auto min-h-[52px] max-w-full whitespace-normal py-3 text-center`} onClick={voegVoorstelToe}>
                      {voorstel.rijen.length ? `${voorstel.rijen.length} ${voorstel.rijen.length === 1 ? "medewerker" : "medewerkers"} toevoegen` : ""}
                      {voorstel.rijen.length && voorstel.bijwerken.length ? " en " : ""}
                      {voorstel.bijwerken.length ? `${voorstel.bijwerken.length} bijwerken` : ""}
                    </button>
                    <button type="button" className="text-[14px] font-bold underline-offset-4 hover:underline" style={{ color: NAVY }} onClick={() => setVoorstel(null)}>Annuleren</button>
                  </div>
                </div>
              )}
              <span className="text-[13.5px] text-[#77758F]">Lukt het niet? Mail het ingevulde bestand naar <a href={`mailto:${mail}`} className="font-bold underline-offset-4 hover:underline" style={{ color: NAVY }}>{mail}</a>, dan zetten wij het erin.</span>
            </span>
          </li>
        </ol>
      )}

      {wijze && rijen.length > 0 && (
        <>
          {wijze === "excel" && (
            <p className="m-0 text-[14.5px] font-semibold" style={{ color: NAVY }} role="status">
              {plakMelding ? `${plakMelding} ` : ""}{rijen.length} {rijen.length === 1 ? "medewerker" : "medewerkers"} om na te kijken. Tik op een naam om de gegevens te zien of aan te passen.
            </p>
          )}
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {rijen.map((r, i) => {
              const f = fouten[i] || {};
              const heeftFout = Object.keys(f).length > 0;
              const isOpen = open === i;
              return (
                <li key={i} className={`overflow-hidden rounded-[18px] border bg-white ${heeftFout ? "border-[#F4B9B2]" : "border-[#E6E5EF]"}`}>
                  <div className="flex items-center gap-3 px-5 py-4">
                    <span className={stapKop} style={{ background: "#E5F6F4", color: "#00786F" }}>{i + 1}</span>
                    <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} className="min-w-0 flex-1 text-left" aria-expanded={isOpen}>
                      <span className="block truncate text-[16px] font-bold" style={{ color: NAVY }}>{naamVan(r) || "Nieuwe medewerker"}</span>
                      <span className={`block text-[13.5px] ${heeftFout ? "font-semibold text-[#B42318]" : "text-[#77758F]"}`}>
                        {heeftFout ? `${Object.keys(f).length} ${Object.keys(f).length === 1 ? "veld vraagt" : "velden vragen"} aandacht` : [r.functie, r.plaats].filter(Boolean).join(" · ") || (isOpen ? "Vul de gegevens in" : wijze === "excel" ? "Tik om na te kijken" : "Tik om in te vullen")}
                      </span>
                    </button>
                    <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} className="hidden text-[14px] font-bold sm:block" style={{ color: NAVY }}>{isOpen ? "Inklappen" : "Bewerken"}</button>
                    {rijen.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Verwijder ${naamVan(r) || `medewerker ${i + 1}`}`}
                        onClick={() => {
                          setRijen(rijen.filter((_, n) => n !== i));
                          setOpen(-1);
                          setState(null);
                        }}
                        className="grid h-9 w-9 place-items-center rounded-full text-[#77758F] hover:bg-[#FDECEA] hover:text-[#B42318]"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <div className="grid gap-4 border-t border-[#E6E5EF] bg-[#FBFAFE] px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
                      {WERKNEMER_KOLOMMEN.map((k) => {
                        const id = `wn-${i}-${k.naam}`;
                        return (
                          <label key={k.naam} htmlFor={id} className={`flex flex-col gap-1.5 ${k.breed ? "sm:col-span-2" : ""}`}>
                            <span className="text-[13.5px] font-semibold" style={{ color: NAVY }}>{k.label}{k.verplicht && <span className="text-[#E61674]"> *</span>}</span>
                            {k.type === "geslacht" ? (
                              <select id={id} className={`${veld} ${rand(f[k.naam])}`} value={r[k.naam] || ""} onChange={(e) => zet(i, k.naam, e.target.value)}>
                                <option value="">Kies</option><option value="M">Man</option><option value="V">Vrouw</option><option value="X">Anders / onbekend</option>
                              </select>
                            ) : (
                              <input
                                id={id}
                                className={`${veld} ${rand(f[k.naam])}`}
                                type={k.type === "date" ? "date" : k.type === "email" ? "email" : k.type === "tel" ? "tel" : "text"}
                                inputMode={k.naam === "bsn" || k.type === "number" ? "numeric" : undefined}
                                value={r[k.naam] || ""}
                                onChange={(e) => zet(i, k.naam, e.target.value)}
                                maxLength={120}
                                aria-invalid={Boolean(f[k.naam])}
                              />
                            )}
                            {f[k.naam] && <span className="text-[12.5px] font-semibold text-[#B42318]">{f[k.naam]}</span>}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {wijze === "handmatig" && (
            <button
              type="button"
              className={`${knoppen.rand} self-start`}
              style={{ background: "transparent" }}
              onClick={() => {
                setRijen([...rijen, leeg()]);
                setOpen(rijen.length);
              }}
            >
              <span aria-hidden className="text-[20px] leading-none">+</span> Medewerker toevoegen
            </button>
          )}
        </>
      )}

      {wijze && (
        <>
          <p className="m-0 text-[13.5px] leading-[1.6] text-[#77758F]">
            Deze gegevens, ook het burgerservicenummer, gebruiken we alleen om jullie medewerkers in ons beveiligde verzuimsysteem te zetten. Daarna wissen we ze hier.
          </p>
          <Melding state={state} klaar={`Opgeslagen: ${rijen.length} ${rijen.length === 1 ? "medewerker" : "medewerkers"}. Dank je wel!`} />
          {rijen.length > 0 && (
            <div className="flex flex-wrap items-center gap-4">
              <button className={knoppen.roze} disabled={bezig || modus === "voorbeeld"} title={modus === "voorbeeld" ? CONCEPT : undefined}>
                <Vink /> {bezig ? "Opslaan…" : ingevuld ? "Wijzigingen opslaan" : `${rijen.length} ${rijen.length === 1 ? "medewerker" : "medewerkers"} opslaan`}
              </button>
              {modus === "voorbeeld" && <span className="text-[14px] text-[#77758F]">{CONCEPT}</span>}
            </div>
          )}
        </>
      )}
    </form>
  );
}

/* ---------- 0038: de machtiging online laten tekenen, en de opdracht tot overdracht ---------- */

type Lijst = MachtigingStand[];

/**
 * Op de machtigingstap, zodra de vorige arbodienst is opgeslagen: wie moet
 * tekenen (naam en e-mail; die krijgt een persoonlijke link), de stand per
 * medewerker, en daarna de opdracht tot overdracht naar de vorige arbodienst
 * (Rens, 16 nov 2026: de werkgever stuurt de getekende machtigingen zelf, met
 * de opdracht; de arbodienst stuurt React2u daarna de lijst).
 */
export function MachtigingUitnodigen({ token, lijst, modus, arbodienst, basis }: { token: string; lijst: Lijst; modus: Modus; arbodienst: Record<string, string>; basis: string }) {
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<OnboardingState | null>(null);
  const [bezig, start] = useTransition();
  const [aan, setAan] = useState(arbodienst.email || "");
  const [ovState, setOvState] = useState<OnboardingState | null>(null);
  const [ovBezig, startOv] = useTransition();
  const [druk, setDruk] = useState<string | null>(null);
  const router = useRouter();
  const getekend = lijst.filter((m) => m.status === "getekend");
  const nogNiet = getekend.filter((m) => !m.overdracht_at);
  const laatsteOverdracht = getekend.map((m) => m.overdracht_at).filter((x): x is string => Boolean(x)).sort().pop() ?? null;
  const voorbeeld = modus === "voorbeeld";

  function nodigUit(n: string, e: string, id?: string) {
    if (voorbeeld) return setState({ ok: false, fout: CONCEPT });
    setState(null);
    setDruk(id ?? "nieuw");
    start(async () => {
      const r = await nodigMachtigingUit(token, { naam: n, email: e });
      setDruk(null);
      if (r.ok) {
        setNaam("");
        setEmail("");
        setState({ ok: true, fout: id ? `Herinnering gestuurd naar ${e}.` : `Uitnodiging gestuurd naar ${e}.` });
        router.refresh();
      } else setState(r);
    });
  }

  return (
    <div id="machtigingen" className="flex flex-col gap-6 border-t pt-8" style={{ borderColor: "#E6E5EF" }}>
      <div className="flex flex-col gap-1.5">
        <span className="hv-kop block text-[20px] font-semibold tracking-[-0.3px]" style={{ color: NAVY }}>Wie moet tekenen?</span>
        <span className="text-[15px] text-[#77758F]">
          Elke zieke medewerker met een lopend dossier bij {arbodienst.arbodienst || "je vorige arbodienst"} tekent zelf. Vul naam en e-mailadres in: die krijgt een persoonlijke link en tekent in twee minuten op zijn telefoon. Jij ziet hier wie getekend heeft.
        </span>
      </div>

      {lijst.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {lijst.map((m, i) => {
            const klaar = m.status === "getekend";
            return (
              <li key={m.id} className="flex flex-col gap-3 rounded-[18px] border bg-white px-5 py-4 sm:flex-row sm:items-center" style={{ borderColor: klaar ? "#BFE3D6" : "#E6E5EF" }}>
                <span className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[15px] font-semibold text-white" style={{ background: klaar ? "#0A7A4B" : "#C9C7DA" }}>{klaar ? <Vink /> : i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-bold" style={{ color: NAVY }}>{m.naam} <span className="block font-normal text-[#77758F] sm:inline">{m.email}</span></span>
                    <span className="block text-[13.5px]" style={{ color: klaar ? "#0A7A4B" : "#77758F" }}>
                      {klaar
                        ? `Getekend op ${momentLang(m.getekend_at)}${m.overdracht_at ? ` · naar de arbodienst gestuurd op ${datumLang(m.overdracht_at)}` : ""}`
                        : `Uitgenodigd op ${datumLang(m.uitgenodigd_at)}${m.herinnerd_at ? `, herinnerd op ${datumLang(m.herinnerd_at)}` : ""}${m.bekeken_at ? ", geopend" : ", nog niet geopend"}`}
                    </span>
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-3 pl-12 text-[14px] font-bold sm:pl-0" style={{ color: NAVY }}>
                  {klaar ? (
                    <a href={`${basis}/machtiging/${m.id}?download=1`} className="underline-offset-4 hover:underline">Getekende pdf</a>
                  ) : (
                    <>
                      <button type="button" className="underline-offset-4 hover:underline disabled:opacity-50" disabled={bezig} onClick={() => nodigUit(m.naam, m.email, m.id)}>{druk === m.id ? "Versturen…" : "Opnieuw sturen"}</button>
                      <button
                        type="button"
                        className="text-[#B42318] underline-offset-4 hover:underline disabled:opacity-50"
                        disabled={bezig}
                        onClick={() => {
                          if (voorbeeld) return setState({ ok: false, fout: CONCEPT });
                          start(async () => {
                            const r = await verwijderMachtiging(token, m.id);
                            setState(r.ok ? { ok: true, fout: `Uitnodiging voor ${m.naam} weggehaald.` } : r);
                            if (r.ok) router.refresh();
                          });
                        }}
                      >
                        Weghalen
                      </button>
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <form
        noValidate
        className="grid gap-3 rounded-[18px] p-5" style={{ background: "#F6F5FB" }}
        onSubmit={(e) => { e.preventDefault(); nodigUit(naam, email); }}
      >
        <span className="text-[14.5px] font-bold" style={{ color: NAVY }}>{lijst.length ? "Nog een medewerker uitnodigen" : "Medewerker uitnodigen"}</span>
        <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr_auto]">
          <label className="flex flex-col gap-1.5">
            <span className="sr-only">Naam medewerker</span>
            <input id="mu-naam" className={`${veld} ${rand()}`} placeholder="Naam medewerker" value={naam} onChange={(e) => setNaam(e.target.value)} maxLength={120} autoComplete="off" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="sr-only">E-mailadres medewerker</span>
            <input id="mu-email" className={`${veld} ${rand()}`} type="email" placeholder="E-mailadres medewerker" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="off" />
          </label>
          <button className={knoppen.roze} disabled={bezig || !naam.trim() || !email.trim()}>{druk === "nieuw" ? "Versturen…" : "Uitnodiging sturen"}</button>
        </div>
        <span className="text-[13.5px] text-[#77758F]">De medewerker krijgt de mail uit naam van React2u, met jouw bedrijfsnaam erin. Liever op papier? Download hierboven de ingevulde machtiging, laat tekenen en stuur hem zelf.</span>
        {state && (state.ok ? (
          <p role="status" className="m-0 flex items-center gap-2 rounded-[14px] bg-[#E3F6ED] px-4 py-3 text-[15px] font-semibold text-[#0A7A4B]"><Vink /> {state.fout}</p>
        ) : (
          <p role="alert" className="m-0 rounded-[14px] bg-[#FDECEA] px-4 py-3 text-[15px] text-[#B42318]">{state.fout}</p>
        ))}
      </form>

      {getekend.length > 0 && (
        <form
          id="overdracht"
          noValidate
          className="flex flex-col gap-4 rounded-[18px] border-2 p-5" style={{ borderColor: NAVY, background: "white" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (voorbeeld) return setOvState({ ok: false, fout: CONCEPT });
            setOvState(null);
            startOv(async () => {
              const r = await verstuurOverdracht(token, aan);
              setOvState(r.ok ? { ok: true, fout: `Opdracht verstuurd naar ${aan.trim().toLowerCase()}, met ${getekend.length} getekende ${getekend.length === 1 ? "machtiging" : "machtigingen"}. Je kreeg zelf een kopie.` } : r);
              if (r.ok) router.refresh();
            });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <span className="hv-kop block text-[20px] font-semibold tracking-[-0.3px]" style={{ color: NAVY }}>Stuur de opdracht naar {arbodienst.arbodienst || "je vorige arbodienst"}</span>
            <span className="text-[15px] text-[#77758F]">
              Jij geeft je vorige arbodienst de opdracht om de dossiers over te dragen aan React2u. Wij maken de brief, met de {getekend.length} getekende {getekend.length === 1 ? "machtiging" : "machtigingen"} erachter, en sturen hem uit jouw naam; jij en React2u krijgen een kopie. Je vorige arbodienst stuurt React2u daarna een lijst van de dossiers.
            </span>
          </div>
          {laatsteOverdracht && (
            <p className="m-0 flex items-center gap-2 rounded-[14px] bg-[#E3F6ED] px-4 py-3 text-[14.5px] font-semibold text-[#0A7A4B]">
              <Vink /> Opdracht verstuurd op {momentLang(laatsteOverdracht)}.{nogNiet.length > 0 ? ` Sinds toen ${nogNiet.length === 1 ? "tekende nog 1 medewerker" : `tekenden nog ${nogNiet.length} medewerkers`}: stuur de opdracht nog een keer.` : ""}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-[1.2fr_auto]">
            <label className="flex flex-col gap-1.5">
              <span className={veldLabel} style={{ color: NAVY }}>E-mailadres van je vorige arbodienst</span>
              <input id="ov-email" className={`${veld} ${rand()}`} type="email" value={aan} onChange={(e) => setAan(e.target.value)} maxLength={254} placeholder="dossiers@arbodienst.nl" />
            </label>
            <button className={`${knoppen.roze} sm:self-end`} disabled={ovBezig || !aan.trim()}>{ovBezig ? "Versturen…" : laatsteOverdracht ? "Opdracht opnieuw versturen" : "Verstuur de opdracht"}</button>
          </div>
          <span className="text-[13.5px] text-[#77758F]">
            Liever zelf versturen? <a href={`${basis}/overdracht?download=1`} className="font-bold underline-offset-4 hover:underline" style={{ color: NAVY }}>Download de opdracht met de machtigingen (pdf)</a>.
          </span>
          {ovState && (ovState.ok ? (
            <p role="status" className="m-0 flex items-center gap-2 rounded-[14px] bg-[#E3F6ED] px-4 py-3 text-[15px] font-semibold text-[#0A7A4B]"><Vink /> {ovState.fout}</p>
          ) : (
            <p role="alert" className="m-0 rounded-[14px] bg-[#FDECEA] px-4 py-3 text-[15px] text-[#B42318]">{ovState.fout}</p>
          ))}
        </form>
      )}
    </div>
  );
}

/** Onder een stap: deze stap doorsturen naar een collega die er meer van weet (HR, salarisadministratie). */
export function StapDoorsturen({ token, stap, titel, modus, contactpersoon }: { token: string; stap: string; titel: string; modus: Modus; contactpersoon: string | null }) {
  const [open, setOpen] = useState(false);
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [van, setVan] = useState(contactpersoon || "");
  const [bericht, setBericht] = useState("");
  const [state, setState] = useState<OnboardingState | null>(null);
  const [bezig, start] = useTransition();
  return (
    <div className="flex flex-col gap-4">
      {!open ? (
        <button type="button" className="inline-flex items-center gap-2 self-start text-[15px] font-bold underline-offset-4 hover:underline" style={{ color: NAVY }} onClick={() => setOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 17h6m0 0-3-3m3 3-3 3M4 6h11a4 4 0 0 1 4 4v1" /></svg>
          Is dit iets voor een collega? Stuur deze stap door
        </button>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-4 rounded-[22px] border bg-white p-5 md:p-6" style={{ borderColor: "#E6E5EF" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (modus === "voorbeeld") return setState({ ok: false, fout: CONCEPT });
            setState(null);
            start(async () => {
              const r = await stuurStapDoor(token, stap, { naam, email, van, bericht });
              setState(r.ok ? { ok: true, fout: `Verstuurd naar ${email.trim().toLowerCase()}. Je collega krijgt een mail met de link naar deze stap.` } : r);
              if (r.ok) { setNaam(""); setEmail(""); setBericht(""); }
            });
          }}
        >
          <div className="flex flex-col gap-1">
            <span className="hv-kop block text-[19px] font-semibold tracking-[-0.3px]" style={{ color: NAVY }}>Stuur &quot;{titel}&quot; door naar een collega</span>
            <span className="text-[14.5px] text-[#77758F]">Je collega krijgt een mail met de link naar deze stap en kan meteen aan de slag. Wat je al invulde, blijft staan.</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5"><span className={veldLabel} style={{ color: NAVY }}>Naam collega</span><input id="ds-naam" className={`${veld} ${rand()}`} value={naam} onChange={(e) => setNaam(e.target.value)} maxLength={120} /></label>
            <label className="flex flex-col gap-1.5"><span className={veldLabel} style={{ color: NAVY }}>E-mailadres collega</span><input id="ds-email" className={`${veld} ${rand()}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} /></label>
            <label className="flex flex-col gap-1.5"><span className={veldLabel} style={{ color: NAVY }}>Je eigen naam</span><input id="ds-van" className={`${veld} ${rand()}`} value={van} onChange={(e) => setVan(e.target.value)} maxLength={120} /></label>
            <label className="flex flex-col gap-1.5 sm:col-span-2"><span className={veldLabel} style={{ color: NAVY }}>Bericht <span className="font-normal text-[#77758F]">(mag leeg)</span></span><textarea id="ds-bericht" className={`${veld} ${rand()} h-auto min-h-[80px] py-3`} value={bericht} onChange={(e) => setBericht(e.target.value)} maxLength={2000} /></label>
          </div>
          {state && (state.ok ? (
            <p role="status" className="m-0 flex items-center gap-2 rounded-[14px] bg-[#E3F6ED] px-4 py-3 text-[15px] font-semibold text-[#0A7A4B]"><Vink /> {state.fout}</p>
          ) : (
            <p role="alert" className="m-0 rounded-[14px] bg-[#FDECEA] px-4 py-3 text-[15px] text-[#B42318]">{state.fout}</p>
          ))}
          <div className="flex flex-wrap items-center gap-4">
            <button className={knoppen.roze} disabled={bezig}>{bezig ? "Versturen…" : "Doorsturen"}</button>
            <button type="button" className="text-[14px] font-bold underline-offset-4 hover:underline" style={{ color: NAVY }} onClick={() => setOpen(false)}>Sluiten</button>
          </div>
        </form>
      )}
    </div>
  );
}
