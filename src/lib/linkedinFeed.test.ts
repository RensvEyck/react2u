import { describe, expect, it } from "vitest";
import { linkedinNiveau } from "./linkedinFeed";

describe("linkedinNiveau", () => {
  it("vertaalt onze niveaus naar die van LinkedIn", () => {
    expect(linkedinNiveau("Starter")).toBe("ENTRY_LEVEL");
    expect(linkedinNiveau("Starter of medior")).toBe("ENTRY_LEVEL");
    expect(linkedinNiveau("Medior")).toBe("ASSOCIATE");
    expect(linkedinNiveau("Medior of senior")).toBe("MID_SENIOR_LEVEL");
    expect(linkedinNiveau("Senior")).toBe("MID_SENIOR_LEVEL");
    expect(linkedinNiveau("Student")).toBe("INTERNSHIP");
    expect(linkedinNiveau(null)).toBe("NOT_APPLICABLE");
  });
});
