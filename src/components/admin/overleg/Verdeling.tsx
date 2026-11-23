import Link from "next/link";
import { LuMapPin } from "react-icons/lu";
import { KAART, kaartStand, ZONDER_KLEUR, type KaartKlant, type KaartPunt, type TeamLid } from "@/lib/kaart";
import KaartLagen from "@/components/admin/overleg/KaartLagen";

/**
 * De verdeling van de klanten over de casemanagers op de kaart van Nederland
 * (0053; Rens, 23 nov 2026). Twee lagen: de klanten als stip (in de kleur van
 * de casemanager, groter bij meer werknemers) en het werkgebied (elke gemeente
 * in de kleur van wie er de meeste klanten heeft). De plaats komt van de
 * stamkaart; wie geen postcode of herkenbare plaats heeft, staat eronder.
 * Het team komt uit Medewerkers (0057), zodat ook wie nog geen klanten heeft
 * in de lijst staat; de vierde casemanager staat als ruit op de kaart.
 */

/** Een klant op de kaart: een stip, of een ruit voor de vierde casemanager. */
function Punt({ p }: { p: KaartPunt }) {
  const titel = [p.klant.bedrijf, p.klant.casemanager || "nog geen casemanager", p.klant.medewerkers ? `${p.klant.medewerkers} werknemers` : null, p.klant.plaats].filter(Boolean).join(" · ");
  const gedeeld = { className: "kaart-punt", "data-cm": p.cm >= 0 ? p.cm : "geen", "data-klant": p.klant.bedrijf, "data-vorm": p.vorm, fill: p.kleur, stroke: "#fff", strokeWidth: 12 };
  if (p.vorm === "ruit") {
    // Even veel oppervlak als een stip met dezelfde straal: halve diagonaal r·√(π/2).
    const h = Math.round(p.r * 1.2533);
    return (
      <path {...gedeeld} strokeLinejoin="round" d={`M${p.x} ${p.y - h}L${p.x + h} ${p.y}L${p.x} ${p.y + h}L${p.x - h} ${p.y}Z`}>
        <title>{titel}</title>
      </path>
    );
  }
  return (
    <circle {...gedeeld} cx={p.x} cy={p.y} r={p.r}>
      <title>{titel}</title>
    </circle>
  );
}

export default function Verdeling({ klanten, team = [], magStamkaart }: { klanten: KaartKlant[]; team?: TeamLid[]; magStamkaart: boolean }) {
  const stand = kaartStand(klanten, team);
  const naam = (k: KaartKlant) =>
    magStamkaart ? (
      <Link href={`/admin/klanten/${k.id}`} className="font-semibold text-[#312e82] hover:underline">{k.bedrijf}</Link>
    ) : (
      <span className="font-semibold text-[#1c1a4e]">{k.bedrijf}</span>
    );

  return (
    <div className="space-y-6">
      <KaartLagen casemanagers={stand.casemanagers}>
        <div className="relative mx-auto max-w-[640px] rounded-[18px] bg-[#f7f6fc] p-3">
          <svg
            viewBox={`0 0 ${KAART.breedte} ${KAART.hoogte}`}
            className="h-auto w-full"
            role="img"
            aria-labelledby="kaart-titel kaart-uitleg"
            id="verdeling-kaart"
          >
            <title id="kaart-titel">Kaart van Nederland met de klanten per casemanager</title>
            <desc id="kaart-uitleg">
              {stand.casemanagers.map((c) => `${c.naam}: ${c.opKaart} van ${c.klanten} klanten op de kaart${c.vorm === "ruit" ? ", als ruit" : ""}`).join(". ")}. De lijst ernaast en eronder geeft dezelfde verdeling in tekst.
            </desc>
            <g aria-hidden>
              {KAART.gemeenten.map((g) => (
                <path key={g.code} d={g.d} fill="#e9e7f3" stroke="#fff" strokeWidth={4} strokeLinejoin="round" />
              ))}
            </g>
            <g className="laag-werkgebied" aria-hidden>
              {[...stand.werkgebied.entries()].map(([gi, cm]) => (
                <path key={gi} className="kaart-vlak" data-cm={cm} d={KAART.gemeenten[gi].d} fill={stand.casemanagers[cm].kleur} fillOpacity={0.3} stroke="#fff" strokeWidth={4} strokeLinejoin="round">
                  <title>{`${KAART.gemeenten[gi].naam}: ${stand.casemanagers[cm].naam}`}</title>
                </path>
              ))}
            </g>
            <g className="laag-klanten">
              {stand.punten.map((p) => <Punt key={p.klant.id} p={p} />)}
            </g>
          </svg>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[12px] text-black/45">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-black/30" /> Stip: een klant, groter bij meer werknemers</span>
            {stand.casemanagers.some((c) => c.vorm === "ruit" && c.klanten > 0) && (
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rotate-45 rounded-[1px] bg-black/30" /> Ruit: een klant van {stand.casemanagers.find((c) => c.vorm === "ruit")!.naam}</span>
            )}
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-black/15" /> Vlak: wie in die gemeente de meeste klanten heeft</span>
            {stand.zonderCm.length > 0 && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: ZONDER_KLEUR }} /> Nog geen casemanager</span>}
          </p>
        </div>
      </KaartLagen>

      {(stand.zonderPlek.length > 0 || stand.zonderCm.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {stand.zonderPlek.length > 0 && (
            <div className="rounded-[14px] bg-[#fff8ec] px-4 py-3.5" id="zonder-plek">
              <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[#7a4206]">
                <LuMapPin /> {stand.zonderPlek.length} {stand.zonderPlek.length === 1 ? "klant staat" : "klanten staan"} nog niet op de kaart
              </p>
              <p className="mt-0.5 text-[12.5px] text-[#7a4206]/80">
                Vul op de stamkaart het bezoekadres in, met postcode{magStamkaart ? "" : " (via het beheer)"}.
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
                {stand.zonderPlek.map((k) => <li key={k.id}>{naam(k)}</li>)}
              </ul>
            </div>
          )}
          {stand.zonderCm.length > 0 && (
            <div className="rounded-[14px] bg-black/[0.03] px-4 py-3.5" id="zonder-cm">
              <p className="text-[13.5px] font-semibold text-[#1c1a4e]">{stand.zonderCm.length} {stand.zonderCm.length === 1 ? "klant heeft" : "klanten hebben"} nog geen casemanager</p>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
                {stand.zonderCm.map((k) => <li key={k.id}>{naam(k)}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      <details className="group/tabel">
        <summary className="cursor-pointer list-none text-[12.5px] font-semibold text-black/45 hover:text-[#312e82] [&::-webkit-details-marker]:hidden">
          <span className="group-open/tabel:hidden">Alle klanten als tabel</span>
          <span className="hidden group-open/tabel:inline">Verberg de tabel</span>
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[13px]">
            <thead className="text-[11.5px] uppercase tracking-[0.06em] text-black/40">
              <tr className="border-b border-black/[0.06]">
                <th className="py-2 pr-3 font-semibold">Klant</th>
                <th className="px-3 py-2 font-semibold">Casemanager</th>
                <th className="px-3 py-2 text-right font-semibold">Werknemers</th>
                <th className="py-2 pl-3 font-semibold">Plaats</th>
              </tr>
            </thead>
            <tbody>
              {klanten.map((k) => (
                <tr key={k.id} className="border-b border-black/[0.04]">
                  <td className="py-1.5 pr-3">{naam(k)}</td>
                  <td className="px-3 py-1.5 text-black/60">{k.casemanager || "–"}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-black/60">{k.medewerkers ?? "–"}</td>
                  <td className="py-1.5 pl-3 text-black/60">{[k.postcode, k.plaats].filter(Boolean).join(" ") || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
