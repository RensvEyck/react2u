"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuCheck, LuLoaderCircle } from "react-icons/lu";
import { wijzigStamkaart } from "@/app/admin/stamkaartActions";

/**
 * Wat de prognose mist, meteen aanvullen op de stamkaart: het aantal
 * werknemers (met het voorstel uit de getekende offerte al ingevuld) of de
 * casemanager. Bewaart via wijzigStamkaart, zodat het ook in de tijdlijn van de
 * klant komt. Zonder het salesrecht alleen een link naar de stamkaart.
 */

export type AanvulRij = { klantId: string; bedrijf: string; voorstel: string };

export default function PrognoseAanvullen({
  rijen, veld, kanBewerken, namen = [],
}: {
  rijen: AanvulRij[];
  veld: "medewerkers" | "casemanager";
  kanBewerken: boolean;
  /** Bekende casemanagers, als keuzelijst bij het typen. */
  namen?: string[];
}) {
  const router = useRouter();
  const [waarden, setWaarden] = useState<Record<string, string>>(() => Object.fromEntries(rijen.map((r) => [r.klantId, r.voorstel])));
  const [status, setStatus] = useState<Record<string, "bezig" | "ok" | string>>({});
  const [, start] = useTransition();

  function bewaar(id: string) {
    const waarde = (waarden[id] || "").trim();
    if (!waarde) return;
    setStatus((s) => ({ ...s, [id]: "bezig" }));
    start(async () => {
      const r = await wijzigStamkaart(id, { [veld]: waarde });
      setStatus((s) => ({ ...s, [id]: r.ok ? "ok" : r.fout }));
      if (r.ok) router.refresh();
    });
  }

  const lijst = `prognose-${veld}-namen`;
  return (
    <ul className="divide-y divide-black/[0.05]">
      {namen.length > 0 && <datalist id={lijst}>{namen.map((n) => <option key={n} value={n} />)}</datalist>}
      {rijen.map((r) => {
        const st = status[r.klantId];
        return (
          <li key={r.klantId} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
            <Link href={`/admin/klanten/${r.klantId}`} className="min-w-[160px] flex-1 truncate text-[14px] font-semibold text-[#1c1a4e] hover:text-[#312e82] hover:underline">{r.bedrijf}</Link>
            {kanBewerken ? (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  bewaar(r.klantId);
                }}
              >
                <input
                  className={`ainput !py-1.5 text-[14px] ${veld === "medewerkers" ? "w-[110px] tabular-nums" : "w-[170px]"}`}
                  inputMode={veld === "medewerkers" ? "numeric" : undefined}
                  list={veld === "casemanager" && namen.length ? lijst : undefined}
                  value={waarden[r.klantId] ?? ""}
                  onChange={(e) => setWaarden((w) => ({ ...w, [r.klantId]: e.target.value }))}
                  placeholder={veld === "medewerkers" ? "aantal" : "naam"}
                  aria-label={`${veld === "medewerkers" ? "Aantal werknemers" : "Casemanager"} van ${r.bedrijf}`}
                />
                <button className="abtn-ghost !px-3 !py-1.5 text-[13px]" disabled={st === "bezig"}>
                  {st === "bezig" ? <LuLoaderCircle className="animate-spin" /> : st === "ok" ? <LuCheck className="text-[#0e9f8a]" /> : "Bewaar"}
                </button>
              </form>
            ) : (
              <Link href={`/admin/klanten/${r.klantId}`} className="text-[13px] font-semibold text-[#312e82] hover:underline">Naar de stamkaart</Link>
            )}
            {st && st !== "bezig" && st !== "ok" && <p className="w-full text-[12.5px] text-[#b42318]">{st}</p>}
            {veld === "medewerkers" && r.voorstel && st !== "ok" && <p className="w-full text-[12px] text-black/40">Voorstel uit de getekende offerte; pas aan als het niet meer klopt.</p>}
          </li>
        );
      })}
    </ul>
  );
}
