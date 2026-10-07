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

/* ---------- zoeken en bladeren ---------- */

/** Kleine letters, zonder accenten: "José" vindt "jose" en andersom. */
function plat(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Zoekt in naam, bedrijf, e-mail, telefoon, bron en notities.
 *
 * Elk woord moet ergens voorkomen ("bakker eindhoven" vindt Bakker BV met
 * Eindhoven in de notities). Een zoekterm met alleen cijfers zoekt ook op het
 * telefoonnummer zonder spaties en streepjes, want niemand weet hoe een nummer
 * ooit is ingetikt: "0402507" vindt "040-2507507".
 */
export function searchLeads<T extends Pick<Lead, "name" | "company" | "email" | "phone" | "source" | "notes">>(
  leads: T[],
  query: string
): T[] {
  const terms = plat(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return leads;
  return leads.filter((l) => {
    const text = plat([l.name, l.company, l.email, l.phone, l.source, l.notes].filter(Boolean).join(" \u0001 "));
    const digits = (l.phone || "").replace(/\D/g, "");
    return terms.every((t) => {
      if (text.includes(t)) return true;
      const tDigits = t.replace(/\D/g, "");
      return tDigits.length >= 3 && tDigits.length === t.replace(/[\s()+-]/g, "").length && digits.includes(tDigits);
    });
  });
}

export type Pagina<T> = {
  items: T[];
  /** 1-gebaseerd, en altijd binnen het bereik. */
  pagina: number;
  paginas: number;
  totaal: number;
  /** Rangnummer van het eerste en laatste item op deze pagina (1-gebaseerd); 0 als er niets is. */
  van: number;
  tot: number;
};

/**
 * Eén pagina uit een lijst. Een paginanummer buiten het bereik (oude link,
 * na verwijderen minder leads) valt terug op de dichtstbijzijnde pagina in
 * plaats van een lege lijst te tonen.
 */
export function pagineer<T>(items: T[], gevraagd: number | string | undefined, perPagina: number): Pagina<T> {
  const totaal = items.length;
  const paginas = Math.max(1, Math.ceil(totaal / perPagina));
  const n = Math.floor(Number(gevraagd));
  const pagina = Number.isFinite(n) ? Math.min(Math.max(1, n), paginas) : 1;
  const start = (pagina - 1) * perPagina;
  const deel = items.slice(start, start + perPagina);
  return { items: deel, pagina, paginas, totaal, van: deel.length ? start + 1 : 0, tot: start + deel.length };
}
