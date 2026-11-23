"use client";
import Link from "next/link";
import { LuCalendarClock, LuIdCard, LuMail, LuMessageSquare, LuPhone, LuUserRound } from "react-icons/lu";
import { actieStand, KLANT_STATUS, relatief, relatiefMoment, type Bezoek, type Klant, type KlantStatus, type Koppeling } from "@/lib/klanten";
import { noteerBel } from "@/lib/belAfloop";
import { Checklist, Eigenaar, KoppelChip, PartnerChip, SiteIcoon, type PartnerKort } from "./bits";
import type { DekkingPil } from "@/lib/waarneming";
import WaarnemingPil from "@/components/admin/waarneming/WaarnemingPil";

/**
 * Eén kaart op het bord: het bedrijf, wie je daar spreekt, het laatste contact,
 * de volgende stap en onderaan de vinkjes en wat er in de andere modules van
 * deze klant staat, en of het bedrijf de laatste dagen op de site was. Slepen
 * naar een andere kolom, of de status kiezen in het menu (op een telefoon, of
 * met het toetsenbord). Verplaatsen op wat er in de modules gebeurt doet de
 * database zelf (0041).
 */
export default function KlantKaart({
  k, koppelingen, bezoek, partner, waarneming, vandaag, open, onOpen, onStatus, sleept, onSleep,
}: {
  k: Klant;
  koppelingen: Koppeling[];
  bezoek: Bezoek | null;
  /** De reseller of partner die deze klant aanbracht (0052). */
  partner: PartnerKort | null;
  /** Waarneming (0057): wie er nu of straks voor deze klant is; null als de casemanager er gewoon is. */
  waarneming: DekkingPil | null;
  vandaag: string;
  open: boolean;
  onOpen: () => void;
  onStatus: (status: KlantStatus) => void;
  sleept: boolean;
  onSleep: (id: string | null) => void;
}) {
  const actie = actieStand(k, vandaag);
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
        <span className="flex shrink-0 items-center gap-1.5">
          {/* Zonder herkomst (0047) weet niemand waar deze klant vandaan kwam; het paneel vraagt erom. */}
          {!k.herkomst && <span className="rounded-full bg-[#fff4e5] px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#b86e00]" title="Hoe vond deze klant ons? Vul de herkomst in via het paneel.">herkomst?</span>}
          <Eigenaar naam={k.eigenaar} />
          {/* De stamkaart (0048): bedrijfsgegevens, documenten en tariefafspraken; zichtbaar als je over de kaart gaat. */}
          <Link
            href={`/admin/klanten/${k.id}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="kb-stamkaart inline-flex h-6 w-6 items-center justify-center rounded-full text-black/35 transition hover:bg-[#eef0ff] hover:text-[#312e82] focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            aria-label={`Stamkaart van ${k.bedrijf}`}
            title="Stamkaart"
          >
            <LuIdCard className="text-[14px]" />
          </Link>
        </span>
      </div>

      {partner && <div className="mt-1.5"><PartnerChip p={partner} klein /></div>}
      {waarneming && <div className="mt-1.5"><WaarnemingPil pil={waarneming} klein stopKlik /></div>}

      {(k.contactpersoon || k.telefoon || k.email) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-black/55">
          {k.contactpersoon && <span className="inline-flex items-center gap-1 truncate"><LuUserRound className="shrink-0 text-[12px] text-black/35" />{k.contactpersoon}</span>}
          {(k.telefoon || k.email) && (
            <span className="inline-flex items-center gap-2.5">
              {k.telefoon && (
                <a href={`tel:${k.telefoon.replace(/\s/g, "")}`} onClick={(e) => { e.stopPropagation(); noteerBel({ id: k.id, bedrijf: k.bedrijf, naam: k.contactpersoon }); }} className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-[#e75387] hover:underline">
                  <LuPhone className="text-[12px]" />{k.telefoon}
                </a>
              )}
              {k.email && (
                <a href={`mailto:${k.email}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[#e75387] hover:underline" title={k.email} aria-label={`Mail ${k.email}`}>
                  <LuMail className="text-[13px]" />
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
        {bezoek && (
          <p className="flex items-center gap-1.5 text-[#0b6bcb]" title={`${bezoek.paginas} ${bezoek.paginas === 1 ? "pagina" : "pagina's"} bekeken de laatste twee weken`}>
            <SiteIcoon className="shrink-0 text-[12px]" />
            <span className="truncate"><span className="font-semibold">Op de site</span> {relatiefMoment(bezoek.laatst)}{bezoek.sessies[0]?.paginas.length ? ` · ${bezoek.sessies[0].paginas.length} ${bezoek.sessies[0].paginas.length === 1 ? "pagina" : "pagina's"}` : ""}</span>
          </p>
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

      {/* Geen sr-only label: die is absoluut gepositioneerd en ontsnapt aan de scrollende rij, waardoor de pagina op een telefoon breder werd dan het scherm. */}
      <select
        id={`status-${k.id}`}
        aria-label={`Status van ${k.bedrijf}`}
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
