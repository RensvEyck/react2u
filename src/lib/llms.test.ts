import { describe, expect, it } from "vitest";
import { CONTACT_FALLBACK } from "./content";
import { llmsTekst } from "./llms";
import type { Page, Post, Vacancy } from "./types";

const base = "https://react2u.nl";

const pagina = (slug: string, title: string, seo_description: string | null = null) =>
  ({ slug, title, seo_title: null, seo_description }) as Page;

const tekst = (extra: { pages?: Page[]; posts?: Post[]; vacancies?: Vacancy[] } = {}) =>
  llmsTekst({
    base,
    pages: extra.pages ?? [
      pagina("home", "Home"),
      pagina("recover", "React2u Recover", "Je vaste casemanager begeleidt elk verzuimdossier."),
      pagina("contact", "Contact", "Bel of mail\nons."),
      pagina("verzuimbegeleiding-wvp", "Verzuimbegeleiding WVP", "Oude pagina met een vaste doorverwijzing."),
      pagina("werkgevers-oud-20261006", "Werkgevers (oud)"),
      pagina("nieuwe-actie", "Nieuwe [actie]", "Net gepubliceerd."),
      pagina("sitemap", "Sitemap"),
    ],
    posts: extra.posts ?? [],
    vacancies: extra.vacancies ?? [],
    contact: CONTACT_FALLBACK,
  });

describe("llmsTekst", () => {
  it("voldoet aan wat Lighthouse controleert: H1 bovenaan, lang genoeg, Markdown-links", () => {
    const t = tekst();
    expect(t.split("\n")[0]).toBe("# React2u");
    expect(t.length).toBeGreaterThan(50);
    expect(t).toMatch(/\[[^\]]+\]\(https:\/\/react2u\.nl\/[^)]*\)/);
    expect(t.endsWith("\n")).toBe(true);
  });

  it("zet een pagina onder zijn kopje met de SEO-omschrijving op één regel", () => {
    const t = tekst();
    expect(t).toContain("## Diensten\n\n- [React2u Recover](https://react2u.nl/recover): Je vaste casemanager begeleidt elk verzuimdossier.");
    expect(t).toContain("- [Contact](https://react2u.nl/contact): Bel of mail ons.");
  });

  it("laat de home, doorverwezen pagina's en reservekopieën weg", () => {
    const t = tekst();
    expect(t).not.toContain("react2u.nl/home");
    expect(t).not.toContain("verzuimbegeleiding-wvp");
    expect(t).not.toContain("-oud-");
  });

  it("zet een nieuwe pagina onder Meer pagina's, zonder haken in de linktekst", () => {
    expect(tekst()).toContain("## Meer pagina's\n\n- [Nieuwe actie](https://react2u.nl/nieuwe-actie): Net gepubliceerd.");
  });

  it("laat een kopje zonder gepubliceerde pagina's weg, en de blog zonder artikelen", () => {
    const t = tekst();
    expect(t).not.toContain("## Voor werknemers");
    expect(t).not.toContain("## Kennisbank");
    expect(t).toContain("## Optional\n\n- [Sitemap](https://react2u.nl/sitemap)");
  });

  it("noemt artikelen en vacatures met hun eigen adres", () => {
    const t = tekst({
      posts: [{ slug: "loonsanctie-uwv", title: "Loonsanctie UWV", seo_description: null, excerpt: "Wat is het?" } as Post],
      vacancies: [
        { slug: "bedrijfsarts-eindhoven", title: "Bedrijfsarts", location: "Eindhoven", hours: "24-36 uur", seo_description: "Tijd voor je spreekuur.", intro: null } as Vacancy,
      ],
    });
    expect(t).toContain("- [Loonsanctie UWV](https://react2u.nl/blog/loonsanctie-uwv): Wat is het?");
    expect(t).toContain("- [Bedrijfsarts](https://react2u.nl/vacatures/bedrijfsarts-eindhoven): Eindhoven, 24-36 uur. Tijd voor je spreekuur.");
    expect(t).toContain("- [Arbodienst in Noord-Brabant](https://react2u.nl/arbodienst-provincie-noord-brabant)");
  });
});
