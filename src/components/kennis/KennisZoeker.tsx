"use client";
import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { LuSearch } from "react-icons/lu";
import { zoekKennis, type KennisItem } from "@/lib/kennis";
import { NAVY, BODY, MUTE, LINE } from "@/components/blocks/Gedeeld";

/*
 * Het zoekveld van de kennisbank. Alles wat er te vinden is (gidsen,
 * hulpmiddelen, artikelen) komt als lijst mee van de server; zoeken gebeurt
 * in de browser (lib/kennis.ts, zoekKennis), zonder verzoek en zonder
 * registratie. Vanaf twee letters verschijnen de treffers onder het veld,
 * gidsen eerst; een lege vraag toont niets, de onderwerpen eronder zijn dan
 * de ingang.
 */

const SOORT: Record<KennisItem["soort"], string> = { gids: "Gids", hulpmiddel: "Hulpmiddel", artikel: "Artikel" };

export default function KennisZoeker({ items, onderwerpen, placeholder = "Zoek op onderwerp, bijvoorbeeld loonsanctie of bedrijfsarts" }: {
  items: KennisItem[];
  onderwerpen: { slug: string; naam: string }[];
  placeholder?: string;
}) {
  const [vraag, setVraag] = useState("");
  const id = useId();
  const treffers = useMemo(() => zoekKennis(items, vraag), [items, vraag]);
  const actief = vraag.trim().length >= 2;
  const naam = (slug: string) => onderwerpen.find((o) => o.slug === slug)?.naam ?? "";
  return (
    <div role="search" className="flex flex-col gap-4">
      <label htmlFor={id} className="sr-only">Zoeken in de kennisbank</label>
      <div className="relative">
        <LuSearch aria-hidden className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[20px]" style={{ color: MUTE }} />
        <input
          id={id}
          type="search"
          value={vraag}
          onChange={(e) => setVraag(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          aria-controls={`${id}-treffers`}
          className="h-[60px] w-full rounded-full border bg-white pl-14 pr-5 text-[16px] outline-none transition-[border-color,box-shadow] placeholder:text-[#9C9AB5] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)] md:text-[17px]"
          style={{ borderColor: LINE, color: NAVY }}
        />
      </div>
      <div id={`${id}-treffers`} aria-live="polite">
        {actief && (
          treffers.length ? (
            <ul className="m-0 flex list-none flex-col divide-y overflow-hidden rounded-[22px] border bg-white p-0" style={{ borderColor: LINE }}>
              {treffers.map((t) => (
                <li key={t.href} className="flex" style={{ borderColor: LINE }}>
                  <Link href={t.href} className="flex w-full flex-col gap-1 px-5 py-4 transition-colors hover:bg-[#F6F5FB]">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-bold uppercase tracking-[1px]" style={{ color: MUTE }}>
                      <span style={{ color: t.soort === "gids" ? "#D4136A" : t.soort === "hulpmiddel" ? "#007A6D" : MUTE }}>{SOORT[t.soort]}</span>
                      <span className="font-semibold normal-case tracking-normal">{naam(t.onderwerp)}</span>
                    </span>
                    <span className="text-[16.5px] font-bold leading-[1.3]" style={{ color: NAVY }}>{t.titel}</span>
                    {t.kort && <span className="text-[14.5px] leading-[1.5]" style={{ color: BODY }}>{t.kort}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 rounded-[18px] px-5 py-4 text-[15px]" style={{ background: "#F6F5FB", color: BODY }}>
              Niets gevonden voor &lsquo;{vraag.trim()}&rsquo;. Kies een onderwerp hieronder, of bel ons: we beantwoorden je vraag graag persoonlijk.
            </p>
          )
        )}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Onderwerpen">
        {onderwerpen.map((o) => (
          <li key={o.slug}>
            <Link href={`/kennis/${o.slug}`} className="hv-btn hv-btn-rand inline-flex min-h-[44px] items-center rounded-full px-4 text-[14.5px] font-bold">{o.naam}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
