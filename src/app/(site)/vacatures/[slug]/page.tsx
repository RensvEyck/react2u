import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedVacancies, getVacancy } from "@/lib/content";
import { MiniMarkdown } from "@/lib/md";
import { jsonLd } from "@/lib/jsonld";
import ApplicationForm from "@/components/site/ApplicationForm";
import { LuMapPin, LuClock, LuEuro } from "react-icons/lu";
import PageHeader from "@/components/site/PageHeader";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const vacancies = await getPublishedVacancies();
  return vacancies.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const v = await getVacancy(slug);
  if (!v) return {};
  return {
    title: v.seo_title || `${v.title} | Vacature`,
    description: v.seo_description || v.intro || undefined,
    alternates: { canonical: `/vacatures/${slug}` },
  };
}

export default async function VacancyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = await getVacancy(slug);
  if (!v) notFound();

  const jobLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: v.title,
    description: (v.description_md || v.intro || ""),
    datePosted: v.published_at || v.created_at,
    ...(v.valid_through ? { validThrough: v.valid_through } : {}),
    employmentType: v.employment_type,
    hiringOrganization: {
      "@type": "Organization",
      name: "React2u",
      sameAs: process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl",
      logo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/wp/2023/05/Logo-kleur.svg`,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Stratumsedijk 29",
        postalCode: "5611 NB",
        addressLocality: v.location || "Eindhoven",
        addressCountry: "NL",
      },
    },
    directApply: true,
  };

  return (
    <>
      <PageHeader crumbs={[{ label: "Werken bij React2u", href: "/vacatures" }, { label: v.title, href: `/vacatures/${v.slug}` }]}
        eyebrow="Vacature" title={v.title}>
        <div className="flex flex-wrap gap-2 text-[15px] font-medium text-primary">
          <span className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5"><LuMapPin aria-hidden /> {v.location}</span>
          {v.hours && <span className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5"><LuClock aria-hidden /> {v.hours}</span>}
          {v.salary && <span className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5"><LuEuro aria-hidden /> {v.salary}</span>}
        </div>
        {/* Op de telefoon staat het formulier ver onder de tekst: een sprong ernaartoe. */}
        <a href="#solliciteer" className="btn mt-7 lg:hidden">Solliciteer direct</a>
      </PageHeader>
      <section className="py-16 md:py-24">
        <div className="container-site grid gap-12 lg:grid-cols-[1fr_440px] lg:gap-16">
          <div>
            {v.intro && <p className="mb-8 text-[21px] leading-relaxed text-primary/85">{v.intro}</p>}
            <MiniMarkdown text={v.description_md || ""} className="text-[18px]" kop="h2" />
          </div>
          <div id="solliciteer" className="h-fit rounded-2xl bg-soft p-7 md:p-9 lg:sticky lg:top-[calc(var(--hh)+1.5rem)]">
            <h2 className="text-[26px]">Solliciteer op deze vacature</h2>
            <p className="mb-6 mt-2 text-[15.5px]">Binnen een paar minuten gedaan. We reageren zo snel mogelijk.</p>
            <ApplicationForm vacancyId={v.id} vacancyTitle={v.title} />
          </div>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(jobLd) }} />
    </>
  );
}
