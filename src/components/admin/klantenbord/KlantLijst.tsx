"use client";
import { useState } from "react";
import Link from "next/link";
import { LuChevronDown, LuChevronUp, LuIdCard } from "react-icons/lu";
import { actieStand, relatief, statusInfo, STATUS_SLEUTELS, type Klant, type Koppeling } from "@/lib/klanten";
import { datumLang } from "@/lib/offertes";
import { Checklist, Eigenaar, KoppelChip, PartnerChip, StatusPill, type PartnerKort } from "./bits";

type Sorteer = "bedrijf" | "status" | "eigenaar" | "laatste" | "volgende" | "start";

/** De lijstweergave: dezelfde kaarten als tabel, te sorteren per kolom. */
export default function KlantLijst({ klanten, koppelingen, partnerVan, vandaag, open, onOpen }: { klanten: Klant[]; koppelingen: Record<string, Koppeling[]>; partnerVan: Map<string, PartnerKort>; vandaag: string; open: string | null; onOpen: (id: string) => void }) {
  const [sorteer, setSorteer] = useState<Sorteer>("volgende");
  const [oplopend, setOplopend] = useState(true);

  const waarde = (k: Klant): string | number => {
    switch (sorteer) {
      case "bedrijf": return k.bedrijf.toLowerCase();
      case "status": return STATUS_SLEUTELS.indexOf(k.status);
      case "eigenaar": return (k.eigenaar || "zzzz").toLowerCase();
      case "laatste": return k.laatste_contact_op || "0000";
      case "volgende": return k.volgende_actie_op || (k.volgende_actie ? "9998" : "9999");
      case "start": return k.startdatum || "9999";
    }
  };
  const rijen = [...klanten].sort((a, b) => {
    const x = waarde(a);
    const y = waarde(b);
    const r = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
    return oplopend ? r : -r;
  });

  const kop = (key: Sorteer, label: string, extra = "") => {
    const aan = sorteer === key;
    return (
      <th className={`px-4 py-3 ${extra}`} aria-sort={aan ? (oplopend ? "ascending" : "descending") : undefined}>
        <button
          type="button"
          onClick={() => {
            if (aan) setOplopend(!oplopend);
            else {
              setSorteer(key);
              setOplopend(true);
            }
          }}
          className={`inline-flex items-center gap-1 text-[11.5px] font-bold uppercase tracking-[0.08em] ${aan ? "text-[#312e82]" : "text-black/45 hover:text-[#312e82]"}`}
        >
          {label}
          {aan && (oplopend ? <LuChevronUp className="text-[12px]" /> : <LuChevronDown className="text-[12px]" />)}
        </button>
      </th>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-[13.5px]">
        <thead>
          <tr className="border-b border-black/[0.06] text-left">
            {kop("bedrijf", "Bedrijf", "pl-6")}
            {kop("status", "Status")}
            <th className="px-4 py-3 text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">Contact</th>
            {kop("eigenaar", "Eigenaar")}
            {kop("laatste", "Laatste contact")}
            {kop("volgende", "Volgende stap")}
            <th className="px-4 py-3 text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">Traject</th>
            {kop("start", "Start")}
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rijen.map((k) => {
            const actie = actieStand(k, vandaag);
            const kop = koppelingen[k.id] || [];
            return (
              <tr
                key={k.id}
                onClick={() => onOpen(k.id)}
                className={`cursor-pointer border-b border-black/[0.05] align-top last:border-b-0 hover:bg-black/[0.015] ${open === k.id ? "bg-[#f7f7fc]" : ""}`}
              >
                <td className="px-4 py-3 pl-6">
                  <span className="block font-semibold text-[#1c1a4e]">{k.bedrijf}</span>
                  {kop.length > 0 && <span className="mt-1 flex flex-wrap gap-1">{kop.slice(0, 3).map((x) => <KoppelChip key={`${x.soort}-${x.id}`} x={x} />)}</span>}
                </td>
                <td className="px-4 py-3"><StatusPill status={k.status} klein /></td>
                <td className="px-4 py-3 text-black/60">
                  {k.contactpersoon && <span className="block">{k.contactpersoon}</span>}
                  {k.telefoon && <a href={`tel:${k.telefoon.replace(/\s/g, "")}`} onClick={(e) => e.stopPropagation()} className="block text-[12.5px] font-semibold text-[#e75387] hover:underline">{k.telefoon}</a>}
                  {k.email && <a href={`mailto:${k.email}`} onClick={(e) => e.stopPropagation()} className="block truncate text-[12.5px] text-[#e75387] hover:underline">{k.email}</a>}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-black/60"><Eigenaar naam={k.eigenaar} />{k.eigenaar}</span>
                  {k.partner_id && partnerVan.get(k.partner_id) && <span className="mt-1 block"><PartnerChip p={partnerVan.get(k.partner_id)!} klein /></span>}
                </td>
                <td className="px-4 py-3 text-black/60">
                  {k.laatste_contact_op ? (
                    <>
                      <span className="block text-[12.5px] font-semibold text-black/45">{relatief(k.laatste_contact_op, vandaag)}</span>
                      <span className="block max-w-[260px] truncate" title={k.laatste_contact || ""}>{k.laatste_contact}</span>
                    </>
                  ) : k.stand ? (
                    <span className="block max-w-[260px] truncate" title={k.stand}>{k.stand}</span>
                  ) : (
                    <span className="text-black/30">nog niets</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {k.volgende_actie && <span className="block font-semibold text-[#1c1a4e]">{k.volgende_actie}</span>}
                  {k.volgende_actie_op && (
                    <span className={`inline-block whitespace-nowrap rounded-full px-1.5 py-px text-[11.5px] font-semibold ${actie === "te_laat" ? "bg-[#fdeef4] text-[#e0356b]" : actie === "vandaag" ? "bg-[#fff4e5] text-[#b86e00]" : "bg-black/[0.05] text-black/55"}`}>
                      {actie === "te_laat" ? "Te laat: " : ""}{relatief(k.volgende_actie_op, vandaag)}
                    </span>
                  )}
                  {!k.volgende_actie && !k.volgende_actie_op && <span className="text-black/30">geen</span>}
                </td>
                <td className="px-4 py-3"><Checklist k={k} /></td>
                <td className="px-4 py-3 text-black/60">{k.startdatum ? datumLang(k.startdatum) : <span className="text-black/30">{statusInfo(k.status).key === "klant" ? "onbekend" : ""}</span>}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/klanten/${k.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 whitespace-nowrap text-[12.5px] font-semibold text-[#312e82] hover:underline" title="Stamkaart: bedrijfsgegevens, documenten en tariefafspraken">
                    <LuIdCard className="text-[14px]" /> Stamkaart
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
