import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedVacancies } from "@/lib/content";
import { LuMapPin, LuClock, LuEuro } from "react-icons/lu";
import PageHeader from "@/components/site/PageHeader";
import { Arrow } from "@/components/site/Arrow";
import { WERKEN_BIJ_FOTO } from "@/lib/nav";
import { nieuwOntwerp } from "@/lib/concept";
import { WerkenBijPagina } from "@/components/blocks/WerkenBij";
import { hreflangVoor } from "@/lib/taal";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Vacatures",
  description:
    "Werken bij React2u? Bekijk onze openstaande vacatures en kom werken bij dé persoonlijke arbodienstverlener in Eindhoven.",
  alternates: { canonical: "/vacatures", languages: hreflangVoor("/vacatures") ?? undefined },
};

export default async function VacaturesPage() {
  const vacancies = await getPublishedVacancies();
  // Het nieuwe ontwerp "Werken bij"; de oude pagina hieronder is de terugvaloptie.
  if (nieuwOntwerp) return <WerkenBijPagina vacatures={vacancies} />;
  return (
    <>
      <PageHeader crumbs={[{ label: "Werken bij React2u", href: "/vacatures" }]} eyebrow="Werken bij React2u" title="Vacatures"
        image={WERKEN_BIJ_FOTO} focus="center 35%">
        <p>
          Bij React2u werk je met persoonlijke aandacht aan de duurzame inzetbaarheid van medewerkers.
          Bekijk onze openstaande vacatures en kom kennismaken!
        </p>
      </PageHeader>
      {/* Op het raster van de rest van de site: links de kop, rechts de vacatures. */}
      <section className="py-16 md:py-24">
        <div className="container-site grid gap-10 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-4" data-reveal>
            <p className="eyebrow mb-3">Werken bij React2u</p>
            <h2 className="text-[1.85rem] font-bold leading-[1.12] tracking-[-0.02em] sm:text-[2.2rem]">
              {vacancies.length === 0
                ? "Nu geen openstaande vacatures"
                : vacancies.length === 1 ? "1 openstaande vacature" : `${vacancies.length} openstaande vacatures`}
            </h2>
            <p className="mt-4 max-w-[380px] text-[17px]">
              {vacancies.length === 0
                ? "Maar we komen altijd graag in contact met talent."
                : "Staat jouw functie er niet tussen? We komen altijd graag in contact met talent."}
            </p>
            <Link href="/vacatures/open-sollicitatie" className="link-arrow mt-5">Stuur een open sollicitatie <Arrow /></Link>
          </div>
          {vacancies.length > 0 && (
            <ul className="space-y-4 lg:col-span-8">
              {vacancies.map((v, i) => (
                <li key={v.id} data-reveal style={{ "--ri": i } as React.CSSProperties}>
                  <Link href={`/vacatures/${v.slug}`}
                    className="group flex flex-col gap-6 rounded-2xl bg-soft p-7 transition-colors hover:bg-[#efe9e0] md:flex-row md:items-center md:justify-between md:p-10">
                    <div>
                      <h3 className="text-[26px] leading-tight md:text-[30px]">{v.title}</h3>
                      {v.intro && <p className="mt-2.5 max-w-[620px] text-[16.5px]">{v.intro}</p>}
                      <div className="mt-5 flex flex-wrap gap-2 text-[14.5px] font-medium text-primary">
                        <span className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5"><LuMapPin aria-hidden /> {v.location}</span>
                        {v.hours && <span className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5"><LuClock aria-hidden /> {v.hours}</span>}
                        {v.salary && <span className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5"><LuEuro aria-hidden /> {v.salary}</span>}
                      </div>
                    </div>
                    {/* Dezelfde ronde pijl als op de fototegels: wit, roze onder de muis. */}
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-primary transition-colors duration-300 group-hover:bg-accent group-hover:text-white">
                      <Arrow className="transition-transform duration-300 group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
