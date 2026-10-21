"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { LuBriefcase, LuChevronDown, LuClock, LuEuro, LuGraduationCap, LuMapPin, LuSearch } from "react-icons/lu";
import { NAVY, PINK, BODY, MUTE, LINE, SOFT, LAV, BREED, kop, Pijl } from "./Gedeeld";

/** Eén vacature als kaartje; alles al in de taal van de pagina (zie kaartVan in WerkenBij). */
export type VacatureKaart = {
  id: string;
  href: string;
  titel: string;
  /** Taal van de titel als die afwijkt van de pagina (schermlezers). */
  lang?: string;
  groep: string;
  groepNaam: string;
  locatie: string;
  uren?: string;
  urenMin?: number;
  urenMax?: number;
  opleiding?: string;
  niveaus: ("mbo" | "hbo" | "wo")[];
  soort: "vast" | "zzp" | "stage";
  soortNaam: string;
  bedrag?: string;
  eenheid?: string;
  /** De salaristekst uit de admin, als er geen bedrag uit te lezen was. */
  salarisTekst?: string;
  concept?: boolean;
  anders?: boolean;
  /** Kleine letters: titel, vakgebied en intro, om op te zoeken. */
  zoek: string;
};

export type ZoekLabels = {
  zoekLabel: string;
  zoekPlaceholder: string;
  zoekKnop: string;
  vakgebied: string;
  opleiding: string;
  uren: string;
  soort: string;
  urenOpties: { tot24: string; tot32: string; vanaf32: string };
  soorten: { vast: string; zzp: string; stage: string };
  wisFilters: string;
  gevonden: string;
  eenGevonden: string;
  geenResultaatKop: string;
  geenResultaatTekst: string;
  geenVacaturesKop: string;
  geenVacaturesTekst: string;
  concept: string;
  inHetNederlands: string;
  bekijk: string;
};

const ICOON = "mt-[3px] shrink-0 text-[15px]";

/** Een vacature als kaartje, zoals bij de grote uitzendbureaus: kerngegevens onder elkaar met een icoon. */
export function Kaart({ k, labels }: { k: VacatureKaart; labels: Pick<ZoekLabels, "concept" | "inHetNederlands" | "bekijk"> }) {
  return (
    <Link href={k.href}
      className="hv-btn group flex h-full w-full flex-col gap-4 rounded-[20px] border bg-white p-6 transition-[box-shadow,border-color] hover:shadow-[0_24px_48px_-30px_rgba(50,46,131,0.55)]"
      style={{ borderColor: LINE }}>
      <span className="flex items-center justify-between gap-3">
        <span className="text-[12.5px] font-bold uppercase tracking-[0.06em]" style={{ color: PINK }}>{k.groepNaam}</span>
        {k.concept && <span className="rounded-full px-2.5 py-0.5 text-[12px] font-bold" style={{ background: "#FDE7B0", color: "#7A4A00" }}>{labels.concept}</span>}
      </span>
      <span className={`${kop} text-[20px] leading-[1.22] tracking-[-0.3px]`} style={{ color: NAVY }} lang={k.lang}>{k.titel}</span>
      {k.anders && <span className="-mt-2 text-[13px] font-bold" style={{ color: PINK }}>{labels.inHetNederlands}</span>}
      <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[14.5px] leading-[1.45]" style={{ color: BODY }}>
        <li className="flex gap-2.5"><LuMapPin aria-hidden className={ICOON} style={{ color: MUTE }} />{k.locatie}</li>
        {(k.bedrag || k.salarisTekst) && (
          <li className="flex gap-2.5"><LuEuro aria-hidden className={ICOON} style={{ color: MUTE }} />
            {k.bedrag ? <span><b className="font-bold tabular-nums" style={{ color: NAVY }}>{k.bedrag}</b> {k.eenheid}</span> : k.salarisTekst}
          </li>
        )}
        {k.uren && <li className="flex gap-2.5"><LuClock aria-hidden className={ICOON} style={{ color: MUTE }} />{k.uren}</li>}
        {k.opleiding && <li className="flex gap-2.5"><LuGraduationCap aria-hidden className={ICOON} style={{ color: MUTE }} />{k.opleiding}</li>}
        <li className="flex gap-2.5"><LuBriefcase aria-hidden className={ICOON} style={{ color: MUTE }} />{k.soortNaam}</li>
      </ul>
      <span className="mt-auto inline-flex items-center gap-2 pt-1 text-[14.5px] font-bold transition-colors group-hover:text-[#E61674]" style={{ color: NAVY }}>
        {labels.bekijk} <Pijl />
      </span>
    </Link>
  );
}

const URENFILTER: Record<string, (min: number, max: number) => boolean> = {
  tot24: (min) => min < 24,
  tot32: (min, max) => min < 32 && max > 24,
  vanaf32: (_, max) => max > 32,
};

function Keuze({ label, waarde, onChange, opties }: {
  label: string; waarde: string; onChange: (v: string) => void; opties: { waarde: string; label: string }[];
}) {
  const aan = waarde !== "";
  return (
    <label className="relative flex min-w-0 flex-1 items-center sm:flex-none">
      <span className="sr-only">{label}</span>
      <select value={waarde} onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full min-w-0 cursor-pointer appearance-none truncate rounded-full border pl-4 pr-10 text-[14.5px] font-bold sm:w-auto"
        style={aan ? { background: NAVY, borderColor: NAVY, color: "#ffffff" } : { background: "#ffffff", borderColor: LINE, color: NAVY }}>
        <option value="">{label}</option>
        {opties.map((o) => <option key={o.waarde} value={o.waarde}>{o.label}</option>)}
      </select>
      <LuChevronDown aria-hidden className="pointer-events-none absolute right-4 text-[16px]" style={{ color: aan ? "#ffffff" : NAVY }} />
    </label>
  );
}

/**
 * Werken bij: zoeken en filteren zoals bij Randstad en Tempo-Team. Zoekbalk in
 * de kop, een filterbalk die bij het scrollen in beeld blijft (vakgebied,
 * opleidingsniveau, uren per week, soort dienstverband), het aantal
 * resultaten en een raster met kaartjes. De kop, de foto en wat onder de
 * zoekbalk en de resultaten staat komen van de server mee (`kop`, `onderZoek`,
 * `beeld`, `onderaan`).
 */
export default function VacatureZoeker({ kaarten, groepen, labels, kop: kopInhoud, onderZoek, beeld, onderaan }: {
  kaarten: VacatureKaart[];
  groepen: { slug: string; naam: string }[];
  labels: ZoekLabels;
  kop: React.ReactNode;
  onderZoek?: React.ReactNode;
  beeld?: React.ReactNode;
  onderaan?: React.ReactNode;
}) {
  const [zoek, setZoek] = useState("");
  const [vak, setVak] = useState("");
  const [niveau, setNiveau] = useState("");
  const [uren, setUren] = useState("");
  const [soort, setSoort] = useState("");

  const gevonden = useMemo(() => {
    const q = zoek.trim().toLowerCase();
    return kaarten.filter((k) =>
      (!q || q.split(/\s+/).every((w) => k.zoek.includes(w))) &&
      (!vak || k.groep === vak) &&
      (!niveau || k.niveaus.includes(niveau as VacatureKaart["niveaus"][number])) &&
      (!uren || (k.urenMin !== undefined && k.urenMax !== undefined && URENFILTER[uren](k.urenMin, k.urenMax))) &&
      (!soort || k.soort === soort));
  }, [kaarten, zoek, vak, niveau, uren, soort]);

  const filtersAan = Boolean(zoek || vak || niveau || uren || soort);
  const wis = () => { setZoek(""); setVak(""); setNiveau(""); setUren(""); setSoort(""); };
  const naarResultaten = () => document.getElementById("vacatures")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const soortenAanwezig = (["vast", "zzp", "stage"] as const).filter((s) => kaarten.some((k) => k.soort === s));

  return (
    <>
      <section className="px-[6px] pt-4 md:px-10 md:pt-8 lg:px-16 xl:mx-auto xl:max-w-[1440px] xl:px-[120px]">
        <div className="relative grid gap-10 overflow-hidden rounded-[28px] px-6 py-10 md:rounded-[36px] md:p-14 lg:grid-cols-12 lg:items-center lg:gap-6 lg:p-[64px]" style={{ background: LAV }}>
          <span aria-hidden className="absolute right-[-140px] top-[-170px] h-[560px] w-[560px] rounded-full" style={{ background: NAVY, opacity: 0.07 }} />
          <div className="relative flex flex-col gap-6 lg:col-span-7">
            {kopInhoud}
            {kaarten.length > 0 && (
              <form role="search" onSubmit={(e) => { e.preventDefault(); naarResultaten(); }}
                className="flex flex-col gap-2 rounded-[22px] bg-white p-2 shadow-[0_24px_48px_-30px_rgba(50,46,131,0.45)] sm:flex-row sm:items-center">
                <label htmlFor="vacature-zoek" className="flex flex-1 items-center gap-3 px-4">
                  <span className="sr-only">{labels.zoekLabel}</span>
                  <LuSearch aria-hidden className="shrink-0 text-[19px]" style={{ color: MUTE }} />
                  <input id="vacature-zoek" type="search" value={zoek} onChange={(e) => setZoek(e.target.value)} autoComplete="off"
                    placeholder={labels.zoekPlaceholder} className="h-12 w-full min-w-0 bg-transparent text-[16px] outline-none" style={{ color: NAVY }} />
                </label>
                <button type="submit" className="h-12 shrink-0 rounded-[16px] px-7 text-[15.5px] font-bold text-white transition-opacity hover:opacity-90" style={{ background: PINK }}>
                  {labels.zoekKnop}
                </button>
              </form>
            )}
            {onderZoek}
          </div>
          {beeld && <div className="relative hidden h-[420px] overflow-hidden rounded-[24px] lg:col-span-5 lg:block">{beeld}</div>}
        </div>
      </section>

      <section id="vacatures" aria-label={labels.zoekLabel} className="scroll-mt-24" style={{ background: SOFT }}>
        <div className={`${BREED} flex flex-col gap-6 pb-14 pt-8 md:pb-[96px] md:pt-12`}>
          {kaarten.length > 0 && (
            <div className="sticky top-[calc(var(--hh,72px)+8px)] z-20 -mx-2 flex flex-col gap-3 rounded-[22px] border bg-white/95 p-3 shadow-[0_16px_32px_-24px_rgba(50,46,131,0.45)] backdrop-blur md:mx-0 md:flex-row md:items-center md:justify-between"
              style={{ borderColor: LINE }}>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <Keuze label={labels.vakgebied} waarde={vak} onChange={setVak} opties={groepen.map((g) => ({ waarde: g.slug, label: g.naam }))} />
                <Keuze label={labels.opleiding} waarde={niveau} onChange={setNiveau}
                  opties={[{ waarde: "mbo", label: "MBO" }, { waarde: "hbo", label: "HBO" }, { waarde: "wo", label: "WO" }]} />
                <Keuze label={labels.uren} waarde={uren} onChange={setUren}
                  opties={[{ waarde: "tot24", label: labels.urenOpties.tot24 }, { waarde: "tot32", label: labels.urenOpties.tot32 }, { waarde: "vanaf32", label: labels.urenOpties.vanaf32 }]} />
                <Keuze label={labels.soort} waarde={soort} onChange={setSoort}
                  opties={soortenAanwezig.map((s) => ({ waarde: s, label: labels.soorten[s] }))} />
              </div>
              <div className="flex items-center justify-between gap-4 px-2 md:justify-end">
                <span className="text-[15px] font-bold tabular-nums" style={{ color: NAVY }} aria-live="polite">
                  {gevonden.length === 1 ? labels.eenGevonden : labels.gevonden.replace("{n}", String(gevonden.length))}
                </span>
                {filtersAan && (
                  <button type="button" onClick={wis} className="text-[14.5px] font-bold underline underline-offset-4" style={{ color: PINK }}>{labels.wisFilters}</button>
                )}
              </div>
            </div>
          )}

          {kaarten.length === 0 ? (
            <div className="flex flex-col gap-2 rounded-[22px] bg-white p-8">
              <span className={`${kop} text-[24px]`} style={{ color: NAVY }}>{labels.geenVacaturesKop}</span>
              <span className="text-[16px]" style={{ color: BODY }}>{labels.geenVacaturesTekst}</span>
            </div>
          ) : gevonden.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-[22px] bg-white p-8">
              <span className={`${kop} text-[24px]`} style={{ color: NAVY }}>{labels.geenResultaatKop}</span>
              <span className="text-[16px]" style={{ color: BODY }}>{labels.geenResultaatTekst}</span>
              <button type="button" onClick={wis} className="mt-1 rounded-full px-5 py-2.5 text-[14.5px] font-bold text-white" style={{ background: NAVY }}>{labels.wisFilters}</button>
            </div>
          ) : (
            <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {gevonden.map((k) => <li key={k.id} className="flex"><Kaart k={k} labels={labels} /></li>)}
            </ul>
          )}
          {onderaan}
        </div>
      </section>
    </>
  );
}
