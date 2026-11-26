/**
 * Goed om te weten in Mijn React2u (Rens, 26 nov 2026: "zet ook in mijn
 * react2u voor de werknemers"): tegels per onderwerp met uitleg en vragen en
 * antwoorden, nu voor de collega's. Acht onderwerpen over hoe wij werken, van
 * de ziekmelding tot het portaal zelf; daarnaast leest een collega hier wat
 * de klant in zijn onboarding leest (lib/onboardingWeten.ts, WETEN).
 *
 * Puur, zonder database. De teksten volgen wat er al vastligt: het
 * Welkom-document en het protocol van de onboarding, het basiscontract
 * (lib/contractTekst.ts), de termijnen in lib/poortwachter.ts, de gidsen op
 * de site en de opzet van het portaal in CONTEXT.md. Teksten voor collega's
 * noemen geen namen en niets medisch (zie Weekevaluatie en Waarneming).
 */

export type PortaalVraag = { vraag: string; antwoord: string };

export type PortaalIcoon = "telefoon" | "agenda" | "slot" | "handdruk" | "labels" | "route" | "wissel" | "portaal";

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

/** Hoe lang lezen ongeveer duurt, in hele minuten (zo'n 200 woorden per minuut), minstens 1. Ook voor de onderwerpen van de klant. */
export function leesTijd(w: { uitleg: string[]; kern: string[]; vragen: { vraag: string; antwoord: string }[] }): number {
  const woorden = [...w.uitleg, ...w.kern, ...w.vragen.flatMap((v) => [v.vraag, v.antwoord])].join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(woorden / 200));
}

export function portaalVragen(): number {
  return PORTAAL_WETEN.reduce((s, w) => s + w.vragen.length, 0);
}
