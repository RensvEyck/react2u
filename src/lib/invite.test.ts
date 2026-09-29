import { describe, expect, it } from "vitest";
import { inviteErrorText, inviteLink, isEmail, isExistingAccount, parseInviteUrl } from "./invite";

describe("uitnodigen", () => {
  it("bouwt een link met alleen de gehashte token", () => {
    expect(inviteLink("https://react2u.nl/", "abc123")).toBe(
      "https://react2u.nl/admin/uitnodiging?token_hash=abc123&type=invite"
    );
  });

  it("leest onze eigen link", () => {
    expect(parseInviteUrl("?token_hash=abc&type=invite", "")).toEqual({ kind: "token_hash", tokenHash: "abc" });
  });

  it("leest een uitnodiging die Supabase zelf mailde", () => {
    expect(parseInviteUrl("", "#access_token=a&expires_in=3600&refresh_token=r&token_type=bearer&type=invite")).toEqual({
      kind: "tokens", accessToken: "a", refreshToken: "r",
    });
  });

  it("herkent een verlopen of gebruikte link", () => {
    expect(parseInviteUrl("", "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid")).toEqual({
      kind: "error",
    });
    expect(parseInviteUrl("?error=server_error", "")).toEqual({ kind: "error" });
  });

  it("geeft niets terug zonder token, ook niet met een halve sessie", () => {
    expect(parseInviteUrl("", "")).toEqual({ kind: "none" });
    expect(parseInviteUrl("", "#access_token=a")).toEqual({ kind: "none" });
  });

  it("herkent een bestaand account aan code én aan de oude melding", () => {
    expect(isExistingAccount({ code: "email_exists" })).toBe(true);
    expect(isExistingAccount({ message: "A user with this email address has already been registered" })).toBe(true);
    expect(isExistingAccount({ code: "validation_failed", message: "Unable to validate email address" })).toBe(false);
    expect(isExistingAccount(null)).toBe(false);
  });

  it("wijst bij een verkeerde sleutel naar Vercel", () => {
    expect(inviteErrorText({ code: "not_admin", status: 403 })).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(inviteErrorText({ status: 401, message: "Invalid API key" })).toMatch(/service_role/);
  });

  it("vangt typefouten in het adres", () => {
    expect(isEmail("cindy@react2u.nl")).toBe(true);
    expect(isEmail("jan.de.vries+test@sub.react2u.nl")).toBe(true);
    expect(isEmail("cindy@react2u")).toBe(false);
    expect(isEmail("cindy react2u.nl")).toBe(false);
    expect(isEmail("cindy@@react2u.nl")).toBe(false);
  });
});
