import { supabasePublic } from "./supabase/public";
import type { Block, Page, Post, Vacancy } from "./types";

export async function getPage(slug: string): Promise<{ page: Page; blocks: Block[] } | null> {
  const sb = supabasePublic();
  const { data: page } = await sb.from("pages").select("*").eq("slug", slug).eq("published", true).maybeSingle();
  if (!page) return null;
  const { data: blocks } = await sb.from("blocks").select("*").eq("page_id", page.id).order("sort");
  return { page, blocks: (blocks as Block[]) || [] };
}

export async function getPublishedPages(): Promise<Page[]> {
  const sb = supabasePublic();
  const { data } = await sb.from("pages").select("*").eq("published", true).order("sort");
  return (data as Page[]) || [];
}

export async function getSetting<T = Record<string, unknown>>(key: string): Promise<T | null> {
  const sb = supabasePublic();
  const { data } = await sb.from("site_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T) ?? null;
}

export async function getPublishedVacancies(): Promise<Vacancy[]> {
  const sb = supabasePublic();
  const { data } = await sb
    .from("vacancies")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return (data as Vacancy[]) || [];
}

export async function getVacancy(slug: string): Promise<Vacancy | null> {
  const sb = supabasePublic();
  const { data } = await sb.from("vacancies").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  return (data as Vacancy) || null;
}

export async function getPublishedPosts(): Promise<Post[]> {
  const sb = supabasePublic();
  const { data } = await sb
    .from("posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return (data as Post[]) || [];
}

export async function getPost(slug: string): Promise<Post | null> {
  const sb = supabasePublic();
  const { data } = await sb.from("posts").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  return (data as Post) || null;
}

export const CONTACT_FALLBACK = {
  phone: "0856205800",
  phoneDisplay: "085 - 620 58 00",
  email: "info@react2u.nl",
  addressLine1: "Stratumsedijk 29",
  addressLine2: "5611 NB Eindhoven",
  kvk: "95076824",
  btw: "NL866991906B01",
  iban: "NL67INGB0107832259",
};
export type ContactInfo = typeof CONTACT_FALLBACK;
