import { describe, expect, it } from "vitest";
import {
  companyFromAsn, companyFromPtr, companyKey, identify, matchLead, normalizeName, registrableDomain,
  score, sessions, summarize, type CompanyView, type LeadRef,
} from "./companies";

const IP = "82.176.12.34";

describe("reverse DNS", () => {
  it("haalt het bedrijfsdomein uit een zelfgekozen naam", () => {
    expect(companyFromPtr("mail.jansen-bouw.nl", IP)).toBe("jansen-bouw.nl");
    expect(companyFromPtr("vpn.gemeente-eindhoven.nl.", IP)).toBe("gemeente-eindhoven.nl");
    expect(companyFromPtr("fw01.bouwbedrijf-de-vries.nl", IP)).toBe("bouwbedrijf-de-vries.nl");
    expect(companyFromPtr("remote.acme.co.uk", IP)).toBe("acme.co.uk");
  });

  it("negeert namen die de provider uitdeelde", () => {
    expect(companyFromPtr("82-176-12-34.static.kpn.net", IP)).toBeNull();
    expect(companyFromPtr("cpe-1234.ziggo.nl", IP)).toBeNull();
    expect(companyFromPtr("crawl-66-249-66-1.googlebot.com", "66.249.66.1")).toBeNull();
    expect(companyFromPtr("ec2-1-2-3-4.eu-west-1.compute.amazonaws.com", "1.2.3.4")).toBeNull();
  });

  it("negeert generieke namen, ook onder een onbekend domein", () => {
    expect(companyFromPtr("ip-82-176-12-34.kleineprovider.nl", IP)).toBeNull();
    expect(companyFromPtr("34.12.176.82.fiber.kleineprovider.nl", IP)).toBeNull();
    expect(companyFromPtr("dsl-static.kleineprovider.nl", IP)).toBeNull();
    expect(companyFromPtr("host123.kleineprovider.nl", IP)).toBeNull();
  });

  it("bepaalt het registreerbare domein", () => {
    expect(registrableDomain("a.b.c.example.nl")).toBe("example.nl");
    expect(registrableDomain("x.bedrijf.co.uk")).toBe("bedrijf.co.uk");
    expect(registrableDomain("82.176.12.34")).toBeNull();
    expect(registrableDomain("localhost")).toBeNull();
  });
});

describe("netwerkeigenaar", () => {
  it("herkent een organisatie met een eigen netwerk", () => {
    expect(companyFromAsn("AS1104 Philips Electronics Nederland B.V.", "philips.com"))
      .toEqual({ name: "Philips Electronics Nederland B.V.", domain: "philips.com" });
  });

  it("slaat providers, carriers en datacenters over", () => {
    expect(companyFromAsn("AS1136 KPN B.V.", "kpn.com")).toBeNull();
    expect(companyFromAsn("AS8315 Eurofiber Nederland B.V.", "eurofiber.com")).toBeNull();
    expect(companyFromAsn("AS8220 Colt Technology Services", "colt.net")).toBeNull();
    expect(companyFromAsn("AS16509 Amazon.com, Inc.", "amazon.com")).toBeNull();
  });

  it("matcht providernamen op woordbegin", () => {
    expect(companyFromAsn("AS1 Coltman Bouw BV", null)).toEqual({ name: "Coltman Bouw BV", domain: null });
  });

  it("geeft de netwerkeigenaar voorrang boven reverse DNS", () => {
    expect(identify({ name: "AS1 Gemeente Eindhoven", domain: "eindhoven.nl" }, "mail.iets-anders.nl", IP))
      .toEqual({ name: "Gemeente Eindhoven", domain: "eindhoven.nl", source: "asn" });
    expect(identify({ name: "AS1136 KPN B.V.", domain: "kpn.com" }, "mail.jansen-bouw.nl", IP))
      .toEqual({ name: "jansen-bouw.nl", domain: "jansen-bouw.nl", source: "rdns" });
    expect(identify(null, "1-2.static.kpn.net", IP)).toBeNull();
  });
});

describe("namen", () => {
  it("normaliseert rechtsvormen en leestekens weg", () => {
    expect(normalizeName("Smulders Installatietechniek B.V.")).toBe("smulders installatietechniek");
    expect(normalizeName("Café De Zon v.o.f.")).toBe("cafe de zon");
    expect(companyKey("Jansen Bouw", "Jansen-Bouw.nl")).toBe("jansen-bouw.nl");
    expect(companyKey("VDL Groep B.V.", null)).toBe("naam:vdl groep");
  });
});

const view = (at: string, path: string, hash = "h1", referrer: string | null = null): CompanyView => ({
  created_at: at, path, visitor_hash: hash, referrer_host: referrer,
  company: "jansen-bouw.nl", company_domain: "jansen-bouw.nl", company_source: "rdns",
});

describe("bezoeken en score", () => {
  it("knipt sessies op een half uur stilte en per bezoeker", () => {
    const s = sessions([
      view("2026-09-29T10:00:00Z", "/"),
      view("2026-09-29T10:10:00Z", "/diensten"),
      view("2026-09-29T11:00:00Z", "/contact"),
      view("2026-09-29T10:05:00Z", "/", "h2"),
    ]);
    expect(s.map((x) => x.pages.length).sort()).toEqual([1, 1, 2]);
  });

  it("maakt een bedrijf dat terugkomt en contact bekijkt warm", () => {
    const now = new Date("2026-09-29T12:00:00Z");
    const s = sessions([
      view("2026-09-25T10:00:00Z", "/diensten", "a", "google.com"),
      view("2026-09-29T10:00:00Z", "/verzuimbegeleiding-wvp", "b"),
      view("2026-09-29T10:03:00Z", "/contact", "b"),
    ]);
    const sc = score(s, now);
    expect(sc.level).toBe("warm");
    expect(sc.signals).toEqual(expect.arrayContaining(["kwam op 2 dagen langs", "bekeek contact", "via Google", "recent"]));
    expect(sc.hint).toBeNull();
  });

  it("herkent een sollicitant en telt hem niet als warm", () => {
    const s = sessions([
      view("2026-09-29T10:00:00Z", "/vacatures"),
      view("2026-09-29T10:02:00Z", "/vacatures/casemanager"),
      view("2026-09-28T10:02:00Z", "/vacatures/casemanager", "x"),
    ]);
    const sc = score(s, new Date("2026-09-29T12:00:00Z"));
    expect(sc.level).toBe("koud");
    expect(sc.hint).toContain("sollicitant");
  });
});

describe("bellijst en samenvatting", () => {
  const leads: LeadRef[] = [
    { id: "l1", name: "Peter", company: "Smulders Installatietechniek", email: "p@smulders.nl", status: "klant" },
    { id: "l2", name: "Karin", company: "Jansen Bouw B.V.", email: null, status: "te_bellen" },
  ];

  it("koppelt op e-maildomein, bedrijfsnaam of vaste koppeling", () => {
    expect(matchLead({ name: "smulders.nl", domain: "smulders.nl" }, leads)?.id).toBe("l1");
    expect(matchLead({ name: "jansen-bouw.nl", domain: "jansen-bouw.nl" }, leads)?.id).toBe("l2");
    expect(matchLead({ name: "Iets Anders", domain: null }, leads, "l2")?.id).toBe("l2");
    expect(matchLead({ name: "Jansen", domain: null }, leads)).toBeNull();
  });

  it("maakt één regel per bedrijf, met profiel en lead", () => {
    const out = summarize(
      [view("2026-09-29T10:00:00Z", "/contact"), view("2026-09-29T10:01:00Z", "/diensten")],
      [{ key: "jansen-bouw.nl", name: "jansen-bouw.nl", domain: "jansen-bouw.nl", ignored: true, lead_id: null }],
      leads,
      new Date("2026-09-29T12:00:00Z")
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ key: "jansen-bouw.nl", views: 2, ignored: true, source: "rdns" });
    expect(out[0].lead?.id).toBe("l2");
    expect(out[0].pages[0]).toEqual({ path: "/contact", count: 1 });
  });
});
