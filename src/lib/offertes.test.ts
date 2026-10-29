import { describe, expect, it } from "vitest";
import {
  berekenTotalen, controleer, datumLang, euro, geldigeKeuze, herstelKeuze, isNaam, normaliseerRegels, prijsLabel,
  secties, standaardKeuze, waardeVan, weergaveVan, wissel, vulIn, normaliseerVervolg, maandprijs, regelbedrag, type Regel,
} from "./offertes";
import { alleSjablonen, sjabloonVoorStart, sleutelUit } from "./offerteSjablonen";
import { blokkenUit } from "@/components/offerte/OfferteTekst";
import { catalogusStandaard, eenheidUit, parsePrijs, STARTPUNTEN } from "./offerteCatalogus";

const R = (r: Partial<Regel> & Pick<Regel, "id" | "soort">): Regel => ({
  sectie: "Aansluiting", naam: r.id, prijs: 10, eenheid: "eenmalig", ...r,
});

const REGELS: Regel[] = [
  R({ id: "basis", soort: "keuze", groep: "aansluiting", prijs: 38.5, eenheid: "medewerker_jaar", aan: true }),
  R({ id: "compleet", soort: "keuze", groep: "aansluiting", prijs: 139.5, eenheid: "medewerker_jaar" }),
  R({ id: "rie", soort: "optie", prijs: 950, eenheid: "eenmalig" }),
  R({ id: "pmo", soort: "optie", prijs: 50, eenheid: "maand", aan: true }),
  R({ id: "start", soort: "vast", prijs: 0, eenheid: "eenmalig" }),
  R({ id: "ba", soort: "tarief", prijs: 240, eenheid: "uur" }),
];

describe("keuze", () => {
  it("begint met de voorgeselecteerde keuze en de opties die aan staan", () => {
    expect(standaardKeuze(REGELS).sort()).toEqual(["basis", "pmo"]);
  });

  it("geldigeKeuze doet wat offerte_effectieve_keuze in de database doet", () => {
    expect(geldigeKeuze(REGELS, ["compleet", "rie", "ba"])).toEqual(["compleet", "rie", "start"]);
    expect(geldigeKeuze(REGELS, ["rie"])).toBeNull();
    expect(geldigeKeuze(REGELS, ["basis", "compleet"])).toBeNull();
    expect(geldigeKeuze([R({ id: "a", soort: "vast" })], [])).toEqual(["a"]);
  });

  it("herstelt een keuze na een wijziging: onbekende ids weg, per groep één", () => {
    expect(herstelKeuze(REGELS, ["weg", "rie"]).sort()).toEqual(["basis", "rie"]);
    expect(herstelKeuze(REGELS, ["basis", "compleet"])).toContain("basis");
    expect(herstelKeuze(REGELS, null).sort()).toEqual(["basis", "pmo"]);
  });

  it("wisselt een optie en vervangt een keuze binnen zijn groep", () => {
    expect(wissel(REGELS, ["basis"], "rie").sort()).toEqual(["basis", "rie"]);
    expect(wissel(REGELS, ["basis", "rie"], "rie")).toEqual(["basis"]);
    expect(wissel(REGELS, ["basis", "rie"], "compleet").sort()).toEqual(["compleet", "rie"]);
    expect(wissel(REGELS, ["basis"], "start")).toEqual(["basis"]);
  });
});

describe("rekenen", () => {
  it("telt per jaar en eenmalig apart, tarieven niet", () => {
    const t = berekenTotalen(REGELS, ["basis", "pmo", "rie"], 25);
    expect(t.perJaar).toBe(38.5 * 25 + 50 * 12);
    expect(t.eenmalig).toBe(950);
    expect(t.regels.map((r) => r.regel.id)).toEqual(["basis", "rie", "pmo", "start"]);
  });

  it("rekent zonder aantal medewerkers met één", () => {
    expect(berekenTotalen(REGELS, ["compleet"], null).perJaar).toBe(139.5);
  });

  it("een eigen aantal wint van het aantal medewerkers", () => {
    const regels = [R({ id: "x", soort: "vast", prijs: 100, eenheid: "medewerker_jaar", aantal: 3 })];
    expect(berekenTotalen(regels, [], 50).perJaar).toBe(300);
  });

  it("op aanvraag doet mee zonder bedrag", () => {
    const regels = [R({ id: "x", soort: "vast", prijs: null, eenheid: "op_aanvraag" })];
    const t = berekenTotalen(regels, [], 10);
    expect(t.perJaar + t.eenmalig).toBe(0);
    expect(t.regels[0].bedrag).toBeNull();
  });

  it("een getekende offerte telt wat er getekend is", () => {
    const w = waardeVan({ regels: REGELS, keuze: ["compleet", "start"], medewerkers: 10, status: "getekend" });
    expect(w.perJaar).toBe(1395);
  });
});

describe("opmaak", () => {
  it("schrijft bedragen zoals de tarievenpagina", () => {
    expect(euro(38.5)).toBe("€38,50");
    expect(euro(240)).toBe("€240");
    expect(euro(3365)).toBe("€3.365");
    expect(euro(1234.5)).toBe("€1.234,50");
  });

  it("prijslabels", () => {
    expect(prijsLabel({ prijs: 38.5, eenheid: "medewerker_jaar" })).toBe("€38,50 per medewerker per jaar");
    expect(prijsLabel({ prijs: null, eenheid: "uur" })).toBe("Uurtarief");
    expect(prijsLabel({ prijs: null, eenheid: "op_aanvraag" })).toBe("Op aanvraag");
  });

  it("datums in het Nederlands", () => {
    expect(datumLang("2026-11-28")).toBe("28 november 2026");
    expect(datumLang("2026-12-31T23:30:00Z")).toBe("1 januari 2027");
  });

  it("groepeert per kop in volgorde van voorkomen", () => {
    const s = secties([R({ id: "a", soort: "vast", sectie: "B" }), R({ id: "b", soort: "vast", sectie: "A" }), R({ id: "c", soort: "vast", sectie: "B" })]);
    expect(s.map((x) => [x.naam, x.regels.length])).toEqual([["B", 2], ["A", 1]]);
  });

  it("zet een kop met alleen tarieven achteraan", () => {
    const s = secties([R({ id: "t", soort: "tarief", sectie: "Tarieven" }), R({ id: "a", soort: "optie", sectie: "Opties" })]);
    expect(s.map((x) => x.naam)).toEqual(["Opties", "Tarieven"]);
  });
});

describe("normaliseren", () => {
  it("maakt onbekende waarden veilig en ids uniek", () => {
    const n = normaliseerRegels([
      { id: "a", naam: "  Een  ", soort: "raar", eenheid: "raar", prijs: "1.234,50" },
      { id: "a", naam: "Twee", soort: "keuze", prijs: -5, eenheid: "jaar" },
      { naam: "" },
      "onzin",
      { naam: "Drie", prijs: null, eenheid: "eenmalig", soort: "optie", aan: "ja", kleur: "red" },
    ]);
    expect(n).toHaveLength(3);
    expect(n[0]).toMatchObject({ id: "a", naam: "Een", soort: "vast", eenheid: "eenmalig", prijs: 1234.5 });
    expect(n[1].id).not.toBe("a");
    expect(n[1]).toMatchObject({ prijs: 0, groep: "keuze" });
    expect(n[2]).toMatchObject({ prijs: null, eenheid: "op_aanvraag" });
    expect(n[2].aan).toBeUndefined();
    expect(n[2].kleur).toBeUndefined();
  });

  it("controleert of een offerte de deur uit kan", () => {
    expect(controleer({ bedrijf: "X", email: "a@b.nl", regels: REGELS })).toEqual([]);
    const fouten = controleer({ bedrijf: "", email: "", regels: [R({ id: "a", soort: "keuze", groep: "g" })] });
    expect(fouten).toHaveLength(3);
  });

  it("status voor het overzicht", () => {
    expect(weergaveVan({ status: "verstuurd", bekeken_at: null, geldig_tot: "2026-01-01" }, "2026-02-01")).toBe("verlopen");
    expect(weergaveVan({ status: "verstuurd", bekeken_at: "x", geldig_tot: null })).toBe("bekeken");
    expect(weergaveVan({ status: "getekend", bekeken_at: "x", geldig_tot: "2020-01-01" })).toBe("getekend");
  });

  it("herkent een getypte naam", () => {
    expect(isNaam("Anne-Marie van der Berg")).toBe(true);
    expect(isNaam("Zoë O'Neill")).toBe(true);
    expect(isNaam("x")).toBe(false);
    expect(isNaam("<script>")).toBe(false);
  });
});

describe("prijslijst als bouwdoos", () => {
  it("leest bedragen en eenheden", () => {
    expect(parsePrijs("€142,50")).toBe(142.5);
    expect(parsePrijs("€3.365")).toBe(3365);
    expect(parsePrijs("per uur")).toBeNull();
    expect(eenheidUit("Per maand", "per traject", "€389")).toBe("maand");
    expect(eenheidUit("3 sessies", "per traject", "€2.025")).toBe("traject");
    expect(eenheidUit(undefined, "per werknemer per jaar", "€38,50")).toBe("medewerker_jaar");
    expect(eenheidUit(undefined, "per uur", "€240")).toBe("uur");
    expect(eenheidUit(undefined, "per uur · per stuk", "€22,50")).toBe("stuk");
    expect(eenheidUit(undefined, "op offerte", "op offerte")).toBe("op_aanvraag");
  });

  it("zet de hele prijslijst om, met de aansluitingen als keuze", () => {
    const c = catalogusStandaard();
    expect(c[0].naam).toBe("Aansluiting");
    const basis = c[0].items.find((i) => i.naam === "Verrichtingenbasis")!;
    expect(basis).toMatchObject({ prijs: 38.5, eenheid: "medewerker_jaar", soort: "keuze", groep: "aansluiting" });
    const alles = c.flatMap((g) => g.items);
    expect(alles.length).toBeGreaterThan(50);
    expect(alles.find((i) => i.naam === "Bedrijfsarts")).toMatchObject({ prijs: 240, eenheid: "uur", soort: "tarief" });
    expect(alles.find((i) => i.naam === "Spoor 2, vervolg")).toMatchObject({ prijs: 389, eenheid: "maand", soort: "optie" });
    expect(c.some((g) => g.label === "React2u Reward")).toBe(true);
  });

  it("elk startpunt levert een offerte die de deur uit kan", () => {
    const c = catalogusStandaard();
    for (const s of STARTPUNTEN) {
      const regels = s.regels(c);
      expect(regels.length, s.key).toBeGreaterThan(3);
      expect(controleer({ bedrijf: "X", email: "a@b.nl", regels }), s.key).toEqual([]);
      expect(geldigeKeuze(regels, standaardKeuze(regels)), s.key).not.toBeNull();
    }
  });
});

describe("offertevormen (0025)", () => {
  it("per medewerker eenmalig rekent met het aantal medewerkers", () => {
    const regels = [R({ id: "v", soort: "vast", prijs: 42.5, eenheid: "medewerker" })];
    const t = berekenTotalen(regels, [], 5);
    expect(t.eenmalig).toBe(212.5);
    expect(t.perJaar).toBe(0);
  });

  it("nul euro heet inbegrepen, een prijstekst wint van op aanvraag", () => {
    expect(prijsLabel({ prijs: 0, eenheid: "eenmalig" })).toBe("Inbegrepen");
    expect(prijsLabel({ prijs: null, eenheid: "op_aanvraag", prijsTekst: "€89 p.p." })).toBe("€89 p.p.");
  });

  it("vult bedrijf, contactpersoon en betreft in", () => {
    expect(vulIn("Beste {contactpersoon}, voor {bedrijf} ({betreft})", { bedrijf: "X BV", contactpersoon: "Anne de Vries", betreft: "J.J." })).toBe(
      "Beste Anne de Vries, voor X BV (J.J.)"
    );
    expect(vulIn("Beste {voornaam},", { contactpersoon: "Anne de Vries" })).toBe("Beste Anne,");
    expect(vulIn("Beste {contactpersoon},", {})).toBe("Beste heer, mevrouw,");
  });

  it("vervolgstappen: hooguit zes, zonder kop vallen ze weg", () => {
    expect(normaliseerVervolg([{ kop: "A", tekst: "x" }, { kop: "", tekst: "y" }, "onzin"])).toEqual([{ kop: "A", tekst: "x" }]);
    expect(normaliseerVervolg(Array.from({ length: 9 }, (_, i) => ({ kop: `S${i}`, tekst: "" })))).toHaveLength(6);
  });

  it("elk standaardsjabloon levert een offerte die de deur uit kan", () => {
    const sjablonen = alleSjablonen(catalogusStandaard());
    expect(new Set(sjablonen.map((s) => s.vorm))).toEqual(new Set(["verzuimbegeleiding", "rie", "pago", "verzuimtraining", "spoor2", "werkfit", "arbeidsdeskundig"]));
    for (const s of sjablonen) {
      expect(controleer({ bedrijf: "X", email: "a@b.nl", regels: s.regels }), s.sleutel).toEqual([]);
      expect(geldigeKeuze(s.regels, standaardKeuze(s.regels)), s.sleutel).not.toBeNull();
      expect(s.titel.length, s.sleutel).toBeGreaterThan(3);
      expect(s.geldigDagen, s.sleutel).toBeGreaterThan(0);
    }
  });

  it("de prijzen uit de Word-offertes en de prijslijst", () => {
    const s = Object.fromEntries(alleSjablonen(catalogusStandaard()).map((x) => [x.sleutel, x]));
    expect(berekenTotalen(s.rie.regels, standaardKeuze(s.rie.regels), null).eenmalig).toBe(2825);
    expect(berekenTotalen(s.pago.regels, [], 5).eenmalig).toBe(212.5);
    expect(berekenTotalen(s.verzuimtraining.regels, standaardKeuze(s.verzuimtraining.regels), null).eenmalig).toBe(595);
    expect(berekenTotalen(s.werkfit.regels, standaardKeuze(s.werkfit.regels), null).eenmalig).toBe(2500);
    const werkfitMet = s.werkfit.regels.filter((r) => r.soort === "optie").map((r) => r.id);
    expect(berekenTotalen(s.werkfit.regels, werkfitMet, null).eenmalig).toBe(4000);
    // Uit de prijslijst 2027: loopt mee met de tarievenpagina.
    expect(berekenTotalen(s.spoor2.regels, [], null).eenmalig).toBe(3365);
    expect(berekenTotalen(s.arbeidsdeskundig.regels, [], null).eenmalig).toBe(1450);
  });

  it("een aangepast sjabloon uit de database wint van de standaard, een eigen komt erbij", () => {
    const rij = (sleutel: string, naam: string) => ({
      sleutel, vorm: "rie" as const, naam, omschrijving: null, titel: "Eigen RI&E", intro: null, inhoud: "## Kop", voorwaarden: null,
      regels: [{ id: "a", naam: "Iets", prijs: 100, eenheid: "eenmalig", soort: "vast", sectie: "Kosten" }], vervolg: [],
      geldig_dagen: 21, updated_at: "2026-10-29T10:00:00Z", updated_by: "rens@react2u.nl",
    });
    const lijst = alleSjablonen(catalogusStandaard(), [rij("rie", "RI&E"), rij("rie-bouw", "RI&E bouw")]);
    const rie = lijst.find((x) => x.sleutel === "rie")!;
    expect(rie.titel).toBe("Eigen RI&E");
    expect(rie.bron).toMatchObject({ soort: "aangepast", heeftStandaard: true });
    expect(lijst.find((x) => x.sleutel === "rie-bouw")?.bron).toMatchObject({ soort: "aangepast", heeftStandaard: false });
    expect(rie.regels[0].id).not.toBe("a");
  });

  it("sleutels en oude startadressen", () => {
    expect(sleutelUit("RI&E voor de bouw!")).toBe("rie-voor-de-bouw");
    expect(sjabloonVoorStart("basis")).toBe("verzuim-basis");
    expect(sjabloonVoorStart("rie")).toBe("rie");
  });

  it("tekstopmaak: koppen, lijsten, genummerd en uitgelicht", () => {
    const b = blokkenUit("## Kop\nAlinea een\nloopt door.\n\n### Stap 1\n- a\n- b\n1. een\n2. twee\n> Zin");
    expect(b.map((x) => x.soort)).toEqual(["h2", "p", "h3", "ul", "ol", "quote"]);
    expect(b[1]).toEqual({ soort: "p", tekst: "Alinea een loopt door." });
    expect(b[3]).toEqual({ soort: "ul", items: ["a", "b"] });
  });
});

describe("per maand (29 okt 2026)", () => {
  it("totaal per maand is het jaarbedrag gedeeld door twaalf", () => {
    const t = berekenTotalen(REGELS, ["basis"], 42);
    expect(t.perJaar).toBe(1617);
    expect(t.perMaand).toBe(134.75);
  });

  it("een jaarprijs wordt een maandprijs, met de prijslijst eronder", () => {
    expect(maandprijs({ prijs: 38.5, eenheid: "medewerker_jaar" })).toEqual({
      bedrag: 3.21, achter: "per medewerker per maand", tekst: "€3,21 per medewerker per maand", jaar: "€38,50 per medewerker per jaar",
    });
    expect(maandprijs({ prijs: 1200, eenheid: "jaar" }).tekst).toBe("€100 per maand");
    expect(maandprijs({ prijs: 389, eenheid: "maand" }).tekst).toBe("€389 per maand");
    expect(maandprijs({ prijs: 2825, eenheid: "eenmalig" })).toMatchObject({ tekst: "€2.825 eenmalig", jaar: null });
    expect(maandprijs({ prijs: 0, eenheid: "eenmalig" }).tekst).toBe("Inbegrepen");
  });

  it("regelbedrag: doorlopend per maand, de rest eenmalig", () => {
    expect(regelbedrag({ bedrag: 1617, periode: "jaar" })).toEqual({ bedrag: 134.75, per: "maand" });
    expect(regelbedrag({ bedrag: 495, periode: "eenmalig" })).toEqual({ bedrag: 495, per: "eenmalig" });
    expect(regelbedrag({ bedrag: null, periode: null })).toEqual({ bedrag: null, per: null });
  });
});
