import { describe, expect, it } from "vitest";
import {
  afwezigeBrief, collegaVanCasemanager, datumKort, dekkingTekst, duurDagen, fase, gedekteKlanten, klantenVan, kort, leesWaarneming, naamVan,
  nuOfBinnenkort, overlapt, perFase, periodeTekst, sorteer, standTekst, voornaamVan, waarnemerBrief, wieNeemtWaar, type Collega, type Waarneming, type WnKlant,
} from "./waarneming";

const FENNA: Collega = { user_id: "f".repeat(8) + "-0000-4000-8000-000000000005", email: "fenna@react2u.test", naam: "Fenna de Vries", functie: "Casemanager Verzuim" };
const BRAM: Collega = { user_id: "b".repeat(8) + "-0000-4000-8000-000000000006", email: "bram@react2u.test", naam: null, functie: null };
const IDA: Collega = { user_id: "1".repeat(8) + "-0000-4000-8000-000000000007", email: "ida.jansen@react2u.test", naam: "Ida Jansen", functie: "Casemanager" };
const COLLEGAS = [FENNA, BRAM, IDA];

const klant = (id: string, bedrijf: string, casemanager: string | null): WnKlant => ({ id: `${id.repeat(8)}-0000-4000-8000-00000000000${id}`, bedrijf, status: "klant", casemanager, medewerkers: 12, plaats: "Breda" });
const K1 = klant("1", "Bakkerij Bos", "Fenna de Vries");
const K2 = klant("2", "Garage Smits", "fenna");
const K3 = klant("3", "Kapsalon Knip", "Ida");
const K4 = klant("4", "Zorg Zuid", null);
const K5 = klant("5", "Tandarts Tand", "Jan");
const KLANTEN = [K1, K2, K3, K4, K5];

const w = (o: Partial<Waarneming> & Pick<Waarneming, "van" | "tot">): Waarneming => ({
  id: `w${o.van}${o.tot}`, afwezige: FENNA.user_id, afwezige_email: FENNA.email, waarnemer: BRAM.user_id, waarnemer_email: BRAM.email, klant_ids: [], toelichting: null,
  door: FENNA.user_id, created_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z", ...o,
});
const VANDAAG = "2026-12-02";

describe("namen", () => {
  it("naam uit de medewerkers, anders de voornaam uit het adres", () => {
    expect(naamVan(FENNA)).toBe("Fenna de Vries");
    expect(naamVan(BRAM)).toBe("Bram");
    expect(naamVan(null, "ida.jansen@react2u.test")).toBe("Ida");
    expect(naamVan(null, null)).toBe("een collega");
    expect(voornaamVan(FENNA)).toBe("Fenna");
    expect(voornaamVan(IDA)).toBe("Ida");
  });
});

describe("klanten aan een collega", () => {
  it("de hele naam, of alleen de voornaam als die uniek is", () => {
    expect(collegaVanCasemanager("Fenna de Vries", COLLEGAS)?.user_id).toBe(FENNA.user_id);
    expect(collegaVanCasemanager("  fenna  ", COLLEGAS)?.user_id).toBe(FENNA.user_id);
    expect(collegaVanCasemanager("Ida", COLLEGAS)?.user_id).toBe(IDA.user_id);
    expect(collegaVanCasemanager("bram@react2u.test", COLLEGAS)?.user_id).toBe(BRAM.user_id);
    expect(collegaVanCasemanager("Jan", COLLEGAS)).toBeNull();
    expect(collegaVanCasemanager("", COLLEGAS)).toBeNull();
    expect(collegaVanCasemanager(null, COLLEGAS)).toBeNull();
  });
  it("een voornaam die bij twee collega's hoort, hoort bij niemand", () => {
    const tweeIdas = [...COLLEGAS, { ...IDA, user_id: "2".repeat(8) + "-0000-4000-8000-000000000008", email: "ida.b@react2u.test", naam: "Ida Bakker" }];
    expect(collegaVanCasemanager("Ida", tweeIdas)).toBeNull();
    expect(collegaVanCasemanager("Ida Bakker", tweeIdas)?.email).toBe("ida.b@react2u.test");
  });
  it("klantenVan en gedekteKlanten", () => {
    expect(klantenVan(FENNA, KLANTEN, COLLEGAS).map((k) => k.bedrijf)).toEqual(["Bakkerij Bos", "Garage Smits"]);
    expect(klantenVan(BRAM, KLANTEN, COLLEGAS)).toEqual([]);
    expect(gedekteKlanten({ afwezige: FENNA.user_id, klant_ids: [] }, KLANTEN, COLLEGAS).map((k) => k.bedrijf)).toEqual(["Bakkerij Bos", "Garage Smits"]);
    expect(gedekteKlanten({ afwezige: FENNA.user_id, klant_ids: [K4.id] }, KLANTEN, COLLEGAS).map((k) => k.bedrijf)).toEqual(["Zorg Zuid"]);
  });
});

describe("tijd", () => {
  it("fase, duur en binnenkort", () => {
    expect(fase({ van: "2026-12-01", tot: "2026-12-05" }, VANDAAG)).toBe("actief");
    expect(fase({ van: "2026-12-02", tot: "2026-12-02" }, VANDAAG)).toBe("actief");
    expect(fase({ van: "2026-12-03", tot: "2026-12-05" }, VANDAAG)).toBe("komend");
    expect(fase({ van: "2026-11-20", tot: "2026-12-01" }, VANDAAG)).toBe("voorbij");
    expect(duurDagen("2026-12-01", "2026-12-05")).toBe(5);
    expect(duurDagen("2026-12-01", "2026-12-01")).toBe(1);
    expect(nuOfBinnenkort({ van: "2026-12-16", tot: "2026-12-20" }, VANDAAG)).toBe(true);
    expect(nuOfBinnenkort({ van: "2026-12-17", tot: "2026-12-20" }, VANDAAG)).toBe(false);
    expect(nuOfBinnenkort({ van: "2026-11-01", tot: "2026-11-02" }, VANDAAG)).toBe(false);
  });
  it("sorteren: nu, dan komend, dan geweest", () => {
    const lijst = [w({ van: "2026-11-01", tot: "2026-11-03" }), w({ van: "2026-12-10", tot: "2026-12-12" }), w({ van: "2026-12-01", tot: "2026-12-09" }), w({ van: "2026-12-04", tot: "2026-12-04" }), w({ van: "2026-11-30", tot: "2026-12-03" }), w({ van: "2026-11-10", tot: "2026-11-20" })];
    expect(sorteer(lijst, VANDAAG).map((x) => x.van)).toEqual(["2026-11-30", "2026-12-01", "2026-12-04", "2026-12-10", "2026-11-10", "2026-11-01"]);
    const f = perFase(lijst, VANDAAG);
    expect([f.actief.length, f.komend.length, f.voorbij.length]).toEqual([2, 2, 2]);
  });
  it("overlap bij dezelfde collega", () => {
    const a = w({ van: "2026-12-01", tot: "2026-12-05" });
    expect(overlapt({ ...w({ van: "2026-12-05", tot: "2026-12-08" }), id: "ander" }, [a])).toBe(true);
    expect(overlapt({ ...w({ van: "2026-12-06", tot: "2026-12-08" }), id: "ander" }, [a])).toBe(false);
    expect(overlapt(a, [a])).toBe(false);
    expect(overlapt({ ...w({ van: "2026-12-01", tot: "2026-12-05" }), id: "ander", afwezige: BRAM.user_id }, [a])).toBe(false);
  });
  it("datums in gewone woorden", () => {
    expect(datumKort("2026-12-04")).toBe("vr 4 dec");
    expect(periodeTekst("2026-12-01", "2026-12-05")).toBe("di 1 t/m za 5 dec");
    expect(periodeTekst("2026-12-31", "2027-01-04")).toBe("do 31 dec t/m ma 4 jan");
    expect(periodeTekst("2026-12-04", "2026-12-04")).toBe("vr 4 dec");
    expect(standTekst({ van: "2026-12-01", tot: "2026-12-02" }, VANDAAG)).toBe("vandaag nog");
    expect(standTekst({ van: "2026-12-01", tot: "2026-12-03" }, VANDAAG)).toBe("t/m morgen");
    expect(standTekst({ van: "2026-12-01", tot: "2026-12-09" }, VANDAAG)).toBe("t/m wo 9 dec");
    expect(standTekst({ van: "2026-12-03", tot: "2026-12-09" }, VANDAAG)).toBe("vanaf morgen");
    expect(standTekst({ van: "2026-12-08", tot: "2026-12-09" }, VANDAAG)).toBe("vanaf di 8 dec");
    expect(standTekst({ van: "2026-11-08", tot: "2026-11-09" }, VANDAAG)).toBe("tot ma 9 nov");
  });
});

describe("wie is er voor een klant", () => {
  const nu = w({ van: "2026-12-01", tot: "2026-12-05" });
  const straks = w({ van: "2026-12-10", tot: "2026-12-12", waarnemer: IDA.user_id, waarnemer_email: IDA.email });
  const verWeg = w({ van: "2027-01-10", tot: "2027-01-12" });
  const alleenZorg = w({ van: "2026-12-01", tot: "2026-12-05", afwezige: IDA.user_id, afwezige_email: IDA.email, klant_ids: [K4.id], waarnemer: FENNA.user_id, waarnemer_email: FENNA.email });
  it("nu en straks, op naam of op gekozen klanten", () => {
    const d = wieNeemtWaar(K1, [nu, straks, verWeg, alleenZorg], VANDAAG, COLLEGAS);
    expect(d.nu?.waarnemer?.user_id).toBe(BRAM.user_id);
    expect(d.straks?.waarnemer?.user_id).toBe(IDA.user_id);
    expect(wieNeemtWaar(K3, [nu, straks, alleenZorg], VANDAAG, COLLEGAS).nu).toBeNull();
    expect(wieNeemtWaar(K4, [nu, alleenZorg], VANDAAG, COLLEGAS).nu?.waarnemer?.user_id).toBe(FENNA.user_id);
    expect(wieNeemtWaar(K1, [verWeg], VANDAAG, COLLEGAS)).toEqual({ nu: null, straks: null });
  });
  it("de tekst op de pil", () => {
    const d = wieNeemtWaar(K1, [nu, straks], VANDAAG, COLLEGAS);
    expect(dekkingTekst(d.nu!, VANDAAG)).toBe("Bram neemt waar voor Fenna, t/m za 5 dec");
    expect(dekkingTekst(d.straks!, VANDAAG)).toBe("Ida neemt waar vanaf do 10 dec (Fenna is er dan niet)");
    const zonder = wieNeemtWaar(K1, [w({ van: "2026-12-01", tot: "2026-12-05", waarnemer: null, waarnemer_email: null })], VANDAAG, COLLEGAS);
    expect(dekkingTekst(zonder.nu!, VANDAAG)).toBe("Nog geen waarnemer voor Fenna, t/m za 5 dec");
  });
});

describe("dashboard", () => {
  it("kort: wat voor jou telt, en voor het beheer wat nog te regelen is", () => {
    const lijst = [
      w({ van: "2026-12-01", tot: "2026-12-05" }),
      w({ van: "2026-12-08", tot: "2026-12-09", afwezige: BRAM.user_id, afwezige_email: BRAM.email, waarnemer: null, waarnemer_email: null }),
      w({ van: "2027-02-01", tot: "2027-02-02", waarnemer: null, waarnemer_email: null }),
      w({ van: "2026-11-01", tot: "2026-11-02", afwezige: IDA.user_id, waarnemer: BRAM.user_id }),
    ];
    const bram = kort(lijst, BRAM.user_id, VANDAAG, false);
    expect(bram.ikNeemWaar.map((x) => x.van)).toEqual(["2026-12-01"]);
    expect(bram.voorMij.map((x) => x.van)).toEqual(["2026-12-08"]);
    expect(bram.teRegelen).toEqual([]);
    expect(bram.afwezigNu).toBe(1);
    const beheer = kort(lijst, IDA.user_id, VANDAAG, true);
    expect(beheer.teRegelen.map((x) => x.van)).toEqual(["2026-12-08"]);
  });
});

describe("het formulier", () => {
  const fd = (o: Record<string, string | string[]>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
    return f;
  };
  const o = { userId: FENNA.user_id, beheer: false, collegas: COLLEGAS, vandaag: VANDAAG };
  it("een gewone waarneming", () => {
    const uit = leesWaarneming(fd({ van: "2026-12-10", tot: "2026-12-12", waarnemer: BRAM.user_id, klanten: "alle", toelichting: "  Bel Bakkerij Bos dinsdag terug.  " }), o);
    expect(uit).toEqual({ afwezige: FENNA.user_id, van: "2026-12-10", tot: "2026-12-12", waarnemer: BRAM.user_id, klant_ids: [], toelichting: "Bel Bakkerij Bos dinsdag terug." });
  });
  it("gekozen klanten, zonder waarnemer, zonder toelichting", () => {
    const uit = leesWaarneming(fd({ van: "2026-12-10", tot: "2026-12-12", klant: [K1.id, K1.id, K4.id, "x"] }), o);
    expect(uit).toEqual({ afwezige: FENNA.user_id, van: "2026-12-10", tot: "2026-12-12", waarnemer: null, klant_ids: [K1.id, K4.id], toelichting: null });
  });
  it("fouten", () => {
    expect(leesWaarneming(fd({ van: "10-12-2026", tot: "2026-12-12" }), o)).toEqual({ fout: "waarneming-datum" });
    expect(leesWaarneming(fd({ van: "2026-12-12", tot: "2026-12-10" }), o)).toEqual({ fout: "waarneming-volgorde" });
    expect(leesWaarneming(fd({ van: "2026-11-10", tot: "2026-11-12" }), o)).toEqual({ fout: "waarneming-voorbij" });
    expect(leesWaarneming(fd({ van: "2026-12-10", tot: "2028-12-12" }), o)).toEqual({ fout: "waarneming-lang" });
    expect(leesWaarneming(fd({ van: "2026-12-10", tot: "2026-12-12", waarnemer: FENNA.user_id }), o)).toEqual({ fout: "waarneming-zelf" });
    expect(leesWaarneming(fd({ van: "2026-12-10", tot: "2026-12-12", waarnemer: "9".repeat(8) + "-0000-4000-8000-000000000009" }), o)).toEqual({ fout: "waarneming-wie" });
    expect(leesWaarneming(fd({ van: "2026-12-10", tot: "2026-12-12", toelichting: "x".repeat(1001) }), o)).toEqual({ fout: "waarneming-toelichting" });
  });
  it("alleen het beheer kiest een ander als afwezige", () => {
    const voorBram = fd({ afwezige: BRAM.user_id, van: "2026-12-10", tot: "2026-12-12", waarnemer: FENNA.user_id });
    expect((leesWaarneming(voorBram, o) as { fout: string }).fout).toBe("waarneming-zelf");
    const uit = leesWaarneming(voorBram, { ...o, beheer: true }) as { afwezige: string; waarnemer: string | null };
    expect(uit.afwezige).toBe(BRAM.user_id);
    expect(uit.waarnemer).toBe(FENNA.user_id);
  });
});

describe("mails", () => {
  it("aan de waarnemer, zonder naam van het beheer", () => {
    const b = waarnemerBrief({ waarnemer: "Bram", afwezige: "Fenna", van: "2026-12-01", tot: "2026-12-05", klanten: ["Bakkerij Bos", "Garage Smits"], toelichting: "Bel Bos dinsdag.", link: "https://react2u.nl/admin/waarneming/x", doorBeheer: false });
    expect(b.onderwerp).toBe("Je neemt waar voor Fenna: di 1 t/m za 5 dec");
    expect(b.alineas[1]).toContain("5 dagen");
    expect(b.alineas[2]).toBe("Je neemt 2 klanten over: Bakkerij Bos en Garage Smits. Op de klantenkaart en het klantenbord staat zolang jouw naam erbij.");
    expect(b.alineas[3]).toBe("Wat je moet weten: Bel Bos dinsdag.");
    expect(b.alineas.join(" ") + b.groet.join(" ")).not.toMatch(/Rens/);
    const beheer = waarnemerBrief({ waarnemer: "Bram", afwezige: "Fenna", van: "2026-12-01", tot: "2026-12-01", klanten: [], toelichting: null, link: "x", doorBeheer: true });
    expect(beheer.alineas[1]).toBe("Het beheer heeft je als waarnemer gezet voor Fenna: di 1 dec (1 dag).");
    expect(beheer.alineas[2]).toContain("nog geen klant op naam");
    expect(beheer.alineas).toHaveLength(4);
  });
  it("aan de afwezige", () => {
    expect(afwezigeBrief({ afwezige: "Fenna", waarnemer: "Bram", van: "2026-12-01", tot: "2026-12-05", link: "x" }).alineas[1]).toBe("Het beheer heeft vastgelegd dat Bram voor je waarneemt di 1 t/m za 5 dec. Je klanten zien dat op de klantenkaart.");
    expect(afwezigeBrief({ afwezige: "Fenna", waarnemer: null, van: "2026-12-01", tot: "2026-12-05", link: "x" }).alineas[1]).toContain("nog geen waarnemer");
  });
});
