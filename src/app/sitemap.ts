import type { MetadataRoute } from "next";
import { getPublishedPages, getPublishedVacancies, getPublishedPosts } from "@/lib/content";
import { alleConceptSlugsEn, reserveSlugs } from "@/lib/concept";
import { werkgebiedPaden } from "@/lib/gemeenten";
import { coveredByWordpress } from "@/lib/redirects";
import { OPEN_SOLLICITATIE, heeftVertaling, vertaalPad } from "@/lib/taal";

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

  /**
   * De hreflang-alternates van een Nederlands pad, als het ook in het Engels
   * bestaat (lib/taal.ts). Beide talen krijgen dezelfde set, met x-default op
   * Nederlands.
   */
  const alternates = (nlPath: string) => {
    if (!heeftVertaling(nlPath)) return {};
    const nl = `${base}${nlPath === "/" ? "" : nlPath}`;
    const en = `${base}${vertaalPad(nlPath, "en")}`;
    return { alternates: { languages: { nl, en, "x-default": nl } } };
  };
  /** De Engelse tegenhanger van een Nederlands pad, als die er is. */
  const engels = (nlPath: string, extra: Omit<MetadataRoute.Sitemap[number], "url">) =>
    heeftVertaling(nlPath) ? [{ url: `${base}${vertaalPad(nlPath, "en")}`, ...extra, ...alternates(nlPath) }] : [];

  // Reserve-inhoud staat alleen in een migratiefase aan (lib/concept.ts);
  // daarbuiten is dit leeg en bepaalt de publicatiestatus in de database de sitemap.
  const conceptSlugs = reserveSlugs()
    .filter((s) => !pages.some((p) => p.slug === s))
    .filter((s) => !coveredByWordpress(`/${s}`));
  // Engelse pagina's waarvan de Nederlandse tegenhanger noch in de database
  // noch als concept bestaat (hoort niet voor te komen, maar zo blijft de
  // Engelse pagina vindbaar).
  const losseEn = alleConceptSlugsEn()
    .map((en) => `/en/${en}`)
    .filter((enPath) => {
      const nl = vertaalPad(enPath, "nl").slice(1);
      return nl && !pages.some((p) => p.slug === nl) && !conceptSlugs.includes(nl);
    });

  return [
    { url: base, lastModified: newest(pages.map((p) => p.updated_at)), priority: 1, ...alternates("/") },
    ...engels("/", { priority: 0.9 }),
    ...pages
      .filter((p) => p.slug !== "home")
      // Een pagina met een vaste doorverwijzing (zoals de oude /privacyverklaring,
      // nu een PDF) is onbereikbaar en hoort niet in de sitemap.
      .filter((p) => !coveredByWordpress(`/${p.slug}`))
      .flatMap((p) => [
        { url: `${base}/${p.slug}`, lastModified: new Date(p.updated_at), priority: 0.8, ...alternates(`/${p.slug}`) },
        ...engels(`/${p.slug}`, { lastModified: new Date(p.updated_at), priority: 0.7 }),
      ]),
    // Pagina's die (nog) alleen als concept bestaan, zoals /kennismaken en /sitemap.
    ...conceptSlugs.flatMap((s) => [
      { url: `${base}/${s}`, priority: 0.7, ...alternates(`/${s}`) },
      ...engels(`/${s}`, { priority: 0.6 }),
    ]),
    ...losseEn.map((enPath) => ({ url: `${base}${enPath}`, priority: 0.6 })),
    // Werkgebied: een pagina per provincie en per gemeente. Alleen Nederlands.
    ...werkgebiedPaden().map((p) => ({ url: `${base}${p}`, priority: 0.5 })),
    // Zonder artikelen staat de blog op noindex (blog/page.tsx) en hoort hij
    // hier niet; met het eerste artikel komt hij vanzelf terug. Alleen Nederlands.
    ...(posts.length > 0
      ? [{ url: `${base}/blog`, lastModified: newest(posts.map((p) => p.updated_at)), priority: 0.7 }]
      : []),
    ...posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.updated_at),
      priority: 0.6,
    })),
    {
      url: `${base}/vacatures`,
      lastModified: newest(vacancies.map((v) => v.updated_at)),
      priority: 0.7,
      ...alternates("/vacatures"),
    },
    ...engels("/vacatures", { lastModified: newest(vacancies.map((v) => v.updated_at)), priority: 0.6 }),
    ...vacancies.flatMap((v) => [
      { url: `${base}/vacatures/${v.slug}`, lastModified: new Date(v.updated_at), priority: 0.7, ...alternates(`/vacatures/${v.slug}`) },
      ...engels(`/vacatures/${v.slug}`, { lastModified: new Date(v.updated_at), priority: 0.6 }),
    ]),
    { url: `${base}/vacatures/${OPEN_SOLLICITATIE.nl}`, priority: 0.5, ...alternates(`/vacatures/${OPEN_SOLLICITATIE.nl}`) },
    ...engels(`/vacatures/${OPEN_SOLLICITATIE.nl}`, { priority: 0.5 }),
  ];
}
