/**
 * Losse klanten en opdrachten (migratie 0036): wat buiten de offertemodule om
 * is afgesproken. Een bestaande klant met een abonnement (bedrag per maand,
 * sinds een datum) of een losse opdracht (een totaalbedrag op een datum).
 *
 * Het salesdashboard en de omzet rekenen ermee alsof het een getekende offerte
 * is met één regel (`alsOfferte`): dan gelden dezelfde regels voor maanden,
 * labels, klanten en beëindigen, zonder uitzonderingen in lib/verkoop.ts en
 * lib/omzet.ts. Zo'n "offerte" heeft geen `verstuurd_at`: in de hitrate, de
 * doorlooptijd, de trechter en de pijplijn telt hij daarom niet mee, wel in
 * wat er getekend is en wat het opbrengt.
 *
 * Puur, zonder database.
 */

import { DIENSTLABEL, isVorm, VORMEN, type Regel, type Vorm } from "./offertes";
import type { GetekendeOfferte, Gestopt } from "./omzet";
import type { VerkoopOfferte } from "./verkoop";

export type LosSoort = "abonnement" | "eenmalig";

export type LosseOpdracht = {
  id: string;
  soort: LosSoort;
  bedrijf: string;
  omschrijving: string | null;
  /** Een offertevorm voor het label, of leeg: "Overig". */
  vorm: string | null;
  /** Per maand bij een abonnement, het totaal bij een opdracht. */
  bedrag: number;
  /** Sinds (abonnement) of de datum van de opdracht, jjjj-mm-dd. */
  datum: string;
  /** De eerste maand zonder omzet (jjjj-mm-01), alleen bij een abonnement. */
  stop: string | null;
  verkoper: string | null;
  contactpersoon: string | null;
  email: string | null;
  notitie: string | null;
  created_at: string;
  updated_at: string;
};

export const SOORT_LOS: Record<LosSoort, { label: string; bedrag: string }> = {
  abonnement: { label: "Klant met abonnement", bedrag: "Bedrag per maand" },
  eenmalig: { label: "Losse opdracht", bedrag: "Totaalbedrag" },
};

/** Het label en de kleur: die van de dienst, of "Overig" in grijs. */
export function losLabel(vorm: string | null | undefined): { label: string; kleur: string; kort: string } {
  if (isVorm(vorm)) return { label: DIENSTLABEL[vorm], kleur: VORMEN[vorm].kleur, kort: VORMEN[vorm].kort };
  return { label: "Overig", kleur: "#6b6a85", kort: "Overig" };
}

export type LosAlsOfferte = VerkoopOfferte & GetekendeOfferte & { bron: "los" };

/** Als getekende offerte met één regel; `vorm` is "overig" als er geen dienst bij hoort. */
export function alsOfferte(l: LosseOpdracht): LosAlsOfferte {
  const { label, kleur } = losLabel(l.vorm);
  const regel: Regel = {
    id: "los",
    sectie: l.soort === "abonnement" ? "Abonnement" : "Opdracht",
    label,
    kleur,
    naam: l.omschrijving || SOORT_LOS[l.soort].label,
    prijs: Number(l.bedrag),
    eenheid: l.soort === "abonnement" ? "maand" : "eenmalig",
    soort: "vast",
  };
  // 12:00 UTC valt in Nederland altijd op dezelfde datum.
  const moment = `${l.datum}T12:00:00Z`;
  return {
    bron: "los",
    id: l.id,
    nummer: "Los",
    status: "getekend",
    vorm: (isVorm(l.vorm) ? l.vorm : "overig") as Vorm,
    bedrijf: l.bedrijf,
    contactpersoon: l.contactpersoon,
    email: l.email,
    telefoon: null,
    medewerkers: null,
    regels: [regel],
    keuze: ["los"],
    keuze_at: null,
    geldig_tot: null,
    created_at: moment,
    verstuurd_at: null,
    bekeken_at: null,
    laatst_bekeken_at: null,
    aantal_bekeken: 0,
    getekend_at: moment,
    afzender_naam: l.verkoper,
    afgewezen_at: null,
  };
}

/** Voor de omzet: een gestopt abonnement zoals in abonnementen_gestopt. */
export function gestoptVan(l: Pick<LosseOpdracht, "id" | "soort" | "stop">): Gestopt | null {
  return l.soort === "abonnement" && l.stop ? { offerte_id: l.id, vanaf: l.stop } : null;
}

/* ---------- invoer ---------- */

/** "1.250,50", "1250.5", "€ 450" of "450" naar een bedrag in euro's, of null. */
export function leesBedrag(invoer: string | null | undefined): number | null {
  let t = (invoer || "").replace(/[€\s]/g, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const n = Number(t);
  return n <= 10_000_000 ? n : null;
}

export type LosInvoer = Omit<LosseOpdracht, "id" | "created_at" | "updated_at">;

/**
 * Een formulier naar een rij, of de foutcode voor de melding. `stop` komt als
 * maand (jjjj-mm) binnen: de eerste maand zonder omzet.
 */
export function leesLos(v: (naam: string) => string): { ok: true; rij: LosInvoer } | { ok: false; fout: string } {
  const soort: LosSoort = v("soort") === "eenmalig" ? "eenmalig" : "abonnement";
  const bedrijf = v("bedrijf").trim();
  if (!bedrijf) return { ok: false, fout: "los-bedrijf" };
  const bedrag = leesBedrag(v("bedrag"));
  if (bedrag === null || bedrag <= 0) return { ok: false, fout: "los-bedrag" };
  const datum = v("datum").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum) || Number.isNaN(Date.parse(datum))) return { ok: false, fout: "los-datum" };
  const stopMaand = v("stop").trim();
  const stop = soort === "abonnement" && /^\d{4}-\d{2}$/.test(stopMaand) ? `${stopMaand}-01` : null;
  if (stop && stop <= datum) return { ok: false, fout: "los-stop" };
  const tekst = (naam: string, max: number) => v(naam).trim().slice(0, max) || null;
  const email = tekst("email", 254);
  return {
    ok: true,
    rij: {
      soort, bedrijf: bedrijf.slice(0, 200), bedrag, datum, stop,
      omschrijving: tekst("omschrijving", 300),
      vorm: isVorm(v("vorm")) ? v("vorm") : null,
      verkoper: tekst("verkoper", 120),
      contactpersoon: tekst("contactpersoon", 200),
      email: email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null,
      notitie: tekst("notitie", 2000),
    },
  };
}
