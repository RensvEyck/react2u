/**
 * Instelling `site_settings.tarieven`: het jaar waarvoor de tarieven gelden
 * en tot wanneer. De tariefblokken (`tarieven`, `dgTarieven`, `wgTarieven`)
 * zetten dat jaar in hun bovenkopje en geldigheidsregel, zodat je per 1
 * januari in het beheer alleen de bedragen hoeft aan te passen — en niet in
 * elk blok het jaartal hoeft te zoeken.
 */
export type TarievenSettings = { jaar: string; geldigTot: string };

export function tarievenDefault(now = new Date()): TarievenSettings {
  const jaar = String(now.getFullYear());
  return { jaar, geldigTot: `31 december ${jaar}` };
}

export function normalizeTarieven(value: unknown, now = new Date()): TarievenSettings {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const basis = tarievenDefault(now);
  const jaar = typeof v.jaar === "string" && /^20\d{2}$/.test(v.jaar.trim()) ? v.jaar.trim() : basis.jaar;
  const geldigTot = typeof v.geldigTot === "string" && v.geldigTot.trim() ? v.geldigTot.trim() : `31 december ${jaar}`;
  return { jaar, geldigTot };
}

/** Vervangt elk jaartal (2000–2099) in een tekst door het ingestelde jaar. */
export function metJaar<T extends string | undefined | null>(text: T, jaar: string): T {
  if (typeof text !== "string") return text;
  return text.replace(/\b20\d{2}\b/g, jaar) as T;
}

/** "Geldig tot en met 31 december 2026" — de vaste regel onder een prijstabel. */
export function geldigheidsregel(t: TarievenSettings): string {
  return `Tarieven ${t.jaar}, geldig tot en met ${t.geldigTot}. Alle bedragen zijn exclusief btw.`;
}
