/**
 * Klantdocumenten (Rens, 19 nov 2026: "maak de sidebar een stuk minder
 * uitgebreid, noem het bijvoorbeeld documenten, zet daar alle documenten
 * neer"): één ingang Documenten voor alles wat React2u naar een klant stuurt
 * om te lezen, te tekenen of in te vullen. Hier de soorten in de volgorde van
 * de klantreis en de regels voor de tellingen; de pagina is /admin/documenten.
 * Niet te verwarren met documenten.ts: de juridische pdf's van de site.
 */

export type DocSoort = "brochure" | "offerte" | "contract" | "onboarding" | "evaluatie";

/** De volgorde van de klantreis: kennismaken, voorstel, contract, inrichten, jaarlijks evalueren. */
export const DOC_VOLGORDE: DocSoort[] = ["brochure", "offerte", "contract", "onboarding", "evaluatie"];

export type DocSoortInfo = {
  /** Enkelvoud, voor een regel in een lijst. */
  label: string;
  /** Meervoud, voor de tegel en de link naar de lijst. */
  meervoud: string;
  lijst: string;
  nieuw: string;
  /** Detailpagina van één document. */
  detail: (id: string) => string;
  uitleg: string;
  /** Wat "klaar" bij deze soort heet. */
  klaar: string;
  kleur: string;
  achter: string;
};

export const DOC_SOORTEN: Record<DocSoort, DocSoortInfo> = {
  brochure: {
    label: "Brochure", meervoud: "Brochures", lijst: "/admin/brochures", nieuw: "/admin/brochures/nieuw",
    detail: (id) => `/admin/brochures/${id}`,
    uitleg: "Persoonlijke brochure voor een prospect, met de zes diensten en de prijslijst.",
    klaar: "Bekeken", kleur: "#0b6bcb", achter: "#e6f2ff",
  },
  offerte: {
    label: "Offerte", meervoud: "Offertes", lijst: "/admin/offertes", nieuw: "/admin/offertes/nieuw",
    detail: (id) => `/admin/offertes/${id}`,
    uitleg: "Voorstel dat de klant online leest en tekent, met certificaat en pdf.",
    klaar: "Getekend", kleur: "#e61674", achter: "#fdecf4",
  },
  contract: {
    label: "Contract", meervoud: "Contracten", lijst: "/admin/contracten", nieuw: "/admin/contracten/nieuw",
    detail: (id) => `/admin/contracten/${id}`,
    uitleg: "Het basiscontract arbodienstverlening met de checklist, online te tekenen.",
    klaar: "Getekend", kleur: "#312e82", achter: "#eef0ff",
  },
  onboarding: {
    label: "Onboarding", meervoud: "Onboarding", lijst: "/admin/onboarding", nieuw: "/admin/onboarding/nieuw",
    detail: (id) => `/admin/onboarding/${id}`,
    uitleg: "Welkom en inrichting van een nieuwe klant, met machtiging en verzuimprotocol.",
    klaar: "Klaar", kleur: "#b86e00", achter: "#fff4e5",
  },
  evaluatie: {
    label: "Klantevaluatie", meervoud: "Klantevaluaties", lijst: "/admin/documenten/evaluaties", nieuw: "/admin/documenten/evaluaties/nieuw",
    detail: (id) => `/admin/documenten/evaluaties/${id}`,
    uitleg: "De jaarlijkse evaluatie van arbo, verzuim en de dienstverlening, met afspraken.",
    klaar: "Ingevuld", kleur: "#0a7a4b", achter: "#e3f6ed",
  },
};

/** Eén document, uit welke tabel ook; alleen wat de tellingen en de lijst nodig hebben. */
export type DocRij = {
  soort: DocSoort;
  id: string;
  bedrijf: string;
  status: string;
  verstuurd_at: string | null;
  bekeken_at: string | null;
  created_at: string;
  /** Alleen offertes: na deze datum telt een verstuurde offerte als verlopen. */
  geldig_tot?: string | null;
};

/**
 * Waar een document staat, gezien vanaf React2u:
 * - concept: nog bij ons, moet nog weg;
 * - uit: bij de klant, wacht op lezen, tekenen of invullen;
 * - klaar: de klant deed wat moest (getekend, ingevuld, afgerond; een brochure: bekeken);
 * - weg: ingetrokken, afgewezen of verlopen.
 */
export type DocFase = "concept" | "uit" | "klaar" | "weg";

export function faseVan(r: DocRij, vandaag: string): DocFase {
  switch (r.status) {
    case "concept":
      return "concept";
    case "getekend":
    case "ingevuld":
    case "afgerond":
      return "klaar";
    case "verstuurd":
      if (r.soort === "brochure" && r.bekeken_at) return "klaar";
      if (r.soort === "offerte" && r.geldig_tot && r.geldig_tot < vandaag) return "weg";
      return "uit";
    default:
      return "weg";
  }
}

export type DocTelling = { concept: number; uit: number; klaar: number; alle: number };

export function tellingen(rijen: DocRij[], vandaag: string): Record<DocSoort, DocTelling> {
  const uit = Object.fromEntries(DOC_VOLGORDE.map((s) => [s, { concept: 0, uit: 0, klaar: 0, alle: 0 }])) as Record<DocSoort, DocTelling>;
  for (const r of rijen) {
    const t = uit[r.soort];
    t.alle++;
    const f = faseVan(r, vandaag);
    if (f !== "weg") t[f]++;
  }
  return uit;
}

export type UitRij = DocRij & { dagen: number; geopend: boolean };

/**
 * Wat bij klanten ligt, het langst wachtende bovenaan: daar moet je achteraan.
 * Dagen tellen vanaf het versturen (of het aanmaken, als dat ontbreekt).
 */
export function staatUit(rijen: DocRij[], nu: Date, vandaag: string): UitRij[] {
  return rijen
    .filter((r) => faseVan(r, vandaag) === "uit")
    .map((r) => {
      const sinds = r.verstuurd_at || r.created_at;
      return { ...r, dagen: Math.max(0, Math.floor((nu.getTime() - new Date(sinds).getTime()) / 86_400_000)), geopend: Boolean(r.bekeken_at) };
    })
    .sort((a, b) => b.dagen - a.dagen || a.bedrijf.localeCompare(b.bedrijf, "nl"));
}

/** "vandaag", "1 dag", "12 dagen". */
export function dagenTekst(n: number): string {
  return n === 0 ? "vandaag" : n === 1 ? "1 dag" : `${n} dagen`;
}
