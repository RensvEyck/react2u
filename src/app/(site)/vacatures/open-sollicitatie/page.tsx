import type { Metadata } from "next";
import ApplicationForm from "@/components/site/ApplicationForm";

export const metadata: Metadata = {
  title: "Open sollicitatie",
  description: "Stuur een open sollicitatie naar React2u. We komen graag in contact met talent!",
  alternates: { canonical: "/vacatures/open-sollicitatie" },
};

export default function OpenSollicitatiePage() {
  return (
    <>
      <section className="bg-gradient-to-br from-soft via-white to-secondary/10">
        <div className="container-site py-14 max-w-[860px]">
          <p className="eyebrow mb-4">WERKEN BIJ REACT2U</p>
          <h1 className="text-4xl md:text-5xl mb-5">Open sollicitatie</h1>
          <p>
            Staat jouw functie er niet tussen, maar denk je dat je bij ons past? We komen graag met je in
            contact. Laat je gegevens achter en upload je CV.
          </p>
        </div>
      </section>
      <section className="py-14">
        <div className="container-site max-w-[640px]">
          <ApplicationForm vacancyTitle="Open sollicitatie" />
        </div>
      </section>
    </>
  );
}
