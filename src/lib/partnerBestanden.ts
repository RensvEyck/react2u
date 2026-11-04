/**
 * Bestanden bij een partner (migratie 0034): een resellerovereenkomst die
 * buiten de online route om is getekend, en andere stukken van het kantoor.
 * Puur, zonder database: dezelfde controles in het uploadvak, in de actie die
 * het bestand vastlegt en in de downloadroute.
 */

export type PartnerBestandSoort = "overeenkomst" | "overig";

/** Een rij uit `partner_bestanden`. */
export type PartnerBestand = {
  id: string;
  partner_id: string;
  pad: string;
  naam: string;
  grootte: number | null;
  type: string | null;
  soort: PartnerBestandSoort;
  getekend_op: string | null;
  notitie: string | null;
  geupload_door: string | null;
  created_at: string;
};

export const PARTNER_BUCKET = "partnerbestanden";

/** Zoals de bucket in 0034: tot 20 MB, alleen pdf, Word en afbeeldingen. */
export const MAX_GROOTTE = 20 * 1024 * 1024;
export const TOEGESTAAN: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  heic: "image/heic",
  webp: "image/webp",
};

/** Voor het `accept` van het bestandsveld. */
export const ACCEPT = Object.keys(TOEGESTAAN).map((e) => `.${e}`).join(",");

const extensie = (naam: string) => (naam.match(/\.([a-z0-9]{1,5})$/i)?.[1] || "").toLowerCase();

/**
 * Het type waarmee het bestand de bucket in gaat, op grond van de extensie (de
 * browser geeft voor .heic of .docx niet altijd een type mee), of null als het
 * niet mag.
 */
export function bestandType(naam: string): string | null {
  return TOEGESTAAN[extensie(naam)] ?? null;
}

/** Wat er niet klopt aan een bestand voor het uploaden, of null. */
export function bestandFout(f: { name: string; size: number }): string | null {
  if (!bestandType(f.name)) return `${f.name}: alleen pdf, Word (doc, docx) en afbeeldingen (jpg, png, heic, webp).`;
  if (f.size > MAX_GROOTTE) return `${f.name}: groter dan 20 MB.`;
  if (f.size === 0) return `${f.name}: het bestand is leeg.`;
  return null;
}

/** "Overeenkomst Spine (getekend).pdf" → "Overeenkomst-Spine-getekend.pdf": veilig als naam in de bucket. */
export function veiligeNaam(naam: string): string {
  const ext = extensie(naam);
  const romp = (ext ? naam.slice(0, -(ext.length + 1)) : naam).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "bestand";
  return ext ? `${romp}.${ext}` : romp;
}

/** Het pad in de bucket: altijd onder de partner (de database controleert dat ook). */
export function bestandPad(partnerId: string, naam: string, nu = Date.now()): string {
  return `${partnerId}/${nu}-${veiligeNaam(naam)}`;
}

/** Of een pad bij deze partner hoort en niet buiten zijn map kan komen. */
export function padVanPartner(pad: string, partnerId: string): boolean {
  return pad.startsWith(`${partnerId}/`) && !pad.includes("..") && pad.split("/").length === 2 && pad.length <= 400;
}

/** De bestandsnaam voor de download, met de originele naam (zonder tekens die een header breken). */
export function downloadNaam(naam: string): { ascii: string; utf8: string } {
  const schoon = naam.replace(/[\r\n"\\/]+/g, " ").trim() || "bestand";
  return { ascii: schoon.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "_"), utf8: encodeURIComponent(schoon) };
}
