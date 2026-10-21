"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { NAVY, PINK, TEAL, BODY, MUTE, LINE, kop, Pijl } from "./Gedeeld";

/** Eén vacature als kaartje; alles al in de taal van de pagina (zie WerkenBijPagina). */
export type VacatureKaart = {
  id: string;
  href: string;
  titel: string;
  /** Taal van de titel als die afwijkt van de pagina (schermlezers). */
  lang?: string;
  meta: string;
  bedrag?: string;
  eenheid?: string;
  /** De salaristekst uit de admin, als er geen bedrag uit te lezen was. */
  salarisTekst?: string;
  concept?: boolean;
  anders?: boolean;
};

export type VacatureGroep = { slug: string; naam: string; kaarten: VacatureKaart[] };

type Labels = { alle: string; filter: string; concept: string; inHetNederlands: string };

/**
 * Het vacatureoverzicht op Werken bij: filterknoppen per vakgebied en per
 * vakgebied een raster met kaartjes. Zonder JavaScript staat alles er gewoon;
 * het filter maakt de lijst alleen korter. Een link naar #vak-<slug> (zoals in
 * de kop van de pagina) zet het filter op dat vakgebied.
 */
export default function VacatureOverzicht({ groepen, labels }: { groepen: VacatureGroep[]; labels: Labels }) {
  const [filter, setFilter] = useState("alle");
  const totaal = groepen.reduce((n, g) => n + g.kaarten.length, 0);

  useEffect(() => {
    const lees = () => {
      const h = decodeURIComponent(location.hash.slice(1));
      if (!h.startsWith("vak-")) return;
      const slug = h.slice(4);
      if (!groepen.some((g) => g.slug === slug)) return;
      setFilter(slug);
      requestAnimationFrame(() => document.getElementById("vacatures")?.scrollIntoView({ block: "start" }));
    };
    lees();
    window.addEventListener("hashchange", lees);
    return () => window.removeEventListener("hashchange", lees);
  }, [groepen]);

  const zichtbaar = filter === "alle" ? groepen : groepen.filter((g) => g.slug === filter);
  const knoppen = [{ slug: "alle", naam: labels.alle, n: totaal }, ...groepen.map((g) => ({ slug: g.slug, naam: g.naam, n: g.kaarten.length }))];

  return (
    <div className="flex flex-col gap-10">
      {groepen.length > 1 && (
        <div role="group" aria-label={labels.filter} className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
          {knoppen.map((k) => {
            const aan = filter === k.slug;
            return (
              <button key={k.slug} type="button" aria-pressed={aan} onClick={() => setFilter(k.slug)}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-[14.5px] font-bold transition-colors"
                style={aan ? { background: NAVY, borderColor: NAVY, color: "#ffffff" } : { background: "#ffffff", borderColor: LINE, color: NAVY }}>
                {k.naam}
                <span className="rounded-full px-2 py-0.5 text-[12.5px] tabular-nums"
                  style={aan ? { background: "rgba(255,255,255,0.18)", color: "#ffffff" } : { background: "#F1F0F7", color: MUTE }}>{k.n}</span>
              </button>
            );
          })}
        </div>
      )}

      {zichtbaar.map((g, gi) => (
        <div key={g.slug} id={`vak-${g.slug}`} className="flex scroll-mt-28 flex-col gap-5">
          {groepen.length > 1 && (
            <h3 className={`${kop} m-0 flex items-center gap-3 text-[22px] tracking-[-0.4px] md:text-[26px]`} style={{ color: NAVY }}>
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: gi % 2 ? TEAL : PINK }} />
              {g.naam}
              <span className="text-[16px] font-medium tabular-nums" style={{ color: MUTE }}>{g.kaarten.length}</span>
            </h3>
          )}
          <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
            {g.kaarten.map((k) => (
              <li key={k.id} className="flex">
                <Link href={k.href}
                  className="hv-btn group flex w-full flex-col gap-2.5 rounded-[22px] border bg-white p-5 transition-[box-shadow,border-color] hover:shadow-[0_24px_48px_-30px_rgba(50,46,131,0.5)] md:gap-3 md:p-7"
                  style={{ borderColor: "transparent" }}>
                  <span className="flex items-start justify-between gap-3">
                    <span className={`${kop} text-[19px] leading-[1.2] tracking-[-0.3px] md:text-[22px]`} style={{ color: NAVY }} lang={k.lang}>{k.titel}</span>
                    {k.concept && (
                      <span className="shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold" style={{ background: "#FDE7B0", color: "#7A4A00" }}>{labels.concept}</span>
                    )}
                  </span>
                  {k.anders && <span className="text-[13px] font-bold" style={{ color: PINK }}>{labels.inHetNederlands}</span>}
                  <span className="text-[14.5px] leading-[1.5]" style={{ color: BODY }}>{k.meta}</span>
                  <span className="mt-auto flex items-end justify-between gap-4 border-t pt-3.5 md:pt-4" style={{ borderColor: LINE }}>
                    {k.bedrag ? (
                      <span className="flex flex-col">
                        <span className="text-[17px] font-bold tabular-nums" style={{ color: NAVY }}>{k.bedrag}</span>
                        <span className="text-[13px]" style={{ color: MUTE }}>{k.eenheid}</span>
                      </span>
                    ) : (
                      <span className="text-[14.5px]" style={{ color: BODY }}>{k.salarisTekst}</span>
                    )}
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white transition-colors group-hover:bg-[#E61674]" style={{ background: NAVY }}><Pijl /></span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
