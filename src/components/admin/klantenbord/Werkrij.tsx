"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LuArrowLeft, LuCheck, LuChevronRight, LuCircleCheck, LuCircleAlert, LuExternalLink, LuMail, LuPhone, LuPhoneOff, LuSunrise, LuUserRound } from "react-icons/lu";
import { KLANT_STATUS, relatief, type Gesprek, type Klant, type KlantStatus } from "@/lib/klanten";
import { morgen, type WerkRij } from "@/lib/werkrij";
import { noteerBel } from "@/lib/belAfloop";
import { voegGesprekToe, wijzigKlant } from "@/app/admin/klantenActions";
import { StatusPill } from "./bits";
import BelAfloop from "./BelAfloop";

/**
 * De werkrij: één klant tegelijk, van boven naar beneden. Elke rij heeft vier
 * uitkomsten (gesproken, niet bereikt, morgen, klaar) en je kunt er met het
 * toetsenbord doorheen: pijltjes of J/K, Enter of G voor gesproken, N voor
 * niet bereikt, M voor morgen, D voor klaar, S om over te slaan. Een
 * afgehandelde rij verdwijnt; wat je overslaat blijft staan.
 */

const TOON: Record<string, string> = {
  warm: "bg-[#fdeef4] text-[#e0356b]",
  "let-op": "bg-[#fff4e5] text-[#b86e00]",
  info: "bg-[#eef0ff] text-[#312e82]",
};

const kbd = (t: string) => <kbd className="akbd ml-1 hidden sm:inline-flex">{t}</kbd>;

export default function Werkrij({ rijen: begin, vandaag, tabel }: { rijen: WerkRij[]; vandaag: string; tabel: boolean }) {
  const router = useRouter();
  const [bezig, start] = useTransition();
  const [rijen, setRijen] = useState(begin);
  const [cursor, setCursor] = useState(0);
  const [gedaan, setGedaan] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [tekst, setTekst] = useState("");
  const [vervolg, setVervolg] = useState("");
  const [vervolgOp, setVervolgOp] = useState("");
  const [naar, setNaar] = useState<KlantStatus | "">("");
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string; n: number } | null>(null);
  const lijst = useRef<HTMLOListElement>(null);
  const totaal = begin.length;
  const huidig = rijen[cursor] || null;

  const meld = (ok: boolean, t: string) => setMelding((m) => ({ ok, tekst: t, n: (m?.n ?? 0) + 1 }));
  useEffect(() => {
    if (!melding) return;
    const t = setTimeout(() => setMelding(null), 3200);
    return () => clearTimeout(t);
  }, [melding]);

  useEffect(() => {
    lijst.current?.querySelector<HTMLElement>(`[data-rij="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursor, rijen.length]);

  const weg = (id: string) => {
    setRijen((l) => {
      const nieuw = l.filter((r) => r.klant.id !== id);
      setCursor((c) => Math.min(c, Math.max(0, nieuw.length - 1)));
      return nieuw;
    });
    setGedaan((g) => g + 1);
    setOpen(null);
    setTekst("");
    setVervolg("");
    setVervolgOp("");
    setNaar("");
  };

  const doe = (k: Klant, fn: () => Promise<{ ok: boolean; fout?: string; gesprek?: Gesprek | null }>, tekstOk: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return meld(false, r.fout || "Er ging iets mis.");
      weg(k.id);
      meld(true, tekstOk);
    });

  const nietBereikt = (k: Klant) =>
    doe(k, () => voegGesprekToe(k.id, { soort: "gesprek", tekst: "Niet bereikt", volgende_actie: k.volgende_actie || "Opnieuw bellen", volgende_actie_op: morgen(vandaag) }), `${k.bedrijf}: niet bereikt, morgen opnieuw.`);
  const naarMorgen = (k: Klant) =>
    doe(k, () => wijzigKlant(k.id, { volgende_actie: k.volgende_actie || "Bellen", volgende_actie_op: morgen(vandaag) }), `${k.bedrijf}: morgen.`);
  const klaar = (k: Klant, rij: WerkRij) => {
    if (!rij.redenen.some((r) => r.soort === "te_laat" || r.soort === "vandaag")) {
      weg(k.id);
      return meld(true, `${k.bedrijf} overgeslagen voor vandaag.`);
    }
    doe(k, () => wijzigKlant(k.id, { volgende_actie: null, volgende_actie_op: null }), `${k.bedrijf}: gedaan.`);
  };
  const gesproken = (k: Klant) =>
    doe(
      k,
      () => voegGesprekToe(k.id, { soort: "gesprek", tekst, volgende_actie: vervolg || null, volgende_actie_op: vervolgOp || null, ...(naar ? { status: naar } : {}) }),
      `${k.bedrijf}: vastgelegd.`,
    );
  const overslaan = () => setCursor((c) => (rijen.length ? (c + 1) % rijen.length : 0));

  useEffect(() => {
    const toets = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) {
        if (e.key === "Escape") setOpen(null);
        return;
      }
      if (!huidig || bezig) return;
      const k = e.key.toLowerCase();
      if (k === "arrowdown" || k === "j") { e.preventDefault(); setCursor((c) => Math.min(c + 1, rijen.length - 1)); }
      else if (k === "arrowup" || k === "k") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
      else if (k === "enter" || k === "g") { e.preventDefault(); setOpen(huidig.klant.id); setVervolgOp((v) => v || plusDagen(vandaag, 7)); }
      else if (k === "n") { e.preventDefault(); nietBereikt(huidig.klant); }
      else if (k === "m") { e.preventDefault(); naarMorgen(huidig.klant); }
      else if (k === "d") { e.preventDefault(); klaar(huidig.klant, huidig); }
      else if (k === "s" || k === "escape") { e.preventDefault(); overslaan(); }
    };
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [huidig, rijen.length, bezig, tekst, vervolg, vervolgOp, naar]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/klantenbord" className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-black/50 hover:text-[#312e82]"><LuArrowLeft className="text-[13px]" /> Klantenbord</Link>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Vandaag</h1>
          <p className="text-[14.5px] text-black/50">Wie bel ik nu? Warmste eerst: wat klanten net deden, dan wat te laat is, dan wat vandaag moet. Werk de rij af met het toetsenbord.</p>
        </div>
        <div className="acard flex items-center gap-4 px-5 py-3">
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">Afgehandeld</p>
            <p className="font-heading text-[22px] font-bold leading-none text-[#1c1a4e]">{gedaan} <span className="text-[14px] font-semibold text-black/40">van {totaal}</span></p>
          </div>
          <span className="h-1.5 w-28 overflow-hidden rounded-full bg-black/[0.06]"><span className="block h-full rounded-full bg-[#0a7a4b] transition-all" style={{ width: `${totaal ? (gedaan / totaal) * 100 : 0}%` }} /></span>
        </div>
      </div>

      {!tabel && (
        <div className="acard p-6 text-[14px] text-black/55">Het klantenbord staat nog niet aan: voer eerst de migraties 0040 en 0041 uit in Supabase.</div>
      )}

      {rijen.length === 0 ? (
        <div className="acard flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e3f6ed] text-[26px] text-[#0a7a4b]">{totaal ? <LuCircleCheck /> : <LuSunrise />}</span>
          <p className="text-[17px] font-bold text-[#1c1a4e]">{totaal ? "De rij is leeg. Mooi werk." : "Niets te doen vandaag"}</p>
          <p className="max-w-[460px] text-[13.5px] text-black/50">{totaal ? "Alles van vandaag is afgehandeld. Morgen staat er weer een verse rij klaar." : "Geen signalen uit de modules, niets te laat en niets voor vandaag. Zet op het bord een volgende stap bij wie je wilt spreken."}</p>
          <div className="mt-2 flex gap-2">
            <Link href="/admin/klantenbord" className="abtn-ghost">Naar het bord</Link>
            {totaal > 0 && <button type="button" className="abtn-ghost" onClick={() => router.refresh()}>Opnieuw laden</button>}
          </div>
        </div>
      ) : (
        <ol ref={lijst} className="space-y-3" aria-label="Werkrij">
          {rijen.map((r, i) => {
            const k = r.klant;
            const aan = i === cursor;
            const vorm = open === k.id;
            return (
              <li
                key={k.id}
                data-rij={i}
                onClick={() => setCursor(i)}
                className={`acard p-5 transition ${aan ? "!border-[#312e82] ring-1 ring-[#312e82]" : "opacity-90 hover:opacity-100"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-black/[0.05] px-2 py-px text-[11.5px] font-bold tabular-nums text-black/45">{i + 1}</span>
                      <Link href={`/admin/klantenbord#klant-${k.id}`} className="text-[16px] font-bold text-[#1c1a4e] hover:text-[#312e82]">{k.bedrijf}</Link>
                      <StatusPill status={k.status} klein />
                      {r.redenen.map((x, n) => (
                        <span key={n} className={`apill !py-0.5 text-[11.5px] ${TOON[x.toon]}`} title={x.details || undefined}>{x.tekst}</span>
                      ))}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-black/60">
                      {k.contactpersoon && <span className="inline-flex items-center gap-1"><LuUserRound className="text-[12px] text-black/35" />{k.contactpersoon}</span>}
                      {k.telefoon && (
                        <a href={`tel:${k.telefoon.replace(/\s/g, "")}`} onClick={(e) => { e.stopPropagation(); noteerBel({ id: k.id, bedrijf: k.bedrijf, naam: k.contactpersoon }); }} className="inline-flex items-center gap-1 font-semibold text-[#e75387] hover:underline">
                          <LuPhone className="text-[12px]" />{k.telefoon}
                        </a>
                      )}
                      {k.email && <a href={`mailto:${k.email}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[#e75387] hover:underline"><LuMail className="text-[12px]" />{k.email}</a>}
                      {r.redenen.filter((x) => x.details).map((x, n) => <span key={n} className="text-black/45">{x.details}</span>)}
                    </div>
                    {(k.laatste_contact || k.stand) && (
                      <p className="mt-1.5 truncate text-[13px] text-black/50" title={k.laatste_contact || k.stand || undefined}>
                        {k.laatste_contact_op ? <span className="font-semibold text-black/40">{relatief(k.laatste_contact_op, vandaag)}: </span> : null}{k.laatste_contact || k.stand}
                      </p>
                    )}
                    {r.signaal && (
                      <Link href={r.signaal.href} className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#312e82] hover:underline">
                        Open {r.signaal.soort === "offerte" ? "de offerte" : r.signaal.soort === "brochure" ? "de brochure" : r.signaal.soort === "contract" ? "het contract" : "de onboarding"} <LuExternalLink className="text-[11px]" />
                      </Link>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button type="button" disabled={bezig} onClick={(e) => { e.stopPropagation(); setCursor(i); setOpen(vorm ? null : k.id); setVervolgOp((v) => v || plusDagen(vandaag, 7)); }} className="abtn !px-3 !py-1.5 !text-[13px]"><LuPhone /> Gesproken{kbd("G")}</button>
                    <button type="button" disabled={bezig} onClick={(e) => { e.stopPropagation(); setCursor(i); nietBereikt(k); }} className="abtn-ghost !px-3 !py-1.5 !text-[13px]"><LuPhoneOff /> Niet bereikt{kbd("N")}</button>
                    <button type="button" disabled={bezig} onClick={(e) => { e.stopPropagation(); setCursor(i); naarMorgen(k); }} className="abtn-ghost !px-3 !py-1.5 !text-[13px]">Morgen{kbd("M")}</button>
                    <button type="button" disabled={bezig} onClick={(e) => { e.stopPropagation(); setCursor(i); klaar(k, r); }} className="abtn-ghost !px-3 !py-1.5 !text-[13px]"><LuCheck /> Klaar{kbd("D")}</button>
                  </div>
                </div>

                {vorm && (
                  <form
                    className="mt-4 space-y-3 border-t border-black/[0.06] pt-4"
                    onClick={(e) => e.stopPropagation()}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (tekst.trim() || vervolg || naar) gesproken(k);
                    }}
                  >
                    <textarea
                      className="ainput !py-2 font-sans !text-[14px]"
                      rows={2}
                      value={tekst}
                      onChange={(e) => setTekst(e.target.value)}
                      placeholder="Wat is er afgesproken?"
                      autoFocus
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && tekst.trim()) gesproken(k);
                      }}
                    />
                    <div className="grid gap-2 sm:grid-cols-[1fr_160px_200px_auto]">
                      <input className="ainput !py-2 !text-[14px]" value={vervolg} onChange={(e) => setVervolg(e.target.value)} placeholder="Volgende stap (bijvoorbeeld: offerte maken)" aria-label="Volgende stap" />
                      <input className="ainput !py-2 !text-[14px]" type="date" value={vervolgOp} onChange={(e) => setVervolgOp(e.target.value)} aria-label="Datum van de volgende stap" />
                      <select value={naar} onChange={(e) => setNaar(e.target.value as KlantStatus | "")} className="ainput !py-2 !text-[13.5px]" aria-label="Kaart verplaatsen naar">
                        <option value="">Blijft in {KLANT_STATUS.find((s) => s.key === k.status)?.label.toLowerCase()}</option>
                        {KLANT_STATUS.filter((s) => s.key !== k.status).map((s) => <option key={s.key} value={s.key}>Naar {s.label}</option>)}
                      </select>
                      <button className="abtn !py-2 !text-[13.5px] disabled:opacity-40" disabled={bezig || (!tekst.trim() && !vervolg && !naar)}>Vastleggen <LuChevronRight /></button>
                    </div>
                  </form>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {rijen.length > 0 && (
        <p className="hidden text-[12.5px] text-black/40 sm:block">
          Toetsen: <kbd className="akbd">↓</kbd> <kbd className="akbd">↑</kbd> of <kbd className="akbd">J</kbd> <kbd className="akbd">K</kbd> door de rij · <kbd className="akbd">Enter</kbd> gesproken · <kbd className="akbd">N</kbd> niet bereikt · <kbd className="akbd">M</kbd> morgen · <kbd className="akbd">D</kbd> klaar · <kbd className="akbd">S</kbd> overslaan
        </p>
      )}

      <BelAfloop vandaag={vandaag} onKlant={() => router.refresh()} />

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

function plusDagen(vandaag: string, n: number): string {
  const d = new Date(`${vandaag}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
