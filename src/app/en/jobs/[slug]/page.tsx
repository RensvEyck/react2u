import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedVacancies, getVacancy } from "@/lib/content";
import { jsonLd } from "@/lib/jsonld";
import { kort, paginaTitel } from "@/lib/seo";
import { hreflangVoor } from "@/lib/taal";
import { jobPostingLd, vacatureInTaal } from "@/lib/vacatures";
import { VacatureDetail } from "@/components/blocks/WerkenBij";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const vacancies = await getPublishedVacancies();
  return vacancies.map((v) => ({ slug: v.slug }));
}

/**
 * Een vacature op de Engelse site. Met Engelse velden (migratie 0015) in het
 * Engels; zonder in het Nederlands, met bovenaan "This vacancy is in Dutch".
 * De SEO-titel volgt de taal van de tekst, met "Vacancy" als label.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const v = await getVacancy(slug);
  if (!v) return {};
  const tekst = vacatureInTaal(v, "en");
  return {
    title: { absolute: paginaTitel(`${tekst.title} • Vacancy`) },
    description: kort(tekst.intro || v.seo_description),
    alternates: { canonical: `/en/jobs/${slug}`, languages: hreflangVoor(`/vacatures/${slug}`) ?? undefined },
  };
}

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = await getVacancy(slug);
  if (!v) notFound();
  const andere = (await getPublishedVacancies()).filter((x) => x.id !== v.id);
  return (
    <>
      <VacatureDetail v={v} andere={andere} taal="en" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(jobPostingLd(v, "en")) }} />
    </>
  );
}
