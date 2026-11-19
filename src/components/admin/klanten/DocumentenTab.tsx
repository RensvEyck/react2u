"use client";
import Link from "next/link";
import { useState } from "react";
import type { ComponentType } from "react";
import { LuBookOpen, LuClipboardCheck, LuClipboardList, LuDownload, LuExternalLink, LuFileText, LuFilePenLine, LuFiles, LuForward, LuHandshake, LuPaperclip, LuScrollText, LuSignature } from "react-icons/lu";
import type { KlantBestand } from "@/lib/klantBestanden";
import { datumLang } from "@/lib/offertes";
import { DOCUMENT_SOORT_LABEL, documentTelling, type DocumentSoort, type KlantDocument } from "@/lib/stamkaart";
import KlantBestanden from "./KlantBestanden";

/**
 * Het tabblad Documenten: alles van deze klant uit alle modules in één tabel
 * (brochures, offertes, basiscontract met checklist, onboarding met
 * machtigingen en opdracht tot overdracht, klantevaluaties,
 * resellerovereenkomsten en de eigen bestanden), nieuwste eerst, met per rij
 * de pdf en de pagina in het beheer. Daaronder het vak om eigen bestanden te
 * uploaden.
 */

const ICOON: Record<DocumentSoort, ComponentType<{ className?: string }>> = {
  brochure: LuBookOpen,
  offerte: LuFilePenLine,
  contract: LuScrollText,
  checklist: LuClipboardList,
  onboarding: LuClipboardCheck,
  machtiging: LuSignature,
  overdracht: LuForward,
  evaluatie: LuClipboardList,
  reseller: LuHandshake,
  bestand: LuPaperclip,
};

export default function DocumentenTab({ klantId, bedrijf, docs, bestanden, aan }: { klantId: string; bedrijf: string; docs: KlantDocument[]; bestanden: KlantBestand[]; aan: boolean }) {
  const [soort, setSoort] = useState<DocumentSoort | "alle">("alle");
  const telling = documentTelling(docs);
  const rijen = soort === "alle" ? docs : docs.filter((d) => d.soort === soort);

  return (
    <div className="space-y-5">
      <section className="acard overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.06] px-4 py-3 sm:px-6">
          <nav className="flex flex-wrap gap-1.5" aria-label="Soort document">
            <button type="button" onClick={() => setSoort("alle")} aria-pressed={soort === "alle"} className={`apill !py-1.5 text-[13px] ${soort === "alle" ? "bg-[#312e82] text-white" : "bg-black/[0.04] text-black/60 hover:bg-black/[0.07]"}`}>
              Alles <span className={soort === "alle" ? "text-white/70" : "text-black/35"}>{docs.length}</span>
            </button>
            {telling.map((t) => (
              <button key={t.soort} type="button" onClick={() => setSoort(t.soort)} aria-pressed={soort === t.soort} className={`apill !py-1.5 text-[13px] ${soort === t.soort ? "bg-[#312e82] text-white" : "bg-black/[0.04] text-black/60 hover:bg-black/[0.07]"}`}>
                {t.label} <span className={soort === t.soort ? "text-white/70" : "text-black/35"}>{t.aantal}</span>
              </button>
            ))}
          </nav>
          <span className="ml-auto text-[12.5px] text-black/45">{rijen.length} {rijen.length === 1 ? "document" : "documenten"}</span>
        </div>
        {rijen.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef0ff] text-[22px] text-[#312e82]"><LuFiles /></span>
            <p className="text-[14.5px] font-semibold text-[#1c1a4e]">{docs.length === 0 ? "Nog geen documenten" : "Niets van deze soort"}</p>
            {docs.length === 0 && <p className="max-w-[460px] text-[13.5px] text-black/50">Een brochure, offerte, contract, onboarding of klantevaluatie voor {bedrijf} verschijnt hier vanzelf, met de pdf erbij. Eigen bestanden upload je hieronder.</p>}
          </div>
        ) : (
          // `relative`: wat er absoluut in staat blijft binnen de rij, zodat de pagina op een telefoon niet breder wordt dan het scherm.
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[880px] text-[13.5px]">
              <thead>
                <tr className="border-b border-black/[0.06] text-left text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">
                  <th className="px-6 py-3">Document</th>
                  <th className="px-4 py-3">Soort</th>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Openen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {rijen.map((d) => {
                  const Icoon = ICOON[d.soort];
                  return (
                    <tr key={d.key} className="align-top" data-document={d.soort}>
                      <td className="px-6 py-3">
                        <span className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/[0.04] text-[15px] text-black/50"><Icoon /></span>
                          <span className="min-w-0">
                            {d.href ? <Link href={d.href} className="block font-semibold text-[#1c1a4e] hover:text-[#312e82] hover:underline">{d.naam}</Link> : <span className="block font-semibold text-[#1c1a4e]">{d.naam}</span>}
                            {d.door && <span className="block text-[12.5px] text-black/45">{d.soort === "bestand" ? `geüpload door ${d.door}` : d.soort === "checklist" ? `ingevuld door ${d.door}` : `getekend door ${d.door}`}</span>}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-black/60">{DOCUMENT_SOORT_LABEL[d.soort]}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-black/60">{d.datum ? datumLang(d.datum) : "–"}</td>
                      <td className="px-4 py-3"><span className="apill !text-[12px]" style={{ background: d.stand.achter, color: d.stand.kleur }}>{d.stand.label}</span></td>
                      <td className="whitespace-nowrap px-6 py-3 text-right">
                        <span className="inline-flex flex-wrap items-center justify-end gap-1">
                          {d.pdf && (
                            <a href={d.pdf} className="abtn-ghost !px-2.5 !py-1 text-[12.5px]" title={d.soort === "bestand" ? "Download" : "Download de pdf"}>
                              <LuDownload /> {d.soort === "bestand" ? "Download" : "Pdf"}
                            </a>
                          )}
                          {d.extra.map((x) => (
                            <a key={x.href} href={x.href} target="_blank" rel="noopener" className="abtn-ghost !px-2.5 !py-1 text-[12.5px]" title={x.label}>
                              {x.label.includes("pdf") || x.label.includes("Excel") ? <LuFileText /> : <LuExternalLink />} {x.label.replace(/ \((pdf|Excel)\)$/, "")}
                            </a>
                          ))}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="acard p-5 sm:p-6" aria-labelledby="kl-bestanden">
        <h2 id="kl-bestanden" className="font-heading text-[17px] font-bold text-[#312e82]">Eigen bestanden</h2>
        <p className="mt-1 text-[13.5px] text-black/50">Een contract dat op papier is getekend, een brief, een scan: alles wat verder bij {bedrijf} hoort. Alleen collega&apos;s met het salesrecht zien ze.</p>
        <div className="mt-4">
          {aan ? <KlantBestanden klantId={klantId} bedrijf={bedrijf} bestanden={bestanden} /> : <p className="rounded-xl border border-dashed border-black/10 px-4 py-5 text-center text-[13px] text-black/45">Uploaden kan zodra migratie 0048 in Supabase is uitgevoerd.</p>}
        </div>
      </section>
    </div>
  );
}
