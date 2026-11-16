import { describe, expect, it } from "vitest";
import {
  bsnGeldig, controleerOnboarding, controleerVelden, controleerWerknemers, datumNaarIso, documentKlaar, INRICHTING, rijenUitPlak, keuzeUit,
  naarXpertRijen, schoneWerknemers, schoonVelden, voortgang, XPERT_KOLOMMEN,
} from "./onboarding";
import { crc32, kolom, xlsx } from "./xlsx";

describe("keuze van documenten", () => {
  it("houdt de volgorde van de catalogus en laat onbekende weg", () => {
    expect(keuzeUit(["vragen", "welkom", "onzin"], []).documenten).toEqual(["welkom", "vragen"]);
  });
  it("invullen alleen voor meegestuurde documenten die in te vullen zijn", () => {
    const k = keuzeUit(["welkom", "inrichting"], ["welkom", "inrichting", "werknemers"]);
    expect(k.invullen).toEqual(["inrichting"]);
  });
});

describe("voortgang", () => {
  const o = { documenten: ["welkom", "inrichting", "werknemers"], invullen: ["inrichting"], antwoorden: {}, gelezen: {} };
  it("telt ingevuld en afgevinkt", () => {
    expect(voortgang(o)).toEqual({ klaar: 0, totaal: 3 });
    const verder = { ...o, antwoorden: { inrichting: { data: {}, at: "", door: null } }, gelezen: { welkom: "x", werknemers: "x" } };
    expect(voortgang(verder)).toEqual({ klaar: 3, totaal: 3 });
  });
  it("een in te vullen document telt niet als alleen afgevinkt", () => {
    expect(documentKlaar({ ...o, gelezen: { inrichting: "x" } }, "inrichting")).toBe(false);
  });
});

describe("controles", () => {
  it("bsn met de elfproef", () => {
    expect(bsnGeldig("111222333")).toBe(true);
    expect(bsnGeldig("123456789")).toBe(false);
    expect(bsnGeldig("000000000")).toBe(false);
  });
  it("inrichting: verplichte velden en kvk", () => {
    const data = schoonVelden(INRICHTING, { bedrijfsnaam: "  Acme ", kvk: "1234", onbekend: "x" });
    expect(data).toEqual({ bedrijfsnaam: "Acme", kvk: "1234" });
    const f = controleerVelden(INRICHTING, data);
    expect(f.kvk).toBeTruthy();
    expect(f.factuur_email).toBe("Vul dit in.");
    expect(f.bedrijfsnaam).toBeUndefined();
  });
  it("versturen vraagt minstens één document", () => {
    expect(controleerOnboarding({ bedrijf: "Acme", email: null, documenten: [] })).toHaveLength(1);
  });
  it("datum van 31-12-1980 naar iso", () => {
    expect(datumNaarIso("1-2-1980")).toBe("1980-02-01");
    expect(datumNaarIso("1980")).toBeNull();
  });
});

describe("werknemers", () => {
  const rij = {
    voorletters: "J.", roepnaam: "Jan", achternaam: "Jansen", geboortedatum: "01-02-1980", bsn: "111 222 333",
    adres: "Dorpsstraat", huisnummer: "1", postcode: "5611nb", plaats: "Eindhoven", startdatum: "2024-01-01", geslacht: "Q",
  };
  it("schoont rijen op en laat lege weg", () => {
    const [w, ...rest] = schoneWerknemers([rij, {}, { onbekend: "x" }]);
    expect(rest).toHaveLength(0);
    expect(w.bsn).toBe("111222333");
    expect(w.postcode).toBe("5611NB");
    expect(w.geboortedatum).toBe("1980-02-01");
    expect(w.geslacht).toBeUndefined();
    expect(controleerWerknemers([w])).toEqual({});
  });
  it("meldt fouten per rij", () => {
    const f = controleerWerknemers([{ roepnaam: "Jan", bsn: "123456789" }]);
    expect(f[0].bsn).toBe("Dit BSN klopt niet");
    expect(f[0].achternaam).toBe("Verplicht");
  });
  it("zet ze in de 37 kolommen van XpertSuite", () => {
    const [x] = naarXpertRijen(schoneWerknemers([rij]), "D123");
    expect(x).toHaveLength(XPERT_KOLOMMEN.length);
    const waarde = (k: (typeof XPERT_KOLOMMEN)[number]) => x[XPERT_KOLOMMEN.indexOf(k)];
    expect(waarde("Burgerservicenummer")).toBe("111222333");
    expect(waarde("geboortedatum")).toBe("01-02-1980");
    expect(waarde("start_overeenkomst")).toBe("01-01-2024");
    expect(waarde("code_werkgever")).toBe("D123");
    expect(waarde("landcode")).toBe("NL");
  });
});

describe("xlsx", () => {
  it("crc32 en kolomletters", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    expect([kolom(0), kolom(25), kolom(26), kolom(36)]).toEqual(["A", "Z", "AA", "AK"]);
  });
  it("is een zip met het blad", () => {
    const b = xlsx([["a", "b"], ["1 & 2", ""]]);
    expect(Array.from(b.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const tekst = new TextDecoder().decode(b);
    expect(tekst).toContain("xl/worksheets/sheet1.xml");
    expect(tekst).toContain("1 &amp; 2");
  });
});


describe("plakken uit Excel", () => {
  it("leest rijen met de kopregel van het importbestand, in willekeurige kolomvolgorde", () => {
    const tekst = "Eigen_achternaam\tgeboortedatum\tBurgerservicenummer\troepnaam\tstartdatum_dienstverband\tpostcode\n" +
      "Jansen\t12-05-1980\t123456782\tJan\t01-01-2024\t5611ab\n" +
      "de Vries\t03-11-1992\t111222333\tSanne\t01-03-2025\t5612 AB\n";
    const { rijen, kopregel } = rijenUitPlak(tekst);
    expect(kopregel).toBe(true);
    expect(rijen).toEqual([
      { achternaam: "Jansen", geboortedatum: "1980-05-12", bsn: "123456782", roepnaam: "Jan", startdatum: "2024-01-01", postcode: "5611AB" },
      { achternaam: "de Vries", geboortedatum: "1992-11-03", bsn: "111222333", roepnaam: "Sanne", startdatum: "2025-03-01", postcode: "5612 AB" },
    ]);
  });

  it("herkent onze eigen labels en puntkomma's, en laat lege regels weg", () => {
    const { rijen, kopregel } = rijenUitPlak("Voorletters;Roepnaam;Achternaam;BSN\nJ.;Jan;Jansen;123456782\n\n;;;\n");
    expect(kopregel).toBe(true);
    expect(rijen).toEqual([{ voorletters: "J.", roepnaam: "Jan", achternaam: "Jansen", bsn: "123456782" }]);
  });

  it("zonder kopregel: de volgorde van onze velden", () => {
    const { rijen, kopregel } = rijenUitPlak("J.\tJan\t\tJansen\tM\t1980-05-12\t123456782");
    expect(kopregel).toBe(false);
    expect(rijen[0]).toMatchObject({ voorletters: "J.", roepnaam: "Jan", achternaam: "Jansen", geslacht: "M", geboortedatum: "1980-05-12", bsn: "123456782" });
  });
});
