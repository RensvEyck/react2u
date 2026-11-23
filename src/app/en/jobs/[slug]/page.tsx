import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedVacancies } from "@/lib/content";
import { getZichtbareVacature, getZichtbareVacatures } from "@/lib/voorbeeld";
import { metOmschrijving, omschrijving, paginaTitel } from "@/lib/seo";
import { openGraphVoor } from "@/lib/og";
import { hreflangVoor } from "@/lib/taal";
import { vacatureInTaal } from "@/lib/vacatures";
import { VacatureDetail } from "@/components/blocks/WerkenBij";
import { woordenboek } from "@/lib/woordenboek";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const vacancies = await getPublishedVacancies();
  return vacancies.map((v) => ({ slug: v.slug }));
}

/**
 * Een vacature op de Engelse site. Met Engelse velden (migratie 0015) in het
 * Engels; zonder in het Nederlands, met bovenaan "This vacancy is in Dutch".
 * De SEO-titel volgt de taal van de tekst, met "Vacancy" als label. De
 * omschrijving is de ingekorte Engelse intro (de SEO-omschrijving uit de admin
 * is Nederlands); eerder ging de intro er compleet in en werden 29 Engelse
 * vacatures met 170 tot 220 tekens afgekapt. Zonder Engelse tekst dezelfde
 * omschrijving als de Nederlandse pagina.
 *
 * Geen JobPosting hier: Google wil één vacature per baan, en die staat op de
 * Nederlandse pagina (lib/vacatures.ts); hreflang verbindt de twee adressen.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const v = await getZichtbareVacature(slug);
  if (!v) return {};
  // Een concept zie je alleen in de voorbeeldmodus; nooit indexeren. Een
  // gesloten vacature blijft vindbaar als "vervuld" (lib/content.ts).
  const concept = v.status === "draft" ? { robots: { index: false, follow: false } } : {};
  const tekst = vacatureInTaal(v, "en");
  const vervuld = v.status === "closed";
  return {
    ...concept,
    title: { absolute: paginaTitel(`${tekst.title} • ${vervuld ? woordenboek("en").vacatures.detail.vervuldTitel : "Vacancy"}`) },
    ...metOmschrijving(tekst.taal === "en" ? omschrijving(null, tekst.intro) : omschrijving(v.seo_description, v.intro)),
    alternates: { canonical: `/en/jobs/${slug}`, languages: hreflangVoor(`/vacatures/${slug}`) ?? undefined },
    openGraph: await openGraphVoor({ pad: `/en/jobs/${slug}`, taal: "en" }),
  };
}

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = await getZichtbareVacature(slug);
  if (!v) notFound();
  const andere = (await getZichtbareVacatures()).filter((x) => x.id !== v.id);
  return <VacatureDetail v={v} andere={andere} taal="en" vervuld={v.status === "closed"} />;
}
