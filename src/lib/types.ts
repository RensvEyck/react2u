export type Page = {
  id: string;
  slug: string;
  title: string;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
  published: boolean;
  sort: number;
  updated_at: string;
};

export type Block = {
  id: string;
  page_id: string;
  type: string;
  label: string | null;
  sort: number;
  data: Record<string, unknown>;
  updated_at: string;
};

/** De vaste secties van een vacature, als mini-markdown. */
export type VacatureOpbouw = {
  /** Wat ga je doen */
  doen: string;
  /** Met wie werk je samen: team, disciplines, aanspreekpunten */
  samen: string;
  /** Wat is echt leuk aan deze baan */
  leuk: string;
  /** Wat wij vragen (eisen, met eventueel "Mooi meegenomen") */
  vragen: string;
  /** Wat wij bieden: aanvullingen op het vaste pakket, of bij ZZP het hele aanbod */
  bieden: string;
  /** Eerlijk is eerlijk: wat minder leuk is aan de rol */
  eerlijk: string;
  /** Veelgestelde vragen: blokken "**Vraag?**" + antwoord, gescheiden door een lege regel */
  faq: string;
};

export type Vacancy = {
  id: string;
  slug: string;
  title: string;
  location: string;
  employment_type: string;
  hours: string | null;
  salary: string | null;
  intro: string | null;
  description_md: string | null;
  /** Engelse versie van titel, intro en tekst (migratie 0015); leeg = de Engelse site toont de Nederlandse tekst. */
  title_en?: string | null;
  intro_en?: string | null;
  description_en_md?: string | null;
  /** Kenmerken voor "In het kort" (migratie 0017); leeg = niet tonen. */
  vakgebied?: string | null;
  ervaringsniveau?: string | null;
  opleidingsniveau?: string | null;
  contractvorm?: string | null;
  /** Secties per taal (migratie 0017), zie lib/vacatures.ts `opbouwInTaal`. */
  opbouw?: Partial<Record<"nl" | "en", Partial<VacatureOpbouw>>> | null;
  status: "draft" | "published" | "closed";
  published_at: string | null;
  valid_through: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_md: string | null;
  cover_image: string | null;
  author: string | null;
  status: "draft" | "published";
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
  created_at: string;
  updated_at: string;
};

export type PageView = {
  id: string;
  path: string;
  referrer_host: string | null;
  country: string | null;
  company: string | null;
  /** Domein van het bedrijf, als dat bekend is (migratie 0010). */
  company_domain?: string | null;
  /** Waar de herkenning vandaan komt: netwerkeigenaar of reverse DNS. */
  company_source?: "asn" | "rdns" | null;
  is_company: boolean;
  visitor_hash: string;
  created_at: string;
};

export type LeadStatus =
  | "te_bellen"
  | "gebeld"
  | "niet_bereikt"
  | "terugbellen"
  | "klant"
  | "geen_interesse";

export type Lead = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  status: LeadStatus;
  notes: string | null;
  follow_up_on: string | null;
  last_called_at: string | null;
  source: string | null;
  /** Id van het bericht of de sollicitatie waar deze lead uit komt; null bij handmatig toegevoegd. */
  source_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Application = {
  id: string;
  vacancy_id: string | null;
  vacancy_title: string | null;
  name: string;
  email: string;
  phone: string | null;
  motivation: string | null;
  cv_path: string | null;
  status: "nieuw" | "gebeld" | "gesprek" | "aanbod" | "aangenomen" | "afgewezen" | "in_behandeling";
  /** Waar de kandidaat vandaan kwam: aanbrenger, campagne of verwijzer (migratie 0018). */
  bron?: string | null;
  linkedin?: string | null;
  aangemeld_via?: "linkedin" | "google" | "apple" | null;
  foto?: string | null;
  cv_samenvatting?: import("./cvSamenvatting").CvSamenvatting | null;
  /** Interne notitie (migratie 0018). */
  notitie?: string | null;
  /** Laatste statuswijziging (migratie 0018). */
  status_at?: string | null;
  /** De sollicitant gaf toestemming om een jaar te bewaren (migratie 0013). */
  retain_longer?: boolean | null;
  /** Via welke taal van de site de sollicitatie binnenkwam (migratie 0015); ontbreekt bij oudere rijen. */
  lang?: "nl" | "en";
  created_at: string;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  /** Null bij berichten van vóór migratie 0005; het formulier vraagt er nu om. */
  phone: string | null;
  subject: string | null;
  message: string;
  read: boolean;
  /** Via welke taal van de site het bericht binnenkwam (migratie 0015); ontbreekt bij oudere rijen. */
  lang?: "nl" | "en";
  /** Code uit de aanmeldlink van een partner (migratie 0022). */
  partner_code?: string | null;
  /** De actieve partner bij die code, door de database gekoppeld (migratie 0022). */
  partner_id?: string | null;
  /** Kantoor en code van die partner, als het Postvak IN hem meeleest. */
  partner?: { kantoor: string; code: string } | null;
  created_at: string;
};

/** Een partner in het partnerprogramma (migratie 0022). */
export type Partner = {
  id: string;
  code: string;
  kantoor: string;
  naam: string | null;
  email: string | null;
  telefoon: string | null;
  model: "aanbreng" | "reseller";
  pct_jaar_een: number;
  pct_vervolg: number;
  actief: boolean;
  notitie: string | null;
  created_at: string;
};

/** Een werkgever die via een partner klant werd (migratie 0022). */
export type PartnerKlant = {
  id: string;
  partner_id: string;
  bedrijf: string;
  medewerkers: number;
  tarief: number;
  start: string;
  eind: string | null;
  bericht_id: string | null;
  notitie: string | null;
  created_at: string;
};
