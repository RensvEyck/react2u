import { describe, expect, it } from "vitest";
import { alineas, mailSamenvatting, naamUitEmail, sjabloon, voornaamUit, vulIn } from "./klantMail";

describe("mail vanuit de kaart", () => {
  it("vult de velden in en laat de aanhef kloppen zonder voornaam", () => {
    const s = sjabloon("offerte_nabellen");
    expect(vulIn(s.tekst, { voornaam: "Fatima", bedrijf: "Bakkerij De Korenaar", afzender: "Rens" })).toContain("Beste Fatima,\n\nEen tijdje geleden stuurde ik je onze offerte voor Bakkerij De Korenaar.");
    expect(vulIn(s.tekst, { voornaam: null, bedrijf: "Bakkerij De Korenaar", afzender: null })).toMatch(/^Beste,\n\n/);
    expect(vulIn(sjabloon("even_checken").onderwerp, { voornaam: null, bedrijf: "Zorggroep Oost", afzender: null })).toBe("Hoe gaat het bij Zorggroep Oost?");
  });

  it("haalt een voornaam uit de contactpersoon, maar geen voorletter", () => {
    expect(voornaamUit("Fatima El Amrani")).toBe("Fatima");
    expect(voornaamUit("Mevr. J. de Vries")).toBeNull();
    expect(voornaamUit("dhr. Henk Pieters")).toBe("Henk");
    expect(voornaamUit(null)).toBeNull();
  });

  it("splitst in alinea's en vat samen voor de tijdlijn", () => {
    const tekst = "Beste Fatima,\r\n\r\nBedankt voor je tijd. Fijn om te horen hoe het gaat.\n\nTot snel.";
    expect(alineas(tekst)).toEqual(["Beste Fatima,", "Bedankt voor je tijd. Fijn om te horen hoe het gaat.", "Tot snel."]);
    expect(mailSamenvatting("Je offerte van React2u", tekst)).toBe("Gemaild: Je offerte van React2u · Bedankt voor je tijd.");
  });

  it("maakt een naam uit een e-mailadres", () => {
    expect(naamUitEmail("rens@react2u.nl")).toBe("Rens");
    expect(naamUitEmail("cindy.faro@react2u.nl")).toBe("Cindy");
    expect(naamUitEmail(null)).toBe("");
  });

  it("valt terug op zelf schrijven", () => {
    expect(sjabloon("bestaat-niet").key).toBe("leeg");
  });
});
