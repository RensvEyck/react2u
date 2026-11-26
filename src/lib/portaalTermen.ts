/**
 * De tabellen van Goed om te weten voor collega's: de afkortingen, de taal
 * voor belemmeringen, de woorden in het Engels, de stappen van het eerste
 * ziektejaar, de vragen aan de bedrijfsarts, de anamnesevragen volgens AFED
 * en de klassen van de WIA.
 *
 * Bron: het document "Terminologie en afkortingen" van het team (26 nov 2026),
 * feitelijk nagelopen: PAGO, WW, UWV, ERD en IZP zijn hier verbeterd, de
 * dubbele AD is weg en GBM is geen synoniem meer voor "iemand anders voert het
 * woord". Het belspiekbriefje en het voicemailscript uit dat document staan
 * hier bewust niet (Rens: "belscript hoeft er niet in"). Geen namen, geen
 * bedragen; de teksten zijn voor collega's.
 */

export type PortaalTabel = {
  titel: string;
  toelichting?: string;
  kolommen: string[];
  rijen: string[][];
  /**
   * De vorm bepaalt de kolombreedtes: "compact" is een korte eerste kolom die
   * ook op een telefoon naast de tweede blijft staan (afkortingen), "tijdlijn"
   * is wanneer / stap / wat jij doet, "vertaling" is onderdeel / Nederlands /
   * Engels. Zonder vorm: twee kolommen, onder elkaar op een telefoon.
   */
  vorm?: "compact" | "tijdlijn" | "vertaling";
};

/** Alfabetisch, met de betekenis zoals wij hem gebruiken. */
export const AFKORTINGEN: PortaalTabel = {
  titel: "Afkortingen",
  toelichting: "Zoals we ze gebruiken in het dossier, in het overleg en richting UWV. STAVAZA, MTBVZ, TBV, TK, VM en SOBA zijn onze eigen korte vormen; de rest komt uit de wet en van UWV.",
  kolommen: ["Afkorting", "Betekenis"],
  vorm: "compact",
  rijen: [
    ["ACTO", "Actueel oordeel van de bedrijfsarts, onderdeel van het re-integratieverslag"],
    ["AD", "Arbeidsdeskundige"],
    ["ADO", "Arbeidsdeskundig onderzoek"],
    ["AO", "Arbeidsongeschikt"],
    ["AVG", "Algemene verordening gegevensbescherming"],
    ["BA", "Bedrijfsarts"],
    ["BO", "Bedrijfsongeval; in de Arbowet heet het een arbeidsongeval"],
    ["CAO", "Collectieve arbeidsovereenkomst"],
    ["CM", "Casemanager"],
    ["EJA", "Eerstejaarsevaluatie, rond week 52"],
    ["ERD", "Eigenrisicodrager, voor de Ziektewet of voor de WGA"],
    ["EZWb", "Eerstejaars Ziektewet-beoordeling door UWV, na een jaar Ziektewet-uitkering"],
    ["FML", "Functionele Mogelijkhedenlijst"],
    ["GBM", "Geen benutbare mogelijkheden"],
    ["HA", "Huisarts"],
    ["IVA", "Inkomensvoorziening Volledig Arbeidsongeschikten, onderdeel van de WIA"],
    ["IZP", "Inzetbaarheidsprofiel"],
    ["MA", "Medische anamnese"],
    ["MI", "Medische informatie"],
    ["MM", "Medische machtiging"],
    ["MTBVZ", "Met terugbelverzoek"],
    ["PA", "Probleemanalyse, van de bedrijfsarts, uiterlijk in week 6"],
    ["PAGO", "Periodiek arbeidsgezondheidskundig onderzoek"],
    ["PMO", "Preventief medisch onderzoek"],
    ["POB", "Praktijkondersteuner bedrijfsarts"],
    ["PSA", "Psychosociale arbeidsbelasting"],
    ["PvA", "Plan van aanpak, van werkgever en werknemer samen, uiterlijk in week 8"],
    ["RI&E", "Risico-inventarisatie en -evaluatie"],
    ["RIV", "Re-integratieverslag"],
    ["SOBA", "Second opinion bedrijfsarts"],
    ["STAVAZA", "Stand van zaken"],
    ["SU", "Spreekuur"],
    ["TBV", "Terugbelverzoek"],
    ["TD", "Taakgedelegeerde: werkt onder taakdelegatie van de bedrijfsarts"],
    ["TK", "Terugkoppeling"],
    ["UWV", "Uitvoeringsinstituut Werknemersverzekeringen"],
    ["VM", "Voicemail"],
    ["VWO", "Verzuimwerkoverleg"],
    ["WG", "Werkgever"],
    ["WGA", "Werkhervatting Gedeeltelijk Arbeidsgeschikten, onderdeel van de WIA"],
    ["WIA", "Wet werk en inkomen naar arbeidsvermogen"],
    ["WN", "Werknemer"],
    ["WVP", "Wet verbetering poortwachter"],
    ["WW", "Werkloosheidswet; de uitkering is een WW-uitkering"],
    ["ZW", "Ziektewet"],
  ],
};

/** Onze taal in notities en rapportages: geen klachten, wel belemmeringen en beperkingen. */
export const TERMINOLOGIE: PortaalTabel = {
  titel: "Zo benoem je een belemmering",
  toelichting: "We schrijven nooit over klachten, altijd over belemmeringen of beperkingen: wat iemand niet kan, niet wat hij heeft. Links de situatie in gewone taal, rechts hoe je het vastlegt.",
  kolommen: ["In gewone taal", "Zo leg je het vast"],
  rijen: [
    ["Corona", "Pandemisch beeld"],
    ["Verscheidene klachten bij elkaar", "Algehele malaise"],
    ["Griep of verkoudheid", "Seizoensgebonden klachten"],
    ["Mentale klachten", "Energetisch belemmerd"],
    ["Arbeids- of werkgerelateerde klachten", "Belemmeringen in de werksfeer"],
    ["Privégerelateerde klachten", "Belemmeringen in de privésfeer"],
    ["Combinatie van werk en privé", "Combinatie van belemmeringen in de werk- en privésfeer"],
    ["Fysieke klachten", "Fysieke belemmeringen"],
    ["Klachten aan het bovenlichaam (arm)", "Belemmering bovenste bewegingsapparaat, zo nodig eenzijdig links of rechts"],
    ["Klachten aan het onderlichaam (been)", "Belemmering onderste bewegingsapparaat, zo nodig eenzijdig links of rechts"],
    ["Trauma, verlies, scheiding", "Ingrijpend life event"],
    ["WN verblijft in een opvang, kliniek of ziekenhuis", "WN verblijft in een instelling of op een verpleegadres"],
    ["WN is verhuisd", "WN verblijft op een ander woonadres"],
    ["WN geeft aan niet te kunnen werken", "WN acht zichzelf niet in staat arbeid te verrichten"],
    ["Medicatie van de huisarts of het ziekenhuis", "WN volgt de voorschriften van de eigen behandelaar of specialist"],
    ["Iemand anders voert het woord voor de WN", "WN laat zich vertegenwoordigen door (wie). Of er geen benutbare mogelijkheden (GBM) zijn, beoordeelt de bedrijfsarts"],
    ["Moeite om emoties te controleren, agressie", "Moeite met emotieregulatie; agressie jegens (wie)"],
    ["Een behandeling die wordt gestart", "Inzetten van een interventie, of intake voor een passende interventie, met de looptijd (bijvoorbeeld vier maanden vanaf heden)"],
  ],
};

/** Voor een medewerker die geen Nederlands spreekt. */
export const WOORDEN_EN: PortaalTabel = {
  titel: "Dezelfde woorden in het Engels",
  toelichting: "Voor een gesprek met een medewerker die geen Nederlands spreekt. De Engelse voorbeeldvragen voor de anamnese staan bij Medische anamnese volgens AFED.",
  kolommen: ["Nederlands", "Engels"],
  rijen: [
    ["Arbodienst", "Occupational health service"],
    ["Bedrijfsarts", "Company doctor"],
    ["Casemanager", "Case manager"],
    ["Arbeidsdeskundige", "Labour expert"],
    ["Huisarts", "GP, family doctor"],
    ["Zich ziekmelden", "To call in sick"],
    ["Eerste ziektedag", "First day off sick"],
    ["Klachten, belemmeringen", "Symptoms, difficulties"],
    ["Doorverwijzing, vervolgafspraak", "Referral, follow-up appointment"],
    ["Probleemanalyse", "Problem analysis"],
    ["Plan van aanpak", "Return-to-work action plan"],
    ["Aangepast werk, uren opbouwen", "Modified duties, building up your hours"],
    ["Wetgeving", "Legislation"],
    ["Wet verbetering poortwachter", "The Dutch rules on returning to work after illness"],
    ["Bedrijfsongeval", "Accident at work"],
    ["Kneuzing, blauwe plek", "Contusion, bruise"],
    ["Botbreuk, haarscheurtje", "Fracture (broken bone), hairline fracture"],
    ["Teen, gebroken teen", "Toe, broken toe"],
    ["Verstuiking, spierverrekking", "Sprain, muscle strain"],
    ["Uit de kom, gescheurde pees", "Dislocated, torn tendon"],
    ["Zwelling, tintelingen", "Swelling, tingling"],
    ["Gips, spalk, krukken", "Cast, splint, crutches"],
  ],
};

/** Wie wat doet in het eerste ziektejaar, met de wettelijke weken (zie ook lib/poortwachter.ts). */
export const TIJDLIJN: PortaalTabel = {
  titel: "Jouw stappen van dag 1 tot week 52",
  toelichting: "De weken tellen vanaf de eerste ziektedag. CM is wat je als casemanager doet; TD alleen als de bedrijfsarts die taak aan jou heeft gedelegeerd.",
  kolommen: ["Wanneer", "Stap", "Wat jij doet"],
  vorm: "tijdlijn",
  rijen: [
    ["Dag 1", "Ziekmelding", "De medewerker meldt zich ziek bij de werkgever. De werkgever legt de eerste ziektedag vast en geeft de melding aan ons door: de wet zegt uiterlijk binnen een week, bij React2u op dag één. Jij pakt de melding op in XpertSuite en controleert de eerste ziektedag."],
    ["Dag 1 tot 3", "Eerste contact", "Je belt de medewerker: wie je bent, waarom je belt en hoe het gaat. Je bespreekt de praktische zaken (bereikbaarheid, werk dat nog kan, afspraken met een arts) en spreekt af wanneer je opnieuw belt."],
    ["Eerste of tweede contact", "Medische anamnese (alleen als TD)", "Heeft de bedrijfsarts die taak aan jou gedelegeerd, dan neem je de medische anamnese af: de belemmeringen, het werk, de behandeling en de afspraken met een arts of specialist. Je legt hem vast in het medische dossier; het MA-formulier staat in XpertSuite."],
    ["Week 1 tot 3", "Tweede contact", "Je belt opnieuw: hoe gaat het en wat is de volgende stap. Als TD neem je de anamnese alsnog af als die er nog niet is, of vul je hem aan als er iets is veranderd."],
    ["Uiterlijk week 6", "Probleemanalyse (PA)", "Lijkt het verzuim langer te duren, dan plan je een spreekuur bij de bedrijfsarts en bewaak je dat de PA op tijd klaar is. De bedrijfsarts spreekt de medewerker, stelt de PA op en adviseert over terugkeer naar werk."],
    ["Uiterlijk week 8", "Plan van aanpak (PvA)", "Werkgever en medewerker maken het PvA samen, binnen twee weken na de PA: met welke taken en uren begint de medewerker, wie is casemanager, wanneer evalueren ze. Jij herinnert ze eraan, controleert of het op tijd is ingevuld en bewaakt daarna de afspraken en termijnen."],
    ["Vanaf het PvA", "Contact houden en voortgang volgen", "Je houdt contact met de medewerker, volgt de werkafspraken op en plant zo nodig een vervolgspreekuur. Als TD kun je volgens je taakdelegatie nabellen na bijvoorbeeld een afspraak bij een arts of fysiotherapeut. Werkgever en medewerker bespreken minstens elke zes weken hoe de re-integratie gaat; jij legt vast dat het gebeurd is."],
    ["Week 42", "Ziekmelding bij UWV", "Is de medewerker nog niet volledig aan het werk, dan doet de werkgever de 42e-weeksmelding bij UWV, uiterlijk op de eerste werkdag nadat de medewerker 42 weken ziek is. Jij geeft de werkgever vooraf een seintje en controleert of de melding is gedaan."],
    ["Week 42 tot 52", "Belastbaarheid en arbeidsdeskundig onderzoek", "Is terugkeer in het eigen werk onzeker, dan plan je een spreekuur: de bedrijfsarts brengt de belastbaarheid in kaart, in een FML of een inzetbaarheidsprofiel. Jij regelt de aanmelding voor het arbeidsdeskundig onderzoek (ADO); de arbeidsdeskundige onderzoekt welk werk bij die belastbaarheid past."],
    ["Rond week 52", "Eerstejaarsevaluatie", "Je zet de eerstejaarsevaluatie uit bij werkgever en medewerker en controleert of het formulier is ingevuld. Zij kijken samen terug: wat is gedaan, wat gaat goed, wat kan beter, en welke afspraken gelden voor het tweede ziektejaar, inclusief de keuze voor het spoor."],
    ["Na week 52", "Het tweede ziektejaar", "Is er geen concreet zicht op terugkeer bij de eigen werkgever, dan start het tweede spoor uiterlijk zes weken na de eerstejaarsevaluatie. Daarna: week 88 de brief van UWV, week 91 de eindevaluatie en het actueel oordeel, week 93 de WIA-aanvraag, week 104 het einde van de loondoorbetaling. Zie De termijnen die wij bewaken."],
  ],
};

/** De vraagstelling aan de bedrijfsarts: kies wat bij de casus past. */
export const BA_VRAGEN: PortaalTabel = {
  titel: "Vragen die je de bedrijfsarts kunt stellen",
  toelichting: "Over belastbaarheid en werk, nooit over diagnose of behandeling. Kies de vragen die bij deze casus passen; drie goede vragen werken beter dan alle zeven.",
  kolommen: ["Vraag"],
  rijen: [
    ["Welke beperkingen heeft de medewerker op dit moment bij het uitvoeren van het eigen werk?"],
    ["Kan de medewerker het eigen werk geheel of gedeeltelijk hervatten? Zo ja, met welke taken en hoeveel uur kan hij starten?"],
    ["Zijn er aanpassingen nodig om het eigen werk te hervatten, bijvoorbeeld in taken, werktijden of werktempo?"],
    ["Als hervatting in het eigen werk nu niet lukt: welke mogelijkheden zijn er voor ander werk binnen de organisatie, en aan welke voorwaarden moet dat werk voldoen?"],
    ["Wanneer adviseer je om opnieuw te beoordelen of de medewerker meer taken of uren aankan?"],
    ["Welke mogelijkheden zijn er op dit moment om te starten met re-integratie?"],
    ["Is het eerdere advies nog passend, of moet de belastbaarheid opnieuw worden beoordeeld?"],
  ],
};

/** AFED: aard, frequentie, ernst, duur. De vier vragen die bij vrijwel elke anamnese passen. */
export const AFED_UNIVERSEEL: PortaalTabel = {
  titel: "De vier vragen die altijd kunnen",
  toelichting: "AFED is de kapstok van de anamnese: aard, frequentie, ernst en duur. Deze vier vragen passen bij vrijwel elke medische anamnese.",
  kolommen: ["Onderdeel", "Vraag"],
  rijen: [
    ["Aard", "Kunt u omschrijven wat voor klachten u ervaart?"],
    ["Frequentie", "Hoe vaak heeft u last van deze klachten?"],
    ["Ernst", "Hoeveel hinder ervaart u van deze klachten?"],
    ["Duur", "Sinds wanneer heeft u deze klachten en hoelang houden ze aan?"],
  ],
};

export const AFED_AANVALLEN: PortaalTabel = {
  titel: "Aanvallen: epilepsie, migraine, paniekaanvallen",
  kolommen: ["Onderdeel", "Nederlands", "Engels"],
  vorm: "vertaling",
  rijen: [
    ["Aard", "Kunt u omschrijven wat er precies gebeurt tijdens een aanval?", "Can you describe exactly what happens during an episode?"],
    ["Aard", "Welke klachten ervaart u tijdens een aanval?", "What symptoms do you experience during an episode?"],
    ["Aard", "Heeft u voorafgaand aan een aanval bepaalde signalen of verschijnselen?", "Do you experience any warning signs before an episode?"],
    ["Aard", "Ervaart u na een aanval nog klachten, zoals vermoeidheid, hoofdpijn of verwardheid?", "Do you experience any symptoms after an episode, such as fatigue, headaches or confusion?"],
    ["Aard", "Zijn de klachten iedere keer hetzelfde of verschillen ze per aanval?", "Are the symptoms the same every time, or do they differ from one episode to another?"],
    ["Frequentie", "Hoe vaak heeft u momenteel last van deze aanvallen?", "How often do you currently experience these episodes?"],
    ["Frequentie", "Is dit dagelijks, wekelijks of maandelijks?", "Does this happen daily, weekly or monthly?"],
    ["Frequentie", "Is de frequentie de laatste tijd veranderd?", "Has the frequency changed recently?"],
    ["Frequentie", "Heeft u meerdere aanvallen op één dag?", "Do you experience multiple episodes in one day?"],
    ["Ernst", "Hoe ervaart u de ernst van de aanvallen?", "How severe are these episodes?"],
    ["Ernst", "In hoeverre wordt u beperkt tijdens een aanval?", "To what extent are you limited during an episode?"],
    ["Ernst", "Moet u uw dagelijkse activiteiten of werkzaamheden onderbreken?", "Do you have to stop your daily activities or work because of an episode?"],
    ["Ernst", "Heeft u na een aanval tijd nodig om weer te herstellen?", "Do you need time to recover after an episode?"],
    ["Ernst", "Is er sprake geweest van bewustzijnsverlies of andere ernstige verschijnselen?", "Have you experienced loss of consciousness or any other serious symptoms?"],
    ["Duur", "Sinds wanneer heeft u last van deze aanvallen?", "Since when have you been experiencing these episodes?"],
    ["Duur", "Hoelang duurt een aanval gemiddeld?", "How long does an episode usually last?"],
    ["Duur", "Hoelang duurt het voordat u na een aanval weer hersteld bent?", "How long does it take you to recover after an episode?"],
    ["Duur", "Zijn de klachten tijdelijk, of houdt u ook tussen de aanvallen klachten?", "Are the symptoms temporary, or do you also experience symptoms between episodes?"],
  ],
};

export const AFED_FYSIEK: PortaalTabel = {
  titel: "Fysieke klachten: gebroken, gekneusd, rugklachten",
  kolommen: ["Onderdeel", "Nederlands", "Engels"],
  vorm: "vertaling",
  rijen: [
    ["Aard", "Kunt u aangeven waar u precies klachten ervaart?", "Can you tell me exactly where you are experiencing symptoms?"],
    ["Aard", "Kunt u omschrijven wat voor soort pijn u heeft?", "Can you describe the type of pain you are experiencing?"],
    ["Aard", "Heeft u last van stekende, zeurende of constante pijn?", "Are you experiencing sharp, aching or constant pain?"],
    ["Aard", "Ervaart u naast de pijn ook zwelling, stijfheid of bewegingsbeperking?", "Do you also experience swelling, stiffness or limited movement?"],
    ["Aard", "Zijn de klachten ontstaan door een ongeval, een verkeerde beweging of overbelasting?", "Were the symptoms caused by an accident, an awkward movement or overexertion?"],
    ["Frequentie", "Heeft u voortdurend last van de klachten of alleen bij bepaalde bewegingen?", "Do you experience symptoms constantly or only when making certain movements?"],
    ["Frequentie", "Op welke momenten van de dag ervaart u de meeste klachten?", "At what times of the day do you experience the most symptoms?"],
    ["Frequentie", "Komen de klachten dagelijks terug?", "Do the symptoms occur every day?"],
    ["Frequentie", "Worden de klachten erger bij bepaalde activiteiten, zoals lopen, zitten, staan of tillen?", "Do the symptoms get worse during activities such as walking, sitting, standing or lifting?"],
    ["Ernst", "Hoe zou u de pijn op dit moment omschrijven?", "How would you describe your pain at the moment?"],
    ["Ernst", "Hoeveel last heeft u van de klachten in uw dagelijks functioneren?", "How much do these symptoms affect your daily activities?"],
    ["Ernst", "In hoeverre wordt u beperkt in uw bewegingsvrijheid?", "To what extent is your freedom of movement limited?"],
    ["Ernst", "Kunt u het betreffende lichaamsdeel nog normaal gebruiken?", "Are you still able to use the affected body part normally?"],
    ["Ernst", "Heeft u hulp nodig bij bepaalde dagelijkse activiteiten?", "Do you need help with certain daily activities?"],
    ["Duur", "Sinds wanneer heeft u deze klachten?", "Since when have you been experiencing these symptoms?"],
    ["Duur", "Zijn de klachten continu aanwezig of wisselen ze gedurende de dag?", "Are the symptoms constant or do they vary throughout the day?"],
    ["Duur", "Hoelang houdt de pijn gemiddeld aan?", "How long does the pain usually last?"],
    ["Duur", "Zijn de klachten sinds het ontstaan verminderd, gelijk gebleven of verergerd?", "Have the symptoms improved, stayed the same or worsened since they started?"],
    ["Duur", "Hoelang verwacht u dat het herstel nog gaat duren?", "How much longer do you expect your recovery to take?"],
  ],
};

export const AFED_PSYCHISCH: PortaalTabel = {
  titel: "Psychische klachten: burn-out, stress, stemming",
  kolommen: ["Onderdeel", "Nederlands", "Engels"],
  vorm: "vertaling",
  rijen: [
    ["Aard", "Kunt u omschrijven waar u momenteel psychisch last van heeft?", "Can you describe what kind of psychological difficulties you are currently experiencing?"],
    ["Aard", "Ervaart u voornamelijk stress, spanning, somberheid of angst?", "Are you mainly experiencing stress, tension, low mood or anxiety?"],
    ["Aard", "Heeft u last van concentratieproblemen of vergeetachtigheid?", "Are you experiencing difficulty concentrating or forgetfulness?"],
    ["Aard", "Ervaart u problemen met slapen of vermoeidheid?", "Are you experiencing sleeping problems or fatigue?"],
    ["Aard", "Heeft u moeite met het reguleren van emoties of met stemmingswisselingen?", "Do you have difficulty regulating your emotions or experience mood swings?"],
    ["Aard", "Zijn er bepaalde situaties die de klachten uitlokken?", "Are there certain situations that trigger your symptoms?"],
    ["Frequentie", "Heeft u dagelijks last van deze klachten, of zijn er ook momenten waarop het beter gaat?", "Do you experience these symptoms every day, or are there also moments when you feel better?"],
    ["Frequentie", "Hoe vaak ervaart u momenten van spanning of onrust?", "How often do you experience periods of tension or restlessness?"],
    ["Frequentie", "Zijn de klachten gedurende de hele dag aanwezig?", "Are the symptoms present throughout the entire day?"],
    ["Frequentie", "Zijn er bepaalde momenten of situaties waarop de klachten toenemen?", "Are there certain moments or situations when the symptoms become worse?"],
    ["Ernst", "Hoeveel invloed hebben de klachten momenteel op uw dagelijks leven?", "How much do these symptoms currently affect your daily life?"],
    ["Ernst", "In hoeverre lukt het u om dagelijkse activiteiten uit te voeren?", "To what extent are you able to carry out your daily activities?"],
    ["Ernst", "Heeft u moeite met concentreren, plannen of het nemen van beslissingen?", "Do you have difficulty concentrating, planning or making decisions?"],
    ["Ernst", "In hoeverre ervaart u beperkingen door de klachten?", "To what extent are you limited by these symptoms?"],
    ["Ernst", "Lukt het u om structuur en regelmaat in uw dag aan te brengen?", "Are you able to maintain structure and routine in your daily life?"],
    ["Duur", "Sinds wanneer ervaart u deze klachten?", "Since when have you been experiencing these symptoms?"],
    ["Duur", "Zijn de klachten geleidelijk ontstaan of plotseling begonnen?", "Did the symptoms develop gradually or did they start suddenly?"],
    ["Duur", "Heeft u gedurende de dag voortdurend last van de klachten?", "Do you experience these symptoms continuously throughout the day?"],
    ["Duur", "Zijn er periodes waarin de klachten verminderen of juist toenemen?", "Are there periods when the symptoms decrease or become worse?"],
    ["Duur", "Hoelang spelen deze klachten inmiddels?", "How long have you been experiencing these difficulties?"],
  ],
};

/** De klassen van de WIA, in procenten van het loon dat iemand vóór zijn ziekte kon verdienen. */
export const WIA_KLASSEN: PortaalTabel = {
  titel: "Hoe UWV rekent",
  toelichting: "Het percentage arbeidsongeschiktheid is het loonverlies: wat iemand vóór zijn ziekte kon verdienen tegenover wat hij nu nog kan verdienen met werk dat hij aankan.",
  kolommen: ["Arbeidsongeschikt", "Uitkering", "Wat het betekent"],
  vorm: "tijdlijn",
  rijen: [
    ["Minder dan 35 procent", "Geen WIA-uitkering", "Van wat iemand vroeger kon verdienen, kan hij nog meer dan 65 procent verdienen. Hij verdient minder dan vroeger, maar het verschil is kleiner dan 35 procent; werkgever en medewerker kijken naar passend werk."],
    ["35 tot 80 procent", "WGA", "Iemand kan nog werken, maar verdient door zijn ziekte minder: van zijn oude loon kan hij nog 20 tot 65 procent verdienen. Werken naast de uitkering loont."],
    ["80 tot 100 procent", "WGA of IVA", "Iemand kan nog 20 procent of minder van zijn oude loon verdienen. WGA als UWV verwacht dat hij later weer meer kan werken; IVA als UWV inschat dat hij blijvend weinig of niets kan verdienen en de kans op verbetering klein is."],
  ],
};
