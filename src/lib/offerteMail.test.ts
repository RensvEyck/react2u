import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { offerteCodeHtml, offerteGetekendHtml, offerteMailHtml, offerteSamenvatting } from "./offerteMail";
import { MERKEN } from "./offerteMerk";
import { sendOfferte, sendOfferteCode } from "./mail";
import type { Regel } from "./offertes";

const regels: Regel[] = [
  { id: "aansluiting", sectie: "Aansluiting", naam: "Aansluiting React2u Recover", prijs: 1200, eenheid: "jaar", soort: "vast" },
  { id: "arts", sectie: "Verzuim", naam: "Bedrijfsarts en taakdelegatie", prijs: 600, eenheid: "jaar", soort: "optie", aan: true },
  { id: "pmo", sectie: "Preventie", naam: "Preventief medisch onderzoek", prijs: 240, eenheid: "jaar", soort: "optie" },
  { id: "start", sectie: "Start", naam: "Startgesprek", prijs: 450, eenheid: "eenmalig", soort: "vast" },
  { id: "uur", sectie: "Tarieven", naam: "Extra uren casemanager", prijs: 95, eenheid: "uur", soort: "tarief" },
];
const offerte = { regels, keuze: null, medewerkers: 85, status: "verstuurd" as const, geldig_tot: "2026-12-01" };
const nu = new Date("2026-11-02T09:00:00+01:00");
const afzender = { naam: "Cindy de Vries", functie: "Accountmanager", email: "sales@react2u.nl", telefoon: "085 620 58 00" };
const basis = "https://react2u.nl";

describe("samenvatting voor de offertekaart", () => {
  it("bedragen eerst, dan de geldigheid; hooguit drie gegevens", () => {
    const s = offerteSamenvatting(offerte, nu);
    expect(s.feiten).toEqual([
      { label: "Per maand", waarde: "€150", sub: "excl. btw" },
      { label: "Eenmalig", waarde: "€450", sub: "excl. btw" },
      { label: "Geldig tot", waarde: "1 dec 2026", sub: "nog 29 dagen" },
    ]);
  });

  it("zonder eenmalig bedrag ook de medewerkers, in de volgorde van de kaart", () => {
    const s = offerteSamenvatting({ ...offerte, regels: regels.filter((r) => r.id !== "start") }, nu);
    expect(s.feiten.map((f) => f.label)).toEqual(["Per maand", "Medewerkers", "Geldig tot"]);
  });

  it("de onderdelen bij de voorgestelde keuze, en wat de klant er nog bij kan zetten", () => {
    const s = offerteSamenvatting(offerte, nu);
    expect(s.onderdelen).toEqual(["Aansluiting React2u Recover", "Bedrijfsarts en taakdelegatie", "Startgesprek"]);
    expect(s.opties).toBe(1);
    expect(s.kiezen).toBe(true);
  });

  it("volgt de keuze die de klant al maakte (herinnering)", () => {
    const s = offerteSamenvatting({ ...offerte, keuze: ["arts", "pmo"] }, nu);
    expect(s.feiten[0]).toEqual({ label: "Per maand", waarde: "€170", sub: "excl. btw" });
    expect(s.opties).toBe(0);
  });

  it("de laatste dag en een verlopen datum", () => {
    expect(offerteSamenvatting({ ...offerte, geldig_tot: "2026-11-02" }, nu).feiten.at(-1)?.sub).toBe("vandaag de laatste dag");
    expect(offerteSamenvatting({ ...offerte, geldig_tot: "2026-11-01" }, nu).feiten.at(-1)).toEqual({ label: "Geldig tot", waarde: "1 nov 2026" });
  });

  it("niets te kiezen: geen kies-stap", () => {
    expect(offerteSamenvatting({ ...offerte, regels: regels.filter((r) => r.soort !== "optie") }, nu).kiezen).toBe(false);
  });
});

describe("de offertemail", () => {
  const html = (extra: Partial<Parameters<typeof offerteMailHtml>[0]> = {}) =>
    offerteMailHtml({
      basis, merk: MERKEN.recover, aanhef: "Rens", bedrijf: "FlexHero Eindhoven B.V.", nummer: "2026-0003",
      titel: "Verzuimbegeleiding op maat", link: "https://react2u.nl/offerte/abc?x=1&y=2", bericht: "Bedankt voor het gesprek.\n\nTot snel!",
      geldigTot: "1 december 2026", afzender, ...offerteSamenvatting(offerte, nu), ...extra,
    });

  it("het label bovenaan: woordmerk, kleur, dienst en tagline", () => {
    const h = html();
    expect(h).toContain(">Recover<sup");
    expect(h).toContain(MERKEN.recover.kleur);
    expect(h).toContain(MERKEN.recover.tint);
    expect(h).toContain("Verzuimbegeleiding.");
    expect(h).toContain("Van ziekmelding tot herstel");
  });

  it("de kaart met bedrijf, bedragen en de knop; de link geëscaped", () => {
    const h = html();
    expect(h).toContain("FlexHero Eindhoven B.V.</p>");
    expect(h).toContain("€150");
    expect(h).toContain("Bekijk en onderteken je offerte");
    expect(h).toContain('href="https://react2u.nl/offerte/abc?x=1&amp;y=2"');
    expect(h).not.toContain("B.V..");
  });

  it("de boodschap als alinea's, met de collega eronder", () => {
    const h = html();
    expect(h).toContain("Bedankt voor het gesprek.</p>");
    expect(h).toContain("Tot snel!</p>");
    expect(h).toContain("Cindy de Vries");
    expect(h).toContain("Accountmanager, React2u");
    expect(h).toContain(">CV<");
  });

  it("escapet wat de collega of de klant intypt", () => {
    const h = html({ bedrijf: "<script>x</script> & Zn", bericht: "<b>hoi</b>" });
    expect(h).not.toContain("<script>");
    expect(h).not.toContain("<b>hoi</b>");
    expect(h).toContain("&lt;script&gt;x&lt;/script&gt; &amp; Zn");
  });

  it("een herinnering zegt dat hij nog klaarstaat", () => {
    expect(html({ herinnering: true })).toContain("Je offerte staat nog voor je klaar");
    expect(html()).toContain("Je offerte staat klaar");
  });

  it("zonder keuze geen stap Kiezen en geen zin over kiezen", () => {
    const h = html({ kiezen: false, opties: 0 });
    expect(h).not.toContain(">Kiezen<");
    expect(h).not.toContain("kies je zelf");
  });

  it("de lettertypen, het logo, de cirkel en de keurmerken komen van de site", () => {
    const h = html();
    for (const pad of ["/fonts/figtree-latin.woff2", "/fonts/dm-sans-latin.woff2", "/mail/logo-react2u.png", "/mail/cirkel-recover.png", "/beeld/keurmerken/iso9001.png"]) {
      expect(h).toContain(`${basis}${pad}`);
    }
  });
});

describe("code en bevestiging", () => {
  it("de code groot in beeld en vooraan in de voorbeeldtekst", () => {
    const h = offerteCodeHtml({ basis, merk: MERKEN.resist, code: "482913", nummer: "2026-0003", bedrijf: "FlexHero B.V.", afzender });
    expect(h).toContain(">482913</p>");
    expect(h).toMatch(/<div style="display:none[^>]*>482913 is je code/);
    expect(h).toContain(MERKEN.resist.tint);
  });

  it("de bevestiging laat de stap 'ondertekenen' weg: die is net gebeurd", () => {
    const h = offerteGetekendHtml({
      basis, merk: MERKEN.recover, naam: "Rens van Eyck", bedrijf: "FlexHero B.V.", nummer: "2026-0003", link: "https://react2u.nl/offerte/abc",
      hash: "abc123", moment: "2 november 2026 om 10.14 uur", regels: [{ naam: "Aansluiting", bedrag: "€100 per maand" }],
      totalen: [{ label: "Per maand", bedrag: "€100" }], afzender, pdf: true,
      vervolg: [{ kop: "Je ondertekent online", tekst: "…" }, { kop: "We plannen de start", tekst: "We bellen je." }],
    });
    expect(h).toContain("Bedankt, Rens.");
    expect(h).not.toContain("Je ondertekent online");
    expect(h).toContain("We plannen de start");
    expect(h).toContain("In de bijlage zit de ondertekende offerte");
    expect(h).toContain("abc123");
  });
});

describe("versturen", () => {
  let body: Record<string, unknown> | null = null;
  beforeEach(() => {
    body = null;
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("NOTIFY_FROM", "React2u <noreply@react2u.nl>");
    vi.stubEnv("RESEND_API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://react2u.nl");
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      return new Response("{}", { status: 200 });
    }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("een offerte voor een RI&E krijgt de branding van Resist; onderwerp en antwoordadres blijven", async () => {
    const r = await sendOfferte({
      to: "klant@flexhero.nl", aanhef: "Rens", bedrijf: "FlexHero B.V.", nummer: "2026-0004", link: "https://react2u.nl/offerte/abc",
      bericht: null, geldigTot: "1 december 2026", afzender, vorm: "rie", samenvatting: offerteSamenvatting(offerte, nu),
    });
    expect(r).toEqual({ ok: true });
    expect(body!.subject).toBe("Offerte 2026-0004 voor FlexHero B.V.");
    expect(body!.reply_to).toBe("sales@react2u.nl");
    expect(String(body!.html)).toContain(">Resist<sup");
    expect(String(body!.html)).toContain(MERKEN.resist.kleur);
    expect(String(body!.html)).toContain("https://react2u.nl/mail/logo-react2u.png");
  });

  it("zonder vorm valt de mail terug op Recover", async () => {
    await sendOfferteCode({ to: "klant@flexhero.nl", code: "000123", nummer: "2026-0004", bedrijf: "FlexHero B.V.", afzender });
    expect(body!.subject).toBe("000123 is je code voor offerte 2026-0004");
    expect(String(body!.html)).toContain(MERKEN.recover.tint);
  });
});
