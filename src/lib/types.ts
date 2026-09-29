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
  status: "nieuw" | "in_behandeling" | "afgewezen" | "aangenomen";
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
  created_at: string;
};
