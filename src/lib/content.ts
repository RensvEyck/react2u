import { supabasePublic } from "./supabase/public";
import type { Block, Page, Post, Vacancy } from "./types";

/**
 * De publieke inhoud uit de database. Eén regel voor alle helpers hier:
 * "bestaat niet" en "de database doet het niet" zijn twee verschillende
 * dingen. Het eerste geeft null of een lege lijst (en dus een 404 of een lege
 * sitemap); het tweede gooit een DatabaseFout. Een storing mag nooit op een
 * 404 of een lege sitemap lijken: Next houdt bij een fout tijdens de
 * revalidatie de laatst gelukte versie van de pagina in de cache, en een
 * verse aanvraag krijgt een 500, wat Google als tijdelijk ziet.
 */
export class DatabaseFout extends Error {
  constructor(wat: string, oorzaak: { message?: string; code?: string } | null) {
    super(`${wat}: ${oorzaak?.message ?? "onbekende fout"}${oorzaak?.code ? ` (${oorzaak.code})` : ""}`);
    this.name = "DatabaseFout";
  }
}

function gelukt<T>(res: { data: T; error: { message?: string; code?: string } | null }, wat: string): T {
  if (res.error) throw new DatabaseFout(wat, res.error);
  return res.data;
}

export async function getPage(slug: string): Promise<{ page: Page; blocks: Block[] } | null> {
  const sb = supabasePublic();
  const page = gelukt(
    await sb.from("pages").select("*").eq("slug", slug).eq("published", true).maybeSingle(),
    `pagina ${slug}`,
  ) as Page | null;
  if (!page) return null;
  const blocks = gelukt(await sb.from("blocks").select("*").eq("page_id", page.id).order("sort"), `blokken van ${slug}`);
  return { page, blocks: (blocks as Block[]) || [] };
}

/** Staat deze pagina gepubliceerd in de database? Lichter dan getPage(): geen blokken. */
export async function isGepubliceerd(slug: string): Promise<boolean> {
  const sb = supabasePublic();
  const rij = gelukt(
    await sb.from("pages").select("id").eq("slug", slug).eq("published", true).maybeSingle(),
    `pagina ${slug}`,
  );
  return rij !== null;
}

export async function getPublishedPages(): Promise<Page[]> {
  const sb = supabasePublic();
  const data = gelukt(await sb.from("pages").select("*").eq("published", true).order("sort"), "gepubliceerde pagina's");
  return (data as Page[]) || [];
}

export async function getSetting<T = Record<string, unknown>>(key: string): Promise<T | null> {
  const sb = supabasePublic();
  const data = gelukt(await sb.from("site_settings").select("value").eq("key", key).maybeSingle(), `instelling ${key}`);
  return (data?.value as T) ?? null;
}

export async function getPublishedVacancies(): Promise<Vacancy[]> {
  const sb = supabasePublic();
  const data = gelukt(
    await sb.from("vacancies").select("*").eq("status", "published").order("published_at", { ascending: false }),
    "gepubliceerde vacatures",
  );
  return (data as Vacancy[]) || [];
}

export async function getVacancy(slug: string): Promise<Vacancy | null> {
  const sb = supabasePublic();
  const data = gelukt(
    await sb.from("vacancies").select("*").eq("slug", slug).eq("status", "published").maybeSingle(),
    `vacature ${slug}`,
  );
  return (data as Vacancy) || null;
}

export async function getPublishedPosts(): Promise<Post[]> {
  const sb = supabasePublic();
  const data = gelukt(
    await sb.from("posts").select("*").eq("status", "published").order("published_at", { ascending: false }),
    "gepubliceerde artikelen",
  );
  return (data as Post[]) || [];
}

export async function getPost(slug: string): Promise<Post | null> {
  const sb = supabasePublic();
  const data = gelukt(
    await sb.from("posts").select("*").eq("slug", slug).eq("status", "published").maybeSingle(),
    `artikel ${slug}`,
  );
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
