import { describe, expect, it } from "vitest";
import { buildUsage, fileSize, mediaPaths } from "./mediaUsage";

const BASE = "https://x.supabase.co/storage/v1/object/public/media/";

describe("mediagebruik", () => {
  it("vindt media-paden in JSON, markdown en HTML", () => {
    const text = JSON.stringify({ image: `${BASE}uploads/1-logo.png`, body: `Zie ![foto](${BASE}wp/2023/a%20b.jpg) en <img src="${BASE}uploads/2-x.webp?v=2">` });
    expect(mediaPaths(text).sort()).toEqual(["uploads/1-logo.png", "uploads/2-x.webp", "wp/2023/a b.jpg"]);
  });

  it("negeert andere URL's", () => {
    expect(mediaPaths("https://elders.nl/media/uploads/x.png /storage/v1/object/public/cvs/cv.pdf")).toEqual([]);
  });

  it("telt per bestand de plekken, zonder dubbelen", () => {
    const usage = buildUsage([
      { label: "Home — Hero", href: "/admin/paginas/home/blok/1", text: `${BASE}uploads/a.png ${BASE}uploads/a.png` },
      { label: "Footer", href: "/admin/instellingen", text: `${BASE}uploads/a.png` },
      { label: "Leeg", href: "/x", text: "geen media" },
    ]);
    expect(usage["uploads/a.png"].map((u) => u.label)).toEqual(["Home — Hero", "Footer"]);
    expect(Object.keys(usage)).toEqual(["uploads/a.png"]);
  });

  it("schrijft bestandsgroottes leesbaar", () => {
    expect(fileSize(512)).toBe("512 B");
    expect(fileSize(240 * 1024)).toBe("240 KB");
    expect(fileSize(1.4 * 1024 * 1024)).toBe("1,4 MB");
  });
});
