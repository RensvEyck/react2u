import type { Metadata } from "next";
import { OpenSollicitatiePagina } from "@/components/blocks/WerkenBij";
import { OPEN_SOLLICITATIE, hreflangVoor } from "@/lib/taal";
import { woordenboek } from "@/lib/woordenboek";

const t = woordenboek("en").vacatures.seo;

export const metadata: Metadata = {
  title: t.openTitel,
  description: t.openOmschrijving,
  alternates: {
    canonical: `/en/jobs/${OPEN_SOLLICITATIE.en}`,
    languages: hreflangVoor(`/vacatures/${OPEN_SOLLICITATIE.nl}`) ?? undefined,
  },
};

export default function OpenApplicationPage() {
  return <OpenSollicitatiePagina taal="en" />;
}
