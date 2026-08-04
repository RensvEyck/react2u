import React from "react";

// Mini-markdown renderer: paragraphs, "- " lists, **bold**, ### h3.
function inline(text: string, key: number): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <React.Fragment key={key}>
      {parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : p))}
    </React.Fragment>
  );
}

export function MiniMarkdown({ text, className }: { text: string; className?: string }) {
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
      out.push(<h3 key={k++}>{line.trim().slice(4)}</h3>);
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
