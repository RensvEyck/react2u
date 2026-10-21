/**
 * De samenvatting van een cv zoals die bij een sollicitatie wordt bewaard
 * (kolom cv_samenvatting, migratie 0020). Gedeeld door formulier, server en admin.
 */
export type CvSamenvatting = {
  naam?: string;
  email?: string;
  telefoon?: string;
  linkedin?: string;
  woonplaats?: string;
  huidigeFunctie?: string;
  jarenErvaring?: string;
  opleiding?: string;
  registraties?: string;
  talen?: string;
  samenvatting?: string;
};

const VELDEN: (keyof CvSamenvatting)[] = [
  "naam", "email", "telefoon", "linkedin", "woonplaats", "huidigeFunctie",
  "jarenErvaring", "opleiding", "registraties", "talen", "samenvatting",
];

/** Houdt alleen bekende tekstvelden over, ingekort; null als er niets bruikbaars in zit. */
export function schoonSamenvatting(ruw: unknown): CvSamenvatting | null {
  if (!ruw || typeof ruw !== "object") return null;
  const uit: CvSamenvatting = {};
  for (const k of VELDEN) {
    const w = (ruw as Record<string, unknown>)[k];
    if (typeof w === "string" || typeof w === "number") {
      const s = String(w).replace(/\s+/g, " ").trim();
      if (s && !/^(null|onbekend|n\.?v\.?t\.?|-)$/i.test(s)) uit[k] = s.slice(0, k === "samenvatting" ? 600 : 200);
    }
  }
  return Object.keys(uit).length ? uit : null;
}

export const SAMENVATTING_LABELS: [keyof CvSamenvatting, string][] = [
  ["huidigeFunctie", "Huidige functie"],
  ["jarenErvaring", "Ervaring"],
  ["opleiding", "Opleiding"],
  ["registraties", "Registraties"],
  ["woonplaats", "Woonplaats"],
  ["talen", "Talen"],
];
