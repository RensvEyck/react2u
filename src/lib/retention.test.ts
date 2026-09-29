import { describe, expect, it } from "vitest";
import { daysLeft, isExpired } from "./retention";

describe("bewaartermijn sollicitaties", () => {
  const now = new Date("2026-09-29T12:00:00Z");
  const ago = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();

  it("afgerond: verlopen na acht weken", () => {
    expect(isExpired({ status: "afgewezen", created_at: ago(55) }, now)).toBe(false);
    expect(isExpired({ status: "afgewezen", created_at: ago(57) }, now)).toBe(true);
    expect(isExpired({ status: "aangenomen", created_at: ago(57) }, now)).toBe(true);
  });

  it("open: verlopen na drie maanden", () => {
    expect(isExpired({ status: "nieuw", created_at: ago(80) }, now)).toBe(false);
    expect(isExpired({ status: "in_behandeling", created_at: ago(91) }, now)).toBe(true);
  });

  it("telt de dagen af", () => {
    expect(daysLeft({ status: "afgewezen", created_at: ago(50) }, now)).toBe(6);
    expect(daysLeft({ status: "afgewezen", created_at: ago(60) }, now)).toBeNull();
  });
});
