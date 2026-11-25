import { describe, expect, it } from "vitest";
import { MIJLPALEN, naarIcs, nogTeDoen, parseDatum, termijnen, werkdagOpOfNa } from "./poortwachter";

describe("Poortwachter-planner", () => {
  it("leest alleen een echte datum", () => {
    expect(parseDatum("2026-11-23")?.toISOString()).toBe("2026-11-23T12:00:00.000Z");
    expect(parseDatum("2026-02-31")).toBeNull();
    expect(parseDatum("23-11-2026")).toBeNull();
    expect(parseDatum("")).toBeNull();
    expect(parseDatum(null)).toBeNull();
  });

  it("rekent de weken uit de wet om naar datums: dag 1 is de eerste ziektedag", () => {
    const lijst = termijnen(parseDatum("2026-01-05")!); // een maandag
    const op = (sleutel: string) => lijst.find((t) => t.sleutel === sleutel)!.iso;
    expect(op("ziekmelding")).toBe("2026-01-11"); // dag 7
    expect(op("probleemanalyse")).toBe("2026-02-15"); // dag 42
    expect(op("plan-van-aanpak")).toBe("2026-03-01"); // dag 56
    expect(op("eerstejaarsevaluatie")).toBe("2027-01-03"); // dag 364
    expect(op("tweede-spoor")).toBe("2027-02-14"); // dag 406, zes weken later
    expect(op("eindevaluatie")).toBe("2027-10-03"); // dag 637
    expect(op("wia-aanvraag")).toBe("2027-10-17"); // dag 651
    expect(op("einde-loondoorbetaling")).toBe("2028-01-02"); // dag 728
  });

  it("zet de 42e-weeksmelding op de eerste werkdag na 42 weken", () => {
    // 2026-01-05 + 293 dagen = 2026-10-25 (zondag); de melding is de werkdag erna: maandag 26 oktober.
    const lijst = termijnen(parseDatum("2026-01-05")!);
    expect(lijst.find((t) => t.sleutel === "42-weken")!.iso).toBe("2026-10-26");
    // 2026-01-08 + 293 dagen = 2026-10-28 (woensdag); de melding is donderdag 29 oktober.
    const lijst2 = termijnen(parseDatum("2026-01-08")!);
    expect(lijst2.find((t) => t.sleutel === "42-weken")!.iso).toBe("2026-10-29");
    expect(werkdagOpOfNa(parseDatum("2026-11-28")!).toISOString().slice(0, 10)).toBe("2026-11-30"); // zaterdag → maandag
  });

  it("houdt de weken van HALO en de gids aan: 1, 6, 8, 42, 52, 88, 91, 93, 104", () => {
    const weken = MIJLPALEN.map((m) => m.week).filter((w): w is number => w !== null);
    for (const w of [1, 6, 8, 42, 52, 88, 91, 93, 104]) expect(weken).toContain(w);
    expect(MIJLPALEN.every((m) => m.dag === (m.week ? m.week * 7 : m.dag))).toBe(true);
  });

  it("scheidt wat nog komt van wat verstreken is", () => {
    const lijst = termijnen(parseDatum("2026-01-05")!);
    const { komend, verstreken } = nogTeDoen(lijst, parseDatum("2026-03-01")!);
    expect(verstreken.map((t) => t.sleutel)).toEqual(["ziekmelding", "probleemanalyse"]);
    expect(komend[0].sleutel).toBe("plan-van-aanpak");
  });

  it("maakt een geldig agenda-bestand met hele dagen en een herhaling voor de evaluaties", () => {
    const ics = naarIcs(parseDatum("2026-01-05")!, "https://react2u.nl");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.split("BEGIN:VEVENT").length - 1).toBe(MIJLPALEN.length);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260215");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;INTERVAL=6;UNTIL=20271003");
    expect(ics).toContain("UID:poortwachter-2026-01-05-probleemanalyse@react2u.nl");
    expect(ics).toContain("URL:https://react2u.nl/wet-verbetering-poortwachter");
    // Geen regel langer dan 75 tekens (RFC 5545), geen kale regeleinden.
    for (const regel of ics.split("\r\n")) expect(regel.length).toBeLessThanOrEqual(75);
    expect(ics).not.toMatch(/[^\r]\n/);
  });
});
