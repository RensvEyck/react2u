import { describe, expect, it } from "vitest";
import {
  actieStand, bedrijfSleutel, bezoekPerKlant, bronHref, herkenKolommen, importVoorstel, isGesprekSoort, koppelingenVoor, leesDatum, leesJaNee, relatief, relatiefMoment,
  leesStamkaartCel, rijenUitKlantlijst, rijNaarStamkaart, rijNaarVelden, sorteerKaarten, stamkaartTelling, stamkaartUitRij, statusUitRij, statusVerder, telling, tijdlijnRegels,
  zoekKlanten, type Bronnen, type Gesprek, type ImportRij, type Klant,
} from "./klanten";

const VANDAAG = "2026-11-16";

const klant = (bedrijf: string, extra: Partial<Klant> = {}): Klant => ({
  id: `id-${bedrijf}`, bedrijf, sleutel: bedrijfSleutel(bedrijf), status: "lead", contactpersoon: null, email: null, telefoon: null, eigenaar: null, bron: null,
  startdatum: null, offerte_retour: false, contract_retour: false, formulieren_retour: false, koppeling: false, facturatie: false, stand: null,
  volgende_actie: null, volgende_actie_op: null, laatste_contact_op: null, laatste_contact: null, notitie: null, lead_id: null, created_by: null,
  created_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-01T10:00:00Z", ...extra,
});

const rij = (extra: Partial<ImportRij>): ImportRij => ({
  regel: 2, bedrijf: "Testbedrijf", startdatum: null, offerte_retour: null, contract_retour: null, formulieren_retour: null, koppeling: null, facturatie: null,
  stand: null, contactpersoon: null, email: null, telefoon: null, eigenaar: null, casemanager: null, volgende_actie: null, bron: null, waarschuwingen: [], ...extra,
});

/** De klantlijst van november 2026 in vorm, met verzonnen bedrijven: de kop van kolom H staat boven een lege kolom, de standtekst staat in I zonder kop. */
const KLANTLIJST: string[][] = [
  ["startdatum klant", "klant", "offerte retour", "contract retour", "koppeling", "formulieren retour", "", "naar excact/facturatie verzonden"],
  ["2026-09-01", "Bakkerij De Korenaar", "ja", "ja", "nee", "ja", "", "", "ingericht"],
  ["2026-10-01", "Hoveniersbedrijf Groen B.V.", "ja", "nee", "nee", "ja", "", "", "Hayley maakt contract en inrichting via Iki"],
  ["2026-11-01", "Kinderopvang Zonnetje", "", "", "", "", "", "", "Gaat Cindy naartoe begin dec"],
  ["2026-01-01", "Transport Vermeulen", "ja"],
  ["2026-01-01", "Zorggroep Oost", "ja", "ja", "ja", "ja", "", "", "Wordt ingericht door Iki met koppeling"],
  ["2026-01-01", "Installatiebedrijf Pieters", "", "", "", "", "", "", "Nog geen ondertekening, wel per mail accoord.", "Henk de Jong"],
  ["2026-01-01", "Adviesbureau Noord", "ja", "", "", "", "", "", "Offerte verstuurd komen in jan op de lijn"],
  ["2026-01-01", "Schildersbedrijf West", "j"],
  ["", "", "", ""],
  ["2026-01-01", "Taxi Centrale Zuid", "ja", "", "", "", "", "", "spreekt cin 16/11"],
];

describe("statussen", () => {
  it("gaat alleen vooruit in de trechter en raakt inactief niet", () => {
    expect(statusVerder("akkoord", "lead")).toBe(true);
    expect(statusVerder("lead", "akkoord")).toBe(false);
    expect(statusVerder("klant", "klant")).toBe(false);
    expect(statusVerder("klant", "inactief")).toBe(false);
    expect(statusVerder("inactief", "lead")).toBe(false);
  });

  it("leidt de status af uit de vinkjes en de standtekst", () => {
    expect(statusUitRij(rij({ offerte_retour: true, contract_retour: true, stand: "ingericht" }))).toBe("klant");
    expect(statusUitRij(rij({ offerte_retour: true, contract_retour: false, stand: "Ingericht" }))).toBe("klant");
    expect(statusUitRij(rij({ offerte_retour: true, contract_retour: true, stand: "Wordt ingericht door Iki met koppeling" }))).toBe("inrichten");
    expect(statusUitRij(rij({ offerte_retour: true, contract_retour: false, stand: "Hayley maakt contract en inrichting via Iki" }))).toBe("akkoord");
    expect(statusUitRij(rij({ offerte_retour: true }))).toBe("akkoord");
    expect(statusUitRij(rij({ offerte_retour: true, stand: "Offerte verstuurd komen in jan op de lijn" }))).toBe("offerte");
    expect(statusUitRij(rij({ stand: "Nog geen ondertekening, wel per mail accoord." }))).toBe("akkoord");
    expect(statusUitRij(rij({ stand: "nog niet akkoord, twijfelt" }))).toBe("lead");
    expect(statusUitRij(rij({ offerte_retour: true, stand: "contract 16/11 verstuurd" }))).toBe("akkoord");
    expect(statusUitRij(rij({ stand: "Gaat Cindy naartoe begin dec" }))).toBe("gesprek");
    expect(statusUitRij(rij({ stand: "spreekt cin 16/11" }))).toBe("gesprek");
    expect(statusUitRij(rij({ koppeling: true }))).toBe("inrichten");
    expect(statusUitRij(rij({}))).toBe("lead");
  });

  it("weet waar een systeemregel naartoe klikt", () => {
    expect(bronHref("offerte", "o1")).toBe("/admin/offertes/o1");
    expect(bronHref("onboarding", "ob1")).toBe("/admin/onboarding/ob1");
    expect(bronHref("opdracht", "x")).toBe("/admin/verkoop/los");
    expect(bronHref("partner", "p1")).toBe("/admin/partners/p1");
    expect(bronHref(null, "x")).toBeNull();
  });
});

describe("datums en acties", () => {
  it("zegt hoe lang geleden of hoe ver vooruit", () => {
    expect(relatief("2026-11-16", VANDAAG)).toBe("vandaag");
    expect(relatief("2026-11-15", VANDAAG)).toBe("gisteren");
    expect(relatief("2026-11-13", VANDAAG)).toBe("3 dagen geleden");
    expect(relatief("2026-11-02", VANDAAG)).toBe("2 weken geleden");
    expect(relatief("2026-11-17", VANDAAG)).toBe("morgen");
    expect(relatief("2026-11-20", VANDAAG)).toBe("over 4 dagen");
    expect(relatief("2026-12-24", VANDAAG)).toBe("24 december 2026");
    expect(relatief(null, VANDAAG)).toBe("");
  });

  it("zegt hoe lang geleden een tijdstip was", () => {
    const nu = new Date("2026-11-16T14:00:00+01:00");
    expect(relatiefMoment("2026-11-16T13:59:30+01:00", nu)).toBe("zojuist");
    expect(relatiefMoment("2026-11-16T13:20:00+01:00", nu)).toBe("40 min geleden");
    expect(relatiefMoment("2026-11-16T09:00:00+01:00", nu)).toBe("5 uur geleden");
    expect(relatiefMoment("2026-11-15T23:30:00+01:00", nu)).toBe("gisteren");
    expect(relatiefMoment("2026-11-12T10:00:00+01:00", nu)).toBe("4 dagen geleden");
    expect(relatiefMoment(null, nu)).toBe("");
  });

  it("weet of een actie te laat is", () => {
    expect(actieStand({ volgende_actie: "Bellen", volgende_actie_op: "2026-11-10" }, VANDAAG)).toBe("te_laat");
    expect(actieStand({ volgende_actie: "Bellen", volgende_actie_op: "2026-11-16" }, VANDAAG)).toBe("vandaag");
    expect(actieStand({ volgende_actie: null, volgende_actie_op: "2026-11-20" }, VANDAAG)).toBe("gepland");
    expect(actieStand({ volgende_actie: "Bellen", volgende_actie_op: null }, VANDAAG)).toBe("zonder_datum");
    expect(actieStand({ volgende_actie: null, volgende_actie_op: null }, VANDAAG)).toBe("geen");
  });

  it("sorteert te laat bovenaan, dan vandaag, dan gepland, dan de rest op wijziging", () => {
    const kaarten = [
      klant("Rest", { updated_at: "2026-11-15T10:00:00Z" }),
      klant("Gepland", { volgende_actie_op: "2026-11-20" }),
      klant("Nieuwer", { updated_at: "2026-11-16T10:00:00Z" }),
      klant("Vandaag", { volgende_actie_op: "2026-11-16" }),
      klant("Te laat", { volgende_actie_op: "2026-11-10" }),
      klant("Langer te laat", { volgende_actie_op: "2026-11-01" }),
      klant("Zonder datum", { volgende_actie: "Mailen" }),
    ];
    expect(sorteerKaarten(kaarten, VANDAAG).map((k) => k.bedrijf)).toEqual(["Langer te laat", "Te laat", "Vandaag", "Gepland", "Zonder datum", "Nieuwer", "Rest"]);
  });

  it("telt per kolom en wat vandaag of te laat is", () => {
    const t = telling([
      klant("A", { status: "klant" }), klant("B", { status: "lead", volgende_actie_op: "2026-11-01" }), klant("C", { status: "lead", volgende_actie_op: VANDAAG }),
    ], VANDAAG);
    expect(t.klant).toBe(1);
    expect(t.lead).toBe(2);
    expect(t.teLaat).toBe(1);
    expect(t.vandaag).toBe(1);
    expect(t.totaal).toBe(3);
  });
});

describe("zoeken en sleutel", () => {
  it("herkent dezelfde klant zonder rechtsvorm en leestekens", () => {
    expect(bedrijfSleutel("Hoveniersbedrijf Groen B.V.")).toBe("hoveniersbedrijf groen");
    expect(bedrijfSleutel("  Top movers ")).toBe("top movers");
    expect(bedrijfSleutel("Son & Koot")).toBe("son koot");
    expect(bedrijfSleutel("Café Zeezicht")).toBe("cafe zeezicht");
    expect(bedrijfSleutel(null)).toBe("");
  });

  it("zoekt op elk woord, zonder accenten, en op een telefoonnummer zonder spaties", () => {
    const lijst = [
      klant("Bakkerij De Korenaar", { contactpersoon: "Fatima El Amrani", telefoon: "040 123 45 67", eigenaar: "Cindy" }),
      klant("Zorggroep Oost", { stand: "Wordt ingericht door Iki", eigenaar: "Hayley" }),
    ];
    expect(zoekKlanten(lijst, "  ")).toHaveLength(2);
    expect(zoekKlanten(lijst, "fatima").map((k) => k.bedrijf)).toEqual(["Bakkerij De Korenaar"]);
    expect(zoekKlanten(lijst, "0401234567").map((k) => k.bedrijf)).toEqual(["Bakkerij De Korenaar"]);
    expect(zoekKlanten(lijst, "iki oost").map((k) => k.bedrijf)).toEqual(["Zorggroep Oost"]);
    expect(zoekKlanten(lijst, "iki korenaar")).toHaveLength(0);
  });
});

describe("koppelingen", () => {
  const bronnen: Bronnen = {
    offertes: [
      { id: "o1", nummer: "2026-0012", status: "getekend", bedrijf: "Bakkerij de Korenaar BV", verstuurd_at: "2026-10-01T10:00:00Z", getekend_at: "2026-10-05T10:00:00Z", created_at: "2026-09-30T10:00:00Z" },
      { id: "o2", nummer: "2026-0013", status: "verstuurd", bedrijf: "Ander Bedrijf", verstuurd_at: "2026-10-01T10:00:00Z", getekend_at: null, created_at: "2026-09-30T10:00:00Z" },
    ],
    brochures: [{ id: "b1", nummer: "B2026-0003", status: "verstuurd", bedrijf: "Bakkerij De Korenaar", verstuurd_at: "2026-09-01T10:00:00Z", bekeken_at: "2026-09-02T10:00:00Z", created_at: "2026-08-30T10:00:00Z" }],
    contracten: [{ id: "c1", nummer: "C2026-0002", status: "verstuurd", bedrijf: "Bakkerij De Korenaar", soort: "basis", verstuurd_at: "2026-10-10T10:00:00Z", getekend_at: null, created_at: "2026-10-09T10:00:00Z" }],
    onboardings: [{ id: "ob1", nummer: "O2026-0001", status: "afgerond", weergave: "afgerond", bedrijf: "Bakkerij De Korenaar", verstuurd_at: "2026-10-12T10:00:00Z", afgerond_at: "2026-10-20T10:00:00Z", created_at: "2026-10-11T10:00:00Z" }],
    leads: [{ id: "l1", name: "Fatima El Amrani", company: "Bakkerij De Korenaar", status: "terugbellen", follow_up_on: "2026-11-18" }],
  };

  it("vindt alles van dezelfde klant, nieuwste eerst, en niets van een ander", () => {
    const k = koppelingenVoor("Bakkerij De Korenaar", bronnen);
    expect(k.map((x) => `${x.soort}:${x.nummer}:${x.stand}`)).toEqual([
      "lead:Fatima El Amrani:terugbellen 18 november 2026",
      "onboarding:O2026-0001:klant klaar",
      "contract:C2026-0002:verstuurd",
      "offerte:2026-0012:getekend",
      "brochure:B2026-0003:bekeken",
    ]);
    expect(koppelingenVoor("Ander Bedrijf", bronnen).map((x) => x.nummer)).toEqual(["2026-0013"]);
    expect(koppelingenVoor("", bronnen)).toEqual([]);
  });
});

describe("sitebezoek", () => {
  it("koppelt het bezoek van een bedrijf aan de kaart met dezelfde naam, nieuwste sessie eerst", () => {
    const b = bezoekPerKlant(
      [klant("Bakkerij De Korenaar"), klant("Zorggroep Oost")],
      [
        { name: "Bakkerij de Korenaar B.V.", lastSeen: "2026-11-16T12:40:00Z", views: 5, sessions: [
          { start: "2026-11-10T09:00:00Z", pages: [{ path: "/" }] },
          { start: "2026-11-16T12:30:00Z", pages: [{ path: "/verzuimbegeleiding" }, { path: "/tarieven" }, { path: "/tarieven" }] },
        ] },
        { name: "Onbekend Bedrijf", lastSeen: "2026-11-16T12:40:00Z", views: 1, sessions: [] },
      ],
    );
    expect(Object.keys(b)).toEqual(["id-Bakkerij De Korenaar"]);
    expect(b["id-Bakkerij De Korenaar"].paginas).toBe(5);
    expect(b["id-Bakkerij De Korenaar"].sessies.map((s) => s.paginas)).toEqual([["/verzuimbegeleiding", "/tarieven"], ["/"]]);
  });
});

describe("import van de klantlijst", () => {
  it("leest ja en nee ruim, en meldt wat het niet kent", () => {
    expect(leesJaNee("ja")).toEqual({ waarde: true, onbekend: false });
    expect(leesJaNee("J")).toEqual({ waarde: true, onbekend: false });
    expect(leesJaNee("x")).toEqual({ waarde: true, onbekend: false });
    expect(leesJaNee("nee")).toEqual({ waarde: false, onbekend: false });
    expect(leesJaNee("")).toEqual({ waarde: null, onbekend: false });
    expect(leesJaNee("misschien")).toEqual({ waarde: null, onbekend: true });
  });

  it("leest datums zoals ze uit Excel komen en zoals mensen ze typen", () => {
    expect(leesDatum("2026-09-01", VANDAAG)).toBe("2026-09-01");
    expect(leesDatum("1-9-2026", VANDAAG)).toBe("2026-09-01");
    expect(leesDatum("01/09/26", VANDAAG)).toBe("2026-09-01");
    expect(leesDatum("1-1", VANDAAG)).toBe("2026-01-01");
    expect(leesDatum("31-2-2026", VANDAAG)).toBeNull();
    expect(leesDatum("binnenkort", VANDAAG)).toBeNull();
  });

  it("herkent de kolommen aan de kop, en zonder kop aan de inhoud", () => {
    const { kolommen, kopregel } = herkenKolommen(KLANTLIJST);
    expect(kopregel).toBe(true);
    expect(kolommen.map((k) => `${k.letter}:${k.veld ?? "-"}:${k.via}`)).toEqual([
      "A:startdatum:kop", "B:bedrijf:kop", "C:offerte_retour:kop", "D:contract_retour:kop", "E:koppeling:kop", "F:formulieren_retour:kop",
      "G:-:leeg", "H:facturatie:kop", "I:stand:inhoud", "J:contactpersoon:inhoud",
    ]);
  });

  it("zonder kopregel: de volgorde van de klantlijst", () => {
    const { kolommen, kopregel } = herkenKolommen([["2026-09-01", "Bedrijf Een", "ja"], ["2026-10-01", "Bedrijf Twee", "nee"]]);
    expect(kopregel).toBe(false);
    expect(kolommen.map((k) => k.veld)).toEqual(["startdatum", "bedrijf", null]);
  });

  it("maakt rijen met de afgeleide velden en slaat lege regels over", () => {
    const { rijen } = rijenUitKlantlijst(KLANTLIJST, VANDAAG);
    expect(rijen.map((r) => r.regel)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 11]);
    const korenaar = rijen[0];
    expect(korenaar.bedrijf).toBe("Bakkerij De Korenaar");
    expect(korenaar.startdatum).toBe("2026-09-01");
    expect(korenaar.offerte_retour).toBe(true);
    expect(korenaar.koppeling).toBe(false);
    expect(korenaar.facturatie).toBeNull();
    expect(korenaar.stand).toBe("ingericht");
    expect(rijen[5].contactpersoon).toBe("Henk de Jong");
    expect(rijen[7].offerte_retour).toBe(true);
  });

  it("stelt voor wat nieuw is, wat bijgewerkt wordt en wat blijft, met de status alleen vooruit", () => {
    const { rijen } = rijenUitKlantlijst(KLANTLIJST, VANDAAG);
    const bestaande = [
      klant("Bakkerij de Korenaar B.V.", { status: "inrichten", offerte_retour: true, contract_retour: true, formulieren_retour: true, startdatum: "2026-09-01" }),
      klant("Kinderopvang Zonnetje", { status: "offerte", stand: "Gaat Cindy naartoe begin dec", startdatum: "2026-11-01" }),
      klant("Schildersbedrijf West", { status: "inactief", offerte_retour: true, startdatum: "2026-01-01" }),
    ];
    const v = importVoorstel(rijen, bestaande, VANDAAG);
    expect(v.telling).toEqual({ nieuw: 6, bijwerken: 1, ongewijzigd: 2, overslaan: 0 });
    const korenaar = v.regels[0];
    expect(korenaar.actie).toBe("bijwerken");
    expect(korenaar.status).toBe("klant");
    expect(korenaar.wijzigingen).toEqual(["laatste stand", "status Inrichten → Klant"]);
    // Een kaart die bewust verder staat dan het bestand zegt, gaat niet terug.
    expect(v.regels[2].actie).toBe("ongewijzigd");
    expect(v.regels[2].status).toBe("offerte");
    // Inactief blijft inactief.
    expect(v.regels[7].actie).toBe("ongewijzigd");
    expect(v.regels[7].status).toBe("inactief");
    // De startdatum 1 januari van het lopende jaar is al voorbij: vraag of 2027 bedoeld is.
    expect(v.regels[3].waarschuwingen).toEqual(["Startdatum 1 januari 2026 ligt in het verleden; bedoel je 2027?"]);
    expect(v.regels[3].status).toBe("akkoord");
    expect(v.regels[6].status).toBe("offerte");
  });

  it("slaat een rij zonder naam en een dubbele rij over", () => {
    const v = importVoorstel([rij({ bedrijf: "" }), rij({ bedrijf: "Dubbel BV" }), rij({ bedrijf: "dubbel b.v.", regel: 3 })], [], VANDAAG);
    expect(v.regels.map((r) => r.actie)).toEqual(["overslaan", "nieuw", "overslaan"]);
    expect(v.regels[0].waarschuwingen).toEqual(["Geen bedrijfsnaam"]);
    expect(v.regels[2].waarschuwingen).toEqual(["Staat al eerder in het bestand"]);
  });

  it("zet alleen gevulde cellen om naar velden", () => {
    expect(rijNaarVelden(rij({ startdatum: "2026-09-01", offerte_retour: true, koppeling: false, stand: " ingericht " }))).toEqual({
      startdatum: "2026-09-01", offerte_retour: true, koppeling: false, stand: " ingericht ",
    });
    expect(rijNaarVelden(rij({}))).toEqual({});
  });
});

describe("csv en geplakte tekst", () => {
  it("splitst op tabs, puntkomma's of komma's en begrijpt aanhalingstekens", async () => {
    const { cellenUitTekst } = await import("./klanten");
    expect(cellenUitTekst("klant;offerte retour\nBakkerij De Korenaar;ja\n")).toEqual([["klant", "offerte retour"], ["Bakkerij De Korenaar", "ja"]]);
    expect(cellenUitTekst('klant,stand\n"Son & Koot, Eindhoven","ingericht, ""live"""')).toEqual([["klant", "stand"], ["Son & Koot, Eindhoven", 'ingericht, "live"']]);
    expect(cellenUitTekst("klant\tstand\r\nWBLO\tingericht")).toEqual([["klant", "stand"], ["WBLO", "ingericht"]]);
    expect(cellenUitTekst("")).toEqual([]);
  });
});

describe("de tijdlijn", () => {
  const gesprek = (id: string, created_at: string, extra: Partial<Gesprek> = {}): Gesprek => ({
    id, klant_id: "k", soort: "gesprek", op: created_at.slice(0, 10), tekst: id, door: null, contact: true, bron: null, bron_id: null, bron_gebeurtenis: null, created_at, ...extra,
  });

  it("zet gesprekken en sitebezoeken door elkaar, nieuwste eerst", () => {
    const regels = tijdlijnRegels(
      [gesprek("a", "2026-11-10T10:00:00Z"), gesprek("b", "2026-11-12T10:00:00Z", { soort: "stamkaart", contact: false })],
      { laatst: "2026-11-11T10:00:00Z", paginas: 3, sessies: [{ start: "2026-11-11T10:00:00Z", paginas: ["/", "/werkgevers"] }] },
    );
    expect(regels.map((r) => r.key)).toEqual(["b", "site-2026-11-11T10:00:00Z", "a"]);
    expect(regels[1].sessie?.paginas).toEqual(["/", "/werkgevers"]);
    expect(tijdlijnRegels([], null)).toEqual([]);
  });

  it("kent de soort stamkaart (0048)", () => {
    expect(isGesprekSoort("stamkaart")).toBe(true);
    expect(isGesprekSoort("iets anders")).toBe(false);
  });
});

describe("casemanager uit de klantlijst (Rens, 19 nov 2026: Robin Roos, Nadja en Ida zijn casemanagers)", () => {
  it("een kolom Casemanager is geen eigenaar", () => {
    const { rijen, kolommen } = rijenUitKlantlijst([
      ["klant", "casemanager", "accountmanager"],
      ["Bakkerij De Korenaar", "Nadja", "Cindy"],
    ], VANDAAG);
    expect(kolommen.map((k) => k.veld)).toEqual(["bedrijf", "casemanager", "eigenaar"]);
    expect(rijen[0].casemanager).toBe("Nadja");
    expect(rijen[0].eigenaar).toBe("Cindy");
    expect(rijNaarVelden(rijen[0])).toMatchObject({ casemanager: "Nadja", eigenaar: "Cindy" });
  });

  it("ook als de kop Case manager of CM heet", () => {
    expect(herkenKolommen([["Bedrijf", "Case manager"], ["X", "Ida"]]).kolommen[1].veld).toBe("casemanager");
    expect(herkenKolommen([["Bedrijf", "CM"], ["X", "Ida"]]).kolommen[1].veld).toBe("casemanager");
  });

  it("het controlerapport noemt een nieuwe casemanager", () => {
    const v = importVoorstel([rij({ bedrijf: "Bakkerij De Korenaar", casemanager: "Robin Roos" })], [klant("Bakkerij De Korenaar", { status: "klant" })], VANDAAG);
    expect(v.regels[0].actie).toBe("bijwerken");
    expect(v.regels[0].wijzigingen).toEqual(["casemanager"]);
  });
});

describe("de stamkaart uit de klantlijst (Rens, 23 nov 2026: in bulk naar alle klanten)", () => {
  it("herkent de stamkaartkoppen, ook waar een gewoon woord iets anders zou zeggen", () => {
    const koppen = [
      "Klant", "KvK-nummer", "Debiteurnummer", "Rekeningnummer", "Tenaamstelling", "BTW-nummer", "Factuur e-mail", "E-mailadres", "E-mail contactpersoon",
      "Algemeen telefoonnummer", "Telefoon", "Functie ondertekenaar", "Naam ondertekenaar", "Functie", "Postcode postadres", "Plaats postadres", "Postadres",
      "Straat", "Huisnummer", "Postcode", "Vestigingsplaats", "Website", "Aantal medewerkers", "Branche", "Rechtsvorm", "SBI",
    ];
    const { kolommen } = herkenKolommen([koppen, koppen.map(() => "")]);
    expect(Object.fromEntries(kolommen.map((k) => [k.kop, k.veld]))).toEqual({
      Klant: "bedrijf", "KvK-nummer": "kvk", Debiteurnummer: "debiteurnummer", Rekeningnummer: "iban", Tenaamstelling: "iban_naam", "BTW-nummer": "btw",
      "Factuur e-mail": "factuur_email", "E-mailadres": "email",
      // De tweede e-mailkolom is bezet; een kop die nergens meer heen kan, blijft ongebruikt in plaats van een veld te overschrijven.
      "E-mail contactpersoon": null,
      "Algemeen telefoonnummer": "algemeen_telefoon", Telefoon: "telefoon", "Functie ondertekenaar": "ondertekenaar_functie", "Naam ondertekenaar": "ondertekenaar",
      Functie: "contact_functie", "Postcode postadres": "post_postcode", "Plaats postadres": "post_plaats", Postadres: "postadres", Straat: "bezoekadres",
      Huisnummer: "huisnummer", Postcode: "bezoek_postcode", Vestigingsplaats: "bezoek_plaats", Website: "website", "Aantal medewerkers": "medewerkers",
      Branche: "branche", Rechtsvorm: "rechtsvorm", SBI: "sbi",
    });
  });

  it("een e-mail van de contactpersoon is een e-mailadres, geen naam", () => {
    expect(herkenKolommen([["Bedrijf", "E-mail contactpersoon", "Contactpersoon"], ["X", "a@b.nl", "Jan Jansen"]]).kolommen.map((k) => k.veld)).toEqual(["bedrijf", "email", "contactpersoon"]);
  });

  it("zonder kop: een KvK-nummer is geen telefoonnummer, en IBAN en postcode aan hun vorm", () => {
    const { kolommen } = herkenKolommen([
      ["Klant", "", "", ""],
      ["Bakkerij De Korenaar", "17061007", "NL91 ABNA 0417 1643 00", "5611 NB"],
      ["Garage Smits", "12345678", "NL91ABNA0417164300", "5595xl"],
    ]);
    expect(kolommen.map((k) => `${k.veld}:${k.via}`)).toEqual(["bedrijf:kop", "kvk:inhoud", "iban:inhoud", "bezoek_postcode:inhoud"]);
  });

  it("maakt de cellen netjes zoals de stamkaart en meldt wat niet klopt, zonder de rij te laten vallen", () => {
    const { rijen } = rijenUitKlantlijst([
      ["Klant", "KvK", "IBAN", "Postcode", "Website", "Factuur e-mail", "Aantal werknemers", "Btw-nummer", "Straat", "Huisnummer"],
      ["Bakkerij De Korenaar", "17 06 10 07", "nl91 abna 0417 1643 00", "5611nb", "korenaar.nl", "Facturen@Korenaar.nl", "1.250", "nl 0012.34.567.b01", "Paaldijk", "11"],
      ["Garage Smits", "123", "NL00ABNA0000000000", "5595 XL", "geen site", "geen mail", "veel", "", "Markt 3", "3"],
    ], VANDAAG);
    expect(rijen[0].stamkaart).toEqual({
      kvk: "17061007", iban: "NL91ABNA0417164300", bezoek_postcode: "5611 NB", website: "https://korenaar.nl", factuur_email: "facturen@korenaar.nl",
      medewerkers: 1250, btw: "NL001234567B01", bezoekadres: "Paaldijk 11",
    });
    expect(rijen[0].waarschuwingen).toEqual([]);
    // Een nummer dat al in de straat staat, komt er niet twee keer achter.
    expect(rijen[1].stamkaart).toEqual({ bezoek_postcode: "5595 XL", bezoekadres: "Markt 3" });
    expect(rijen[1].waarschuwingen).toEqual([
      'KvK-nummer "123" heeft geen acht cijfers', 'IBAN "NL00ABNA0000000000" klopt niet', 'Website "geen site" klopt niet',
      'Factuur-e-mail "geen mail" klopt niet', 'Aantal werknemers "veel" is geen getal',
    ]);
    expect(rijen[1].bedrijf).toBe("Garage Smits");
  });

  it("vult standaard alleen lege velden aan; wat anders is, blijft staan tenzij je overschrijft", () => {
    const r = rij({ bedrijf: "Bakkerij De Korenaar", stamkaart: { kvk: "17061007", iban: "NL91ABNA0417164300", bezoekadres: "Paaldijk 11" } });
    const bestaand = klant("Bakkerij De Korenaar", { status: "klant", kvk: "12345678", iban: "NL91ABNA0417164300" });
    const v = importVoorstel([r], [bestaand], VANDAAG);
    expect(v.regels[0].actie).toBe("bijwerken");
    expect(v.regels[0].stamkaart).toEqual({ aangevuld: ["bezoekadres"], overschreven: [], behouden: ["kvk"] });
    expect(v.regels[0].wijzigingen).toEqual(["stamkaart: bezoekadres"]);
    const over = importVoorstel([r], [bestaand], VANDAAG, { stamkaartOverschrijven: true });
    expect(over.regels[0].stamkaart).toEqual({ aangevuld: ["bezoekadres"], overschreven: ["kvk"], behouden: [] });
    expect(over.regels[0].wijzigingen).toEqual(["stamkaart: bezoekadres, kvk-nummer"]);
    expect(stamkaartTelling(over)).toEqual({ kaarten: 1, velden: 2, behouden: 0 });
  });

  it("alleen een verschil dat blijft staan is geen wijziging", () => {
    const v = importVoorstel([rij({ bedrijf: "Garage Smits", stamkaart: { kvk: "17061007" } })], [klant("Garage Smits", { status: "klant", kvk: "12345678" })], VANDAAG);
    expect(v.regels[0].actie).toBe("ongewijzigd");
    expect(stamkaartTelling(v)).toEqual({ kaarten: 0, velden: 0, behouden: 1 });
  });

  it("vanaf de klantenlijst komt een nieuw bedrijf als klant binnen; een bestaande kaart volgt de gewone regels", () => {
    const v = importVoorstel([rij({ bedrijf: "Nieuw Bedrijf" }), rij({ bedrijf: "Kapsalon Knip", regel: 3 })], [klant("Kapsalon Knip", { status: "lead" })], VANDAAG, { nieuwAls: "klant" });
    expect(v.regels.map((r) => `${r.actie}:${r.status}`)).toEqual(["nieuw:klant", "ongewijzigd:lead"]);
    // Op het bord blijft het zoals het was: zonder vinkjes of stand een lead.
    expect(importVoorstel([rij({ bedrijf: "Nieuw Bedrijf" })], [], VANDAAG).regels[0].status).toBe("lead");
  });

  it("de stamkaart gaat los van de kaart naar de database", () => {
    const r = rij({ contactpersoon: "Joris", stamkaart: { kvk: "17061007", medewerkers: 12, iban: "" } });
    expect(rijNaarVelden(r)).toEqual({ contactpersoon: "Joris" });
    expect(rijNaarStamkaart(r)).toEqual({ kvk: "17061007", medewerkers: 12 });
    expect(stamkaartUitRij(r, null).aangevuld).toEqual(["kvk", "medewerkers"]);
  });

  it("leest een cel voor de stamkaart", () => {
    expect(leesStamkaartCel("medewerkers", "12,5 fte")).toEqual({ waarde: 13 });
    expect(leesStamkaartCel("rechtsvorm", "  B.V.  ")).toEqual({ waarde: "B.V." });
    expect(leesStamkaartCel("algemeen_email", "INFO@Korenaar.nl")).toEqual({ waarde: "info@korenaar.nl" });
    expect(leesStamkaartCel("kvk", "1234 5678")).toEqual({ waarde: "12345678" });
    expect("fout" in leesStamkaartCel("iban", "NL12")).toBe(true);
  });
});
