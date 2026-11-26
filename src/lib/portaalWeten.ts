/**
 * Goed om te weten in Mijn React2u (Rens, 26 nov 2026: "zet ook in mijn
 * react2u voor de werknemers"): tegels per onderwerp met uitleg en vragen en
 * antwoorden, nu voor de collega's. Dertien onderwerpen over hoe wij werken,
 * van de ziekmelding tot het portaal zelf; daarnaast leest een collega hier
 * wat de klant in zijn onboarding leest (lib/onboardingWeten.ts, WETEN).
 *
 * Puur, zonder database. De teksten volgen wat er al vastligt: het
 * Welkom-document en het protocol van de onboarding, het basiscontract
 * (lib/contractTekst.ts), de termijnen in lib/poortwachter.ts, de gidsen op
 * de site en de opzet van het portaal in CONTEXT.md. Sinds 26 nov 2026 ook
 * het document "Terminologie en afkortingen" van het team (Rens: "bekijk dit
 * feitelijk en belscript hoeft er niet in"): de tabellen staan in
 * lib/portaalTermen.ts, feitelijk nagelopen, zonder het belspiekbriefje en
 * het voicemailscript. Teksten voor collega's noemen geen namen, geen
 * bedragen en niets over een persoon (zie Weekevaluatie en Waarneming); de
 * anamnesevragen zijn een werkwijze, geen dossier.
 */

import {
  AFED_AANVALLEN, AFED_FYSIEK, AFED_PSYCHISCH, AFED_UNIVERSEEL, AFKORTINGEN, BA_VRAGEN, TERMINOLOGIE, TIJDLIJN, WIA_KLASSEN, WOORDEN_EN,
  type PortaalTabel,
} from "./portaalTermen";

export type PortaalVraag = { vraag: string; antwoord: string };

export type PortaalIcoon =
  | "telefoon" | "agenda" | "slot" | "handdruk" | "labels" | "route" | "wissel" | "portaal"
  | "stappen" | "stethoscoop" | "anamnese" | "procent" | "woordenboek";

export type PortaalOnderwerp = {
  /** Het adres: /admin/weten/<slug>. */
  slug: string;
  titel: string;
  /** Eén zin op de tegel. */
  kort: string;
  /** De kleur en de tint van het onderwerp (de stippen van het logo). */
  kleur: string;
  tint: string;
  icoon: PortaalIcoon;
  uitleg: string[];
  kern: string[];
  /** Tabellen tussen de uitleg en de vragen (lib/portaalTermen.ts). */
  tabellen?: PortaalTabel[];
  vragen: PortaalVraag[];
  /** Het onderwerp uit de onboarding van de klant dat hierbij hoort (slug uit lib/onboardingWeten.ts). */
  klant?: string;
};

export const PORTAAL_WETEN: PortaalOnderwerp[] = [
  {
    slug: "ziekmelding",
    titel: "Zo loopt een ziekmelding bij ons",
    kort: "Van de melding van de werkgever tot het eerste contact met de medewerker, en wie wat doet.",
    kleur: "#E61674", tint: "#FDECF4",
    icoon: "telefoon",
    uitleg: [
      "De werkgever meldt een zieke medewerker op dag één bij ons, in XpertSuite of telefonisch. Volgens het verzuimprotocol dat de klant bij de onboarding kreeg, belt de medewerker eerst zijn leidinggevende; die vraagt alleen naar de verwachte duur, de bereikbaarheid en het werk dat nog kan, niet naar de klachten.",
      "Daarna zijn wij aan zet: meestal bellen we eerst de werkgever voor de context, en binnen één tot drie werkdagen hebben we contact met de medewerker. Zo staat het in het Welkom-document van de onboarding, dus dat is wat de klant verwacht. De casemanager bepaalt samen met werkgever en medewerker wat nodig is: afwachten en contact houden, begeleiding, of een spreekuur bij de bedrijfsarts. Bij spoed en calamiteiten plannen we de medewerker meteen in.",
      "Alles loopt via XpertSuite: de ziekmelding, de contactmomenten, de adviezen en de documenten voor het re-integratieverslag. Herstel en gedeeltelijk herstel meldt de werkgever daar ook, zodat de telling van de weken klopt.",
    ],
    kern: [
      "Dag één: de werkgever meldt bij ons; wij bellen de werkgever en daarna de medewerker.",
      "Binnen één tot drie werkdagen contact met de medewerker; bij spoed meteen de bedrijfsarts.",
      "De casemanager stuurt het proces, de bedrijfsarts beoordeelt de belastbaarheid.",
      "Alles in XpertSuite, niets over een medewerker via gewone e-mail.",
    ],
    vragen: [
      { vraag: "Wat vraag ik de werkgever bij het eerste contact?", antwoord: "De context van het werk: de functie, hoe lang iemand denkt weg te zijn, of er werk is dat nog kan, of er iets speelt op het werk, en of er sprake is van een arbeidsongeval, regres of een vangnetsituatie. Geen medische details: die bespreek je alleen met de medewerker zelf, onder taakdelegatie van de bedrijfsarts." },
      { vraag: "Wanneer plan ik een spreekuur bij de bedrijfsarts?", antwoord: "Als het verzuim volgens de termijn langer duurt, als er een medische noodzaak is, of als de werkgever of de medewerker erom vraagt. Bij spoed en calamiteiten meteen. De bedrijfsarts maakt de probleemanalyse, geeft het advies voor het plan van aanpak en beschrijft bij elke evaluatie de belastbaarheid." },
      { vraag: "Wat weet de medewerker al over ons?", antwoord: "Het verzuimprotocol R-E-A-C-T-2U uit de onboarding van zijn werkgever: rechten en plichten, even je werk bellen, altijd aangeven (duur, bereikbaarheid, werk dat kan), contact met React2u, traject van verzuim met onze geheimhoudingsplicht, en wij zijn er voor jou. Een medewerker weet dus dat wij bellen en dat hij alles met ons kan delen." },
      { vraag: "Wat als de werkgever te laat meldt?", antwoord: "Leg de eerste ziektedag vast zoals hij was en noteer wanneer de melding bij ons binnenkwam. De termijnen van de wet lopen vanaf de eerste ziektedag, niet vanaf de melding; wijs de werkgever erop dat melden op dag één in zijn eigen belang is." },
      { vraag: "Hoe vaak heb ik contact met de medewerker?", antwoord: "In een ritme dat past bij het verzuim: van wekelijks tot elke paar weken, en altijd rond de termijnen van de wet. Dat is wat we de klant op de site en in de onboarding beloven. Leg elk contact kort vast in XpertSuite." },
      { vraag: "Wat als de medewerker niet meewerkt?", antwoord: "Meewerken aan de begeleiding hoort bij de plichten van de medewerker: afspraken met de bedrijfsarts nakomen, passend werk accepteren. Bespreek het eerst met de medewerker, informeer de werkgever functioneel, en adviseer de werkgever over een schriftelijke waarschuwing en daarna loonopschorting of een loonstop. De beslissing daarover is aan de werkgever." },
      { vraag: "Wie neemt de telefoon aan als de casemanager er niet is?", antwoord: "Het team via 085 620 58 00 en info@react2u.nl, op werkdagen van 9.00 tot 17.00 uur. Ben je er een tijd niet, regel dan in Mijn React2u een waarneming: dan weten de waarnemer en het beheer wie je klanten overneemt." },
    ],
    klant: "ziekmelden",
  },
  {
    slug: "poortwachter",
    titel: "De termijnen die wij bewaken",
    kort: "De Wet verbetering poortwachter van week 6 tot week 104, hoe je de weken telt en wat UWV controleert.",
    kleur: "#CA152A", tint: "#FBEAEC",
    icoon: "agenda",
    uitleg: [
      "De Wet verbetering poortwachter schrijft voor wat werkgever en werknemer in de eerste twee ziektejaren doen. Wij bewaken de termijnen voor de klant; de werkgever blijft eindverantwoordelijk en krijgt bij een te dun dossier van UWV een loonsanctie: tot 52 weken langer loon doorbetalen.",
      "De weken tellen vanaf de eerste ziektedag: dag 1 is de eerste ziektedag, week 6 eindigt op dag 42. Uiterlijk in week 6 de probleemanalyse van de bedrijfsarts, uiterlijk in week 8 het plan van aanpak van werkgever en werknemer, daarna minstens elke zes weken een evaluatie, in week 42 de melding bij UWV, in week 52 de eerstejaarsevaluatie, uiterlijk zes weken daarna het tweede spoor als terugkeer bij de eigen werkgever niet haalbaar is, rond week 88 de brief van UWV, in week 91 de eindevaluatie en het actueel oordeel, uiterlijk in week 93 de WIA-aanvraag, en in week 104 het einde van de loondoorbetaling.",
      "De Poortwachter-planner op react2u.nl rekent alle datums uit voor een eerste ziektedag en zet ze in de agenda; de checklist poortwachterdossier noemt de 24 punten die UWV bij de WIA-aanvraag controleert. Handig om een klant naar te verwijzen.",
    ],
    kern: [
      "Week 6 probleemanalyse, week 8 plan van aanpak, daarna elke zes weken evalueren.",
      "Week 42 melding bij UWV (uiterlijk de eerste werkdag erna), week 52 eerstejaarsevaluatie, uiterlijk week 58 het tweede spoor.",
      "Week 88 brief van UWV, week 91 eindevaluatie, week 93 WIA-aanvraag, week 104 einde loondoorbetaling.",
      "Een loonsanctie duurt maximaal 52 weken; een compleet dossier voorkomt hem.",
    ],
    vragen: [
      { vraag: "Hoe tel ik de weken?", antwoord: "Dag 1 is de eerste ziektedag en week n eindigt op dag 7 maal n; 'uiterlijk in week 6' is dus de laatste dag van die week, eerder mag altijd. De 42e-weeksmelding is de uitzondering: uiterlijk op de eerste werkdag nadat de medewerker 42 weken ziek is." },
      { vraag: "Wat als de medewerker tussendoor beter wordt?", antwoord: "Dan stopt het traject. Wordt hij binnen vier weken opnieuw ziek, dan tellen de periodes bij elkaar op en loopt de telling van de weken gewoon door. Na vier weken volledig werken begint een nieuwe telling. Daarom moet de werkgever ook herstel melden." },
      { vraag: "Wat staat er in het plan van aanpak?", antwoord: "Het doel, de stappen en de evaluatiemomenten van de re-integratie, met een casemanager, door werkgever en werknemer ondertekend. Het volgt de probleemanalyse van de bedrijfsarts. Wij helpen met de opzet; de werkgever en de medewerker maken en tekenen het." },
      { vraag: "Wanneer start het tweede spoor?", antwoord: "Zodra duidelijk is dat terugkeer bij de eigen werkgever niet haalbaar is, en in elk geval binnen zes weken na de eerstejaarsevaluatie in week 52. Is dat al in week 30 duidelijk, dan start het eerder. Een arbeidsdeskundig onderzoek onderbouwt de keuze." },
      { vraag: "Wat is een deskundigenoordeel?", antwoord: "Een onafhankelijk oordeel van UWV over een vraag in het traject: zijn de re-integratie-inspanningen voldoende, is het aangeboden werk passend, is de medewerker arbeidsongeschikt? Werkgever of werknemer vraagt het aan bij onenigheid, of om zeker te weten dat het traject op koers ligt; UWV rekent de werkgever er een vast bedrag voor." },
      { vraag: "Wat controleert UWV bij de WIA-aanvraag?", antwoord: "Eerst of werkgever en werknemer genoeg aan re-integratie hebben gedaan, aan de hand van het re-integratieverslag: probleemanalyse, plan van aanpak, evaluaties, eerstejaarsevaluatie, het arbeidsdeskundig rapport bij het tweede spoor, de eindevaluatie en het actueel oordeel. Daarna de mate van arbeidsongeschiktheid. De checklist poortwachterdossier op de site zet die 24 punten op een rij." },
      { vraag: "Welke weken staan er in het Welkom-document van de klant?", antwoord: "De tijdlijn in de onboarding noemt ruimere weken: probleemanalyse in week 6 tot 12, plan van aanpak in week 8 tot 13. Dat document is bewust zo gelaten. Werk zelf naar de uiterste momenten uit de wet, dan zit de klant altijd goed." },
    ],
    klant: "poortwachter",
  },
  {
    slug: "eerste-ziektejaar",
    titel: "Jouw stappen in het eerste ziektejaar",
    kort: "Wat jij als casemanager of taakgedelegeerde doet van dag 1 tot week 52, en wie wat doet bij elke stap.",
    kleur: "#3AA5DD", tint: "#E8F4FB",
    icoon: "stappen",
    uitleg: [
      "De termijnen van de wet staan bij De termijnen die wij bewaken; hier staat wat jij bij elke stap doet. Als casemanager (CM) stuur je het proces: je pakt de melding op, belt de medewerker, plant spreekuren, herinnert werkgever en medewerker aan hun stukken en controleert of alles op tijd in het dossier staat. Als taakgedelegeerde (TD) doe je daarnaast wat de bedrijfsarts aan jou heeft gedelegeerd, zoals de medische anamnese en het nabellen na een afspraak bij een arts.",
      "Het ritme is: dag 1 de melding, binnen drie werkdagen het eerste contact, in week 1 tot 3 het tweede contact, uiterlijk week 6 de probleemanalyse, uiterlijk week 8 het plan van aanpak, daarna elke zes weken evalueren, week 42 de melding bij UWV, tussen week 42 en 52 de belastbaarheid en het arbeidsdeskundig onderzoek, rond week 52 de eerstejaarsevaluatie. Alles in XpertSuite, met de datum erbij.",
      "Twee begrippen uit het tweede halfjaar. De FML (of het inzetbaarheidsprofiel) beschrijft wat iemand aankan, bijvoorbeeld bij lopen, schrijven of concentreren; bij het arbeidsdeskundig onderzoek kijkt de arbeidsdeskundige welk werk daarbij past. Spoor 1 is terugkeer bij de eigen werkgever, spoor 2 is passend werk bij een andere werkgever. Is al eerder duidelijk dat duurzame terugkeer bij de eigen werkgever niet in zicht is, dan kan spoor 2 al vóór week 52 starten.",
    ],
    kern: [
      "CM stuurt het proces; TD doet wat de bedrijfsarts heeft gedelegeerd.",
      "Dag 1 melding, binnen drie werkdagen bellen, week 6 PA, week 8 PvA, elke zes weken evalueren.",
      "Week 42 melding bij UWV; week 42 tot 52 FML en ADO; rond week 52 de eerstejaarsevaluatie.",
      "FML zegt wat iemand aankan, de arbeidsdeskundige welk werk past; spoor 2 kan vóór week 52.",
    ],
    tabellen: [TIJDLIJN],
    vragen: [
      { vraag: "Wat is het verschil tussen CM en TD?", antwoord: "Casemanager is je rol in het proces: contact, termijnen, dossier, spreekuren plannen. Taakgedelegeerde ben je alleen als de bedrijfsarts taken aan jou heeft gedelegeerd en dat is vastgelegd; dan mag je bijvoorbeeld de medische anamnese afnemen en medische informatie vastleggen, onder zijn verantwoordelijkheid en beroepsgeheim. Zonder taakdelegatie vraag je alleen functioneel: wat kan wel, wat kan niet, hoe lang." },
      { vraag: "Wanneer neem ik de medische anamnese af?", antwoord: "Bij het eerste of tweede contact, alleen als TD. Je legt hem vast in het medische dossier in XpertSuite met het MA-formulier en vult hem aan als er iets verandert. Hoe je doorvraagt staat bij Medische anamnese volgens AFED." },
      { vraag: "Wat doe ik als de probleemanalyse niet op tijd klaar kan zijn?", antwoord: "Plan het spreekuur zo vroeg dat de bedrijfsarts vóór het einde van week 6 kan rapporteren, en zet die datum in je agenda zodra het verzuim langer lijkt te duren. Lukt het toch niet, leg dan in het dossier vast waarom en wanneer de PA er wel is; UWV kijkt bij de WIA-aanvraag naar de data in het re-integratieverslag." },
      { vraag: "Wat doe ik rond week 42?", antwoord: "Je geeft de werkgever vooraf een seintje dat de 42e-weeksmelding bij UWV eraan komt en controleert daarna of hij is gedaan: uiterlijk op de eerste werkdag nadat de medewerker 42 weken ziek is, ook als hij al gedeeltelijk werkt. Tegelijk kijk je met de bedrijfsarts of terugkeer in het eigen werk nog realistisch is; zo niet, dan zijn de FML en het arbeidsdeskundig onderzoek de volgende stap." },
      { vraag: "Wanneer meld ik aan voor een arbeidsdeskundig onderzoek?", antwoord: "Zodra de bedrijfsarts aangeeft dat het eigen werk onzeker is, meestal tussen week 42 en 52 en in elk geval vóór de eerstejaarsevaluatie, zodat werkgever en medewerker daar een onderbouwde keuze voor het spoor kunnen maken. De vraag aan de arbeidsdeskundige is: eigen werk, eigen werk met aanpassingen, ander werk bij de eigen werkgever, of spoor 2. Het onderzoek valt onder Restart." },
      { vraag: "Wat gebeurt er bij de eerstejaarsevaluatie?", antwoord: "Werkgever en medewerker vullen het formulier samen in, rond week 52: wat is gedaan, wat ging goed, wat kan beter, en welke afspraken gelden voor het tweede jaar. Dit is het opschudmoment: is er concreet zicht op terugkeer bij de eigen werkgever? Zo niet, dan start spoor 2 uiterlijk zes weken later. Jij zet de evaluatie uit en bewaakt dat ze er is en dat de conclusie in het dossier staat." },
      { vraag: "Mag spoor 2 al vóór week 52 starten?", antwoord: "Ja. Zodra duidelijk is dat duurzame terugkeer bij de eigen werkgever niet in zicht is, kan spoor 2 starten, ook in het eerste jaar. Wachten tot na de eerstejaarsevaluatie terwijl de bedrijfsarts al eerder zei dat het eigen werk niet meer zou lukken, is de meest voorkomende reden voor een loonsanctie." },
    ],
    klant: "re-integratie",
  },
  {
    slug: "bedrijfsarts",
    titel: "Advies vragen aan de bedrijfsarts",
    kort: "De vraagstelling die je vóór het spreekuur stuurt, de vragen die je kunt stellen en wat je met het advies doet.",
    kleur: "#CA152A", tint: "#FBEAEC",
    icoon: "stethoscoop",
    uitleg: [
      "Heb je advies nodig over wat de medewerker aankan en hoe hij weer kan beginnen met werken, stuur de bedrijfsarts dan vóór het spreekuur een korte vraagstelling. Vermeld wat voor werk de medewerker doet, welke taken of uren nu lastig zijn en wat je precies wilt weten. Zo komt er een advies waar werkgever en medewerker mee verder kunnen, in plaats van een algemeen verslag.",
      "De vragen gaan over belastbaarheid en werk: beperkingen bij het eigen werk, gedeeltelijk hervatten, aanpassingen, ander werk binnen de organisatie, het moment om opnieuw te beoordelen. Niet over diagnose of behandeling; dat is aan de bedrijfsarts en blijft in het medische dossier. Zijn advies gaat functioneel naar de werkgever en wordt de basis voor het plan van aanpak of de bijstelling ervan.",
      "Is de medewerker het niet eens met het advies, dan kan hij eerst het gesprek met de bedrijfsarts aangaan en daarna een second opinion vragen bij een bedrijfsarts van een andere arbodienst; werkgever en medewerker kunnen bij UWV een deskundigenoordeel vragen. Die mogelijkheden staan in het basiscontract en bij De termijnen die wij bewaken.",
    ],
    kern: [
      "Vóór het spreekuur een korte vraagstelling: het werk, wat lastig is, wat je wilt weten.",
      "Vraag naar belastbaarheid en werk, nooit naar diagnose of behandeling.",
      "Het advies gaat functioneel naar de werkgever en voedt het plan van aanpak.",
      "Niet eens met het advies: gesprek, second opinion, deskundigenoordeel.",
    ],
    tabellen: [BA_VRAGEN],
    vragen: [
      { vraag: "Wanneer stuur ik een vraagstelling?", antwoord: "Als je advies nodig hebt over wat de medewerker aankan of hoe hij kan hervatten: vóór de probleemanalyse, bij een vervolgspreekuur als de re-integratie stokt, als werkgever en medewerker het niet eens zijn over passend werk, en vóór de FML in de aanloop naar het arbeidsdeskundig onderzoek. Kort en concreet; de bedrijfsarts leest hem vóór het spreekuur." },
      { vraag: "Wat zet ik erin?", antwoord: "Drie dingen: wat voor werk de medewerker doet (functie, taken, uren), wat nu niet of moeilijk lukt, en de vragen waarop je antwoord wilt. Kies uit de lijst de vragen die bij deze casus passen; drie goede vragen werken beter dan alle zeven." },
      { vraag: "Mag ik de bedrijfsarts vragen wat de medewerker heeft?", antwoord: "Nee, en je hebt het ook niet nodig voor de begeleiding. Je vraagt wat iemand kan en niet kan, hoe lang, en wat er nodig is om weer te beginnen. Werk je onder taakdelegatie, dan zie je medische informatie in het medische dossier; die deel je nooit met de werkgever." },
      { vraag: "Wat doe ik met het advies?", antwoord: "Je legt het functionele advies bij de werkgever en de medewerker neer en bespreekt wat het betekent voor de werkafspraken: taken, uren, opbouw, aanpassingen. Dat komt in het plan van aanpak of de bijstelling ervan, met een datum om opnieuw te kijken. Je legt in het dossier vast dat het is besproken." },
      { vraag: "De werkgever is het niet eens met het advies. Wat dan?", antwoord: "Hij kan het bespreken met de bedrijfsarts en zijn vraag toelichten, en als dat niet helpt een deskundigenoordeel bij UWV vragen, bijvoorbeeld over de passendheid van het werk. Zolang er geen ander oordeel is, volgen werkgever en medewerker het advies van de bedrijfsarts; UWV toetst daar later aan." },
      { vraag: "De medewerker is het niet eens met het advies. Wat dan?", antwoord: "Eerst het gesprek met de bedrijfsarts. Dan een second opinion bij een bedrijfsarts van een andere arbodienst; dat recht staat in het basiscontract en de kosten zijn voor de werkgever. Ook hij kan een deskundigenoordeel bij UWV vragen. Leg uit dat het advies over werk gaat, niet over of hij 'echt ziek' is." },
      { vraag: "Wat is het verschil tussen de FML en het inzetbaarheidsprofiel?", antwoord: "Beide beschrijven de belastbaarheid: wat iemand aankan bij bijvoorbeeld zitten, tillen, concentreren en omgaan met werkdruk. De FML is de lijst die UWV zelf gebruikt; het inzetbaarheidsprofiel (IZP) is de variant die veel bedrijfsartsen opstellen voor de arbeidsdeskundige. De arbeidsdeskundige vertaalt ze naar werk." },
    ],
    klant: "bedrijfsarts",
  },
  {
    slug: "anamnese",
    titel: "Medische anamnese volgens AFED",
    kort: "Alleen onder taakdelegatie: hoe je doorvraagt op aard, frequentie, ernst en duur, met voorbeeldvragen in het Nederlands en het Engels.",
    kleur: "#F19001", tint: "#FEF3E2",
    icoon: "anamnese",
    uitleg: [
      "De medische anamnese neem je alleen af als taakgedelegeerde, als de bedrijfsarts die taak aan jou heeft gedelegeerd. Je vraagt naar de belemmeringen, het werk, de behandeling en de afspraken met een arts of specialist, en je legt het vast in het medische dossier in XpertSuite, met het MA-formulier. De werkgever ziet daar niets van; wat hij hoort is functioneel. Zonder taakdelegatie stel je deze vragen niet.",
      "AFED is de kapstok: Aard (wat gebeurt er precies), Frequentie (hoe vaak), Ernst (hoeveel hinder, wat kan niet meer) en Duur (sinds wanneer, hoe lang per keer, hoe lang herstel). De vier universele vragen passen bij vrijwel elke anamnese; de drie tabellen geven voorbeeldvragen voor aanvallen, fysieke klachten en psychische klachten, ook in het Engels voor een medewerker die geen Nederlands spreekt.",
      "In het gesprek mag je gewoon 'klachten' zeggen; in wat je vastlegt en rapporteert gebruik je de taal uit Termen en afkortingen: belemmeringen en beperkingen, functioneel. Zeg vooraf dat alles wat de medewerker over zijn gezondheid vertelt vertrouwelijk is en alleen met de bedrijfsarts wordt besproken, en vraag of hij vrijuit kan praten. Wil hij iets niet vertellen, dan hoeft dat niet; dan is het spreekuur bij de bedrijfsarts de plek.",
    ],
    kern: [
      "Alleen als TD, alleen na delegatie door de bedrijfsarts; vastleggen in het medische dossier.",
      "AFED: aard, frequentie, ernst, duur. Vier universele vragen die altijd kunnen.",
      "Vraag eerst of iemand vrijuit kan praten en zeg dat het vertrouwelijk is.",
      "In het gesprek 'klachten'; in het dossier belemmeringen en beperkingen.",
    ],
    tabellen: [AFED_UNIVERSEEL, AFED_AANVALLEN, AFED_FYSIEK, AFED_PSYCHISCH],
    vragen: [
      { vraag: "Mag ik als casemanager zonder taakdelegatie naar klachten vragen?", antwoord: "Nee. Zonder taakdelegatie vraag je alleen functioneel: wat lukt wel en niet, hoe lang verwacht iemand weg te zijn, zijn er afspraken met een arts, is er werk dat kan. Vertelt de medewerker uit zichzelf meer, dan leg je dat niet vast en zeg je dat de bedrijfsarts dat met hem bespreekt." },
      { vraag: "Waar leg ik de anamnese vast?", antwoord: "In het medische dossier in XpertSuite, met het MA-formulier, onder de bedrijfsarts. Nooit in notities of rapportages die de werkgever kan zien, en nooit in gewone e-mail. De bedrijfsarts leest mee en bepaalt wat er functioneel naar de werkgever gaat." },
      { vraag: "Wanneer neem ik hem af en wanneer vul ik aan?", antwoord: "Bij het eerste of tweede contact, zodra duidelijk is dat het verzuim langer duurt dan een paar dagen. Daarna vul je aan als er iets verandert: een nieuwe afspraak, een andere behandeling, meer of minder belemmeringen. Zo heeft de bedrijfsarts een actueel beeld vóór het spreekuur." },
      { vraag: "De medewerker wil niet over zijn klachten praten. Wat dan?", antwoord: "Dat mag. Hij hoeft alleen te zeggen wat hij wel en niet kan en wanneer hij denkt weer te kunnen werken; medische informatie geeft hij aan de bedrijfsarts. Noteer dat hij het liever met de bedrijfsarts bespreekt en plan het spreekuur. Geen druk, en geen aannames in het dossier." },
      { vraag: "Wat vraag ik bij een bedrijfsongeval?", antwoord: "Wat er is gebeurd, wanneer, en of de werkgever het heeft gemeld: een arbeidsongeval met ziekenhuisopname, blijvend letsel of overlijden moet de werkgever direct melden bij de Nederlandse Arbeidsinspectie. Noteer het als arbeidsongeval in het dossier. Is het letsel veroorzaakt door een derde, dan kan de werkgever de loonkosten op die derde verhalen (regres); noteer dat dus ook." },
      { vraag: "Hoe stel ik de vragen in het Engels?", antwoord: "Gebruik de Engelse kolom van de tabellen; de woorden voor arbodienst, bedrijfsarts en de stappen staan bij Termen en afkortingen. Zeg aan het begin wie je bent en dat alles over gezondheid vertrouwelijk is en niet naar de werkgever gaat. Spreekt iemand ook geen Engels, overleg dan met de bedrijfsarts over een tolk of iemand die het woord voert, en leg vast wie dat was." },
      { vraag: "Wat noteer ik over medicijnen en behandelaren?", antwoord: "Dat de medewerker de voorschriften van zijn eigen behandelaar of specialist volgt en wanneer zijn volgende afspraak is, niet welke medicijnen. Welke interventie loopt en hoe lang die naar verwachting duurt, is voor de bedrijfsarts relevant voor de prognose; leg het vast als interventie met looptijd, zoals in Termen en afkortingen." },
    ],
    klant: "privacy",
  },
  {
    slug: "wia",
    titel: "WIA: wat het is en hoe UWV rekent",
    kort: "Na 104 weken: hoe UWV het percentage arbeidsongeschiktheid bepaalt, en wanneer het WGA of IVA wordt.",
    kleur: "#0A7A4B", tint: "#E3F6ED",
    icoon: "procent",
    uitleg: [
      "De WIA, de Wet werk en inkomen naar arbeidsvermogen, regelt de uitkering na twee jaar ziekte (104 weken) voor wie door ziekte minder kan verdienen. UWV kijkt niet naar de ziekte zelf maar naar het loonverlies: wat kon iemand vóór zijn ziekte verdienen, en wat kan hij nu nog verdienen met werk dat hij aankan. Het verschil, in procenten, is het arbeidsongeschiktheidspercentage. Kon iemand eerst 100 verdienen en nu nog 60, dan is hij 40 procent arbeidsongeschikt.",
      "Onder 35 procent is er geen WIA-uitkering. Van 35 tot 80 procent is het WGA, de regeling Werkhervatting gedeeltelijk arbeidsgeschikten: werken loont, en werk zoeken is een plicht. Vanaf 80 procent hangt het af van de duurzaamheid: WGA als UWV verwacht dat het nog kan verbeteren, IVA, de Inkomensvoorziening volledig arbeidsongeschikten, als de kans op verbetering klein is.",
      "De aanvraag doet de medewerker zelf, uiterlijk in week 93; UWV stuurt hem rond week 88 een brief. Bij de aanvraag levert hij het re-integratieverslag in, met onder meer de probleemanalyse, het plan van aanpak, de evaluaties en het actueel oordeel van de bedrijfsarts. UWV toetst eerst of werkgever en medewerker genoeg aan re-integratie hebben gedaan; pas daarna volgt de beoordeling. Voor de werkgever telt mee: de WGA-uitkering van een ex-medewerker werkt tot tien jaar door in zijn premie of, als eigenrisicodrager WGA, in zijn eigen kosten.",
    ],
    kern: [
      "Na 104 weken; UWV rekent met loonverlies, niet met de ziekte.",
      "Onder 35 procent geen WIA; 35 tot 80 procent WGA; vanaf 80 procent WGA of IVA.",
      "IVA alleen bij volledig én duurzaam: kans op verbetering klein.",
      "Aanvraag door de medewerker uiterlijk week 93, met het re-integratieverslag.",
    ],
    tabellen: [WIA_KLASSEN],
    vragen: [
      { vraag: "Wat betekent 40 procent arbeidsongeschikt?", antwoord: "Dat iemand met het werk dat hij nog aankan 40 procent minder kan verdienen dan vóór zijn ziekte. UWV vergelijkt het oude loon met wat hij in theorie nog kan verdienen in functies die bij zijn belastbaarheid passen; het gaat om kunnen verdienen, niet om wat iemand feitelijk verdient." },
      { vraag: "Wat is het verschil tussen WGA en IVA?", antwoord: "Beide zijn WIA. WGA is voor wie 35 procent of meer arbeidsongeschikt is en nog kan werken of mogelijk herstelt; werken naast de uitkering loont. IVA is voor wie voor 80 procent of meer én duurzaam arbeidsongeschikt is: de kans op verbetering is klein. De IVA-uitkering is hoger en kent geen sollicitatieplicht." },
      { vraag: "Wat als de medewerker minder dan 35 procent arbeidsongeschikt is?", antwoord: "Dan is er geen WIA-uitkering en blijft de opdracht aan werkgever en medewerker om passend werk te vinden, bij de eigen werkgever of elders; de loondoorbetalingsplicht stopt na 104 weken. Vaak houdt de werkgever hem in dienst in aangepast werk; zo niet, dan loopt een ontslag via UWV en komt eventueel de WW in beeld." },
      { vraag: "Wat doet UWV eerst bij de aanvraag?", antwoord: "De poortwachtertoets: hebben werkgever en medewerker genoeg gedaan aan re-integratie? Dat beoordeelt UWV aan het re-integratieverslag. Is het onvoldoende, dan krijgt de werkgever een loonsanctie van maximaal 52 weken en schuift de beoordeling op. Pas als het verslag voldoende is, beoordelen de verzekeringsarts en de arbeidsdeskundige van UWV de belastbaarheid en het loonverlies." },
      { vraag: "Wanneer en hoe vraagt de medewerker de WIA aan?", antwoord: "Rond week 88 krijgt hij een brief van UWV; de aanvraag doet hij zelf uiterlijk in week 93, online met zijn DigiD. Wij helpen hem en de werkgever het re-integratieverslag compleet te maken: het actueel oordeel van de bedrijfsarts (week 91), de eindevaluatie en de stukken uit het dossier. Een onvolledig verslag is de meest voorkomende reden voor vertraging." },
      { vraag: "Wat merkt de werkgever van een WGA-uitkering?", antwoord: "Veel. De werkgever betaalt tot tien jaar mee aan de WGA-uitkering van een ex-medewerker, via de gedifferentieerde premie Werkhervattingskas of, als hij eigenrisicodrager WGA is, rechtstreeks. Een IVA-uitkering telt daar niet in mee. Een geslaagde re-integratie scheelt hem dus veel; daarom is spoor 2 op tijd starten ook financieel belangrijk." },
      { vraag: "Hoe leg ik het uit aan een medewerker die het spannend vindt?", antwoord: "Zeg wat UWV doet en in welke volgorde: eerst het verslag, dan de beoordeling; dat de beoordeling gaat over wat hij nog kan, niet over of hij ziek genoeg is; en dat werken naast een WGA-uitkering loont. Noem geen bedragen en voorspel geen uitkomst; dat is aan UWV. Voor zijn financiële vragen verwijs je naar UWV." },
    ],
  },
  {
    slug: "privacy",
    titel: "Privacy en medische gegevens",
    kort: "Beroepsgeheim en taakdelegatie, wat de werkgever wel en niet krijgt, en wat je doet bij een mogelijk datalek.",
    kleur: "#F19001", tint: "#FEF3E2",
    icoon: "slot",
    uitleg: [
      "De bedrijfsarts heeft een beroepsgeheim, en wie onder zijn taakdelegatie werkt, zoals de casemanager, deelt dat geheim. Medische gegevens blijven bij de bedrijfsarts en in het medische dossier; de werkgever krijgt alleen wat hij nodig heeft voor werk en planning: of de medewerker arbeidsgeschikt is, de verwachte duur, de beperkingen en mogelijkheden in functionele termen, en het advies voor de re-integratie.",
      "Dus geen diagnose, geen behandeling, geen medicijnen, ook niet als de werkgever ernaar vraagt of de medewerker het zelf al verteld heeft. Formuleer functioneel: 'kan niet lang staan', 'tijdelijk geen klantcontact'. De werkgever mag zulke informatie ook zelf niet vastleggen; het document Wat je wél mag vragen uit de onboarding legt hem dat uit, met een belscript.",
      "Communiceer over een medewerker via XpertSuite, niet via gewone e-mail: beveiligd en bij het dossier. React2u is een gecertificeerde arbodienst met een privacyreglement op de site. Een mogelijk datalek melden we binnen drie keer 24 uur aan de klant, zodat die kan beoordelen of een melding bij de Autoriteit Persoonsgegevens nodig is. Zie je iets wat op een datalek lijkt, meld het dan meteen bij het beheer.",
    ],
    kern: [
      "Medisch blijft bij de bedrijfsarts; de werkgever krijgt alleen functionele informatie.",
      "Formuleer functioneel: wat kan wel, wat kan niet, hoe lang.",
      "Over een medewerker alleen via XpertSuite, nooit via gewone e-mail.",
      "Een mogelijk datalek: binnen drie keer 24 uur aan de klant, dus meteen bij het beheer.",
    ],
    vragen: [
      { vraag: "De werkgever vraagt wat de medewerker heeft. Wat zeg ik?", antwoord: "Dat je dat niet mag delen, ook niet in vertrouwen, en dat hij er niets aan heeft: wat hij nodig heeft is wat de medewerker kan en hoe lang het duurt. Geef dat functioneel. Verwijs naar Wat je wél mag vragen in zijn onboarding." },
      { vraag: "Mag ik in een rapportage voor de werkgever medische termen gebruiken?", antwoord: "Nee. Wat de werkgever kan lezen is functioneel. Medische informatie hoort in het medische dossier onder de bedrijfsarts, niet in rapportages of notities die de werkgever in XpertSuite ziet." },
      { vraag: "De medewerker vraagt of ik iets niet aan de werkgever vertel. Wat zeg ik?", antwoord: "Dat medische informatie nooit naar de werkgever gaat; dat is de regel al. Leg uit wat de werkgever wél hoort: beperkingen, mogelijkheden, verwachte duur en het advies voor werk. Dat hoort bij de begeleiding en is geen keuze van de medewerker." },
      { vraag: "Wie mag het medische dossier inzien?", antwoord: "De bedrijfsarts en wie onder zijn taakdelegatie werkt. De medewerker zelf heeft recht op inzage in zijn eigen dossier. Bij een overstap naar een andere bedrijfsarts gaat het dossier alleen met toestemming van de medewerker over: daarvoor is de machtiging in de onboarding." },
      { vraag: "Ik heb iets naar het verkeerde adres gemaild. Wat nu?", antwoord: "Meld het meteen bij het beheer. Een mail met persoonsgegevens aan de verkeerde ontvanger kan een datalek zijn; we beoordelen dan samen of de klant en de Autoriteit Persoonsgegevens geïnformeerd moeten worden, en we vragen de ontvanger de mail te verwijderen." },
      { vraag: "Waarom niet gewoon mailen met de werkgever?", antwoord: "Gewone e-mail is niet beveiligd en staat los van het dossier. In XpertSuite staat het bericht bij de medewerker, ziet de bedrijfsarts het ook, en voldoen we aan de privacyregels. Bellen kan altijd." },
      { vraag: "Waar staat ons privacyreglement?", antwoord: "Op react2u.nl bij de juridische documenten, samen met de algemene voorwaarden en de klachtenregeling. In het basiscontract verwijzen we ernaar; de klant kan het altijd nalezen." },
    ],
    klant: "privacy",
  },
  {
    slug: "basiscontract",
    titel: "Wat we de werkgever beloven",
    kort: "Het basiscontract: open spreekuur, second opinion, klachtenregeling, werkplekbezoek, facturen en opzeggen.",
    kleur: "#322E83", tint: "#ECEBF5",
    icoon: "handdruk",
    uitleg: [
      "Elke klant tekent het basiscontract arbodienstverlening, dat voldoet aan de Arbowet sinds 1 juli 2017. Daarin staat wat de werkgever van ons mag verwachten: verzuimbegeleiding met de bedrijfsarts in een adviserende rol, het toetsen van en adviseren over de RI&E, het preventief medisch onderzoek, aanstellingskeuringen waar dat mag, en het open spreekuur.",
      "Rechten van de medewerker die we garanderen: het open spreekuur zonder ziekmelding en zonder toestemming van de werkgever, de second opinion bij een bedrijfsarts van een andere arbodienst (de kosten worden één op één aan de werkgever doorbelast), de klachtenregeling, en een bedrijfsarts die de werkplek mag bezoeken en met de preventiemedewerker of de ondernemingsraad mag overleggen. De bedrijfsarts werkt onafhankelijk, volgens de richtlijnen van de NVAB.",
      "De zakelijke afspraken: facturen gaan digitaal en worden binnen dertig dagen betaald, we incasseren niet, kosten van derden worden één op één doorbelast, en het contract loopt tot de einddatum en verlengt stilzwijgend met twaalf maanden tenzij de klant uiterlijk drie maanden voor de einddatum aangetekend opzegt. De tarieven staan in de offerte en op de prijslijst van het jaar.",
    ],
    kern: [
      "Open spreekuur, second opinion, klachtenregeling, werkplekbezoek: verplicht en afgesproken.",
      "Facturen binnen dertig dagen, geen incasso, kosten van derden één op één door.",
      "Het contract verlengt per twaalf maanden; opzeggen drie maanden voor de einddatum, aangetekend.",
      "De tarieven staan in de offerte en op de prijslijst; niet zelf rekenen of afspreken.",
    ],
    vragen: [
      { vraag: "Een medewerker is het niet eens met de bedrijfsarts. Wat kan hij?", antwoord: "Eerst het gesprek met de bedrijfsarts. Dan een second opinion bij een bedrijfsarts van een andere arbodienst; dat recht staat in het basiscontract en de kosten gaan naar de werkgever. Bij onenigheid met de werkgever over de re-integratie kan hij of de werkgever een deskundigenoordeel bij UWV aanvragen." },
      { vraag: "Een medewerker wil naar het open spreekuur. Hoe werkt dat?", antwoord: "Hij vraagt het zelf aan via mail of telefoon, zonder ziekmelding en zonder dat de werkgever het hoeft te weten; ook oproepkrachten en uitzendkrachten van de klant mogen komen. Het gaat om preventie, arbeidsomstandigheden en veiligheid, niet om een lopend verzuim. Plan het in bij de bedrijfsarts, het liefst de eigen bedrijfsarts van die klant." },
      { vraag: "Een klant of medewerker heeft een klacht. Wat doe ik?", antwoord: "Luister, los op wat je zelf kunt oplossen en meld het bij het beheer. Daarnaast heeft React2u een klachtenregeling, verplicht voor een gecertificeerde arbodienst; die staat op de site. Verwijs ernaar als de klager er zelf om vraagt of als het niet in een gesprek op te lossen is." },
      { vraag: "Welke kosten mag ik een klant aankondigen?", antwoord: "Alleen wat in zijn offerte of op de prijslijst staat. Kosten van derden, zoals een second opinion of een verwijzing van de bedrijfsarts, worden één op één doorbelast; zeg dat vooraf. Nieuwe prijzen of kortingen spreek je niet zelf af: dat loopt via het beheer en een offerte." },
      { vraag: "Wanneer kan een klant opzeggen?", antwoord: "Per aangetekende brief, uiterlijk drie maanden voor de einddatum in het basiscontract. Zonder opzegging verlengt het contract telkens stilzwijgend met twaalf maanden. Hoort je iets over opzeggen, geef het meteen door aan het beheer." },
      { vraag: "Moet de klant een RI&E en een PMO hebben?", antwoord: "Ja. De Arbowet vraagt van elke werkgever met personeel een RI&E met plan van aanpak, getoetst door een kerndeskundige (behalve bij 25 medewerkers of minder met een erkend branche-instrument), het aanbieden van een preventief medisch onderzoek en een preventiemedewerker. Wij toetsen en adviseren; een offerte daarvoor loopt via het beheer." },
      { vraag: "Wat beloven we over bereikbaarheid?", antwoord: "Op de site en in de onboarding: bellen op werkdagen van 9.00 tot 17.00 uur, een vaste casemanager als eerste aanspreekpunt, het team als die er niet is, en bij spoed meteen de bedrijfsarts. Na een ziekmelding contact met de medewerker binnen één tot drie werkdagen." },
    ],
    klant: "facturen",
  },
  {
    slug: "diensten",
    titel: "Onze zes diensten",
    kort: "Recover, Restart, Resist, Reflex, Ready en Reward: wat elke dienst is en wanneer je hem noemt.",
    kleur: "#00A098", tint: "#E5F6F4",
    icoon: "labels",
    uitleg: [
      "React2u werkt met zes diensten, elk met een eigen naam en kleur, los van elkaar af te nemen. Recover is de kern: verzuimbegeleiding met een vaste casemanager volgens de Wet verbetering poortwachter. Restart is re-integratie in het eerste en tweede spoor als terugkeer in het eigen werk niet lukt. Resist is preventie: de RI&E, het PMO, de preventiemedewerker en gezond aan het werk blijven.",
      "Reflex is voor uitzendbureaus en eigenrisicodragers Ziektewet: we begeleiden zieke flexkrachten, ook na het einde van het dienstverband, en verzorgen de administratie en de besluiten. Ready is HR-advies en arbeidsrecht: contracten, verlof, ontslag bij ziekte. Reward is salarisadministratie door mensen die verzuim kennen, voor een vaste prijs per werknemer per jaar.",
      "Op react2u.nl heeft elke dienst een eigen pagina in zijn eigen kleur, en de gidsen in de kennisbank verwijzen naar de dienst die erbij hoort. Een klant kan met één dienst beginnen en later uitbreiden; de offerte en het basiscontract noemen wat is afgesproken.",
    ],
    kern: [
      "Recover: verzuimbegeleiding. Restart: re-integratie in het eerste en tweede spoor.",
      "Resist: preventie en de preventiemedewerker. Reflex: Ziektewet en de flexbranche.",
      "Ready: HR-advies en arbeidsrecht. Reward: salarisadministratie.",
      "Los af te nemen; wat is afgesproken staat in de offerte.",
    ],
    vragen: [
      { vraag: "Wat zit er in Recover?", antwoord: "Een vaste casemanager in taakdelegatie van de bedrijfsarts, het contact met werkgever en medewerker, het bewaken van de termijnen, het spreekuur en de adviezen van de bedrijfsarts, en het dossier dat klopt voor UWV. De meeste klanten kiezen de Verrichtingenbasis: een vaste bijdrage per medewerker per jaar en betalen per verrichting; Casemanagement Compleet is het alternatief met vooraf vaste kosten." },
      { vraag: "Wanneer komt Restart in beeld?", antwoord: "Zodra duidelijk is dat terugkeer in het eigen werk onzeker is, meestal rond week 42 en uiterlijk zes weken na de eerstejaarsevaluatie: een arbeidsdeskundig onderzoek en, als terugkeer bij de eigen werkgever niet haalbaar is, het tweede spoor met een re-integratiecoach." },
      { vraag: "Wat doet Resist precies?", antwoord: "Preventie vóór de ziekmelding: de RI&E maken of toetsen, het preventief medisch onderzoek, training en ondersteuning van de preventiemedewerker, werkplekonderzoek en advies bij werkdruk. Veel ervan is voor de werkgever verplicht volgens de Arbowet." },
      { vraag: "Voor wie is Reflex?", antwoord: "Uitzendbureaus en andere eigenrisicodragers voor de Ziektewet: zij betalen zelf de uitkering van wie ziek uit dienst gaat en moeten de re-integratie regelen. Wij begeleiden die flexkrachten, ook na het einde van het dienstverband, en verzorgen de administratie en de besluiten, met een vaste casemanager." },
      { vraag: "Wat is het verschil tussen Ready en Reward?", antwoord: "Ready is advies: HR en arbeidsrecht, zoals contracten, verlof en ontslag bij ziekte. Reward is uitvoering: de salarisadministratie, elke periode op tijd en bij ziekte precies goed verwerkt." },
      { vraag: "Een klant vraagt naar een dienst die we niet voor hem doen. Wat dan?", antwoord: "Geef het door aan het beheer: een uitbreiding loopt via een offerte. Noem geen prijzen uit je hoofd; de prijslijst van het jaar en de offerte zijn de bron." },
    ],
  },
  {
    slug: "nieuwe-klant",
    titel: "Een nieuwe klant: van offerte tot live",
    kort: "Brochure, offerte, basiscontract en onboarding, en de checklist waarmee wij een klant inrichten.",
    kleur: "#3AA5DD", tint: "#E8F4FB",
    icoon: "route",
    uitleg: [
      "Een nieuwe klant volgt bij ons een vaste route: een kennismaking, vaak met een persoonlijke brochure, dan een offerte die de klant online tekent, het basiscontract dat hij online tekent, en de onboarding: één persoonlijke link met alles om te starten. Alles staat in het beheer onder Documenten; wat bij een klant ligt staat bovenaan.",
      "De onboarding bestaat uit stappen voor de werkgever (Welkom met onze werkwijze en de tijdlijn, het inrichtingsformulier met bedrijfs- en factuurgegevens, het werknemersbestand voor XpertSuite, en het verzuimprotocol en Wat je wél mag vragen om door te geven aan zijn team) en uit Goed om te weten: negen onderwerpen met uitleg en vragen, van ziekmelden tot de factuur. Wat de klant daar leest, vind je hier onder Wat de klant leest.",
      "Zodra de klant zijn deel heeft gedaan, zijn wij aan zet. De checklist Inrichten bij React2u: de werkgever aanmaken in XpertSuite, de werknemers importeren, de debiteur aanmaken, de vaste casemanager koppelen, bij een overstap de dossiers van de vorige arbodienst ontvangen, en de instructie XpertSuite geven. Is de laatste taak afgevinkt, dan krijgt de klant de mail dat hij live is, met de naam van zijn casemanager.",
    ],
    kern: [
      "Brochure, offerte, basiscontract, onboarding: allemaal online, allemaal onder Documenten.",
      "De klant vult in: inrichting en werknemers; hij leest: Welkom, het protocol, Wat je wél mag vragen.",
      "Wij richten in: XpertSuite, import, debiteur, casemanager, dossiers, instructie.",
      "Laatste taak af: de klant is live en hoort wie zijn casemanager is.",
    ],
    vragen: [
      { vraag: "Wanneer word ik als casemanager aan een klant gekoppeld?", antwoord: "Tijdens de onboarding, als taak op de checklist van het beheer: je naam komt in XpertSuite, op de stamkaart van de klant en in de mail waarmee de klant hoort dat hij live is. Vanaf dat moment ben jij het eerste aanspreekpunt." },
      { vraag: "Wat weet de klant al als hij live gaat?", antwoord: "Hoe een ziekmelding loopt, wat zijn medewerkers doen (het protocol), wat hij wél mag vragen, en de negen onderwerpen van Goed om te weten. Je hoeft dat niet opnieuw uit te leggen; je kunt ernaar verwijzen." },
      { vraag: "Hoe krijgt de klant toegang tot XpertSuite en wie maakt hem wegwijs?", antwoord: "Na het aanmaken van de werkgever in XpertSuite krijgt hij zijn inloggegevens van ons; de instructie is de laatste taak van de checklist, op kantoor of online. Wie dat doet, spreek je af met het beheer." },
      { vraag: "Wat staat er in het werknemersbestand?", antwoord: "De kolommen van het importbestand van XpertSuite: per medewerker naam, geboortedatum, BSN, adres, functie, afdeling, uren en datum in dienst. De klant vult ze online in, plakt ze uit Excel of uploadt het bestand. In het beheer zijn de BSN's gemaskeerd; na de import wist het beheer het bestand. Burgerservicenummers horen niet in een mail." },
      { vraag: "Hoe lang bewaren we de onboarding?", antwoord: "Een jaar na de laatste activiteit gaat de hele onboarding automatisch weg, inclusief wat de klant invulde. Wat je nodig hebt staat dan al in XpertSuite en op de stamkaart." },
      { vraag: "Wat als een klant niet reageert op zijn onboarding?", antwoord: "Na vijf dagen niet geopend of tien dagen stil stuurt het systeem zelf een herinnering, hooguit twee. Het beheer ziet welke onboardings aandacht vragen en kan ook handmatig herinneren of bellen." },
    ],
  },
  {
    slug: "overstap",
    titel: "Overstap van een andere arbodienst",
    kort: "De machtiging die de medewerker online tekent, de opdracht aan de vorige arbodienst en de dossiers die binnenkomen.",
    kleur: "#0A7A4B", tint: "#E3F6ED",
    icoon: "wissel",
    uitleg: [
      "Komt een klant van een andere arbodienst, dan nemen we lopende verzuimdossiers over zodat er geen termijn wordt gemist. Daarvoor is per medewerker met een lopend dossier een machtiging nodig: toestemming om zijn dossier over te dragen aan onze bedrijfsarts.",
      "Dat loopt via het tabblad Werknemer van de onboarding in het beheer. Het beheer vult de vorige arbodienst in en nodigt de medewerkers uit (naam en e-mail, te kiezen uit het werknemersbestand). De medewerker opent zijn persoonlijke link op zijn telefoon, vult zijn gegevens in en tekent online; we leggen het IP-adres en het moment vast. Hij krijgt een bevestiging met de getekende pdf. Papier kan ook.",
      "Daarna verstuurt React2u namens de werkgever de opdracht tot overdracht naar de vorige arbodienst, met alle getekende machtigingen als één pdf, de werkgever in kopie en medisch@react2u.nl als adres voor de dossiers. De vorige arbodienst stuurt ons eerst een lijst van de dossiers en daarna de dossiers zelf; de taak Dossiers ontvangen van de vorige arbodienst staat op de checklist zolang er een vorige arbodienst is. De werkgever ziet hier niets van: medische dossiers gaan nooit via hem.",
    ],
    kern: [
      "Per medewerker met een lopend dossier een machtiging; hij tekent online, met IP-registratie.",
      "Wij sturen namens de werkgever de opdracht naar de vorige arbodienst.",
      "De vorige arbodienst stuurt de lijst en de dossiers naar medisch@react2u.nl.",
      "De werkgever ziet de machtigingen en de dossiers niet.",
    ],
    vragen: [
      { vraag: "Wie nodigt de medewerkers uit om te tekenen?", antwoord: "Het beheer, vanuit het tabblad Werknemer van de onboarding; de werkgever niet. De werkgever weet wel dat het gebeurt: hij heeft ons de vorige arbodienst en de namen gegeven." },
      { vraag: "Wat als een medewerker niet wil tekenen?", antwoord: "Dan gaat zijn dossier niet over en start onze bedrijfsarts opnieuw: een nieuw spreekuur en een nieuwe probleemanalyse. Leg uit waarom de overdracht helpt (geen dubbele onderzoeken, geen gemiste termijn), maar het is zijn keuze." },
      { vraag: "Wat staat er in de machtiging?", antwoord: "Dat de werkgever de arbodienstverlening aan React2u heeft overgedragen en dat de medewerker toestemming geeft om zijn lopende verzuimdossier over te dragen aan onze bedrijfsarts, zodat die genoeg informatie heeft om de begeleiding voort te zetten. Met zijn naam, adres, geboortedatum en BSN, en de belofte dat we vertrouwelijk met zijn gegevens omgaan." },
      { vraag: "Waar komen de dossiers binnen?", antwoord: "Bij medisch@react2u.nl, het adres dat in de opdrachtbrief staat, onder verantwoordelijkheid van de bedrijfsarts. Zodra de lijst en de dossiers binnen zijn, vinkt het beheer de taak af." },
      { vraag: "Kan een klant tussentijds overstappen naar ons?", antwoord: "Dat hangt af van zijn huidige contract: de meeste lopen per jaar met een opzegtermijn. Lopende dossiers kunnen altijd worden overgedragen; wij nemen ze over zonder dat een termijn wordt gemist." },
      { vraag: "De vorige arbodienst stuurt een factuur voor de overdracht. Wat dan?", antwoord: "Die kan naar facturatie@react2u.nl; dat staat in de opdrachtbrief en in de machtiging. Het beheer handelt hem af." },
    ],
    klant: "bedrijfsarts",
  },
  {
    slug: "termen",
    titel: "Termen en afkortingen",
    kort: "Wat CM, TD, PA, PvA, FML en ADO betekenen, hoe je een belemmering benoemt en dezelfde woorden in het Engels.",
    kleur: "#322E83", tint: "#ECEBF5",
    icoon: "woordenboek",
    uitleg: [
      "In het dossier, in het overleg en richting UWV gebruiken we veel afkortingen. De lijst hieronder geeft de betekenis van elke afkorting zoals wij hem gebruiken; een paar zijn eigen aan React2u (STAVAZA, MTBVZ, SOBA), de meeste komen uit de wet en van UWV.",
      "Daarnaast is er onze taal voor wat een medewerker heeft: we schrijven niet over klachten maar over belemmeringen en beperkingen, en we benoemen wat iemand niet kan in plaats van wat hij heeft. De tabel geeft per situatie de formulering voor je notities en rapportages. Richting de werkgever ga je nog een stap verder: die krijgt alleen wat iemand wel en niet kan en hoe lang, zonder aard of oorzaak, ook niet omschreven.",
      "Voor een medewerker die geen Nederlands spreekt staan de belangrijkste woorden ook in het Engels; de Engelse voorbeeldvragen voor de anamnese staan bij Medische anamnese volgens AFED.",
    ],
    kern: [
      "Belemmeringen en beperkingen, geen klachten; benoem wat iemand niet kan.",
      "Richting de werkgever alleen functioneel: wat kan wel, wat niet, hoe lang.",
      "PA in week 6, PvA in week 8; FML zegt wat iemand aankan, ADO welk werk past.",
      "ERD is er voor de Ziektewet én de WGA; PMO is preventief, PAGO periodiek.",
    ],
    tabellen: [AFKORTINGEN, TERMINOLOGIE, WOORDEN_EN],
    vragen: [
      { vraag: "Waarom belemmeringen en niet klachten?", antwoord: "Omdat een belemmering zegt wat iemand niet kan, en dat is waar de begeleiding over gaat: werk, uren, taken. 'Klachten' nodigt uit tot medische details die niet in rapportages horen en die de werkgever niet mag weten. Zo blijft wat je vastlegt functioneel en bruikbaar voor het plan van aanpak." },
      { vraag: "Geldt dat ook in het gesprek met de medewerker?", antwoord: "Nee, in het gesprek praat je gewoon; 'welke klachten heeft u' is een normale vraag, onder taakdelegatie. De tabel gaat over wat je opschrijft en rapporteert. Wat de werkgever leest is nog strikter: alleen functioneel, zonder omschrijving van de oorzaak." },
      { vraag: "Wat is het verschil tussen de PA en het PvA?", antwoord: "De probleemanalyse (PA) is van de bedrijfsarts, uiterlijk in week 6: wat kan de medewerker, wat is de verwachting, welk advies voor terugkeer. Het plan van aanpak (PvA) is van werkgever en medewerker samen, binnen twee weken na de PA en uiterlijk in week 8: de afspraken over taken, uren en evaluatie, met een casemanager." },
      { vraag: "Wat is het verschil tussen PMO en PAGO?", antwoord: "Het PAGO, het periodiek arbeidsgezondheidskundig onderzoek, is het onderzoek dat de Arbowet de werkgever verplicht aan te bieden, gericht op de risico's uit de RI&E. Het PMO, preventief medisch onderzoek, is de bredere variant die daarbovenop kijkt naar leefstijl en gezondheid. Beide bieden we aan onder Resist." },
      { vraag: "ERD: Ziektewet of WGA?", antwoord: "Beide bestaan. Een eigenrisicodrager Ziektewet betaalt zelf de Ziektewet-uitkering van wie ziek uit dienst gaat en regelt de re-integratie; daar is Reflex voor. Een eigenrisicodrager WGA draagt zelf de WGA-uitkering van ex-medewerkers, tot tien jaar. Vraag bij een klant dus welke van de twee hij bedoelt." },
      { vraag: "Wat is GBM en wie stelt het vast?", antwoord: "Geen benutbare mogelijkheden: UWV gebruikt dat voor situaties waarin iemand helemaal niet kan werken, zoals opname in een ziekenhuis of instelling, bedlegerigheid, afhankelijkheid bij de dagelijkse verzorging, of ernstig psychisch niet kunnen functioneren. Dat oordeel is aan de bedrijfsarts; dat iemand anders het woord voert voor de medewerker is op zichzelf geen GBM." },
      { vraag: "Wat is het verschil tussen EJA en EZWb?", antwoord: "De eerstejaarsevaluatie (EJA) is het moment rond week 52 waarop werkgever en medewerker het eerste ziektejaar evalueren en het spoor kiezen. De eerstejaars Ziektewet-beoordeling (EZWb) is iets anders: de toets van UWV na een jaar Ziektewet-uitkering, voor wie geen werkgever meer heeft, of hij met ander werk nog ten minste 65 procent van zijn oude loon kan verdienen." },
    ],
  },
  {
    slug: "portaal",
    titel: "Mijn React2u: weekevaluatie, overleg, ideeën en waarneming",
    kort: "Wat je hier invult, wie het ziet, en hoe het overleg, het ideeënbord en de waarneming werken.",
    kleur: "#E61674", tint: "#FDECF4",
    icoon: "portaal",
    uitleg: [
      "Mijn React2u is jouw plek in het beheer: de weekevaluatie, het CM-overleg, het ideeënbord, de waarneming, je inwerkreis als je nieuw bent, en dit onderdeel. Wat je hier invult is om inzicht te houden en samen te blijven verbeteren, nooit voor beoordeling of salaris.",
      "De weekevaluatie kost twee minuten: zeven cijfers van 1 tot 10 (energie, plezier, het werk paste in de tijd, emotioneel te dragen, loskomen na het werk, kennis, en de week) en een paar open vragen. In de laatste week van de maand komen zes stellingen over toewijding erbij, in de laatste week van het kwartaal de terugblik. Deze week en vorige week staan open; op vrijdagmiddag krijg je een herinnering als je nog niets invulde. Je ziet je eigen verloop op het dashboard en bespreekt hetzelfde verloop in de kwartaalmeeting.",
      "Het CM-overleg is om de week op woensdag van 14.00 tot 15.00 uur; je brengt vooraf punten in, vinkt je eigen actiepunten af en krijgt de notulen per mail. Het ideeënbord laat zien wat er met ideeën en meldingen gebeurt (ingediend, bekeken, opgepakt, gedaan, niet nu); je stemt en reageert. Ben je er een tijd niet, dan regel je bij Waarneming wie je klanten overneemt. Verlof en ziekte zelf gaan via Toeqan, en in het portaal staat niets medisch.",
    ],
    kern: [
      "Weekevaluatie: zeven cijfers, twee minuten, deze week of uiterlijk volgende week.",
      "CM-overleg: om de week op woensdag om 14.00 uur; punten vooraf inbrengen.",
      "Ideeënbord: idee of melding indienen, stemmen, reageren; de status zie je terug.",
      "Waarneming: ik ben er even niet, en wie neemt waar. Verlof en ziekte via Toeqan.",
    ],
    vragen: [
      { vraag: "Wie ziet mijn weekevaluatie?", antwoord: "Jijzelf en het beheer met toegang tot het kwartaaloverzicht. Collega's zien hem niet. In de kwartaalmeeting bespreek je je eigen verloop zelf; het team ziet gemiddelden en thema's, niet jouw antwoorden." },
      { vraag: "Wat gebeurt er met Iets melden of delen?", antwoord: "Het komt op het ideeënbord, één per week, met de eerste regel als titel. Vink je Stuur dit meteen door aan, dan gaat het meteen per mail naar het beheer en blijft het vertrouwelijk, alleen voor het beheer. Is het dringend, bel dan." },
      { vraag: "Wat is het signaal bij twee zware weken?", antwoord: "Geef je twee weken achter elkaar een 4 of lager voor energie of voor tijd, dan krijgt het beheer een seintje met de weken en de schalen, niet met je antwoorden. Zo kan iemand het gesprek met je aangaan voordat het te zwaar wordt." },
      { vraag: "Hoe breng ik een punt in voor het overleg?", antwoord: "Op de pagina CM-overleg, bij het volgende overleg: je punt komt onder Nieuw op de agenda en je kunt het zelf weer weghalen zolang het niet besproken is. Niet besproken punten schuiven door naar het volgende overleg. Bij Dossiers gaat het over werkwijze en afspraken, nooit over een casus." },
      { vraag: "Wat doe ik met een actiepunt op mijn naam?", antwoord: "Het staat op je dashboard tot je het afvinkt op de overlegpagina; over de datum heen telt het als aandacht. De herinnering de werkdag voor het overleg noemt je open actiepunten." },
      { vraag: "Hoe werkt stemmen op het ideeënbord?", antwoord: "Eén stem per idee, niet op je eigen idee en niet op wat al is afgerond; je kunt je stem intrekken. Reageren kan kort; je eigen reactie haal je zelf weg. Verandert de status van jouw idee of reageert iemand, dan zie je dat op je dashboard en krijg je een mail." },
      { vraag: "Ik ben twee weken weg. Wat regel ik?", antwoord: "Bij Waarneming: Ik ben er even niet, van wanneer tot wanneer en wie waarneemt, met een toelichting over het werk. Standaard gaan al je klanten op naam mee; de waarnemer krijgt een mail met de klanten en de toelichting. Je verlof zelf vraag je aan in Toeqan. Niets medisch in de toelichting." },
      { vraag: "Wat is de inwerkreis?", antwoord: "Voor nieuwe collega's: per functie de taken, oefencasussen en mijlpalen van de eerste 30, 60 en 90 dagen, met een buddy. Je ziet hem in het menu en op je dashboard zolang hij aan staat; taken en oefencasussen vink je zelf af, mijlpalen tekent het beheer af." },
    ],
  },
];

export const PORTAAL_WETEN_SLUGS = PORTAAL_WETEN.map((w) => w.slug);

export function isPortaalWeten(s: unknown): s is string {
  return typeof s === "string" && PORTAAL_WETEN_SLUGS.includes(s);
}

export function portaalWetenVoor(slug: string): PortaalOnderwerp | null {
  return PORTAAL_WETEN.find((w) => w.slug === slug) ?? null;
}

export function portaalWetenNa(slug: string): PortaalOnderwerp | null {
  const i = PORTAAL_WETEN.findIndex((w) => w.slug === slug);
  return i >= 0 && i < PORTAAL_WETEN.length - 1 ? PORTAAL_WETEN[i + 1] : null;
}

export function portaalWetenVoorgaand(slug: string): PortaalOnderwerp | null {
  const i = PORTAAL_WETEN.findIndex((w) => w.slug === slug);
  return i > 0 ? PORTAAL_WETEN[i - 1] : null;
}

/** Hoe lang lezen ongeveer duurt, in hele minuten (zo'n 200 woorden per minuut), minstens 1. Ook voor de onderwerpen van de klant; tabellen tellen mee. */
export function leesTijd(w: { uitleg: string[]; kern: string[]; tabellen?: { rijen: string[][] }[]; vragen: { vraag: string; antwoord: string }[] }): number {
  const cellen = (w.tabellen ?? []).flatMap((t) => t.rijen.flat());
  const woorden = [...w.uitleg, ...w.kern, ...cellen, ...w.vragen.flatMap((v) => [v.vraag, v.antwoord])].join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(woorden / 200));
}

/** Alle tabellen van alle onderwerpen, voor de test en het overzicht. */
export function portaalTabellen(): PortaalTabel[] {
  return PORTAAL_WETEN.flatMap((w) => w.tabellen ?? []);
}

export function portaalVragen(): number {
  return PORTAAL_WETEN.reduce((s, w) => s + w.vragen.length, 0);
}
