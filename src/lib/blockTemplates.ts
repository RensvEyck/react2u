// Default data per bloktype — gebruikt bij "Blok toevoegen" in het admin-paneel.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const BLOCK_TEMPLATES: Record<string, { label: string; data: any }> = {
  hero: {
    label: "Hero (kop + afbeelding)",
    data: { eyebrow: "", heading: "Nieuwe kop", text: "Introtekst…", button: { label: "", href: "" }, image: "", imageAlt: "" },
  },
  intro: {
    label: "Introtekst",
    // Kop links, tekst rechts. layout: "center" zet alles gecentreerd.
    data: { eyebrow: "", heading: "Kop", text: "Tekst…", button: { label: "", href: "" }, layout: "" },
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
    // Met een kop: tekst links, waarden als lijst rechts. Zonder kop: een rij kaarten.
    data: { eyebrow: "", heading: "", text: "", button: { label: "", href: "" }, cards: [{ icon: "heart", title: "Titel", text: "Tekst" }] },
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
  heroStatement: {
    label: "Hero met ronde foto",
    data: {
      eyebrow: "De persoonlijke arbodienst",
      heading: "Jouw mensen, onze aandacht",
      highlight: "aandacht",
      text: "Introtekst…",
      button: { label: "Maak een afspraak", href: "/contact" },
      button2: { label: "Bekijk onze diensten", href: "/diensten", style: "outline" },
      image: "", imageAlt: "", badge: "",
    },
  },
  pillars: {
    label: "Diensten per situatie (inhoud uit het menu)",
    data: { eyebrow: "Onze diensten", heading: "Waar kunnen we je mee helpen?", text: "" },
  },
  method: {
    label: "Werkwijze (REACT-model)",
    // kleur per stap: blauw, teal, rood, roze, oranje of indigo.
    data: {
      eyebrow: "Onze werkwijze", heading: "Kop", text: "", button: { label: "", href: "" },
      steps: [{ title: "Results", text: "Tekst", kleur: "blauw" }],
      image: "", imageAlt: "", quote: "",
    },
  },
  values: {
    label: "Waarden met feiten",
    data: {
      eyebrow: "", heading: "Kop", text: "",
      cards: [{ title: "Gezond", text: "Tekst", value: "", valueLabel: "", kleur: "teal" }],
    },
  },
  latestPosts: {
    label: "Nieuwste artikelen",
    data: { eyebrow: "Blog", heading: "Kennis die je verder helpt", text: "", button: { label: "Naar het blog", href: "/blog" }, count: 3 },
  },
  contactDetails: {
    label: "Contactgegevens + formulier",
    data: {
      heading: "Kom met ons in contact!", text: "", phone: "0856205800", phoneDisplay: "085 - 620 58 00",
      email: "info@react2u.nl", address: "Stratumsedijk 29\n5611 NB Eindhoven", formHeading: "Stuur ons een bericht",
    },
  },
};
