import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { domeinStatus, mailStatus, sendInvite, sendMfaResetNotice, sendTestMail } from "./mail";

type Aanroep = { url: string; body: Record<string, unknown> | null };
let aanroepen: Aanroep[] = [];

function nepFetch(antwoord: () => Response | Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    aanroepen.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
    return antwoord();
  }));
}

beforeEach(() => {
  aanroepen = [];
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("NOTIFY_FROM", "React2u <noreply@react2u.nl>");
  vi.stubEnv("NOTIFY_TO", "info@react2u.nl, rens@react2u.nl");
  vi.stubEnv("NOTIFY_OFFERTE_TO", "");
  vi.stubEnv("RESEND_API_URL", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("uitnodiging via het systeem", () => {
  it("mailt een uitnodiging met de link, en antwoorden gaat naar wie uitnodigde", async () => {
    nepFetch(() => new Response("{}", { status: 200 }));
    const r = await sendInvite({
      to: "nieuw@react2u.nl", link: "https://react2u.nl/admin/uitnodiging?token_hash=abc&type=invite",
      invitedBy: "rens@react2u.nl", roleLabel: "Redacteur", replyTo: "rens@react2u.nl",
    });
    expect(r).toEqual({ ok: true });
    expect(aanroepen).toHaveLength(1);
    const b = aanroepen[0].body!;
    expect(aanroepen[0].url).toBe("https://api.resend.com/emails");
    expect(b.to).toEqual(["nieuw@react2u.nl"]);
    expect(b.from).toBe("React2u <noreply@react2u.nl>");
    expect(b.reply_to).toBe("rens@react2u.nl");
    expect(b.subject).toBe("Je uitnodiging voor het beheer van react2u.nl");
    expect(String(b.html)).toContain("token_hash=abc&amp;type=invite");
    expect(String(b.html)).toContain("Redacteur");
    expect(String(b.html)).toContain("tweestapsverificatie");
  });

  it("een wachtwoordlink heeft een eigen onderwerp en tekst", async () => {
    nepFetch(() => new Response("{}", { status: 200 }));
    await sendInvite({ to: "cindy@react2u.nl", link: "https://x/y", invitedBy: "rens@react2u.nl", roleLabel: "Beheerder", soort: "recovery" });
    const b = aanroepen[0].body!;
    expect(b.subject).toBe("Nieuw wachtwoord kiezen voor het beheer van react2u.nl");
    expect(String(b.html)).toContain("Nieuw wachtwoord kiezen");
    expect(String(b.html)).not.toContain("uitgenodigd");
  });

  it("zonder sleutel of afzender: niets versturen, reden 'uit'", async () => {
    nepFetch(() => new Response("{}", { status: 200 }));
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await sendInvite({ to: "a@b.nl", link: "x", invitedBy: "r", roleLabel: "R" })).toEqual({ ok: false, reden: "uit" });
    expect(aanroepen).toHaveLength(0);
  });

  it("geeft de reden van Resend door als die weigert", async () => {
    nepFetch(() => new Response(JSON.stringify({ statusCode: 403, message: "The react2u.nl domain is not verified." }), { status: 403 }));
    expect(await sendTestMail("rens@react2u.nl")).toEqual({
      ok: false, reden: "geweigerd", melding: "The react2u.nl domain is not verified.",
    });
  });

  it("geen verbinding is 'onbereikbaar', en gooit niet", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNRESET"); }));
    expect(await sendTestMail("rens@react2u.nl")).toEqual({ ok: false, reden: "onbereikbaar" });
  });

  it("melding bij gewiste tweestaps gaat naar de collega, antwoord naar wie het deed", async () => {
    nepFetch(() => new Response("{}", { status: 200 }));
    await sendMfaResetNotice({ to: "cindy@react2u.nl", door: "rens@react2u.nl" });
    const b = aanroepen[0].body!;
    expect(b.to).toEqual(["cindy@react2u.nl"]);
    expect(b.reply_to).toBe("rens@react2u.nl");
    expect(String(b.html)).toContain("rens@react2u.nl");
  });

  it("RESEND_API_URL leidt om, voor tests", async () => {
    vi.stubEnv("RESEND_API_URL", "http://127.0.0.1:3999/");
    nepFetch(() => new Response("{}", { status: 200 }));
    await sendTestMail("rens@react2u.nl");
    expect(aanroepen[0].url).toBe("http://127.0.0.1:3999/emails");
  });
});

describe("status voor Instellingen", () => {
  it("leest de instellingen, met sales als standaard voor offertes", () => {
    expect(mailStatus()).toEqual({
      sleutel: true,
      afzender: "React2u <noreply@react2u.nl>",
      meldingenNaar: ["info@react2u.nl", "rens@react2u.nl"],
      offertesNaar: ["sales@react2u.nl"],
    });
  });

  it("domein geverifieerd, in afwachting, of niet toegevoegd", async () => {
    nepFetch(() => new Response(JSON.stringify({ data: [{ name: "react2u.nl", status: "verified" }] })));
    expect(await domeinStatus()).toEqual({ soort: "geverifieerd", domein: "react2u.nl" });
    nepFetch(() => new Response(JSON.stringify({ data: [{ name: "react2u.nl", status: "pending" }] })));
    expect(await domeinStatus()).toEqual({ soort: "wacht", domein: "react2u.nl", status: "pending" });
    nepFetch(() => new Response(JSON.stringify({ data: [{ name: "flexhero.nl", status: "verified" }] })));
    expect(await domeinStatus()).toEqual({ soort: "ontbreekt", domein: "react2u.nl" });
  });

  it("een sleutel met alleen verzendrecht mag de domeinen niet zien: onbekend", async () => {
    nepFetch(() => new Response(JSON.stringify({ name: "restricted_api_key" }), { status: 401 }));
    expect(await domeinStatus()).toEqual({ soort: "onbekend" });
  });
});
