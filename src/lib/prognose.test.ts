import { describe, expect, it } from "vitest";
import {
  advies, bezetting, bijdragen, doorlooptijd, draagkracht, fteTekst, gemetenPerMaand, huidigeVerhouding, isCasemanager, kansVan, leesNormen,
  maandenVanaf, prognose, radar, recent, STANDAARD_NORMEN, zelfdePersoon,
  type ContractIn, type KlantIn, type MedewerkerIn, type Normen, type OfferteIn,
} from "./prognose";

const VANDAAG = "2026-11-19";
const normen = (n: Partial<Normen> = {}): Normen => ({ ...STANDAARD_NORMEN, ...n });

const klant = (bedrijf: string, k: Partial<KlantIn> = {}): KlantIn => ({ id: `k-${bedrijf}`, bedrijf, status: "klant", medewerkers: 100, startdatum: "2025-01-01", casemanager: null, ...k });
const offerte = (bedrijf: string, o: Partial<OfferteIn> = {}): OfferteIn => ({
  id: `o-${bedrijf}`, nummer: `2026-${bedrijf.length}`, bedrijf, vorm: "verzuimbegeleiding", status: "getekend", medewerkers: 50,
  ingangsdatum: null, getekend_at: "2026-11-01T10:00:00Z", verstuurd_at: "2026-10-20T10:00:00Z", geldig_tot: null, ...o,
});

describe("normen", () => {
  it("leest de normen en valt bij onzin terug op de standaard", () => {
    expect(leesNormen(null)).toEqual(STANDAARD_NORMEN);
    expect(leesNormen({ werknemersPerFte: "1.200", urenPerFte: 99, inrichtingUren: "12,5", urenPerOpdracht: { rie: 24, spoor2: "nee", onbekend: 3 }, kansPijplijn: 40 }))
      .toEqual({ ...STANDAARD_NORMEN, werknemersPerFte: 1200, inrichtingUren: 12.5, urenPerOpdracht: { rie: 24 }, kansPijplijn: 40 });
  });

  it("neemt de ingestelde kans, anders de hitrate, anders een derde", () => {
    expect(kansVan({ kansPijplijn: 50 }, 20)).toBe(50);
    expect(kansVan({ kansPijplijn: null }, 20)).toBe(20);
    expect(kansVan({ kansPijplijn: null }, null)).toBe(33);
  });

  it("rekent de doorlooptijd als mediaan, of drie weken zonder gegevens", () => {
    expect(doorlooptijd([])).toBe(21);
    expect(doorlooptijd([
      offerte("a", { verstuurd_at: "2026-10-01T00:00:00Z", getekend_at: "2026-10-11T00:00:00Z" }),
      offerte("b", { verstuurd_at: "2026-10-01T00:00:00Z", getekend_at: "2026-10-31T00:00:00Z" }),
      offerte("c", { verstuurd_at: "2026-10-01T00:00:00Z", getekend_at: "2026-10-21T00:00:00Z" }),
    ])).toBe(20);
  });

  it("geeft de komende maanden vanaf deze maand", () => {
    expect(maandenVanaf(VANDAAG, 3)).toEqual(["2026-11", "2026-12", "2027-01"]);
  });
});

describe("de bronnen", () => {
  const contracten: ContractIn[] = [{ bedrijf: "Contract BV", status: "getekend", ingangsdatum: "2027-02-01" }];

  it("telt een lopende klant met het aantal van de stamkaart, en anders dat van de getekende offerte", () => {
    const { bijdragen: b } = bijdragen({
      klanten: [klant("Bakkerij De Korenaar", { medewerkers: 120 }), klant("Jansen Bouw", { medewerkers: null })],
      offertes: [offerte("Jansen Bouw B.V.", { medewerkers: 40, getekend_medewerkers: 45 })],
      contracten: [], normen: normen(), kans: 30, vandaag: VANDAAG,
    });
    expect(b.map((x) => [x.bedrijf, x.soort, x.werknemers, x.startBron])).toEqual([
      ["Bakkerij De Korenaar", "lopend", 120, "kaart"],
      ["Jansen Bouw", "lopend", 45, "kaart"],
    ]);
  });

  it("kiest de startdatum: offerte, dan kaart, dan contract, dan tekenen plus inrichting", () => {
    const { bijdragen: b } = bijdragen({
      klanten: [
        klant("Offerte BV", { status: "akkoord", startdatum: "2027-03-01" }),
        klant("Kaart BV", { status: "akkoord", startdatum: "2027-01-01" }),
        klant("Contract BV", { status: "inrichten", startdatum: null }),
        klant("Getekend BV", { status: "akkoord", startdatum: null }),
        klant("Loopt BV", { status: "klant", startdatum: null }),
      ],
      offertes: [
        offerte("Offerte BV", { ingangsdatum: "2027-04-01" }),
        offerte("Getekend BV", { getekend_at: "2026-11-10T10:00:00Z" }),
      ],
      contracten, normen: normen({ inrichtingWeken: 4 }), kans: 30, vandaag: VANDAAG,
    });
    expect(b.map((x) => [x.bedrijf, x.start, x.startBron, x.soort])).toEqual([
      ["Offerte BV", "2027-04-01", "offerte", "getekend"],
      ["Kaart BV", "2027-01-01", "kaart", "getekend"],
      ["Contract BV", "2027-02-01", "contract", "getekend"],
      ["Getekend BV", "2026-12-08", "getekend", "getekend"],
      ["Loopt BV", null, "loopt", "lopend"],
    ]);
  });

  it("neemt de pijplijn mee met de kans, maar niet voor een bedrijf dat al klant is, en niet als hij verlopen is", () => {
    const { bijdragen: b } = bijdragen({
      klanten: [klant("Bestaand BV")],
      offertes: [
        offerte("Nieuw BV", { status: "verstuurd", getekend_at: null, verstuurd_at: "2026-11-10T10:00:00Z", medewerkers: 200 }),
        offerte("Bestaand BV", { status: "verstuurd", getekend_at: null }),
        offerte("Verlopen BV", { status: "verstuurd", getekend_at: null, geldig_tot: "2026-11-01" }),
        offerte("RI&E BV", { status: "verstuurd", vorm: "rie", getekend_at: null }),
      ],
      contracten: [], normen: normen({ inrichtingWeken: 4 }), kans: 40, vandaag: VANDAAG,
    });
    const pijplijn = b.filter((x) => x.soort === "pijplijn");
    expect(pijplijn).toHaveLength(1);
    // Verstuurd 10 nov plus 21 dagen is 1 december; plus vier weken inrichten is 29 december.
    expect(pijplijn[0]).toMatchObject({ bedrijf: "Nieuw BV", werknemers: 200, kans: 0.4, start: "2026-12-29", startBron: "verwacht" });
  });

  it("zet eenmalig werk in de maand van ingang, of een maand na tekenen", () => {
    const { opdrachten } = bijdragen({
      klanten: [],
      offertes: [
        offerte("A", { vorm: "rie", ingangsdatum: "2027-01-15" }),
        offerte("B", { vorm: "spoor2", getekend_at: "2026-11-10T10:00:00Z" }),
        offerte("C", { vorm: "pago", getekend_at: "2026-06-01T10:00:00Z" }),
        offerte("D", { vorm: "verzuimtraining", status: "verstuurd", getekend_at: null, ingangsdatum: "2027-02-01" }),
      ],
      contracten: [], normen: normen(), kans: 50, vandaag: VANDAAG,
    });
    expect(opdrachten.map((o) => [o.vorm, o.maand, o.kans])).toEqual([
      ["rie", "2027-01", 1],
      ["spoor2", "2026-12", 1],
      ["verzuimtraining", "2027-02", 0.5],
    ]);
  });
});

describe("de prognose", () => {
  const medewerkers: MedewerkerIn[] = [
    { id: "m1", naam: "Sanne Verbeek", functie: "Casemanager Verzuim", contracturen: 36, actief: true, user_id: "u1" },
    { id: "m2", naam: "Carla Dekker", functie: "Casemanager", contracturen: 18, actief: true, user_id: null },
    { id: "m3", naam: "Ruud", functie: "Algemeen Directeur", contracturen: 40, actief: true },
    { id: "m4", naam: "Oud", functie: "Casemanager", contracturen: 36, actief: false },
  ];

  it("telt alleen actieve casemanagers in de bezetting", () => {
    expect(medewerkers.filter(isCasemanager).map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(bezetting(medewerkers, 36)).toBe(1.5);
  });

  it("rekent de huidige verhouding alleen als elke lopende klant een aantal heeft", () => {
    const { bijdragen: b } = bijdragen({ klanten: [klant("A", { medewerkers: 900 }), klant("B", { medewerkers: 600 })], offertes: [], contracten: [], normen: normen(), kans: 30, vandaag: VANDAAG });
    expect(huidigeVerhouding(b, 1.5)).toEqual({ verhouding: 1000, werknemers: 1500, zonderAantal: 0 });
    const { bijdragen: zonder } = bijdragen({ klanten: [klant("A", { medewerkers: 900 }), klant("B", { medewerkers: null })], offertes: [], contracten: [], normen: normen(), kans: 30, vandaag: VANDAAG });
    expect(huidigeVerhouding(zonder, 1.5)).toEqual({ verhouding: null, werknemers: 900, zonderAantal: 1 });
  });

  it("rekent per maand werknemers, benodigde fte, bezetting en ruimte", () => {
    const n = normen({ inrichtingUren: 26, urenPerOpdracht: { rie: 52 } });
    const { bijdragen: b, opdrachten } = bijdragen({
      klanten: [klant("Lopend", { medewerkers: 1500 }), klant("Komt", { status: "akkoord", medewerkers: 600, startdatum: "2027-01-01" })],
      offertes: [
        offerte("Pijp", { status: "verstuurd", getekend_at: null, medewerkers: 1000, ingangsdatum: "2027-01-01" }),
        offerte("RIE", { vorm: "rie", ingangsdatum: "2027-01-10" }),
      ],
      contracten: [], normen: n, kans: 50, vandaag: VANDAAG,
    });
    const [nov, dec, jan] = prognose({ bijdragen: b, opdrachten, normen: n, norm: 1000, bezetting: 1.5, maanden: maandenVanaf(VANDAAG, 3) });
    expect([nov.werknemersZeker, nov.werknemersVerwacht, nov.nodigZeker, nov.ruimte]).toEqual([1500, 1500, 1.5, 0]);
    expect(dec.nieuweKlanten).toEqual([]);
    expect(jan.werknemersZeker).toBe(2100);
    expect(jan.werknemersVerwacht).toBe(2600);
    expect(jan.nieuweKlanten).toEqual([{ bedrijf: "Komt", kans: 1 }, { bedrijf: "Pijp", kans: 0.5 }]);
    // Inrichten: 26 uur voor Komt en de helft voor Pijp; de RI&E 52 uur. Een fte-maand is 36 × 52/12 = 156 uur.
    expect(jan.inrichtingUren).toBe(39);
    expect(jan.eenmaligUren).toBe(52);
    expect(jan.nodigZeker).toBe(2.6); // 2100 / 1000 + (26 + 52) / 156
    expect(jan.nodigVerwacht).toBe(3.2); // 2600 / 1000 + (39 + 52) / 156
    expect(jan.ruimte).toBe(-1.7);
  });

  it("rekent een scenario met een extra collega vanaf een maand", () => {
    const { bijdragen: b, opdrachten } = bijdragen({ klanten: [klant("A", { medewerkers: 2000 })], offertes: [], contracten: [], normen: normen(), kans: 30, vandaag: VANDAAG });
    const m = prognose({ bijdragen: b, opdrachten, normen: normen(), norm: 1000, bezetting: 1.5, scenario: { extraFte: 1, vanaf: "2026-12" }, maanden: maandenVanaf(VANDAAG, 2) });
    expect(m.map((x) => x.bezetting)).toEqual([1.5, 2.5]);
    expect(m.map((x) => x.ruimte)).toEqual([-0.5, 0.5]);
  });

  it("zonder norm geen fte, wel werknemers", () => {
    const { bijdragen: b, opdrachten } = bijdragen({ klanten: [klant("A")], offertes: [], contracten: [], normen: normen(), kans: 30, vandaag: VANDAAG });
    const [nov] = prognose({ bijdragen: b, opdrachten, normen: normen(), norm: null, bezetting: 1, maanden: ["2026-11"] });
    expect(nov).toMatchObject({ werknemersZeker: 100, nodigZeker: null, ruimte: null });
  });

  it("adviseert wanneer je moet werven, met de wervingstijd ervoor", () => {
    const m = (maand: string, zeker: number, verwacht: number) => ({ maand, werknemersZeker: 0, werknemersVerwacht: 0, nieuweKlanten: [], inrichtingUren: 0, eenmaligUren: 0, nodigZeker: zeker, nodigVerwacht: verwacht, bezetting: 2, ruimte: 2 - verwacht });
    expect(advies([m("2026-11", 1.8, 2), m("2027-03", 2.5, 3)], 3, VANDAAG)).toEqual({ soort: "werven", maand: "2027-03", tekort: 0.5, uiterlijk: "2026-12", zeker: true });
    expect(advies([m("2026-11", 1.8, 2.4)], 3, VANDAAG)).toEqual({ soort: "werven", maand: "2026-11", tekort: 0.4, uiterlijk: "2026-11", zeker: false });
    expect(advies([m("2026-11", 1.8, 2.1)], 3, VANDAAG)).toEqual({ soort: "ruimte", tot: null });
    expect(advies([{ ...m("2026-11", 0, 0), nodigZeker: null }], 3, VANDAAG)).toEqual({ soort: "geen-norm" });
    expect(fteTekst(2.45)).toBe("2,5");
    expect(fteTekst(2)).toBe("2");
  });
});

describe("de weekevaluaties", () => {
  const ev = (user_id: string, week: string, tijd: number, energie = 7) => ({ user_id, week, antwoorden: { tijd, energie, emotie: 6 } });

  it("zet de gemeten werkdruk per maand naast de prognose", () => {
    const g = gemetenPerMaand([ev("u1", "2026-11-02", 5), ev("u2", "2026-11-09", 7), ev("u1", "2026-10-05", 8)], ["2026-10", "2026-11", "2026-12"]);
    expect(g).toEqual([
      { maand: "2026-10", tijd: 8, energie: 7, emotie: 6, n: 1 },
      { maand: "2026-11", tijd: 6, energie: 7, emotie: 6, n: 2 },
      { maand: "2026-12", tijd: null, energie: null, emotie: null, n: 0 },
    ]);
    expect(gemetenPerMaand([ev("u1", "2026-11-02", 5), ev("u2", "2026-11-09", 7)], ["2026-11"], new Set(["u1"]))[0].tijd).toBe(5);
  });

  it("noemt de draagkracht krap, redelijk of ruim", () => {
    expect([draagkracht(5.4), draagkracht(6.5), draagkracht(7), draagkracht(null)]).toEqual(["krap", "redelijk", "ruim", null]);
    expect(recent([ev("u1", "2026-11-02", 5), ev("u1", "2026-10-01", 9)], "2026-10-20", "tijd")).toEqual({ gem: 5, n: 1 });
  });

  it("herkent de casemanager op de kaart aan de hele naam of alleen de voornaam", () => {
    expect(zelfdePersoon("Sanne", "Sanne Verbeek")).toBe(true);
    expect(zelfdePersoon("sanne verbeek", "Sanne Verbeek")).toBe(true);
    expect(zelfdePersoon("Sanne de Wit", "Sanne Verbeek")).toBe(false);
    expect(zelfdePersoon("Su", "Sanne Verbeek")).toBe(false);
    expect(zelfdePersoon(null, "Sanne Verbeek")).toBe(false);
  });

  it("zet per casemanager de portefeuille naast wat hij zelf invulde", () => {
    const medewerkers: MedewerkerIn[] = [
      { id: "m1", naam: "Sanne Verbeek", functie: "Casemanager", contracturen: 36, actief: true, user_id: "u1" },
      { id: "m2", naam: "Carla Dekker", functie: "Casemanager", contracturen: 18, actief: true, user_id: null },
    ];
    const { bijdragen: b } = bijdragen({
      klanten: [
        klant("A", { medewerkers: 900, casemanager: "Sanne" }),
        klant("B", { medewerkers: 300, casemanager: "Sanne Verbeek" }),
        klant("C", { medewerkers: 400, casemanager: "Carla", status: "akkoord", startdatum: "2027-01-01" }),
      ],
      offertes: [], contracten: [], normen: normen(), kans: 30, vandaag: VANDAAG,
    });
    const r = radar({ medewerkers, bijdragen: b, evaluaties: [ev("u1", "2026-11-09", 4, 5), ev("u1", "2026-11-16", 5, 6)], norm: 1000, urenPerFte: 36, sinds: "2026-10-20" });
    expect(r.map((x) => [x.medewerker.naam, x.werknemers, x.klanten, x.erbij, x.bezetting, x.tijd, x.energie])).toEqual([
      ["Sanne Verbeek", 1200, 2, 0, 120, 4.5, 5.5],
      ["Carla Dekker", 0, 0, 400, 0, null, null],
    ]);
  });
});
