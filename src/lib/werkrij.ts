/**
 * De werkrij voor vandaag (/admin/klantenbord/vandaag): wie bel ik nu, in
 * volgorde van warmte. Puur: de pagina haalt de kaarten, de opvolgsignalen
 * (lib/opvolgen.ts, dezelfde als het Verkoopblok) en het sitebezoek op; dit
 * voegt ze samen tot één rij per klant met de redenen en een gewicht.
 *
 * Volgorde: de signalen uit de modules eerst (warm boven let-op), dan wat te
 * laat is (het langst te laat eerst), dan wat vandaag moet, en wie op de site
 * was gaat omhoog. Inactieve kaarten doen niet mee.
 */

import { actieStand, bedrijfSleutel, dagenTussen, relatiefMoment, type Bezoek, type Klant } from "./klanten";
import type { Signaal } from "./opvolgen";

export type WerkToon = "warm" | "let-op" | "info";

export type WerkReden = {
  soort: "signaal" | "te_laat" | "vandaag" | "site";
  tekst: string;
  details: string | null;
  toon: WerkToon;
};

export type WerkRij = {
  klant: Klant;
  redenen: WerkReden[];
  gewicht: number;
  /** Het belangrijkste signaal uit de modules, voor de link naar het stuk. */
  signaal: Signaal | null;
};

const UUR = 3_600_000;

export function werkrij(klanten: Klant[], signalen: Signaal[], bezoek: Record<string, Bezoek>, vandaag: string, nu = new Date()): WerkRij[] {
  const perSleutel = new Map<string, Klant>();
  for (const k of klanten) {
    const s = k.sleutel || bedrijfSleutel(k.bedrijf);
    if (s && !perSleutel.has(s)) perSleutel.set(s, k);
  }
  const rijen = new Map<string, WerkRij>();
  const rij = (k: Klant): WerkRij => {
    let r = rijen.get(k.id);
    if (!r) {
      r = { klant: k, redenen: [], gewicht: 0, signaal: null };
      rijen.set(k.id, r);
    }
    return r;
  };

  for (const s of signalen) {
    const k = perSleutel.get(bedrijfSleutel(s.bedrijf));
    if (!k || k.status === "inactief") continue;
    const r = rij(k);
    if (!r.signaal) r.signaal = s;
    const toon: WerkToon = s.toon === "goed" ? "info" : s.toon;
    r.redenen.push({ soort: "signaal", tekst: s.label, details: [...s.details, ...(s.termijn ? [s.termijn] : [])].join(" · ") || null, toon });
    r.gewicht = Math.max(r.gewicht, 100 + s.gewicht + (s.toon === "warm" ? 50 : 0));
  }

  for (const k of klanten) {
    if (k.status === "inactief") continue;
    const a = actieStand(k, vandaag);
    if (a === "te_laat") {
      const d = dagenTussen(k.volgende_actie_op!, vandaag);
      const r = rij(k);
      r.redenen.push({ soort: "te_laat", tekst: `Te laat: ${k.volgende_actie || "de volgende stap"}`, details: `${d} ${d === 1 ? "dag" : "dagen"} te laat`, toon: "let-op" });
      r.gewicht = Math.max(r.gewicht, 60 + Math.min(d, 30));
    } else if (a === "vandaag") {
      const r = rij(k);
      r.redenen.push({ soort: "vandaag", tekst: `Vandaag: ${k.volgende_actie || "de volgende stap"}`, details: null, toon: "info" });
      r.gewicht = Math.max(r.gewicht, 50);
    }
    const b = bezoek[k.id];
    if (b && nu.getTime() - new Date(b.laatst).getTime() < 48 * UUR) {
      const r = rij(k);
      r.redenen.push({ soort: "site", tekst: `Op de site ${relatiefMoment(b.laatst, nu)}`, details: `${b.paginas} ${b.paginas === 1 ? "pagina" : "pagina's"} bekeken`, toon: "warm" });
      r.gewicht += 20;
    }
  }

  return [...rijen.values()]
    .filter((r) => r.redenen.length > 0)
    .sort((a, b) => b.gewicht - a.gewicht || a.klant.bedrijf.localeCompare(b.klant.bedrijf));
}

/** De dag erna, als 2026-11-18. */
export function morgen(vandaag: string): string {
  const d = new Date(`${vandaag}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
