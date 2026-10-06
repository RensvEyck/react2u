import { describe, expect, it } from "vitest";
import { geldigEmail } from "./formulier";
import { toontBelbalk } from "./belbalk";

describe("formulieren", () => {
  it("keurt onbruikbare e-mailadressen af", () => {
    expect(geldigEmail("jan@bedrijf.nl")).toBe(true);
    expect(geldigEmail("j.de.vries+hr@sub.bedrijf.co.uk")).toBe(true);
    expect(geldigEmail("jan")).toBe(false);
    expect(geldigEmail("jan@")).toBe(false);
    expect(geldigEmail("jan@bedrijf")).toBe(false);
    expect(geldigEmail("jan @bedrijf.nl")).toBe(false);
    expect(geldigEmail(`${"a".repeat(196)}@b.nl`)).toBe(false);
  });

  it("toont de belbalk alleen op werkgeverspagina's", () => {
    expect(toontBelbalk("/werkgevers")).toBe(true);
    expect(toontBelbalk("/recover")).toBe(true);
    expect(toontBelbalk("/recover")).toBe(true);
    expect(toontBelbalk("/verzuimabonnementen")).toBe(true);
    expect(toontBelbalk("/")).toBe(false);
    expect(toontBelbalk("/werknemers")).toBe(false);
    expect(toontBelbalk("/contact")).toBe(false);
    expect(toontBelbalk("/kennismaken")).toBe(false);
  });
});
