import { describe, expect, it } from "vitest";
import { LABELS, crumbsVoor, doelgroepVoorPad } from "./nav";

describe("doelgroepVoorPad", () => {
  it("kent de werknemerspagina's", () => {
    expect(doelgroepVoorPad("/werknemers")).toBe("werknemer");
    expect(doelgroepVoorPad("/werknemers#veelgestelde-vragen")).toBe("werknemer");
    expect(doelgroepVoorPad("/verzuimprotocol")).toBe("werknemer");
    expect(doelgroepVoorPad("/je-casemanager")).toBe("werknemer");
    expect(doelgroepVoorPad("/en/employees")).toBe("werknemer");
  });

  it("kent de werkgeverspagina's, ook abonnementen, kennismaken en het werkgebied", () => {
    expect(doelgroepVoorPad("/werkgevers")).toBe("werkgever");
    expect(doelgroepVoorPad("/diensten")).toBe("werkgever");
    expect(doelgroepVoorPad("/verzuimabonnementen")).toBe("werkgever");
    expect(doelgroepVoorPad("/kennismaken")).toBe("werkgever");
    expect(doelgroepVoorPad("/arbodienst-eindhoven")).toBe("werkgever");
    expect(doelgroepVoorPad("/arbodienst-provincie-noord-brabant")).toBe("werkgever");
    expect(doelgroepVoorPad("/en/pricing")).toBe("werkgever");
    expect(doelgroepVoorPad("/en/lets-talk")).toBe("werkgever");
    for (const l of LABELS) expect(doelgroepVoorPad(l.href), l.href).toBe("werkgever");
  });

  it("laat gedeelde pagina's en het startscherm open", () => {
    for (const p of ["/", "/en", "/contact", "/blog", "/blog/een-artikel", "/over-react2u", "/vacatures", "/certificeringen", "/index"]) {
      expect(doelgroepVoorPad(p), p).toBeNull();
    }
  });
});

describe("crumbsVoor", () => {
  it("hangt een werkgeverspagina onder Werkgevers en een labelpagina onder Diensten", () => {
    expect(crumbsVoor("/verzuimabonnementen", "Verzuimabonnementen")).toEqual([
      { label: "Werkgevers", href: "/werkgevers" },
      { label: "Verzuimabonnementen", href: "/verzuimabonnementen" },
    ]);
    expect(crumbsVoor("/recover", "React2u Recover").map((c) => c.href)).toEqual(["/werkgevers", "/diensten", "/recover"]);
    expect(crumbsVoor("/contact", "Contact")).toEqual([{ label: "Contact", href: "/contact" }]);
  });
});
