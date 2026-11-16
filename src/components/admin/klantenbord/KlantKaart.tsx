"use client";
import { LuCalendarClock, LuMail, LuMessageSquare, LuPhone, LuSparkles, LuUserRound } from "react-icons/lu";
import { actieStand, KLANT_STATUS, relatief, statusHint, type Klant, type KlantStatus, type Koppeling } from "@/lib/klanten";
import { Checklist, Eigenaar, KoppelChip } from "./bits";

/**
 * Eén kaart op het bord: het bedrijf, wie je daar spreekt, het laatste contact,
 * de volgende stap en onderaan de vinkjes en wat er in de andere modules van
 * deze klant staat. Slepen naar een andere kolom, of de status kiezen in het
 * menu (op een telefoon, of met het toetsenbord).
 */
export default function KlantKaart({
  k, koppelingen, vandaag, open, onOpen, onStatus, sleept, onSleep,
}: {
  k: Klant;
  koppelingen: Koppeling[];
  vandaag: string;
  open: boolean;
  onOpen: () => void;
  onStatus: (status: KlantStatus) => void;
  sleept: boolean;
  onSleep: (id: string | null) => void;
}) {
  const actie = actieStand(k, vandaag);
  const hint = statusHint(k, koppelingen);
  const actieKleur =
    actie === "te_laat" ? "bg-[#fdeef4] text-[#e0356b]" : actie === "vandaag" ? "bg-[#fff4e5] text-[#b86e00]" : "bg-black/[0.05] text-black/60";

  return (
    <article
      id={`klant-${k.id}`}
      draggable
      tabIndex={0}
      role="button"
      aria-label={`${k.bedrijf}, ${KLANT_STATUS.find((s) => s.key === k.status)?.label}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", k.id);
        e.dataTransfer.effectAllowed = "move";
        onSleep(k.id);
      }}
      onDragEnd={() => onSleep(null)}
      className={`kb-kaart group cursor-pointer rounded-[14px] border bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(18,16,60,0.04)] transition hover:-translate-y-px hover:shadow-[0_8px_20px_-12px_rgba(18,16,60,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e75387] ${
        open ? "border-[#312e82] ring-1 ring-[#312e82]" : "border-black/[0.07]"
      } ${sleept ? "opacity-40" : ""} ${actie === "te_laat" ? "border-l-[3px] border-l-[#e75387]" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 truncate text-[14.5px] font-bold leading-tight text-[#1c1a4e]">{k.bedrijf}</h3>
        <Eigenaar naam={k.eigenaar} />
      </div>

      {(k.contactpersoon || k.telefoon || k.email) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-black/55">
          {k.contactpersoon && <span className="inline-flex items-center gap-1 truncate"><LuUserRound className="shrink-0 text-[12px] text-black/35" />{k.contactpersoon}</span>}
          {(k.telefoon || k.email) && (
            <span className="inline-flex items-center gap-2.5">
              {k.telefoon && (
                <a href={`tel:${k.telefoon.replace(/\s/g, "")}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-[#e75387] hover:underline">
                  <LuPhone className="text-[12px]" />{k.telefoon}
                </a>
              )}
              {k.email && (
                <a href={`mailto:${k.email}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[#e75387] hover:underline" title={k.email}>
                  <LuMail className="text-[13px]" /><span className="sr-only">{k.email}</span>
                </a>
              )}
            </span>
          )}
        </div>
      )}

      <div className="mt-2.5 space-y-1.5 text-[12.5px]">
        {k.laatste_contact_op ? (
          <p className="flex items-start gap-1.5 text-black/60" title={k.laatste_contact || undefined}>
            <LuMessageSquare className="mt-0.5 shrink-0 text-[12px] text-black/35" />
            <span className="min-w-0">
              <span className="font-semibold text-black/45">{relatief(k.laatste_contact_op, vandaag)}</span>
              {k.laatste_contact && <span className="block truncate">{k.laatste_contact}</span>}
            </span>
          </p>
        ) : k.stand ? (
          <p className="flex items-start gap-1.5 text-black/60" title={k.stand}>
            <LuMessageSquare className="mt-0.5 shrink-0 text-[12px] text-black/35" />
            <span className="line-clamp-2">{k.stand}</span>
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-black/35"><LuMessageSquare className="text-[12px]" /> Nog geen gesprek vastgelegd</p>
        )}
        {(k.volgende_actie || k.volgende_actie_op) && (
          <p className="flex items-start gap-1.5">
            <LuCalendarClock className={`mt-0.5 shrink-0 text-[12px] ${actie === "te_laat" ? "text-[#e0356b]" : actie === "vandaag" ? "text-[#b86e00]" : "text-black/35"}`} />
            <span className="min-w-0 flex-1">
              {k.volgende_actie && <span className="block truncate font-semibold text-[#1c1a4e]">{k.volgende_actie}</span>}
              {k.volgende_actie_op && (
                <span className={`mt-0.5 inline-block rounded-full px-1.5 py-px text-[11px] font-semibold ${actieKleur}`}>
                  {actie === "te_laat" ? `Te laat: ${relatief(k.volgende_actie_op, vandaag)}` : relatief(k.volgende_actie_op, vandaag)}
                </span>
              )}
            </span>
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.05] pt-2.5">
        <Checklist k={k} />
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
          {koppelingen.slice(0, 3).map((x) => <KoppelChip key={`${x.soort}-${x.id}`} x={x} />)}
          {koppelingen.length > 3 && <span className="text-[11px] text-black/40">+{koppelingen.length - 3}</span>}
        </div>
      </div>

      {hint && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStatus(hint);
          }}
          className="mt-2.5 inline-flex w-full items-center gap-1.5 rounded-[10px] bg-[#f7f7fc] px-2.5 py-1.5 text-left text-[12px] font-semibold text-[#312e82] hover:bg-[#eef0ff]"
          title="Dat zeggen de offertes en contracten van deze klant. Klik om de kaart te verplaatsen."
        >
          <LuSparkles className="shrink-0 text-[13px] text-[#e75387]" />
          Zet op {KLANT_STATUS.find((s) => s.key === hint)?.label}?
        </button>
      )}

      <label className="sr-only" htmlFor={`status-${k.id}`}>Status van {k.bedrijf}</label>
      <select
        id={`status-${k.id}`}
        value={k.status}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onChange={(e) => onStatus(e.target.value as KlantStatus)}
        className="mt-2 w-full cursor-pointer rounded-[10px] border border-black/[0.08] bg-white px-2 py-1 text-[12px] font-semibold text-black/55 focus:border-[#312e82] focus:outline-none sm:hidden"
      >
        {KLANT_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
    </article>
  );
}
