import { describe, expect, it } from "vitest";
import { leesProfiel, veiligeFoto, veiligPad } from "./inloggen";
import { schoonSamenvatting } from "./cvSamenvatting";

describe("inloggen", () => {
  it("accepteert alleen een eigen pad als terugweg", () => {
    expect(veiligPad("/vacatures/casemanager")).toBe("/vacatures/casemanager");
    expect(veiligPad("//evil.com")).toBe("/vacatures");
    expect(veiligPad("https://evil.com")).toBe("/vacatures");
    expect(veiligPad(null)).toBe("/vacatures");
  });

  it("laat alleen foto's van LinkedIn en Google door", () => {
    expect(veiligeFoto("https://media.licdn.com/dms/image/abc")).toBe("https://media.licdn.com/dms/image/abc");
    expect(veiligeFoto("https://lh3.googleusercontent.com/a/xyz")).toBe("https://lh3.googleusercontent.com/a/xyz");
    expect(veiligeFoto("http://media.licdn.com/x")).toBe("");
    expect(veiligeFoto("https://evil.com/licdn.com.png")).toBe("");
  });

  it("leest het profiel uit de cookie", () => {
    const w = encodeURIComponent(JSON.stringify({ naam: "Sanne de Vries", email: "sanne@voorbeeld.nl", foto: "", via: "google" }));
    expect(leesProfiel(`a=1; r2u_profiel=${w}`)).toEqual({ naam: "Sanne de Vries", email: "sanne@voorbeeld.nl", foto: "", via: "google" });
    expect(leesProfiel("r2u_profiel=kapot")).toBeNull();
    const vreemd = encodeURIComponent(JSON.stringify({ naam: "x", email: "y", via: "facebook" }));
    expect(leesProfiel(`r2u_profiel=${vreemd}`)).toBeNull();
  });
});

describe("schoonSamenvatting", () => {
  it("houdt alleen bekende velden over en laat lege weg", () => {
    expect(schoonSamenvatting({ telefoon: " 06 12345678 ", opleiding: "onbekend", rommel: "x" })).toEqual({ telefoon: "06 12345678" });
    expect(schoonSamenvatting({ opleiding: "null" })).toBeNull();
    expect(schoonSamenvatting("tekst")).toBeNull();
  });
});
