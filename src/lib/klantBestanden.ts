/**
 * Eigen bestanden bij een klant (migratie 0048): een getekend stuk dat buiten
 * de online route om binnenkwam, correspondentie, of iets anders van het
 * kantoor. Puur, zonder database: dezelfde controles in het uploadvak, in de
 * actie die het bestand vastlegt en in de downloadroute. Dezelfde opzet als de
 * partnerbestanden (lib/partnerBestanden.ts), met Excel erbij.
 */
import { downloadNaam, veiligeNaam } from "./partnerBestanden";

export { downloadNaam, veiligeNaam };

export type KlantBestandSoort = "overeenkomst" | "correspondentie" | "overig";

/** Een rij uit `klant_bestanden`. */
export type KlantBestand = {
  id: string;
  klant_id: string;
  pad: string;
  naam: string;
  grootte: number | null;
  type: string | null;
  soort: KlantBestandSoort;
  omschrijving: string | null;
  geupload_door: string | null;
  created_at: string;
};

export const KLANT_BUCKET = "klantbestanden";

export const BESTAND_SOORTEN: { key: KlantBestandSoort; label: string; uitleg: string }[] = [
  { key: "overeenkomst", label: "Getekend stuk", uitleg: "Een contract, offerte of machtiging die op papier is getekend" },
  { key: "correspondentie", label: "Correspondentie", uitleg: "Een brief of mail die je bij de klant wilt bewaren" },
  { key: "overig", label: "Ander bestand", uitleg: "Alles wat verder bij deze klant hoort" },
];

export function isBestandSoort(s: unknown): s is KlantBestandSoort {
  return typeof s === "string" && BESTAND_SOORTEN.some((x) => x.key === s);
}

export function bestandSoortLabel(s: KlantBestandSoort): string {
  return BESTAND_SOORTEN.find((x) => x.key === s)?.label ?? "Bestand";
}

/** Zoals de bucket in 0048: tot 20 MB, pdf, Word, Excel en afbeeldingen. */
export const MAX_GROOTTE = 20 * 1024 * 1024;
export const TOEGESTAAN: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  heic: "image/heic",
  webp: "image/webp",
};

/** Voor het `accept` van het bestandsveld. */
export const ACCEPT = Object.keys(TOEGESTAAN).map((e) => `.${e}`).join(",");

const extensie = (naam: string) => (naam.match(/\.([a-z0-9]{1,5})$/i)?.[1] || "").toLowerCase();

/** Het type waarmee het bestand de bucket in gaat, op grond van de extensie, of null als het niet mag. */
export function bestandType(naam: string): string | null {
  return TOEGESTAAN[extensie(naam)] ?? null;
}

/** Wat er niet klopt aan een bestand voor het uploaden, of null. */
export function bestandFout(f: { name: string; size: number }): string | null {
  if (!bestandType(f.name)) return `${f.name}: alleen pdf, Word (doc, docx), Excel (xls, xlsx) en afbeeldingen (jpg, png, heic, webp).`;
  if (f.size > MAX_GROOTTE) return `${f.name}: groter dan 20 MB.`;
  if (f.size === 0) return `${f.name}: het bestand is leeg.`;
  return null;
}

/** Het pad in de bucket: altijd onder de klant (de database controleert dat ook). */
export function bestandPad(klantId: string, naam: string, nu = Date.now()): string {
  return `${klantId}/${nu}-${veiligeNaam(naam)}`;
}

/** Of een pad bij deze klant hoort en niet buiten zijn map kan komen. */
export function padVanKlant(pad: string, klantId: string): boolean {
  return pad.startsWith(`${klantId}/`) && !pad.includes("..") && pad.split("/").length === 2 && pad.length <= 400;
}
