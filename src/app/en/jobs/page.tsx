import type { Metadata } from "next";
import { getPublishedVacancies } from "@/lib/content";
import { WerkenBijPagina } from "@/components/blocks/WerkenBij";
import { hreflangVoor } from "@/lib/taal";
import { woordenboek } from "@/lib/woordenboek";
import { openGraphVoor } from "@/lib/og";

export const revalidate = 300;

const t = woordenboek("en").vacatures.seo;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: t.titel,
    description: t.omschrijving,
    alternates: { canonical: "/en/jobs", languages: hreflangVoor("/vacatures") ?? undefined },
    openGraph: await openGraphVoor({ pad: "/en/jobs", taal: "en" }),
  };
}

/** Working at React2u: dezelfde pagina als /vacatures, met de teksten uit het Engelse woordenboek. */
export default async function JobsPage() {
  const vacancies = await getPublishedVacancies();
  return <WerkenBijPagina vacatures={vacancies} taal="en" />;
}
