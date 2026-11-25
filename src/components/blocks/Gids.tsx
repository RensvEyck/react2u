import Link from "next/link";
import { outfit } from "./HomeVerhaal";
import { NAVY, BODY, MUTE, LINE, SOFT, LAV, kop, BREED, Eyebrow, Kruimels, Vink, Pijl, Strook } from "./Gedeeld";
import { MiniMarkdown } from "@/lib/md";
import { inkt } from "@/lib/kleur";
import { DIENST_KLEUR, DIENST_TINT, GIDSEN, bijgewerktOp, gidsAnker, gidsVoor, type Gids } from "@/lib/gidsen";
import { auteurVoorNaam } from "@/lib/auteurs";
import { LuExternalLink } from "react-icons/lu";
import { DIENSTEN } from "@/lib/organisatie";

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * De gidsen (HALO-herstelplan, punt 4): één vraag van een werkgever, volledig
 * beantwoord. Elke gids heeft dezelfde opbouw, in deze volgorde:
 *
 *   gidsKop      de vraag als H1, twee zinnen direct antwoord, de auteur met
 *                naam en functie, en "In deze gids" (de inhoudsopgave komt uit
 *                de koppen van de blokken erna; BlockRenderer geeft die mee)
 *   gidsTekst    een hoofdstuk: kop, mini-markdown, eventueel een kader
 *   gidsTijdlijn het stappenplan of de tijdlijn (week 1, 6, 8, 42, 52, 88, 91)
 *   gidsTabel    de tabel met termijnen of kosten
 *   gidsVragen   vijf tot acht veelgestelde vragen (FAQPage, via BlockRenderer)
 *   gidsHelpt    "Zo helpt React2u": de dienst en kennismaken
 *
 * Daarnaast `gidsenKaarten`: de kaarten naar de gidsen, op de homepage,
 * /diensten en de blog. Kleur en tint komen uit de data (de labelkleur van de
 * dienst waar de gids bij hoort), net als bij een dienstpagina. Koppen in
 * Outfit via `.hv-kop`, tekst in DM Sans.
 */

type Ctx = {
  /** Het pad van de pagina, voor de structured data van de kop. */
  pad?: string;
  /** De inhoudsopgave en de leestijd van de gids, uit alle blokken van de pagina (BlockRenderer). */
  gids?: GidsCtx;
  /** De datum van de laatste wijziging van de pagina in de database (JJJJ-MM-DD); null voor een concept. */
  bijgewerkt?: string | null;
};

export type GidsCtx = { inhoud: { label: string; id: string }[]; leestijd: number };

type Props = { d: any; asH1?: boolean; ctx?: Ctx };

function datumNl(iso: string | null | undefined): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

/** "Cindy Faro" → "CF", "Team React2u" → "TR". */
function initialen(naam: string): string {
  return naam
    .split(/\s+/)
    .filter((w) => /^[A-Za-zÀ-ÿ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/** Hoofdstukkop van een gids, met anker: "/re-integratie#eerste-spoor". */
function Hoofdstuk({ titel, size = "md" }: { titel: string; size?: "md" | "lg" }) {
  const maat = size === "lg" ? "text-[32px] md:text-[42px] tracking-[-0.9px]" : "text-[28px] md:text-[34px] tracking-[-0.7px]";
  return <h2 id={gidsAnker(titel)} className={`${kop} m-0 scroll-mt-28 leading-[1.12] ${maat}`} style={{ color: NAVY }}>{titel}</h2>;
}

/* ---------- 1. De kop: vraag, antwoord, auteur, inhoudsopgave ---------- */

export function GidsKop({ d, asH1, ctx }: Props) {
  const H = asH1 ? "h1" : "h2";
  const c: string = d.kleur || NAVY;
  const t: string = d.tint || SOFT;
  const tc = inkt(c);
  const auteur = d.auteur || {};
  // De auteurspagina (lib/auteurs.ts) bij de naam in de kop; zonder pagina alleen de naam.
  const auteurPagina = auteurVoorNaam(auteur.naam);
  const controle = d.controle || {};
  const inhoud = ctx?.gids?.inhoud ?? [];
  const leestijd = ctx?.gids?.leestijd;
  const bijgewerkt = datumNl(bijgewerktOp(d.bijgewerkt, ctx?.bijgewerkt));
  const gecontroleerd = datumNl(controle.datum);
  return (
    <div className={`hv ${outfit.variable} bg-white`} style={{ color: NAVY }}>
      <section aria-label={d.eyebrow || "Gids"} className="px-[6px] pt-4 md:px-10 md:pt-8 xl:mx-auto xl:max-w-[1280px]">
        <div className="relative grid gap-8 overflow-hidden rounded-[28px] px-6 py-10 md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16 lg:p-16" style={{ background: t }}>
          <span aria-hidden className="absolute right-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full md:h-[520px] md:w-[520px]" style={{ background: c, opacity: 0.12 }} />
          <div className="relative flex flex-col gap-5 md:gap-6">
            {/* Dezelfde reeks als de BreadcrumbList uit crumbsVoor() in lib/nav.ts: Werkgevers › Kennis › gids. */}
            <Kruimels items={[{ label: "Home", href: "/" }, { label: "Werkgevers", href: "/werkgevers" }, { label: "Kennis", href: "/kennis" }, { label: d.kruimel || d.heading }]} />
            {d.eyebrow && (
              <span className="inline-flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: tc }}>
                <span className="h-2 w-2 rounded-full" style={{ background: c }} />{d.eyebrow}
              </span>
            )}
            {/* De vraag is de H1: zo ziet Google precies waar de pagina over gaat. */}
            {/* "preventiemedewerker" vult op 390px precies de breedte: afbreken als een woord echt niet past. */}
            <H lang="nl" className={`${kop} m-0 max-w-[820px] text-[36px] leading-[1.04] tracking-[-1.2px] hyphens-auto [overflow-wrap:anywhere] md:text-[52px] md:tracking-[-1.6px]`} style={{ color: NAVY }}>{d.heading}</H>
            {/* Het directe antwoord, meteen onder de vraag: het stukje dat Google en een AI-zoekmachine citeren. */}
            {d.antwoord && <p className="m-0 max-w-[760px] text-[19px] font-semibold leading-[1.55] md:text-[22px]" style={{ color: NAVY }}>{d.antwoord}</p>}
            {d.text && <p className="m-0 max-w-[720px] text-[16px] leading-[1.7] md:text-[17px]" style={{ color: BODY }}>{d.text}</p>}
            {(auteur.naam || bijgewerkt) && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t pt-5" style={{ borderColor: "rgba(50,46,131,0.12)" }}>
                {auteur.naam && (
                  <span className="flex items-center gap-3">
                    <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[14px] font-bold text-white" style={{ background: c }}>{initialen(auteur.naam)}</span>
                    <span className="flex flex-col leading-tight">
                      {auteurPagina
                        ? <Link href={`/auteur/${auteurPagina.slug}`} className="text-[15px] font-bold underline-offset-[3px] hover:underline" style={{ color: NAVY }} rel="author">{auteur.naam}</Link>
                        : <span className="text-[15px] font-bold" style={{ color: NAVY }}>{auteur.naam}</span>}
                      {auteur.functie && <span className="text-[13.5px]" style={{ color: MUTE }}>{auteur.functie}</span>}
                    </span>
                  </span>
                )}
                <span className="flex flex-wrap gap-x-4 gap-y-1 text-[13.5px]" style={{ color: MUTE }}>
                  {controle.naam && (
                    <span>Gecontroleerd door <span className="font-semibold" style={{ color: NAVY }}>{controle.naam}</span>{controle.functie ? `, ${controle.functie}` : ""}{gecontroleerd ? ` op ${gecontroleerd}` : ""}</span>
                  )}
                  {bijgewerkt && <span>Bijgewerkt op {bijgewerkt}</span>}
                  {leestijd ? <span>{leestijd} minuten lezen</span> : null}
                </span>
              </div>
            )}
          </div>
          {inhoud.length > 1 && (
            <nav aria-label="In deze gids" className="relative flex flex-col gap-3 self-start rounded-[24px] p-6 md:p-7 lg:sticky lg:top-[calc(var(--hh,96px)+24px)]" style={{ background: "rgba(255,255,255,0.72)" }}>
              <span className="text-[13px] font-bold uppercase tracking-[1.4px]" style={{ color: MUTE }}>In deze gids</span>
              <ol className="m-0 flex list-none flex-col p-0">
                {inhoud.map((h, i) => (
                  <li key={h.id} className="border-t first:border-t-0" style={{ borderColor: "rgba(50,46,131,0.1)" }}>
                    <a href={`#${h.id}`} className="flex min-h-[44px] items-center gap-3 py-2 text-[15px] font-semibold leading-[1.35]" style={{ color: NAVY }}>
                      <span className="w-5 shrink-0 text-[12.5px] font-bold" style={{ color: tc }}>{String(i + 1).padStart(2, "0")}</span>{h.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------- 2. Een hoofdstuk: kop, tekst, eventueel een kader ---------- */

export function GidsTekst({ d }: Props) {
  const c: string = d.kleur || NAVY;
  const t: string = d.tint || SOFT;
  const kader = d.kader;
  return (
    <section aria-label={d.heading} className={`hv ${outfit.variable} bg-white`}>
      <div className={`${BREED} grid gap-8 py-12 md:py-16 lg:grid-cols-12 lg:gap-6`}>
        <div className={`flex flex-col gap-5 ${kader ? "lg:col-span-7" : "lg:col-span-8"}`}>
          <Hoofdstuk titel={d.heading} />
          {d.lead && <p className="m-0 text-[18px] font-semibold leading-[1.55] md:text-[19px]" style={{ color: NAVY }}>{d.lead}</p>}
          <MiniMarkdown text={d.tekst || ""} className="gids-tekst text-[17px] leading-[1.75]" />
        </div>
        {kader && (
          <aside aria-label={kader.titel} className="flex h-fit flex-col gap-3 rounded-[24px] p-6 md:p-7 lg:col-span-4 lg:col-start-9 lg:sticky lg:top-[calc(var(--hh,96px)+24px)]" style={{ background: t }}>
            <span className="inline-flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[1.4px]" style={{ color: inkt(c) }}>
              <span className="h-2 w-2 rounded-full" style={{ background: c }} />{kader.eyebrow || "Goed om te weten"}
            </span>
            <span className={`${kop} text-[21px] leading-[1.25]`} style={{ color: NAVY }}>{kader.titel}</span>
            <MiniMarkdown text={kader.tekst || ""} className="text-[15.5px] leading-[1.65]" />
            {kader.href && (
              <Link href={kader.href} className="mt-1 inline-flex items-center gap-2 text-[15px] font-bold" style={{ color: NAVY }}>{kader.label || "Lees meer"}<Pijl size={14} /></Link>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}

/* ---------- 3. De tijdlijn of het stappenplan ---------- */

export function GidsTijdlijn({ d }: Props) {
  const c: string = d.kleur || NAVY;
  const t: string = d.tint || SOFT;
  const tc = inkt(c);
  const items: any[] = d.items || [];
  return (
    <section aria-label={d.heading} className={`hv ${outfit.variable}`} style={{ background: SOFT }}>
      <div className={`${BREED} flex flex-col gap-8 py-14 md:gap-12 md:py-[96px]`}>
        <div className="grid gap-4 lg:grid-cols-12 lg:items-end lg:gap-6">
          <div className="flex flex-col gap-4 lg:col-span-7">
            {d.eyebrow && <Eyebrow kleur={tc}>{d.eyebrow}</Eyebrow>}
            <Hoofdstuk titel={d.heading} size="lg" />
          </div>
          {d.text && <p className="m-0 text-[16px] leading-[1.7] md:text-[17px] lg:col-span-4 lg:col-start-9" style={{ color: BODY }}>{d.text}</p>}
        </div>
        <ol className="m-0 flex list-none flex-col p-0">
          {items.map((s, i) => {
            const laatste = i === items.length - 1;
            return (
              <li key={i} className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-4 md:grid-cols-[150px_56px_minmax(0,1fr)] md:gap-x-6">
                {/* Breed: het moment links van de lijn; op de telefoon boven de titel. */}
                <span className="hidden pt-5 md:block">
                  <span className="inline-block rounded-full px-3 py-1.5 text-[13.5px] font-bold" style={{ background: t, color: tc }}>{s.wanneer}</span>
                </span>
                <span className="flex flex-col items-center">
                  <span className="mt-5 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[15px] font-bold" style={{ color: tc, boxShadow: `0 0 0 2px ${c}` }}>{i + 1}</span>
                  {!laatste && <span aria-hidden className="w-px grow" style={{ background: "rgba(50,46,131,0.14)" }} />}
                </span>
                <div className={`flex flex-col gap-2 pt-4 ${laatste ? "pb-0" : "pb-9 md:pb-10"}`}>
                  <span className="self-start rounded-full px-2.5 py-1 text-[12.5px] font-bold md:hidden" style={{ background: t, color: tc }}>{s.wanneer}</span>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <h3 className={`${kop} m-0 text-[21px] leading-[1.2] md:text-[23px]`} style={{ color: NAVY }}>{s.titel}</h3>
                    {s.wie && <span className="rounded-full border bg-white px-2.5 py-0.5 text-[12.5px] font-bold" style={{ borderColor: LINE, color: MUTE }}>{s.wie}</span>}
                  </div>
                  <MiniMarkdown text={s.tekst || ""} className="max-w-[640px] text-[16px] leading-[1.7]" />
                </div>
              </li>
            );
          })}
        </ol>
        {d.noot && (
          <p className="m-0 max-w-[760px] border-t pt-5 text-[15px] leading-[1.65]" style={{ borderColor: LINE, color: MUTE }}>{d.noot}</p>
        )}
      </div>
    </section>
  );
}

/* ---------- 4. De tabel met termijnen of kosten ---------- */

export function GidsTabel({ d }: Props) {
  const kolommen: string[] = d.kolommen || [];
  const rijen: string[][] = d.rijen || [];
  return (
    <section aria-label={d.heading} className={`hv ${outfit.variable} bg-white`}>
      <div className={`${BREED} flex flex-col gap-8 py-14 md:gap-10 md:py-[96px]`}>
        <div className="grid gap-4 lg:grid-cols-12 lg:items-end lg:gap-6">
          <div className="flex flex-col gap-4 lg:col-span-7">
            {d.eyebrow && <Eyebrow kleur={inkt(d.kleur || NAVY)}>{d.eyebrow}</Eyebrow>}
            <Hoofdstuk titel={d.heading} size="lg" />
          </div>
          {d.text && <p className="m-0 text-[16px] leading-[1.7] md:text-[17px] lg:col-span-4 lg:col-start-9" style={{ color: BODY }}>{d.text}</p>}
        </div>
        {/* Eén echte tabel voor Google en schermlezers. Op de telefoon stapelt elke
            rij tot een kaart, met de kolomkop (data-kolom) boven elke cel. */}
        <div className="overflow-hidden rounded-[24px] border" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-left max-md:block">
            {d.onderschrift && <caption className="sr-only">{d.onderschrift}</caption>}
            <thead className="max-md:hidden">
              <tr style={{ background: NAVY }}>
                {kolommen.map((k, i) => (
                  <th key={i} scope="col" className="px-6 py-4 text-[12.5px] font-bold uppercase tracking-[1.2px] md:px-8" style={{ color: "rgba(255,255,255,0.85)" }}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody className="max-md:block">
              {rijen.map((r, i) => (
                <tr key={i} className="border-t max-md:block max-md:px-5 max-md:py-4 md:align-top" style={{ borderColor: LINE, background: i % 2 ? SOFT : "#ffffff" }}>
                  {r.map((cel, j) => (
                    <td key={j} data-kolom={kolommen[j] || ""}
                      className={`text-[15.5px] leading-[1.6] max-md:block max-md:py-1 max-md:before:mb-0.5 max-md:before:block max-md:before:text-[12px] max-md:before:font-bold max-md:before:uppercase max-md:before:tracking-[1px] max-md:before:text-[#67657F] max-md:before:content-[attr(data-kolom)] md:px-6 md:py-4 lg:px-8 ${j === 0 ? "font-bold" : ""}`}
                      style={{ color: j === 0 ? NAVY : BODY }}>
                      {cel}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {d.noot && <p className="m-0 max-w-[760px] text-[15px] leading-[1.65]" style={{ color: MUTE }}>{d.noot}</p>}
      </div>
    </section>
  );
}

/* ---------- 5. Veelgestelde vragen ---------- */

export function GidsVragen({ d }: Props) {
  const items: any[] = d.items || [];
  return (
    <section aria-label={d.heading} className={`hv ${outfit.variable}`} style={{ background: SOFT }}>
      <div className={`${BREED} grid gap-10 py-14 md:py-[96px] lg:grid-cols-12 lg:gap-6`}>
        <div className="flex flex-col gap-4 lg:col-span-4">
          {d.eyebrow && <Eyebrow kleur={inkt(d.kleur || NAVY)}>{d.eyebrow}</Eyebrow>}
          <Hoofdstuk titel={d.heading} size="lg" />
          {d.text && <p className="m-0 text-[16px] leading-[1.65]" style={{ color: BODY }}>{d.text}</p>}
        </div>
        <div className="flex flex-col border-t lg:col-span-7 lg:col-start-6" style={{ borderColor: LINE }}>
          {items.map((q, i) => (
            <details key={i} className="group border-b" style={{ borderColor: LINE }} open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-[16.5px] font-bold md:text-[17px]" style={{ color: NAVY }}>
                {q.question}
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-white transition-colors group-open:border-[#322E83] group-open:bg-[#322E83] group-open:text-white" style={{ borderColor: LINE }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                    <path d="M5 12h14" /><path d="M12 5v14" className="group-open:hidden" />
                  </svg>
                </span>
              </summary>
              <MiniMarkdown text={q.answer || ""} className="-mt-1.5 max-w-[640px] pb-5 text-[15.5px] leading-[1.7]" />
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 5b. Bronnen ---------- */

/**
 * De bronnen onder een gids: de wet, UWV, de Arbeidsinspectie. Een lezer (en
 * een zoekmachine) ziet zo waar de termijnen en bedragen vandaan komen; de
 * structured data neemt ze op als `citation`.
 */
export function GidsBronnen({ d }: Props) {
  const items: any[] = d.items || [];
  if (!items.length) return null;
  return (
    <section aria-label={d.heading || "Bronnen"} className={`hv ${outfit.variable} bg-white`}>
      <div className={`${BREED} grid gap-6 border-t py-10 md:py-14 lg:grid-cols-12 lg:gap-6`} style={{ borderColor: LINE }}>
        <div className="flex flex-col gap-2 lg:col-span-4">
          <Hoofdstuk titel={d.heading || "Bronnen"} />
          <p className="m-0 text-[15px] leading-[1.6]" style={{ color: BODY }}>{d.text || "Waar de termijnen, bedragen en regels in deze gids op gebaseerd zijn."}</p>
        </div>
        <ul className="m-0 flex list-none flex-col divide-y p-0 lg:col-span-7 lg:col-start-6" style={{ borderColor: LINE }}>
          {items.map((b, i) => (
            <li key={i} className="flex items-start gap-3 py-3" style={{ borderColor: LINE }}>
              <LuExternalLink aria-hidden className="mt-1 shrink-0 text-[16px]" style={{ color: MUTE }} />
              <span className="flex flex-col gap-0.5">
                <a href={b.href} rel="noopener" className="text-[16px] font-bold leading-[1.35] underline-offset-[3px] hover:underline" style={{ color: NAVY }}>{b.titel}</a>
                {b.uitgever && <span className="text-[13.5px]" style={{ color: MUTE }}>{b.uitgever}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- 6. Zo helpt React2u ---------- */

export function GidsHelpt({ d }: Props) {
  const dienst = d.dienst || {};
  const c: string = d.kleur || dienst.kleur || NAVY;
  const t: string = d.tint || SOFT;
  const tc = inkt(c);
  const punten: string[] = d.punten || [];
  const verwant: any[] = d.verwant || [];
  return (
    <section aria-label={d.heading} className={`hv ${outfit.variable} bg-white px-[6px] pt-6 md:px-10 md:pt-10 xl:mx-auto xl:max-w-[1280px]`}>
      <div className="relative grid gap-8 overflow-hidden rounded-[28px] px-6 py-10 md:gap-12 md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-16 lg:p-16" style={{ background: t }}>
        <span aria-hidden className="absolute bottom-[-200px] left-[-140px] h-[460px] w-[460px] rounded-full" style={{ background: c, opacity: 0.1 }} />
        <div className="relative flex flex-col gap-5">
          <span className="inline-flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: tc }}>
            <span className="h-2 w-2 rounded-full" style={{ background: c }} />{d.eyebrow || "Zo helpt React2u"}
          </span>
          <Hoofdstuk titel={d.heading} size="lg" />
          {d.tekst && <MiniMarkdown text={d.tekst} className="max-w-[640px] text-[17px] leading-[1.75]" />}
          {punten.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-3 p-0 pt-1">
              {punten.map((p, i) => (
                <li key={i} className="flex items-start gap-3 text-[16px] leading-[1.5] md:text-[17px]" style={{ color: NAVY }}>
                  <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full text-white" style={{ background: c }}><Vink size={11} /></span>{p}
                </li>
              ))}
            </ul>
          )}
          {verwant.length > 0 && (
            <div className="flex flex-col gap-3 border-t pt-6" style={{ borderColor: "rgba(50,46,131,0.12)" }}>
              <span className="text-[13px] font-bold uppercase tracking-[1.4px]" style={{ color: MUTE }}>Lees ook</span>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {verwant.map((v, i) => (
                  <li key={i}>
                    <Link href={v.href} className="hv-btn hv-btn-rand inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-[14.5px] font-bold">{v.label}<Pijl size={14} /></Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="relative flex flex-col gap-5 rounded-[24px] bg-white p-7 md:p-8">
          {dienst.naam && (
            <span className={`${kop} flex flex-col text-[19px] leading-[1.1]`} style={{ color: NAVY }}>
              React2u<span className="text-[34px] tracking-[-0.8px]" style={{ color: tc }}>{dienst.naam}<sup className="text-[14px]" style={{ color: NAVY }}>®</sup></span>
            </span>
          )}
          {dienst.wat && <span className="text-[16px] font-bold leading-[1.4]" style={{ color: NAVY }}>{dienst.wat}</span>}
          {dienst.tekst && <p className="m-0 text-[15.5px] leading-[1.65]" style={{ color: BODY }}>{dienst.tekst}</p>}
          <div className="flex flex-col gap-2.5 pt-1">
            {dienst.href && (
              <Link href={dienst.href} className="hv-btn hv-btn-roze inline-flex h-[54px] items-center justify-center gap-2.5 rounded-full px-6 text-[15px] font-bold">{dienst.label || `Meer over React2u ${dienst.naam}`}<Pijl /></Link>
            )}
            <Link href={d.kennismaken?.href || "/kennismaken"} className="hv-btn hv-btn-rand inline-flex h-[54px] items-center justify-center gap-2.5 rounded-full px-6 text-[15px] font-bold">{d.kennismaken?.label || "Kennismaken"}<Pijl /></Link>
          </div>
          {d.belTekst && <p className="m-0 text-center text-[14px] leading-[1.5]" style={{ color: MUTE }}>{d.belTekst}</p>}
        </div>
      </div>
    </section>
  );
}

/* ---------- De kaarten naar de gidsen ---------- */

/** Eén kaart naar een gids: label-chip, de vraag, één zin en "Lees de gids". */
export function GidsKaart({ gids, compact = false }: { gids: Gids; compact?: boolean }) {
  const c = DIENST_KLEUR[gids.dienst];
  const t = DIENST_TINT[gids.dienst];
  // De naam van de dienst zoals overal op de site (lib/organisatie.ts, één bron).
  const label = DIENSTEN[gids.dienst];
  return (
    <Link href={`/${gids.slug}`} className={`hv-btn relative flex flex-col gap-3 overflow-hidden rounded-[24px] ${compact ? "p-5 sm:p-6" : "px-5 pb-6 pt-6 sm:px-6 sm:pb-7 sm:pt-7"}`} style={{ background: t, color: NAVY }}>
      <span aria-hidden className="absolute right-[-40px] top-[-40px] h-[120px] w-[120px] rounded-full" style={{ background: c, opacity: 0.16 }} />
      <span className="relative flex items-center gap-2.5 text-[13px] font-bold" style={{ color: inkt(c) }}>
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c }} />Gids · {gids.naam}
      </span>
      {/* Vijf kaarten op een rij (1400px) zijn smal: lange woorden als "preventiemedewerker" afbreken in plaats van uit de kaart laten lopen. */}
      <span lang="nl" className={`${kop} relative ${compact ? "text-[19px]" : "text-[21px] md:text-[22px] min-[87.5rem]:text-[20px]"} leading-[1.22] tracking-[-0.3px] hyphens-auto [overflow-wrap:anywhere]`}>{gids.vraag}</span>
      {!compact && <span className="relative text-[15px] leading-[1.55]" style={{ color: BODY }}>{gids.kort}</span>}
      <span className="relative mt-auto flex items-center justify-between gap-3 pt-2 text-[14.5px] font-bold">
        <span>Lees de gids</span>
        <span className="flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: MUTE }}>React2u {label.naam}<Pijl size={14} /></span>
      </span>
    </Link>
  );
}

/**
 * Het blok met de kaarten naar de gidsen, op de homepage en /diensten. Zonder
 * `slugs` de eerste vijf uit lib/gidsen.ts; op de telefoon een strook om te
 * swipen, breed drie en twee of vijf op een rij.
 */
export function GidsenKaarten({ d }: Props) {
  // Zonder `slugs` de eerste vijf (de reeks uit het HALO-herstelplan); dertien kaarten is een muur.
  const slugs: string[] | undefined = Array.isArray(d.slugs) && d.slugs.length ? d.slugs : undefined;
  const lijst = slugs ? slugs.map((s) => gidsVoor(s)).filter((g): g is Gids => Boolean(g)) : GIDSEN.slice(0, 5);
  if (!lijst.length) return null;
  return (
    <section aria-label={d.heading || "Gidsen"} className={`hv ${outfit.variable}`} style={{ background: d.bg || "#ffffff" }}>
      <div className={`${BREED} flex flex-col gap-8 py-14 md:gap-10 md:py-[104px]`}>
        <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-6">
          <div className="flex flex-col gap-4 lg:col-span-7">
            {d.eyebrow && <Eyebrow>{d.eyebrow}</Eyebrow>}
            <h2 className={`${kop} m-0 whitespace-pre-line leading-[1.1] tracking-[-0.9px]`} style={{ color: NAVY, fontSize: "clamp(32px, 4vw, 44px)" }}>{d.heading || "Verzuim, helder uitgelegd"}</h2>
          </div>
          {d.text && <p className="m-0 text-[16px] leading-[1.7] md:text-[17px] lg:col-span-4 lg:col-start-9" style={{ color: BODY }}>{d.text}</p>}
        </div>
        <GidsenRij lijst={lijst} label={d.heading || "Gidsen"} />
        {d.link?.href && (
          <Link href={d.link.href} className="inline-flex items-center gap-2 self-start text-[16px] font-bold underline underline-offset-[5px]" style={{ color: NAVY, textDecorationColor: "rgba(50,46,131,0.35)" }}>
            {d.link.label}<Pijl />
          </Link>
        )}
      </div>
    </section>
  );
}

/** De rij kaarten, ook los te gebruiken (de blog). Vijf kaarten: drie en twee op een laptop, vijf op een breed scherm. */
export function GidsenRij({ lijst, label }: { lijst: Gids[]; label: string }) {
  const n = lijst.length;
  const raster = n === 5 ? "lg:grid-cols-6 min-[87.5rem]:grid-cols-5" : n === 4 ? "lg:grid-cols-4" : n === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3";
  return (
    <Strook n={n} label={label} className={`grid gap-4 sm:grid-cols-2 ${raster}`}>
      {lijst.map((g, i) => (
        <div key={g.slug} className={`flex ${n === 5 ? `min-[87.5rem]:col-span-1 ${i < 3 ? "lg:col-span-2" : "lg:col-span-3"}` : ""}`}>
          <GidsKaart gids={g} />
        </div>
      ))}
    </Strook>
  );
}

/** De strook "Verdieping" onderaan een dienstpagina: de gidsen bij dat label (DienstLabel, `gidsen` in de data). */
export function GidsenStrook({ slugs, kleur }: { slugs: string[]; kleur?: string }) {
  // Hooguit vier kaarten; de rest staat op het onderwerp in de kennisbank.
  const lijst = slugs.map((s) => gidsVoor(s)).filter((g): g is Gids => Boolean(g)).slice(0, 4);
  if (!lijst.length) return null;
  const onderwerp = lijst[0].onderwerp;
  return (
    <section aria-label="Verdieping" className="flex flex-col gap-6 px-5 pt-14 md:px-10 md:pt-[104px] xl:mx-auto xl:max-w-[1200px] xl:px-0">
      <div className="flex flex-col gap-3">
        <Eyebrow kleur={inkt(kleur || NAVY)}>Verdieping</Eyebrow>
        <h2 className={`${kop} m-0 text-[28px] leading-[1.15] tracking-[-0.6px] md:text-[34px]`} style={{ color: NAVY }}>Lees de gids, dan weet je waar je aan toe bent</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {lijst.map((g) => <GidsKaart key={g.slug} gids={g} compact />)}
        {lijst.length % 2 === 1 && (
          <div className="flex flex-col justify-center gap-2 rounded-[24px] p-6" style={{ background: LAV }}>
            <span className={`${kop} text-[19px] leading-[1.25]`} style={{ color: NAVY }}>Meer uitleg in de kennisbank</span>
            <span className="text-[15px] leading-[1.55]" style={{ color: BODY }}>Alle gidsen, hulpmiddelen en artikelen staan bij elkaar, per onderwerp.</span>
            <Link href={`/kennis/${onderwerp}`} className="mt-1 inline-flex items-center gap-2 text-[14.5px] font-bold" style={{ color: NAVY }}>Naar de kennisbank<Pijl size={14} /></Link>
          </div>
        )}
      </div>
      {lijst.length % 2 === 0 && (
        <Link href={`/kennis/${onderwerp}`} className="inline-flex items-center gap-2 self-start text-[15px] font-bold underline underline-offset-[5px]" style={{ color: NAVY, textDecorationColor: "rgba(50,46,131,0.35)" }}>Alle gidsen in de kennisbank<Pijl size={14} /></Link>
      )}
    </section>
  );
}
