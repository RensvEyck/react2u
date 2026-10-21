import type { Vacancy, VacatureOpbouw } from "./types";
import type { Taal } from "./taal";
import { woordenboek } from "./woordenboek";

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

/**
 * De volledige vacaturetekst als markdown, voor JobPosting en de
 * vacaturefeed: de secties plus het vaste pakket bij loondienst.
 */
export function volledigeTekst(v: Vacancy, taal: Taal): string {
  const o = opbouwInTaal(v, taal);
  if (!o) return vacatureInTaal(v, taal).description_md || "";
  const ob = woordenboek(o.taal).vacatures.opbouw;
  const pakket = !isOpdracht(v) && v.employment_type !== "INTERN" ? ob.aanbod.map((a) => `- ${a}`).join("\n") : "";
  const delen: [string, string][] = [
    [ob.doen, o.doen],
    [ob.samen, o.samen],
    [ob.leuk, o.leuk],
    [ob.vragen, o.vragen],
    [isOpdracht(v) ? ob.biedenOpdracht : ob.bieden, [pakket, o.bieden].filter(Boolean).join("\n\n")],
  ];
  return delen.filter(([, t]) => t).map(([k, t]) => `### ${k}\n\n${t}`).join("\n\n");
}

function escHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

/** Mini-markdown ("### ", "- ", **vet**) naar eenvoudige HTML, voor Google for Jobs en Indeed. */
export function mdNaarHtml(md: string): string {
  const inline = (t: string) => escHtml(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const uit: string[] = [];
  let lijst: string[] = [];
  let alinea: string[] = [];
  const sluit = () => {
    if (alinea.length) { uit.push(`<p>${inline(alinea.join(" "))}</p>`); alinea = []; }
    if (lijst.length) { uit.push(`<ul>${lijst.map((l) => `<li>${inline(l)}</li>`).join("")}</ul>`); lijst = []; }
  };
  for (const regel of md.split("\n")) {
    const r = regel.trim();
    if (!r) { sluit(); continue; }
    if (r.startsWith("### ")) { sluit(); uit.push(`<h3>${inline(r.slice(4))}</h3>`); continue; }
    if (r.startsWith("- ")) { if (alinea.length) sluit(); lijst.push(r.slice(2)); continue; }
    if (lijst.length) sluit();
    alinea.push(r);
  }
  sluit();
  return uit.join("");
}

/**
 * Salaris uit de vrije tekst ("€ 3.500 tot € 4.500 bruto per maand",
 * "€ 120 tot € 150 per uur") als baseSalary voor Google for Jobs. Zonder
 * herkenbare bedragen of eenheid: niets, liever geen dan een fout salaris.
 */
export function baseSalaryLd(salary: string | null) {
  if (!salary) return null;
  const bedragen = [...salary.matchAll(/€\s*([\d.]+)(?:,(\d+))?/g)].map((m) => Number(m[1].replace(/\./g, "")));
  if (!bedragen.length || bedragen.some((n) => !n)) return null;
  const t = salary.toLowerCase();
  const unitText = /per uur|\/uur|hour/.test(t) ? "HOUR" : /per jaar|year/.test(t) ? "YEAR" : /per maand|p\/m|month/.test(t) ? "MONTH" : null;
  if (!unitText) return null;
  const [min, max] = [Math.min(...bedragen), Math.max(...bedragen)];
  return {
    "@type": "MonetaryAmount",
    currency: "EUR",
    value: { "@type": "QuantitativeValue", unitText, ...(min === max ? { value: min } : { minValue: min, maxValue: max }) },
  };
}

/** `JobPosting` voor Google for Jobs, in de taal waarin de tekst van de pagina staat. */
export function jobPostingLd(v: Vacancy, taal: Taal) {
  const tekst = vacatureInTaal(v, taal);
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: tekst.title,
    description: mdNaarHtml([tekst.intro || "", volledigeTekst(v, taal)].filter(Boolean).join("\n\n")),
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
    ...(baseSalaryLd(v.salary) ? { baseSalary: baseSalaryLd(v.salary) } : {}),
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
