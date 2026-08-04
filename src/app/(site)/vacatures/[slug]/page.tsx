import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedVacancies, getVacancy } from "@/lib/content";
import { MiniMarkdown } from "@/lib/md";
import ApplicationForm from "@/components/site/ApplicationForm";
import { FaMapMarkerAlt, FaClock, FaEuroSign } from "react-icons/fa";

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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: v.title,
    description: (v.description_md || v.intro || "").replace(/\n/g, "<br/>"),
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
      <section className="bg-gradient-to-br from-soft via-white to-secondary/10">
        <div className="container-site py-14 max-w-[860px]">
          <p className="eyebrow mb-4">VACATURE</p>
          <h1 className="text-4xl md:text-5xl mb-5">{v.title}</h1>
          <div className="flex flex-wrap gap-5 text-primary/80">
            <span className="flex items-center gap-2"><FaMapMarkerAlt /> {v.location}</span>
            {v.hours && <span className="flex items-center gap-2"><FaClock /> {v.hours}</span>}
            {v.salary && <span className="flex items-center gap-2"><FaEuroSign /> {v.salary}</span>}
          </div>
        </div>
      </section>
      <section className="py-14">
        <div className="container-site grid gap-12 lg:grid-cols-[1fr_420px] max-w-[1100px]">
          <div>
            {v.intro && <p className="text-xl text-primary/80 mb-6">{v.intro}</p>}
            <MiniMarkdown text={v.description_md || ""} />
          </div>
          <div className="lg:sticky lg:top-6 h-fit rounded-2xl border border-black/5 bg-soft p-7">
            <h2 className="text-2xl mb-4">Solliciteer op deze vacature</h2>
            <ApplicationForm vacancyId={v.id} vacancyTitle={v.title} />
          </div>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
