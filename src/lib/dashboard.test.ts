import { describe, expect, it } from "vitest";
import { daysBetween, firstName, greeting, systemChecks, trend, waited, when } from "./dashboard";

describe("dashboard", () => {
  it("groet in Nederlandse tijd, ook als de server in UTC draait", () => {
    // 10:30 UTC is 12:30 in Amsterdam (zomertijd): middag, geen ochtend.
    expect(greeting(new Date("2026-09-29T10:30:00Z"))).toBe("Goedemiddag");
    expect(greeting(new Date("2026-09-29T05:30:00Z"))).toBe("Goedemorgen");
  });

  it("haalt een voornaam uit een e-mailadres, maar niet uit een gedeelde mailbox", () => {
    expect(firstName("rens@react2u.nl")).toBe("Rens");
    expect(firstName("marieke.jansen@react2u.nl")).toBe("Marieke");
    expect(firstName("info@react2u.nl")).toBeNull();
    expect(firstName("j2@react2u.nl")).toBeNull();
  });

  it("zegt hoe lang iets wacht", () => {
    const now = new Date("2026-09-29T12:00:00Z");
    expect(waited("2026-09-29T11:59:50Z", now)).toBe("1 min");
    expect(waited("2026-09-29T07:00:00Z", now)).toBe("5 uur");
    expect(waited("2026-09-28T11:00:00Z", now)).toBe("1 dag");
    expect(waited("2026-09-26T12:00:00Z", now)).toBe("3 dagen");
  });

  it("schrijft tijden als vandaag, gisteren of een datum", () => {
    const now = new Date("2026-09-29T12:00:00Z");
    expect(when("2026-09-29T08:05:00Z", now)).toBe("vandaag 10:05");
    expect(when("2026-09-28T08:05:00Z", now)).toBe("gisteren 10:05");
    expect(when("2026-09-12T08:05:00Z", now)).toBe("12 sep 10:05");
    expect(when("2025-03-03T09:00:00Z", now)).toBe("3 mrt 2025 10:00");
  });

  it("geeft geen trend vanaf nul", () => {
    expect(trend(10, 0)).toBeNull();
    expect(trend(12, 10)).toBe(20);
    expect(daysBetween("2026-09-29", "2026-10-04")).toBe(5);
  });

  it("meldt welke koppelingen uit staan, zonder waarden te tonen", () => {
    const checks = systemChecks({ RESEND_API_KEY: "x", NOTIFY_TO: "y", ANALYTICS_SALT: " " });
    expect(checks.find((c) => c.key === "mail")?.ok).toBe(false);
    expect(checks.find((c) => c.key === "salt")?.ok).toBe(false);
    expect(JSON.stringify(checks)).not.toContain("\"x\"");
  });
});
