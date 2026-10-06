import type { Vacancy } from "./types";
import type { Taal } from "./taal";

/**
 * Een vacature in de taal van de pagina. De Engelse velden (migratie 0013)
 * zijn optioneel: zonder Engelse titel toont de Engelse site de Nederlandse
 * vacature, met bovenaan de melding dat hij in het Nederlands is.
 */
export type VacatureTekst = {
  title: string;
  intro: string | null;
  description_md: string | null;
  /** De taal waarin de tekst daadwerkelijk staat. */
  taal: Taal;
};

export function vacatureInTaal(v: Vacancy, taal: Taal): VacatureTekst {
  if (taal === "en" && v.title_en?.trim()) {
    return {
      title: v.title_en.trim(),
      intro: v.intro_en?.trim() || null,
      description_md: v.description_en_md?.trim() || null,
      taal: "en",
    };
  }
  return { title: v.title, intro: v.intro, description_md: v.description_md, taal: "nl" };
}

/**
 * Locatie, uren en salaris zijn vrije tekst uit de admin ("32-40 uur",
 * "€3.500 p/m"). Voor de Engelse site vertalen we de paar vaste woorden erin;
 * de rest (getallen, plaatsnamen) is in beide talen hetzelfde.
 */
export function kenmerkInTaal(tekst: string | null, taal: Taal): string | null {
  if (!tekst || taal === "nl") return tekst;
  return tekst
    .replace(/\buur\b/gi, "hours")
    .replace(/\bper week\b/gi, "per week")
    .replace(/\bper maand\b/gi, "per month")
    .replace(/\bp\/m\b/gi, "per month")
    .replace(/\bbruto\b/gi, "gross")
    .replace(/\bof\b/g, "or")
    .replace(/\ben\b/g, "and");
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl";

/** `JobPosting` voor Google for Jobs, in de taal waarin de tekst van de pagina staat. */
export function jobPostingLd(v: Vacancy, taal: Taal) {
  const tekst = vacatureInTaal(v, taal);
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: tekst.title,
    description: tekst.description_md || tekst.intro || "",
    inLanguage: tekst.taal,
    datePosted: v.published_at || v.created_at,
    ...(v.valid_through ? { validThrough: v.valid_through } : {}),
    employmentType: v.employment_type,
    hiringOrganization: {
      "@type": "Organization",
      name: "React2u",
      sameAs: SITE,
      logo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/wp/2023/05/Logo-kleur.svg`,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Stratumsedijk 29",
        postalCode: "5611 NB",
        addressLocality: v.location || "Eindhoven",
        addressCountry: "NL",
      },
    },
    directApply: true,
  };
}
