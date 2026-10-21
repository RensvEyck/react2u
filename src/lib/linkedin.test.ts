import { describe, expect, it } from "vitest";
import { leesLinkedInProfiel, veiligPad } from "./linkedin";

describe("linkedin", () => {
  it("accepteert alleen een eigen pad als terugweg", () => {
    expect(veiligPad("/vacatures/casemanager")).toBe("/vacatures/casemanager");
    expect(veiligPad("//evil.com")).toBe("/vacatures");
    expect(veiligPad("https://evil.com")).toBe("/vacatures");
    expect(veiligPad(null)).toBe("/vacatures");
  });

  it("leest naam en e-mail uit de cookie", () => {
    const waarde = encodeURIComponent(JSON.stringify({ naam: "Sanne de Vries", email: "sanne@voorbeeld.nl" }));
    expect(leesLinkedInProfiel(`a=1; r2u_li=${waarde}; b=2`)).toEqual({ naam: "Sanne de Vries", email: "sanne@voorbeeld.nl" });
    expect(leesLinkedInProfiel("a=1")).toBeNull();
    expect(leesLinkedInProfiel("r2u_li=kapot")).toBeNull();
  });
});
