import { describe, expect, it } from "vitest";
import {
  bouwBord, bronTekst, dagenGeleden, IDEE_SOORTEN, IDEE_STATUS, isAfgerond, langOpen, leesIdee, leesReactie, leesSortering, leesStatus, maandagVanWeek,
  magStemmen, magWijzigen, meldingTekst, naamVan, nieuwDezeWeek, reactieBrief, soortenGelijkAanWeekevaluatie, sorteer, statusBrief, telPerStatus, titelUit, toonTekst, wanneer,
  zichtbaarVoor, type BordIdee, type Idee,
} from "./ideeen";
import { MELDING_SOORTEN } from "./weekevaluatie";

const idee = (o: Partial<Idee> = {}): Idee => ({
  id: "i1", titel: "Vaste belmomenten", tekst: "Elke ochtend een uur bellen.", soort: "idee", door: "noor", door_email: "noor@react2u.test",
  vertrouwelijk: false, status: "ingediend", reden: null, status_at: null, status_door: null, bron: "bord", bron_week: null,
  created_at: "2026-11-20T10:00:00Z", updated_at: "2026-11-20T10:00:00Z", ...o,
});
const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const noor = { userId: "noor", beheer: false };
const bram = { userId: "bram", beheer: false };
const beheer = { userId: "rens", beheer: true };

describe("soorten en statussen", () => {
  it("spreekt dezelfde taal als Iets melden of delen in de weekevaluatie", () => {
    expect(soortenGelijkAanWeekevaluatie()).toBe(true);
    expect([...IDEE_SOORTEN.map((s) => s.key)].sort()).toEqual(MELDING_SOORTEN.map((k) => k.sleutel).sort());
    expect(IDEE_SOORTEN[0].key).toBe("idee");
  });

  it("kent vijf statussen in de volgorde van het bord, met uitleg voor de collega", () => {
    expect(IDEE_STATUS.map((s) => s.key)).toEqual(["ingediend", "bekeken", "opgepakt", "gedaan", "niet_nu"]);
    for (const s of IDEE_STATUS) expect(s.uitleg.length).toBeGreaterThan(5);
    expect(isAfgerond("gedaan") && isAfgerond("niet_nu") && !isAfgerond("opgepakt")).toBe(true);
  });

  it("noemt nergens een naam in wat een collega leest", () => {
    const alles = [...IDEE_STATUS.flatMap((s) => [s.label, s.uitleg, s.redenLabel]), ...IDEE_SOORTEN.map((s) => s.label)].join(" ");
    expect(/\bRens\b/.test(alles)).toBe(false);
  });
});

describe("wie wat mag", () => {
  it("laat een vertrouwelijk idee alleen aan de inbrenger en het beheer zien", () => {
    const v = idee({ vertrouwelijk: true });
    expect(zichtbaarVoor(v, noor)).toBe(true);
    expect(zichtbaarVoor(v, bram)).toBe(false);
    expect(zichtbaarVoor(v, beheer)).toBe(true);
    expect(zichtbaarVoor(idee(), bram)).toBe(true);
  });

  it("laat je je eigen idee aanpassen zolang het op ingediend staat; het beheer altijd", () => {
    expect(magWijzigen(idee(), noor)).toBe(true);
    expect(magWijzigen(idee({ status: "bekeken" }), noor)).toBe(false);
    expect(magWijzigen(idee(), bram)).toBe(false);
    expect(magWijzigen(idee({ status: "gedaan" }), beheer)).toBe(true);
  });

  it("laat je niet op je eigen idee stemmen, en niet op wat afgerond is", () => {
    expect(magStemmen(idee(), bram)).toBe(true);
    expect(magStemmen(idee(), noor)).toBe(false);
    expect(magStemmen(idee({ status: "gedaan" }), bram)).toBe(false);
    expect(magStemmen(idee({ status: "opgepakt" }), bram)).toBe(true);
  });
});

describe("het bord", () => {
  const ideeen = [idee({ id: "a", created_at: "2026-11-18T10:00:00Z" }), idee({ id: "b", created_at: "2026-11-20T10:00:00Z", status: "opgepakt" }), idee({ id: "c", created_at: "2026-11-19T10:00:00Z", status: "gedaan" })];
  const stemmen = [
    { idee_id: "a", user_id: "bram" }, { idee_id: "a", user_id: "rens" },
    { idee_id: "c", user_id: "bram" },
  ];
  const reacties = [{ idee_id: "a" }, { idee_id: "a" }, { idee_id: "b" }];

  it("telt stemmen en reacties per idee en weet of jij stemde", () => {
    const bord = bouwBord(ideeen, stemmen, reacties, "bram");
    const a = bord.find((i) => i.id === "a")!;
    expect([a.stemmen, a.mijnStem, a.reacties]).toEqual([2, true, 2]);
    const b = bord.find((i) => i.id === "b")!;
    expect([b.stemmen, b.mijnStem, b.reacties]).toEqual([0, false, 1]);
    expect(bouwBord(ideeen, stemmen, reacties, "noor").find((i) => i.id === "a")!.mijnStem).toBe(false);
  });

  it("sorteert op nieuwste of op meeste stemmen, bij gelijk nieuwste eerst", () => {
    const bord = bouwBord(ideeen, stemmen, reacties, "bram");
    expect(sorteer(bord, "nieuwste").map((i) => i.id)).toEqual(["b", "c", "a"]);
    expect(sorteer(bord, "stemmen").map((i) => i.id)).toEqual(["a", "c", "b"]);
    expect(leesSortering("stemmen")).toBe("stemmen");
    expect(leesSortering("onzin")).toBe("nieuwste");
    expect(leesSortering(undefined)).toBe("nieuwste");
  });

  it("telt per status, ook de lege", () => {
    expect(telPerStatus(ideeen)).toEqual({ ingediend: 1, bekeken: 0, opgepakt: 1, gedaan: 1, niet_nu: 0 });
  });
});

describe("het signaal na twee weken", () => {
  it("noemt wat langer dan veertien dagen op ingediend staat, het oudste eerst", () => {
    const lijst = [
      idee({ id: "vers", created_at: "2026-11-20T10:00:00Z" }),
      idee({ id: "oud", created_at: "2026-11-01T10:00:00Z" }),
      idee({ id: "ouder", created_at: "2026-10-20T10:00:00Z" }),
      idee({ id: "bekeken", created_at: "2026-10-01T10:00:00Z", status: "bekeken" }),
      idee({ id: "precies", created_at: "2026-11-09T10:00:00Z" }),
    ];
    expect(langOpen(lijst, "2026-11-23").map((i) => i.id)).toEqual(["ouder", "oud"]);
    // Precies veertien dagen is nog niet langer dan twee weken; de dag erna wel.
    expect(langOpen(lijst, "2026-11-24").map((i) => i.id)).toEqual(["ouder", "oud", "precies"]);
  });

  it("rekent dagen in Nederlandse tijd", () => {
    expect(dagenGeleden("2026-11-22T23:30:00Z", "2026-11-23")).toBe(0);
    expect(dagenGeleden("2026-11-20T10:00:00Z", "2026-11-23")).toBe(3);
  });

  it("weet wat deze week nieuw is", () => {
    expect(maandagVanWeek("2026-11-23")).toBe("2026-11-23");
    expect(maandagVanWeek("2026-11-29")).toBe("2026-11-23");
    const lijst = [idee({ id: "ma", created_at: "2026-11-23T08:00:00Z" }), idee({ id: "zo", created_at: "2026-11-22T22:00:00Z" }), idee({ id: "zo-laat", created_at: "2026-11-22T23:30:00Z" })];
    // Zondag 23:30 UTC is maandag 00:30 in Nederland.
    expect(nieuwDezeWeek(lijst, "2026-11-25").map((i) => i.id)).toEqual(["ma", "zo-laat"]);
  });
});

describe("tekst", () => {
  it("maakt een titel van de eerste regel van een melding, kort gehouden", () => {
    expect(titelUit("Susanne nam twee dossiers over.\nDat mag gezien worden.")).toBe("Susanne nam twee dossiers over.");
    expect(titelUit("  Veel   spaties   hier  ")).toBe("Veel spaties hier");
    const lang = "Dit is een heel lange eerste regel die echt veel langer is dan negentig tekens en dus wordt afgekapt tot iets korters";
    const t = titelUit(lang);
    expect(t.endsWith("…") && t.length <= 80).toBe(true);
    expect(t).toBe("Dit is een heel lange eerste regel die echt veel langer is dan negentig tekens…");
  });

  it("toont onder een titel uit de weekevaluatie niet nog eens dezelfde regel", () => {
    expect(toonTekst(idee({ bron: "weekevaluatie", bron_week: "2026-11-16", titel: "Eerste regel.", tekst: "Eerste regel.\nTweede regel." }))).toBe("Tweede regel.");
    expect(toonTekst(idee({ bron: "weekevaluatie", bron_week: "2026-11-16", titel: "Eén regel.", tekst: "Eén regel." }))).toBeNull();
    // Een afgekapte titel: dan staat de hele tekst eronder.
    expect(toonTekst(idee({ bron: "weekevaluatie", bron_week: "2026-11-16", titel: "Lange regel…", tekst: "Lange regel die verder gaat." }))).toBe("Lange regel die verder gaat.");
    expect(toonTekst(idee({ titel: "Vaste belmomenten", tekst: "Vaste belmomenten" }))).toBe("Vaste belmomenten");
  });

  it("noemt een collega bij de voornaam uit het e-mailadres", () => {
    expect(naamVan("noor@react2u.test")).toBe("Noor");
    expect(naamVan("info@react2u.nl")).toBe("info@react2u.nl");
    expect(naamVan(null)).toBe("een collega");
  });

  it("zegt hoe lang geleden", () => {
    expect(wanneer("2026-11-23T08:00:00Z", "2026-11-23")).toBe("vandaag");
    expect(wanneer("2026-11-22T08:00:00Z", "2026-11-23")).toBe("gisteren");
    expect(wanneer("2026-11-20T08:00:00Z", "2026-11-23")).toBe("3 dagen geleden");
    expect(wanneer("2026-11-03T08:00:00Z", "2026-11-23")).toBe("3 nov");
    expect(wanneer("2025-11-03T08:00:00Z", "2026-11-23")).toBe("3 nov 2025");
  });

  it("zegt waar een idee vandaan komt", () => {
    expect(bronTekst(idee())).toBeNull();
    expect(bronTekst(idee({ bron: "weekevaluatie", bron_week: "2026-11-16" }))).toBe("uit de weekevaluatie van week 47");
  });

  it("maakt van een melding een zin voor het dashboard", () => {
    expect(meldingTekst({ soort: "status", status: "opgepakt", tekst: null, door_email: "rens@react2u.nl" }, "Vaste belmomenten")).toEqual({ kop: 'Je idee "Vaste belmomenten" staat nu op Opgepakt', sub: "Er wordt aan gewerkt." });
    expect(meldingTekst({ soort: "status", status: "niet_nu", tekst: "Pas na de drukte van januari.", door_email: null }, "X").sub).toBe("Pas na de drukte van januari.");
    expect(meldingTekst({ soort: "reactie", status: null, tekst: "Goed idee, doe ik mee.", door_email: "bram@react2u.test" }, "X")).toEqual({ kop: 'Bram reageerde op "X"', sub: "Goed idee, doe ik mee." });
  });
});

describe("formulieren", () => {
  it("leest een idee: titel en tekst verplicht, soort uit de lijst, vertrouwelijk als vinkje", () => {
    expect(leesIdee(form({ titel: " Vaste  belmomenten ", tekst: "Elke ochtend.\r\nEen uur.", soort: "zorg", vertrouwelijk: "aan" }))).toEqual({ titel: "Vaste belmomenten", tekst: "Elke ochtend.\nEen uur.", soort: "zorg", vertrouwelijk: true });
    expect(leesIdee(form({ titel: "X", tekst: "Y", soort: "onzin" }))).toEqual({ titel: "X", tekst: "Y", soort: "idee", vertrouwelijk: false });
    expect(leesIdee(form({ titel: "", tekst: "Y" }))).toEqual({ fout: "idee-leeg" });
    expect(leesIdee(form({ titel: "x".repeat(121), tekst: "Y" }))).toEqual({ fout: "idee-te-lang" });
  });

  it("leest een reactie", () => {
    expect(leesReactie(form({ tekst: " Mee eens. " }))).toEqual({ tekst: "Mee eens." });
    expect(leesReactie(form({ tekst: "  " }))).toEqual({ fout: "reactie-leeg" });
    expect(leesReactie(form({ tekst: "x".repeat(1001) }))).toEqual({ fout: "reactie-te-lang" });
  });

  it("vraagt bij niet nu om een reden", () => {
    expect(leesStatus(form({ status: "opgepakt", reden: "" }))).toEqual({ status: "opgepakt", reden: null });
    expect(leesStatus(form({ status: "niet_nu", reden: "" }))).toEqual({ fout: "idee-reden" });
    expect(leesStatus(form({ status: "niet_nu", reden: "Na januari." }))).toEqual({ status: "niet_nu", reden: "Na januari." });
    expect(leesStatus(form({ status: "klaar", reden: "" }))).toEqual({ fout: "idee-status" });
  });
});

describe("de mails aan de inbrenger", () => {
  it("vertelt bij een andere status wat het betekent, met de reden, zonder naam", () => {
    const b = statusBrief("Noor", idee(), "niet_nu", "Pas na januari.", "https://react2u.nl/admin/ideeen/i1");
    expect(b.onderwerp).toBe('Je idee "Vaste belmomenten": niet nu');
    expect(b.alineas[0]).toBe("Hoi Noor,");
    expect(b.alineas.some((a) => a.includes("Pas na januari."))).toBe(true);
    expect(b.alineas[b.alineas.length - 1]).toContain("/admin/ideeen/i1");
    expect(/\bRens\b/.test(b.alineas.join(" "))).toBe(false);
    expect(statusBrief(null, idee(), "opgepakt", null, "x").alineas[0]).toBe("Hoi,");
  });

  it("stuurt een reactie door met de naam van de collega", () => {
    const b = reactieBrief("Noor", idee(), "Bram", "Doe ik mee.", "https://react2u.nl/admin/ideeen/i1");
    expect(b.onderwerp).toBe('Bram reageerde op je idee "Vaste belmomenten"');
    expect(b.alineas).toContain('"Doe ik mee."');
    expect(b.groet[1]).toBe("Bram");
  });
});

// Zodat BordIdee als type bestaat voor wie het bord bouwt.
const _t: BordIdee = { ...idee(), stemmen: 0, mijnStem: false, reacties: 0 };
void _t;
