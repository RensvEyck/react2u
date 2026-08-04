import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedVacancies } from "@/lib/content";
import { FaMapMarkerAlt, FaClock } from "react-icons/fa";

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
      <section className="bg-gradient-to-br from-soft via-white to-secondary/10">
        <div className="container-site py-14 lg:py-20 max-w-[820px]">
          <p className="eyebrow mb-4">WERKEN BIJ REACT2U</p>
          <h1 className="text-4xl md:text-5xl mb-6">Vacatures</h1>
          <p>
            Bij React2u werk je met persoonlijke aandacht aan de duurzame inzetbaarheid van medewerkers.
            Bekijk onze openstaande vacatures en kom kennismaken!
          </p>
        </div>
      </section>
      <section className="py-14">
        <div className="container-site max-w-[860px]">
          {vacancies.length === 0 ? (
            <div className="rounded-2xl bg-soft p-10 text-center">
              <h2 className="text-2xl mb-3">Op dit moment geen openstaande vacatures</h2>
              <p className="mb-6">
                Maar we komen altijd graag in contact met talent. Stuur gerust een open sollicitatie!
              </p>
              <Link href="/vacatures/open-sollicitatie" className="btn">Open sollicitatie</Link>
            </div>
          ) : (
            <div className="space-y-5">
              {vacancies.map((v) => (
                <Link
                  key={v.id}
                  href={`/vacatures/${v.slug}`}
                  className="block rounded-2xl border border-black/5 bg-white p-7 shadow-sm transition hover:shadow-md hover:border-accent/40"
                >
                  <h2 className="text-2xl mb-2">{v.title}</h2>
                  {v.intro && <p className="mb-3 text-[16px]">{v.intro}</p>}
                  <div className="flex flex-wrap gap-5 text-[15px] text-primary/70">
                    <span className="flex items-center gap-2"><FaMapMarkerAlt /> {v.location}</span>
                    {v.hours && <span className="flex items-center gap-2"><FaClock /> {v.hours}</span>}
                    {v.salary && <span>{v.salary}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
