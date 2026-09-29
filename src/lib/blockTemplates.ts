import tarievenPagina from "@/content/tarieven.json";

// Default data per bloktype — gebruikt bij "Blok toevoegen" in het admin-paneel.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const BLOCK_TEMPLATES: Record<string, { label: string; data: any }> = {
  hero: {
    label: "Hero (kop + foto van rand tot rand)",
    // imagePosition: "left" of "right". focus: welk deel van de foto in beeld blijft, bv. "30% 40%".
    data: { eyebrow: "", heading: "Nieuwe kop", text: "Introtekst…", button: { label: "", href: "" }, image: "", imageAlt: "", imagePosition: "right", focus: "" },
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
    // imageFit "cover": een foto van rand tot rand naast de tekst. Leeg: een illustratie, heel in beeld.
    data: { eyebrow: "", heading: "Kop", text: "Tekst…", button: { label: "", href: "" }, image: "", imageAlt: "", imagePosition: "right", imageFit: "cover", focus: "" },
  },
  servicesGrid: {
    label: "Dienstenkaarten",
    data: { cards: [{ title: "Dienst", icon: "check", description: "Omschrijving", href: "/" }] },
  },
  ctaBanner: {
    label: "Call-to-action banner",
    // Het blok kent ook `routes` (contactroutes rechts, zie de homepage), maar
    // niet in dit sjabloon: de blokeditor voegt aan een lege lijst een losse
    // tekstregel toe in plaats van een route.
    // image: de foto links; leeg = de vaste contactfoto (iemand aan de telefoon).
    data: { eyebrow: "", heading: "Kop", text: "", buttons: [{ label: "Neem contact op", href: "/contact", style: "accent" }], image: "", imageAlt: "" },
  },
  subSections: {
    label: "Subsecties (verwachtingen)",
    data: { eyebrow: "", heading: "Dit kun je van ons verwachten", intro: "", items: [{ title: "Titel", body: "Tekst…" }] },
  },
  twoColumnLists: {
    label: "Twee kolommen met lijsten",
    data: { eyebrow: "", heading: "", text: "", button: { label: "", href: "" }, columns: [{ title: "Kolom 1", items: ["Item"] }, { title: "Kolom 2", items: ["Item"] }] },
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
    label: "Paginakop voor een doelgroep (foto van rand tot rand)",
    // doelgroep: werkgever of werknemer — dan schuift de foto van het startscherm hierin over.
    data: {
      eyebrow: "De persoonlijke arbodienst",
      heading: "Jouw mensen, onze aandacht",
      highlight: "aandacht",
      text: "Introtekst…",
      button: { label: "Maak een afspraak", href: "/contact" },
      button2: { label: "Bekijk onze diensten", href: "/diensten", style: "outline" },
      image: "", imageAlt: "", badge: "", imagePosition: "right", focus: "", doelgroep: "",
    },
  },
  audienceChoice: {
    label: "Startscherm: splitscreen werkgever | werknemer",
    // Twee helften met elk een paginavullende foto. doelgroep: werkgever of
    // werknemer (voor "Je vorige keuze"). focus: welk deel van de foto in beeld
    // blijft bij het bijsnijden, bv. "30% 25%" (links, bovenin).
    data: {
      eyebrow: "Welkom bij React2u", heading: "Kop", highlight: "", text: "",
      choices: [
        { doelgroep: "werkgever", title: "Ik ben werkgever", text: "Belofte", button: "Bekijk", image: "", focus: "center", href: "/werkgevers" },
        { doelgroep: "werknemer", title: "Ik ben werknemer", text: "Belofte", button: "Bekijk", image: "", focus: "center", href: "/werknemers" },
      ],
      trust: [{ icon: "award", text: "Tekst", href: "" }],
    },
  },
  steps: {
    label: "Stappen (zoals het verzuimprotocol)",
    // badge: wat in de cirkel staat (een letter, "2U" of een nummer). kleur: blauw, teal, rood, oranje, roze of indigo.
    data: {
      anchor: "", eyebrow: "", heading: "Kop", text: "", button: { label: "", href: "" },
      steps: [{ badge: "1", title: "Titel", text: "Tekst", kleur: "blauw" }],
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
      // imageRond: true knipt een rond beeld (het REACT-wiel) uit zijn grijze vierkant.
      image: "", imageAlt: "", imageRond: false, quote: "",
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
  tarieven: {
    label: "Abonnementen en tarieven",
    // Eén blok voor de hele tarievenpagina. casemanagerTarief (getal): zonder
    // tarief blijft de rekenhulp weg. Zie CONTEXT.md, *Tarieven*.
    data: tarievenPagina.blocks[0].data,
  },
};
