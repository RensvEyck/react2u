import type { Application, ContactMessage, Lead, LeadStatus } from "./types";

export const LEAD_STATUS: Record<LeadStatus, { label: string; cls: string }> = {
  te_bellen: { label: "Te bellen", cls: "bg-[#fdeef4] text-[#e0356b]" },
  terugbellen: { label: "Terugbellen", cls: "bg-[#fff4e5] text-[#c77700]" },
  niet_bereikt: { label: "Niet bereikt", cls: "bg-[#fff4e5] text-[#c77700]" },
  gebeld: { label: "Gebeld", cls: "bg-[#eef0ff] text-[#312e82]" },
  klant: { label: "Klant", cls: "bg-[#e6f7f4] text-[#0e9f8a]" },
  geen_interesse: { label: "Geen interesse", cls: "bg-black/[0.06] text-black/50" },
};

export const LEAD_STATUS_OPTIONS: [string, string][] = (
  Object.keys(LEAD_STATUS) as LeadStatus[]
).map((k) => [k, LEAD_STATUS[k].label]);

/** Datum van vandaag als "YYYY-MM-DD" — het formaat waarin follow_up_on staat. */
export function today(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Staat deze lead vandaag op de lijst?
 *
 * "Te bellen" altijd. "Terugbellen" pas zodra de afgesproken datum er is —
 * een lead die je pas volgende maand hoeft te spreken hoort niet in het
 * aantal van vandaag, anders wordt die teller betekenisloos. Staat er geen
 * datum bij, dan is er niets om op te wachten en telt hij wel mee.
 */
export function needsCall(lead: Pick<Lead, "status" | "follow_up_on">, day = today()): boolean {
  if (lead.status === "te_bellen") return true;
  if (lead.status === "terugbellen") return !lead.follow_up_on || lead.follow_up_on <= day;
  return false;
}

// Lager = hoger in de lijst. Bepaalt de volgorde van het belwerk.
function bucket(lead: Lead, day: string): number {
  if (lead.status === "terugbellen" && lead.follow_up_on && lead.follow_up_on <= day) return 0;
  if (lead.status === "terugbellen" && !lead.follow_up_on) return 1;
  if (lead.status === "te_bellen") return 2;
  if (lead.status === "terugbellen") return 3; // staat in de toekomst
  if (lead.status === "niet_bereikt") return 4;
  if (lead.status === "gebeld") return 5;
  return 6; // klant, geen_interesse — afgehandeld
}

/**
 * Sorteert op belwerk in plaats van op aanmaakdatum: wat vandaag terugmoet
 * eerst, dan de nieuwe leads, dan wat in de toekomst staat, en afgehandelde
 * leads onderaan.
 */
export function sortLeads(leads: Lead[], day = today()): Lead[] {
  return [...leads].sort((a, b) => {
    const d = bucket(a, day) - bucket(b, day);
    if (d !== 0) return d;
    // Binnen dezelfde groep: eerst wat het langst wacht.
    if (a.follow_up_on && b.follow_up_on) return a.follow_up_on.localeCompare(b.follow_up_on);
    if (a.follow_up_on) return -1;
    if (b.follow_up_on) return 1;
    return +new Date(b.created_at) - +new Date(a.created_at);
  });
}

export function countToCall(leads: Lead[], day = today()): number {
  return leads.filter((l) => needsCall(l, day)).length;
}

/* ---------- van Postvak IN naar bellijst ---------- */

/** Wat een inzending uit het Postvak IN als lead meekrijgt. */
export type NewLead = {
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  notes: string | null;
};

/**
 * Vertaalt een contactbericht naar een lead.
 *
 * Het bericht gaat mee in de notities: de bellijst linkt niet terug naar het
 * Postvak IN, dus zonder die tekst bel je iemand zonder te weten waarover.
 */
export function leadFromMessage(
  m: Pick<ContactMessage, "name" | "email" | "phone" | "subject" | "message">
): NewLead {
  return {
    name: m.name,
    email: m.email || null,
    phone: m.phone || null,
    source: "contactformulier",
    notes: `Bericht via de website${m.subject ? ` — ${m.subject}` : ""}:\n${m.message}`,
  };
}

/**
 * Vertaalt een sollicitatie naar een lead.
 *
 * De vacaturetitel zit in `source` en niet in `company`: dat is de vacature
 * waar iemand op reageerde, niet het bedrijf waar hij werkt.
 */
export function leadFromApplication(
  a: Pick<Application, "name" | "email" | "phone" | "vacancy_title" | "motivation">
): NewLead {
  return {
    name: a.name,
    email: a.email || null,
    phone: a.phone || null,
    source: a.vacancy_title ? `sollicitatie op ${a.vacancy_title}` : "open sollicitatie",
    notes: a.motivation ? `Motivatie:\n${a.motivation}` : null,
  };
}
