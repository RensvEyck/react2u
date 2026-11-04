/**
 * Staafgrafieken voor het beheer (salesdashboard, omzet): per periode één
 * kolom, gestapeld of naast elkaar, met een tip bij aanwijzen, een legenda en
 * de cijfers ook als tabel. Server component: de tip is CSS (group-hover en
 * group-focus), dus zonder JavaScript en met het toetsenbord bereikbaar.
 *
 * Volgens de grafiekregels van het team: dunne staven (max 24px) met een
 * afgeronde kop van 4px op één basislijn, 2px lucht tussen stapeldelen, één
 * as, tekst in tekstkleur en de serie alleen in het blokje ervoor. De kleuren
 * in `KLEUR` zijn getoetst op kleurenblindheid (violet, aqua, geel).
 */

export const KLEUR = { violet: "#6250d6", aqua: "#1baf7a", geel: "#eda100" } as const;

export type Reeks = { key: string; label: string; kleur: string };
export type Punt = { key: string; label: string; waarden: Record<string, number>; /** Langere naam in de tip en de tabel. */ titel?: string };

/** Een nette bovengrens voor de as: 1, 2 of 5 maal een macht van tien. */
function bovengrens(max: number): number {
  if (max <= 0) return 1;
  const macht = 10 ** Math.floor(Math.log10(max));
  for (const f of [1, 2, 2.5, 5, 10]) if (f * macht >= max) return f * macht;
  return 10 * macht;
}

export function Legenda({ reeksen }: { reeksen: Reeks[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-black/55">
      {reeksen.map((r) => (
        <li key={r.key} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: r.kleur }} aria-hidden />
          {r.label}
        </li>
      ))}
    </ul>
  );
}

export function Staven({
  reeksen, punten, gestapeld = true, formaat, titel, hoogte = 180, totaalLabel = "Totaal", minTop = 0,
}: {
  reeksen: Reeks[];
  punten: Punt[];
  gestapeld?: boolean;
  formaat: (n: number) => string;
  titel: string;
  hoogte?: number;
  totaalLabel?: string;
  /** Minimale bovenkant van de as: 2 bij aantallen, anders staat er bij weinig data twee keer "1". */
  minTop?: number;
}) {
  const totaal = (p: Punt) => reeksen.reduce((s, r) => s + (p.waarden[r.key] || 0), 0);
  const max = bovengrens(Math.max(minTop, ...punten.map((p) => (gestapeld ? totaal(p) : Math.max(...reeksen.map((r) => p.waarden[r.key] || 0))))));
  const lijnen = [max, max / 2, 0];

  return (
    <figure className="space-y-3">
      {reeksen.length > 1 && <Legenda reeksen={reeksen} />}
      <div className="flex gap-3">
        {/* As: drie stille lijnen, de waarden links. */}
        <div className="relative w-12 shrink-0 text-right text-[11px] tabular-nums text-black/35" style={{ height: hoogte }} aria-hidden>
          {lijnen.map((v, i) => (
            <span key={i} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - v / max) * 100}%` }}>{formaat(v)}</span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-0" style={{ height: hoogte }} aria-hidden>
            {lijnen.map((v, i) => (
              <div key={i} className={`absolute inset-x-0 border-t ${v === 0 ? "border-black/15" : "border-dashed border-black/[0.07]"}`} style={{ top: `${(1 - v / max) * 100}%` }} />
            ))}
          </div>
          <div className="relative flex items-end" style={{ height: hoogte }} role="img" aria-label={`${titel}. ${punten.map((p) => `${p.titel || p.label}: ${formaat(totaal(p))}`).join("; ")}`}>
            {punten.map((p, i) => {
              const t = totaal(p);
              const rechts = i > punten.length / 2;
              return (
                <div key={p.key} tabIndex={0} className="group relative flex h-full flex-1 items-end justify-center outline-none" aria-label={`${p.titel || p.label}: ${formaat(t)}`}>
                  {gestapeld ? (
                    <div className="flex w-full max-w-[24px] flex-col-reverse gap-[2px]" style={{ height: `${(t / max) * 100}%` }}>
                      {reeksen.map((r, j) => {
                        const v = p.waarden[r.key] || 0;
                        if (v <= 0) return null;
                        const bovenste = reeksen.slice(j + 1).every((x) => (p.waarden[x.key] || 0) <= 0);
                        return (
                          <div
                            key={r.key}
                            className={`w-full transition-opacity group-hover:opacity-90 ${bovenste ? "rounded-t-[4px]" : ""}`}
                            style={{ background: r.kleur, flexGrow: v, flexBasis: 0, minHeight: 2 }}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex h-full w-full max-w-[40px] items-end justify-center gap-[2px]">
                      {reeksen.map((r) => {
                        const v = p.waarden[r.key] || 0;
                        return (
                          <div
                            key={r.key}
                            className="w-full max-w-[16px] rounded-t-[4px] transition-opacity group-hover:opacity-90"
                            style={{ background: r.kleur, height: v > 0 ? `max(2px, ${(v / max) * 100}%)` : 0 }}
                          />
                        );
                      })}
                    </div>
                  )}
                  {/* Raakvlak breder dan de staaf; de tip bij aanwijzen of focus. */}
                  <div
                    className={`pointer-events-none absolute bottom-full z-20 mb-2 hidden min-w-[150px] rounded-xl bg-[#1c1a4e] px-3 py-2 text-[12px] text-white shadow-lg group-hover:block group-focus:block ${
                      rechts ? "right-0" : "left-0"
                    }`}
                  >
                    <p className="mb-1 font-semibold">{p.titel || p.label}</p>
                    {reeksen.map((r) => (
                      <p key={r.key} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-white/75">
                          <span className="h-2 w-2 rounded-[2px]" style={{ background: r.kleur }} />{r.label}
                        </span>
                        <span className="tabular-nums">{formaat(p.waarden[r.key] || 0)}</span>
                      </p>
                    ))}
                    {gestapeld && reeksen.length > 1 && (
                      <p className="mt-1 flex justify-between gap-3 border-t border-white/15 pt-1 font-semibold">
                        <span>{totaalLabel}</span><span className="tabular-nums">{formaat(t)}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex text-[11.5px] text-black/40" aria-hidden>
            {/* Bij veel kolommen op een telefoon om de andere een naam; invisible houdt de verdeling gelijk. */}
            {punten.map((p, i) => (
              <span key={p.key} className={`flex-1 text-center ${punten.length > 6 && (punten.length - 1 - i) % 2 ? "invisible sm:visible" : ""}`}>{p.label}</span>
            ))}
          </div>
        </div>
      </div>
      <details className="group/tabel">
        <summary className="cursor-pointer list-none text-[12.5px] font-semibold text-black/45 hover:text-[#312e82] [&::-webkit-details-marker]:hidden">
          <span className="group-open/tabel:hidden">Toon als tabel</span>
          <span className="hidden group-open/tabel:inline">Verberg tabel</span>
        </summary>
        <div className="relative mt-2 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[13px]">
            <thead className="text-[11.5px] uppercase tracking-[0.06em] text-black/40">
              <tr className="border-b border-black/[0.06]">
                <th className="py-2 pr-3 font-semibold">Periode</th>
                {reeksen.map((r) => <th key={r.key} className="px-3 py-2 text-right font-semibold">{r.label}</th>)}
                {gestapeld && reeksen.length > 1 && <th className="py-2 pl-3 text-right font-semibold">{totaalLabel}</th>}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {punten.map((p) => (
                <tr key={p.key} className="border-b border-black/[0.04]">
                  <td className="py-1.5 pr-3 text-black/60">{p.titel || p.label}</td>
                  {reeksen.map((r) => <td key={r.key} className="px-3 py-1.5 text-right text-[#1c1a4e]">{formaat(p.waarden[r.key] || 0)}</td>)}
                  {gestapeld && reeksen.length > 1 && <td className="py-1.5 pl-3 text-right font-semibold text-[#1c1a4e]">{formaat(totaal(p))}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <figcaption className="sr-only">{titel}</figcaption>
    </figure>
  );
}
