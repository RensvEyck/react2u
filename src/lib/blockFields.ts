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
  // Velden van de blokken die bij de livegang van oktober 2026 naar de database
  // gingen (werkgevers, werknemers, labels, prijsblad, over ons, kennismaken).
  tekst: "Tekst", kop: "Kop", kicker: "Bovenkop (klein)", short: "Korte tekst (telefoon)", aria: "Toegankelijkheidstekst (schermlezer)",
  focus: "Beeldfocus (bv. 50% 30%)", imageFit: "Beeldvulling (cover of contain)", bg: "Achtergrondkleur (hex)", tint: "Lichte achtergrondkleur (hex)",
  panel: "Kleur van het paneel (hex)", orb: "Kleur van de bol (hex)", featured: "Uitgelicht", numbered: "Genummerd", breed: "Volle breedte",
  link: "Link (tekst en adres)", cta: "Oproep (knop)", call: "Belregel (tekst, nummer, link)", strook: "Strook onderaan", alert: "Waarschuwingskader",
  points: "Punten", lines: "Regels van de kop", checks: "Vinkjes", photos: "Foto's", groups: "Groepen", groepen: "Groepen", portals: "Portalen",
  documents: "Documenten", meta: "Regel onder de kop", help: "Hulptekst onderaan", for: "Voor wie", per: "Eenheid (bv. per werknemer per jaar)",
  card: "Kaart (regels)", cardTitle: "Kop van de kaart", cardNote: "Regel onder de kaart", formKop: "Kop boven het formulier",
  lijstEyebrow: "Bovenkop van de lijst", lijstKop: "Kop van de lijst", lijstTekst: "Tekst bij de lijst",
  company: "Bedrijfsgegevens (regels)", letter: "Letter of cijfer op de kaart", when: "Wanneer (moment of termijn)", jij: "Wat jij doet", wij: "Wat wij doen",
  // dienstLabel (Resist, Recover, …)
  de: "Dé-regel (positionering)", lead: "Leadzin", herken: "Herken je dit? (regels)", waarom: "Waarom React2u (kaarten)", wat: "Wat (korte omschrijving)",
  ook: "Ook van React2u (andere labels)", stappen: "Stappen", tagline: "Slogan",
  // overReact2u
  motto: "Motto (met regeleinde)", citaat: "Citaat", citaatLabel: "Label bij het citaat", verhaalEyebrow: "Bovenkop verhaal", verhaalKop: "Kop verhaal",
  verhaal: "Verhaal (alinea's)", uitspraak: "Uitspraak (uitgelicht)", slot: "Slotalinea", foto: "Foto", fotoAlt: "Alt-tekst foto", fotoFocus: "Beeldfocus foto",
  fotoLabel: "Label op de foto", mvKop: "Kop missie en visie", missie: "Missie", visie: "Visie", waardenKop: "Kop waarden", waardenTekst: "Tekst bij de waarden",
  waarden: "Waarden",
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
