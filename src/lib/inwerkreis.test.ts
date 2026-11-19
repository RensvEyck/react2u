import { describe, expect, it } from "vitest";
import { dagPositie, dagTekst, dagVanReis, faseVanDag, leesStap, reisStand, soortAantal, sorteerStappen, stappenWoord, type InwerkStap, type InwerkVoortgang } from "./inwerkreis";

const stap = (id: string, fase: 30 | 60 | 90, soort: InwerkStap["soort"], sort = 0): InwerkStap => ({
  id, sjabloon_id: "s", fase, soort, titel: id, uitleg: null, sort, created_at: `2026-11-01T10:00:0${sort}Z`,
});
const gedaan = (stap_id: string): InwerkVoortgang => ({ reis_id: "r", stap_id, gedaan_at: "2026-11-10T09:00:00Z", door: "noor@react2u.test" });

describe("de dagen van een inwerkreis", () => {
  it("telt de startdatum als dag 1, ook over een maandgrens", () => {
    expect(dagVanReis("2026-11-02", "2026-11-02")).toBe(1);
    expect(dagVanReis("2026-11-02", "2026-12-01")).toBe(30);
    expect(dagVanReis("2026-11-02", "2026-11-01")).toBe(0);
    expect(dagVanReis("2026-10-20", "2026-11-19")).toBe(31);
  });

  it("weet in welke fase een dag valt", () => {
    expect([1, 30, 31, 60, 61, 90, 120].map(faseVanDag)).toEqual([30, 30, 60, 60, 90, 90, 90]);
  });

  it("zegt de dag in woorden", () => {
    expect(dagTekst(12)).toBe("Dag 12 van 90");
    expect(dagTekst(0)).toBe("Begint morgen");
    expect(dagTekst(-4)).toBe("Begint over 5 dagen");
    expect(dagTekst(95)).toBe("90 dagen voorbij");
    expect(dagPositie(1)).toBeCloseTo(0.56, 1);
    expect(dagPositie(200)).toBe(100);
  });
});

describe("de stand van een reis", () => {
  const stappen = [stap("m30", 30, "mijlpaal", 2), stap("t30", 30, "taak", 1), stap("c60", 60, "casus"), stap("t60", 60, "taak", 1), stap("m90", 90, "mijlpaal")];

  it("zet stappen op fase en volgorde", () => {
    expect(sorteerStappen(stappen).map((s) => s.id)).toEqual(["t30", "m30", "c60", "t60", "m90"]);
  });

  it("telt per fase, zet achterstand vooraan en telt mijlpalen die op aftekenen wachten", () => {
    const s = reisStand({ startdatum: "2026-10-01" }, stappen, [gedaan("t30"), gedaan("c60")], "2026-11-09");
    expect(s.dag).toBe(40);
    expect(s.fase).toBe(60);
    expect(s.fases.map((f) => `${f.fase}:${f.gedaan}/${f.totaal}:${f.nu ? "nu" : f.voorbij ? "voorbij" : "later"}`)).toEqual(["30:1/2:voorbij", "60:1/2:nu", "90:0/1:later"]);
    expect(s.gedaan).toBe(2);
    expect(s.totaal).toBe(5);
    expect(s.achter).toBe(1);
    expect(s.volgende.map((v) => v.id)).toEqual(["m30", "t60"]);
    expect(s.mijlpalenOpen).toBe(1);
  });

  it("is vóór de start nog niet begonnen en heeft dan geen fase die loopt", () => {
    const s = reisStand({ startdatum: "2026-12-01" }, stappen, [], "2026-11-19");
    expect(s.begonnen).toBe(false);
    expect(s.fases.some((f) => f.nu)).toBe(false);
    expect(s.mijlpalenOpen).toBe(0);
    expect(s.volgende.map((v) => v.id)).toEqual(["t30", "m30"]);
  });

  it("werkt ook met een leeg sjabloon", () => {
    const s = reisStand({ startdatum: "2026-11-01" }, [], [], "2026-11-19");
    expect(s.totaal).toBe(0);
    expect(s.volgende).toEqual([]);
  });
});

describe("woorden", () => {
  it("telt in enkelvoud en meervoud", () => {
    expect([soortAantal("taak", 1), soortAantal("casus", 2), soortAantal("mijlpaal", 0)]).toEqual(["1 taak", "2 oefencasussen", "0 mijlpalen"]);
    expect([stappenWoord(1), stappenWoord(5)]).toEqual(["stap", "stappen"]);
  });
});

describe("een stap uit het formulier", () => {
  const form = (o: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) f.set(k, v);
    return f;
  };
  it("leest fase, soort, titel en uitleg", () => {
    expect(leesStap(form({ fase: "60", soort: "casus", titel: "  Spoor 2-dossier doornemen ", uitleg: "" }))).toEqual({ fase: 60, soort: "casus", titel: "Spoor 2-dossier doornemen", uitleg: null });
  });
  it("weigert wat niet klopt", () => {
    expect(leesStap(form({ fase: "45", soort: "taak", titel: "x" }))).toEqual({ fout: "inwerk-fase" });
    expect(leesStap(form({ fase: "30", soort: "feest", titel: "x" }))).toEqual({ fout: "inwerk-soort" });
    expect(leesStap(form({ fase: "30", soort: "taak", titel: " " }))).toEqual({ fout: "inwerk-titel" });
  });
});
