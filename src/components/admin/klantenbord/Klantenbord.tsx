"use client";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LuCircleAlert, LuCircleCheck, LuLayoutGrid, LuList, LuPlus, LuSearch, LuUpload, LuX } from "react-icons/lu";
import {
  KLANT_STATUS, sorteerKaarten, telling, zoekKlanten, actieStand, type Gesprek, type Klant, type KlantStatus, type Koppeling,
} from "@/lib/klanten";
import { zetKlantStatus, type ImportResultaat } from "@/app/admin/klantenActions";
import KlantKaart from "./KlantKaart";
import KlantPaneel from "./KlantPaneel";
import KlantImport from "./KlantImport";
import KlantLijst from "./KlantLijst";

/**
 * Het klantenbord: één scherm met alle leads en klanten. Kolommen per status,
 * per kaart het laatste gesprek en de volgende stap; slepen tussen kolommen,
 * zoeken en filteren, een lijstweergave, een zijpaneel per kaart en de import
 * van de klantlijst. De pagina (app/admin/(panel)/klantenbord) haalt de rijen
 * op; dit houdt ze bij zonder te herladen en vraagt de server alleen om de
 * wijziging.
 */

type Weergave = "bord" | "lijst";
type Filter = "alles" | "actie" | "zonder";

export default function Klantenbord({
  klanten: begin, gesprekken: beginGesprekken, koppelingen, vandaag, weergave: beginWeergave,
}: {
  klanten: Klant[];
  gesprekken: Gesprek[];
  koppelingen: Record<string, Koppeling[]>;
  vandaag: string;
  weergave: Weergave;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [klanten, setKlanten] = useState(begin);
  const [gesprekken, setGesprekken] = useState(beginGesprekken);
  // Een nieuwe serverrender (na router.refresh of een revalidate) is de waarheid. Afgeleid tijdens
  // het renderen, niet in een effect: dat scheelt een render (zie ook Toast.tsx).
  const [vorige, setVorige] = useState({ begin, beginGesprekken });
  if (vorige.begin !== begin || vorige.beginGesprekken !== beginGesprekken) {
    setVorige({ begin, beginGesprekken });
    if (vorige.begin !== begin) setKlanten(begin);
    if (vorige.beginGesprekken !== beginGesprekken) setGesprekken(beginGesprekken);
  }

  const [weergave, setWeergave] = useState<Weergave>(beginWeergave);
  const [q, setQ] = useState("");
  const [eigenaar, setEigenaar] = useState("");
  const [filter, setFilter] = useState<Filter>("alles");
  const [toonInactief, setToonInactief] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [sleept, setSleept] = useState<string | null>(null);
  const [over, setOver] = useState<KlantStatus | null>(null);
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string; n: number } | null>(null);

  const meld = useCallback((ok: boolean, tekst: string) => setMelding((m) => ({ ok, tekst, n: (m?.n ?? 0) + 1 })), []);
  useEffect(() => {
    if (!melding) return;
    const t = setTimeout(() => setMelding(null), 3800);
    return () => clearTimeout(t);
  }, [melding]);

  // De weergave in de URL, zodat een link naar de lijst ook de lijst opent; `null` als state, anders ziet Next hem niet (zie Toast.tsx).
  const kiesWeergave = (w: Weergave) => {
    setWeergave(w);
    const url = new URL(window.location.href);
    if (w === "lijst") url.searchParams.set("weergave", "lijst");
    else url.searchParams.delete("weergave");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };

  // #nieuw (uit het commandopalet) opent het formulier; #klant-<id> de kaart.
  useEffect(() => {
    const check = () => {
      const h = window.location.hash;
      if (h === "#nieuw") setOpen("nieuw");
      else if (h.startsWith("#klant-")) setOpen(h.slice(7));
      else if (h === "#import") setImportOpen(true);
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  const eigenaren = useMemo(() => [...new Set(klanten.map((k) => k.eigenaar).filter((e): e is string => Boolean(e)))].sort((a, b) => a.localeCompare(b)), [klanten]);
  const perKlant = useMemo(() => {
    const m = new Map<string, Gesprek[]>();
    for (const g of gesprekken) {
      const l = m.get(g.klant_id) || [];
      l.push(g);
      m.set(g.klant_id, l);
    }
    for (const l of m.values()) l.sort((a, b) => b.op.localeCompare(a.op) || b.created_at.localeCompare(a.created_at));
    return m;
  }, [gesprekken]);

  const tel = telling(klanten, vandaag);
  const gefilterd = useMemo(() => {
    let lijst = zoekKlanten(klanten, q);
    if (eigenaar) lijst = lijst.filter((k) => (k.eigenaar || "") === eigenaar);
    if (filter === "actie") lijst = lijst.filter((k) => ["te_laat", "vandaag"].includes(actieStand(k, vandaag)));
    if (filter === "zonder") lijst = lijst.filter((k) => k.status !== "inactief" && k.status !== "klant" && actieStand(k, vandaag) === "geen");
    return lijst;
  }, [klanten, q, eigenaar, filter, vandaag]);
  const actiefFilter = Boolean(q.trim() || eigenaar || filter !== "alles");

  /* ---------- wijzigingen uit het paneel en de kaarten ---------- */

  const zetKlant = useCallback((k: Klant, gesprek?: Gesprek | null) => {
    setKlanten((lijst) => (lijst.some((x) => x.id === k.id) ? lijst.map((x) => (x.id === k.id ? k : x)) : [k, ...lijst]));
    if (gesprek) setGesprekken((g) => (g.some((x) => x.id === gesprek.id) ? g : [gesprek, ...g]));
  }, []);

  const verplaats = (id: string, status: KlantStatus) => {
    const k = klanten.find((x) => x.id === id);
    if (!k || k.status === status) return;
    const oud = k;
    setKlanten((lijst) => lijst.map((x) => (x.id === id ? { ...x, status, updated_at: new Date().toISOString() } : x)));
    start(async () => {
      const r = await zetKlantStatus(id, status);
      if (!r.ok) {
        setKlanten((lijst) => lijst.map((x) => (x.id === id ? oud : x)));
        meld(false, r.fout);
        return;
      }
      zetKlant(r.klant, r.gesprek ?? null);
    });
  };

  const naImport = (r: ImportResultaat) => {
    setImportOpen(false);
    if (!r.ok) return meld(false, r.fout);
    const delen = [
      r.nieuw ? `${r.nieuw} nieuw` : "",
      r.bijgewerkt ? `${r.bijgewerkt} bijgewerkt` : "",
      r.ongewijzigd ? `${r.ongewijzigd} ongewijzigd` : "",
      r.overgeslagen ? `${r.overgeslagen} overgeslagen` : "",
    ].filter(Boolean);
    meld(true, `Klantlijst geïmporteerd: ${delen.join(", ") || "niets te doen"}.`);
    router.refresh();
  };

  const openKlant = open && open !== "nieuw" ? klanten.find((k) => k.id === open) || null : null;

  /* ---------- weergave ---------- */

  // De scrollende rijen (kolommen, cijfers) zijn `relative`: alles wat erin absoluut gepositioneerd is blijft dan
  // binnen de rij en maakt de pagina op een telefoon niet breder dan het scherm.
  const kolommen = KLANT_STATUS.filter((s) => s.key !== "inactief");
  const inactief = KLANT_STATUS[KLANT_STATUS.length - 1];
  const inactiefOpen = toonInactief || Boolean(sleept) || filter === "actie" || Boolean(q.trim());

  const kolom = (s: (typeof KLANT_STATUS)[number], smal?: boolean) => {
    const kaarten = sorteerKaarten(gefilterd.filter((k) => k.status === s.key), vandaag);
    const isOver = over === s.key && sleept;
    if (smal) {
      return (
        <button
          key={s.key}
          type="button"
          onClick={() => setToonInactief(true)}
          onDragOver={(e) => { e.preventDefault(); setOver(s.key); }}
          className={`flex w-[52px] shrink-0 flex-col items-center gap-3 rounded-[16px] border border-dashed py-4 text-[12px] font-bold ${isOver ? "border-[#312e82] bg-[#eef0ff]" : "border-black/15 text-black/45 hover:border-black/30"}`}
          title={`${s.label}: ${tel.inactief}. Klik om te tonen.`}
        >
          <span className="rounded-full bg-black/[0.06] px-2 py-0.5 tabular-nums">{tel.inactief}</span>
          <span className="[writing-mode:vertical-rl] rotate-180">{s.label}</span>
        </button>
      );
    }
    return (
      <section
        key={s.key}
        aria-label={`${s.label}, ${kaarten.length}`}
        data-kolom={s.key}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          if (over !== s.key) setOver(s.key);
        }}
        onDragLeave={(e) => {
          if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setOver(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData("text/plain") || sleept;
          setOver(null);
          setSleept(null);
          if (id) verplaats(id, s.key);
        }}
        className={`flex w-[82vw] shrink-0 flex-col rounded-[16px] border transition-colors sm:w-[290px] ${isOver ? "border-[#312e82] bg-[#eef0ff]/60" : "border-transparent bg-black/[0.035]"}`}
      >
        <header className="flex items-start justify-between gap-2 px-3.5 pb-2 pt-3.5">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-[13.5px] font-bold text-[#1c1a4e]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.kleur }} />
              {s.label}
              <span className="rounded-full bg-white px-2 py-px text-[11.5px] font-bold tabular-nums text-black/50 shadow-[0_1px_2px_rgba(18,16,60,0.06)]">{kaarten.length}</span>
            </h2>
            <p className="mt-0.5 text-[11.5px] text-black/45">{s.uitleg}</p>
          </div>
          {s.key === "inactief" && (
            <button type="button" onClick={() => setToonInactief(false)} className="rounded-md p-1 text-black/35 hover:bg-white hover:text-[#1c1a4e]" aria-label="Inactief inklappen"><LuX className="text-[13px]" /></button>
          )}
        </header>
        <div className="flex min-h-[120px] flex-1 flex-col gap-2 px-2 pb-2">
          {kaarten.map((k) => (
            <KlantKaart
              key={k.id}
              k={k}
              koppelingen={koppelingen[k.id] || []}
              vandaag={vandaag}
              open={open === k.id}
              onOpen={() => setOpen(k.id)}
              onStatus={(st) => verplaats(k.id, st)}
              sleept={sleept === k.id}
              onSleep={setSleept}
            />
          ))}
          {kaarten.length === 0 && (
            <p className={`m-1 rounded-[12px] border border-dashed px-3 py-6 text-center text-[12.5px] ${isOver ? "border-[#312e82] text-[#312e82]" : "border-black/10 text-black/35"}`}>
              {isOver ? "Laat hier los" : s.key === "lead" && klanten.length === 0 ? "Zet je eerste lead op het bord" : "Niets hier"}
            </p>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Klantenbord</h1>
          <p className="text-[14.5px] text-black/50">Alle leads en klanten op één bord: waar ze staan, wat het laatste gesprek was en wat de volgende stap is. Sleep een kaart naar een andere kolom als het verder is.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-[12px] bg-black/[0.05] p-1" role="tablist" aria-label="Weergave">
            {([["bord", "Bord", LuLayoutGrid], ["lijst", "Lijst", LuList]] as const).map(([w, label, Icoon]) => (
              <button
                key={w}
                type="button"
                role="tab"
                aria-selected={weergave === w}
                onClick={() => kiesWeergave(w)}
                className={`inline-flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[13px] font-semibold transition ${weergave === w ? "bg-white text-[#312e82] shadow-[0_1px_3px_rgba(18,16,60,0.12)]" : "text-black/55 hover:text-[#1c1a4e]"}`}
              >
                <Icoon className="text-[14px]" /> {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setImportOpen(true)} className="abtn-ghost"><LuUpload /> Klantlijst importeren</button>
          <button type="button" onClick={() => setOpen("nieuw")} className="abtn"><LuPlus /> Nieuwe lead of klant</button>
        </div>
      </div>

      <div className="kb-kpis relative -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-5">
        <Kpi label="Te doen" waarde={String(tel.teLaat + tel.vandaag)} sub={tel.teLaat ? `${tel.teLaat} te laat · ${tel.vandaag} vandaag` : tel.vandaag ? `${tel.vandaag} vandaag` : "niets te laat"} accent={tel.teLaat ? "roze" : tel.vandaag ? "oranje" : undefined} onClick={() => setFilter(filter === "actie" ? "alles" : "actie")} actief={filter === "actie"} />
        <Kpi label="Leads en gesprekken" waarde={String(tel.lead + tel.gesprek)} sub={`${tel.lead} lead · ${tel.gesprek} in gesprek`} />
        <Kpi label="Offertes" waarde={String(tel.offerte + tel.akkoord)} sub={`${tel.offerte} uit · ${tel.akkoord} akkoord`} />
        <Kpi label="Inrichten" waarde={String(tel.inrichten)} sub="contract retour, React2u aan zet" accent={tel.inrichten ? "oranje" : undefined} />
        <Kpi label="Klanten" waarde={String(tel.klant)} sub={tel.inactief ? `${tel.inactief} inactief` : "ingericht en live"} accent="groen" />
      </div>

      <section className="acard overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.06] px-4 py-3 sm:px-6">
          <label className="relative min-w-[200px] flex-1 sm:max-w-[320px]">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-black/35" />
            <input
              className="ainput !py-2 !pl-9 !text-[14px]"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Zoek op bedrijf, naam, telefoon of wat besproken is"
              aria-label="Zoek op het klantenbord"
            />
          </label>
          {eigenaren.length > 0 && (
            <select value={eigenaar} onChange={(e) => setEigenaar(e.target.value)} className="ainput !w-auto !py-2 !text-[13.5px]" aria-label="Eigenaar">
              <option value="">Iedereen</option>
              {eigenaren.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          )}
          <nav className="flex flex-wrap gap-1.5" aria-label="Filter">
            {([["alles", "Alles"], ["actie", "Actie vandaag of te laat"], ["zonder", "Zonder volgende stap"]] as const).map(([f, label]) => (
              <button key={f} type="button" onClick={() => setFilter(f)} className={`apill !py-1.5 text-[13px] ${filter === f ? "bg-[#312e82] text-white" : "bg-black/[0.04] text-black/60 hover:bg-black/[0.07]"}`} aria-pressed={filter === f}>
                {label}
              </button>
            ))}
          </nav>
          <span className="ml-auto text-[12.5px] text-black/45">{actiefFilter ? `${gefilterd.length} van ${klanten.length}` : `${klanten.length} ${klanten.length === 1 ? "kaart" : "kaarten"}`}</span>
        </div>

        {weergave === "lijst" ? (
          gefilterd.length === 0 ? <Leeg klanten={klanten.length} actiefFilter={actiefFilter} onNieuw={() => setOpen("nieuw")} onImport={() => setImportOpen(true)} /> : (
            <KlantLijst klanten={gefilterd} koppelingen={koppelingen} vandaag={vandaag} open={open} onOpen={setOpen} />
          )
        ) : klanten.length === 0 ? (
          <Leeg klanten={0} actiefFilter={false} onNieuw={() => setOpen("nieuw")} onImport={() => setImportOpen(true)} />
        ) : (
          <div className="kb-bord relative flex gap-3 overflow-x-auto px-3 py-3 sm:px-4 sm:py-4" onDragEnd={() => { setSleept(null); setOver(null); }}>
            {kolommen.map((s) => kolom(s))}
            {inactiefOpen ? kolom(inactief) : kolom(inactief, true)}
          </div>
        )}
      </section>

      {open && (
        <KlantPaneel
          key={open}
          klant={openKlant}
          gesprekken={openKlant ? perKlant.get(openKlant.id) || [] : []}
          koppelingen={openKlant ? koppelingen[openKlant.id] || [] : []}
          vandaag={vandaag}
          eigenaren={eigenaren}
          onClose={() => setOpen(null)}
          onKlant={(k, g) => {
            const nieuw = !klanten.some((x) => x.id === k.id);
            zetKlant(k, g);
            if (nieuw) {
              setOpen(k.id);
              router.refresh();
            }
          }}
          onGesprekWeg={(k, id) => {
            setGesprekken((g) => g.filter((x) => x.id !== id));
            zetKlant(k);
          }}
          onVerwijderd={(id) => {
            setKlanten((lijst) => lijst.filter((x) => x.id !== id));
            setOpen(null);
          }}
          meld={meld}
        />
      )}
      {importOpen && <KlantImport bestaande={klanten} vandaag={vandaag} onClose={() => setImportOpen(false)} onKlaar={naImport} />}

      {melding && (
        <div key={melding.n} role="status" className="pointer-events-none fixed bottom-6 right-6 z-[100] animate-[fadeIn_0.2s_ease-out]">
          <div className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 text-[14.5px] font-semibold text-white shadow-xl ${melding.ok ? "bg-[#0e9f8a]" : "bg-[#e0356b]"}`}>
            {melding.ok ? <LuCircleCheck className="text-lg" /> : <LuCircleAlert className="text-lg" />}
            {melding.tekst}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, waarde, sub, accent, onClick, actief }: { label: string; waarde: string; sub: string; accent?: "groen" | "oranje" | "roze"; onClick?: () => void; actief?: boolean }) {
  const kleur = accent === "groen" ? "text-[#0a7a4b]" : accent === "oranje" ? "text-[#b86e00]" : accent === "roze" ? "text-[#e0356b]" : "text-[#1c1a4e]";
  const inhoud = (
    <>
      <p className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.08em] text-black/45 sm:text-[11.5px]">{label}</p>
      <p className={`mt-1.5 font-heading text-[24px] font-bold leading-none sm:mt-2 sm:text-[28px] ${kleur}`}>{waarde}</p>
      <p className="mt-1.5 whitespace-nowrap text-[12px] text-black/45 sm:mt-2 sm:whitespace-normal sm:text-[12.5px]">{sub}</p>
    </>
  );
  const vorm = "acard min-w-[160px] shrink-0 p-4 text-left sm:min-w-0 sm:p-5";
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={actief} className={`${vorm} transition hover:border-[#312e82]/40 ${actief ? "!border-[#312e82] ring-1 ring-[#312e82]" : ""}`}>
        {inhoud}
      </button>
    );
  }
  return <div className={vorm}>{inhoud}</div>;
}

function Leeg({ klanten, actiefFilter, onNieuw, onImport }: { klanten: number; actiefFilter: boolean; onNieuw: () => void; onImport: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef0ff] text-[22px] text-[#312e82]"><LuLayoutGrid /></span>
      <p className="text-[15px] font-semibold text-[#1c1a4e]">{klanten === 0 ? "Het bord is nog leeg" : actiefFilter ? "Niets gevonden met deze zoekvraag of dit filter" : "Niets in deze weergave"}</p>
      {klanten === 0 && (
        <>
          <p className="max-w-[460px] text-[13.5px] text-black/50">Importeer je klantlijst uit Excel, of zet je eerste lead erop. Per kaart houd je het laatste gesprek en de volgende stap bij.</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={onImport} className="abtn-ghost"><LuUpload /> Klantlijst importeren</button>
            <button type="button" onClick={onNieuw} className="abtn"><LuPlus /> Nieuwe lead of klant</button>
          </div>
        </>
      )}
    </div>
  );
}
