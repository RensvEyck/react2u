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
  // Velden van de bloktypes uit de nieuwe vormgeving (zie CONTEXT.md, *Vormgeving*).
  highlight: "Woord in accentkleur", badge: "Label (keurmerkregel, of wat in de cirkel staat)", logosLabel: "Tekst bij de logo's",
  layout: "Opmaak (leeg of center)", kleur: "Kleur (blauw, teal, rood, oranje, roze, indigo)",
  quote: "Citaat", quoteName: "Naam bij citaat", quoteRole: "Functie bij citaat",
  value: "Cijfer of kernwoord", count: "Aantal artikelen",
  steps: "Stappen", valueLabel: "Toelichting bij het cijfer",
  links: "Links", routes: "Contactroutes", sub: "Tweede regel",
  choices: "Keuzes", note: "Regel onderaan", anchor: "Anker (voor #-links)",
  trust: "Vertrouwensregel(s)",
  pakketten: "Abonnementen", sleutel: "Sleutel (compleet, basis)", naam: "Naam", kort: "Korte naam (telefoon)", prijs: "Prijs per werknemer per jaar",
  omschrijving: "Omschrijving", knop: "Knoptekst", inbegrepen: "Inbegrepen", voetLabel: "Kop onderaan", voetItems: "Labels onderaan",
  medewerkers: "Startaantal medewerkers", casemanagerTarief: "Uurtarief casemanager (voor de rekenhulp)", maatwerk: "Maatwerkregel",
  vergelijk: "Vergelijking", rows: "Rijen", a: "Compleet", b: "Verrichtingenbasis", rekenhulp: "Rekenhulp",
  lijst: "Tarievenlijst", geldig: "Geldigheid", noot: "Voetnoot", pdf: "Pdf (link)", categorieen: "Categorieën",
  titel: "Titel", toelichting: "Toelichting", regels: "Regels", tone: "Kleur (indigo of warm)", doelgroep: "Doelgroep (werkgever of werknemer)",
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
