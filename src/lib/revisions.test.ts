import { describe, expect, it } from "vitest";
import {
  actorName, changedFields, collapseCascades, restorableFields, sentence, trash, versions,
  type Context, type Revision,
} from "./revisions";

const rev = (
  id: number, table_name: Revision["table_name"], row_id: string, action: Revision["action"],
  data: Record<string, unknown>, created_at: string, actor: string | null = "u1",
): Revision => ({ id, table_name, row_id, action, data, actor, actor_email: "rens@react2u.nl", created_at });

const ctx: Context = { pageTitles: new Map(), pageSlugs: new Map(), blockLabels: {} };

describe("versies", () => {
  it("geeft nieuwste eerst, markeert de live versie en noemt wat er veranderde", () => {
    const v = versions([
      rev(1, "pages", "p", "update", { title: "A", seo_title: null, updated_at: "x" }, "2026-09-01T00:00:00Z", null),
      rev(2, "pages", "p", "update", { title: "B", seo_title: null, updated_at: "y" }, "2026-09-02T00:00:00Z"),
      rev(3, "pages", "p", "update", { title: "B", seo_title: "S", updated_at: "z" }, "2026-09-03T00:00:00Z"),
      rev(4, "pages", "p", "delete", { title: "B" }, "2026-09-04T00:00:00Z"),
    ]);
    expect(v.map((x) => x.id)).toEqual([3, 2, 1]);
    expect(v.map((x) => x.current)).toEqual([true, false, false]);
    expect(v[0].changed).toEqual(["SEO-titel"]);
    expect(v[1].changed).toEqual(["titel"]);
  });

  it("negeert velden die bij elke opslag veranderen", () => {
    expect(changedFields({ title: "a", updated_at: 1, sort: 1 }, { title: "a", updated_at: 2, sort: 5 })).toEqual([]);
  });

  it("houdt een blok op zijn plek als het nog bestaat", () => {
    const data = { id: "b", sort: 3, data: {}, updated_at: "x" };
    expect(restorableFields("blocks", data, true)).toEqual({ id: "b", data: {} });
    expect(restorableFields("blocks", data, false)).toEqual({ id: "b", sort: 3, data: {} });
  });
});

describe("prullenbak", () => {
  it("toont alleen wat weg is, en vouwt blokken in hun pagina", () => {
    const at = "2026-09-10T10:00:00Z";
    const items = trash([
      rev(1, "pages", "p1", "delete", { title: "Weg" }, at),
      rev(2, "blocks", "b1", "delete", { page_id: "p1" }, at),
      rev(3, "blocks", "b2", "delete", { page_id: "p1" }, at),
      rev(4, "blocks", "b3", "delete", { page_id: "p2" }, "2026-09-11T10:00:00Z"),
      rev(5, "posts", "x", "delete", { title: "Al terug" }, "2026-09-09T10:00:00Z"),
      rev(6, "blocks", "b4", "delete", { page_id: "p1" }, "2026-09-08T10:00:00Z"),
    ], new Set(["posts:x"]));
    expect(items.map((i) => i.id)).toEqual([4, 1, 6]);
    expect(items.find((i) => i.id === 1)?.blocks).toBe(2);
  });
});

describe("wijzigingslog", () => {
  it("maakt van een verwijderde pagina met blokken één regel", () => {
    const at = "2026-09-10T10:00:00Z";
    const out = collapseCascades([
      rev(1, "pages", "p1", "delete", { title: "Weg" }, at),
      rev(2, "blocks", "b1", "delete", { page_id: "p1" }, at),
      rev(3, "blocks", "b2", "delete", { page_id: "p9" }, at),
    ]);
    expect(out.map((o) => o.id)).toEqual([1, 3]);
    expect(sentence(out[0], ctx)).toBe("verwijderde pagina ‘Weg’ met 1 blok");
  });

  it("beschrijft de onderhoudsmodus als aan of uit", () => {
    expect(sentence(rev(1, "site_settings", "maintenance", "update", { value: { enabled: true } }, "x"), ctx))
      .toBe("zette de onderhoudsmodus aan");
  });

  it("noemt de auteur bij naam, of jij", () => {
    expect(actorName(rev(1, "pages", "p", "update", {}, "x", "u1"), "u1")).toBe("Jij");
    expect(actorName(rev(1, "pages", "p", "update", {}, "x", "u2"), "u1")).toBe("Rens");
    expect(actorName(rev(1, "pages", "p", "update", {}, "x", null), "u1")).toBeNull();
  });
});
