import { describe, expect, it } from "vitest";
import { geldigheidsregel, metJaar, normalizeTarieven } from "./tarieven";

describe("tarievenjaar", () => {
  const now = new Date("2026-10-06T12:00:00Z");

  it("zonder instelling: het huidige kalenderjaar", () => {
    expect(normalizeTarieven(null, now)).toEqual({ jaar: "2026", geldigTot: "31 december 2026" });
  });

  it("neemt een geldig jaar over en vult de geldigheid aan", () => {
    expect(normalizeTarieven({ jaar: " 2027 " }, now)).toEqual({ jaar: "2027", geldigTot: "31 december 2027" });
    expect(normalizeTarieven({ jaar: "27" }, now).jaar).toBe("2026");
    expect(normalizeTarieven({ jaar: "2027", geldigTot: "30 juni 2027" }, now).geldigTot).toBe("30 juni 2027");
  });

  it("vervangt het jaartal in blokteksten", () => {
    expect(metJaar("Tarieven 2026", "2027")).toBe("Tarieven 2027");
    expect(metJaar("Geldig tot 31 december 2026", "2027")).toBe("Geldig tot 31 december 2027");
    expect(metJaar("ISO 27001", "2027")).toBe("ISO 27001");
    expect(metJaar(undefined, "2027")).toBeUndefined();
  });

  it("schrijft de geldigheidsregel", () => {
    expect(geldigheidsregel({ jaar: "2026", geldigTot: "31 december 2026" }))
      .toBe("Tarieven 2026, geldig tot en met 31 december 2026. Alle bedragen zijn exclusief btw.");
  });
});
