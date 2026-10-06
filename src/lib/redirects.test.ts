import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkDestination, checkSource, coveredByWordpress, coveringSources, createsLoop, matchRedirect, missingReferrer,
  normalizePath, suggestDestination, targetUrl, DIENST_REDIRECTS, VASTE_REDIRECTS, type RedirectRule,
} from "./redirects";
import { LABELS, labelVoor } from "./nav";

const rule = (source: string, destination: string): RedirectRule => ({ source, destination, permanent: true });
const reason = (r: { ok: boolean }) => (r as { reason?: string }).reason;

describe("doorverwijzingen", () => {
  it("normaliseert een geplakte URL naar een pad", () => {
    expect(normalizePath("https://www.react2u.nl/Oude-Pagina/?utm=x#top")).toBe("/oude-pagina");
    expect(normalizePath("oude-pagina/")).toBe("/oude-pagina");
    expect(normalizePath("//a//b/")).toBe("/a/b");
    expect(normalizePath("/caf%C3%A9")).toBe("/café");
  });

  it("weigert bronnen die niet kunnen werken", () => {
    expect(checkSource("https://react2u.nl/oud/")).toEqual({ ok: true, source: "/oud" });
    expect(reason(checkSource("https://google.com/x"))).toBe("ander-domein");
    expect(reason(checkSource("/"))).toBe("home");
    expect(reason(checkSource("/admin/x"))).toBe("gereserveerd");
    expect(reason(checkSource("/oud.html"))).toBe("extensie");
    expect(checkSource("/oud/*")).toEqual({ ok: true, source: "/oud/*" });
  });

  it("laat een sterretje alleen als laatste stuk toe, en nooit voor de hele site", () => {
    expect(reason(checkSource("/*"))).toBe("home");
    expect(reason(checkSource("https://react2u.nl/*"))).toBe("home");
    expect(reason(checkSource("/o*d"))).toBe("sterretje");
    expect(reason(checkSource("/a*/*"))).toBe("sterretje");
    expect(checkSource("/oud/team/*")).toEqual({ ok: true, source: "/oud/team/*" });
  });

  it("vindt alle regels die een pad zouden afvangen", () => {
    expect(coveringSources("/a/b")).toEqual(["/a/b", "/a/b/*", "/a/*"]);
    expect(coveringSources("/Blog/Post/")).toEqual(["/blog/post", "/blog/post/*", "/blog/*"]);
  });

  it("maakt van een eigen URL een pad en eist https voor andere sites", () => {
    expect(checkDestination("https://react2u.nl/diensten/")).toEqual({ ok: true, destination: "/diensten" });
    expect(checkDestination("diensten")).toEqual({ ok: true, destination: "/diensten" });
    expect(reason(checkDestination("http://elders.nl"))).toBe("geen-https");
  });

  it("kiest exact boven wildcard, en de langste wildcard", () => {
    const rules = [rule("/oud/*", "/a"), rule("/oud/team/*", "/b"), rule("/oud/team/jan", "/c")];
    expect(matchRedirect("/oud/x", rules)?.destination).toBe("/a");
    expect(matchRedirect("/oud", rules)?.destination).toBe("/a");
    expect(matchRedirect("/oud/team/piet", rules)?.destination).toBe("/b");
    expect(matchRedirect("/Oud/Team/Jan/", rules)?.destination).toBe("/c");
    expect(matchRedirect("/ouder", rules)).toBeNull();
  });

  it("ziet lussen, ook een wildcard die naar zichzelf wijst", () => {
    const rules = [rule("/b", "/c"), rule("/c", "/a")];
    expect(createsLoop("/a", "/b", rules)).toBe(true);
    expect(createsLoop("/a", "/d", rules)).toBe(false);
    expect(createsLoop("/a", "https://elders.nl/a", rules)).toBe(false);
    expect(createsLoop("/x/*", "/x/y", [])).toBe(true);
  });

  it("kent de vaste lijst van de oude site", () => {
    expect(coveredByWordpress("/werkgever")).not.toBeNull();
    expect(coveredByWordpress("/team/jan")).not.toBeNull();
    expect(coveredByWordpress("/team")).not.toBeNull();
    expect(coveredByWordpress("/teams")).toBeNull();
    // De juridische documenten: webpagina's die een PDF zijn geworden.
    expect(coveredByWordpress("/privacyverklaring")?.destination).toBe("/documenten/privacyverklaring-react2u.pdf");
    expect(coveredByWordpress("/Cookieverklaring/")?.destination).toBe("/documenten/cookieverklaring-react2u.pdf");
  });

  it("stelt een bestemming voor, of niets als het een gok zou zijn", () => {
    const c = [
      { path: "/verzuimbegeleiding-wvp", label: "Verzuimbegeleiding WVP" },
      { path: "/contact", label: "Contact" },
      { path: "/diensten", label: "Diensten" },
    ];
    expect(suggestDestination("/verzuimbegeleiding", c)?.path).toBe("/verzuimbegeleiding-wvp");
    expect(suggestDestination("/contact-opnemen", c)?.path).toBe("/contact");
    expect(suggestDestination("/wp-login", c)).toBeNull();
  });

  it("neemt de querystring mee als de bestemming er geen heeft", () => {
    expect(targetUrl("/diensten", new URL("https://react2u.nl/oud?utm_source=mail")).toString())
      .toBe("https://react2u.nl/diensten?utm_source=mail");
    expect(targetUrl("/d?x=1", new URL("https://react2u.nl/oud?y=2")).search).toBe("?x=1");
  });

  it("onthoudt bij een interne link het pad, bij een externe de host", () => {
    expect(missingReferrer("https://react2u.nl/diensten", "react2u.nl")).toBe("/diensten");
    expect(missingReferrer("https://www.google.com/search?q=x", "react2u.nl")).toBe("google.com");
    expect(missingReferrer("onzin", "react2u.nl")).toBeNull();
  });
});

describe("de oude dienstpagina's", () => {
  it("sturen elk met een eigen regel naar hun label", () => {
    expect(Object.fromEntries(DIENST_REDIRECTS.map((r) => [r.source, r.destination]))).toEqual({
      "/verzuimbegeleiding-wvp": "/recover",
      "/verzuimbegeleiding-erd-zw": "/reflex",
      "/preventie-en-vitaliteit": "/resist",
      "/risicomanagement": "/resist",
      "/trainingen-en-workshops": "/resist",
      "/begeleiding-en-coaching": "/restart",
    });
    for (const r of DIENST_REDIRECTS) {
      expect(labelVoor(r.destination), r.destination).not.toBeNull();
      expect(coveredByWordpress(r.source)).toEqual(r);
    }
  });

  it("de labels en /diensten zelf sturen nergens heen", () => {
    for (const p of ["/diensten", ...LABELS.map((l) => l.href)]) expect(coveredByWordpress(p), p).toBeNull();
  });

  it("geen vaste regel wijst naar een adres dat zelf weer doorstuurt", () => {
    for (const r of VASTE_REDIRECTS) {
      if (/^https?:\/\//.test(r.destination)) continue;
      expect(coveredByWordpress(r.destination), `${r.source} → ${r.destination}`).toBeNull();
    }
  });

  it("geen interne link in de concepten wijst naar een doorverwijzing", () => {
    const bestanden = (map: string): string[] =>
      readdirSync(map, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? bestanden(join(map, e.name)) : e.name.endsWith(".json") ? [join(map, e.name)] : []);
    const hrefs = (x: unknown): string[] =>
      Array.isArray(x) ? x.flatMap(hrefs)
        : x && typeof x === "object" ? Object.entries(x).flatMap(([k, v]) => (k === "href" && typeof v === "string" ? [v] : hrefs(v)))
          : [];
    for (const f of bestanden(join(__dirname, "../content"))) {
      for (const h of hrefs(JSON.parse(readFileSync(f, "utf8")))) {
        if (!h.startsWith("/") || h.startsWith("//")) continue;
        expect(coveredByWordpress(h.split(/[?#]/)[0]), `${f}: ${h}`).toBeNull();
      }
    }
  });
});
