import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { alleKeurmerken, BEKENDE_KEURMERKEN, herkenCertificaat, keurmerkBij, keurmerkenUit, keurmerkenVoor, keurmerkTekst } from "./keurmerken";
import { normalizeCertificates } from "./nav";
import { en } from "./woordenboek/en";
import { nl } from "./woordenboek/nl";
import certificeringenNl from "../content/certificeringen.json";
import certificeringenEn from "../content/en/certifications.json";

const MEDIA = "https://tumwtappyegkjabtmold.supabase.co/storage/v1/object/public/media/uploads";

/** De instelling zoals die van augustus tot 20 november 2026 in productie stond: vier PDF's in het logoveld. */
const AUGUSTUS = [
  { alt: "MANAGEMENTSYSTEEM CERTIFICAAT", href: "", image: `${MEDIA}/1786026544609-Certificatieschema_Arbodiensten-NLD-C852940-0-20260324.pdf` },
  { alt: "ISO 9001:2015", href: "", image: `${MEDIA}/1786026557304-ISO_9001-NLD-C852941-0-20260324.pdf` },
  { alt: "FD Certificaat", href: "", image: `${MEDIA}/1786026548220-FD-certificaat-C-Faro.pdf` },
  { alt: "FD EU - Certificaat", href: "", image: `${MEDIA}/1786026551989-FD-EU-certificaat-C-Faro.pdf` },
];

const titels = (concept: { blocks: { type: string; data: { items?: { title: string }[] } }[] }) =>
  concept.blocks.find((b) => b.type === "dgCertificeringen")!.data.items!.map((i) => i.title);

describe("keurmerkenVoor: de instelling bepaalt welke keurmerken er staan", () => {
  it("geen certificaten in Instellingen: geen keurmerken, ook niet de logo's uit het ontwerp", () => {
    expect(keurmerkenVoor([])).toEqual([]);
    expect(keurmerkenVoor(normalizeCertificates([]))).toEqual([]);
    expect(keurmerkenVoor(normalizeCertificates(null))).toEqual([]);
  });

  it("de instelling van augustus 2026: vier keurmerken, in die volgorde, met de PDF als doorklik", () => {
    const lijst = keurmerkenVoor(normalizeCertificates(AUGUSTUS));
    expect(lijst.map((k) => k.naam)).toEqual(["SBCA", "ISO 9001", "FD Certificaat", "FD EU - Certificaat"]);
    // Herkend: het logo van de site, de PDF uit het logoveld wordt de link.
    expect(lijst[0]).toMatchObject({ src: "/beeld/keurmerken/sbca.jpg", href: AUGUSTUS[0].image, wat: "Gecertificeerde arbodienst", bekend: 0 });
    expect(lijst[1]).toMatchObject({ src: "/beeld/keurmerken/iso9001.png", href: AUGUSTUS[1].image, bekend: 1 });
    // Onbekend: geen logo (een PDF is geen beeld), de omschrijving als naam, de PDF als link.
    expect(lijst[2]).toMatchObject({ src: "", naam: "FD Certificaat", wat: "", href: AUGUSTUS[2].image, bekend: -1 });
    // Wat niet in Instellingen staat, staat er niet: geen ISO 27001, 27701 of OVAL.
    expect(lijst.map((k) => k.src)).not.toContain("/beeld/keurmerken/iso27001.png");
    expect(lijst.map((k) => k.src)).not.toContain("/beeld/keurmerken/oval.png");
  });

  it("een certificaat weghalen haalt zijn keurmerk weg", () => {
    const zonder9001 = AUGUSTUS.filter((c) => !c.alt.includes("9001"));
    const lijst = keurmerkenVoor(normalizeCertificates(zonder9001));
    expect(lijst).toHaveLength(3);
    expect(lijst.some((k) => k.naam === "ISO 9001")).toBe(false);
  });

  it("herkent de vijf bekende keurmerken aan omschrijving of bestandsnaam, ook in het Engels", () => {
    const voorbeelden: [string, number][] = [
      ["MANAGEMENTSYSTEEM CERTIFICAAT", 0], ["SBCA", 0], ["Gecertificeerde arbodienst", 0], ["Certified occupational health service", 0],
      ["ISO 9001:2015", 1], ["ISO/IEC 27001: informatiebeveiliging", 2], ["ISO 27701", 3], ["Lid van OVAL", 4], ["Member of OVAL", 4],
      ["FD Certificaat", -1], ["", -1],
    ];
    for (const [alt, verwacht] of voorbeelden) expect(herkenCertificaat({ alt, href: "", image: "" }), alt).toBe(verwacht);
    expect(herkenCertificaat({ alt: "Kwaliteit", href: `${MEDIA}/1786026557304-ISO_9001-NLD.pdf`, image: "" })).toBe(1);
    expect(herkenCertificaat({ alt: "Branchevereniging", href: "", image: `${MEDIA}/1786026557304-oval-lidmaatschap.pdf` })).toBe(4);
  });

  it("kijkt niet naar het tijdstempel in de URL: 1790010000000 bevat 9001, maar is geen ISO 9001", () => {
    const c = normalizeCertificates([{ alt: "FD Certificaat", href: "", image: `${MEDIA}/1790010000000-FD-certificaat.pdf` }]);
    expect(herkenCertificaat(c[0])).toBe(-1);
    expect(keurmerkenVoor(c)[0]).toMatchObject({ src: "", naam: "FD Certificaat", bekend: -1 });
  });

  it("een eigen logo uit Instellingen wint van het logo van de site; een onbekend keurmerk met logo toont dat logo", () => {
    const lijst = keurmerkenVoor(normalizeCertificates([
      { alt: "ISO 9001", href: "https://voorbeeld.test/iso9001.pdf", image: `${MEDIA}/1790000000000-eigen-iso-logo.png` },
      { alt: "ISO 45001", href: "", image: `${MEDIA}/1790000000000-iso45001.png` },
    ]));
    expect(lijst[0]).toMatchObject({ src: `${MEDIA}/1790000000000-eigen-iso-logo.png`, href: "https://voorbeeld.test/iso9001.pdf", naam: "ISO 9001", bekend: 1 });
    expect(lijst[1]).toMatchObject({ src: `${MEDIA}/1790000000000-iso45001.png`, href: "", naam: "ISO 45001", wat: "", bekend: -1 });
  });

  it("alleen een omschrijving is genoeg: een bekend keurmerk krijgt het logo van de site, zonder doorklik", () => {
    const lijst = keurmerkenVoor(normalizeCertificates([{ alt: "ISO 27001", href: "", image: "" }, { alt: "", href: "https://voorbeeld.test/los.pdf", image: "" }]));
    // De regel met alleen een link valt weg: er is niets te tonen.
    expect(lijst).toHaveLength(1);
    expect(lijst[0]).toMatchObject({ src: "/beeld/keurmerken/iso27001.png", href: "", naam: "ISO 27001", bekend: 2 });
  });

  it("keurmerkenUit: zonder lijst (de blokeditor) alle bekende, met een lege lijst niets", () => {
    expect(keurmerkenUit(undefined)).toEqual(alleKeurmerken());
    expect(keurmerkenUit(undefined)).toHaveLength(5);
    expect(keurmerkenUit([])).toEqual([]);
  });
});

describe("keurmerkTekst: teksten in de taal van de pagina", () => {
  it("een bekend keurmerk krijgt de teksten uit het woordenboek, een onbekend zijn omschrijving uit Instellingen", () => {
    const [sbca, fd] = keurmerkenVoor(normalizeCertificates([AUGUSTUS[0], AUGUSTUS[2]]));
    expect(keurmerkTekst(sbca, nl)).toEqual({ alt: "SBCA gecertificeerde arbodienst", naam: "SBCA", wat: "Gecertificeerde arbodienst" });
    expect(keurmerkTekst(sbca, en)).toEqual({ alt: "SBCA certified occupational health service", naam: "SBCA", wat: "Certified occupational health service" });
    expect(keurmerkTekst(fd, en)).toEqual({ alt: "FD Certificaat", naam: "FD Certificaat", wat: "" });
  });

  it("het woordenboek heeft voor elk bekend keurmerk een alt, naam en omschrijving, in beide talen", () => {
    for (const t of [nl, en]) {
      expect(t.footer.keurmerkAlts).toHaveLength(BEKENDE_KEURMERKEN.length);
      expect(t.gedeeld.keurmerken.map((k) => k.naam)).toEqual(BEKENDE_KEURMERKEN.map((k) => k.naam));
    }
  });
});

describe("keurmerkBij: de logo's op de pagina Certificeringen", () => {
  it("elke regel van de Nederlandse en Engelse pagina vindt zijn keurmerk zolang het in Instellingen staat", () => {
    const alle = alleKeurmerken();
    for (const titel of [...titels(certificeringenNl), ...titels(certificeringenEn)]) {
      expect(keurmerkBij(titel, alle)?.naam, titel).toBeDefined();
    }
    expect(titels(certificeringenNl).map((t) => keurmerkBij(t, alle)!.naam)).toEqual(["SBCA", "ISO 9001", "ISO 27001", "ISO 27701", "OVAL"]);
  });

  it("staat het keurmerk niet meer in Instellingen, dan blijft de tekst zonder logo", () => {
    const zonderOval = keurmerkenVoor(normalizeCertificates(AUGUSTUS));
    expect(keurmerkBij("Lid van OVAL", zonderOval)).toBeUndefined();
    expect(keurmerkBij("ISO 9001: kwaliteitsmanagement", zonderOval)?.naam).toBe("ISO 9001");
  });

  it("een onbekend keurmerk vind je aan zijn naam", () => {
    const lijst = keurmerkenVoor(normalizeCertificates([{ alt: "ISO 45001", href: "", image: `${MEDIA}/1-iso45001.png` }]));
    expect(keurmerkBij("ISO 45001: veilig en gezond werken", lijst)?.naam).toBe("ISO 45001");
  });
});

describe("de logo's van de bekende keurmerken", () => {
  it("staan in public/beeld/keurmerken", () => {
    for (const k of BEKENDE_KEURMERKEN) expect(existsSync(join(__dirname, "../../public", k.src)), k.src).toBe(true);
  });
});
