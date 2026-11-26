/**
 * Goed om te weten: de onboarding bestaat naast de stappen ook uit tegels per
 * onderwerp, elk met uitleg en de vragen die werkgevers ons stellen (Rens, 26
 * november 2026: "de onboarding van react2u moet ook uit tegels bestaan per
 * onderwerp met uitleg en vragen en antwoorden").
 *
 * Puur, zonder database: negen onderwerpen die een nieuwe klant in de eerste
 * weken nodig heeft, van ziekmelden tot de factuur. De teksten volgen wat de
 * klant elders in de onboarding leest (Welkom, het verzuimprotocol, Wat je wél
 * mag vragen), het basiscontract (lib/contractTekst.ts) en de gidsen op de
 * site (src/content/<slug>.json), zodat we één verhaal vertellen. Geen
 * bedragen: die staan in de offerte en op de prijslijst van het jaar.
 *
 * Elk onderwerp staat als tegel op de hub (OnboardingWeten.tsx) en heeft een
 * eigen pagina (/onboarding/<token>/weten/<slug>, OnboardingWetenPagina.tsx).
 */
import type { DocumentSleutel } from "./onboarding";

export type WetenVraag = { vraag: string; antwoord: string };

export type WetenOnderwerp = {
  /** Het adres: /onboarding/<token>/weten/<slug>. */
  slug: string;
  titel: string;
  /** Eén zin op de tegel. */
  kort: string;
  /** De kleur en de tint van het onderwerp (de stippen van het logo), zoals bij de documenten. */
  kleur: string;
  tint: string;
  /** Het pictogram: één pad in een 24×24-raster, in lijnen. */
  icoon: string;
  /** De uitleg, in alinea's. */
  uitleg: string[];
  /** In het kort: de punten om te onthouden. */
  kern: string[];
  vragen: WetenVraag[];
  /** De stap van de onboarding waar dit onderwerp bij hoort; alleen gelinkt als die stap meegaat. */
  stap?: DocumentSleutel;
  /** De gids op react2u.nl die verder gaat (slug uit lib/gidsen.ts). */
  gids?: string;
  /** Een andere pagina op react2u.nl die verder gaat, als er geen gids is. */
  meer?: { href: string; label: string };
};

/* De pictogrammen, in lijnen, zoals de iconen elders op de onboardingpagina. */
const ICOON = {
  telefoon: "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z",
  persoon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
  kruis: "M12 8v8M8 12h8M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  scherm: "M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 20h8M12 16v4",
  slot: "M7 11V7a5 5 0 0 1 10 0v4M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z",
  agenda: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  route: "M3 17l6-6 4 4 8-8M14 7h7v7",
  schild: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4",
  factuur: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5",
};

/** Het pictogram van het onderdeel Goed om te weten zelf (een opengeslagen boek), voor de kaart op de hub. */
export const WETEN_ICOON = "M2 4h6a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H2zM22 4h-6a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h6z";

export const WETEN: WetenOnderwerp[] = [
  {
    slug: "ziekmelden",
    titel: "Ziek- en herstelmelden",
    kort: "Wat jullie doen op dag één, hoe de melding bij ons binnenkomt en wat er daarna gebeurt.",
    kleur: "#E61674", tint: "#FDECF4",
    icoon: ICOON.telefoon,
    uitleg: [
      "Een medewerker die ziek is, belt zijn leidinggevende, het liefst zo vroeg mogelijk op de eerste dag. Telefonisch, niet via een appje: in het gesprek hoor je hoe lang iemand denkt weg te zijn, wat er overgenomen moet worden en hoe hij bereikbaar is. Zo staat het ook in het verzuimprotocol dat je met je team deelt.",
      "Dezelfde dag meld je de medewerker ziek bij React2u, in de beveiligde omgeving van XpertSuite. Kun je er nog niet in, bel of mail ons dan. Vanaf dat moment loopt het dossier bij ons: we bellen jou meestal eerst voor wat achtergrond en nemen binnen één tot drie werkdagen contact op met de medewerker.",
      "Is de medewerker weer helemaal of voor een deel aan het werk, meld dan ook het herstel. Zo klopt de telling van de weken, en zien we meteen of iemand binnen vier weken opnieuw uitvalt: dan tellen de periodes bij elkaar op.",
    ],
    kern: [
      "Dag één: de medewerker belt jou, jij meldt bij ons.",
      "Vraag naar de duur, de bereikbaarheid en het werk dat nog kan; niet naar de klachten.",
      "Binnen één tot drie werkdagen hebben wij contact met jou en met je medewerker.",
      "Meld ook het herstel, ook als iemand gedeeltelijk begint.",
    ],
    vragen: [
      { vraag: "Hoe meld ik een medewerker ziek?", antwoord: "In XpertSuite, onze beveiligde omgeving, op de dag van de ziekmelding. Heb je nog geen toegang of lukt het niet, bel dan 085 620 58 00 of mail info@react2u.nl; dan zetten wij de melding erin." },
      { vraag: "Moet ik elke ziekmelding doorgeven, ook als iemand één dag ziek is?", antwoord: "Ja. Meld op dag één, ook bij kort verzuim. Is iemand snel weer beter, dan meld je het herstel en is het dossier klaar. Zo blijft het verzuimcijfer kloppen en zien we patronen, zoals frequent kort verzuim, op tijd." },
      { vraag: "Wat als een medewerker zich ziek meldt via een appje of een mail?", antwoord: "Bel terug. Volgens het verzuimprotocol meldt een medewerker zich telefonisch; in dat gesprek stel je de vragen die je nodig hebt voor de planning en de melding. Een appje mag het begin zijn, niet het hele gesprek." },
      { vraag: "Wat vraag ik tijdens de ziekmelding?", antwoord: "Hoe lang iemand denkt afwezig te zijn, of er werk is dat nog wél kan, wat er overgenomen moet worden en hoe hij bereikbaar is. Ook of er sprake is van een arbeidsongeval, regres of een vangnetsituatie. Niet wat iemand mankeert: dat is aan de bedrijfsarts. Het belscript staat in deze onboarding bij Wat je wél mag vragen." },
      { vraag: "Wat gebeurt er na mijn melding?", antwoord: "We bellen jou meestal eerst voor de context en nemen daarna binnen één tot drie werkdagen contact op met je medewerker. Je casemanager bepaalt samen met jullie wat nodig is: even afwachten, begeleiding, of een afspraak bij de bedrijfsarts. Bij spoed plannen we de medewerker meteen in." },
      { vraag: "Hoe meld ik herstel, en wat bij gedeeltelijk herstel?", antwoord: "Ook in XpertSuite, op de dag dat iemand weer begint. Begint je medewerker voor een deel van de uren, geef dan de uren of het percentage door; de ziekmelding loopt dan door tot het volledige herstel. Zo blijft de telling van de weken kloppen voor de Wet verbetering poortwachter." },
      { vraag: "Mijn medewerker wordt ziek tijdens zijn vakantie. Wat nu?", antwoord: "Dan geldt dezelfde regel: hij meldt zich bij jou, jij meldt bij ons. Ziektedagen tijdens de vakantie zijn geen vakantiedagen als de medewerker zich volgens het protocol heeft gemeld. Spreek af hoe jullie contact houden tot hij terug is." },
      { vraag: "Wat als iemand vaak kort ziek is?", antwoord: "Vraag je casemanager om mee te kijken. Frequent kort verzuim is vaak een signaal van iets anders, zoals werkdruk of omstandigheden thuis. Een gesprek met de medewerker, en als dat helpt een preventief consult bij de bedrijfsarts, voorkomt vaak langer verzuim." },
    ],
    stap: "verzuimprotocol",
    gids: "zieke-werknemer",
  },
  {
    slug: "casemanager",
    titel: "Je vaste casemanager",
    kort: "Eén aanspreekpunt dat jullie organisatie kent, het dossier bewaakt en de bedrijfsarts erbij haalt.",
    kleur: "#00A098", tint: "#E5F6F4",
    icoon: ICOON.persoon,
    uitleg: [
      "Elke klant van React2u krijgt een vaste casemanager. Die kent jullie organisatie, houdt contact met jou en met de zieke medewerker, bewaakt de termijnen van de Wet verbetering poortwachter en zorgt dat het dossier compleet is voor UWV. De bedrijfsarts beoordeelt wat je medewerker kan; de casemanager zorgt dat er iets mee gebeurt.",
      "Onze casemanagers werken in taakdelegatie van de bedrijfsarts. Dat betekent dat zij, onder zijn verantwoordelijkheid en met dezelfde geheimhoudingsplicht, een deel van de begeleiding doen: het eerste contact, de vervolggesprekken, het inplannen van het spreekuur. Jij krijgt daarvan wat je nodig hebt voor het werk en de planning, nooit de medische kant.",
      "Heb je een vraag, bel dan altijd eerst je eigen casemanager. Is die er niet, dan helpt het team je verder op 085 620 58 00 of via info@react2u.nl, op werkdagen van 9.00 tot 17.00 uur.",
    ],
    kern: [
      "Eén vaste casemanager voor jullie bedrijf, ook in XpertSuite.",
      "Werkt in taakdelegatie van de bedrijfsarts, met geheimhoudingsplicht.",
      "Bewaakt de termijnen en het dossier; jij blijft eindverantwoordelijk.",
      "Niet bereikbaar? Het team helpt op 085 620 58 00.",
    ],
    vragen: [
      { vraag: "Wat doet de casemanager precies?", antwoord: "Contact houden met jou en je medewerker, de termijnen van de wet bewaken, het spreekuur bij de bedrijfsarts plannen, het advies van de bedrijfsarts vertalen naar afspraken en het dossier compleet houden voor UWV. Kortom: het proces sturen, zodat jij het niet zelf hoeft te bewaken." },
      { vraag: "Hoe vaak heeft de casemanager contact met mijn medewerker?", antwoord: "Binnen één tot drie werkdagen na de ziekmelding, en daarna in een ritme dat past bij het verzuim: van wekelijks tot elke paar weken, en altijd rond de termijnen van de wet. Je ziet de contactmomenten terug in XpertSuite." },
      { vraag: "Krijgt de casemanager medische informatie, en ik dan ook?", antwoord: "De casemanager in taakdelegatie wel, onder dezelfde geheimhoudingsplicht als de bedrijfsarts. Jij niet: je krijgt de beperkingen en mogelijkheden voor werk, de verwachte duur en het advies voor de re-integratie. Dat is genoeg om goed te begeleiden." },
      { vraag: "Wat is het verschil met de bedrijfsarts?", antwoord: "De bedrijfsarts is een arts en beoordeelt de belastbaarheid: wat kan je medewerker lichamelijk en mentaal aan. De casemanager is geen arts en stuurt het proces: contact, termijnen, dossier, afspraken. De een zegt wat kan, de ander zorgt dat het gebeurt." },
      { vraag: "Kan ik zelf ook iemand als casemanager aanwijzen?", antwoord: "De wet vraagt dat werkgever en werknemer bij het plan van aanpak een casemanager aanwijzen. Bij React2u is dat je vaste casemanager; daarnaast kun je een leidinggevende of iemand van HR als contactpersoon aan jullie kant hebben. Leg dat vast in het plan van aanpak." },
      { vraag: "Mijn medewerker heeft geen klik met de casemanager. Wat dan?", antwoord: "Laat het ons weten. Meewerken aan de begeleiding hoort bij de verplichtingen van je medewerker, maar bij een klik- of vertrouwensprobleem kunnen we een andere casemanager toewijzen. Vraag ernaar; het hoort erbij." },
      { vraag: "Wie bel ik bij spoed?", antwoord: "Je eigen casemanager. Niet bereikbaar? Dan het team op 085 620 58 00. Bij spoed en calamiteiten plannen we de medewerker meteen in bij de bedrijfsarts." },
      { vraag: "Kan ik ook zelf de bedrijfsarts bellen?", antwoord: "Ja, over de belastbaarheid, het advies en de voortgang; niet over de diagnose, die krijg je niet. In de praktijk loopt het contact via je casemanager, die de bedrijfsarts erbij haalt als het medisch wordt." },
    ],
    stap: "welkom",
    gids: "casemanager-verzuim",
  },
  {
    slug: "bedrijfsarts",
    titel: "De bedrijfsarts",
    kort: "Wanneer je medewerker bij de bedrijfsarts komt, wat die beoordeelt en wat jij daarvan terugkrijgt.",
    kleur: "#322E83", tint: "#ECEBF5",
    icoon: ICOON.kruis,
    uitleg: [
      "De bedrijfsarts is een geregistreerd medisch specialist die beoordeelt wat een zieke medewerker nog kan, adviseert over herstel en werkhervatting en helpt om uitval te voorkomen. Hij heeft een adviserende rol: jij blijft als werkgever verantwoordelijk voor de begeleiding, met zijn advies in de hand.",
      "Duurt het verzuim langer, of is er een medische reden, dan plant je casemanager een spreekuur. Bij spoed en calamiteiten doen we dat meteen. De bedrijfsarts stelt de probleemanalyse op, geeft het advies voor het plan van aanpak en beschrijft bij elke evaluatie de belastbaarheid. Jij krijgt daarvan het functionele deel: wat kan wel, wat kan niet, hoe lang verwachten we het en welk werk past. Nooit de diagnose of de behandeling.",
      "Onze bedrijfsartsen werken onafhankelijk, volgens de richtlijnen van hun beroepsgroep (NVAB). Twijfelt je medewerker aan een advies, dan kan hij een second opinion vragen bij een andere bedrijfsarts, en elke medewerker kan zonder ziekmelding en zonder jouw medeweten naar het open spreekuur. Beide horen bij het basiscontract.",
    ],
    kern: [
      "Adviseert; jij begeleidt, met zijn advies.",
      "Je krijgt functionele informatie: beperkingen, mogelijkheden, verwachte duur.",
      "Spoed? Dan plannen we de medewerker meteen in.",
      "Second opinion en open spreekuur horen bij het basiscontract.",
    ],
    vragen: [
      { vraag: "Hoe snel kan mijn medewerker bij de bedrijfsarts terecht?", antwoord: "Binnen een paar dagen, en bij een dringende vraag sneller. Het eerste contact na een ziekmelding is met je casemanager; die plant het spreekuur als dat nodig is. Spreekuren kunnen op ons kantoor in Eindhoven of online, en de bedrijfsarts komt op locatie als dat nodig is." },
      { vraag: "Mag de bedrijfsarts zeggen of mijn medewerker echt ziek is?", antwoord: "De bedrijfsarts beoordeelt of er beperkingen zijn door ziekte en wat je medewerker nog kan. Het oordeel gaat over de geschiktheid voor het eigen werk, niet over de diagnose. Twijfel je aan het oordeel, dan kun je een deskundigenoordeel aanvragen bij UWV." },
      { vraag: "Mag mijn medewerker weigeren naar de bedrijfsarts te gaan?", antwoord: "Nee. Meewerken aan de verzuimbegeleiding hoort bij de verplichtingen van je medewerker. Komt hij zonder goede reden niet, dan mag je na een schriftelijke waarschuwing het loon opschorten. Bespreek zo'n stap eerst met je casemanager." },
      { vraag: "Wat is een second opinion, en wie betaalt die?", antwoord: "Twijfelt je medewerker aan het advies van de bedrijfsarts, dan mag hij het laten beoordelen door een bedrijfsarts van een andere arbodienst. Dat recht staat in het basiscontract. De kosten worden één op één aan jou doorbelast (artikel 7.2 van het basiscontract)." },
      { vraag: "Wat is het open spreekuur?", antwoord: "Een spreekuur waar elke medewerker, ook oproepkrachten en uitzendkrachten, zonder ziekmelding en zonder jouw toestemming terechtkan met vragen over gezondheid en werk. Het contact is vertrouwelijk; je medewerker vraagt het zelf aan via mail of telefoon. Het is bedoeld om uitval te voorkomen." },
      { vraag: "Komt de bedrijfsarts ook op de werkplek?", antwoord: "Als hij daar aanleiding toe ziet, ja. Inzicht in de arbeidsomstandigheden en de belasting in het werk helpt bij preventie én bij re-integratie. Hij stemt zo'n bezoek vooraf af met jou en met de medewerker." },
      { vraag: "We komen van een andere arbodienst. Wat gebeurt er met lopende dossiers?", antwoord: "Die nemen we over, zodat er geen termijn wordt gemist. De medewerker met een lopend dossier tekent een machtiging voor de overdracht; wij sturen namens jullie de opdracht naar je vorige arbodienst, en onze bedrijfsarts leest het dossier en plant als dat nodig is een nieuw spreekuur. Je casemanager regelt dit met je." },
      { vraag: "Wat als een medewerker een klacht heeft over de bedrijfsarts of over ons?", antwoord: "Bespreek het eerst met je casemanager. Daarnaast heeft React2u een klachtenregeling, verplicht voor een gecertificeerde arbodienst; die staat op react2u.nl. Een second opinion is er voor twijfel aan een medisch advies, de klachtenregeling voor hoe we werken." },
    ],
    stap: "welkom",
    gids: "bedrijfsarts",
  },
  {
    slug: "xpertsuite",
    titel: "XpertSuite, jullie beveiligde omgeving",
    kort: "Waar je ziek meldt, de voortgang volgt en documenten deelt. En hoe je er wegwijs in wordt.",
    kleur: "#3AA5DD", tint: "#E8F4FB",
    icoon: ICOON.scherm,
    uitleg: [
      "XpertSuite is het verzuimsysteem van React2u. Zodra jullie omgeving is ingericht, meld je er ziek en hersteld, zie je per medewerker de voortgang, de contactmomenten en de adviezen die de bedrijfsarts en je casemanager terugkoppelen, en leg je zelf je gesprekken vast met de notitiefunctie. Documenten voor het re-integratieverslag, zoals het plan van aanpak en de evaluaties, upload je daar ook.",
      "Alle rapportages zijn zichtbaar, behalve medische gegevens en informatie van behandelaren. Die zijn wettelijk niet toegankelijk voor de werkgever; alleen de bedrijfsarts en de casemanager in taakdelegatie zien ze. Communiceer over een medewerker daarom via XpertSuite en niet via gewone e-mail: de omgeving is beveiligd en alles staat bij het dossier. Bellen kan natuurlijk altijd.",
      "Zodra we jullie omgeving hebben ingericht, maken we je wegwijs: op kantoor of online. Je ziet die stap terug onder Zo gaat het verder.",
    ],
    kern: [
      "Ziek- en herstelmelden, voortgang volgen, notities en documenten op één plek.",
      "Jij ziet alles behalve het medische deel.",
      "Communiceer via XpertSuite, niet via gewone e-mail.",
      "We maken je wegwijs, op kantoor of online.",
    ],
    vragen: [
      { vraag: "Wanneer krijg ik toegang?", antwoord: "Zodra we jullie bedrijf, afdelingen en contactpersoon hebben aangemaakt op basis van het inrichtingsformulier. Onder Zo gaat het verder zie je of dat al geregeld is; daarna krijg je je inloggegevens van ons." },
      { vraag: "Hoe meld ik een medewerker ziek in XpertSuite?", antwoord: "Open de medewerker en maak een ziekmelding aan met de eerste ziektedag. Staat de medewerker er nog niet in, bijvoorbeeld omdat hij net in dienst is, bel ons dan; wij voegen hem toe." },
      { vraag: "Wat zie ik wel en wat niet?", antwoord: "Je ziet de voortgang, de contactmomenten, de adviezen van de bedrijfsarts, de afspraken en de documenten van het dossier. Je ziet geen medische gegevens, geen diagnose en geen informatie van behandelaren: die zijn alleen voor de bedrijfsarts en de casemanager in taakdelegatie." },
      { vraag: "Kunnen meerdere collega's in onze omgeving?", antwoord: "Ja, bijvoorbeeld een HR-collega en een leidinggevende. Geef aan je casemanager door wie toegang nodig heeft en voor welke afdelingen; zo ziet iedereen alleen wat bij zijn rol hoort." },
      { vraag: "Wat leg ik zelf vast in XpertSuite?", antwoord: "Je eigen contactmomenten met de medewerker, kort en functioneel: wanneer je sprak, wat jullie afspraken over werk en bereikbaarheid, en wanneer het volgende contact is. Geen medische details, ook niet als je medewerker ze zelf noemt. Zo bouw je het dossier dat UWV later wil zien." },
      { vraag: "Waarom niet gewoon mailen?", antwoord: "Omdat gewone e-mail niet beveiligd is en losstaat van het dossier. In XpertSuite staat je bericht bij de juiste medewerker, zien je casemanager en de bedrijfsarts het meteen, en voldoe je aan de privacyregels. Voor een snelle vraag bel je gewoon." },
      { vraag: "Hoe word ik wegwijs in het systeem?", antwoord: "We plannen een instructie zodra jullie omgeving klaar is, op ons kantoor in Eindhoven of online. Daarna kun je altijd je casemanager bellen met een vraag over het systeem." },
    ],
    stap: "werknemers",
  },
  {
    slug: "privacy",
    titel: "Privacy: wat je mag vragen en vastleggen",
    kort: "Wat je bij een ziekmelding wél vraagt en noteert, wat niet, en wat de bedrijfsarts met je deelt.",
    kleur: "#F19001", tint: "#FEF3E2",
    icoon: ICOON.slot,
    uitleg: [
      "Als werkgever mag je alleen vragen wat nodig is om het verzuim te registreren, de loonbetaling te regelen en de re-integratie te starten: hoe lang iemand denkt afwezig te zijn, of er werk is dat nog wél kan, wat er overgenomen moet worden en hoe hij bereikbaar is. Ook of er sprake is van een arbeidsongeval, regres of een vangnetsituatie.",
      "Wat je niet vraagt, en ook niet vastlegt als je medewerker het uit zichzelf vertelt: wat iemand mankeert, welke klachten of behandeling hij heeft, of hij naar een arts gaat en of hij medicijnen gebruikt. Die informatie is alleen voor de bedrijfsarts en de casemanager in taakdelegatie.",
      "De bedrijfsarts mag wél medische informatie hebben, maar geeft aan jou alleen door of iemand arbeidsgeschikt is, de verwachte duur, de beperkingen en mogelijkheden in functionele termen, en adviezen voor re-integratie of aanpassing van het werk. Dus geen diagnose, maar bijvoorbeeld 'kan niet lang staan' of 'tijdelijk geen klantcontact'.",
    ],
    kern: [
      "Wel: de duur, de bereikbaarheid, het werk dat nog kan, wat overgenomen moet worden.",
      "Niet: klachten, oorzaak, behandeling, medicijnen, artsbezoek.",
      "Noteer neutraal: 'verwacht eind van de week terug', niet 'griep'.",
      "Van de bedrijfsarts krijg je functionele informatie, geen diagnose.",
    ],
    vragen: [
      { vraag: "Mag ik vragen wat mijn medewerker heeft?", antwoord: "Nee, ook niet 'in vertrouwen'. Je mag vragen hoe lang het verzuim naar verwachting duurt, waar iemand bereikbaar is en welk werk overgenomen moet worden. De aard van de ziekte is aan de bedrijfsarts." },
      { vraag: "Mijn medewerker vertelt het zelf. Mag ik het dan opschrijven?", antwoord: "Nee. Luister, toon begrip, maar leg het niet vast: niet in XpertSuite, niet in een mail, niet in een eigen notitie. Noteer alleen functionele en organisatorische informatie, zoals 'verwacht eind van de week terug'." },
      { vraag: "Mag ik vragen of het door het werk komt?", antwoord: "Je mag vragen of er sprake is van een arbeidsongeval, want dat moet je soms melden en het kan gevolgen hebben voor de aansprakelijkheid (regres). Naar de oorzaak van klachten vraag je niet; signalen over werkdruk of een conflict bespreek je met je casemanager of de bedrijfsarts." },
      { vraag: "Mag ik een zieke medewerker thuis bezoeken?", antwoord: "Een bezoek om te vragen hoe het gaat mag, als het past bij jullie verhouding en de medewerker het wil. Controleren of iemand echt ziek is doe je niet: dat is de rol van de bedrijfsarts. Twijfel je, overleg dan met je casemanager." },
      { vraag: "Wat mag ik in het personeelsdossier bewaren?", antwoord: "De ziekmelding en de herstelmelding, de afspraken uit het plan van aanpak, de evaluaties en de functionele adviezen van de bedrijfsarts. Geen medische gegevens. Het medische dossier ligt bij de bedrijfsarts en blijft daar." },
      { vraag: "Wat als een leidinggevende per ongeluk te veel vraagt?", antwoord: "Dat gebeurt, vaak uit bezorgdheid. Leg niets vast wat medisch is en spreek af dat het volgende gesprek via het belscript gaat. Deel Wat je wél mag vragen met je leidinggevenden; het staat als stap in deze onboarding." },
      { vraag: "Hoe gaan jullie zelf met de gegevens om?", antwoord: "React2u is een gecertificeerde arbodienst en werkt volgens een privacyreglement dat op react2u.nl staat. Medische gegevens staan onder verantwoordelijkheid van de bedrijfsarts, gescheiden van wat jij ziet, en gaan alleen met toestemming van de medewerker naar een behandelaar of een opvolgende bedrijfsarts." },
    ],
    stap: "vragen",
  },
  {
    slug: "poortwachter",
    titel: "De Wet verbetering poortwachter",
    kort: "De stappen en termijnen in de eerste twee ziektejaren, wie wat doet en hoe wij ze bewaken.",
    kleur: "#CA152A", tint: "#FBEAEC",
    icoon: ICOON.agenda,
    uitleg: [
      "De Wet verbetering poortwachter schrijft voor wat werkgever en werknemer in de eerste twee ziektejaren doen om terugkeer naar werk mogelijk te maken. Doe je te weinig of te laat, dan kan UWV je bij de WIA-aanvraag tot een jaar langer loon laten doorbetalen: de loonsanctie. De wet maakt geen onderscheid naar grootte; met één medewerker gelden dezelfde stappen.",
      "De grote momenten staan in de tijdlijn in Welkom: de ziekmelding op dag één, de probleemanalyse van de bedrijfsarts, het plan van aanpak dat jij en je medewerker samen maken, de evaluatie elke zes weken, de melding bij UWV in week 42, de eerstejaarsevaluatie in week 52, en de voorbereiding en aanvraag van de WIA rond week 88 tot 91. In week 104 eindigt de loondoorbetaling.",
      "Jij blijft als werkgever eindverantwoordelijk voor de re-integratie en het dossier, maar je hoeft het niet zelf te bewaken. Je casemanager houdt de termijnen in het oog, plant de bedrijfsarts in en zorgt dat elk document op tijd in het dossier staat. Zo bouw je zonder stress het re-integratieverslag dat UWV later toetst.",
    ],
    kern: [
      "Dag één melden, probleemanalyse, plan van aanpak, evaluatie elke zes weken.",
      "Week 42: melding bij UWV. Week 52: eerstejaarsevaluatie.",
      "Week 88 tot 91: de WIA-aanvraag. Week 104: einde loondoorbetaling.",
      "Wij bewaken de termijnen; jij blijft eindverantwoordelijk.",
    ],
    vragen: [
      { vraag: "Wat is een loonsanctie en hoe voorkom ik die?", antwoord: "De verplichting om na twee jaar ziekte het loon maximaal 52 weken langer door te betalen, omdat UWV vindt dat je te weinig aan re-integratie hebt gedaan. Je voorkomt hem met een dossier dat laat zien dat elke stap op tijd is gezet, onderbouwd en vastgelegd. Daar is je casemanager voor." },
      { vraag: "Wat is het plan van aanpak en wie maakt het?", antwoord: "De afspraken tussen jou en je medewerker over het doel, de stappen en de evaluatiemomenten van de re-integratie, op basis van de probleemanalyse van de bedrijfsarts. Jullie maken het samen en ondertekenen het beiden; je casemanager helpt met de opzet en de tekst." },
      { vraag: "Hoe vaak moeten we evalueren?", antwoord: "Minstens elke zes weken bespreken jij en je medewerker hoe het gaat en of het plan bijgesteld moet worden. Leg elk gesprek kort vast in XpertSuite. Je casemanager herinnert je aan het moment." },
      { vraag: "Wat is de 42e-weeksmelding?", antwoord: "De ziekmelding bij UWV als je medewerker 42 weken ziek is. Die doe jij als werkgever, uiterlijk op de eerste werkdag daarna; te laat melden kan een boete opleveren. Wij geven het moment aan." },
      { vraag: "Wat gebeurt er in week 52?", antwoord: "De eerstejaarsevaluatie, het opschudmoment: jij en je medewerker kijken of er concreet zicht is op terugkeer in het eigen of ander werk bij jou. Is dat er niet, dan start uiterlijk zes weken later het tweede spoor. De bedrijfsarts en een arbeidsdeskundige onderbouwen die keuze." },
      { vraag: "Wat als mijn medewerker tussendoor beter wordt?", antwoord: "Dan stopt het traject. Wordt hij binnen vier weken opnieuw ziek, dan tellen de periodes bij elkaar op en loopt de telling gewoon door. Na vier weken volledig werken begint een nieuwe telling. Daarom is herstelmelden zo belangrijk." },
      { vraag: "Hoe lang moet ik loon doorbetalen?", antwoord: "Maximaal 104 weken, minimaal 70 procent en in het eerste jaar nooit minder dan het minimumloon. Veel cao's schrijven meer voor, vaak 100 procent in het eerste jaar. Krijg je een loonsanctie, dan komt daar maximaal 52 weken bij." },
      { vraag: "Wat is een deskundigenoordeel?", antwoord: "Een onafhankelijk oordeel van UWV over een vraag in het traject: zijn de re-integratie-inspanningen voldoende, is het aangeboden werk passend, is de medewerker arbeidsongeschikt? Je vraagt het aan als jij en je medewerker het oneens zijn, of om zeker te weten dat je op koers ligt. Je casemanager helpt bij de aanvraag." },
    ],
    stap: "welkom",
    gids: "wet-verbetering-poortwachter",
  },
  {
    slug: "re-integratie",
    titel: "Re-integratie: spoor 1 en spoor 2",
    kort: "Terug in het eigen werk, ander werk bij jou, of werk bij een andere werkgever. En wie wat doet.",
    kleur: "#0A7A4B", tint: "#E3F6ED",
    icoon: ICOON.route,
    uitleg: [
      "Re-integratie is alles wat jij en je medewerker doen om weer aan het werk te komen. Eerst in het eigen werk of ander passend werk bij jou: het eerste spoor. Lukt dat niet, dan bij een andere werkgever: het tweede spoor. Het tweede spoor start zodra duidelijk is dat terugkeer bij jou niet haalbaar is, en uiterlijk zes weken na de eerstejaarsevaluatie.",
      "De bedrijfsarts beschrijft de belastbaarheid: wat kan je medewerker aan. Een arbeidsdeskundige vertaalt dat naar werk: het eigen werk, aangepast werk, ander werk bij jou of werk elders. Met dat rapport onderbouw je bij UWV waarom je het eerste spoor volhoudt of het tweede start. Je casemanager regelt het onderzoek en bespreekt de uitkomst met je.",
      "React2u Restart begeleidt het tweede spoor: een re-integratiecoach zoekt met je medewerker naar passend werk buiten jullie organisatie, met behoud van het dienstverband tot het zeker is. Jij betaalt de re-integratie; een goed traject is vrijwel altijd goedkoper dan een loonsanctie.",
    ],
    kern: [
      "Spoor 1: eigen of ander werk bij jou. Spoor 2: werk bij een andere werkgever.",
      "Spoor 2 uiterlijk zes weken na de eerstejaarsevaluatie, of eerder als het al duidelijk is.",
      "De bedrijfsarts zegt wat kan; de arbeidsdeskundige vertaalt dat naar werk.",
      "Jij betaalt de re-integratie; een loonsanctie is duurder.",
    ],
    vragen: [
      { vraag: "Wanneer moet het tweede spoor uiterlijk starten?", antwoord: "Zodra duidelijk is dat terugkeer bij jou niet haalbaar is, en in elk geval binnen zes weken na de eerstejaarsevaluatie in week 52. Is al in week 30 duidelijk dat het eigen werk niet meer gaat lukken, dan start je dus eerder." },
      { vraag: "Moet ik een andere functie creëren voor mijn zieke medewerker?", antwoord: "Je hoeft geen nieuwe functie te bedenken, maar je moet wel serieus onderzoeken of bestaand werk passend te maken is, ook door taken te herschikken. Van een grote organisatie verwacht UWV meer dan van een klein bedrijf; een arbeidsdeskundig onderzoek onderbouwt wat redelijk is." },
      { vraag: "Wat is een arbeidsdeskundig onderzoek en wanneer laat ik het doen?", antwoord: "Een onderzoek door een geregistreerde arbeidsdeskundige naar wat je medewerker nog kan en welk werk daarbij past. Je laat het doen zodra de bedrijfsarts aangeeft dat terugkeer in het eigen werk onzeker is, meestal rond week 42 en uiterlijk vóór de eerstejaarsevaluatie. Het heeft een vaste prijs volgens de prijslijst; je casemanager vraagt het voor je aan." },
      { vraag: "Mag ik het tweede spoor stoppen als mijn medewerker herstelt?", antwoord: "Ja. Het tweede spoor is een inspanning naast het eerste, geen eindstation. Kan je medewerker terug in passend werk bij jou, dan rond je het tweede spoor af en leg je dat vast in het plan van aanpak." },
      { vraag: "Wat is het verschil tussen loonopschorting en loonstop?", antwoord: "Loonopschorting gebruik je als je medewerker controlevoorschriften niet naleeft, bijvoorbeeld niet verschijnt bij de bedrijfsarts; het loon volgt alsnog zodra hij weer meewerkt. Een loonstop gebruik je bij het weigeren van passend werk of re-integratie; dat loon vervalt. Beide vragen om een schriftelijke waarschuwing vooraf. Bespreek zo'n stap altijd eerst met je casemanager." },
      { vraag: "Wat als mijn medewerker zelf ergens anders wil gaan werken?", antwoord: "Dat mag, en het is vaak een goed resultaat van het tweede spoor. Een proefplaatsing of detachering bij de nieuwe werkgever kan een tussenstap zijn, met behoud van het dienstverband bij jou tot het zeker is. Leg de afspraken vast in het dossier." },
      { vraag: "Kan ik mijn medewerker tijdens de re-integratie ontslaan?", antwoord: "In de eerste twee ziektejaren geldt een opzegverbod. Na 104 weken, zonder loonsanctie, kun je het dienstverband beëindigen met een ontslagvergunning van UWV of een vaststellingsovereenkomst. Voor de transitievergoeding kun je compensatie aanvragen bij UWV." },
      { vraag: "Wat gebeurt er na twee jaar?", antwoord: "Na 104 weken stopt je loondoorbetaling en beoordeelt UWV de WIA-aanvraag van je medewerker: eerst of jullie genoeg aan re-integratie hebben gedaan, dan de mate van arbeidsongeschiktheid. Het opzegverbod vervalt; je kunt het dienstverband beëindigen met een ontslagvergunning of in overleg, en de transitievergoeding laten compenseren door UWV." },
    ],
    stap: "welkom",
    gids: "re-integratie",
  },
  {
    slug: "preventie",
    titel: "Preventie: voorkomen vóór de ziekmelding",
    kort: "De RI&E, het preventief medisch onderzoek, de preventiemedewerker en het open spreekuur: wat verplicht is en wat wij doen.",
    kleur: "#E61674", tint: "#FDECF4",
    icoon: ICOON.schild,
    uitleg: [
      "Een arbodienst is er niet alleen voor zieke medewerkers. De Arbowet vraagt van elke werkgever met personeel een risico-inventarisatie en -evaluatie (RI&E) met een plan van aanpak, het aanbieden van een preventief medisch onderzoek (PMO) en het aanwijzen van een preventiemedewerker. React2u toetst en adviseert over de RI&E, voert het PMO uit en ondersteunt je preventiemedewerker; dat staat in artikel 3 van het basiscontract.",
      "Het open spreekuur hoort er ook bij: elke medewerker kan zonder ziekmelding en zonder jouw medeweten met een vraag over gezondheid en werk naar de bedrijfsarts. Vaak voorkomt zo'n gesprek een ziekmelding. De bedrijfsarts mag bovendien de werkplek bezoeken en overleggen met je preventiemedewerker of de ondernemingsraad.",
      "Onder de naam React2u Resist helpen we werkgevers met preventie: van de RI&E en het PMO tot training van de preventiemedewerker en advies bij werkdruk. Wil je weten wat voor jullie zinvol is, vraag het je casemanager.",
    ],
    kern: [
      "RI&E met plan van aanpak: verplicht vanaf de eerste medewerker.",
      "PMO: verplicht aanbieden, de medewerker kiest zelf of hij meedoet.",
      "Preventiemedewerker: verplicht; met 25 medewerkers of minder mag je het zelf zijn.",
      "Open spreekuur: vertrouwelijk, zonder ziekmelding, zonder jouw toestemming.",
    ],
    vragen: [
      { vraag: "Is een RI&E verplicht voor een klein bedrijf?", antwoord: "Ja, vanaf de eerste werknemer. Heb je 25 werknemers of minder en gebruik je een erkend branche-instrument, dan hoef je de RI&E niet te laten toetsen; maken en bijhouden moet je hem wel." },
      { vraag: "Hoe vaak moet de RI&E vernieuwd worden?", antwoord: "De wet noemt geen termijn, maar de RI&E moet actueel zijn. Pas hem aan bij elke verandering die de risico's raakt en bespreek hem minstens jaarlijks. Een RI&E van vijf jaar oud zonder wijzigingen zal de Arbeidsinspectie niet als actueel zien." },
      { vraag: "Wie toetst onze RI&E?", antwoord: "Een gecertificeerde kerndeskundige, zoals een hogere veiligheidskundige, een arbeidshygiënist, een arbeids- en organisatiedeskundige of een bedrijfsarts. React2u kan de RI&E toetsen en ook uitvoeren; vraag een offerte via je casemanager." },
      { vraag: "Wat is een PMO en moeten we het aanbieden?", antwoord: "Een preventief medisch onderzoek kijkt naar de gezondheid van je mensen in relatie tot de risico's uit de RI&E. Je bent verplicht het aan te bieden; je medewerker bepaalt zelf of hij meedoet. De uitkomsten gaan individueel naar de medewerker en, als je dat wilt, geanonimiseerd per groep naar jou." },
      { vraag: "Moeten we een preventiemedewerker hebben?", antwoord: "Ja, elke werkgever met personeel. Heb je 25 medewerkers of minder, dan mag je de rol zelf vervullen. De preventiemedewerker werkt mee aan de RI&E, adviseert de OR en de bedrijfsarts en voert arbomaatregelen uit. Wij ondersteunen met training en de deskundigen die je niet in huis hebt." },
      { vraag: "Wat is het open spreekuur?", antwoord: "Een spreekuur waar elke medewerker zonder ziekmelding en zonder jouw medeweten terechtkan bij de bedrijfsarts met vragen over gezondheid en werk. Je medewerker vraagt het zelf aan via mail of telefoon; jij hoort er alleen van als hij dat zelf wil." },
      { vraag: "Wat kan React2u nog meer doen aan preventie?", antwoord: "Werkplekonderzoek, advies bij werkdruk en een arbeidsdeskundig onderzoek zonder lopend verzuim, bijvoorbeeld bij een medewerker die structureel vastloopt. Preventief ingezet voorkomt het vaak dat het tot een ziekmelding komt. Je casemanager denkt graag mee." },
    ],
    gids: "rie",
  },
  {
    slug: "facturen",
    titel: "Facturen, tarieven en afspraken",
    kort: "Wat je betaalt, hoe je factuur eruitziet, wanneer je betaalt, en wat er in het basiscontract staat.",
    kleur: "#00A098", tint: "#E5F6F4",
    icoon: ICOON.factuur,
    uitleg: [
      "De tarieven staan in jullie offerte en op de prijslijst van dit jaar; alle bedragen zijn exclusief btw. De meeste werkgevers kiezen de Verrichtingenbasis: een vaste bijdrage per medewerker per jaar, en daarnaast betaal je per verrichting, zoals een spreekuur of een telefonisch consult. Met Casemanagement Compleet weet je vooraf precies waar je aan toe bent.",
      "Facturen sturen we digitaal naar het e-mailadres dat je in het inrichtingsformulier opgeeft, en je betaalt binnen dertig dagen na de factuurdatum. React2u incasseert niet. Kosten van derden die wij voor je inschakelen, zoals een second opinion, worden één op één doorbelast; dat spreken we vooraf af.",
      "Het basiscontract loopt tot de einddatum die erin staat en wordt daarna telkens met twaalf maanden verlengd, tenzij je uiterlijk drie maanden voor de einddatum per aangetekende brief opzegt. De algemene voorwaarden en het privacyreglement staan op react2u.nl.",
    ],
    kern: [
      "Tarieven: in je offerte en op de prijslijst van dit jaar, exclusief btw.",
      "Factuur digitaal, betalen binnen dertig dagen, geen incasso.",
      "Kosten van derden worden één op één doorbelast, vooraf afgesproken.",
      "Het contract verlengt per twaalf maanden; opzeggen drie maanden voor de einddatum.",
    ],
    vragen: [
      { vraag: "Waar vind ik onze tarieven?", antwoord: "In de offerte die je van ons kreeg en op de prijslijst op react2u.nl. De prijslijst geldt per kalenderjaar; alle bedragen zijn exclusief btw." },
      { vraag: "Wat betekent 'per begonnen kwartier'?", antwoord: "Een telefoontje van tien minuten is één kwartier, een gesprek van twintig minuten zijn er twee. Zo rekenen we de verrichtingen die per kwartier op de prijslijst staan." },
      { vraag: "Naar welk adres gaat de factuur?", antwoord: "Naar het factuuradres en het e-mailadres voor facturen uit het inrichtingsformulier. Wil je een ander adres, een inkoopnummer of een referentie op de factuur, geef dat dan door aan facturatie@react2u.nl of aan je casemanager." },
      { vraag: "Wat als ik een vraag heb over een factuur?", antwoord: "Mail facturatie@react2u.nl met het factuurnummer, of bel je casemanager. We zoeken het uit en passen de factuur aan als dat nodig is." },
      { vraag: "Kan ik automatisch laten incasseren?", antwoord: "Nee. Je betaalt per factuur binnen dertig dagen; een machtiging voor incasso hebben we niet nodig, en we vragen er dus ook niet naar." },
      { vraag: "Welke kosten komen er los bij?", antwoord: "Kosten van derden die wij op grond van een regeling of op jouw verzoek inschakelen, zoals een second opinion bij een andere arbodienst of een verwijzing van de bedrijfsarts. Die worden één op één doorbelast. Daarnaast betaal je per verrichting volgens de prijslijst, tenzij je Casemanagement Compleet hebt." },
      { vraag: "Hoe lang loopt het contract en hoe zeg ik op?", antwoord: "Tot de einddatum in het basiscontract, daarna telkens stilzwijgend met twaalf maanden verlengd. Opzeggen doe je per aangetekende brief, uiterlijk drie maanden voor de einddatum." },
      { vraag: "Waar staan de algemene voorwaarden en het privacyreglement?", antwoord: "Op react2u.nl; de links staan ook onderaan deze onboarding. Bij de ondertekening van het basiscontract heb je ermee ingestemd. Bij strijd met jullie inkoopvoorwaarden gaan de voorwaarden van React2u voor." },
    ],
    stap: "inrichting",
    meer: { href: "/tarieven", label: "De prijslijst op react2u.nl" },
  },
];

export const WETEN_SLUGS = WETEN.map((w) => w.slug);

export function isWeten(s: unknown): s is string {
  return typeof s === "string" && WETEN_SLUGS.includes(s);
}

export function wetenVoor(slug: string): WetenOnderwerp | null {
  return WETEN.find((w) => w.slug === slug) ?? null;
}

/** Het volgnummer van een onderwerp (1 tot en met WETEN.length). */
export function wetenNummer(slug: string): number {
  return WETEN.findIndex((w) => w.slug === slug) + 1;
}

/** Het onderwerp hierna, of null bij het laatste. */
export function wetenNa(slug: string): WetenOnderwerp | null {
  const i = WETEN.findIndex((w) => w.slug === slug);
  return i >= 0 && i < WETEN.length - 1 ? WETEN[i + 1] : null;
}

/** Het onderwerp hiervoor, of null bij het eerste. */
export function wetenVoorgaand(slug: string): WetenOnderwerp | null {
  const i = WETEN.findIndex((w) => w.slug === slug);
  return i > 0 ? WETEN[i - 1] : null;
}

/** Alle tekst van een onderwerp, voor de leestijd. */
function woorden(w: WetenOnderwerp): number {
  return [...w.uitleg, ...w.kern, ...w.vragen.flatMap((v) => [v.vraag, v.antwoord])].join(" ").split(/\s+/).filter(Boolean).length;
}

/** Hoe lang lezen ongeveer duurt, in hele minuten (zo'n 200 woorden per minuut), minstens 1. */
export function leesMinuten(w: WetenOnderwerp): number {
  return Math.max(1, Math.round(woorden(w) / 200));
}

/** Hoeveel vragen er in totaal zijn, voor de tegel op de hub. */
export function aantalVragen(): number {
  return WETEN.reduce((s, w) => s + w.vragen.length, 0);
}
