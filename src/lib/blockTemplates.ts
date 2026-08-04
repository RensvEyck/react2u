// Default data per bloktype — gebruikt bij "Blok toevoegen" in het admin-paneel.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const BLOCK_TEMPLATES: Record<string, { label: string; data: any }> = {
  hero: {
    label: "Hero (kop + afbeelding)",
    data: { eyebrow: "", heading: "Nieuwe kop", text: "Introtekst…", button: { label: "", href: "" }, image: "", imageAlt: "" },
  },
  intro: {
    label: "Introtekst (gecentreerd)",
    data: { eyebrow: "", heading: "Kop", text: "Tekst…", button: { label: "", href: "" } },
  },
  animatedHeadline: {
    label: "Typende kop",
    data: { before: "React2u staat voor", words: ["persoonlijke"], after: "dienstverlening." },
  },
  imageText: {
    label: "Tekst + afbeelding",
    data: { eyebrow: "", heading: "Kop", text: "Tekst…", button: { label: "", href: "" }, image: "", imageAlt: "", imagePosition: "right" },
  },
  servicesGrid: {
    label: "Dienstenkaarten",
    data: { cards: [{ title: "Dienst", icon: "check", description: "Omschrijving", href: "/" }] },
  },
  ctaBanner: {
    label: "Call-to-action banner",
    data: { eyebrow: "", heading: "Kop", text: "", buttons: [{ label: "Neem contact op", href: "/contact", style: "accent" }] },
  },
  subSections: {
    label: "Subsecties (verwachtingen)",
    data: { eyebrow: "", heading: "Dit kun je van ons verwachten", intro: "", items: [{ title: "Titel", body: "Tekst…" }] },
  },
  twoColumnLists: {
    label: "Twee kolommen met lijsten",
    data: { heading: "", columns: [{ title: "Kolom 1", items: ["Item"] }, { title: "Kolom 2", items: ["Item"] }] },
  },
  valueCards: {
    label: "Waardenkaarten",
    data: { cards: [{ icon: "heart", title: "Titel", text: "Tekst" }] },
  },
  contactFaq: {
    label: "Contactformulier + FAQ",
    data: { heading: "Kom met ons in contact", text: "", faq: [{ question: "Vraag?", answer: "Antwoord." }] },
  },
  faqAccordion: {
    label: "FAQ (uitklapbaar)",
    data: { heading: "", items: [{ question: "Vraag?", answer: "Antwoord." }] },
  },
  logoCarousel: {
    label: "Logocarrousel",
    data: { eyebrow: "EEN GREEP UIT ONZE TEVREDEN KLANTEN", logos: [{ image: "", alt: "" }] },
  },
  richText: {
    label: "Tekstsectie",
    data: { eyebrow: "", heading: "", body: "Tekst…", button: { label: "", href: "" } },
  },
  imagesBlock: {
    label: "Afbeelding(en)",
    data: { images: [{ image: "", alt: "" }] },
  },
  contactDetails: {
    label: "Contactgegevens + formulier",
    data: {
      heading: "Kom met ons in contact!", text: "", phone: "0856205800", phoneDisplay: "085 - 620 58 00",
      email: "info@react2u.nl", address: "Stratumsedijk 29\n5611 NB Eindhoven", formHeading: "Stuur ons een bericht",
    },
  },
};
