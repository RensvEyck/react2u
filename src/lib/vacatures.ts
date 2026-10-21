import type { Vacancy, VacatureOpbouw } from "./types";
import type { Taal } from "./taal";

/**
 * Een vacature in de taal van de pagina. De Engelse velden (migratie 0015)
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

/** De volledige vacaturetekst als platte markdown, voor JobPosting. */
function beschrijvingVoorLd(v: Vacancy, taal: Taal): string {
  const o = opbouwInTaal(v, taal);
  if (!o) return vacatureInTaal(v, taal).description_md || "";
  const en = o.taal === "en";
  const kop = en
    ? { doen: "What you will do", vragen: "What we ask", bieden: "What we offer" }
    : { doen: "Wat ga je doen", vragen: "Wat wij vragen", bieden: "Wat wij bieden" };
  return (["doen", "vragen", "bieden"] as const)
    .filter((k) => o[k])
    .map((k) => `### ${kop[k]}\n\n${o[k]}`)
    .join("\n\n");
}

/** `JobPosting` voor Google for Jobs, in de taal waarin de tekst van de pagina staat. */
export function jobPostingLd(v: Vacancy, taal: Taal) {
  const tekst = vacatureInTaal(v, taal);
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: tekst.title,
    description: beschrijvingVoorLd(v, taal) || tekst.intro || "",
    inLanguage: tekst.taal,
    datePosted: v.published_at || v.created_at,
    ...(v.valid_through ? { validThrough: v.valid_through } : {}),
    employmentType: v.employment_type.includes(",") ? v.employment_type.split(",") : v.employment_type,
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

export const OPBOUW_SECTIES = ["doen", "samen", "leuk", "eerlijk", "vragen", "bieden", "faq"] as const;

/**
 * De secties van de nieuwe opbouw (migratie 0017) in de taal van de pagina.
 * Engels valt per sectie terug op Nederlands. `null` = de vacature heeft nog
 * geen nieuwe opbouw; de pagina toont dan description_md zoals voorheen.
 */
export function opbouwInTaal(v: Vacancy, taal: Taal): (VacatureOpbouw & { taal: Taal }) | null {
  const nl = v.opbouw?.nl || {};
  const en = v.opbouw?.en || {};
  const heeftNl = OPBOUW_SECTIES.some((k) => nl[k]?.trim());
  if (!heeftNl) return null;
  const gebruikEn = taal === "en" && OPBOUW_SECTIES.some((k) => en[k]?.trim()) && !!v.title_en?.trim();
  const bron = gebruikEn ? en : nl;
  const uit = {} as VacatureOpbouw;
  for (const k of OPBOUW_SECTIES) uit[k] = (bron[k] || "").trim();
  return { ...uit, taal: gebruikEn ? "en" : "nl" };
}

/** "**Vraag?**\nAntwoord" blokken, gescheiden door een lege regel. */
export function faqParen(md: string): { vraag: string; antwoord: string }[] {
  return (md || "")
    .split(/\n\s*\n/)
    .map((blok) => blok.trim())
    .filter(Boolean)
    .map((blok) => {
      const [eerste, ...rest] = blok.split("\n");
      return { vraag: eerste.replace(/\*\*/g, "").trim(), antwoord: rest.join(" ").trim() };
    })
    .filter((p) => p.vraag && p.antwoord);
}

/** FAQPage voor de veelgestelde vragen onder een vacature. */
export function faqLd(paren: { vraag: string; antwoord: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: paren.map((p) => ({
      "@type": "Question",
      name: p.vraag,
      acceptedAnswer: { "@type": "Answer", text: p.antwoord },
    })),
  };
}

/** Is dit een ZZP-opdracht (overeenkomst van opdracht) in plaats van loondienst? */
export const isOpdracht = (v: Vacancy) => v.employment_type === "CONTRACTOR";
