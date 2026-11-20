"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { LuCalendarClock, LuCheck, LuIdCard, LuMail, LuPhone, LuPlus, LuSend, LuTrash2, LuX } from "react-icons/lu";
import {
  actieStand, CHECKLIST, GESPREK_SOORTEN, KLANT_STATUS, relatief, relatiefMoment, statusInfo, tijdlijnRegels, type Bezoek, type Gesprek, type GesprekSoort, type Klant,
  type KlantStatus, type Koppeling,
} from "@/lib/klanten";
import { datumLang } from "@/lib/offertes";
import { MAIL_SJABLONEN, naamUitEmail, sjabloon, voornaamUit, vulIn } from "@/lib/klantMail";
import { noteerBel } from "@/lib/belAfloop";
import { herkomstLabel, HERKOMST_UITLEG, HERKOMSTEN } from "@/lib/herkomst";
import { maakKlant, mailKlant, verwijderGesprek, verwijderKlant, voegGesprekToe, wijzigKlant, zetKlantStatus, type KlantInvoer } from "@/app/admin/klantenActions";
import { Checklist, Eigenaar, GesprekIcoon, KoppelChip, PartnerChip, SiteIcoon, type PartnerKort } from "./bits";
import Tijdlijn from "./Tijdlijn";

/**
 * Het zijpaneel bij een kaart: de status, de volgende stap, een gesprek
 * vastleggen (met in één keer de volgende stap en een nieuwe kolom), de
 * tijdlijn, de gegevens, de vinkjes uit de klantlijst en alles van deze klant
 * in de andere modules. Zonder kaart (`klant` is null) is het het formulier
 * voor een nieuwe lead of klant.
 */

type Props = {
  klant: Klant | null;
  gesprekken: Gesprek[];
  koppelingen: Koppeling[];
  bezoek: Bezoek | null;
  vandaag: string;
  eigenaren: string[];
  /** Of Resend is ingesteld; zo niet, dan zegt het paneel dat in plaats van een knop. */
  mailAan: boolean;
  /** Het e-mailadres van wie is ingelogd: de afzender van een mail. */
  ik: string;
  /** De partners en resellers (0022) voor de keuzelijst (0052). */
  partners: PartnerKort[];
  onClose: () => void;
  onKlant: (k: Klant, gesprek?: Gesprek | null) => void;
  onGesprekWeg: (klant: Klant, gesprekId: string) => void;
  onVerwijderd: (id: string) => void;
  meld: (ok: boolean, tekst: string) => void;
};

const veld = "ainput !py-2 !text-[14px]";
const kop = "text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45";

function plusDagen(vandaag: string, n: number): string {
  const d = new Date(`${vandaag}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function KlantPaneel(p: Props) {
  useEffect(() => {
    const toets = (e: KeyboardEvent) => {
      if (e.key === "Escape") p.onClose();
    };
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[#1c1a4e]/25 backdrop-blur-[1px]" onClick={p.onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={p.klant ? p.klant.bedrijf : "Nieuwe lead of klant"}
        className="kb-paneel fixed inset-y-0 right-0 z-50 flex w-full max-w-[580px] flex-col bg-[#fafafd] shadow-[-24px_0_60px_-30px_rgba(18,16,60,0.5)]"
      >
        {p.klant ? <Bestaand {...p} klant={p.klant} /> : <Nieuw {...p} />}
      </aside>
    </>
  );
}

/* ---------- een nieuwe kaart ---------- */

function Nieuw({ vandaag, eigenaren, partners, onClose, onKlant, meld }: Props) {
  const [bezig, start] = useTransition();
  const [fout, setFout] = useState<string | null>(null);
  const [v, setV] = useState<KlantInvoer>({ bedrijf: "", status: "lead", contactpersoon: "", telefoon: "", email: "", eigenaar: "", herkomst: "", herkomst_toelichting: "", partner_id: "", startdatum: "", stand: "", volgende_actie: "", volgende_actie_op: "" });
  const zet = (k: keyof KlantInvoer, w: string) => setV((x) => ({ ...x, [k]: w }));

  return (
    <form
      className="flex h-full flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        setFout(null);
        start(async () => {
          const r = await maakKlant(v);
          if (!r.ok) return setFout(r.fout);
          meld(true, `${r.klant.bedrijf} staat op het bord.`);
          onKlant(r.klant);
        });
      }}
    >
      <header className="flex items-start justify-between gap-4 border-b border-black/[0.06] bg-white px-6 py-5">
        <div>
          <h2 className="font-heading text-[20px] font-bold text-[#312e82]">Nieuwe lead of klant</h2>
          <p className="text-[13.5px] text-black/50">De bedrijfsnaam en hoe de klant ons vond zijn verplicht. De rest vul je aan terwijl je belt.</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-black/40 hover:bg-black/[0.05] hover:text-[#1c1a4e]" aria-label="Sluiten"><LuX /></button>
      </header>
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div>
          <label className="alabel" htmlFor="kb-bedrijf">Bedrijf *</label>
          <input id="kb-bedrijf" className={veld} value={v.bedrijf || ""} onChange={(e) => zet("bedrijf", e.target.value)} required autoFocus placeholder="Bijvoorbeeld Bakkerij De Korenaar" />
        </div>
        <div>
          <span className="alabel">Status</span>
          <StatusKeuze huidig={(v.status as KlantStatus) || "lead"} onKies={(s) => zet("status", s)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="alabel" htmlFor="kb-cp">Contactpersoon</label>
            <input id="kb-cp" className={veld} value={v.contactpersoon || ""} onChange={(e) => zet("contactpersoon", e.target.value)} />
          </div>
          <div>
            <label className="alabel" htmlFor="kb-eigenaar">Eigenaar bij React2u</label>
            <input id="kb-eigenaar" className={veld} list="kb-eigenaren" value={v.eigenaar || ""} onChange={(e) => zet("eigenaar", e.target.value)} placeholder="Wie heeft deze klant?" />
            <datalist id="kb-eigenaren">{eigenaren.map((e) => <option key={e} value={e} />)}</datalist>
          </div>
          <div>
            <label className="alabel" htmlFor="kb-tel">Telefoon</label>
            <input id="kb-tel" className={veld} type="tel" value={v.telefoon || ""} onChange={(e) => zet("telefoon", e.target.value)} />
          </div>
          <div>
            <label className="alabel" htmlFor="kb-email">E-mail</label>
            <input id="kb-email" className={veld} type="email" value={v.email || ""} onChange={(e) => zet("email", e.target.value)} />
          </div>
          <div>
            <label className="alabel" htmlFor="kb-herkomst">Hoe vond de klant ons? *</label>
            <select id="kb-herkomst" className={veld} value={v.herkomst || ""} onChange={(e) => zet("herkomst", e.target.value)} required>
              <option value="" disabled>Kies een herkomst</option>
              {HERKOMSTEN.map((h) => <option key={h} value={h}>{HERKOMST_UITLEG[h]}</option>)}
            </select>
          </div>
          <div>
            <label className="alabel" htmlFor="kb-herkomst-toelichting">Toelichting</label>
            <input id="kb-herkomst-toelichting" className={veld} value={v.herkomst_toelichting || ""} onChange={(e) => zet("herkomst_toelichting", e.target.value)} maxLength={200} placeholder="Wie verwees door, welke beurs" />
          </div>
          {partners.length > 0 && (
            <div>
              <label className="alabel" htmlFor="kb-partner">Via reseller of partner</label>
              <select id="kb-partner" className={veld} value={v.partner_id || ""} onChange={(e) => zet("partner_id", e.target.value)}>
                <option value="">Geen</option>
                {partners.filter((p) => p.actief).map((p) => <option key={p.id} value={p.id}>{p.kantoor}{p.model === "reseller" ? " (reseller)" : ""}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="alabel" htmlFor="kb-start">Startdatum</label>
            <input id="kb-start" className={veld} type="date" value={v.startdatum || ""} onChange={(e) => zet("startdatum", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="alabel" htmlFor="kb-stand">Laatste stand</label>
          <textarea id="kb-stand" className={`${veld} font-sans`} rows={2} value={v.stand || ""} onChange={(e) => zet("stand", e.target.value)} placeholder="Waar staat het nu, in één zin?" />
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
          <div>
            <label className="alabel" htmlFor="kb-actie">Volgende actie</label>
            <input id="kb-actie" className={veld} value={v.volgende_actie || ""} onChange={(e) => zet("volgende_actie", e.target.value)} placeholder="Bijvoorbeeld: offerte nabellen" />
          </div>
          <div>
            <label className="alabel" htmlFor="kb-actie-op">Op</label>
            <input id="kb-actie-op" className={veld} type="date" min={vandaag} value={v.volgende_actie_op || ""} onChange={(e) => zet("volgende_actie_op", e.target.value)} />
          </div>
        </div>
        {fout && <p className="rounded-xl bg-[#fdeef4] px-4 py-2.5 text-[13.5px] font-semibold text-[#e0356b]" role="alert">{fout}</p>}
      </div>
      <footer className="flex items-center justify-end gap-3 border-t border-black/[0.06] bg-white px-6 py-4">
        <button type="button" onClick={onClose} className="abtn-ghost">Annuleren</button>
        <button className="abtn" disabled={bezig}><LuPlus /> {bezig ? "Opslaan…" : "Op het bord zetten"}</button>
      </footer>
    </form>
  );
}

/* ---------- een bestaande kaart ---------- */

function StatusKeuze({ huidig, onKies, bezig }: { huidig: KlantStatus; onKies: (s: KlantStatus) => void; bezig?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Status">
      {KLANT_STATUS.map((s) => {
        const aan = s.key === huidig;
        return (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={aan}
            disabled={bezig}
            onClick={() => onKies(s.key)}
            className={`apill !py-1.5 text-[12.5px] transition ${aan ? "ring-2 ring-offset-1" : "opacity-80 hover:opacity-100"}`}
            style={aan ? { background: s.achter, color: s.kleur, boxShadow: `0 0 0 2px ${s.kleur}` } : { background: "rgba(13,13,40,0.04)", color: "rgba(13,13,40,0.6)" }}
            title={s.uitleg}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function Bestaand({ klant: k, gesprekken, koppelingen, bezoek, vandaag, eigenaren, partners, mailAan, ik, onClose, onKlant, onGesprekWeg, onVerwijderd, meld }: Props & { klant: Klant }) {
  const [bezig, start] = useTransition();
  const [fout, setFout] = useState<string | null>(null);
  const actie = actieStand(k, vandaag);
  const regels = tijdlijnRegels(gesprekken, bezoek);

  // De volgende stap.
  const [actieTekst, setActieTekst] = useState(k.volgende_actie || "");
  const [actieOp, setActieOp] = useState(k.volgende_actie_op || "");
  const actieGewijzigd = actieTekst !== (k.volgende_actie || "") || actieOp !== (k.volgende_actie_op || "");

  // Een gesprek vastleggen.
  const [soort, setSoort] = useState<GesprekSoort>("gesprek");
  const [op, setOp] = useState(vandaag);
  const [tekst, setTekst] = useState("");
  const [metVervolg, setMetVervolg] = useState(false);
  const [vervolg, setVervolg] = useState("");
  const [vervolgOp, setVervolgOp] = useState("");
  const [naar, setNaar] = useState<KlantStatus | "">("");

  // Mailen vanuit de kaart.
  const [mailOpen, setMailOpen] = useState(false);
  const [mailKey, setMailKey] = useState<string>(k.status === "offerte" || k.status === "akkoord" ? "offerte_nabellen" : k.status === "inrichten" || k.status === "klant" ? "welkom" : "kennismaking");
  const [mailAan2, setMailAan2] = useState(k.email || "");
  const [afzender, setAfzender] = useState(() => {
    try {
      return localStorage.getItem("kb-afzender") || naamUitEmail(ik);
    } catch {
      return naamUitEmail(ik);
    }
  });
  const velden = { voornaam: voornaamUit(k.contactpersoon), bedrijf: k.bedrijf, afzender };
  const [onderwerp, setOnderwerp] = useState(() => vulIn(sjabloon(mailKey).onderwerp, velden));
  const [mailTekst, setMailTekst] = useState(() => vulIn(sjabloon(mailKey).tekst, velden));
  const [mailVervolg, setMailVervolg] = useState(true);
  const kiesSjabloon = (key: string) => {
    const sj = sjabloon(key);
    setMailKey(key);
    setOnderwerp(vulIn(sj.onderwerp, velden));
    setMailTekst(vulIn(sj.tekst, velden));
    setMailVervolg(Boolean(sj.volgende));
  };
  const verstuurMail = () =>
    doe(
      async () => {
        const sj = sjabloon(mailKey);
        const vervolg = mailVervolg && sj.volgende ? { volgende_actie: sj.volgende.tekst, volgende_actie_op: plusDagen(vandaag, sj.volgende.overDagen) } : {};
        const r = await mailKlant(k.id, { aan: mailAan2, onderwerp, tekst: mailTekst, afzender, ...vervolg });
        if (r.ok) onKlant(r.klant, r.gesprek);
        return r;
      },
      () => {
        try {
          localStorage.setItem("kb-afzender", afzender);
        } catch {
          // geen opslag: dan de volgende keer weer de naam uit het e-mailadres
        }
        setMailOpen(false);
        meld(true, `Mail verstuurd naar ${mailAan2}.`);
      },
    );

  // De gegevens.
  const [g, setG] = useState<KlantInvoer>({
    bedrijf: k.bedrijf, contactpersoon: k.contactpersoon || "", telefoon: k.telefoon || "", email: k.email || "", eigenaar: k.eigenaar || "",
    herkomst: k.herkomst || "", herkomst_toelichting: k.herkomst_toelichting || "",
    startdatum: k.startdatum || "", stand: k.stand || "", notitie: k.notitie || "", partner_id: k.partner_id || "",
  });
  const zetG = (veld: keyof KlantInvoer, w: string) => setG((x) => ({ ...x, [veld]: w }));
  const gegevensGewijzigd = (["bedrijf", "contactpersoon", "telefoon", "email", "eigenaar", "herkomst", "herkomst_toelichting", "startdatum", "stand", "notitie", "partner_id"] as const).some(
    (f) => (g[f] || "") !== ((k[f] as string | null) || ""),
  );

  const doe = (fn: () => Promise<{ ok: boolean; fout?: string }>, na?: () => void) => {
    setFout(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) return setFout(r.fout || "Er ging iets mis.");
      na?.();
    });
  };

  const zetStatus = (s: KlantStatus) =>
    doe(async () => {
      const r = await zetKlantStatus(k.id, s);
      if (r.ok) onKlant(r.klant, r.gesprek ?? null);
      return r;
    });

  const bewaarActie = (tekstW: string, opW: string) =>
    doe(
      async () => {
        const r = await wijzigKlant(k.id, { volgende_actie: tekstW || null, volgende_actie_op: opW || null });
        if (r.ok) onKlant(r.klant);
        return r;
      },
      () => {
        setActieTekst(tekstW);
        setActieOp(opW);
      },
    );

  const bewaarGegevens = () =>
    doe(
      async () => {
        const r = await wijzigKlant(k.id, g);
        if (r.ok) onKlant(r.klant);
        return r;
      },
      () => meld(true, "Gegevens opgeslagen."),
    );

  const wisselVinkje = (key: (typeof CHECKLIST)[number]["key"]) =>
    doe(async () => {
      const r = await wijzigKlant(k.id, { [key]: !k[key] });
      if (r.ok) onKlant(r.klant);
      return r;
    });

  const legVast = () =>
    doe(
      async () => {
        const r = await voegGesprekToe(k.id, {
          soort,
          op,
          tekst,
          ...(metVervolg ? { volgende_actie: vervolg || null, volgende_actie_op: vervolgOp || null } : {}),
          ...(naar ? { status: naar } : {}),
        });
        if (r.ok) onKlant(r.klant, r.gesprek);
        return r;
      },
      () => {
        setTekst("");
        setOp(vandaag);
        setMetVervolg(false);
        setVervolg("");
        setVervolgOp("");
        setNaar("");
        meld(true, "Vastgelegd.");
      },
    );

  const verwijderRegel = (id: string) =>
    doe(async () => {
      const r = await verwijderGesprek(k.id, id);
      if (r.ok) onGesprekWeg(r.klant, id);
      return r;
    });

  const verwijder = () => {
    if (!window.confirm(`${k.bedrijf} van het bord halen, met alle gesprekken? Dit kan niet ongedaan worden gemaakt.`)) return;
    doe(
      async () => {
        const r = await verwijderKlant(k.id);
        if (r.ok) onVerwijderd(k.id);
        return r;
      },
      () => meld(true, `${k.bedrijf} is van het bord.`),
    );
  };

  const s = statusInfo(k.status);

  return (
    <>
      <header className="border-b border-black/[0.06] bg-white px-6 pb-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="truncate font-heading text-[20px] font-bold text-[#1c1a4e]">{k.bedrijf}</h2>
              <Eigenaar naam={k.eigenaar} groot />
            </div>
            <p className="mt-0.5 text-[13px] text-black/50">
              {s.uitleg}
              {k.startdatum ? ` · start ${datumLang(k.startdatum)}` : ""}
              {/* De herkomst uit de vaste lijst (0047); daarvóór de vrije tekst of de module die de kaart maakte. */}
              {k.herkomst ? ` · via ${herkomstLabel(k.herkomst)}${k.herkomst_toelichting ? ` (${k.herkomst_toelichting})` : ""}` : k.bron ? ` · via ${k.bron}` : ""}
            </p>
            {k.partner_id && partners.find((p) => p.id === k.partner_id) && (
              <p className="mt-1"><PartnerChip p={partners.find((p) => p.id === k.partner_id)!} /></p>
            )}
            {!k.herkomst && (
              <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#fff4e5] px-2.5 py-0.5 text-[12px] font-semibold text-[#b86e00]">
                Hoe vond deze klant ons? Vul de herkomst in bij Gegevens.
              </p>
            )}
          </div>
          <span className="flex shrink-0 items-center gap-1">
            {/* De stamkaart (0048): bedrijfsgegevens, documenten en tariefafspraken van deze klant. */}
            <Link href={`/admin/klanten/${k.id}`} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-[#312e82] hover:bg-[#eef0ff]" title="Stamkaart: bedrijfsgegevens, documenten en tariefafspraken">
              <LuIdCard className="text-[15px]" /> <span className="hidden sm:inline">Stamkaart</span>
            </Link>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-black/40 hover:bg-black/[0.05] hover:text-[#1c1a4e]" aria-label="Sluiten"><LuX /></button>
          </span>
        </div>
        <div className="mt-3">
          <StatusKeuze huidig={k.status} onKies={zetStatus} bezig={bezig} />
        </div>
        {bezoek && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-[10px] bg-[#e6f2ff] px-3 py-1.5 text-[12.5px] font-semibold text-[#0b6bcb]">
            <SiteIcoon className="text-[13px]" /> Op de site {relatiefMoment(bezoek.laatst)} · {bezoek.paginas} {bezoek.paginas === 1 ? "pagina" : "pagina's"} in twee weken
          </p>
        )}
        {(k.telefoon || k.email) && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px]">
            {k.contactpersoon && <span className="text-black/60">{k.contactpersoon}</span>}
            {k.telefoon && <a href={`tel:${k.telefoon.replace(/\s/g, "")}`} onClick={() => noteerBel({ id: k.id, bedrijf: k.bedrijf, naam: k.contactpersoon })} className="inline-flex items-center gap-1.5 font-semibold text-[#e75387] hover:underline"><LuPhone className="text-[12px]" />{k.telefoon}</a>}
            {k.email && <a href={`mailto:${k.email}`} className="inline-flex items-center gap-1.5 font-semibold text-[#e75387] hover:underline"><LuMail className="text-[12px]" />{k.email}</a>}
          </div>
        )}
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {fout && <p className="rounded-xl bg-[#fdeef4] px-4 py-2.5 text-[13.5px] font-semibold text-[#e0356b]" role="alert">{fout}</p>}

        {/* Volgende stap */}
        <section className={`acard p-4 ${actie === "te_laat" ? "border-l-[3px] border-l-[#e75387]" : ""}`} aria-labelledby="kb-volgende">
          <div className="flex items-center justify-between gap-3">
            <h3 id="kb-volgende" className={`${kop} inline-flex items-center gap-1.5`}><LuCalendarClock className="text-[13px]" /> Volgende stap</h3>
            {k.volgende_actie_op && (
              <span className={`apill !py-0.5 text-[11.5px] ${actie === "te_laat" ? "bg-[#fdeef4] text-[#e0356b]" : actie === "vandaag" ? "bg-[#fff4e5] text-[#b86e00]" : "bg-black/[0.05] text-black/55"}`}>
                {actie === "te_laat" ? "Te laat: " : ""}{relatief(k.volgende_actie_op, vandaag)}
              </span>
            )}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_160px]">
            <input className={veld} value={actieTekst} onChange={(e) => setActieTekst(e.target.value)} placeholder="Wat moet er gebeuren?" aria-label="Volgende actie" />
            <input className={veld} type="date" value={actieOp} onChange={(e) => setActieOp(e.target.value)} aria-label="Datum van de volgende actie" />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {[["Vandaag", 0], ["Morgen", 1], ["Over een week", 7], ["Over een maand", 30]].map(([l, n]) => (
              <button key={l} type="button" onClick={() => setActieOp(plusDagen(vandaag, Number(n)))} className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[12px] font-semibold text-black/60 hover:bg-black/[0.08]">{l}</button>
            ))}
            <span className="flex-1" />
            {(k.volgende_actie || k.volgende_actie_op) && (
              <button type="button" onClick={() => bewaarActie("", "")} disabled={bezig} className="inline-flex items-center gap-1 rounded-full bg-[#e3f6ed] px-2.5 py-1 text-[12px] font-semibold text-[#0a7a4b] hover:brightness-95" title="De volgende stap is gedaan: haal hem van de kaart">
                <LuCheck className="text-[12px]" /> Gedaan
              </button>
            )}
            <button type="button" onClick={() => bewaarActie(actieTekst, actieOp)} disabled={bezig || !actieGewijzigd} className="abtn !px-3 !py-1 !text-[12.5px] disabled:opacity-40">Bewaar</button>
          </div>
        </section>

        {/* Gesprek vastleggen */}
        <section className="acard p-4" aria-labelledby="kb-gesprek">
          <h3 id="kb-gesprek" className={kop}>Gesprek vastleggen</h3>
          <div className="mt-3 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Wat voor contact">
            {GESPREK_SOORTEN.map((x) => (
              <button
                key={x.key}
                type="button"
                role="radio"
                aria-checked={soort === x.key}
                onClick={() => setSoort(x.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold transition ${soort === x.key ? "bg-[#312e82] text-white" : "bg-black/[0.04] text-black/60 hover:bg-black/[0.08]"}`}
              >
                <GesprekIcoon soort={x.key} className="text-[12px]" /> {x.label}
              </button>
            ))}
            <input className={`${veld} ml-auto !w-auto`} type="date" value={op} max={vandaag} onChange={(e) => setOp(e.target.value)} aria-label="Datum van het gesprek" />
          </div>
          <textarea
            id="kb-tekst"
            className={`${veld} mt-3 font-sans`}
            rows={3}
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            placeholder="Wat is er besproken? Kort is goed."
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && tekst.trim()) legVast();
            }}
          />
          <div className="mt-3 space-y-2.5">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-black/65">
              <input type="checkbox" checked={metVervolg} onChange={(e) => { setMetVervolg(e.target.checked); if (e.target.checked && !vervolgOp) setVervolgOp(plusDagen(vandaag, 7)); }} className="h-4 w-4 accent-[#e75387]" />
              Meteen de volgende stap zetten
            </label>
            {metVervolg && (
              <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
                <input className={veld} value={vervolg} onChange={(e) => setVervolg(e.target.value)} placeholder="Bijvoorbeeld: offerte nabellen" aria-label="Volgende actie na dit gesprek" />
                <input className={veld} type="date" value={vervolgOp} onChange={(e) => setVervolgOp(e.target.value)} aria-label="Datum" />
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-[13px] text-black/55">
                Kaart naar
                <select value={naar} onChange={(e) => setNaar(e.target.value as KlantStatus | "")} className="rounded-lg border border-black/[0.1] bg-white px-2 py-1 text-[12.5px] font-semibold text-[#1c1a4e]" aria-label="Kaart verplaatsen naar">
                  <option value="">blijft in {s.label.toLowerCase()}</option>
                  {KLANT_STATUS.filter((x) => x.key !== k.status).map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                </select>
              </label>
              <button type="button" onClick={legVast} disabled={bezig || (!tekst.trim() && !metVervolg && !naar)} className="abtn !px-4 !py-1.5 !text-[13px] disabled:opacity-40">
                <LuPlus /> Vastleggen
              </button>
            </div>
          </div>
        </section>

        {/* Mail sturen */}
        <section className="acard p-4" aria-labelledby="kb-mail">
          <div className="flex items-center justify-between gap-3">
            <h3 id="kb-mail" className={`${kop} inline-flex items-center gap-1.5`}><LuMail className="text-[13px]" /> Mail sturen</h3>
            {!mailOpen && (
              <button type="button" onClick={() => setMailOpen(true)} className="abtn-ghost !px-3 !py-1 !text-[12.5px]" disabled={!mailAan}>{mailAan ? "Schrijf een mail" : "Mailen staat uit"}</button>
            )}
          </div>
          {!mailAan && <p className="mt-2 text-[12.5px] text-black/45">Resend is niet ingesteld (Instellingen → E-mail). Tot die tijd mail je vanuit je eigen mailprogramma en leg je het hier vast als &quot;Gemaild&quot;.</p>}
          {mailOpen && (
            <form
              className="mt-3 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                verstuurMail();
              }}
            >
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Sjabloon">
                {MAIL_SJABLONEN.map((sj) => (
                  <button key={sj.key} type="button" role="radio" aria-checked={mailKey === sj.key} onClick={() => kiesSjabloon(sj.key)} className={`rounded-full px-3 py-1 text-[12.5px] font-semibold transition ${mailKey === sj.key ? "bg-[#312e82] text-white" : "bg-black/[0.04] text-black/60 hover:bg-black/[0.08]"}`}>
                    {sj.label}
                  </button>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="alabel" htmlFor="kb-mail-aan">Aan</label>
                  <input id="kb-mail-aan" className={veld} type="email" value={mailAan2} onChange={(e) => setMailAan2(e.target.value)} required />
                </div>
                <div>
                  <label className="alabel" htmlFor="kb-mail-van">Je naam onder de mail</label>
                  <input id="kb-mail-van" className={veld} value={afzender} onChange={(e) => setAfzender(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="alabel" htmlFor="kb-mail-onderwerp">Onderwerp</label>
                <input id="kb-mail-onderwerp" className={veld} value={onderwerp} onChange={(e) => setOnderwerp(e.target.value)} required />
              </div>
              <div>
                <label className="alabel" htmlFor="kb-mail-tekst">Tekst <span className="font-normal text-black/40">(de groet en je naam komen eronder)</span></label>
                <textarea id="kb-mail-tekst" className={`${veld} font-sans`} rows={7} value={mailTekst} onChange={(e) => setMailTekst(e.target.value)} required />
              </div>
              {sjabloon(mailKey).volgende && (
                <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-black/65">
                  <input type="checkbox" checked={mailVervolg} onChange={(e) => setMailVervolg(e.target.checked)} className="h-4 w-4 accent-[#e75387]" />
                  Volgende stap: {sjabloon(mailKey).volgende!.tekst.toLowerCase()} over {sjabloon(mailKey).volgende!.overDagen} dagen
                </label>
              )}
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setMailOpen(false)} className="abtn-ghost !px-3 !py-1.5 !text-[13px]">Annuleren</button>
                <button className="abtn !px-4 !py-1.5 !text-[13px] disabled:opacity-40" disabled={bezig || !mailAan2 || !onderwerp.trim() || !mailTekst.trim()}><LuSend /> Verstuur mail</button>
              </div>
            </form>
          )}
        </section>

        {/* Tijdlijn */}
        <section aria-labelledby="kb-tijdlijn">
          <h3 id="kb-tijdlijn" className={`${kop} mb-2 px-1`}>Tijdlijn</h3>
          <Tijdlijn regels={regels} onVerwijder={verwijderRegel} bezig={bezig} />
        </section>

        {/* Checklist */}
        <section className="acard p-4" aria-labelledby="kb-checklist">
          <div className="flex items-center justify-between">
            <h3 id="kb-checklist" className={kop}>Instaptraject</h3>
            <Checklist k={k} groot />
          </div>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {CHECKLIST.map((c) => (
              <li key={c.key}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={k[c.key]}
                  disabled={bezig}
                  onClick={() => wisselVinkje(c.key)}
                  className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-[13.5px] transition ${k[c.key] ? "border-[#0a7a4b]/30 bg-[#e3f6ed] text-[#0a7a4b]" : "border-black/[0.08] bg-white text-black/60 hover:border-black/20"}`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${k[c.key] ? "border-[#0a7a4b] bg-[#0a7a4b] text-white" : "border-black/20"}`}>{k[c.key] && <LuCheck className="text-[12px]" />}</span>
                  {c.label}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Koppelingen */}
        <section className="acard p-4" aria-labelledby="kb-koppelingen">
          <h3 id="kb-koppelingen" className={kop}>In de andere modules</h3>
          {koppelingen.length === 0 ? (
            <p className="mt-2 text-[13px] text-black/45">Nog geen offerte, brochure, contract, onboarding of bellijstlead met deze bedrijfsnaam.</p>
          ) : (
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {koppelingen.map((x) => <li key={`${x.soort}-${x.id}`}><KoppelChip x={x} volledig /></li>)}
            </ul>
          )}
        </section>

        {/* Gegevens */}
        <section className="acard p-4" aria-labelledby="kb-gegevens">
          <h3 id="kb-gegevens" className={kop}>Gegevens</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="alabel" htmlFor="kb-g-bedrijf">Bedrijf</label>
              <input id="kb-g-bedrijf" className={veld} value={g.bedrijf || ""} onChange={(e) => zetG("bedrijf", e.target.value)} />
            </div>
            <div>
              <label className="alabel" htmlFor="kb-g-cp">Contactpersoon</label>
              <input id="kb-g-cp" className={veld} value={g.contactpersoon || ""} onChange={(e) => zetG("contactpersoon", e.target.value)} />
            </div>
            <div>
              <label className="alabel" htmlFor="kb-g-eigenaar">Eigenaar bij React2u</label>
              <input id="kb-g-eigenaar" className={veld} list="kb-eigenaren-g" value={g.eigenaar || ""} onChange={(e) => zetG("eigenaar", e.target.value)} />
              <datalist id="kb-eigenaren-g">{eigenaren.map((e) => <option key={e} value={e} />)}</datalist>
            </div>
            <div>
              <label className="alabel" htmlFor="kb-g-tel">Telefoon</label>
              <input id="kb-g-tel" className={veld} type="tel" value={g.telefoon || ""} onChange={(e) => zetG("telefoon", e.target.value)} />
            </div>
            <div>
              <label className="alabel" htmlFor="kb-g-email">E-mail</label>
              <input id="kb-g-email" className={veld} type="email" value={g.email || ""} onChange={(e) => zetG("email", e.target.value)} />
            </div>
            <div>
              <label className="alabel" htmlFor="kb-g-herkomst">Hoe vond de klant ons?</label>
              <select id="kb-g-herkomst" className={veld} value={g.herkomst || ""} onChange={(e) => zetG("herkomst", e.target.value)}>
                <option value="">Nog niet ingevuld</option>
                {HERKOMSTEN.map((h) => <option key={h} value={h}>{HERKOMST_UITLEG[h]}</option>)}
              </select>
            </div>
            <div>
              <label className="alabel" htmlFor="kb-g-herkomst-toelichting">Toelichting bij de herkomst</label>
              <input id="kb-g-herkomst-toelichting" className={veld} value={g.herkomst_toelichting || ""} onChange={(e) => zetG("herkomst_toelichting", e.target.value)} maxLength={200} placeholder="Wie verwees door, welke beurs" />
            </div>
            <div>
              <label className="alabel" htmlFor="kb-g-partner">Via reseller of partner</label>
              <select id="kb-g-partner" className={veld} value={g.partner_id || ""} onChange={(e) => zetG("partner_id", e.target.value)}>
                <option value="">Geen</option>
                {partners.filter((p) => p.actief || p.id === k.partner_id).map((p) => <option key={p.id} value={p.id}>{p.kantoor}{p.model === "reseller" ? " (reseller)" : ""}{p.actief ? "" : " (inactief)"}</option>)}
              </select>
            </div>
            <div>
              <label className="alabel" htmlFor="kb-g-start">Startdatum</label>
              <input id="kb-g-start" className={veld} type="date" value={g.startdatum || ""} onChange={(e) => zetG("startdatum", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="alabel" htmlFor="kb-g-stand">Laatste stand <span className="font-normal text-black/40">(de kolom uit de klantlijst)</span></label>
              <textarea id="kb-g-stand" className={`${veld} font-sans`} rows={2} value={g.stand || ""} onChange={(e) => zetG("stand", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="alabel" htmlFor="kb-g-notitie">Notitie</label>
              <textarea id="kb-g-notitie" className={`${veld} font-sans`} rows={3} value={g.notitie || ""} onChange={(e) => zetG("notitie", e.target.value)} placeholder="Wat je verder wilt weten over deze klant" />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={bewaarGegevens} disabled={bezig || !gegevensGewijzigd} className="abtn !px-4 !py-1.5 !text-[13px] disabled:opacity-40">Gegevens opslaan</button>
          </div>
        </section>

        <div className="flex items-center justify-between gap-3 px-1 pb-2 text-[12.5px] text-black/40">
          <span>Op het bord sinds {datumLang(k.created_at)}</span>
          <button type="button" onClick={verwijder} disabled={bezig} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-black/45 hover:bg-[#fdeef4] hover:text-[#e0356b]"><LuTrash2 className="text-[13px]" /> Van het bord halen</button>
        </div>
      </div>
    </>
  );
}
