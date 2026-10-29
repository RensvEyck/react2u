import { writeFileSync } from "node:fs";
import { crc32, deflateSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { offertePdf } = await import("./offertePdf");
const { CONTACT_FALLBACK } = await import("./content");
import type { CertificaatGegevens, GetekendeInhoud } from "./offertes";

// Een echte PNG als handtekening: een golvende lijn, 300 × 90, gemaakt met zlib.
function handtekeningPng(): string {
  const [b, h] = [300, 90];
  const rijen = Buffer.alloc((b * 4 + 1) * h);
  for (let x = 0; x < b; x++) {
    const y = Math.round(45 + 25 * Math.sin(x / 18) * Math.cos(x / 47));
    for (let d = -1; d <= 1; d++) {
      const o = (y + d) * (b * 4 + 1) + 1 + x * 4;
      rijen.set([50, 46, 131, 255], o);
    }
  }
  const brok = (type: string, data: Buffer) => {
    const lengte = Buffer.alloc(4);
    lengte.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([lengte, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(b, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    brok("IHDR", ihdr), brok("IDAT", deflateSync(rijen)), brok("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}
const PNG = handtekeningPng();

const inhoud: GetekendeInhoud = {
  nummer: "2026-0042",
  vorm: "verzuimbegeleiding",
  bedrijf: "Bakkerij Jansen BV",
  contactpersoon: "Anouk Jansen",
  medewerkers: 24,
  titel: "Verzuimbegeleiding op maat",
  betreft: null,
  intro: "Beste Anouk,\n\nFijn dat we elkaar spraken. Hierbij de offerte waar we het over hadden.",
  inhoud: "## Wat we voor je doen\nWe begeleiden verzuim van **dag één** tot herstel.\n- Casemanager als vast aanspreekpunt\n- Bedrijfsarts binnen 48 uur\n\n> Jouw mensen, onze aandacht.",
  voorwaarden: "- Alle bedragen zijn exclusief btw.\n- Het abonnement loopt een jaar.",
  vervolg: [
    { kop: "Ondertekend", tekst: "Je hebt de offerte getekend." },
    { kop: "Kennismaking", tekst: "We plannen binnen een week een startgesprek." },
    { kop: "Aansluiting", tekst: "Je medewerkers zijn aangemeld." },
  ],
  afzender_naam: "Sanne de Vries",
  afzender_functie: "Accountmanager",
  afzender_email: "sanne@react2u.nl",
  verstuurd_at: "2026-10-27T09:12:00Z",
  regels: [
    { id: "a", sectie: "Aansluiting", naam: "Casemanagement Compleet", prijs: 139.5, eenheid: "medewerker_jaar", soort: "keuze", groep: "aansluiting" },
    { id: "b", sectie: "Aansluiting", naam: "Verrichtingenbasis", prijs: 38.5, eenheid: "medewerker_jaar", soort: "keuze", groep: "aansluiting" },
    { id: "c", sectie: "Extra", naam: "RI&E", omschrijving: "Inventarisatie op locatie, met plan van aanpak", prijs: 950, eenheid: "eenmalig", soort: "optie" },
    { id: "d", sectie: "Tarieven", naam: "Bedrijfsarts", prijs: 240, eenheid: "uur", soort: "tarief" },
  ],
  keuze: ["a", "c"],
  geldig_tot: "2026-11-26",
  getekend_naam: "Anouk Jansen",
  getekend_functie: "Directeur",
  getekend_email: "anouk@bakkerijjansen.nl",
  getekend_at: "2026-10-29T13:03:27Z",
  factuur: { email: "administratie@bakkerijjansen.nl", adres: "Molenstraat 12", postcode: "5611 AB", plaats: "Eindhoven", kvk: "12345678", inkoopnummer: "PO-2026-118" },
  handtekening_hash: "b".repeat(64),
  bevestiging: { methode: "e-mailcode", email: "anouk@bakkerijjansen.nl", verstuurd_at: "2026-10-29T13:01:58Z", bevestigd_at: "2026-10-29T13:03:27Z" },
};

const certificaat: CertificaatGegevens = {
  ip: "84.104.12.7",
  agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
  aantal_bekeken: 3,
  tijdlijn: [
    { soort: "verstuurd", at: "2026-10-27T09:12:00Z", wie: "anouk@bakkerijjansen.nl" },
    { soort: "bekeken", at: "2026-10-27T10:40:00Z", wie: null },
    { soort: "bekeken", at: "2026-10-29T12:58:00Z", wie: null },
    { soort: "code", at: "2026-10-29T13:01:58Z", wie: "anouk@bakkerijjansen.nl" },
    { soort: "getekend", at: "2026-10-29T13:03:27Z", wie: "Anouk Jansen" },
  ],
};

describe("offertePdf", () => {
  it("maakt een pdf met de offerte en het certificaat", async () => {
    const pdf = await offertePdf({
      inhoud, hash: "a".repeat(64), handtekening: PNG, certificaat, contact: CONTACT_FALLBACK,
      link: "https://react2u.nl/offerte/" + "f".repeat(64),
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    // Minstens twee pagina's: de offerte en het certificaat.
    const paginas = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
    expect(paginas).toBeGreaterThanOrEqual(2);
    if (process.env.PDF_UIT) writeFileSync(process.env.PDF_UIT, pdf);
  }, 30000);

  it("werkt ook voor een offerte van vóór de bevestigingscode", async () => {
    const oud: GetekendeInhoud = { ...inhoud, factuur: undefined, bevestiging: undefined, handtekening_hash: undefined };
    const pdf = await offertePdf({ inhoud: oud, hash: "c".repeat(64), handtekening: null, certificaat: null, contact: CONTACT_FALLBACK, link: "https://react2u.nl/offerte/x" });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  }, 30000);
});
