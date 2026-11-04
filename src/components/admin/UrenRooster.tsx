"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import { LuCheck, LuCopy, LuLoaderCircle, LuTriangleAlert } from "react-icons/lu";
import { urenBewaren } from "@/app/admin/omzetActions";
import { beschikbaar, declarabiliteit, groepsnorm, leesUren, oordeel, urenTekst } from "@/lib/uren";
import { OordeelPil } from "./UrenBits";

/**
 * Het urenrooster: per medewerker per week de declarabele uren en de uren
 * afwezig, als een spreadsheet. Elk vakje bewaart zichzelf bij het verlaten
 * (urenBewaren); Enter gaat een rij omlaag. De percentages rekenen meteen mee,
 * per vakje, per medewerker en voor het team.
 */

export type RoosterWeek = { week: string; nummer: number; bereik: string; nu: boolean };
export type RoosterMedewerker = { id: string; naam: string; functie: string | null; contracturen: number; norm: number };
type Waarde = { declarabel: string; afwezig: string };
type Status = "bezig" | "ok" | { fout: string };

const sleutel = (m: string, w: string) => `${m}|${w}`;

export default function UrenRooster({
  weken, medewerkers, begin,
}: {
  weken: RoosterWeek[];
  medewerkers: RoosterMedewerker[];
  begin: Record<string, { declarabel: number; afwezig: number }>;
}) {
  const [waarden, setWaarden] = useState<Record<string, Waarde>>(() =>
    Object.fromEntries(Object.entries(begin).map(([k, v]) => [k, { declarabel: urenTekst(v.declarabel), afwezig: v.afwezig ? urenTekst(v.afwezig) : "" }]))
  );
  const bewaard = useRef<Record<string, Waarde>>({ ...waarden });
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [, start] = useTransition();
  const raster = useRef<HTMLTableElement>(null);

  const waarde = (k: string): Waarde => waarden[k] ?? { declarabel: "", afwezig: "" };

  function bewaar(m: string, w: string, nieuw?: Waarde) {
    const k = sleutel(m, w);
    const v = nieuw ?? waarde(k);
    const oud = bewaard.current[k] ?? { declarabel: "", afwezig: "" };
    if (v.declarabel.trim() === oud.declarabel.trim() && v.afwezig.trim() === oud.afwezig.trim()) return;
    if (leesUren(v.declarabel) === null || leesUren(v.afwezig) === null) {
      setStatus((s) => ({ ...s, [k]: { fout: "Vul uren in als getal, bijvoorbeeld 7,5." } }));
      return;
    }
    setStatus((s) => ({ ...s, [k]: "bezig" }));
    start(async () => {
      const r = await urenBewaren(m, w, v.declarabel, v.afwezig);
      if (r.ok) {
        const netjes = !v.declarabel.trim() && !v.afwezig.trim() ? { declarabel: "", afwezig: "" } : { declarabel: urenTekst(r.declarabel), afwezig: r.afwezig ? urenTekst(r.afwezig) : "" };
        bewaard.current[k] = netjes;
        setWaarden((x) => ({ ...x, [k]: netjes }));
        setStatus((s) => ({ ...s, [k]: "ok" }));
      } else {
        setStatus((s) => ({ ...s, [k]: { fout: r.fout } }));
      }
    });
  }

  function zet(m: string, w: string, veld: keyof Waarde, tekst: string) {
    const k = sleutel(m, w);
    setWaarden((x) => ({ ...x, [k]: { ...waarde(k), [veld]: tekst } }));
    setStatus((s) => {
      if (!s[k] || s[k] === "bezig") return s;
      const rest = { ...s };
      delete rest[k];
      return rest;
    });
  }

  /** Enter: hetzelfde veld een rij lager (of de eerste rij van de volgende week). */
  function volgende(e: React.KeyboardEvent<HTMLInputElement>, rij: number, kolom: number, veld: keyof Waarde) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const doel = rij + 1 < medewerkers.length ? [rij + 1, kolom] : [0, kolom + 1];
    raster.current?.querySelector<HTMLInputElement>(`input[data-plek="${doel[0]}-${doel[1]}-${veld}"]`)?.focus();
  }

  /** Lege vakjes van deze week vullen met die van de week ervoor, en bewaren. */
  function alsVorige(kolom: number) {
    const w = weken[kolom].week;
    const vorig = weken[kolom - 1].week;
    for (const m of medewerkers) {
      const hier = waarde(sleutel(m.id, w));
      const daar = waarde(sleutel(m.id, vorig));
      if ((hier.declarabel.trim() || hier.afwezig.trim()) || !(daar.declarabel.trim() || daar.afwezig.trim())) continue;
      setWaarden((x) => ({ ...x, [sleutel(m.id, w)]: daar }));
      bewaar(m.id, w, daar);
    }
  }

  const reken = useMemo(() => {
    const cel = (m: RoosterMedewerker, w: string) => {
      const v = waarden[sleutel(m.id, w)];
      const d = leesUren(v?.declarabel ?? "");
      const a = leesUren(v?.afwezig ?? "");
      const ingevuld = Boolean(v && (v.declarabel.trim() || v.afwezig.trim())) && d !== null && a !== null;
      const b = beschikbaar(m.contracturen, a ?? 0);
      return { ingevuld, d: d ?? 0, b, procent: ingevuld ? declarabiliteit(d ?? 0, b) : null };
    };
    const rij = (m: RoosterMedewerker) => {
      const cellen = weken.map((w) => cel(m, w.week)).filter((c) => c.ingevuld);
      const d = cellen.reduce((s, c) => s + c.d, 0);
      const b = cellen.reduce((s, c) => s + c.b, 0);
      return { d, b, procent: cellen.length ? declarabiliteit(d, b) : null };
    };
    const kolom = (w: string) => {
      const cellen = medewerkers.map((m) => cel(m, w)).filter((c) => c.ingevuld);
      const d = cellen.reduce((s, c) => s + c.d, 0);
      const b = cellen.reduce((s, c) => s + c.b, 0);
      return { d, b, procent: cellen.length ? declarabiliteit(d, b) : null, ingevuld: cellen.length };
    };
    return { cel, rij, kolom };
  }, [waarden, weken, medewerkers]);

  const norm = groepsnorm(medewerkers);

  if (!medewerkers.length) {
    return <p className="px-6 py-10 text-center text-[14px] text-black/45">Nog geen actieve medewerkers. Voeg ze hieronder toe.</p>;
  }

  return (
    // relative: anders ontsnapt een absoluut tekstje (sr-only) aan de scrollbak en wordt de pagina breder.
    <div className="relative overflow-x-auto">
      <table ref={raster} className="w-full min-w-[860px] border-separate border-spacing-0 text-[13.5px]">
        <thead>
          <tr className="text-left text-[11.5px] uppercase tracking-[0.06em] text-black/40">
            <th className="sticky left-0 z-10 min-w-[190px] border-b border-black/[0.06] bg-white px-5 py-2.5 font-semibold">Medewerker</th>
            {weken.map((w, i) => (
              <th key={w.week} className={`border-b border-black/[0.06] px-2 py-2.5 text-center font-semibold ${w.nu ? "bg-[#f7f7fc]" : ""}`}>
                <span className={`block ${w.nu ? "text-[#312e82]" : ""}`}>Week {w.nummer}</span>
                <span className="block text-[11px] font-normal normal-case tracking-normal text-black/35">{w.bereik}</span>
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => alsVorige(i)}
                    className="mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold normal-case tracking-normal text-black/35 hover:bg-black/[0.05] hover:text-[#312e82]"
                    title="Lege vakjes in deze week vullen met de uren van de week ervoor"
                  >
                    <LuCopy className="text-[10px]" /> als vorige
                  </button>
                )}
              </th>
            ))}
            <th className="whitespace-nowrap border-b border-black/[0.06] px-4 py-2.5 text-right font-semibold">Deze weken</th>
          </tr>
        </thead>
        <tbody>
          {medewerkers.map((m, r) => {
            const tot = reken.rij(m);
            return (
              <tr key={m.id}>
                <th scope="row" className="sticky left-0 z-10 border-b border-black/[0.04] bg-white px-5 py-2 text-left font-normal">
                  <span className="block font-semibold text-[#1c1a4e]">{m.naam}</span>
                  <span className="block text-[11.5px] text-black/40">{[m.functie, `${urenTekst(m.contracturen)} u/wk`, `norm ${m.norm}%`].filter(Boolean).join(" · ")}</span>
                </th>
                {weken.map((w, kol) => {
                  const k = sleutel(m.id, w.week);
                  const v = waarde(k);
                  const c = reken.cel(m, w.week);
                  const st = status[k];
                  const fout = typeof st === "object" ? st.fout : null;
                  return (
                    <td key={w.week} className={`border-b border-black/[0.04] px-1.5 py-1.5 align-top ${w.nu ? "bg-[#f7f7fc]" : ""}`}>
                      <div className={`rounded-xl border bg-white p-1 transition ${fout ? "border-[#b42318]/50" : "border-black/[0.08] focus-within:border-[#312e82]"}`} title={fout ?? undefined}>
                        <div className="flex items-center gap-1">
                          <input
                            data-plek={`${r}-${kol}-declarabel`}
                            aria-label={`Declarabele uren ${m.naam}, week ${w.nummer}`}
                            inputMode="decimal"
                            autoComplete="off"
                            value={v.declarabel}
                            onChange={(e) => zet(m.id, w.week, "declarabel", e.target.value)}
                            onBlur={() => bewaar(m.id, w.week)}
                            onKeyDown={(e) => volgende(e, r, kol, "declarabel")}
                            placeholder="–"
                            className="w-full min-w-0 rounded-lg px-1.5 py-1 text-right text-[14px] font-semibold tabular-nums text-[#1c1a4e] outline-none placeholder:text-black/20"
                          />
                          <span className="w-4 shrink-0 text-center text-[11px]" aria-hidden>
                            {st === "bezig" ? <LuLoaderCircle className="animate-spin text-black/30" />
                              : st === "ok" ? <LuCheck className="text-[#0a7a4b]" />
                              : fout ? <LuTriangleAlert className="text-[#b42318]" /> : null}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1 px-1">
                          <label className="flex items-center gap-1 text-[10.5px] text-black/35">
                            afw.
                            <input
                              data-plek={`${r}-${kol}-afwezig`}
                              aria-label={`Uren afwezig ${m.naam}, week ${w.nummer} (verlof, ziekte, feestdag)`}
                              inputMode="decimal"
                              autoComplete="off"
                              value={v.afwezig}
                              onChange={(e) => zet(m.id, w.week, "afwezig", e.target.value)}
                              onBlur={() => bewaar(m.id, w.week)}
                              onKeyDown={(e) => volgende(e, r, kol, "afwezig")}
                              placeholder="0"
                              className="w-9 rounded px-1 py-0.5 text-right text-[11.5px] tabular-nums text-black/60 outline-none placeholder:text-black/20 focus:bg-black/[0.04]"
                            />
                          </label>
                          {c.procent !== null && <OordeelPil procent={c.procent} oordeel={oordeel(c.procent, m.norm)} klein />}
                        </div>
                      </div>
                    </td>
                  );
                })}
                <td className="border-b border-black/[0.04] px-4 py-2 text-right align-middle tabular-nums">
                  {tot.procent === null ? (
                    <span className="text-[12px] text-black/30">–</span>
                  ) : (
                    <>
                      <OordeelPil procent={tot.procent} oordeel={oordeel(tot.procent, m.norm)} />
                      <span className="mt-0.5 block whitespace-nowrap text-[11.5px] text-black/40">{urenTekst(tot.d)} van {urenTekst(tot.b)} u</span>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="text-[12.5px]">
            <th scope="row" className="sticky left-0 z-10 bg-[#fafafd] px-5 py-2.5 text-left font-semibold text-[#1c1a4e]">
              Team{norm !== null && <span className="ml-1 font-normal text-black/40">· norm {norm}%</span>}
            </th>
            {weken.map((w) => {
              const k = reken.kolom(w.week);
              return (
                <td key={w.week} className="bg-[#fafafd] px-2 py-2.5 text-center tabular-nums">
                  {k.procent === null ? (
                    <span className="text-black/30">–</span>
                  ) : (
                    <>
                      <OordeelPil procent={k.procent} oordeel={norm === null ? null : oordeel(k.procent, norm)} />
                      <span className="mt-0.5 block text-[11px] text-black/40">{urenTekst(k.d)} u · {k.ingevuld}/{medewerkers.length}</span>
                    </>
                  )}
                </td>
              );
            })}
            <td className="bg-[#fafafd]" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
