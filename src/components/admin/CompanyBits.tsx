import { LuFlame, LuThermometer, LuSnowflake, LuPhoneCall, LuBadgeCheck } from "react-icons/lu";
import { LEAD_STATUS } from "@/lib/leads";
import type { Level, LeadRef } from "@/lib/companies";

const LEVEL = {
  warm: { label: "Warm", cls: "bg-[#fdeef4] text-[#e0356b]", Icon: LuFlame },
  lauw: { label: "Lauw", cls: "bg-[#fff4e5] text-[#c77700]", Icon: LuThermometer },
  koud: { label: "Koud", cls: "bg-black/[0.05] text-black/45", Icon: LuSnowflake },
} as const;

/** Warm / lauw / koud, met de score in de tooltip. */
export function LevelPill({ level, value }: { level: Level; value?: number }) {
  const { label, cls, Icon } = LEVEL[level];
  return (
    <span className={`apill shrink-0 !px-2 !py-0.5 !text-[11.5px] ${cls}`} title={value !== undefined ? `Score ${value}` : undefined}>
      <Icon className="text-[11px]" /> {label}
    </span>
  );
}

/** Klant, of op de bellijst met de belstatus. */
export function LeadPill({ lead }: { lead: LeadRef }) {
  if (lead.status === "klant") {
    return (
      <span className="apill shrink-0 bg-[#e6f7f4] !px-2 !py-0.5 !text-[11.5px] text-[#0e9f8a]">
        <LuBadgeCheck className="text-[11px]" /> Klant
      </span>
    );
  }
  return (
    <span className="apill shrink-0 bg-[#eef0ff] !px-2 !py-0.5 !text-[11.5px] text-[#312e82]" title={`Bellijst: ${LEAD_STATUS[lead.status]?.label}`}>
      <LuPhoneCall className="text-[11px]" /> Op bellijst
    </span>
  );
}

/** Beginletter in een rondje, kleur per niveau. */
export function CompanyAvatar({ name, level, size = 40 }: { name: string; level: Level; size?: number }) {
  const tint = level === "warm" ? "bg-[#fdeef4] text-[#e0356b]" : level === "lauw" ? "bg-[#fff4e5] text-[#c77700]" : "bg-[#eef0ff] text-[#312e82]";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl font-heading font-bold ${tint}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {(name.replace(/^www\./, "")[0] || "?").toUpperCase()}
    </span>
  );
}

/** Uitleg bij de bron van een herkenning. */
export const SOURCE_LABEL: Record<"asn" | "rdns", { label: string; explain: string }> = {
  asn: { label: "eigen netwerk", explain: "Herkend aan de eigenaar van het netwerk (ipinfo): dit bedrijf heeft een eigen IP-blok." },
  rdns: { label: "eigen domein op de lijn", explain: "Herkend aan de naam op het IP-adres (reverse DNS): het bedrijf heeft zijn eigen domein op zijn internetlijn gezet." },
};
