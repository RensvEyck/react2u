import type { Metadata } from "next";
import ApplicationForm from "@/components/site/ApplicationForm";
import PageHeader from "@/components/site/PageHeader";

export const metadata: Metadata = {
  title: "Open sollicitatie",
  description: "Stuur een open sollicitatie naar React2u. We komen graag in contact met talent!",
  alternates: { canonical: "/vacatures/open-sollicitatie" },
};

export default function OpenSollicitatiePage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Werken bij React2u", href: "/vacatures" }, { label: "Open sollicitatie", href: "/vacatures/open-sollicitatie" }]}
        eyebrow="Werken bij React2u" title="Open sollicitatie">
        <p>
          Staat jouw functie er niet tussen, maar denk je dat je bij ons past? We komen graag met je in
          contact. Laat je gegevens achter en upload je cv.
        </p>
      </PageHeader>
      <section className="py-16 md:py-24">
        <div className="container-site max-w-[760px]">
          <div className="rounded-2xl border border-line bg-white p-7 md:p-10">
            <ApplicationForm vacancyTitle="Open sollicitatie" />
          </div>
        </div>
      </section>
    </>
  );
}
