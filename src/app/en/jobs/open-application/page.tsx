import type { Metadata } from "next";
import { OpenSollicitatiePagina } from "@/components/blocks/WerkenBij";
import { OPEN_SOLLICITATIE, hreflangVoor } from "@/lib/taal";
import { woordenboek } from "@/lib/woordenboek";
import { openGraphVoor } from "@/lib/og";

const t = woordenboek("en").vacatures.seo;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: t.openTitel,
    description: t.openOmschrijving,
    alternates: {
      canonical: `/en/jobs/${OPEN_SOLLICITATIE.en}`,
      languages: hreflangVoor(`/vacatures/${OPEN_SOLLICITATIE.nl}`) ?? undefined,
    },
    openGraph: await openGraphVoor({ pad: `/en/jobs/${OPEN_SOLLICITATIE.en}`, taal: "en" }),
  };
}

export default function OpenApplicationPage() {
  return <OpenSollicitatiePagina taal="en" />;
}
