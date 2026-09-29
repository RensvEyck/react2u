import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedVacancies } from "@/lib/content";
import { LuMapPin, LuClock, LuEuro } from "react-icons/lu";
import PageHeader from "@/components/site/PageHeader";
import { Arrow } from "@/components/site/Arrow";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Vacatures",
  description:
    "Werken bij React2u? Bekijk onze openstaande vacatures en kom werken bij dé persoonlijke arbodienstverlener in Eindhoven.",
  alternates: { canonical: "/vacatures" },
};

export default async function VacaturesPage() {
  const vacancies = await getPublishedVacancies();
  return (
    <>
      <PageHeader crumbs={[{ label: "Werken bij React2u", href: "/vacatures" }]} eyebrow="Werken bij React2u" title="Vacatures">
        <p>
          Bij React2u werk je met persoonlijke aandacht aan de duurzame inzetbaarheid van medewerkers.
          Bekijk onze openstaande vacatures en kom kennismaken!
        </p>
      </PageHeader>
      <section className="py-16 md:py-24">
        <div className="container-site max-w-[980px]">
          {vacancies.length === 0 ? (
            <div className="rounded-2xl border border-line p-10" data-reveal>
              <h2 className="text-[26px]">Op dit moment geen openstaande vacatures</h2>
              <p className="mx-auto mt-3 max-w-[520px]">
                Maar we komen altijd graag in contact met talent. Stuur gerust een open sollicitatie!
              </p>
              <Link href="/vacatures/open-sollicitatie" className="btn mt-7">Open sollicitatie <Arrow /></Link>
            </div>
          ) : (
            <div className="space-y-4">
              {vacancies.map((v, i) => (
                <Link
                  key={v.id}
                  href={`/vacatures/${v.slug}`}
                  data-reveal
                  style={{ "--ri": i } as React.CSSProperties}
                  className="lift group flex flex-col gap-5 rounded-2xl border border-line bg-white p-7 md:flex-row md:items-center md:justify-between md:p-9"
                >
                  <div>
                    <h2 className="text-[26px] leading-tight">{v.title}</h2>
                    {v.intro && <p className="mt-2 max-w-[620px] text-[16.5px]">{v.intro}</p>}
                    <div className="mt-4 flex flex-wrap gap-2 text-[14.5px] font-medium text-primary">
                      <span className="flex items-center gap-1.5 rounded-md bg-soft px-3 py-1.5"><LuMapPin aria-hidden /> {v.location}</span>
                      {v.hours && <span className="flex items-center gap-1.5 rounded-md bg-soft px-3 py-1.5"><LuClock aria-hidden /> {v.hours}</span>}
                      {v.salary && <span className="flex items-center gap-1.5 rounded-md bg-soft px-3 py-1.5"><LuEuro aria-hidden /> {v.salary}</span>}
                    </div>
                  </div>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line text-primary transition-transform duration-300 group-hover:translate-x-1">
                    <Arrow />
                  </span>
                </Link>
              ))}
              <p className="pt-6 text-center">
                Staat jouw functie er niet tussen?{" "}
                <Link href="/vacatures/open-sollicitatie" className="link-arrow">Stuur een open sollicitatie <Arrow /></Link>
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
