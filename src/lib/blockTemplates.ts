/* eslint-disable @typescript-eslint/no-explicit-any */
import tarievenPagina from "@/content/tarieven.json";
import werkgeversPagina from "@/content/werkgevers.json";
import werknemersPagina from "@/content/werknemers.json";

/** De data van een blok uit de werknemerspagina, als sjabloon. */
function wn(type: string) {
  return JSON.parse(JSON.stringify(werknemersPagina.blocks.find((b) => b.type === type)?.data ?? {}));
}

/** De data van een blok op de werkgeverspagina, als sjabloon voor een nieuw blok. */
function werkgevers(type: string): any {
  return werkgeversPagina.blocks.find((b) => b.type === type)?.data ?? {};
}

// Default data per bloktype — gebruikt bij "Blok toevoegen" in het admin-paneel.
export const BLOCK_TEMPLATES: Record<string, { label: string; data: any }> = {
  homeSplit: {
    label: "Startpagina: Splitscreen werkgever | werknemer",
    data: {"heading": "React2u, de persoonlijke arbodienst voor werkgevers en werknemers", "choices": [{"doelgroep": "werkgever", "eyebrow": "Voor werkgevers", "title": "Ik ben werkgever", "text": "Grip op verzuim, van preventie tot re-integratie.", "short": "Grip op verzuim", "button": "Naar de werkgeverssite", "href": "/werkgevers", "aria": "Ik ben werkgever, naar de pagina voor werkgevers", "image": "/beeld/home/samen-leren.webp", "alt": "Vier collega’s lachen samen aan een ronde tafel", "focus": "46% 30%"}, {"doelgroep": "werknemer", "eyebrow": "Voor werknemers", "title": "Ik ben werknemer", "text": "Ziek of vastgelopen? We helpen je weer op weg.", "short": "Ziek of vastgelopen?", "button": "Naar de werknemerssite", "href": "/werknemers", "aria": "Ik ben werknemer, naar de pagina voor werknemers", "image": "/beeld/home/samen-buiten.webp", "alt": "Een vrouw en een man wandelen samen in het park", "focus": "50% 20%"}]},
  },
  homeWaarom: {
    label: "Startpagina: Waarom React2u",
    data: {"eyebrow": "Waarom React2u", "heading": "Samen gezond", "highlight": "terug aan het werk.", "text": "Eén vaste casemanager begeleidt werkgever én werknemer, van de eerste ziekmelding tot volledig herstel.", "image": "/beeld/home/aandacht-definitief.webp", "alt": "Een casemanager in gesprek met een werknemer aan tafel", "focus": "30% 40%", "badgeLabel": "Altijd samen", "badgeText": "werkgever én\nwerknemer", "promises": [{"icon": "user", "title": "Eén vast gezicht", "text": "Je casemanager kent jou en je mensen. Je vertelt je verhaal maar één keer."}, {"icon": "phone", "title": "Een mens aan de lijn", "text": "Geen keuzemenu, geen ticketnummer. Gewoon iemand die je helpt."}, {"icon": "shield", "title": "Grip op elke termijn", "text": "Wij bewaken elke stap van de Wet verbetering poortwachter."}, {"icon": "folder", "title": "Alles op één plek", "text": "Afspraken en rapportages in één online dossier."}], "trust": [{"text": "ISO 9001 gecertificeerd"}, {"text": "Persoonlijke arbodienst uit Eindhoven"}]},
  },
  homeSnelNaar: {
    label: "Startpagina: Snel naar",
    data: {"eyebrow": "Snel naar", "heading": "Waar ben je naar op zoek?", "text": "Werkgever, werknemer of op zoek naar een nieuwe baan? Hier vind je de snelste weg.", "cards": [{"tone": "werkgever", "label": "Voor werkgevers", "href": "/werkgevers", "title": "Grip op verzuim, met één vaste casemanager", "links": [{"label": "Onze diensten", "href": "/diensten"}, {"label": "Zo werkt verzuimbegeleiding", "href": "/verzuimbegeleiding-wvp"}, {"label": "Verzuimabonnementen", "href": "/verzuimabonnementen"}], "button": {"label": "Offerte aanvragen", "href": "/contact"}}, {"tone": "werknemer", "label": "Voor werknemers", "href": "/werknemers", "title": "Ziek of vastgelopen?\nWe helpen je verder.", "links": [{"label": "Ziek, wat nu?", "href": "/werknemers"}, {"label": "Het verzuimprotocol", "href": "/verzuimprotocol"}, {"label": "Veelgestelde vragen", "href": "/werknemers#veelgestelde-vragen"}], "button": {"label": "Neem contact op", "href": "/contact"}}, {"tone": "werkzoekende", "label": "Voor werkzoekenden", "href": "/vacatures", "title": "Kom ons team versterken", "links": [{"label": "Vacatures", "href": "/vacatures"}, {"label": "Over React2u", "href": "/over-react2u"}, {"label": "Neem contact op", "href": "/contact"}], "button": {"label": "Bekijk vacatures", "href": "/vacatures"}}]},
  },
  homeContact: {
    label: "Startpagina: Contact",
    data: {"eyebrow": "Contact", "heading": "Een vraag?\nBel gewoon even.", "text": "Je krijgt direct een mens aan de lijn die je verder helpt.", "image": "/beeld/home/even-bellen.webp", "alt": "Een vrouw belt ontspannen met React2u", "focus": "52% 22%", "routes": [{"icon": "phone", "label": "Bellen", "value": "085 620 58 00", "href": "tel:+31856205800"}, {"icon": "mail", "label": "Mailen", "value": "info@react2u.nl", "href": "mailto:info@react2u.nl"}, {"icon": "pin", "label": "Hoofdkantoor", "value": "Stratumsedijk 29, Eindhoven", "href": "https://maps.google.com/?q=Stratumsedijk+29+Eindhoven"}]},
  },
  wgSplit: {
    label: "Werkgevers: Kop werkgever | werknemer (met h1)",
    data: werkgevers("wgSplit"),
  },
  wgWaarom: {
    label: "Werkgevers: Waarom React2u",
    data: werkgevers("wgWaarom"),
  },
  wgDiensten: {
    label: "Werkgevers: Diensten",
    data: werkgevers("wgDiensten"),
  },
  wgWerkwijze: {
    label: "Werkgevers: Poortwachter-tijdlijn",
    data: werkgevers("wgWerkwijze"),
  },
  wgErd: {
    label: "Werkgevers: Eigenrisicodrager (ERD/ZW)",
    data: werkgevers("wgErd"),
  },
  wgStarten: {
    label: "Werkgevers: Zo start je",
    data: werkgevers("wgStarten"),
  },
  wgTarieven: {
    label: "Werkgevers: Tarieven (drie pakketten)",
    data: werkgevers("wgTarieven"),
  },
  wgBewijs: {
    label: "Werkgevers: Klantlogo’s",
    data: werkgevers("wgBewijs"),
  },
  wgVragen: {
    label: "Werkgevers: Veelgestelde vragen",
    data: werkgevers("wgVragen"),
  },
  wgOfferte: {
    label: "Werkgevers: Offerte aanvragen (formulier)",
    data: werkgevers("wgOfferte"),
  },
  wnSplit: { label: "Werknemers: Splitscreen werkgever | werknemer", data: wn("wnSplit") },
  wnInhoud: { label: "Werknemers: Op deze pagina (ankerlinks)", data: wn("wnInhoud") },
  wnWatNu: { label: "Werknemers: Net ziek, eerste stappen", data: wn("wnWatNu") },
  wnTijdlijn: { label: "Werknemers: Je verzuimperiode (tijdlijn)", data: wn("wnTijdlijn") },
  wnRechten: { label: "Werknemers: Rechten en plichten", data: wn("wnRechten") },
  wnPrivacy: { label: "Werknemers: Wie weet wat (privacy)", data: wn("wnPrivacy") },
  wnCasemanager: { label: "Werknemers: Je casemanager", data: wn("wnCasemanager") },
  wnCoaching: { label: "Werknemers: Vastgelopen, coaching", data: wn("wnCoaching") },
  wnVragen: { label: "Werknemers: Veelgestelde vragen", data: wn("wnVragen") },
  wnContact: { label: "Werknemers: Contact en ziek melden", data: wn("wnContact") },
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
    // tarief vergelijkt de rekenhulp alleen de vaste kosten. Zie CONTEXT.md, *Tarieven*.
    data: tarievenPagina.blocks[0].data,
  },
};
