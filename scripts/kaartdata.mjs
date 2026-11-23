// Bouwt de kaart van Nederland voor het CM-overleg (src/lib/kaart/*.json) uit
// open data van het CBS via PDOK: de gemeentegrenzen (gegeneraliseerd) en de
// postcodegebieden van vier cijfers. Alles in Rijksdriehoekscoördinaten
// (EPSG:28992): dat is al een platte kaart in meters, dus geen projectie nodig.
//
// Er gaat niets van React2u naar buiten: dit script haalt alleen openbare
// kaarten op. De uitkomst staat in de repo; draai het opnieuw na een
// gemeentelijke herindeling:
//
//   node scripts/kaartdata.mjs <map-met-downloads>
//
// waarin de map gemeenten.json en pc4_0.json … pc4_4000.json bevat:
//   gemeenten: https://service.pdok.nl/cbs/gebiedsindelingen/2026/wfs/v1_0?request=GetFeature&service=WFS&version=2.0.0&typeNames=gebiedsindelingen:gemeente_gegeneraliseerd&outputFormat=application/json&srsName=EPSG:28992
//   postcodes: https://service.pdok.nl/cbs/postcode4/2024/wfs/v1_0?request=GetFeature&service=WFS&version=2.0.0&typeNames=postcode4&outputFormat=application/json&srsName=EPSG:28992&count=1000&sortBy=postcode&startIndex=0 (en 1000, 2000, 3000, 4000)
import fs from "node:fs";
import path from "node:path";

const BRON = process.argv[2];
if (!BRON) throw new Error("Geef de map met de downloads mee.");
const UIT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "src", "lib", "kaart");
fs.mkdirSync(UIT, { recursive: true });

const lees = (f) => JSON.parse(fs.readFileSync(path.join(BRON, f), "utf8"));
const gemeenten = lees("gemeenten.json").features;
const pc4 = fs.readdirSync(BRON).filter((f) => /^pc4_\d+\.json$/.test(f)).flatMap((f) => lees(f).features);

// Eenheid op de kaart: 100 meter. Hele getallen houden het bestand klein.
const EENHEID = 100;
const alleRingen = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates).flat();
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (const f of gemeenten) for (const ring of alleRingen(f.geometry)) for (const [x, y] of ring) {
  minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
}
const RAND = 20; // 2 km lucht rondom
const kx = (x) => Math.round((x - minX) / EENHEID) + RAND;
const ky = (y) => Math.round((maxY - y) / EENHEID) + RAND;
const breedte = Math.round((maxX - minX) / EENHEID) + 2 * RAND;
const hoogte = Math.round((maxY - minY) / EENHEID) + 2 * RAND;

/** Douglas-Peucker op een ring in kaarteenheden. */
function vereenvoudig(punten, tol) {
  if (punten.length < 4) return punten;
  const houd = new Uint8Array(punten.length);
  houd[0] = houd[punten.length - 1] = 1;
  const stapel = [[0, punten.length - 1]];
  while (stapel.length) {
    const [a, b] = stapel.pop();
    const [ax, ay] = punten[a], [bx, by] = punten[b];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let max = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = punten[i];
      let d;
      if (!l2) d = (px - ax) ** 2 + (py - ay) ** 2;
      else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
        d = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2;
      }
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol * tol) { houd[idx] = 1; stapel.push([a, idx], [idx, b]); }
  }
  return punten.filter((_, i) => houd[i]);
}

/** Oppervlak en zwaartepunt van een ring (in RD-meters). */
function ringZwaartepunt(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x0, y0] = ring[j], [x1, y1] = ring[i];
    const f = x0 * y1 - x1 * y0;
    a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
  }
  a /= 2;
  return a ? { a: Math.abs(a), x: cx / (6 * a), y: cy / (6 * a) } : { a: 0, x: ring[0][0], y: ring[0][1] };
}

function binnen([x, y], ring) {
  let in_ = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) in_ = !in_;
  }
  return in_;
}
const polygonen = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
const inGeometrie = (p, g) => polygonen(g).some((poly) => binnen(p, poly[0]) && !poly.slice(1).some((gat) => binnen(p, gat)));

/** Een punt dat in de vorm ligt: het zwaartepunt van het grootste vlak, of anders een punt op een horizontale lijn erdoor. */
function puntIn(g) {
  const groot = polygonen(g).map((poly) => ({ poly, ...ringZwaartepunt(poly[0]) })).sort((p, q) => q.a - p.a)[0];
  if (inGeometrie([groot.x, groot.y], g)) return [groot.x, groot.y];
  const ring = groot.poly[0];
  const y = groot.y;
  const snijpunten = [];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y)) snijpunten.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
  }
  snijpunten.sort((p, q) => p - q);
  return snijpunten.length >= 2 ? [(snijpunten[0] + snijpunten[1]) / 2, y] : [groot.x, groot.y];
}

const TOL = 3; // 300 meter: genoeg voor een kaart van een paar honderd pixels breed
const uitGemeenten = gemeenten
  .map((f) => {
    const d = polygonen(f.geometry)
      .map((poly) => poly.map((ring) => vereenvoudig(ring.map(([x, y]) => [kx(x), ky(y)]), TOL)).filter((r) => r.length >= 4))
      .filter((poly) => poly.length)
      .map((poly) => poly.map((r) => `M${r.slice(0, -1).map(([x, y]) => `${x} ${y}`).join("L")}Z`).join(""))
      .join("");
    const [px, py] = puntIn(f.geometry);
    return { code: f.properties.statcode, naam: f.properties.statnaam, d, x: kx(px), y: ky(py), geo: f.geometry };
  })
  .sort((a, b) => a.naam.localeCompare(b.naam, "nl"));

// Per postcode: een punt erin en de gemeente waar dat punt in ligt.
const bboxen = uitGemeenten.map((g) => {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const ring of alleRingen(g.geo)) for (const [x, y] of ring) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return [x0, x1, y0, y1];
});
const postcodes = {};
let zonder = 0;
for (const f of pc4) {
  if (!f.geometry) continue;
  const p = puntIn(f.geometry);
  let gi = uitGemeenten.findIndex((g, i) => p[0] >= bboxen[i][0] && p[0] <= bboxen[i][1] && p[1] >= bboxen[i][2] && p[1] <= bboxen[i][3] && inGeometrie(p, g.geo));
  if (gi < 0) {
    // Net buiten een gegeneraliseerde grens (kust, water): de dichtstbijzijnde gemeente.
    zonder++;
    let best = Infinity;
    uitGemeenten.forEach((g, i) => { const d = (g.x - kx(p[0])) ** 2 + (g.y - ky(p[1])) ** 2; if (d < best) { best = d; gi = i; } });
  }
  postcodes[String(f.properties.postcode).padStart(4, "0")] = [kx(p[0]), ky(p[1]), gi];
}

fs.writeFileSync(
  path.join(UIT, "nederland.json"),
  JSON.stringify({ breedte, hoogte, gemeenten: uitGemeenten.map(({ code, naam, d, x, y }) => ({ code, naam, d, x, y })) }),
);
fs.writeFileSync(path.join(UIT, "postcodes.json"), JSON.stringify(postcodes));
console.log(`${uitGemeenten.length} gemeenten, ${Object.keys(postcodes).length} postcodes (${zonder} naar de dichtstbijzijnde gemeente), kaart ${breedte}×${hoogte}`);
for (const f of ["nederland.json", "postcodes.json"]) console.log(f, `${Math.round(fs.statSync(path.join(UIT, f)).size / 1024)} kB`);
