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
  subject: string | null;
  message: string;
  read: boolean;
  created_at: string;
};
