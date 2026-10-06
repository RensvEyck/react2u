/* eslint-disable @typescript-eslint/no-explicit-any */
import tarievenPagina from "@/content/tarieven.json";
import werkgeversPagina from "@/content/werkgevers.json";
import werknemersPagina from "@/content/werknemers.json";
import certificeringenPagina from "@/content/certificeringen.json";
import inloggenPagina from "@/content/inloggen.json";
import juridischPagina from "@/content/juridische-documenten.json";
import kennismakenPagina from "@/content/kennismaken.json";
import overReact2uPagina from "@/content/over-react2u.json";
import sitemapPagina from "@/content/sitemap.json";
import verzuimprotocolPagina from "@/content/verzuimprotocol.json";
import jeRechtenPagina from "@/content/je-rechten-en-privacy.json";
import jeCasemanagerPagina from "@/content/je-casemanager.json";
import dienstenPagina from "@/content/diensten.json";

/**
 * De data van het eerste blok van dit type op een conceptpagina, als sjabloon
 * voor een nieuw blok. Een kopie, zodat de editor het concept niet aanraakt.
 */
function uit(pagina: { blocks: { type: string; data?: unknown }[] }, type: string): any {
  return JSON.parse(JSON.stringify(pagina.blocks.find((b) => b.type === type)?.data ?? {}));
}

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
    data: {"heading": "React2u, de persoonlijke arbodienst voor werkgevers en werknemers", "choices": [{"doelgroep": "werkgever", "eyebrow": "Voor werkgevers", "title": "Ik ben werkgever", "text": "Grip op verzuim, van preventie tot re-integratie.", "short": "Grip op verzuim", "button": "Naar de werkgeverssite", "href": "/werkgevers", "aria": "Ik ben werkgever, naar de pagina voor werkgevers", "image": "/beeld/home/samen-leren.webp", "alt": "Vier collega’s lachen samen aan een ronde tafel", "focus": "46% 30%"}, {"doelgroep": "werknemer", "eyebrow": "Voor werknemers", "title": "Ik ben werknemer", "text": "Ziek of vastgelopen? We helpen je weer verder.", "short": "Ziek of vastgelopen?", "button": "Naar de werknemerssite", "href": "/werknemers", "aria": "Ik ben werknemer, naar de pagina voor werknemers", "image": "/beeld/home/samen-buiten.webp", "alt": "Een vrouw en een man wandelen samen in het park", "focus": "50% 20%"}]},
  },
  homeWaarom: {
    label: "Startpagina: Waarom React2u",
    data: {"eyebrow": "Waarom React2u", "heading": "Samen gezond", "highlight": "terug aan het werk.", "text": "Eén vaste casemanager begeleidt werkgever én werknemer, van de eerste ziekmelding tot volledig herstel.", "image": "/beeld/home/aandacht-definitief.webp", "alt": "Een casemanager in gesprek met een werknemer aan tafel", "focus": "30% 40%", "badgeLabel": "Altijd samen", "badgeText": "werkgever én\nwerknemer", "promises": [{"icon": "user", "title": "Eén vast gezicht", "text": "Je casemanager kent jou en je mensen. Je vertelt je verhaal maar één keer."}, {"icon": "phone", "title": "Een mens aan de lijn", "text": "Geen keuzemenu, geen ticketnummer. Gewoon iemand die je helpt."}, {"icon": "shield", "title": "Grip op elke termijn", "text": "Wij bewaken elke stap van de Wet verbetering poortwachter."}, {"icon": "folder", "title": "Alles op één plek", "text": "Afspraken en rapportages in één online dossier."}], "trust": [{"text": "ISO 9001 gecertificeerd"}, {"text": "Persoonlijke arbodienst uit Eindhoven"}]},
  },
  homeSnelNaar: {
    label: "Startpagina: Snel naar",
    data: {"eyebrow": "Snel naar", "heading": "Waar ben je naar op zoek?", "text": "Werkgever, werknemer of op zoek naar een nieuwe baan? Hier vind je de snelste weg.", "cards": [{"tone": "werkgever", "label": "Voor werkgevers", "href": "/werkgevers", "title": "Grip op verzuim, met één vaste casemanager", "links": [{"label": "Onze diensten", "href": "/diensten"}, {"label": "Zo werkt verzuimbegeleiding", "href": "/recover"}, {"label": "Verzuimabonnementen", "href": "/verzuimabonnementen"}], "button": {"label": "Offerte aanvragen", "href": "/contact"}}, {"tone": "werknemer", "label": "Voor werknemers", "href": "/werknemers", "title": "Ziek of vastgelopen?\nWe helpen je verder.", "links": [{"label": "Ziek, wat nu?", "href": "/werknemers"}, {"label": "Het verzuimprotocol", "href": "/verzuimprotocol"}, {"label": "Veelgestelde vragen", "href": "/werknemers#veelgestelde-vragen"}], "button": {"label": "Neem contact op", "href": "/contact"}}, {"tone": "werkzoekende", "label": "Voor werkzoekenden", "href": "/vacatures", "title": "Kom ons team versterken", "links": [{"label": "Vacatures", "href": "/vacatures"}, {"label": "Over React2u", "href": "/over-react2u"}, {"label": "Neem contact op", "href": "/contact"}], "button": {"label": "Bekijk vacatures", "href": "/vacatures"}}]},
  },
  homeEenMens: {
    label: "Startpagina: Eén casemanager die je kent. Van dag één tot herstel.",
    data: {"eyebrow": "Waarom React2u", "lines": ["Eén casemanager die je kent.", "Van dag één tot herstel."], "text": "Bij React2u krijg je geen keuzemenu, maar een vaste casemanager die jouw organisatie en je mensen kent. Van de eerste ziektedag tot volledig herstel.", "checks": [{"text": "Geen keuzemenu, je krijgt meteen iemand van ons aan de telefoon"}, {"text": "SBCA en ISO gecertificeerd"}, {"text": "Medische informatie blijft bij de bedrijfsarts"}], "photos": [{"image": "/beeld/home/kring-gesprek.webp", "alt": "Een casemanager in gesprek met een werknemer aan tafel", "focus": "50% 40%"}, {"image": "/beeld/home/kring-samen-scherm.webp", "alt": "Twee collega’s overleggen samen achter een beeldscherm", "focus": "50% 45%"}, {"image": "/beeld/home/kring-werkvloer.webp", "alt": "Twee medewerkers in gesprek op de werkvloer", "focus": "50% 30%"}]},
  },
  homeReis: {
    label: "Startpagina: Zo werkt het (stippenreis)",
    data: {"eyebrow": "Zo werkt het", "heading": "Van gezond blijven tot weer aan de slag", "text": "We zijn er niet alleen bij ziekte. Van preventie en vitaliteit tot re-integratie en loopbaan: één partij, één vast aanspreekpunt.", "steps": [{"icon": "shield", "label": "Voorkomen", "title": "Gezond aan het werk", "text": "Risico-inventarisatie, preventief medisch onderzoek, vitaliteit en trainingen."}, {"icon": "chat", "label": "Signaleren", "title": "Er vroeg bij zijn", "text": "Coaching, een vertrouwenspersoon en hulp als iemand vastloopt, nog vóór uitval."}, {"icon": "heart", "label": "Begeleiden", "title": "Bij ziekte één aanspreekpunt", "text": "Je vaste casemanager, de bedrijfsarts en alle poortwachtertermijnen geregeld."}, {"icon": "route", "label": "Verder", "title": "Terug aan het werk of een nieuwe stap", "text": "Re-integratie, tweede spoor en loopbaanbegeleiding met nieuw perspectief."}], "buttons": [{"label": "Kennismaken", "href": "/contact"}, {"label": "Ziek? Lees wat je moet doen", "href": "/werknemers#wat-nu"}]},
  },
  contactSimpel: {
    label: "Contactpagina: gegevens en formulier",
    data: {"heading": "Contact", "text": "Bel, mail of stuur een bericht. We helpen je graag verder.", "rows": [{"label": "Telefoon", "value": "085 620 58 00", "href": "tel:+31856205800", "sub": "Maandag tot en met vrijdag, 9.00 tot 17.00 uur"}, {"label": "E-mail", "value": "info@react2u.nl", "href": "mailto:info@react2u.nl", "sub": "We reageren binnen één werkdag"}, {"label": "Offerte en kennismaken", "value": "sales@react2u.nl", "href": "mailto:sales@react2u.nl", "sub": ""}, {"label": "Adres", "value": "Stratumsedijk 29\n5611 NB Eindhoven", "href": "https://maps.google.com/?q=Stratumsedijk+29+Eindhoven", "sub": "Bezoek op afspraak"}], "company": ["React2u II B.V.", "KvK 95076824", "Btw NL866991906B01"], "formHeading": "Stuur een bericht", "note": "Deel hier geen medische informatie."},
  },
  dienstLabel: {
    label: "Dienstpagina per label (Resist, Recover, …)",
    data: {"heading": "React2u Recover", "naam": "Recover", "kleur": "#E61674", "tint": "#FDECF4", "label": "Verzuimbegeleiding.", "tagline": "Van ziekmelding tot herstel", "text": "Je vaste casemanager begeleidt elk verzuimdossier volgens de Wet verbetering poortwachter. Jij houdt grip, je werknemer krijgt aandacht.", "checks": ["Casemanagement", "Bedrijfsarts en taakdelegatie", "Poortwachterdossier en UWV", "Online dossier en rapportages", "Verzuimadvies"], "de": "Eén casemanager die je organisatie kent", "intro": ["Als een medewerker ziek wordt, wil je weten waar je aan toe bent. Met React2u Recover heb je één vaste casemanager die je organisatie kent, met je medewerker in gesprek gaat en alles voor je regelt.", "Je casemanager werkt samen met de bedrijfsarts, bewaakt elke termijn en houdt jou op de hoogte. Zo loopt de begeleiding volgens de wet en voelt je medewerker zich gehoord."], "herken": ["Verzuimbegeleiding voelt complex en tijdrovend", "Je weet niet altijd welke termijn eraan komt", "Je hebt steeds met iemand anders te maken", "Je bent bang voor een loonsanctie van het UWV"], "groepen": [{"titel": "Regie op verzuim", "tekst": "Eén casemanager die je organisatie kent.", "items": ["Vaste casemanager", "Verzuimadvies voor leidinggevenden", "Online verzuimdossier, altijd inzichtelijk"]}, {"titel": "Medische begeleiding", "tekst": "Deskundig, dichtbij en snel geregeld.", "items": ["Bedrijfsarts", "Taakdelegatie: praktijkondersteuner bedrijfsarts", "Open spreekuur, ook zonder verzuim"]}, {"titel": "Wet verbetering poortwachter", "tekst": "Elke stap op tijd en volledig.", "items": ["Probleemanalyse en plan van aanpak", "Termijnbewaking en evaluaties", "Melding week 42 en re-integratieverslag"]}, {"titel": "Sneller herstel", "tekst": "De juiste hulp op het juiste moment.", "items": ["Fysiotherapie, psycholoog of coach", "Arbeidsdeskundig advies", "Periodieke verzuimanalyse"]}], "stappen": [{"titel": "Ziekmelding", "tekst": "Je meldt je medewerker ziek, telefonisch of online."}, {"titel": "Eerste contact", "tekst": "Binnen één werkdag belt je casemanager met jou en je medewerker."}, {"titel": "Plan van aanpak", "tekst": "Samen met de bedrijfsarts leggen we de route naar herstel vast."}, {"titel": "Terug aan het werk", "tekst": "We begeleiden de terugkeer en evalueren tot het rond is."}], "waarom": [{"titel": "Vast aanspreekpunt", "tekst": "Geen wisselende gezichten. Je casemanager kent jou en je mensen."}, {"titel": "Poortwachterproof", "tekst": "We bewaken elke termijn en zorgen dat je dossier compleet is voor het UWV."}, {"titel": "Gecertificeerd", "tekst": "SBCA gecertificeerd en ISO 9001, 27001 en 27701 door DNV."}], "ook": [{"naam": "Resist", "wat": "Preventie en vitaliteit", "kleur": "#00A098", "href": "/resist"}, {"naam": "Restart", "wat": "Re-integratie en loopbaan", "kleur": "#F19001", "href": "/restart"}, {"naam": "Reflex", "wat": "Flexbranche en Ziektewet", "kleur": "#3AA5DD", "href": "/reflex"}, {"naam": "Ready", "wat": "HR en arbeidsrecht", "kleur": "#322E83", "href": "/ready"}]},
  },
  homeContact: {
    label: "Startpagina: Contact",
    data: {"eyebrow": "Contact", "heading": "Een vraag?\nBel gewoon even.", "text": "Bel van maandag tot en met vrijdag tussen 9.00 en 17.00 uur, dan neemt een van ons op.", "image": "/beeld/home/even-bellen.webp", "alt": "Een vrouw belt ontspannen met React2u", "focus": "52% 22%", "routes": [{"icon": "phone", "label": "Bellen · ma t/m vr 9.00 tot 17.00 uur", "value": "085 620 58 00", "href": "tel:+31856205800"}, {"icon": "mail", "label": "Mailen", "value": "info@react2u.nl", "href": "mailto:info@react2u.nl"}, {"icon": "pin", "label": "Hoofdkantoor", "value": "Stratumsedijk 29, Eindhoven", "href": "https://maps.google.com/?q=Stratumsedijk+29+Eindhoven"}]},
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

  // Blokken uit het ontwerp van oktober 2026, met de data van de pagina waar
  // ze op staan als sjabloon. Zo kan een redacteur ze ook op een nieuwe
  // pagina zetten.
  dgKop: { label: "Werkgevers/werknemers: paginakop met foto en paneel", data: uit(werkgeversPagina, "dgKop") },
  dgLabels: { label: "Werkgevers: de vijf diensten (labels) met strook", data: uit(werkgeversPagina, "dgLabels") },
  dgSituaties: { label: "Diensten: kies op situatie (vijf labels)", data: uit(dienstenPagina, "dgSituaties") },
  dgFotoLijst: { label: "Werkgevers/werknemers: foto met puntenlijst", data: uit(werkgeversPagina, "dgFotoLijst") },
  dgPoortwachter: { label: "Werkgevers: Wet verbetering poortwachter (tijdlijn)", data: uit(werkgeversPagina, "dgPoortwachter") },
  dgPrijzen: { label: "Werkgevers: tarieven in het kort", data: uit(werkgeversPagina, "dgPrijzen") },
  dgStarten: { label: "Werkgevers: zo start je (overstappen)", data: uit(werkgeversPagina, "dgStarten") },
  dgVragen: { label: "Werkgevers/werknemers: veelgestelde vragen", data: uit(werkgeversPagina, "dgVragen") },
  dgTarieven: { label: "Verzuimabonnementen: abonnementen en tarieven (nieuw ontwerp)", data: uit(tarievenPagina, "dgTarieven") },
  dgCertificeringen: { label: "Certificeringen: keurmerken met uitleg", data: uit(certificeringenPagina, "dgCertificeringen") },
  klantenStrook: { label: "Klantenlogo's (strook)", data: uit(kennismakenPagina, "klantenStrook") },
  klantenAanHetWoord: { label: "Klanten aan het woord", data: uit(kennismakenPagina, "klantenAanHetWoord") },
  kennismaken: { label: "Kennismaken: stappen en offerteformulier", data: uit(kennismakenPagina, "kennismaken") },
  overReact2u: { label: "Over React2u: verhaal, missie, visie en waarden", data: uit(overReact2uPagina, "overReact2u") },
  inloggen: { label: "Inloggen: portalen voor werkgever en werknemer", data: uit(inloggenPagina, "inloggen") },
  juridischeDocumenten: { label: "Juridische documenten (lijst met pdf's)", data: uit(juridischPagina, "juridischeDocumenten") },
  sitemapOverzicht: { label: "Sitemap (overzicht in groepen)", data: uit(sitemapPagina, "sitemapOverzicht") },
  wnKop: { label: "Werknemers: paginakop (kleurvlak met bol)", data: uit(verzuimprotocolPagina, "wnKop") },
  wnStappen: { label: "Werknemers: stappen (na je ziekmelding)", data: uit(verzuimprotocolPagina, "wnStappen") },
  wnKaarten: { label: "Werknemers: kaarten (protocol, rechten)", data: uit(verzuimprotocolPagina, "wnKaarten") },
  wnVragenLijst: { label: "Werknemers: vragen en antwoorden (lijst)", data: uit(verzuimprotocolPagina, "wnVragenLijst") },
  wnContactStrook: { label: "Werknemers: contactstrook onderaan", data: uit(verzuimprotocolPagina, "wnContactStrook") },
  wnTekstKaart: { label: "Werknemers: tekstkaart (geheimhoudingsplicht)", data: uit(jeRechtenPagina, "wnTekstKaart") },
  wnChecklist: { label: "Werknemers: checklist met link", data: uit(jeRechtenPagina, "wnChecklist") },
  wnWaarden: { label: "Werknemers: waar je op kunt rekenen (waarden)", data: uit(jeCasemanagerPagina, "wnWaarden") },
};
