"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LuCheck, LuCopy, LuExternalLink, LuPencil, LuSparkles, LuX } from "react-icons/lu";
import { statusInfo, type Klant } from "@/lib/klanten";
import { herkomstLabel } from "@/lib/herkomst";
import { datumLang } from "@/lib/offertes";
import { STAMKAART, stamkaartVolledigheid, veldWaarde, type StamkaartInvoer, type StamkaartVeld, type VeldDef, type Voorstel } from "@/lib/stamkaart";
import { neemVoorstelOver, wijzigStamkaart } from "@/app/admin/stamkaartActions";
import { StatusPill } from "@/components/admin/klantenbord/bits";

/**
 * Het tabblad Stamkaart: de bedrijfsgegevens in vijf blokken, met voor elk
 * leeg veld wat de modules erover weten (offerte, contract, onboarding,
 * bellijst, bedrijfsherkenning) en één knop om dat over te nemen. Bewerken
 * zet alle velden in een formulier; opslaan zet alleen wat veranderde in de
 * tijdlijn.
 */
export default function StamkaartTab({ klant: k, voorstel, aan }: { klant: Klant; voorstel: Voorstel[]; aan: boolean }) {
  const router = useRouter();
  const [bezig, start] = useTransition();
  const [bewerken, setBewerken] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries(STAMKAART.flatMap((g) => g.velden).map((v) => [v.key, veldWaarde(k, v.key)])));
  const v = stamkaartVolledigheid(k);
  const perVeld = new Map(voorstel.map((x) => [x.veld, x]));

  const doe = (fn: () => Promise<{ ok: boolean; fout?: string }>, na: () => void) => {
    setFout(null);
    setMelding(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) return setFout(r.fout || "Er ging iets mis.");
      na();
      router.refresh();
    });
  };

  const opslaan = () =>
    doe(
      () => wijzigStamkaart(k.id, form as StamkaartInvoer),
      () => {
        setBewerken(false);
        setMelding("Stamkaart opgeslagen.");
      },
    );

  const neemOver = (lijst: Voorstel[]) =>
    doe(
      () => neemVoorstelOver(k.id, lijst.map((x) => ({ veld: x.veld, waarde: x.waarde, bron: x.bron }))),
      () => setMelding(lijst.length === 1 ? `${veldLabel(lijst[0].veld)} overgenomen uit ${lijst[0].bron}.` : `${lijst.length} gegevens overgenomen uit de modules.`),
    );

  const begin = () => {
    setForm(Object.fromEntries(STAMKAART.flatMap((g) => g.velden).map((x) => [x.key, veldWaarde(k, x.key)])));
    setFout(null);
    setMelding(null);
    setBewerken(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Ring ingevuld={v.ingevuld} totaal={v.totaal} />
          <div>
            <p className="text-[14px] font-semibold text-[#1c1a4e]">{v.ingevuld === v.totaal ? "Stamkaart compleet" : `Stamkaart ${v.ingevuld} van ${v.totaal}`}</p>
            <p className="text-[12.5px] text-black/45">{v.ontbreekt.length ? `Nog zonder ${v.ontbreekt.map((x) => x.toLowerCase()).join(", ")}` : "KvK, adres, contactpersoon en facturatie zijn bekend"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {melding && <span role="status" className="text-[13px] font-semibold text-[#0a7a4b]">{melding}</span>}
          {bewerken ? (
            <>
              <button type="button" onClick={() => setBewerken(false)} disabled={bezig} className="abtn-ghost !py-1.5 text-[13px]"><LuX /> Annuleren</button>
              <button type="button" onClick={opslaan} disabled={bezig} className="abtn !py-1.5 text-[13px]"><LuCheck /> {bezig ? "Opslaan…" : "Opslaan"}</button>
            </>
          ) : (
            <button type="button" onClick={begin} disabled={!aan} className="abtn-ghost !py-1.5 text-[13px]" title={aan ? undefined : "Eerst migratie 0048 uitvoeren"}><LuPencil /> Bewerken</button>
          )}
        </div>
      </div>

      {fout && <p role="alert" className="rounded-xl bg-[#fdeef4] px-4 py-2.5 text-[13.5px] font-semibold text-[#e0356b]">{fout}</p>}

      {!bewerken && voorstel.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#312e82]/15 bg-[#eef0ff] px-5 py-4" data-voorstel={voorstel.length}>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[17px] text-[#312e82]"><LuSparkles /></span>
            <div>
              <p className="text-[14px] font-semibold text-[#1c1a4e]">{voorstel.length === 1 ? "Eén gegeven" : `${voorstel.length} gegevens`} al bekend uit de modules</p>
              <p className="text-[12.5px] text-black/55">
                {samenvatBronnen(voorstel)}. Ze staan hieronder in grijs bij het veld; neem ze in één keer over, dan hoeft niemand ze opnieuw te typen.
              </p>
            </div>
          </div>
          <button type="button" onClick={() => neemOver(voorstel)} disabled={bezig} className="abtn !py-1.5 text-[13px]"><LuSparkles /> Alles overnemen</button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {STAMKAART.map((g) => (
          <section key={g.key} className={`acard p-5 ${g.key === "adres" || g.key === "facturatie" ? "" : ""}`} aria-labelledby={`sk-${g.key}`}>
            <h2 id={`sk-${g.key}`} className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">{g.titel}</h2>
            <p className="mt-0.5 text-[12.5px] text-black/40">{g.uitleg}</p>
            {bewerken ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {g.velden.map((def) => (
                  <div key={def.key} className={def.half ? "" : "sm:col-span-2"}>
                    <label className="alabel" htmlFor={`sk-${def.key}`}>{def.label}</label>
                    <input
                      id={`sk-${def.key}`}
                      className="ainput !py-2 !text-[14px]"
                      type={def.type === "number" ? "number" : def.type === "date" ? "date" : "text"}
                      inputMode={def.type === "tel" || def.type === "number" ? "tel" : def.type === "email" ? "email" : undefined}
                      value={form[def.key] ?? ""}
                      placeholder={perVeld.get(def.key)?.waarde || def.hint || ""}
                      onChange={(e) => setForm((f) => ({ ...f, [def.key]: e.target.value }))}
                    />
                    {perVeld.get(def.key) && !form[def.key] && (
                      <button type="button" onClick={() => setForm((f) => ({ ...f, [def.key]: perVeld.get(def.key)!.waarde }))} className="mt-1 text-[12px] font-semibold text-[#312e82] hover:underline">
                        Gebruik {perVeld.get(def.key)!.waarde} uit {perVeld.get(def.key)!.bron}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <dl className="mt-3 divide-y divide-black/[0.05]">
                {g.velden.map((def) => {
                  const waarde = veldWaarde(k, def.key);
                  const vs = perVeld.get(def.key);
                  return (
                    <div key={def.key} className="grid grid-cols-[minmax(0,140px)_1fr] gap-3 py-2 text-[14px] sm:grid-cols-[180px_1fr]">
                      <dt className="text-black/50">{def.label}</dt>
                      <dd className="min-w-0 break-words text-[#1c1a4e]" data-veld={def.key}>
                        {waarde ? (
                          <Waarde def={def} waarde={waarde} />
                        ) : vs ? (
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="italic text-black/40">{def.type === "date" ? datumLang(vs.waarde) : vs.waarde}</span>
                            <span className="text-[12px] text-black/40">
                              uit {vs.href ? <Link href={vs.href} className="underline hover:text-[#312e82]">{vs.bron}</Link> : vs.bron}
                            </span>
                            <button type="button" onClick={() => neemOver([vs])} disabled={bezig} className="rounded-full bg-[#eef0ff] px-2 py-0.5 text-[12px] font-semibold text-[#312e82] hover:bg-[#312e82] hover:text-white">
                              Overnemen
                            </button>
                          </span>
                        ) : (
                          <span className="text-black/25">–</span>
                        )}
                      </dd>
                    </div>
                  );
                })}
                {g.key === "react2u" && (
                  <>
                    <div className="grid grid-cols-[minmax(0,140px)_1fr] gap-3 py-2 text-[14px] sm:grid-cols-[180px_1fr]">
                      <dt className="text-black/50">Status op het bord</dt>
                      <dd className="flex flex-wrap items-center gap-2"><StatusPill status={k.status} klein /><span className="text-[12.5px] text-black/45">{statusInfo(k.status).uitleg}</span></dd>
                    </div>
                    <div className="grid grid-cols-[minmax(0,140px)_1fr] gap-3 py-2 text-[14px] sm:grid-cols-[180px_1fr]">
                      <dt className="text-black/50">Herkomst</dt>
                      <dd className="text-[#1c1a4e]">{k.herkomst ? `${herkomstLabel(k.herkomst)}${k.herkomst_toelichting ? ` (${k.herkomst_toelichting})` : ""}` : k.bron ? `via ${k.bron}` : <span className="text-black/25">–</span>}</dd>
                    </div>
                    <div className="py-2 text-[12.5px] text-black/45">
                      Status, herkomst, de volgende stap en het instaptraject wijzig je{" "}
                      <Link href={`/admin/klantenbord#klant-${k.id}`} className="inline-flex items-center gap-0.5 font-semibold text-[#312e82] hover:underline">op het bord <LuExternalLink className="text-[11px]" /></Link>.
                    </div>
                  </>
                )}
              </dl>
            )}
          </section>
        ))}
      </div>

      {k.notitie && !bewerken && (
        <section className="acard p-5">
          <h2 className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">Notitie van het bord</h2>
          <p className="mt-2 whitespace-pre-wrap text-[14px] text-[#1c1a4e]">{k.notitie}</p>
        </section>
      )}
    </div>
  );
}

function veldLabel(veld: StamkaartVeld): string {
  return STAMKAART.flatMap((g) => g.velden).find((x) => x.key === veld)?.label || veld;
}

/** "uit offerte O2026-0012, contract C2026-0003 en de onboarding" */
function samenvatBronnen(voorstel: Voorstel[]): string {
  const bronnen = [...new Set(voorstel.map((x) => x.bron))];
  const kort = bronnen.slice(0, 3);
  const rest = bronnen.length - kort.length;
  const tekst = kort.length <= 1 ? kort.join("") : `${kort.slice(0, -1).join(", ")} en ${kort[kort.length - 1]}`;
  return `Uit ${tekst}${rest > 0 ? ` en ${rest} ${rest === 1 ? "andere bron" : "andere bronnen"}` : ""}`;
}

function Waarde({ def, waarde }: { def: VeldDef; waarde: string }) {
  if (def.key === "website") {
    return <a href={waarde} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-medium text-[#312e82] hover:underline">{waarde.replace(/^https?:\/\//, "").replace(/\/$/, "")} <LuExternalLink className="text-[11px]" /></a>;
  }
  if (def.type === "email") return <span className="inline-flex flex-wrap items-center gap-1.5"><a href={`mailto:${waarde}`} className="font-medium text-[#e75387] hover:underline">{waarde}</a>{def.kopieer && <Kopieer tekst={waarde} />}</span>;
  if (def.type === "tel") return <a href={`tel:${waarde.replace(/\s/g, "")}`} className="font-medium text-[#e75387] hover:underline">{waarde}</a>;
  if (def.type === "date") return <>{datumLang(waarde)}</>;
  if (def.key === "iban") return <span className="inline-flex flex-wrap items-center gap-1.5"><span className="font-mono text-[13.5px]">{waarde.replace(/(.{4})/g, "$1 ").trim()}</span><Kopieer tekst={waarde} /></span>;
  if (def.kopieer) return <span className="inline-flex flex-wrap items-center gap-1.5"><span className="font-medium">{waarde}</span><Kopieer tekst={waarde} /></span>;
  return <span className="font-medium">{waarde}</span>;
}

function Kopieer({ tekst }: { tekst: string }) {
  const [klaar, setKlaar] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(tekst);
          setKlaar(true);
          setTimeout(() => setKlaar(false), 1600);
        } catch {
          // Geen klembord: dan selecteert iemand het zelf.
        }
      }}
      className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[12px] transition ${klaar ? "bg-[#e3f6ed] text-[#0a7a4b]" : "text-black/35 hover:bg-black/[0.06] hover:text-[#312e82]"}`}
      aria-label={klaar ? "Gekopieerd" : `Kopieer ${tekst}`}
      title={klaar ? "Gekopieerd" : "Kopieer"}
    >
      {klaar ? <LuCheck /> : <LuCopy />}
    </button>
  );
}

/** Een ring die laat zien hoe compleet de stamkaart is. */
function Ring({ ingevuld, totaal }: { ingevuld: number; totaal: number }) {
  const r = 17;
  const omtrek = 2 * Math.PI * r;
  const deel = totaal ? ingevuld / totaal : 0;
  const kleur = deel >= 1 ? "#0a7a4b" : deel >= 0.5 ? "#b86e00" : "#e0356b";
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true" className="shrink-0 -rotate-90">
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(13,13,40,0.08)" strokeWidth="4" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={kleur} strokeWidth="4" strokeLinecap="round" strokeDasharray={omtrek} strokeDashoffset={omtrek * (1 - deel)} />
    </svg>
  );
}
