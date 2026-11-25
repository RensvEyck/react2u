import Link from "next/link";
import { LuCheck, LuCircleAlert, LuExternalLink, LuPencil } from "react-icons/lu";
import { controleerGids, gidsScore, isGids } from "@/lib/gidsSeo";
import type { Page } from "@/lib/types";

/*
 * Het blok "Gidsen" op /admin/seo: per gids de controles uit lib/gidsSeo.ts
 * (de opbouw van HALO: vraag, antwoord, omvang, tijdlijn, tabel, vragen,
 * auteur, bronnen, dienst, titel en omschrijving). Een gids is een pagina die
 * met een gidskop begint; wie er een schrijft of bijwerkt in het beheer, ziet
 * hier wat er nog mist.
 */

export type GidsBlok = { page_id: string; type: string; sort: number; data: unknown };

export default function GidsControles({ pages, blocks }: { pages: Page[]; blocks: GidsBlok[] }) {
  const perPagina = new Map<string, GidsBlok[]>();
  for (const b of [...blocks].sort((a, b) => a.sort - b.sort)) perPagina.set(b.page_id, [...(perPagina.get(b.page_id) ?? []), b]);
  const gidsen = pages
    .map((p) => ({ p, blokken: perPagina.get(p.id) ?? [] }))
    .filter(({ blokken }) => isGids(blokken))
    .map(({ p, blokken }) => ({ p, controles: controleerGids(p, blokken) }));
  if (!gidsen.length) return null;
  return (
    <div className="acard overflow-hidden">
      <div className="border-b border-black/[0.06] bg-[#fafafd] px-6 py-4">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Gidsen</h2>
        <p className="mt-0.5 text-[13px] text-black/45">
          De opbouw die Google beloont: een vraag als kop, direct antwoord, 1.500 tot 2.000 woorden, tijdlijn, tabel, vragen, auteur en bronnen. Een gids begint met het blok Gids: kop.
        </p>
      </div>
      <div className="divide-y divide-black/[0.05]">
        {gidsen.map(({ p, controles }) => {
          const score = gidsScore(controles);
          const mist = controles.filter((c) => !c.ok);
          return (
            <div key={p.id} className={`grid gap-3 px-6 py-4 md:grid-cols-[260px_1fr_auto] md:items-start ${p.published ? "" : "opacity-55"}`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`apill ${mist.length === 0 ? "bg-[#e6f7f4] text-[#0e9f8a]" : "bg-[#fff4e5] text-[#c77700]"}`}>{score.ok} van {score.totaal}</span>
                  {!p.published && <span className="apill bg-black/[0.05] text-black/40">Concept</span>}
                </div>
                <p className="mt-1 truncate text-[14.5px] font-semibold text-[#1c1a4e]" title={p.title}>{p.title}</p>
                <p className="truncate text-[12.5px] text-black/35">/{p.slug}</p>
              </div>
              <ul className="m-0 grid list-none gap-x-6 gap-y-1 p-0 sm:grid-cols-2">
                {controles.map((c) => (
                  <li key={c.sleutel} className="flex items-start gap-1.5 text-[13px]">
                    {c.ok ? <LuCheck className="mt-0.5 shrink-0 text-[#0e9f8a]" /> : <LuCircleAlert className="mt-0.5 shrink-0 text-[#c77700]" />}
                    <span className={c.ok ? "text-black/60" : "font-semibold text-[#1c1a4e]"}>
                      {c.label}<span className="font-normal text-black/40"> · {c.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-1">
                {p.published && (
                  <a href={`/${p.slug}`} target="_blank" className="rounded-lg p-2 text-black/40 hover:bg-black/5 hover:text-[#312e82]" title="Bekijk">
                    <LuExternalLink className="text-[15px]" />
                  </a>
                )}
                <Link href={`/admin/paginas/${p.slug}`} className="rounded-lg p-2 text-black/40 hover:bg-black/5 hover:text-[#e75387]" title="Bewerken">
                  <LuPencil className="text-[15px]" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
