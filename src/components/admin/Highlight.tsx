import type { Range } from "@/lib/search";

/** Tekst met de zoektreffers gemarkeerd. Bereiken komen uit findRanges(). */
export default function Highlight({ text, ranges }: { text: string; ranges: Range[] }) {
  if (!ranges.length) return <>{text}</>;
  const out: React.ReactNode[] = [];
  let at = 0;
  ranges.forEach(([s, e], i) => {
    if (s > at) out.push(text.slice(at, s));
    out.push(
      <mark key={i} className="rounded-[3px] bg-[#e75387]/15 px-px text-inherit">
        {text.slice(s, e)}
      </mark>
    );
    at = e;
  });
  if (at < text.length) out.push(text.slice(at));
  return <>{out}</>;
}
