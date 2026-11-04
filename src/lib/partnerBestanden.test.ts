import { describe, expect, it } from "vitest";
import { bestandFout, bestandPad, bestandType, downloadNaam, MAX_GROOTTE, padVanPartner, veiligeNaam } from "./partnerBestanden";

const P = "8d9edac8-461f-40b9-9a00-5c9c32ff609b";

describe("bestanden bij een partner", () => {
  it("kent het type aan de extensie, ook als de browser er geen meegeeft", () => {
    expect(bestandType("Overeenkomst.PDF")).toBe("application/pdf");
    expect(bestandType("scan.heic")).toBe("image/heic");
    expect(bestandType("model.docx")).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(bestandType("virus.exe")).toBeNull();
    expect(bestandType("zonder-extensie")).toBeNull();
  });

  it("weigert wat de bucket ook weigert", () => {
    expect(bestandFout({ name: "a.pdf", size: 1000 })).toBeNull();
    expect(bestandFout({ name: "a.txt", size: 1000 })).toMatch(/alleen pdf, Word/);
    expect(bestandFout({ name: "a.pdf", size: MAX_GROOTTE + 1 })).toMatch(/20 MB/);
    expect(bestandFout({ name: "a.pdf", size: 0 })).toMatch(/leeg/);
  });

  it("maakt een veilig pad onder de partner", () => {
    expect(veiligeNaam("Resellerovereenkomst Spine (getekend) é.pdf")).toBe("Resellerovereenkomst-Spine-getekend-e.pdf");
    expect(veiligeNaam("../../etc/passwd")).toBe("etc-passwd");
    expect(bestandPad(P, "Overeenkomst.pdf", 1730700000000)).toBe(`${P}/1730700000000-Overeenkomst.pdf`);
  });

  it("laat geen pad buiten de map van de partner toe", () => {
    expect(padVanPartner(`${P}/1-a.pdf`, P)).toBe(true);
    expect(padVanPartner(`anders/1-a.pdf`, P)).toBe(false);
    expect(padVanPartner(`${P}/../anders/a.pdf`, P)).toBe(false);
    expect(padVanPartner(`${P}/sub/a.pdf`, P)).toBe(false);
  });

  it("houdt de originele naam bij de download, zonder tekens die de header breken", () => {
    expect(downloadNaam('Overeenkomst "Spine"\r\n.pdf')).toEqual({ ascii: "Overeenkomst  Spine .pdf", utf8: "Overeenkomst%20%20Spine%20.pdf" });
    expect(downloadNaam("Bijlage é.pdf")).toEqual({ ascii: "Bijlage e.pdf", utf8: "Bijlage%20%C3%A9.pdf" });
  });
});
