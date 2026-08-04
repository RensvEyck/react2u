import type { MetadataRoute } from "next";
import { getPublishedPages, getPublishedVacancies, getPublishedPosts } from "@/lib/content";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl";
  const [pages, vacancies, posts] = await Promise.all([
    getPublishedPages(),
    getPublishedVacancies(),
    getPublishedPosts(),
  ]);

  // Overzichtspagina's zijn zo vers als hun nieuwste item. Altijd "nu" melden
  // is een leeg signaal: crawlers leren dan dat lastModified niets zegt.
  const newest = (dates: (string | null)[]) => {
    const valid = dates.filter(Boolean).map((d) => new Date(d as string));
    return valid.length ? new Date(Math.max(...valid.map((d) => +d))) : undefined;
  };

  return [
    { url: base, lastModified: newest(pages.map((p) => p.updated_at)), priority: 1 },
    ...pages
      .filter((p) => p.slug !== "home")
      .map((p) => ({ url: `${base}/${p.slug}`, lastModified: new Date(p.updated_at), priority: 0.8 })),
    {
      url: `${base}/blog`,
      lastModified: newest(posts.map((p) => p.updated_at)),
      priority: 0.7,
    },
    ...posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.updated_at),
      priority: 0.6,
    })),
    {
      url: `${base}/vacatures`,
      lastModified: newest(vacancies.map((v) => v.updated_at)),
      priority: 0.7,
    },
    ...vacancies.map((v) => ({
      url: `${base}/vacatures/${v.slug}`,
      lastModified: new Date(v.updated_at),
      priority: 0.7,
    })),
  ];
}
