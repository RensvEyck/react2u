import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { contractPdf } = await import("./contractPdf");
const { CONTACT_FALLBACK } = await import("./content");
const { CONTRACT_STANDAARD, CONTRACT_VERSIE } = await import("./contractTekst");
const { opdrachtnemerUit } = await import("./contracten");
const { contractMailHtml, contractCodeHtml, contractGetekendHtml } = await import("./contractMail");
import type { ContractCertificaat, GetekendContract } from "./contracten";

const inhoud: GetekendContract = {
  nummer: "C2026-0001", bedrijf: "Bakkerij Jansen", contactpersoon: "Marieke Jansen",
  opdrachtnemer: opdrachtnemerUit(CONTACT_FALLBACK),
  opdrachtgever: { naam: "Bakkerij Jansen B.V.", adres: "Markt 1", postcode: "5611 AA", plaats: "Eindhoven", kvk: "12345678" },
  offerte_kenmerk: "Offerte 2026-0012 van 3 november 2026", ingangsdatum: "2026-12-01", einddatum: "2027-11-30",
  tekst: CONTRACT_STANDAARD, tekst_versie: CONTRACT_VERSIE, aanvullend: "Het eerste jaar is het open spreekuur gratis.",
  afzender_naam: "Rens van Eyck", afzender_functie: null, afzender_email: "sales@react2u.nl", verstuurd_at: "2026-11-03T10:00:00Z",
  getekend_naam: "Marieke Jansen", getekend_functie: "directeur", getekend_email: "marieke@jansen.test", getekend_plaats: "Eindhoven",
  getekend_at: "2026-11-04T09:12:33Z", handtekening_hash: "a".repeat(64),
  bevestiging: { methode: "e-mailcode", email: "marieke@jansen.test", verstuurd_at: "2026-11-04T09:11:02Z", bevestigd_at: "2026-11-04T09:12:33Z" },
};
const certificaat: ContractCertificaat = {
  ip: "203.0.113.7", agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15", aantal_bekeken: 3,
  tijdlijn: [
    { soort: "verstuurd", at: "2026-11-03T10:00:00Z", wie: "marieke@jansen.test" },
    { soort: "bekeken", at: "2026-11-03T12:00:00Z", wie: null },
    { soort: "code", at: "2026-11-04T09:11:02Z", wie: "marieke@jansen.test" },
    { soort: "getekend", at: "2026-11-04T09:12:33Z", wie: "Marieke Jansen" },
  ],
};

describe("contractPdf", () => {
  it("maakt de getekende pdf met certificaat, en het concept met watermerk", async () => {
    const pdf = await contractPdf({ inhoud, hash: "b".repeat(64), handtekening: null, certificaat, contact: CONTACT_FALLBACK, link: "https://react2u.nl/contract/abc" });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.toString("latin1")).toContain("ondertekeningscertificaat");
    // De hele tekst van acht artikelen, de handtekening van de bestuurder, lettertypen en logo.
    expect(pdf.length).toBeGreaterThan(30_000);
    const leeg = { ...inhoud, opdrachtgever: {}, getekend_naam: "", getekend_functie: "", getekend_email: "", getekend_plaats: "", getekend_at: "", bevestiging: undefined };
    const concept = await contractPdf({ inhoud: leeg, hash: "", handtekening: null, certificaat: null, contact: CONTACT_FALLBACK, link: "https://react2u.nl/contract/abc", concept: true });
    expect(concept.toString("latin1")).toContain("arbodienstverlening, concept");
  }, 60_000);
});

describe("contractmails", () => {
  const afzender = { naam: "Rens van Eyck", functie: null, email: "sales@react2u.nl", telefoon: "085 620 58 00" };

  it("de mail met het contract: knop, kerngegevens, in het kort, en alles ge-escaped", () => {
    const html = contractMailHtml({
      basis: "https://react2u.nl", aanhef: "Marieke", bedrijf: "Jansen & <Zn>", nummer: "C2026-0001", link: "https://react2u.nl/contract/abc",
      bericht: "Fijn dat we gaan samenwerken!", afzender, feiten: [{ label: "Ingangsdatum", waarde: "1 december 2026" }], kort: ["Looptijd 1 jaar"],
    });
    expect(html).toContain("Bekijk en onderteken het contract");
    expect(html).toContain("https://react2u.nl/contract/abc");
    expect(html).toContain("Jansen &amp; &lt;Zn&gt;");
    expect(html).not.toContain("<Zn>");
    expect(html).toContain("1 december 2026");
    expect(html).toContain("Looptijd 1 jaar");
    expect(html).toContain("Arbowet");
  });

  it("de code en de bevestiging", () => {
    const code = contractCodeHtml({ basis: "https://react2u.nl", code: "123456", nummer: "C2026-0001", bedrijf: "Jansen", afzender });
    expect(code).toContain("123456");
    expect(code).toContain("Een kwartier geldig");
    const klaar = contractGetekendHtml({
      basis: "https://react2u.nl", naam: "Marieke Jansen", bedrijf: "Jansen", nummer: "C2026-0001", link: "https://react2u.nl/contract/abc",
      hash: "c".repeat(64), moment: "4 november 2026 om 10.12 uur", regels: [{ label: "Looptijd", waarde: "1 jaar" }], afzender, pdf: true,
    });
    expect(klaar).toContain("Bedankt, Marieke.");
    expect(klaar).toContain("In de bijlage zit het ondertekende contract");
    expect(klaar).toContain("c".repeat(64));
  });
});
