import { describe, expect, it } from "vitest";
import { BERICHT_STANDAARD, BROCHURE_DIENSTEN, BROCHURE_WEERGAVE, brochureWeergave, controleerBrochure } from "./brochures";
import { brochureMailHtml } from "./brochureMail";
import { MERKEN } from "./offerteMerk";

describe("brochures (migratie 0030)", () => {
  it("weergave: verstuurd en geopend is bekeken, de rest is de status zelf", () => {
    expect(brochureWeergave({ status: "verstuurd", bekeken_at: "2026-11-02T10:00:00Z" })).toBe("bekeken");
    expect(brochureWeergave({ status: "verstuurd", bekeken_at: null })).toBe("verstuurd");
    expect(brochureWeergave({ status: "concept", bekeken_at: "2026-11-02T10:00:00Z" })).toBe("concept");
    expect(brochureWeergave({ status: "ingetrokken", bekeken_at: null })).toBe("ingetrokken");
    for (const w of Object.values(BROCHURE_WEERGAVE)) expect(w.label.length).toBeGreaterThan(2);
  });

  it("controle: zonder bedrijf of met een fout e-mailadres kan hij niet open", () => {
    expect(controleerBrochure({ bedrijf: "", email: null })).toHaveLength(1);
    expect(controleerBrochure({ bedrijf: "X", email: "geen-adres" })).toHaveLength(1);
    expect(controleerBrochure({ bedrijf: "X", email: "a@b.nl" })).toEqual([]);
  });

  it("het standaardbericht werkt met invulvelden en de zes diensten staan in de volgorde van de site", () => {
    expect(BERICHT_STANDAARD).toContain("{bedrijf}");
    expect([...BROCHURE_DIENSTEN]).toEqual(["recover", "resist", "restart", "reflex", "ready", "reward"]);
    for (const slug of BROCHURE_DIENSTEN) expect(MERKEN[slug]).toBeDefined();
  });

  it("de mail: knop, aanhef, het bericht en alle zes diensten, met de bedrijfsnaam veilig geëscaped", () => {
    const diensten = BROCHURE_DIENSTEN.map((slug) => ({ naam: MERKEN[slug].naam, kleur: MERKEN[slug].kleur, dienst: MERKEN[slug].dienst, tekst: `Over ${MERKEN[slug].naam}.` }));
    const html = brochureMailHtml({
      basis: "https://react2u.nl",
      aanhef: "Karin",
      bedrijf: "Vermeulen <Transport> BV",
      nummer: "B2026-0001",
      link: "https://react2u.nl/brochure/abc",
      bericht: "Leuk dat we elkaar spraken.\n\nHier is de brochure.",
      afzender: { naam: "Rens van Eyck", functie: "Eigenaar", email: "sales@react2u.nl", telefoon: "085 620 58 00" },
      diensten,
    });
    expect(html).toContain('href="https://react2u.nl/brochure/abc"');
    expect(html).toContain("Beste Karin,");
    expect(html).toContain("Leuk dat we elkaar spraken.");
    expect(html).toContain("Vermeulen &lt;Transport&gt; BV");
    expect(html).not.toContain("<Transport>");
    for (const d of diensten) expect(html).toContain(`>${d.naam}</span>`);
    expect(html).toContain("Bekijk de brochure");
    expect(html).toContain("met al onze tarieven op een rij");
    expect(html).toContain("Rens van Eyck");
    expect(html).toContain("mailto:sales@react2u.nl");
    // Een herinnering zegt dat hij nog klaarstaat.
    expect(brochureMailHtml({ basis: "https://react2u.nl", aanhef: null, bedrijf: "X", nummer: "B2026-0002", link: "https://react2u.nl/brochure/def", bericht: null, afzender: { naam: null, functie: null, email: null, telefoon: null }, herinnering: true, diensten })).toContain("staat nog voor je klaar");
  });
});
