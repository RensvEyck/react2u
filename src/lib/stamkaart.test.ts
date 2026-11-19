import { describe, expect, it } from "vitest";
import { bedrijfSleutel, type Klant } from "./klanten";
import {
  afsprakenUitOffertes, documentenVoor, documentTelling, echteKlanten, filterKlantenlijst, isEchteKlant, KLANT_STATUSSEN, leesBedrag, losseAfspraken, merkUitLabel, schoonIban, schoonKvk, schoonPostcode,
  schoonStamkaart, schoonTarief, schoonWebsite, sorteerKlantenlijst, STAMKAART, STAMKAART_VELDEN, stamkaartRegel, stamkaartVolledigheid, tariefGeldt, tariefPeriode, tariefRegel,
  tariefTekst, veldWaarde, voorstelStamkaart, type DocumentBronnen, type StamkaartBronnen,
} from "./stamkaart";
import type { Regel } from "./offertes";

const VANDAAG = "2026-11-19";

const klant = (bedrijf: string, extra: Partial<Klant> = {}): Klant => ({
  id: `id-${bedrijf}`, bedrijf, sleutel: bedrijfSleutel(bedrijf), status: "klant", contactpersoon: null, email: null, telefoon: null, eigenaar: null, bron: null,
  startdatum: null, offerte_retour: false, contract_retour: false, formulieren_retour: false, koppeling: false, facturatie: false, stand: null,
  volgende_actie: null, volgende_actie_op: null, laatste_contact_op: null, laatste_contact: null, notitie: null, lead_id: null, created_by: null,
  created_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-10T10:00:00Z",
  kvk: null, rechtsvorm: null, branche: null, sbi: null, website: null, algemeen_telefoon: null, algemeen_email: null, bezoekadres: null, bezoek_postcode: null,
  bezoek_plaats: null, postadres: null, post_postcode: null, post_plaats: null, contact_functie: null, factuur_email: null, btw: null, iban: null, iban_naam: null,
  debiteurnummer: null, ondertekenaar: null, ondertekenaar_functie: null, medewerkers: null, casemanager: null,
  ...extra,
});

const regel = (extra: Partial<Regel>): Regel => ({ id: "r", sectie: "Aansluiting", naam: "Abonnement", prijs: 38.5, eenheid: "medewerker_jaar", soort: "vast", ...extra });

const LEEG_BRONNEN: StamkaartBronnen = { offertes: [], contracten: [], onboardings: [], leads: [], bedrijven: [] };

describe("de velden van de stamkaart", () => {
  it("staan in vijf blokken en kennen hun kernvelden", () => {
    expect(STAMKAART.map((g) => g.key)).toEqual(["bedrijf", "adres", "contact", "facturatie", "react2u"]);
    expect(STAMKAART_VELDEN.filter((v) => v.kern).map((v) => v.key)).toEqual(["kvk", "bezoekadres", "bezoek_postcode", "bezoek_plaats", "contactpersoon", "telefoon", "email", "factuur_email"]);
    expect(new Set(STAMKAART_VELDEN.map((v) => v.key)).size).toBe(STAMKAART_VELDEN.length);
  });

  it("leest een waarde van de kaart als tekst", () => {
    const k = klant("Bakkerij De Korenaar B.V.", { medewerkers: 12, kvk: "12345678" });
    expect(veldWaarde(k, "medewerkers")).toBe("12");
    expect(veldWaarde(k, "kvk")).toBe("12345678");
    expect(veldWaarde(k, "iban")).toBe("");
    expect(veldWaarde({ ...k, kvk: undefined } as Klant, "kvk")).toBe("");
  });

  it("telt hoe compleet de stamkaart is", () => {
    const leeg = stamkaartVolledigheid(klant("X"));
    expect(leeg).toEqual({ ingevuld: 0, totaal: 8, ontbreekt: ["KvK-nummer", "Bezoekadres", "Naam", "Telefoon", "E-mail", "E-mailadres voor facturen"] });
    const vol = stamkaartVolledigheid(klant("X", { kvk: "1", bezoekadres: "a", bezoek_postcode: "b", bezoek_plaats: "c", contactpersoon: "d", telefoon: "e", email: "f", factuur_email: "g" }));
    expect(vol.ingevuld).toBe(8);
    expect(vol.ontbreekt).toEqual([]);
  });
});

describe("controle van de invoer", () => {
  it("KvK: acht cijfers, spaties en streepjes mogen", () => {
    expect(schoonKvk("12 34 56 78")).toBe("12345678");
    expect(schoonKvk("1234567")).toBeNull();
    expect(schoonKvk("1234567a")).toBeNull();
  });

  it("IBAN: hoofdletters zonder spaties, met de controle van de bank", () => {
    expect(schoonIban("nl91 abna 0417 1643 00")).toBe("NL91ABNA0417164300");
    expect(schoonIban("NL91ABNA0417164301")).toBeNull();
    expect(schoonIban("DE89 3704 0044 0532 0130 00")).toBe("DE89370400440532013000");
    expect(schoonIban("12345")).toBeNull();
  });

  it("postcode, website en btw worden netjes", () => {
    expect(schoonPostcode("5611nb")).toBe("5611 NB");
    expect(schoonPostcode("B-2000")).toBe("B-2000");
    expect(schoonWebsite("react2u.nl")).toBe("https://react2u.nl");
    expect(schoonWebsite("https://www.react2u.nl/werkgevers")).toBe("https://www.react2u.nl/werkgevers");
    expect(schoonWebsite("geen site")).toBeNull();
    expect(schoonWebsite("localhost")).toBeNull();
    expect(schoonStamkaart({ btw: "nl 1234.56.789.b01" }).velden.btw).toBe("NL123456789B01");
  });

  it("schoonStamkaart: alleen wat meegegeven is, leeg wordt null, een fout in woorden", () => {
    const r = schoonStamkaart({ kvk: "1234 5678", iban: "", medewerkers: "12", email: "Fatima@Korenaar.test", startdatum: "2026-09-01", bezoek_plaats: "  Leende  " });
    expect(r.fout).toBeUndefined();
    expect(r.velden).toEqual({ kvk: "12345678", iban: null, medewerkers: 12, email: "fatima@korenaar.test", startdatum: "2026-09-01", bezoek_plaats: "Leende" });
    expect("rechtsvorm" in r.velden).toBe(false);
    expect(schoonStamkaart({ kvk: "123" }).fout).toMatch(/acht cijfers/);
    expect(schoonStamkaart({ iban: "NL00BANK" }).fout).toMatch(/IBAN/);
    expect(schoonStamkaart({ factuur_email: "geen adres" }).fout).toMatch(/E-mailadres voor facturen/);
    expect(schoonStamkaart({ medewerkers: "twaalf" }).fout).toMatch(/heel getal/);
    expect(schoonStamkaart({ startdatum: "2026-02-31" }).fout).toMatch(/startdatum/);
    expect(schoonStamkaart({ website: "nergens" }).fout).toMatch(/website/);
  });

  it("knipt lange teksten af op de grens van de database", () => {
    expect((schoonStamkaart({ branche: "x".repeat(200) }).velden.branche || "").length).toBe(120);
  });
});

describe("wie in de klantenlijst hoort", () => {
  it("alleen echte klanten: akkoord, inrichten en klant; leads, gesprekken en offertes blijven op het bord", () => {
    expect(KLANT_STATUSSEN).toEqual(["akkoord", "inrichten", "klant"]);
    expect(isEchteKlant(klant("A", { status: "akkoord" }))).toBe(true);
    expect(isEchteKlant(klant("B", { status: "inrichten" }))).toBe(true);
    expect(isEchteKlant(klant("C", { status: "klant" }))).toBe(true);
    expect(isEchteKlant(klant("D", { status: "lead" }))).toBe(false);
    expect(isEchteKlant(klant("E", { status: "gesprek" }))).toBe(false);
    expect(isEchteKlant(klant("F", { status: "offerte" }))).toBe(false);
  });

  it("een inactieve kaart telt alleen mee als hij ooit klant was", () => {
    expect(isEchteKlant(klant("Verloren lead", { status: "inactief" }))).toBe(false);
    expect(isEchteKlant(klant("Gestopt", { status: "inactief", contract_retour: true }))).toBe(true);
    expect(isEchteKlant(klant("Gestopt 2", { status: "inactief", startdatum: "2025-01-01" }))).toBe(true);
    expect(isEchteKlant(klant("Gestopt 3", { status: "inactief", facturatie: true }))).toBe(true);
    expect(echteKlanten([klant("A", { status: "lead" }), klant("B", { status: "klant" }), klant("C", { status: "inactief", koppeling: true })]).map((k) => k.bedrijf)).toEqual(["B", "C"]);
  });
});

describe("de klantenlijst", () => {
  const lijst = [
    klant("Bakkerij De Korenaar B.V.", { status: "klant", contactpersoon: "Fatima El Amrani", kvk: "12345678", bezoek_plaats: "Eindhoven", casemanager: "Iki", laatste_contact_op: "2026-11-10" }),
    klant("Kapsalon Knip", { status: "akkoord", contactpersoon: "Sanne de Vries", eigenaar: "Cindy", updated_at: "2026-11-18T10:00:00Z" }),
    klant("Oud Bedrijf", { status: "inactief", contract_retour: true }),
  ];

  it("zoekt ook op KvK, plaats en casemanager en laat inactief alleen op verzoek zien", () => {
    expect(filterKlantenlijst(lijst, { q: "", status: "alle", inactief: false }).map((k) => k.bedrijf)).toEqual(["Bakkerij De Korenaar B.V.", "Kapsalon Knip"]);
    expect(filterKlantenlijst(lijst, { q: "", status: "alle", inactief: true })).toHaveLength(3);
    expect(filterKlantenlijst(lijst, { q: "12345678", status: "alle", inactief: false }).map((k) => k.bedrijf)).toEqual(["Bakkerij De Korenaar B.V."]);
    expect(filterKlantenlijst(lijst, { q: "eindhoven", status: "alle", inactief: false })).toHaveLength(1);
    expect(filterKlantenlijst(lijst, { q: "iki", status: "alle", inactief: false })).toHaveLength(1);
    expect(filterKlantenlijst(lijst, { q: "sanne", status: "alle", inactief: false }).map((k) => k.bedrijf)).toEqual(["Kapsalon Knip"]);
    expect(filterKlantenlijst(lijst, { q: "", status: "akkoord", inactief: false })).toHaveLength(1);
    expect(filterKlantenlijst(lijst, { q: "", status: "inactief", inactief: false })).toHaveLength(1);
    expect(filterKlantenlijst(lijst, { q: "bestaat niet", status: "alle", inactief: true })).toHaveLength(0);
  });

  it("sorteert per kolom, met de bedrijfsnaam als tweede sleutel", () => {
    expect(sorteerKlantenlijst(lijst, "bedrijf", true).map((k) => k.bedrijf)).toEqual(["Bakkerij De Korenaar B.V.", "Kapsalon Knip", "Oud Bedrijf"]);
    expect(sorteerKlantenlijst(lijst, "status", true).map((k) => k.status)).toEqual(["akkoord", "klant", "inactief"]);
    expect(sorteerKlantenlijst(lijst, "casemanager", true).map((k) => k.casemanager || k.eigenaar)).toEqual(["Cindy", "Iki", null]);
    expect(sorteerKlantenlijst(lijst, "laatste", false).map((k) => k.bedrijf)[0]).toBe("Kapsalon Knip");
    expect(sorteerKlantenlijst(lijst, "volledig", false).map((k) => k.bedrijf)[0]).toBe("Bakkerij De Korenaar B.V.");
  });
});

describe("het voorstel uit de modules", () => {
  const k = klant("Bakkerij De Korenaar B.V.", { contactpersoon: "Fatima El Amrani", email: "fatima@korenaar.nl" });
  const bronnen: StamkaartBronnen = {
    offertes: [
      {
        id: "o1", nummer: "O2026-0012", status: "getekend", bedrijf: "Bakkerij de Korenaar", contactpersoon: "Fatima El Amrani", email: "fatima@korenaar.nl", telefoon: "040 123 45 67",
        medewerkers: 12, factuur: null, getekend_inhoud: { factuur: { email: "facturen@korenaar.nl", adres: "Postbus 12", postcode: "5600AA", plaats: "Eindhoven", kvk: "12 34 56 78" }, medewerkers: 12 } as never,
        getekend_naam: "Fatima El Amrani", getekend_functie: "Eigenaar", getekend_at: "2026-11-05T10:00:00Z", verstuurd_at: "2026-11-01T10:00:00Z", created_at: "2026-11-01T09:00:00Z",
      },
      {
        id: "o0", nummer: "O2026-0003", status: "afgewezen", bedrijf: "Bakkerij De Korenaar B.V.", contactpersoon: "Oud Contact", email: null, telefoon: null,
        medewerkers: 8, factuur: null, getekend_inhoud: null, getekend_naam: null, getekend_functie: null, getekend_at: null, verstuurd_at: "2026-10-01T10:00:00Z", created_at: "2026-10-01T09:00:00Z",
      },
    ],
    contracten: [
      {
        id: "c1", nummer: "C2026-0003", status: "getekend", soort: "basiscontract", bedrijf: "Bakkerij De Korenaar", contactpersoon: "Fatima El Amrani", email: null, telefoon: null,
        opdrachtgever: { naam: "Bakkerij De Korenaar B.V.", adres: "Paaldijk 11", postcode: "5595xl", plaats: "Leende", kvk: "87654321" },
        getekend_naam: "Henk Bax", getekend_functie: "Directeur", getekend_at: "2026-11-08T10:00:00Z", ingangsdatum: "2027-01-01", created_at: "2026-11-06T09:00:00Z",
      },
      { id: "c2", nummer: "C2026-0009", status: "concept", soort: "reseller", bedrijf: "Bakkerij De Korenaar", contactpersoon: null, email: null, telefoon: null, opdrachtgever: { kvk: "00000000" }, getekend_naam: null, getekend_functie: null, getekend_at: null, ingangsdatum: null, created_at: "2026-11-09T09:00:00Z" },
    ],
    onboardings: [
      {
        id: "ob1", nummer: "ON2026-0002", status: "verstuurd", bedrijf: "Bakkerij De Korenaar B.V.", contactpersoon: null, email: null, telefoon: null,
        antwoorden: { inrichting: { data: { kvk: "11112222", btw: "nl 1234.56.789.b01", factuur_straat: "Fabriekslaan 3", factuur_postcode: "5611 NB", factuur_plaats: "Eindhoven", factuur_email: "Facturatie@korenaar.nl", contact_naam: "Fatima El Amrani", contact_functie: "HR-manager", contact_telefoon: "06 1234 5678", contact_email: "fatima@korenaar.nl" }, at: "2026-11-10T10:00:00Z", door: "klant" } },
        casemanager: "Iki Jansen", debiteurnummer: "D-2041", created_at: "2026-11-09T09:00:00Z",
      },
    ],
    leads: [{ id: "l1", name: "Fatima El Amrani", company: "Bakkerij De Korenaar", phone: "040 999 99 99", email: "info@korenaar.nl" }],
    bedrijven: [{ name: "Bakkerij De Korenaar", domain: "korenaar.nl" }],
  };

  it("vult alleen lege velden, het contract vóór de onboarding vóór de offerte, met de bron erbij", () => {
    const v = voorstelStamkaart(k, bronnen);
    const per = Object.fromEntries(v.map((x) => [x.veld, x]));
    expect(per.kvk).toMatchObject({ waarde: "87654321", bron: "contract C2026-0003", href: "/admin/contracten/c1" });
    expect(per.bezoekadres.waarde).toBe("Paaldijk 11");
    expect(per.bezoek_postcode.waarde).toBe("5595 XL");
    expect(per.bezoek_plaats.waarde).toBe("Leende");
    expect(per.ondertekenaar).toMatchObject({ waarde: "Henk Bax", bron: "contract C2026-0003" });
    expect(per.ondertekenaar_functie.waarde).toBe("Directeur");
    expect(per.startdatum.waarde).toBe("2027-01-01");
    expect(per.btw).toMatchObject({ waarde: "NL123456789B01", bron: "onboarding ON2026-0002" });
    expect(per.postadres.waarde).toBe("Fabriekslaan 3");
    expect(per.factuur_email.waarde).toBe("facturatie@korenaar.nl");
    expect(per.contact_functie.waarde).toBe("HR-manager");
    expect(per.telefoon.waarde).toBe("06 1234 5678");
    expect(per.casemanager.waarde).toBe("Iki Jansen");
    expect(per.debiteurnummer.waarde).toBe("D-2041");
    expect(per.medewerkers).toMatchObject({ waarde: "12", bron: "offerte O2026-0012" });
    expect(per.website).toMatchObject({ waarde: "https://korenaar.nl", bron: "de bedrijfsherkenning" });
    // Al gevuld op de kaart: geen voorstel.
    expect(per.contactpersoon).toBeUndefined();
    expect(per.email).toBeUndefined();
    // De resellerovereenkomst telt niet mee als bron voor de klant.
    expect(v.some((x) => x.bron.includes("C2026-0009"))).toBe(false);
    // In de volgorde van de stamkaart.
    expect(v.map((x) => x.veld).indexOf("kvk")).toBeLessThan(v.map((x) => x.veld).indexOf("casemanager"));
  });

  it("neemt de website uit het e-mailadres als de herkenning hem niet kent, maar niet van gmail", () => {
    expect(voorstelStamkaart(k, { ...LEEG_BRONNEN }).find((x) => x.veld === "website")).toMatchObject({ waarde: "https://korenaar.nl", bron: "het e-mailadres" });
    expect(voorstelStamkaart(klant("X", { email: "iemand@gmail.com" }), LEEG_BRONNEN).find((x) => x.veld === "website")).toBeUndefined();
  });

  it("gebruikt de bellijst en een andere schrijfwijze van de naam", () => {
    const v = voorstelStamkaart(klant("Bakkerij de Korenaar"), { ...LEEG_BRONNEN, leads: bronnen.leads });
    expect(v.find((x) => x.veld === "contactpersoon")).toMatchObject({ waarde: "Fatima El Amrani", bron: "de bellijst" });
    expect(v.find((x) => x.veld === "telefoon")?.waarde).toBe("040 999 99 99");
  });

  it("zegt in de tijdlijn wat er veranderde en waar het vandaan kwam", () => {
    expect(stamkaartRegel(["kvk", "iban"])).toBe("Stamkaart bijgewerkt: KvK-nummer, IBAN");
    expect(stamkaartRegel(["kvk", "bezoek_plaats"], { kvk: "contract C2026-0003", bezoek_plaats: "contract C2026-0003" })).toBe("Stamkaart aangevuld uit de modules: KvK-nummer (contract C2026-0003), plaats bezoekadres (contract C2026-0003)");
    expect(stamkaartRegel([])).toBe("Stamkaart bijgewerkt");
  });
});

describe("alle documenten van een klant", () => {
  const k = klant("Bakkerij De Korenaar B.V.");
  const bronnen: DocumentBronnen = {
    brochures: [{ id: "b1", nummer: "B2026-0001", token: "tok", status: "verstuurd", bedrijf: "Bakkerij de Korenaar", verstuurd_at: "2026-10-01T10:00:00Z", bekeken_at: "2026-10-02T10:00:00Z", created_at: "2026-09-30T10:00:00Z" }],
    offertes: [
      { id: "o1", nummer: "O2026-0012", status: "getekend", bedrijf: "Bakkerij De Korenaar", vorm: "verzuimbegeleiding", verstuurd_at: "2026-11-01T10:00:00Z", bekeken_at: null, getekend_at: "2026-11-05T10:00:00Z", getekend_naam: "Fatima El Amrani", afgewezen_at: null, geldig_tot: "2026-12-01", created_at: "2026-11-01T09:00:00Z" },
      { id: "o2", nummer: "O2026-0013", status: "verstuurd", bedrijf: "Bakkerij De Korenaar", vorm: "rie", verstuurd_at: "2026-11-12T12:00:00Z", bekeken_at: null, getekend_at: null, getekend_naam: null, afgewezen_at: null, geldig_tot: "2026-12-12", created_at: "2026-11-12T09:00:00Z" },
      { id: "o3", nummer: "O2026-0001", status: "concept", bedrijf: "Ander Bedrijf", vorm: "rie", verstuurd_at: null, bekeken_at: null, getekend_at: null, getekend_naam: null, afgewezen_at: null, geldig_tot: null, created_at: "2026-11-12T09:00:00Z" },
    ],
    contracten: [
      { id: "c1", nummer: "C2026-0003", status: "getekend", soort: "basiscontract", bedrijf: "Bakkerij De Korenaar", verstuurd_at: "2026-11-06T10:00:00Z", bekeken_at: null, getekend_at: "2026-11-08T10:00:00Z", getekend_naam: "Henk Bax", created_at: "2026-11-06T09:00:00Z" },
      { id: "c2", nummer: "C2026-0009", status: "verstuurd", soort: "reseller", bedrijf: "Bakkerij De Korenaar", verstuurd_at: "2026-11-09T08:00:00Z", bekeken_at: null, getekend_at: null, getekend_naam: null, created_at: "2026-11-09T09:00:00Z" },
    ],
    checklists: [{ contract_id: "c1", door: "Fatima", ingevuld_at: "2026-11-09T10:00:00Z", bijgewerkt_at: "2026-11-09T10:00:00Z" }],
    onboardings: [{
      id: "ob1", nummer: "ON2026-0002", status: "verstuurd", bedrijf: "Bakkerij De Korenaar B.V.", documenten: ["welkom", "verzuimprotocol", "inrichting"], taken: {}, antwoorden: { inrichting: { data: {}, at: "2026-11-10T10:00:00Z", door: null } },
      bekeken_at: "2026-11-10T09:00:00Z", verstuurd_at: "2026-11-09T10:00:00Z", afgerond_at: null, created_at: "2026-11-09T09:00:00Z",
    }],
    machtigingen: [
      { id: "m1", onboarding_id: "ob1", naam: "Piet Pieters", status: "getekend", uitgenodigd_at: "2026-11-10T10:00:00Z", getekend_at: "2026-11-11T10:00:00Z", overdracht_at: "2026-11-12T10:00:00Z" },
      { id: "m2", onboarding_id: "ob1", naam: "Nog Open", status: "open", uitgenodigd_at: "2026-11-10T10:00:00Z", getekend_at: null, overdracht_at: null },
    ],
    evaluaties: [{ id: "e1", nummer: "KE2026-0001", status: "ingevuld", bedrijf: "Bakkerij De Korenaar", verstuurd_at: "2026-11-13T10:00:00Z", bekeken_at: null, ingevuld_at: "2026-11-14T10:00:00Z", ingevuld_door: "Fatima", created_at: "2026-11-13T09:00:00Z" }],
    bestanden: [{ id: "f1", klant_id: "id-x", pad: "id-x/1-a.pdf", naam: "Getekend contract per post.pdf", grootte: 1000, type: "application/pdf", soort: "overeenkomst", omschrijving: null, geupload_door: "rens@react2u.nl", created_at: "2026-11-15T10:00:00Z" }],
  };

  it("zet alles op één lijst, nieuwste eerst, met pdf en link per soort", () => {
    const docs = documentenVoor(k, bronnen, VANDAAG);
    expect(docs.map((d) => d.soort)).toEqual(["bestand", "evaluatie", "offerte", "overdracht", "machtiging", "onboarding", "checklist", "reseller", "contract", "offerte", "brochure"]);
    const offerte = docs.find((d) => d.key === "offerte-o1")!;
    expect(offerte).toMatchObject({ naam: "Offerte Recover O2026-0012", pdf: "/admin/offertevoorbeeld/o1/pdf?download=1", href: "/admin/offertes/o1", door: "Fatima El Amrani" });
    expect(offerte.stand.label).toBe("Getekend");
    expect(docs.find((d) => d.key === "offerte-o2")).toMatchObject({ naam: "Offerte Resist O2026-0013", pdf: "/admin/offertevoorbeeld/o2/concept?download=1" });
    expect(docs.find((d) => d.key === "checklist-c1")).toMatchObject({ naam: "Checklist arbeidsomstandigheden bij C2026-0003", pdf: "/admin/contractvoorbeeld/c1/checklist/pdf?download=1", door: "Fatima" });
    expect(docs.find((d) => d.key === "checklist-c1")!.stand.label).toBe("ingevuld");
    expect(docs.find((d) => d.key === "contract-c2")).toMatchObject({ soort: "reseller", naam: "Resellerovereenkomst C2026-0009" });
    expect(docs.find((d) => d.key === "onboarding-ob1")!.extra.map((x) => x.label)).toEqual(["Klantpagina", "Verzuimprotocol (pdf)", "Inrichting (pdf)"]);
    expect(offerte.extra).toEqual([{ label: "Certificaat", href: "/admin/offertevoorbeeld/o1" }]);
    expect(docs.find((d) => d.key === "machtiging-m1")).toMatchObject({ naam: "Machtiging overdracht verzuimdossier: Piet Pieters", pdf: "/admin/onboarding/ob1/machtiging/m1?download=1" });
    expect(docs.find((d) => d.key === "overdracht-ob1")!.naam).toMatch(/1 machtiging\)$/);
    expect(docs.find((d) => d.key === "evaluatie-e1")).toMatchObject({ pdf: "/admin/evaluatievoorbeeld/e1/pdf?download=1", door: "Fatima" });
    expect(docs.find((d) => d.key === "bestand-f1")).toMatchObject({ naam: "Getekend contract per post.pdf", pdf: "/admin/klantbestand/f1", door: "rens" });
    expect(docs.find((d) => d.key === "brochure-b1")).toMatchObject({ pdf: "/brochure/tok/pdf?download=1" });
    // Van een ander bedrijf, en een open machtiging: niet in de lijst.
    expect(docs.some((d) => d.key === "offerte-o3" || d.key === "machtiging-m2")).toBe(false);
  });

  it("telt per soort, alleen wat voorkomt", () => {
    const t = documentTelling(documentenVoor(k, bronnen, VANDAAG));
    expect(t.map((x) => `${x.soort}:${x.aantal}`)).toEqual(["offerte:2", "contract:1", "checklist:1", "onboarding:1", "machtiging:1", "overdracht:1", "evaluatie:1", "brochure:1", "reseller:1", "bestand:1"]);
  });

  it("een basiscontract dat nog concept is heeft nog geen checklist in de lijst", () => {
    const docs = documentenVoor(k, { ...bronnen, contracten: [{ ...bronnen.contracten[0], status: "concept", getekend_at: null, verstuurd_at: null }], checklists: [] }, VANDAAG);
    expect(docs.some((d) => d.soort === "checklist")).toBe(false);
    expect(docs.find((d) => d.soort === "contract")!.pdf).toBe("/admin/contractvoorbeeld/c1/concept?download=1");
  });
});

describe("tariefafspraken", () => {
  it("toont een offerteregel zoals hij vastligt, zonder te rekenen", () => {
    expect(tariefRegel(regel({}), 12)).toEqual({ naam: "Abonnement", omschrijving: null, bedrag: "€38,50 per medewerker per jaar", periode: "abonnement", aantal: "12 medewerkers" });
    expect(tariefRegel(regel({ eenheid: "eenmalig", prijs: 1250, soort: "optie" }), 12)).toMatchObject({ bedrag: "€1.250 eenmalig", periode: "eenmalig", aantal: null });
    expect(tariefRegel(regel({ eenheid: "uur", prijs: 95, soort: "tarief" }), null)).toMatchObject({ bedrag: "€95 per uur", periode: "bij gebruik" });
    expect(tariefRegel(regel({ prijs: null, eenheid: "op_aanvraag" }), null)).toMatchObject({ bedrag: "op aanvraag", periode: "op aanvraag" });
    expect(tariefRegel(regel({ prijs: null, prijsTekst: "6%", eenheid: "jaar" }), null)).toMatchObject({ bedrag: "6%", periode: "abonnement" });
    expect(tariefRegel(regel({ eenheid: "maand", prijs: 100, bijGebruik: true, soort: "optie" }), null).periode).toBe("bij gebruik");
  });

  it("kent de labels", () => {
    expect(merkUitLabel("React2u Recover")?.naam).toBe("Recover");
    expect(merkUitLabel("resist")?.naam).toBe("Resist");
    expect(merkUitLabel("Iets anders")).toBeNull();
  });

  it("haalt uit getekende offertes de gekozen regels per label, met de totalen van de offerte", () => {
    const regels: Regel[] = [
      regel({ id: "a", label: "React2u Recover", naam: "Verzuimbegeleiding", prijs: 38.5, eenheid: "medewerker_jaar", soort: "vast" }),
      regel({ id: "b", label: "React2u Resist", naam: "RI&E", prijs: 1250, eenheid: "eenmalig", soort: "optie" }),
      regel({ id: "c", label: "React2u Resist", naam: "PMO", prijs: 90, eenheid: "medewerker", soort: "optie" }),
      regel({ id: "d", label: "React2u Recover", naam: "Bedrijfsarts", prijs: 95, eenheid: "uur", soort: "tarief" }),
    ];
    const o = [
      { id: "o1", nummer: "O2026-0012", status: "getekend" as const, bedrijf: "Bakkerij De Korenaar B.V.", vorm: "verzuimbegeleiding" as const, regels, keuze: ["a", "b", "c"], medewerkers: 10, getekend_at: "2026-11-05T10:00:00Z", getekend_naam: "Fatima", getekend_inhoud: { regels, keuze: ["b"], medewerkers: 12 } as never, geldig_tot: "2026-12-01" },
      { id: "o2", nummer: "O2026-0002", status: "verstuurd" as const, bedrijf: "Bakkerij De Korenaar B.V.", vorm: "verzuimbegeleiding" as const, regels, keuze: null, medewerkers: 10, getekend_at: null, getekend_naam: null, getekend_inhoud: null, geldig_tot: null },
    ];
    const a = afsprakenUitOffertes(o, bedrijfSleutel("Bakkerij De Korenaar"));
    expect(a).toHaveLength(1);
    // De getekende inhoud wint van de kolommen: 12 medewerkers, alleen de RI&E erbij.
    expect(a[0].medewerkers).toBe(12);
    expect(a[0].groepen.map((g) => g.label)).toEqual(["React2u Recover", "React2u Resist"]);
    expect(a[0].groepen[0].regels.map((r) => r.naam)).toEqual(["Verzuimbegeleiding", "Bedrijfsarts"]);
    expect(a[0].groepen[1].regels.map((r) => r.naam)).toEqual(["RI&E"]);
    expect(a[0].groepen[0].merk?.naam).toBe("Recover");
    expect(a[0].perMaand).toBe(38.5);
    expect(a[0].eenmalig).toBe(1250);
    expect(a[0].href).toBe("/admin/offertes/o1");
  });

  it("losse klanten en opdrachten", () => {
    const l = losseAfspraken([
      { id: "l1", soort: "abonnement", bedrijf: "Bakkerij De Korenaar", omschrijving: null, vorm: "verzuimbegeleiding", bedrag: 250, datum: "2026-10-01", stop: null, verkoper: "Cindy", contactpersoon: null, email: null, notitie: null, created_at: "", updated_at: "" },
      { id: "l2", soort: "eenmalig", bedrijf: "Bakkerij De Korenaar", omschrijving: "Werkplekonderzoek", vorm: null, bedrag: 450.5, datum: "2026-11-01", stop: null, verkoper: null, contactpersoon: null, email: null, notitie: null, created_at: "", updated_at: "" },
      { id: "l3", soort: "eenmalig", bedrijf: "Ander", omschrijving: null, vorm: null, bedrag: 1, datum: "2026-11-02", stop: null, verkoper: null, contactpersoon: null, email: null, notitie: null, created_at: "", updated_at: "" },
    ], bedrijfSleutel("Bakkerij De Korenaar B.V."));
    expect(l.map((x) => x.id)).toEqual(["l2", "l1"]);
    expect(l[1]).toMatchObject({ omschrijving: "Abonnement", label: "React2u Recover", bedrag: "€250 per maand", periode: "abonnement" });
    expect(l[0]).toMatchObject({ omschrijving: "Werkplekonderzoek", label: "Overig", bedrag: "€450,50", periode: "eenmalig" });
  });

  it("afwijkende afspraken: lezen, controleren en tonen", () => {
    expect(leesBedrag("1.250,50")).toBe(1250.5);
    expect(leesBedrag("€ 95")).toBe(95);
    expect(leesBedrag("95.5")).toBe(95.5);
    expect(leesBedrag("")).toBeNull();
    expect(leesBedrag("abc")).toBeNaN();
    const ok = schoonTarief({ omschrijving: "  Uurtarief bedrijfsarts op locatie ", label: "recover", bedrag: "95", eenheid: "uur", ingangsdatum: "2026-11-01", einddatum: "", notitie: "" });
    expect(ok).toEqual({ ok: true, rij: { label: "recover", omschrijving: "Uurtarief bedrijfsarts op locatie", bedrag: 95, eenheid: "uur", ingangsdatum: "2026-11-01", einddatum: null, notitie: null } });
    expect(schoonTarief({ omschrijving: "", bedrag: "1" })).toMatchObject({ ok: false, fout: "Omschrijf de afspraak." });
    expect(schoonTarief({ omschrijving: "x", bedrag: "veel" })).toMatchObject({ ok: false, fout: "Het bedrag klopt niet." });
    expect(schoonTarief({ omschrijving: "x", label: "goud" })).toMatchObject({ ok: false, fout: "Onbekend label." });
    expect(schoonTarief({ omschrijving: "x", eenheid: "week" })).toMatchObject({ ok: false, fout: "Onbekende eenheid." });
    expect(schoonTarief({ omschrijving: "x", ingangsdatum: "2026-12-01", einddatum: "2026-11-01" })).toMatchObject({ ok: false });
    expect(schoonTarief({ omschrijving: "x", eenheid: "op_aanvraag", bedrag: "10" })).toMatchObject({ ok: true, rij: { bedrag: null } });
    expect(tariefTekst({ bedrag: 95, eenheid: "uur" })).toBe("€95 per uur");
    expect(tariefTekst({ bedrag: 1250, eenheid: "eenmalig" })).toBe("€1.250 eenmalig");
    expect(tariefTekst({ bedrag: null, eenheid: "uur" })).toBe("op aanvraag");
    expect(tariefPeriode({ bedrag: 95, eenheid: "uur" })).toBe("bij gebruik");
    expect(tariefPeriode({ bedrag: 100, eenheid: "maand" })).toBe("abonnement");
    expect(tariefPeriode({ bedrag: 100, eenheid: "traject" })).toBe("eenmalig");
    expect(tariefPeriode({ bedrag: null, eenheid: "uur" })).toBe("op aanvraag");
    expect(tariefGeldt({ ingangsdatum: "2026-11-01", einddatum: null }, VANDAAG)).toBe(true);
    expect(tariefGeldt({ ingangsdatum: "2026-12-01", einddatum: null }, VANDAAG)).toBe(false);
    expect(tariefGeldt({ ingangsdatum: null, einddatum: "2026-11-18" }, VANDAAG)).toBe(false);
  });
});
