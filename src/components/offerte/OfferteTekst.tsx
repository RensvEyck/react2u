import React from "react";
import { inlineDelen } from "@/lib/mdInline";

/*
 * De uitleg en voorwaarden van een offerte (migratie 0025), in een eigen
 * mini-opmaak die dicht bij de Word-offertes blijft:
 *   ## Kop              een hoofdstuk ("Trajectomschrijving")
 *   ### Tussenkop       een stap of onderdeel ("Stap 1: Inventariseren")
 *   - punt              een opsomming
 *   1. punt             een genummerde lijst
 *   > zin               een uitgelichte zin ("Ons uitgangspunt")
 *   **vet**, [link](…)  binnen een regel (lib/mdInline.ts)
 * Een lege regel begint een nieuwe alinea. Alles wordt als tekst gerenderd,
 * nooit als HTML.
 */

const NAVY = "#322E83";
const BODY = "#5E5C78";

function Inline({ tekst }: { tekst: string }) {
  return (
    <>
      {inlineDelen(tekst).map((d, i) =>
        d.soort === "vet" ? (
          <strong key={i} style={{ color: NAVY }}>{d.tekst}</strong>
        ) : d.soort === "link" ? (
          <a key={i} href={d.href} target={d.href.startsWith("/") ? undefined : "_blank"} rel="noopener" className="font-semibold underline underline-offset-4" style={{ color: NAVY }}>
            {d.tekst}
          </a>
        ) : (
          <React.Fragment key={i}>{d.tekst}</React.Fragment>
        )
      )}
    </>
  );
}

type Blok =
  | { soort: "h2" | "h3" | "p" | "quote"; tekst: string }
  | { soort: "ul" | "ol"; items: string[] };

export function blokkenUit(tekst: string): Blok[] {
  const uit: Blok[] = [];
  let para: string[] = [];
  const sluitAlinea = () => {
    if (para.length) uit.push({ soort: "p", tekst: para.join(" ") });
    para = [];
  };
  for (const ruw of (tekst || "").split("\n")) {
    const regel = ruw.trim();
    const laatste = uit[uit.length - 1];
    const ul = regel.match(/^[-•*]\s+(.*)$/);
    const ol = regel.match(/^\d+[.)]\s+(.*)$/);
    const kop = regel.match(/^(#{2,3})\s+(.*)$/);
    if (!regel) sluitAlinea();
    else if (kop) {
      sluitAlinea();
      uit.push({ soort: kop[1].length === 3 ? "h3" : "h2", tekst: kop[2] });
    } else if (regel.startsWith("> ")) {
      sluitAlinea();
      uit.push({ soort: "quote", tekst: regel.slice(2) });
    } else if (ul) {
      sluitAlinea();
      if (laatste?.soort === "ul") laatste.items.push(ul[1]);
      else uit.push({ soort: "ul", items: [ul[1]] });
    } else if (ol) {
      sluitAlinea();
      if (laatste?.soort === "ol") laatste.items.push(ol[1]);
      else uit.push({ soort: "ol", items: [ol[1]] });
    } else para.push(regel);
  }
  sluitAlinea();
  return uit;
}

export default function OfferteTekst({ tekst, klein = false }: { tekst: string; klein?: boolean }) {
  const blokken = blokkenUit(tekst);
  if (!blokken.length) return null;
  const maat = klein ? "text-[14.5px] leading-[1.6]" : "text-[16px] leading-[1.7]";
  return (
    <div className={`flex flex-col gap-3.5 ${maat}`} style={{ color: BODY }}>
      {blokken.map((b, i) => {
        if (b.soort === "h2")
          return (
            <h2 key={i} className={`font-heading m-0 text-[21px] font-bold tracking-[-0.01em] md:text-[23px] ${i ? "mt-5" : ""}`} style={{ color: NAVY }}>
              <Inline tekst={b.tekst} />
            </h2>
          );
        if (b.soort === "h3")
          return (
            <h3 key={i} className={`m-0 text-[17px] font-bold ${i ? "mt-2" : ""}`} style={{ color: NAVY }}>
              <Inline tekst={b.tekst} />
            </h3>
          );
        if (b.soort === "quote")
          return (
            <blockquote key={i} className="font-heading m-0 rounded-[16px] px-5 py-4 text-[18px] font-semibold leading-[1.45] md:text-[20px]" style={{ background: "#ECEBF5", color: NAVY }}>
              <Inline tekst={b.tekst} />
            </blockquote>
          );
        if (b.soort === "ul")
          return (
            <ul key={i} className="m-0 flex list-none flex-col gap-2 p-0">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-3">
                  <span className="mt-[0.62em] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#E61674" }} aria-hidden="true" />
                  <span><Inline tekst={it} /></span>
                </li>
              ))}
            </ul>
          );
        if (b.soort === "ol")
          return (
            <ol key={i} className="m-0 flex list-none flex-col gap-2.5 p-0">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold text-white" style={{ background: NAVY }}>{j + 1}</span>
                  <span><Inline tekst={it} /></span>
                </li>
              ))}
            </ol>
          );
        return <p key={i} className="m-0"><Inline tekst={b.soort === "p" ? b.tekst : ""} /></p>;
      })}
    </div>
  );
}
