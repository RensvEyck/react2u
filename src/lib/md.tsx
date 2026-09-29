import React from "react";
import { koppeltekensHeel } from "./tekst";

/** Tekst met woorden als "re-integratie" heel gehouden (zie lib/tekst.ts). */
export function Heel({ text }: { text: string }) {
  return (
    <>
      {koppeltekensHeel(text).map((d, i) =>
        typeof d === "string" ? d : <span key={i} className="whitespace-nowrap">{d.heel}</span>
      )}
    </>
  );
}

// Mini-markdown renderer: paragraphs, "- " lists, **bold**, ### h3.
function inline(text: string, key: number): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <React.Fragment key={key}>
      {parts.map((p, i) => (i % 2 === 1 ? <strong key={i}><Heel text={p} /></strong> : <Heel key={i} text={p} />))}
    </React.Fragment>
  );
}

/**
 * `kop` is het element voor "### "-regels. Standaard h3 (onder de h2 van een
 * blok); een pagina waar de tekst direct onder de h1 staat, zoals een vacature,
 * geeft "h2" mee — anders slaat de kopstructuur een niveau over.
 */
export function MiniMarkdown({ text, className, kop: Kop = "h3" }: { text: string; className?: string; kop?: "h2" | "h3" }) {
  const lines = (text || "").split("\n");
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];
  let k = 0;

  const flushList = () => {
    if (list.length) {
      out.push(
        <ul key={k++}>
          {list.map((li, i) => (
            <li key={i}>{inline(li, i)}</li>
          ))}
        </ul>
      );
      list = [];
    }
  };
  const flushPara = () => {
    if (para.length) {
      out.push(<p key={k++}>{inline(para.join(" "), 0)}</p>);
      para = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim().startsWith("- ")) {
      flushPara();
      list.push(line.trim().slice(2));
    } else if (line.trim().startsWith("### ")) {
      flushPara();
      flushList();
      out.push(<Kop key={k++} className="prose-kop">{line.trim().slice(4)}</Kop>);
    } else if (line.trim() === "") {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();

  return <div className={`prose-r2u ${className || ""}`}>{out}</div>;
}
