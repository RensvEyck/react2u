/**
 * De ochtendmail (api/cron/klantenbord): elke werkdag één mail per collega
 * met het salesrecht: wat vandaag moet en te laat is (eerst wat van jou is),
 * wat klanten gisteren deden (een offerte bekeken, getekend, onderdelen
 * gekozen) en wat er volgens de modules opgevolgd moet worden. Puur: de cron
 * haalt de rijen op en mailt (lib/mail.ts); dit bepaalt de inhoud.
 *
 * Eigenaar is vrije tekst op de kaart ("Cindy", "Rens van Eyck"); van wie iets
 * is weten we door de eerste naam tegen het e-mailadres van de collega te
 * houden: "cindy" in cindy.faro@react2u.nl. Zonder match hoort het bij het
 * team, en dat staat in elke mail onder "Rest van het team".
 */

import { actieStand, dagenTussen, type Gesprek, type Klant } from "./klanten";
import type { Signaal } from "./opvolgen";

export type OchtendRegel = { bedrijf: string; tekst: string; sub: string | null; href: string };
export type OchtendDeel = { kop: string; regels: OchtendRegel[] };
export type Ochtendmail = { onderwerp: string; aanhef: string; delen: OchtendDeel[]; acties: number; teLaat: number };

export type OchtendInvoer = {
  klanten: Klant[];
  /** Systeemregels sinds gistermorgen waar de klant zelf iets deed (contact en door = klant, of getekend). */
  gisteren: Gesprek[];
  signalen: Signaal[];
  vandaag: string;
  /** Waar de links naartoe gaan, zonder slash aan het eind. */
  basis: string;
};

/** Van wie is deze kaart: de eerste naam van de eigenaar staat in het e-mailadres van de collega. */
export function isVanMij(eigenaar: string | null | undefined, email: string): boolean {
  const naam = (eigenaar || "").trim().toLowerCase().split(/\s+/)[0];
  if (naam.length < 3) return false;
  const lokaal = email.toLowerCase().split("@")[0];
  return lokaal.includes(naam) || naam.includes(lokaal);
}

const kortBedrijf = (b: string) => b.replace(/\s+(b\.?v\.?|n\.?v\.?|v\.?o\.?f\.?)\.?$/i, "");

/** "Offerte 2026-0012 bekeken" → "bekeek de offerte", voor in het onderwerp en de regel. */
export function watDeedDeKlant(tekst: string): string | null {
  const t = tekst.toLowerCase();
  if (/^offerte .* getekend/.test(t)) return "tekende de offerte";
  if (/^koos zelf onderdelen/.test(t)) return "koos onderdelen in de offerte";
  if (/^offerte .* bekeken$/.test(t)) return "bekeek de offerte";
  if (/^offerte .* afgewezen/.test(t)) return "wees de offerte af";
  if (/^vroeg een code aan/.test(t)) return "vroeg de code aan om te tekenen";
  if (/^brochure .* bekeken$/.test(t)) return "bekeek de brochure";
  if (/^contract .* getekend/.test(t)) return "tekende het contract";
  if (/^contract .* bekeken$/.test(t)) return "bekeek het contract";
  if (/^onboarding .* geopend$/.test(t)) return "opende de onboarding";
  if (/ ingevuld \(onboarding/.test(t)) return "vulde een document in";
  if (/^klant klaar met onboarding/.test(t)) return "leverde alles aan voor de onboarding";
  if (/ tekende de machtiging/.test(t)) return "liet een werknemer de machtiging tekenen";
  return null;
}

export function ochtendmail(i: OchtendInvoer, ontvanger: string): Ochtendmail | null {
  const kaart = (k: Klant) => `${i.basis}/admin/klantenbord#klant-${k.id}`;
  const actief = i.klanten.filter((k) => k.status !== "inactief");
  const regelVoor = (k: Klant): OchtendRegel | null => {
    const a = actieStand(k, i.vandaag);
    if (a === "te_laat") {
      const d = dagenTussen(k.volgende_actie_op!, i.vandaag);
      return { bedrijf: k.bedrijf, tekst: k.volgende_actie || "De volgende stap", sub: `${d} ${d === 1 ? "dag" : "dagen"} te laat${k.eigenaar ? ` · ${k.eigenaar}` : ""}`, href: kaart(k) };
    }
    if (a === "vandaag") return { bedrijf: k.bedrijf, tekst: k.volgende_actie || "De volgende stap", sub: `vandaag${k.eigenaar ? ` · ${k.eigenaar}` : ""}`, href: kaart(k) };
    return null;
  };
  const teDoen = actief.map((k) => ({ k, regel: regelVoor(k) })).filter((x): x is { k: Klant; regel: OchtendRegel } => Boolean(x.regel));
  const sorteer = (a: { k: Klant }, b: { k: Klant }) => (a.k.volgende_actie_op || "").localeCompare(b.k.volgende_actie_op || "");
  const mijn = teDoen.filter((x) => isVanMij(x.k.eigenaar, ontvanger)).sort(sorteer);
  const rest = teDoen.filter((x) => !isVanMij(x.k.eigenaar, ontvanger)).sort(sorteer);
  const teLaat = teDoen.filter((x) => actieStand(x.k, i.vandaag) === "te_laat").length;

  const perId = new Map(i.klanten.map((k) => [k.id, k]));
  const gisteren: OchtendRegel[] = [];
  for (const g of i.gisteren) {
    const k = perId.get(g.klant_id);
    const deed = watDeedDeKlant(g.tekst);
    if (!k || !deed) continue;
    gisteren.push({ bedrijf: k.bedrijf, tekst: `${kortBedrijf(k.bedrijf)} ${deed}`, sub: g.tekst, href: kaart(k) });
  }

  const opvolgen: OchtendRegel[] = i.signalen
    .filter((s) => s.toon === "warm" || s.toon === "let-op")
    .slice(0, 8)
    .map((s) => ({ bedrijf: s.bedrijf, tekst: `${s.label}: ${kortBedrijf(s.bedrijf)}`, sub: [...s.details, ...(s.termijn ? [s.termijn] : [])].join(" · ") || null, href: `${i.basis}${s.href}` }));

  const delen: OchtendDeel[] = [];
  if (mijn.length) delen.push({ kop: "Voor jou", regels: mijn.map((x) => x.regel) });
  if (gisteren.length) delen.push({ kop: "Gisteren bij klanten", regels: gisteren });
  if (opvolgen.length) delen.push({ kop: "Opvolgen volgens de modules", regels: opvolgen });
  if (rest.length) delen.push({ kop: mijn.length ? "Rest van het team" : "Het team", regels: rest.map((x) => x.regel) });
  if (!delen.length) return null;

  const acties = teDoen.length;
  const hoogtepunt = gisteren[0]?.tekst ?? null;
  const onderwerp = [
    `Vandaag ${acties} ${acties === 1 ? "actie" : "acties"}`,
    teLaat ? `${teLaat} te laat` : "",
    hoogtepunt ? `${hoogtepunt.toLowerCase().startsWith(hoogtepunt[0].toLowerCase()) ? hoogtepunt : hoogtepunt}` : "",
  ].filter(Boolean).join(", ");
  return { onderwerp, aanhef: `Goedemorgen,`, delen, acties, teLaat };
}
