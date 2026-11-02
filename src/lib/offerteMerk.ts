import { DIENSTLABEL, type Vorm } from "./offertes";

/*
 * De branding van een offerte komt van zijn label: elk traject krijgt de kleur,
 * tint, dienst en tagline van de dienstpagina van dat label (Rens, 2 nov 2026:
 * "het moet deze branding zijn per offerte traject", bij de dienstenkaarten op
 * /werkgevers). Recover roze, Resist teal, Restart oranje, Reflex blauw, Ready
 * indigo, Reward rood.
 *
 * De bron is het dienstLabel-blok van de labelpagina in het CMS
 * (offerteMerkVanSite in offerteHuisstijl.ts); dit zijn dezelfde gegevens als
 * terugval, zodat een offerte nooit zonder branding staat.
 */

export type Merk = {
  slug: string;
  /** "Recover" */
  naam: string;
  /** De labelkleur, voor vlakken, vinkjes en grote letters. */
  kleur: string;
  /** Dezelfde kleur, donker genoeg voor kleine letters op wit en op de tint (4,5:1). */
  tekst: string;
  /** De pasteltint van het label. */
  tint: string;
  /** "Verzuimbegeleiding." */
  dienst: string;
  /** "Van ziekmelding tot herstel" */
  tagline: string;
  punten: string[];
};

export const MERKEN: Record<string, Merk> = {
  recover: {
    slug: "recover", naam: "Recover", kleur: "#E61674", tekst: "#C2105E", tint: "#FDECF4",
    dienst: "Verzuimbegeleiding.", tagline: "Van ziekmelding tot herstel",
    punten: ["Casemanagement", "Bedrijfsarts en taakdelegatie", "Poortwachterdossier en UWV", "Online dossier en rapportages", "Verzuimadvies"],
  },
  resist: {
    slug: "resist", naam: "Resist", kleur: "#00A098", tekst: "#08716B", tint: "#E5F5F4",
    dienst: "Preventie en vitaliteit.", tagline: "Uitval voorkomen begint vóór de ziekmelding",
    punten: ["Risico-inventarisatie (RI&E)", "Preventief medisch onderzoek (PMO)", "Werkplekonderzoek", "Trainingen voor leidinggevenden", "Vertrouwenspersoon"],
  },
  restart: {
    slug: "restart", naam: "Restart", kleur: "#F19001", tekst: "#A35700", tint: "#FEF3E3",
    dienst: "Re-integratie en loopbaan.", tagline: "Samen weer vooruit",
    punten: ["Tweede spoor", "Loopbaanscan", "Coaching en burn-outbegeleiding", "Arbeidsdeskundig onderzoek", "Rouwverwerking"],
  },
  reflex: {
    slug: "reflex", naam: "Reflex", kleur: "#3AA5DD", tekst: "#1C6A93", tint: "#E9F5FC",
    dienst: "Voor de flexbranche.", tagline: "Ziektewet zonder zorgen",
    punten: ["Begeleiding zieke flexkrachten", "Eigenrisicodragerschap Ziektewet", "Ook na einde dienstverband", "Gericht op passend werk"],
  },
  ready: {
    slug: "ready", naam: "Ready", kleur: "#322E83", tekst: "#322E83", tint: "#ECEBF5",
    dienst: "HR en arbeidsrecht.", tagline: "Helder advies, snel geregeld",
    punten: ["HR-advies rond verzuim", "Arbeidsrechtelijke ondersteuning", "Advies bij conflicten", "Second opinion en deskundigenoordeel"],
  },
  reward: {
    slug: "reward", naam: "Reward", kleur: "#CA152A", tekst: "#B3121F", tint: "#FBEAEC",
    dienst: "Salaris en verloning.", tagline: "Loon dat klopt, ook bij ziekte",
    punten: ["Maand- of vierwekelijkse verloning", "Verloning van zieke medewerkers", "Extra runs en correcties", "Overgang Ziektewet en tweede ziektejaar"],
  },
};

/** De slug van de labelpagina bij een vorm: verzuimbegeleiding → "recover". */
export function merkSlug(vorm: Vorm): string {
  return DIENSTLABEL[vorm].replace(/^React2u\s+/i, "").toLowerCase();
}

export function merkVoorVorm(vorm: Vorm): Merk {
  return MERKEN[merkSlug(vorm)] || MERKEN.recover;
}

/**
 * De vaste gegevens aangevuld met wat het CMS over het label zegt (naam,
 * kleur, tint, dienst, tagline, punten). Alleen geldige waarden tellen; de
 * tekstkleur blijft de vaste, want die is op contrast gekozen.
 */
export function merkMet(basis: Merk, data: Record<string, unknown> | null | undefined): Merk {
  if (!data) return basis;
  const tekst = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const kleur = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim() : null);
  const punten = Array.isArray(data.checks) ? data.checks.filter((p): p is string => typeof p === "string" && p.trim() !== "") : [];
  return {
    ...basis,
    naam: tekst(data.naam) || basis.naam,
    kleur: kleur(data.kleur) || basis.kleur,
    tint: kleur(data.tint) || basis.tint,
    dienst: tekst(data.label) || basis.dienst,
    tagline: tekst(data.tagline) || basis.tagline,
    punten: punten.length ? punten : basis.punten,
  };
}
