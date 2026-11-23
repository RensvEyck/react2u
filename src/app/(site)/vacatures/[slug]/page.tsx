import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedVacancies } from "@/lib/content";
import { getZichtbareVacature, getZichtbareVacatures } from "@/lib/voorbeeld";
import { MiniMarkdown } from "@/lib/md";
import { jsonLd } from "@/lib/jsonld";
import { metOmschrijving, omschrijving, paginaTitel } from "@/lib/seo";
import { openGraphVoor } from "@/lib/og";
import ApplicationForm from "@/components/site/ApplicationForm";
import { LuMapPin, LuClock, LuEuro } from "react-icons/lu";
import PageHeader from "@/components/site/PageHeader";
import { nieuwOntwerp } from "@/lib/concept";
import { VacatureDetail } from "@/components/blocks/WerkenBij";
import { hreflangVoor } from "@/lib/taal";
import { jobPostingLd } from "@/lib/vacatures";
import { woordenboek } from "@/lib/woordenboek";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const vacancies = await getPublishedVacancies();
  return vacancies.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const v = await getZichtbareVacature(slug);
  if (!v) return {};
  // Een concept zie je alleen in de voorbeeldmodus; nooit indexeren. Een
  // gesloten vacature blijft gewoon vindbaar, als "vervuld" (lib/content.ts).
  const concept = v.status === "draft" ? { robots: { index: false, follow: false } } : {};
  const vervuld = v.status === "closed";
  return {
    ...concept,
    // Absoluut, zonder het sjabloon uit app/layout.tsx: paginaTitel zet het merk
    // er precies één keer achter, ook als de SEO-titel het al bevat. Vervuld
    // staat in de titel, zodat niemand voor niets klikt (lib/seo.ts spiegelt dit).
    title: { absolute: paginaTitel(vervuld ? `${v.title} • ${woordenboek("nl").vacatures.detail.vervuldTitel}` : v.seo_title || `${v.title} • Vacature`) },
    ...metOmschrijving(omschrijving(v.seo_description, v.intro)),
    alternates: { canonical: `/vacatures/${slug}`, languages: hreflangVoor(`/vacatures/${slug}`) ?? undefined },
    openGraph: await openGraphVoor({ pad: `/vacatures/${slug}` }),
  };
}

export default async function VacancyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = await getZichtbareVacature(slug);
  if (!v) notFound();

  // Een vervulde vacature heeft geen JobPosting: Google for Jobs toont alleen
  // open vacatures, en een JobPosting op een dichte vacature is een fout.
  const vervuld = v.status === "closed";
  const jobLd = vervuld ? null : jobPostingLd(v, "nl");

  if (nieuwOntwerp) {
    // Het nieuwe ontwerp "Vacature" (versie B); de oude weergave hieronder is de terugvaloptie.
    const andere = (await getZichtbareVacatures()).filter((x) => x.id !== v.id);
    return (
      <>
        <VacatureDetail v={v} andere={andere} vervuld={vervuld} />
        {jobLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(jobLd) }} />}
      </>
    );
  }

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
            {vervuld ? (
              <>
                <h2 className="text-[26px]">{woordenboek("nl").vacatures.detail.vervuldKop}</h2>
                <p className="mb-6 mt-2 text-[15.5px]">{woordenboek("nl").vacatures.detail.vervuldTekst.replace("{titel}", v.title)}</p>
                <Link href="/vacatures/open-sollicitatie" className="btn">{woordenboek("nl").vacatures.detail.openSollicitatie}</Link>
              </>
            ) : (
              <>
                <h2 className="text-[26px]">Solliciteer op deze vacature</h2>
                <p className="mb-6 mt-2 text-[15.5px]">Binnen een paar minuten gedaan. We reageren zo snel mogelijk.</p>
                <ApplicationForm vacancyId={v.id} vacancyTitle={v.title} />
              </>
            )}
          </div>
        </div>
      </section>
      {jobLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(jobLd) }} />}
    </>
  );
}
