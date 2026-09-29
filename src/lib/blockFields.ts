/**
 * Leesbare namen voor de velden in blokdata. Gebruikt door de blokeditor en
 * door de versiegeschiedenis ("Gewijzigd: kop, tekst").
 */
export const FIELD_LABELS: Record<string, string> = {
  eyebrow: "Bovenkop", heading: "Kop", text: "Tekst", body: "Tekst", intro: "Introtekst",
  button: "Knop", button2: "Tweede knop", buttons: "Knoppen", label: "Knoptekst", href: "Link",
  image: "Afbeelding", imageAlt: "Alt-tekst (SEO)", imagePosition: "Afbeelding links/rechts",
  cards: "Kaarten", items: "Items", title: "Titel", description: "Omschrijving", icon: "Icoon",
  question: "Vraag", answer: "Antwoord", faq: "FAQ-items", logos: "Logo's", alt: "Alt-tekst",
  columns: "Kolommen", words: "Woorden", before: "Tekst ervoor", after: "Tekst erna",
  style: "Stijl", phone: "Telefoon (tel:)", phoneDisplay: "Telefoon (weergave)", email: "E-mail",
  address: "Adres", formHeading: "Formulier-kop", images: "Afbeeldingen",
};

/** Welke velden van de blokdata verschillen tussen twee versies. */
export function changedBlockFields(before: unknown, after: unknown): string[] {
  const a = (before && typeof before === "object" ? before : {}) as Record<string, unknown>;
  const b = (after && typeof after === "object" ? after : {}) as Record<string, unknown>;
  const out: string[] = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null)) out.push((FIELD_LABELS[k] || k).toLowerCase());
  }
  return out;
}
