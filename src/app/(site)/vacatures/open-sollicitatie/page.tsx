import type { Metadata } from "next";
import ApplicationForm from "@/components/site/ApplicationForm";
import PageHeader from "@/components/site/PageHeader";
import { WERKEN_BIJ_FOTO } from "@/lib/nav";
import { nieuwOntwerp } from "@/lib/concept";
import { OpenSollicitatiePagina } from "@/components/blocks/WerkenBij";
import { hreflangVoor } from "@/lib/taal";

export const metadata: Metadata = {
  title: "Open sollicitatie",
  description: "Stuur een open sollicitatie naar React2u. We komen graag in contact met talent!",
  alternates: { canonical: "/vacatures/open-sollicitatie", languages: hreflangVoor("/vacatures/open-sollicitatie") ?? undefined },
};

export default function OpenSollicitatiePage() {
  // Het nieuwe ontwerp, zoals de rest van Werken bij; de oude pagina hieronder is de terugvaloptie.
  if (nieuwOntwerp) return <OpenSollicitatiePagina taal="nl" />;
  return (
    <>
      <PageHeader crumbs={[{ label: "Werken bij React2u", href: "/vacatures" }, { label: "Open sollicitatie", href: "/vacatures/open-sollicitatie" }]}
        eyebrow="Werken bij React2u" title="Open sollicitatie" image={WERKEN_BIJ_FOTO} focus="center 35%">
        <p>
          Staat jouw functie er niet tussen, maar denk je dat je bij ons past? We komen graag met je in
          contact. Laat je gegevens achter en upload je cv.
        </p>
      </PageHeader>
      <section className="py-16 md:py-24">
        <div className="container-site max-w-[760px]">
          <div className="rounded-2xl bg-soft p-7 md:p-10">
            <h2 className="mb-6 text-[26px]">Vertel ons wie je bent</h2>
            <ApplicationForm vacancyTitle="Open sollicitatie" />
          </div>
        </div>
      </section>
    </>
  );
}
