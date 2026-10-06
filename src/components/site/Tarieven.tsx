"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  LuAward, LuCheck, LuClock, LuDownload, LuLightbulb, LuMinus, LuPlus,
  LuReceipt, LuShieldCheck, LuSlidersHorizontal, LuX,
} from "react-icons/lu";
import { submitOfferte, type FormState } from "@/app/(site)/actions";
import { kleur } from "@/lib/brand";
import { Arrow } from "./Arrow";
import { Bedankt, Field, fieldClass } from "./FormField";
import TurnstileField from "./TurnstileField";
import { DOCUMENTEN } from "@/lib/documenten";
import { geldigheidsregel, metJaar, type TarievenSettings } from "@/lib/tarieven";

/**
 * Het blok `tarieven`: de abonnementen, een vergelijking, de rekenhulp en de
 * volledige tarievenlijst, met één offerteformulier in een dialoog.
 *
 * Alles komt uit de blokdata, zodat prijzen in het beheer aan te passen zijn.
 * Het formulier opent vanaf elke link naar `#offerte` op de pagina, ook vanuit
 * een ander blok (bv. de call-to-action onderaan).
 */

type Punt = { title: string; text?: string };
type Pakket = {
  sleutel: string;
  label?: string;
  badge?: string;
  naam: string;
  /** Korte naam voor de vergelijkingstabel op de telefoon, bv. "Basis". */
  kort?: string;
  prijs: number | string;
  omschrijving?: string;
  knop?: string;
  inbegrepen?: Punt[];
  voetLabel?: string;
  voetItems?: string[];
};
type Regel = { naam: string; sub?: string; prijs: string };
type Categorie = { titel: string; toelichting?: string; kleur?: string; regels?: Regel[] };
type Rij = { label: string; a: string; b: string };

export type TarievenData = {
  eyebrow?: string;
  heading?: string;
  highlight?: string;
  text?: string;
  medewerkers?: number | string;
  casemanagerTarief?: number | string;
  pakketten?: Pakket[];
  trust?: string[];
  maatwerk?: { heading?: string; text?: string; button?: string };
  vergelijk?: { eyebrow?: string; heading?: string; rows?: Rij[] };
  rekenhulp?: { eyebrow?: string; heading?: string; text?: string };
  lijst?: { eyebrow?: string; heading?: string; geldig?: string; noot?: string; pdf?: string; categorieen?: Categorie[] };
};

const nf = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const euro = (n: number) => `€ ${nf.format(n)}`;
const heel = (n: number) => `€ ${nf0.format(Math.round(n))}`;

const TRUST_ICONS = [LuShieldCheck, LuAward, LuClock, LuReceipt];

function Kop({ asH1, className, children }: { asH1?: boolean; className: string; children: React.ReactNode }) {
  return asH1 ? <h1 className={className}>{children}</h1> : <h2 className={className}>{children}</h2>;
}

/** Kop met één woord of zinsdeel in de accentkleur, zoals elders op de site. */
function MetAccent({ text, highlight }: { text: string; highlight?: string }) {
  if (!highlight || !text.includes(highlight)) return <>{text}</>;
  const [voor, na] = text.split(highlight, 2);
  return <>{voor}<span className="hl">{highlight}</span>{na}</>;
}

function Stepper({ label, value, onMin, onPlus, suffix, breed }: { label: string; value: number; onMin: () => void; onPlus: () => void; suffix?: string; breed?: boolean }) {
  return (
    <div className={`flex items-center gap-1 rounded-full bg-white py-1 pl-4 pr-1 ${breed ? "w-full" : ""}`}>
      <span className={`mr-2 text-[15px] text-body ${breed ? "flex-1" : ""}`}>{label}</span>
      <button type="button" onClick={onMin} aria-label={`${label}: minder`} className="grid size-10 place-items-center rounded-full bg-soft text-primary transition-colors hover:bg-line">
        <LuMinus aria-hidden />
      </button>
      <span aria-live="polite" className="min-w-14 text-center font-heading text-[17px] font-bold text-primary">
        {value}{suffix}
      </span>
      <button type="button" onClick={onPlus} aria-label={`${label}: meer`} className="grid size-10 place-items-center rounded-full bg-soft text-primary transition-colors hover:bg-line">
        <LuPlus aria-hidden />
      </button>
    </div>
  );
}

export default function Tarieven({ d, asH1, tarieven }: { d: TarievenData; asH1?: boolean; tarieven?: TarievenSettings }) {
  const pakketten = (d.pakketten || []).filter((p) => p && p.naam);
  // Het jaartal komt uit de instellingen (Instellingen → Tarievenjaar), niet
  // uit de bloktekst: dan hoef je per 1 januari maar op één plek te zijn.
  const eyebrow = tarieven ? metJaar(d.eyebrow, tarieven.jaar) : d.eyebrow;
  const geldig = tarieven ? geldigheidsregel(tarieven) : d.lijst?.geldig;
  const [perMaand, setPerMaand] = useState(false);
  const [n, setN] = useState(() => Math.max(1, num(d.medewerkers) || 25));
  const [uren, setUren] = useState(40);
  const [tab, setTab] = useState(0);
  const [keuze, setKeuze] = useState<string>(pakketten[0]?.sleutel || "maatwerk");
  const dialog = useRef<HTMLDialogElement>(null);

  const open = (sleutel?: string) => {
    if (sleutel) setKeuze(sleutel);
    dialog.current?.showModal();
  };

  // Elke link naar #offerte op de pagina opent het formulier, ook buiten dit blok.
  useEffect(() => {
    const toon = () => dialog.current?.showModal();
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href$='#offerte']");
      if (!a) return;
      e.preventDefault();
      toon();
    };
    document.addEventListener("click", onClick);
    if (window.location.hash === "#offerte") toon();
    return () => document.removeEventListener("click", onClick);
  }, []);

  const deler = perMaand ? 12 : 1;
  const periode = perMaand ? "per maand" : "per jaar";

  const rate = num(d.casemanagerTarief);
  const compleet = pakketten.find((p) => p.sleutel === "compleet");
  const basis = pakketten.find((p) => p.sleutel === "basis");
  const toonRekenhulp = compleet && basis;

  const categorieen = (d.lijst?.categorieen || []).filter((c) => c && c.titel);
  const actief = categorieen[Math.min(tab, Math.max(0, categorieen.length - 1))];

  return (
    <section data-tone="white" className="pb-16 md:pb-24">
      {/* Kop op het zandvlak; de kaarten schuiven eroverheen. */}
      <div className="relative overflow-hidden bg-soft pb-44 pt-14 md:pb-56 md:pt-20">
        <Stippen />
        <div className="container-site relative flex flex-col items-center text-center">
          {eyebrow && <p className="eyebrow mb-5">{eyebrow}</p>}
          {d.heading && (
            <Kop asH1={asH1} className="max-w-[16ch] text-[2.4rem] font-bold leading-[1.02] tracking-[-0.03em] sm:text-[3.2rem] lg:text-[4rem]">
              <MetAccent text={d.heading} highlight={d.highlight} />
            </Kop>
          )}
          {d.text && <p className="mt-5 max-w-[36rem] text-[18px] leading-relaxed md:text-[19px]">{d.text}</p>}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <div role="group" aria-label="Prijsweergave" className="flex rounded-full bg-white p-1">
              {[false, true].map((m) => (
                <button
                  key={String(m)}
                  type="button"
                  aria-pressed={perMaand === m}
                  onClick={() => setPerMaand(m)}
                  className={`min-h-11 rounded-full px-5 text-[15px] transition-colors ${perMaand === m ? "bg-primary font-semibold text-white" : "text-body hover:text-primary"}`}
                >
                  {m ? "Per maand" : "Per jaar"}
                </button>
              ))}
            </div>
            <Stepper label="Medewerkers" value={n} onMin={() => setN((v) => Math.max(1, v - 5))} onPlus={() => setN((v) => Math.min(5000, v + 5))} />
          </div>
        </div>
      </div>

      <div className="container-site">
        {/* Abonnementen */}
        <div className="relative mx-auto -mt-32 grid max-w-[1000px] gap-5 md:-mt-40 md:grid-cols-2 md:gap-6">
          {pakketten.map((p) => {
            const prijs = num(p.prijs) / deler;
            const [heelDeel, cent] = nf.format(prijs).split(",");
            return (
              <article key={p.sleutel} className="on-dark relative flex flex-col overflow-hidden rounded-3xl bg-primary px-6 pb-7 pt-8 text-white shadow-[0_40px_70px_-46px_rgba(49,46,130,0.8)] sm:px-10 sm:pb-9 sm:pt-11">
                <span aria-hidden className="absolute -right-8 -top-7 size-36 rounded-full bg-white/10" />
                <span aria-hidden className="absolute -right-11 top-28 size-26 rounded-full bg-white/[0.085]" />
                <span aria-hidden className="absolute right-24 top-32 size-16 rounded-full bg-white/[0.06]" />
                <div className="relative flex min-h-8 items-center justify-between gap-3">
                  <span className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-white/60">{p.label || "Aansluiting"}</span>
                  {p.badge && <span className="rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-primary">{p.badge}</span>}
                </div>
                <p className="relative mt-7 flex items-start gap-0.5 font-heading font-bold text-white" aria-label={`${euro(prijs)} per werknemer ${periode}`}>
                  <span aria-hidden className="mt-2 text-[24px]">€</span>
                  <span aria-hidden className="text-[64px] leading-[0.9] tracking-[-0.05em] sm:text-[80px]">{heelDeel}</span>
                  <span aria-hidden className="mt-2 text-[24px]">,{cent}</span>
                </p>
                <p className="relative mt-2.5 text-[15px] text-white/70">per werknemer {periode}</p>
                <h3 className="relative mt-8 text-[24px] font-bold tracking-[-0.02em] sm:text-[26px]">{p.naam}</h3>
                {p.omschrijving && <p className="relative mt-2.5 text-[16px] leading-relaxed text-white/85 md:min-h-[5.2em]">{p.omschrijving}</p>}
                <div className="relative mt-6 flex items-center justify-between gap-4 rounded-xl bg-white/10 px-4 py-3.5 text-[14.5px]">
                  <span className="text-white/80">Totaal voor {n} medewerkers</span>
                  <span className="whitespace-nowrap font-bold">
                    {euro(prijs * n)} <span className="font-medium text-white/70">{periode}</span>
                  </span>
                </div>
                <button type="button" onClick={() => open(p.sleutel)} className="relative mt-3 inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white px-5 text-[16px] font-bold text-primary transition-transform hover:-translate-y-px">
                  {p.knop || `${p.naam} aanvragen`} <Arrow />
                </button>
                {(p.inbegrepen || []).length > 0 && (
                  <div className="relative mt-8">
                    <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-white/60">Inbegrepen</p>
                    <ul className="mt-4 space-y-4">
                      {(p.inbegrepen || []).map((i) => (
                        <li key={i.title} className="flex gap-3">
                          <LuCheck aria-hidden className="mt-1 shrink-0 text-[18px]" />
                          <span className="flex flex-col">
                            <span className="text-[15.5px] font-semibold">{i.title}</span>
                            {i.text && <span className="text-[14px] text-white/70">{i.text}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(p.voetItems || []).length > 0 && (
                  <div className="relative mt-auto pt-7">
                    <div className="border-t border-white/15 pt-5">
                      {p.voetLabel && <p className="text-[13px] text-white/60">{p.voetLabel}</p>}
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {(p.voetItems || []).map((v) => (
                          <li key={v} className="rounded-full border border-white/25 px-3 py-1.5 text-[13px] text-white/90">{v}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {(d.trust || []).length > 0 && (
          <ul className="mx-auto mt-7 flex max-w-[1000px] flex-wrap justify-center gap-x-9 gap-y-3 text-[14px] text-body">
            {(d.trust || []).map((t, i) => {
              const Ic = TRUST_ICONS[i % TRUST_ICONS.length];
              return <li key={t} className="flex items-center gap-2"><Ic aria-hidden className="text-[17px] text-primary" />{t}</li>;
            })}
          </ul>
        )}

        {d.maatwerk?.heading && (
          <div className="mx-auto mt-6 flex max-w-[1000px] flex-col gap-5 rounded-2xl bg-[#e5f5f3] p-6 sm:flex-row sm:items-center sm:p-7">
            <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-white"><LuSlidersHorizontal className="text-[22px]" /></span>
            <div className="flex-1">
              <p className="font-heading text-[17px] font-semibold text-primary">{d.maatwerk.heading}</p>
              {d.maatwerk.text && <p className="mt-1 text-[15px] leading-relaxed">{d.maatwerk.text}</p>}
            </div>
            <button type="button" onClick={() => open("maatwerk")} className="min-h-12 shrink-0 rounded-xl bg-white px-5 text-[15px] font-semibold text-secondary-ink transition-transform hover:-translate-y-px">
              {d.maatwerk.button || "Offerte aanvragen"}
            </button>
          </div>
        )}

        {/* Vergelijken */}
        {(d.vergelijk?.rows || []).length > 0 && compleet && basis && (
          <div className="mx-auto mt-24 max-w-[1000px] md:mt-36">
            <div className="text-center">
              {d.vergelijk?.eyebrow && <p className="eyebrow mb-4">{d.vergelijk.eyebrow}</p>}
              {d.vergelijk?.heading && <h2 className="text-[1.85rem] font-bold leading-[1.08] tracking-[-0.02em] sm:text-[2.2rem] lg:text-[2.75rem]">{d.vergelijk.heading}</h2>}
            </div>
            <div className="mt-9 overflow-hidden rounded-2xl border border-line">
              <table className="w-full table-fixed border-collapse text-left">
                <colgroup><col className="w-[40%] sm:w-[44%]" /><col /><col /></colgroup>
                <thead className="bg-soft">
                  <tr>
                    <th scope="col" className="px-3 py-5 text-[14px] font-semibold text-body sm:px-8">Onderdeel</th>
                    {[compleet, basis].map((p) => (
                      <th key={p.sleutel} scope="col" className="px-2 py-5 text-center sm:px-4">
                        <span className="block font-heading text-[15px] font-bold text-primary sm:text-[17px]"><span className="sm:hidden">{p.kort || p.naam}</span><span className="hidden sm:inline">{p.naam}</span></span>
                        <span className="block text-[13px] font-normal text-body sm:text-[14px]">{euro(num(p.prijs) / deler)} {periode}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(d.vergelijk?.rows || []).map((r) => (
                    <tr key={r.label} className="border-t border-line">
                      <th scope="row" className="px-3 py-4 text-[14px] font-normal leading-snug text-primary sm:px-8 sm:text-[15.5px]">{r.label}</th>
                      {[r.a, r.b].map((v, i) => (
                        <td key={i} className="px-2 py-4 text-center text-[13.5px] sm:px-4 sm:text-[15px]"><Cel v={v} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rekenhulp. Zonder uurtarief vergelijkt hij alleen de vaste kosten. */}
        {toonRekenhulp && (
          <Rekenhulp d={d} n={n} setN={setN} uren={uren} setUren={setUren} rate={rate} compleet={num(compleet!.prijs)} basis={num(basis!.prijs)} />
        )}

        {/* Tarievenlijst */}
        {actief && (
          <div id="tarievenlijst" className="mt-24 scroll-mt-[calc(var(--hh)+1rem)] md:mt-36">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                {d.lijst?.eyebrow && <p className="eyebrow mb-4">{d.lijst.eyebrow}</p>}
                {d.lijst?.heading && <h2 className="text-[1.85rem] font-bold leading-[1.08] tracking-[-0.02em] sm:text-[2.2rem] lg:text-[2.75rem]">{d.lijst.heading}</h2>}
              </div>
              {geldig && <p className="whitespace-pre-line text-[15px] leading-relaxed text-body md:text-right">{geldig}</p>}
            </div>
            <div className="mt-9 flex flex-col gap-4 rounded-3xl bg-soft p-3 sm:p-4 lg:flex-row">
              <div role="tablist" aria-label="Categorieën" className="flex flex-wrap gap-2 p-1 lg:w-80 lg:shrink-0 lg:flex-col lg:gap-1 lg:p-2">
                {categorieen.map((c, i) => {
                  const on = i === tab;
                  return (
                    <button
                      key={c.titel}
                      type="button"
                      role="tab"
                      id={`tab-${i}`}
                      aria-selected={on}
                      aria-controls="tarief-paneel"
                      onClick={() => setTab(i)}
                      className={`flex min-h-11 items-center gap-3 rounded-full px-4 text-[15px] transition-colors lg:min-h-13 lg:rounded-xl lg:text-[16px] ${on ? "bg-white font-semibold text-primary shadow-[0_6px_16px_-10px_rgba(49,46,130,0.45)]" : "text-primary/80 hover:bg-white/60"}`}
                    >
                      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: kleur(c.kleur).vlak }} />
                      <span className="flex-1 text-left">{c.titel}</span>
                      <span className="hidden text-[13px] font-normal text-body lg:inline">{(c.regels || []).length}</span>
                    </button>
                  );
                })}
                {d.lijst?.pdf && (
                  <a href={d.lijst.pdf} className="mt-auto hidden items-center gap-3.5 rounded-2xl bg-white p-4 transition-transform hover:-translate-y-px lg:flex" download>
                    <span aria-hidden className="grid size-10 place-items-center rounded-xl bg-soft text-primary"><LuDownload /></span>
                    <span className="flex flex-col">
                      <span className="text-[15px] font-semibold text-primary">Prijslijst downloaden</span>
                      <span className="text-[13px] text-body">Alle tarieven als pdf</span>
                    </span>
                  </a>
                )}
              </div>
              <div id="tarief-paneel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="flex flex-1 flex-col rounded-2xl bg-white px-5 py-6 sm:px-10 sm:py-9 lg:min-h-[540px]">
                <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4">
                  <h3 className="text-[22px] font-bold tracking-[-0.02em] sm:text-[28px]">{actief.titel}</h3>
                  {actief.toelichting && <span className="text-[14.5px] text-body">{actief.toelichting}</span>}
                </div>
                <ul>
                  {(actief.regels || []).map((r) => (
                    <li key={r.naam} className="flex items-center justify-between gap-6 border-t border-line py-4">
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[15.5px] text-primary sm:text-[16px]">{r.naam}</span>
                        {r.sub && <span className="text-[13.5px] text-body">{r.sub}</span>}
                      </span>
                      <Prijs v={r.prijs} />
                    </li>
                  ))}
                </ul>
                {d.lijst?.noot && <p className="mt-auto border-t border-line pt-5 text-[13.5px] leading-relaxed text-body">{d.lijst.noot}</p>}
              </div>
            </div>
            {d.lijst?.pdf && (
              <a href={d.lijst.pdf} download className="link-arrow mt-5 lg:hidden">Prijslijst downloaden (pdf)</a>
            )}
          </div>
        )}
      </div>

      <OfferteDialog ref={dialog} pakketten={pakketten} keuze={keuze} setKeuze={setKeuze} n={n} />
    </section>
  );
}

/** Een tarief: een bedrag vet, een woord als "per uur" of "op aanvraag" als label. */
function Prijs({ v }: { v: string }) {
  const tekst = String(v || "").trim() || "Op aanvraag";
  const isBedrag = /\d/.test(tekst);
  return isBedrag
    ? <span className="shrink-0 whitespace-nowrap font-heading text-[16px] font-semibold text-primary">{tekst}</span>
    : <span className="shrink-0 whitespace-nowrap rounded-full bg-soft px-3 py-1 text-[14px] text-body">{tekst}</span>;
}

/** Een cel in de vergelijking: "ja" wordt een vinkje, "nee" een streepje. */
function Cel({ v }: { v: string }) {
  const t = String(v || "").trim().toLowerCase();
  if (t === "ja" || t === "✓") return <><LuCheck aria-hidden className="mx-auto text-[20px] text-primary" /><span className="sr-only">Inbegrepen</span></>;
  if (t === "nee" || t === "-" || t === "—") return <><LuMinus aria-hidden className="mx-auto text-[18px] text-body/60" /><span className="sr-only">Niet inbegrepen</span></>;
  return <span className="text-body">{v}</span>;
}

function Rekenhulp({
  d, n, setN, uren, setUren, rate, compleet, basis,
}: {
  d: TarievenData; n: number; setN: React.Dispatch<React.SetStateAction<number>>;
  uren: number; setUren: React.Dispatch<React.SetStateAction<number>>;
  rate: number; compleet: number; basis: number;
}) {
  const kC = compleet * n;
  // Zonder uurtarief rekenen we alleen de vaste kosten; de uren tellen dan
  // niet mee en de uitkomst zegt dat eerlijk.
  const metTarief = rate > 0;
  const kB = basis * n + (metTarief ? uren * rate : 0);
  const max = Math.max(kC, kB, 1);
  const omslag = metTarief ? Math.ceil(((compleet - basis) * n) / rate) : 0;
  const verschil = (compleet - basis) * n;
  const oordeel = !metTarief
    ? `Compleet kost ${heel(verschil)} per jaar meer aan vaste kosten`
    : kC < kB ? "Compleet is voordeliger voor jou" : kC > kB ? "Verrichtingenbasis is voordeliger voor jou" : "Beide kosten even veel";
  const toelichting = metTarief
    ? `Vanaf ${omslag} uur casemanagement per jaar is Compleet voordeliger.`
    : "Daar staat onbeperkt casemanagement tegenover. Bij de Verrichtingenbasis komen de uren casemanagement er nog bij.";
  const balk = (v: number) => ({ width: `${Math.max(3, Math.round((v / max) * 100))}%` });
  return (
    <div className="mx-auto mt-24 grid max-w-[1000px] gap-5 md:mt-32 lg:grid-cols-[400px_1fr] lg:gap-6">
      <div className="flex flex-col gap-7 rounded-3xl bg-soft p-7 sm:p-10">
        <div>
          {d.rekenhulp?.eyebrow && <p className="eyebrow mb-3">{d.rekenhulp.eyebrow}</p>}
          <h2 className="text-[1.85rem] font-bold leading-[1.06] tracking-[-0.02em] sm:text-[2.3rem]">{d.rekenhulp?.heading || "Wat is voordeliger voor jou?"}</h2>
          {d.rekenhulp?.text && <p className="mt-3 text-[15.5px] leading-relaxed">{d.rekenhulp.text}</p>}
        </div>
        <Stepper breed label="Medewerkers" value={n} onMin={() => setN((v) => Math.max(1, v - 5))} onPlus={() => setN((v) => Math.min(5000, v + 5))} />
        <Stepper breed label="Uren per jaar" value={uren} suffix=" uur" onMin={() => setUren((v) => Math.max(0, v - 10))} onPlus={() => setUren((v) => Math.min(5000, v + 10))} />
      </div>
      <div className="flex flex-col gap-7 rounded-3xl border border-line p-7 sm:p-10" aria-live="polite">
        <p className="text-[15px] text-body">Kosten per jaar, exclusief btw</p>
        <div className="space-y-3">
          <p className="flex items-baseline justify-between gap-4"><span className="font-heading text-[17px] font-semibold text-primary">Casemanagement Compleet</span><span className="font-heading text-[24px] font-bold text-primary">{heel(kC)}</span></p>
          <div className="h-3.5 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full bg-primary transition-[width] duration-500" style={balk(kC)} /></div>
          <p className="text-[13.5px] text-body">{euro(compleet)} × {n} medewerkers, casemanagement onbeperkt</p>
        </div>
        <div className="space-y-3">
          <p className="flex items-baseline justify-between gap-4"><span className="font-heading text-[17px] font-semibold text-primary">Verrichtingenbasis</span><span className="font-heading text-[24px] font-bold text-primary">{heel(kB)}{!metTarief && <span className="text-[16px] font-semibold"> + uren</span>}</span></p>
          <div className="h-3.5 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full bg-primary-light transition-[width] duration-500" style={balk(kB)} /></div>
          <p className="text-[13.5px] text-body">{euro(basis)} × {n} medewerkers + {uren} uur × {metTarief ? euro(rate) : "uurtarief casemanager"}</p>
        </div>
        <div className="mt-auto flex items-center gap-4 rounded-2xl bg-soft p-5">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-white"><LuLightbulb className="text-[20px]" /></span>
          <p className="flex flex-col">
            <span className="font-heading text-[16px] font-bold text-primary">{oordeel}</span>
            <span className="text-[14px] text-body">{toelichting}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function OfferteDialog({
  ref, pakketten, keuze, setKeuze, n,
}: {
  ref: React.Ref<HTMLDialogElement>; pakketten: Pakket[]; keuze: string; setKeuze: (s: string) => void; n: number;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitOfferte, null);
  const opties = [...pakketten.map((p) => ({ sleutel: p.sleutel, naam: p.naam })), { sleutel: "maatwerk", naam: "Maatwerk" }];
  const sluit = (e: React.MouseEvent) => (e.currentTarget.closest("dialog") as HTMLDialogElement | null)?.close();
  return (
    <dialog
      ref={ref}
      aria-labelledby="offerte-titel"
      onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}
      className="m-auto w-[min(600px,calc(100vw-1.5rem))] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-3xl bg-white p-0 text-body backdrop:bg-[rgba(25,23,38,0.55)]"
    >
      <div className="relative p-6 sm:p-10">
        <button type="button" onClick={sluit} aria-label="Sluiten" className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-soft text-primary hover:bg-line">
          <LuX aria-hidden className="text-[18px]" />
        </button>
        <h2 id="offerte-titel" className="pr-12 text-[26px] font-bold tracking-[-0.02em] sm:text-[30px]">Offerte aanvragen</h2>
        {state?.ok ? (
          <div className="mt-6"><Bedankt>Bedankt! We hebben je aanvraag ontvangen en nemen binnen twee werkdagen contact met je op.</Bedankt></div>
        ) : (
          <form action={action} className="mt-2 space-y-4">
            <p className="text-[15.5px]">Je hoort binnen twee werkdagen van ons.</p>
            <fieldset>
              <legend className="mb-2 text-[14.5px] font-semibold text-primary">Aansluiting</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {opties.map((o) => (
                  <label key={o.sleutel} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-3 text-center text-[15px] transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 ${keuze === o.sleutel ? "border-primary bg-primary font-semibold text-white" : "border-line text-primary hover:border-primary/50"}`}>
                    <input type="radio" name="pakket" value={o.naam} checked={keuze === o.sleutel} onChange={() => setKeuze(o.sleutel)} className="sr-only" />
                    {o.naam}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Naam"><input className={fieldClass} name="name" autoComplete="name" required maxLength={200} /></Field>
              <Field label="Bedrijfsnaam"><input className={fieldClass} name="company" autoComplete="organization" required maxLength={200} /></Field>
              <Field label="E-mailadres"><input className={fieldClass} name="email" type="email" autoComplete="email" required maxLength={200} /></Field>
              <Field label="Telefoonnummer"><input className={fieldClass} name="phone" type="tel" autoComplete="tel" required maxLength={40} /></Field>
            </div>
            <Field label="Aantal medewerkers">
              <input key={n} className={fieldClass} name="employees" type="number" inputMode="numeric" min={1} max={100000} defaultValue={n} required />
            </Field>
            <Field label="Opmerking" optional>
              <textarea className={fieldClass} name="message" rows={3} maxLength={4000} />
            </Field>
            <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <TurnstileField resetKey={state?.error} />
            {state?.error && <p role="alert" className="text-[15px] font-medium text-accent">{state.error}</p>}
            <button className="btn w-full" disabled={pending}>
              {pending ? "Versturen…" : <>Offerte aanvragen <Arrow /></>}
            </button>
            <p className="text-[13.5px]">
              Lees in onze <a href={DOCUMENTEN.privacyverklaring} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-accent">privacyverklaring</a> wat we met je gegevens doen.
            </p>
          </form>
        )}
      </div>
    </dialog>
  );
}

/** Een paar stippen uit het logo in de hoeken van de kop. */
function Stippen() {
  const s: [string, string][] = [
    ["left-[7%] top-[18%]", "#00a098"], ["left-[9.5%] top-[24%]", "#00a098"], ["left-[6.5%] top-[30%]", "#39a5dd"],
    ["left-[9%] top-[36%]", "#39a5dd"], ["left-[12.5%] top-[20%]", "#312e82"],
    ["right-[10%] top-[48%]", "#f19000"], ["right-[7.5%] top-[53%]", "#e51673"], ["right-[10.5%] top-[58%]", "#e51673"], ["right-[8%] top-[63%]", "#ca152a"],
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
      {s.map(([pos, c]) => <span key={pos} className={`absolute size-3.5 rounded-full ${pos}`} style={{ background: c }} />)}
    </div>
  );
}
