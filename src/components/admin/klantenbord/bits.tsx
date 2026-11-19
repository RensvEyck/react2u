"use client";
import Link from "next/link";
import type { ComponentType } from "react";
import {
  LuBookOpen, LuClipboardCheck, LuClipboardList, LuEuro, LuFilePenLine, LuGlobe, LuIdCard, LuMail, LuMapPin, LuMessageSquare, LuPhone, LuPhoneCall, LuScrollText, LuStickyNote, LuArrowRight, LuUpload, LuZap,
} from "react-icons/lu";
import { CHECKLIST, initialen, statusInfo, type Bron, type GesprekSoort, type Klant, type KlantStatus, type Koppeling, type KoppelSoort } from "@/lib/klanten";

/** Kleine bouwstenen die het bord, de lijst en het zijpaneel delen. */

export function StatusPill({ status, klein }: { status: KlantStatus; klein?: boolean }) {
  const s = statusInfo(status);
  return (
    <span className={`apill ${klein ? "!px-2 !py-0.5 !text-[11.5px]" : ""}`} style={{ background: s.achter, color: s.kleur }}>
      {s.label}
    </span>
  );
}

/** De vijf vinkjes uit de klantlijst als stippen: gevuld is gedaan. */
export function Checklist({ k, groot }: { k: Pick<Klant, "offerte_retour" | "contract_retour" | "formulieren_retour" | "koppeling" | "facturatie">; groot?: boolean }) {
  const klaar = CHECKLIST.filter((c) => k[c.key]).length;
  return (
    <span className="inline-flex items-center gap-1" title={`${klaar} van ${CHECKLIST.length}: ${CHECKLIST.map((c) => `${c.kort} ${k[c.key] ? "ja" : "nee"}`).join(", ")}`} aria-label={`Checklist ${klaar} van ${CHECKLIST.length}`}>
      {CHECKLIST.map((c) => (
        <span key={c.key} className={`${groot ? "h-2.5 w-2.5" : "h-2 w-2"} rounded-full ${k[c.key] ? "bg-[#0a7a4b]" : "border border-black/20 bg-white"}`} />
      ))}
    </span>
  );
}

/** Wie van React2u de klant heeft, als rondje met initialen. */
export function Eigenaar({ naam, groot }: { naam: string | null; groot?: boolean }) {
  if (!naam) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#312e82] font-bold text-white ${groot ? "h-8 w-8 text-[12px]" : "h-6 w-6 text-[10.5px]"}`}
      title={naam}
      aria-label={`Eigenaar ${naam}`}
    >
      {initialen(naam)}
    </span>
  );
}

export const SOORT_ICOON: Record<GesprekSoort, ComponentType<{ className?: string }>> = {
  gesprek: LuPhone,
  mail: LuMail,
  bezoek: LuMapPin,
  notitie: LuStickyNote,
  status: LuArrowRight,
  import: LuUpload,
  systeem: LuZap,
  stamkaart: LuIdCard,
};

export const SOORT_LABEL: Record<GesprekSoort, string> = {
  gesprek: "Gesproken",
  mail: "Gemaild",
  bezoek: "Bezoek",
  notitie: "Notitie",
  status: "Verplaatst",
  import: "Import",
  systeem: "Vanuit de modules",
  stamkaart: "Stamkaart",
};

/** Het icoon en de naam van de module waar een systeemregel vandaan komt (0041). */
export const BRON_ICOON: Record<Bron, ComponentType<{ className?: string }>> = {
  offerte: LuFilePenLine,
  brochure: LuBookOpen,
  contract: LuScrollText,
  onboarding: LuClipboardCheck,
  opdracht: LuEuro,
  evaluatie: LuClipboardList,
};

export const BRON_LABEL: Record<Bron, string> = {
  offerte: "Offerte",
  brochure: "Brochure",
  contract: "Contract",
  onboarding: "Onboarding",
  opdracht: "Losse klant of opdracht",
  evaluatie: "Klantevaluatie",
};

export const SiteIcoon = LuGlobe;

export const KOPPEL_ICOON: Record<KoppelSoort, ComponentType<{ className?: string }>> = {
  offerte: LuFilePenLine,
  brochure: LuBookOpen,
  contract: LuScrollText,
  onboarding: LuClipboardCheck,
  evaluatie: LuClipboardList,
  lead: LuPhoneCall,
};

export const KOPPEL_LABEL: Record<KoppelSoort, string> = {
  offerte: "Offerte",
  brochure: "Brochure",
  contract: "Contract",
  onboarding: "Onboarding",
  evaluatie: "Klantevaluatie",
  lead: "Bellijst",
};

/** Een offerte, contract of lead van dezelfde klant, als klikbaar label. */
export function KoppelChip({ x, volledig }: { x: Koppeling; volledig?: boolean }) {
  const Icoon = KOPPEL_ICOON[x.soort];
  return (
    <Link
      href={x.href}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold hover:brightness-95"
      style={{ background: x.achter, color: x.kleur }}
      title={`${KOPPEL_LABEL[x.soort]} ${x.nummer}: ${x.stand}`}
    >
      <Icoon className="shrink-0 text-[12px]" />
      <span className="truncate">{volledig ? `${KOPPEL_LABEL[x.soort]} ${x.nummer} · ${x.stand}` : x.soort === "lead" ? x.stand : x.stand}</span>
    </Link>
  );
}

export function GesprekIcoon({ soort, className }: { soort: GesprekSoort; className?: string }) {
  const Icoon = SOORT_ICOON[soort] || LuMessageSquare;
  return <Icoon className={className} />;
}
