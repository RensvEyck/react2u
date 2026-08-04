import type { MetadataRoute } from "next";
import { getPublishedPages, getPublishedVacancies } from "@/lib/content";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl";
  const [pages, vacancies] = await Promise.all([getPublishedPages(), getPublishedVacancies()]);
  return [
    { url: base, lastModified: new Date(), priority: 1 },
    ...pages
      .filter((p) => p.slug !== "home")
      .map((p) => ({ url: `${base}/${p.slug}`, lastModified: new Date(p.updated_at), priority: 0.8 })),
    { url: `${base}/vacatures`, lastModified: new Date(), priority: 0.7 },
    ...vacancies.map((v) => ({
      url: `${base}/vacatures/${v.slug}`,
      lastModified: new Date(v.updated_at),
      priority: 0.7,
    })),
  ];
}
