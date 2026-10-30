/**
 * Offertesjablonen (migratie 0025): per vorm een beginpunt met titel, aanhef,
 * uitleg, prijsregels, voorwaarden, vervolgstappen en geldigheid.
 *
 * De standaard staat hier, in de code. De teksten komen uit de Word-offertes
 * van oktober 2026 (RI&E, PAGO, verzuimtraining, spoor 2, werkfittraject,
 * arbeidsdeskundig onderzoek), in de je-vorm van de site en zonder de
 * voorbeeldnamen. Past het team een sjabloon aan ("Bewaar als sjabloon" bij
 * een offerte), dan komt dat in `offerte_sjablonen` en wint dat van de
 * standaard; "Terug naar standaard" haalt de aanpassing weer weg.
 *
 * Prijzen die op de prijslijst staan (spoor 2, arbeidsdeskundig onderzoek, de
 * aansluitingen) komen uit de catalogus en lopen dus mee met een nieuwe
 * prijslijst. De rest (RI&E, PAGO, training, werkfit) staat hier vast.
 *
 * In de teksten kun je {bedrijf}, {contactpersoon}, {voornaam} en {betreft}
 * gebruiken; zie vulIn() in lib/offertes.ts.
 */
import { alsRegel, STARTPUNTEN, type CatalogusGroep, type CatalogusItem } from "./offerteCatalogus";
import { GELDIG_DAGEN, nieuwId, normaliseerRegels, normaliseerVervolg, type Regel, type Stap, type Vorm } from "./offertes";

export type Sjabloon = {
  sleutel: string;
  vorm: Vorm;
  naam: string;
  omschrijving: string;
  titel: string;
  intro: string;
  inhoud: string;
  voorwaarden: string;
  vervolg: Stap[];
  geldigDagen: number;
  regels: Regel[];
  /** Waar hij vandaan komt: de code, of aangepast door het team (met wie en wanneer). */
  bron: { soort: "standaard" } | { soort: "aangepast"; door: string | null; op: string; heeftStandaard: boolean };
};

type Standaard = Omit<Sjabloon, "regels" | "bron"> & { regels: (c: CatalogusGroep[]) => Regel[] };

/** Een rij uit `offerte_sjablonen`. */
export type SjabloonRij = {
  sleutel: string; vorm: Vorm; naam: string; omschrijving: string | null; titel: string; intro: string | null;
  inhoud: string | null; voorwaarden: string | null; regels: unknown; vervolg: unknown; geldig_dagen: number;
  updated_at: string; updated_by: string | null;
};

const r = (regel: Omit<Regel, "id">): Regel => ({ ...regel, id: nieuwId() });

function uitCatalogus(c: CatalogusGroep[], naam: string): CatalogusItem | undefined {
  for (const g of c) {
    const hit = g.items.find((i) => i.naam.toLowerCase() === naam.toLowerCase());
    if (hit) return hit;
  }
  return undefined;
}

const BTW = "Alle bedragen zijn exclusief btw.";
/** Voor elke vorm dezelfde betalingstermijn (Rens, 30 okt 2026). */
const BETALING = "De betalingstermijn is 30 dagen.";

const AANHEF = "Beste {contactpersoon},";

/* ---------- verzuimbegeleiding ---------- */

const VERZUIM: Omit<Standaard, "sleutel" | "naam" | "omschrijving" | "regels"> = {
  vorm: "verzuimbegeleiding",
  titel: "Verzuimbegeleiding op maat",
  intro: `${AANHEF}\n\nBedankt voor het prettige gesprek. Hieronder vind je ons voorstel voor de verzuimbegeleiding van {bedrijf}.`,
  inhoud: "",
  voorwaarden: `- Verrichtingen op uurbasis worden afgerekend per begonnen kwartier.\n- ${BETALING}\n- ${BTW}`,
  vervolg: [
    { kop: "Je ondertekent online", tekst: "Kies wat je wilt, zet je handtekening en je krijgt direct een bevestiging per mail." },
    { kop: "We plannen de start", tekst: "We nemen contact met je op om de aansluiting en de eerste afspraken door te nemen." },
    { kop: "Je vaste aanspreekpunt", tekst: "Je krijgt een vaste casemanager die je organisatie en je mensen leert kennen." },
  ],
  geldigDagen: GELDIG_DAGEN,
};

/* ---------- RI&E ---------- */

const RIE_INHOUD = `## Inleiding
Passende arbeidsomstandigheden zijn een belangrijke voorwaarde voor gezond en veilig werken. Medewerkers moeten hun werk kunnen doen zonder lichamelijke of geestelijke problemen op te lopen. De Arbowet geeft in Nederland richting aan beleid en arbeidsomstandigheden die daaraan voldoen. Het belangrijkste doel van de Arbowet is het voorkomen van ongevallen en onveilige situaties op het werk. Werkgever en werknemer zijn daar samen verantwoordelijk voor: de werkgever zorgt voor veilige en gezonde arbeidsomstandigheden, de werknemer werkt mee door die omstandigheden veilig te benutten en zijn werk op een veilige manier te doen.

De Arbowet schrijft steeds minder voor en gaat steeds meer uit van het eigen denk- en oplossingsvermogen van de werkgever. De wettelijk verplichte risico-inventarisatie en -evaluatie (RI&E) is daarbij de spil waar alles om draait: een gedegen inventarisatie van de mogelijke risico's op het gebied van veiligheid, gezondheid en welzijn, en van de maatregelen om die risico's te verkleinen.

## Onze uitgangspunten
Samenwerkende kerndeskundigen van React2u voeren de RI&E uit voor {bedrijf}. Daarbij gaan we uit van het volgende:
- De RI&E wordt altijd objectief uitgevoerd, met inachtneming van de geldende Nederlandse wet- en regelgeving.
- We richten ons op de belangrijkste risico's voor de onderneming en haar medewerkers op het gebied van veiligheid, gezondheid en welzijn. Maatregelen beschrijven we kernachtig in een Plan van Aanpak, met een mondelinge toelichting.
- De RI&E en het Plan van Aanpak worden uitgevoerd door een veiligheidskundige en, afhankelijk van de risico's, getoetst door bevoegde kerndeskundigen: een hogere veiligheidskundige (HVK) en een arbeidshygiënist (AH). Zo voldoet de RI&E volledig aan de eisen van de Arbowet en -regelgeving.
- Je krijgt alle documentatie in een werkbaar rapport waarmee je zelf aan de slag kunt.

## De route naar gezond en veilig werken
### Stap 1: Inventariseren van de risico's
We voeren de wettelijk verplichte RI&E uit bij {bedrijf}. Waar mogelijk gebruiken we vastgestelde, branchegerichte methoden en technieken, zoals die uit de arbocatalogi. De arbeidsrisico's waaraan medewerkers tijdens hun dagelijkse werk worden blootgesteld, ook op projectlocaties, brengen we aanvullend in kaart met interviews en zo nodig een bezoek op locatie.

### Stap 2: Evalueren van de risico's
We nemen de geïnventariseerde risico's op in één centraal document. Daarna evalueren we ze met de methode van Kinney en Wiruth en delen we ze in een risicoklasse in: hoog, matig of laag. Die klasse hangt af van het effect, de blootstellingsduur, de waarschijnlijkheid en de wettelijke verplichting.

### Stap 3: Opstellen van het Plan van Aanpak
We bespreken de concept-RI&E met je. Aan de hand van de risicoklassen stellen we samen een Plan van Aanpak op, met praktische maatregelen, wie ze uitvoert en wanneer.

### Stap 4: Toetsing en oplevering
De RI&E en het Plan van Aanpak worden getoetst door een gecertificeerde kerndeskundige van React2u (scope HVK en AH). Je ontvangt het volledige rapport in bewerkbare Word-bestanden, met de verplichte toetsingsverklaring.`;

/* ---------- PAGO ---------- */

const PAGO_INHOUD = `## Wat het PAGO je oplevert
Met het PAGO krijg je inzicht in de mogelijke werkgerelateerde gezondheidseffecten bij je medewerkers, uit de vragenlijst en eventueel een bijpassend gezondheidsonderzoek. We stellen het PAGO samen op basis van je risico-inventarisatie en -evaluatie (RI&E) en het advies van onze bedrijfsarts.

Met de aanvullende vragen uit de vragenlijst zie je welke energiebronnen je kunt inzetten om je medewerkers nog beter in hun kracht te zetten. Elke medewerker krijgt een individueel rapport met duidelijke resultaten en gerichte adviezen. Jij krijgt een groepsrapportage met de belangrijkste bevindingen en adviezen voor de organisatie.

## Inhoud van het PAGO
- Vragenlijst werkdruk en mentale belasting
- Analyse van de uitkomsten
- Individuele rapporten voor de medewerkers
- Groepsrapportage met adviezen voor de organisatie`;

/* ---------- verzuimtraining ---------- */

const TRAINING_INHOUD = `Verzuim heeft impact op je organisatie en op je medewerkers: in de teams, in de bezetting en in de kosten. Effectief verzuimbeleid gaat verder dan het volgen van procedures. Het vraagt om leiderschap, gesprekstechniek, kennis van wetgeving en het vermogen om preventief te handelen.

Met deze verzuimtraining ondersteunen we leidinggevenden bij het ontwikkelen van eigenaarschap, gespreksvaardigheid en strategisch inzicht. Niet vanuit controle, maar vanuit zorg, duidelijke kaders, betrokkenheid en duurzame inzetbaarheid.

> Goed verzuimmanagement is geen administratieve taak, maar een leiderschapsvaardigheid.

## Doel van de training
De training versterkt leidinggevenden in hun rol bij het voorkomen en begeleiden van verzuim. Na afloop:
- hebben deelnemers inzicht in de belangrijkste oorzaken van verzuim;
- weten ze hoe ze preventief kunnen sturen op inzetbaarheid;
- kennen ze hun rol, verantwoordelijkheden en de wettelijke kaders;
- kunnen ze effectieve verzuim- en voortgangsgesprekken voeren;
- nemen ze de regie in complexe verzuimsituaties;
- gaan ze professioneel om met weerstand en lastige gesprekken;
- hebben ze praktische tools die direct toepasbaar zijn.

Het resultaat: meer duidelijkheid, minder handelingsverlegenheid en meer grip op verzuim.

## Inhoud van de training
### Visie op verzuim en leiderschap
- Verzuim als gedrags- en organisatievraagstuk
- De invloed van leiderschap op verzuim
- Eigenaarschap en aanspreekcultuur
- Preventief sturen op inzetbaarheid

### Wet- en regelgeving in begrijpelijke taal
- De Wet verbetering poortwachter in het kort
- De rol van de bedrijfsarts en de arbodienst
- Re-integratieverplichtingen
- Dossiervorming en risico's
- Wat mag je wel en niet vragen?

### Effectieve verzuimgesprekken
- Het goede gesprek
- Frequent kort verzuim bespreekbaar maken
- Signalen opmerken en er iets mee doen
- Omgaan met weerstand en emoties
- Gesprekstechnieken en doorvragen

Inclusief rollenspellen met realistische casuïstiek.

### Complexe situaties
- Psychisch verzuim
- Onvoldoende motivatie voor re-integratie
- Conflicten en arbeidsrelaties
- Grenzen stellen en duidelijk communiceren

## Werkwijze
We werken interactief, praktijkgericht en concreet, met:
- korte theoretische kaders;
- praktijkvoorbeelden;
- reflectie op eigen casuïstiek;
- oefengesprekken;
- direct toepasbare formats en gespreksleidraden.

## Praktische informatie
- **Duur:** ongeveer 2,5 uur
- **Groepsgrootte:** maximaal 10 tot 15 leidinggevenden per training
- **Locatie:** bij jullie op locatie
- **Voorbereiding en intake:** inbegrepen
- **Nazorg:** een vervolgtraining of verdieping in motiverende gespreksvoering is mogelijk`;

/* ---------- spoor 2 ---------- */

const SPOOR2_INHOUD = `Je vraag is of React2u je werknemer kan begeleiden naar ander passend werk buiten de eigen organisatie. Het doel is uitvoering te geven aan de taken uit de Wet verbetering poortwachter (WVP). Dat doen we met een re-integratietraject 2e spoor.

Een re-integratietraject wordt altijd toegesneden op de werknemer. Een re-integratieadviseur met veel ervaring in het 2e spoor coacht je werknemer. Door die expertise, kennis en het uitgebreide netwerk krijgt je werknemer een flinke voorsprong op de arbeidsmarkt. In één-op-één gesprekken brengen we de persoonlijke situatie, competenties, carrièrewensen en ambities in kaart. Daarna geeft de adviseur praktische tips, biedt hij trainingen, zoekt hij passende vacatures via het netwerk en begeleidt hij je werknemer. Zo heeft je werknemer alle handvatten om de arbeidsmarkt succesvol te verkennen.

De beste route naar een passende en duurzame arbeidsplaats bereiken we met omdenken, de nieuwste methodes en heldere doelstellingen.

## Trajectomschrijving
Op basis van individuele gesprekken stelt de re-integratieadviseur een stappenplan op. Dat is de leidraad voor de activiteiten die moeten leiden tot een functie buiten je organisatie. Maatwerk is de leidraad, ook voor de kosten; heb je specifieke wensen, dan passen we die in. Het traject kent vier fases.

### 1. Opstellen trajectplan
Na je akkoord brengen we de arbeidsmogelijkheden van je werknemer in kaart: opleiding, werkervaring, sociale redzaamheid, psychische en fysieke stabiliteit, motivatie en flexibiliteit, mobiliteit, en belemmeringen en mogelijkheden in relatie tot werk. Deze fase sluiten we af met een plaatsingsplan met een realistisch tijdpad tot aan de maximale wachttijd van 104 weken. Het traject kan daarna worden verlengd; dan kijken we opnieuw naar de stand van zaken en maken we een vervolgplanning.

### 2. Beroepenoriëntatie
Je werknemer krijgt informatie over branches, sectoren, organisaties en beroepen, en waar nodig testen om kwaliteiten en interesses in beeld te brengen. Het doel is een realistische beroepskeuze die je werknemer omzet in gerichte acties.
- Situatieanalyse
- Verkenning van functie en loopbaan
- Zelfanalyse: wie ben ik, wat kan ik en wat wil ik?

### 3. Voorbereiding op plaatsing
Met gesprekken en opdrachten krijgt je werknemer zicht op een of meer passende beroepen. Daarna volgt een concreet actieplan, stap voor stap uitgevoerd, met als doel een duurzame functie buiten je organisatie.
- Functieoriëntatie, bijvoorbeeld met een werkervaringsplaats, om te zien of kwaliteiten en belastbaarheid aansluiten
- Arbeidsmarktoriëntatie: welke functies worden gevraagd en passen die bij de FML?
- Sollicitatiefase

### 4. Trajectduur
Het traject start direct en loopt zes maanden, tot en met het einde van de wachttijd. Elke twee maanden ontvang je een schriftelijke rapportage.`;

/* ---------- werkfit ---------- */

const WERKFIT_INHOUD = `Je vraag is of React2u je werknemer kan adviseren naar ander passend werk buiten de huidige organisatie, met een verkort re-integratietraject. Het doel is uitvoering te geven aan de taken uit de Wet verbetering poortwachter (WVP) en de schadelast uit het eigenrisicodragerschap te beperken.

## Trajectomschrijving
Het werkfittraject richt zich op zowel de persoonlijke als de professionele ontwikkeling van je werknemer, met als doel een plaatsing in betaald werk. Vanaf het begin gaan we actief richting de arbeidsmarkt: solliciteren, ons netwerk inzetten en passend werk vinden. Deze onderwerpen komen aan bod:
- Hoe zorg ik voor genoeg ontspanning en rust?
- Wat zijn mijn drijfveren, normen en (werk)waarden?
- Persoonlijke coachgesprekken
- Vanuit de beroepskeuzetest de link leggen naar werk, bestaande zoekrichtingen en nieuwe functies
- Welk werk en welke omgeving passen, en hoe kom ik daar?
- Samen de arbeidsmarkt op, op zoek naar passende functies
- De kracht van LinkedIn, en samen het profiel optimaliseren
- De arbeidsmarktregio in kaart brengen
- Arbeidsmarktinformatie, zoekstrategie en kansberoepen
- Actief solliciteren
- Hulp bij sollicitatiebrieven
- Advies en training voor sollicitatiegesprekken
- Inzet van ons netwerk

## Trajectduur
Het werkfittraject duurt vier maanden. We stellen een kort trajectplan op en sluiten af met een eindrapportage.`;

/* ---------- arbeidsdeskundig onderzoek ---------- */

const AD_INHOUD = `## Wat er nodig is
- Dossieronderzoek: de belastbaarheid en spreekuurterugkoppeling van de bedrijfsarts, en het functieprofiel en functieoverzicht van de werkgever
- Een gesprek met de werkgever
- Een gesprek met de werknemer
- Zo nodig een driegesprek met werknemer en werkgever
- Zo nodig verdiepend contact met de bedrijfsarts

## Wat het onderzoek oplevert
Na het onderzoek is duidelijk:
- of het eigen werk passend is, of passend te maken is;
- zo niet, of er ander passend werk is bij de eigen werkgever;
- zo niet, langs welke weg je werknemer begeleid kan worden naar passend werk bij een andere werkgever.`;

const TRAJECT_VERVOLG: Stap[] = [
  { kop: "Je ondertekent online", tekst: "Je krijgt direct een bevestiging per mail." },
  { kop: "Intake met je werknemer", tekst: "We plannen een intakegesprek met je werknemer." },
  { kop: "Trajectplan en start", tekst: "We stellen het trajectplan op en gaan aan de slag; je hoort tussentijds van ons." },
];

export const STANDAARD_SJABLONEN: Standaard[] = [
  ...STARTPUNTEN.map((s) => ({
    ...VERZUIM,
    sleutel: `verzuim-${s.key}`,
    naam: s.key === "keuze" ? "Verzuimbegeleiding: klant kiest" : `Verzuimbegeleiding: ${s.label}`,
    omschrijving: s.uitleg,
    regels: s.regels,
  })),
  {
    sleutel: "rie",
    vorm: "rie",
    naam: "RI&E",
    omschrijving: "Inventarisatie, evaluatie, Plan van Aanpak en toetsing door HVK en AH.",
    titel: "Risico-inventarisatie en -evaluatie (RI&E)",
    intro: `${AANHEF}\n\nHet doet ons een genoegen je ons voorstel te doen voor het uitvoeren van de wettelijk verplichte risico-inventarisatie en -evaluatie (RI&E) voor {bedrijf}.`,
    inhoud: RIE_INHOUD,
    voorwaarden: `- De RI&E wordt in rekening gebracht na oplevering van het concept-rapport.\n- Aanvullende werkzaamheden uit het Plan van Aanpak worden maandelijks achteraf in rekening gebracht.\n- ${BETALING}\n- Alle bedragen zijn exclusief btw en inclusief reiskosten.`,
    vervolg: [
      { kop: "Je ondertekent online", tekst: "Je krijgt direct een bevestiging per mail." },
      { kop: "We plannen de inventarisatie", tekst: "We plannen de inventarisatie, de interviews en zo nodig een bezoek op locatie." },
      { kop: "Rapport en Plan van Aanpak", tekst: "Je ontvangt het getoetste rapport met Plan van Aanpak en een mondelinge toelichting." },
    ],
    geldigDagen: GELDIG_DAGEN,
    regels: () => [
      r({ sectie: "Kosten", naam: "RI&E, stap 1 tot en met 4", omschrijving: "Inventarisatie, evaluatie, Plan van Aanpak en toetsing door een hogere veiligheidskundige en een arbeidshygiënist, inclusief toetsingsverklaring en reiskosten.", prijs: 2825, eenheid: "eenmalig", soort: "vast" }),
      r({ sectie: "Kosten", naam: "Aanvullende werkzaamheden uit het Plan van Aanpak", prijs: null, eenheid: "uur", soort: "tarief" }),
    ],
  },
  {
    sleutel: "pago",
    vorm: "pago",
    naam: "PAGO",
    omschrijving: "Vragenlijst werkdruk en mentale belasting, met analyse en rapportage.",
    titel: "Periodiek arbeidsgezondheidskundig onderzoek (PAGO)",
    intro: `${AANHEF}\n\nHierbij doen we je ons voorstel voor het uitvoeren van een PAGO bij {bedrijf}. Onze bedrijfsarts heeft je RI&E doorgenomen en sluit zich aan bij het advies van de kerndeskundigen.`,
    inhoud: PAGO_INHOUD,
    voorwaarden: `- ${BETALING}\n- ${BTW}`,
    vervolg: [
      { kop: "Je ondertekent online", tekst: "Je krijgt direct een bevestiging per mail." },
      { kop: "De vragenlijst gaat uit", tekst: "We stemmen de planning af en zetten de vragenlijst uit bij je medewerkers." },
      { kop: "Rapportage en advies", tekst: "Medewerkers krijgen hun eigen rapport, jij een groepsrapportage met adviezen." },
    ],
    geldigDagen: GELDIG_DAGEN,
    regels: () => [
      r({ sectie: "Tarieven", naam: "Vragenlijst werkdruk en mentale belasting", omschrijving: "Inclusief analyse van de uitkomsten.", prijs: 42.5, eenheid: "medewerker", soort: "vast" }),
    ],
  },
  {
    sleutel: "verzuimtraining",
    vorm: "verzuimtraining",
    naam: "Verzuimtraining",
    omschrijving: "Incompany training van 2,5 uur voor 10 tot 15 leidinggevenden.",
    titel: "Verzuimtraining voor leidinggevenden",
    intro: `${AANHEF}\n\nHierbij doen we je ons voorstel voor een verzuimtraining voor de leidinggevenden van {bedrijf}.`,
    inhoud: TRAINING_INHOUD,
    voorwaarden: `- Facturatie vindt plaats na uitvoering van de training.\n- ${BETALING}\n- ${BTW}`,
    vervolg: [
      { kop: "Je ondertekent online", tekst: "Je krijgt direct een bevestiging per mail." },
      { kop: "Intake en voorbereiding", tekst: "We stemmen datum, groep en casuïstiek af en maken de training op maat." },
      { kop: "De training", tekst: "Een interactieve training van ongeveer 2,5 uur bij jullie op locatie." },
    ],
    geldigDagen: GELDIG_DAGEN,
    regels: () => [
      r({ sectie: "Investering", naam: "Verzuimtraining, 2,5 uur, incompany", prijs: 595, eenheid: "eenmalig", soort: "vast" }),
      r({ sectie: "Investering", naam: "Voorbereiding en maatwerk", prijs: 0, eenheid: "eenmalig", soort: "vast" }),
      r({ sectie: "Investering", naam: "Trainingsmateriaal", prijs: 0, eenheid: "eenmalig", soort: "vast" }),
      r({ sectie: "Investering", naam: "Vervolgtraining of verdieping in motiverende gespreksvoering", omschrijving: "Zet hem aan als je interesse hebt; we sturen je een voorstel.", prijs: null, eenheid: "op_aanvraag", soort: "optie" }),
      r({ sectie: "Investering", naam: "Reiskosten en reistijd", prijs: null, prijsTekst: "€89 p.p. en €0,42 per km", eenheid: "op_aanvraag", soort: "tarief" }),
    ],
  },
  {
    sleutel: "spoor2",
    vorm: "spoor2",
    naam: "Spoor 2",
    omschrijving: "Re-integratietraject 2e spoor, eerste zes maanden.",
    titel: "Re-integratietraject 2e spoor",
    intro: `${AANHEF}\n\nHierbij doen we je ons voorstel voor het re-integratietraject 2e spoor voor je werknemer.`,
    inhoud: SPOOR2_INHOUD,
    voorwaarden: `- Na je akkoord plannen we een intakegesprek met je werknemer en stellen we het trajectplan op.\n- Daarna volgt de factuur, met een betalingstermijn van 30 dagen.\n- ${BTW}`,
    vervolg: TRAJECT_VERVOLG,
    geldigDagen: GELDIG_DAGEN,
    regels: (c) => {
      const eerste = uitCatalogus(c, "Spoor 2, eerste zes maanden");
      const vervolg = uitCatalogus(c, "Spoor 2, vervolg");
      return [
        eerste
          ? alsRegel(eerste, { sectie: "Offerte", label: undefined, kleur: undefined, soort: "vast", eenheid: "eenmalig" })
          : r({ sectie: "Offerte", naam: "Spoor 2, eerste zes maanden", prijs: null, eenheid: "op_aanvraag", soort: "vast" }),
        ...(vervolg ? [alsRegel(vervolg, { sectie: "Offerte", naam: "Verlenging na zes maanden", label: undefined, kleur: undefined, soort: "tarief" })] : []),
      ];
    },
  },
  {
    sleutel: "werkfit",
    vorm: "werkfit",
    naam: "Werkfittraject",
    omschrijving: "Verkort re-integratietraject van vier maanden, met verlenging als optie.",
    titel: "Werkfittraject",
    intro: `${AANHEF}\n\nHierbij doen we je ons voorstel voor een werkfittraject voor je werknemer.`,
    inhoud: WERKFIT_INHOUD,
    voorwaarden: `- Na je akkoord plannen we een intakegesprek met je werknemer en stellen we het trajectplan op.\n- Daarna volgt de factuur, met een betalingstermijn van 30 dagen.\n- ${BTW}`,
    vervolg: TRAJECT_VERVOLG,
    geldigDagen: GELDIG_DAGEN,
    regels: () => [
      r({ sectie: "Offerte", naam: "Werkfittraject, 4 maanden", omschrijving: "Inclusief trajectplan en eindrapportage.", prijs: 2500, eenheid: "eenmalig", soort: "vast" }),
      r({ sectie: "Offerte", naam: "Verlenging met 3 maanden", prijs: 1500, eenheid: "eenmalig", soort: "optie" }),
    ],
  },
  {
    sleutel: "arbeidsdeskundig",
    vorm: "arbeidsdeskundig",
    naam: "Arbeidsdeskundig onderzoek",
    omschrijving: "Na advies van de bedrijfsarts: is het eigen werk passend, en zo niet, wat dan?",
    titel: "Arbeidsdeskundig onderzoek",
    intro: `${AANHEF}\n\nOnlangs heeft de bedrijfsarts van React2u een Functionele Mogelijkhedenlijst opgesteld en geadviseerd een arbeidsdeskundig onderzoek te laten uitvoeren. Hierbij ons voorstel.`,
    inhoud: AD_INHOUD,
    voorwaarden: `- Het onderzoek kan alleen met een goede reden worden geannuleerd. Geef een annulering tijdig en schriftelijk door, op werkdagen.\n- Bij een no-show of afzegging binnen 48 uur voor de afspraak brengen we 50% van de geoffreerde kosten in rekening.\n- ${BETALING}\n- ${BTW}`,
    vervolg: [
      { kop: "Je ondertekent online", tekst: "Je krijgt direct een bevestiging per mail." },
      { kop: "Dossier en gesprekken", tekst: "We bestuderen het dossier en spreken werkgever en werknemer." },
      { kop: "Rapport met advies", tekst: "Je ontvangt een rapport met een helder antwoord op de vragen hierboven." },
    ],
    geldigDagen: GELDIG_DAGEN,
    regels: (c) => {
      const ad = uitCatalogus(c, "Arbeidsdeskundig onderzoek");
      return [
        ad
          ? alsRegel(ad, { sectie: "Kosten", label: undefined, kleur: undefined, soort: "vast", eenheid: "eenmalig" })
          : r({ sectie: "Kosten", naam: "Arbeidsdeskundig onderzoek", prijs: null, eenheid: "op_aanvraag", soort: "vast" }),
      ];
    },
  },
];

/** Een sjabloon uit de database (aangepast door het team), in dezelfde vorm als de standaard. */
function uitRij(rij: SjabloonRij, heeftStandaard: boolean): Sjabloon {
  return {
    sleutel: rij.sleutel,
    vorm: rij.vorm,
    naam: rij.naam,
    omschrijving: rij.omschrijving || "",
    titel: rij.titel,
    intro: rij.intro || "",
    inhoud: rij.inhoud || "",
    voorwaarden: rij.voorwaarden || "",
    vervolg: normaliseerVervolg(rij.vervolg),
    geldigDagen: rij.geldig_dagen,
    // Nieuwe ids per offerte: zo zijn twee offertes uit hetzelfde sjabloon nooit aan elkaar gekoppeld.
    regels: normaliseerRegels(rij.regels).map((x) => ({ ...x, id: nieuwId() })),
    bron: { soort: "aangepast", door: rij.updated_by, op: rij.updated_at, heeftStandaard },
  };
}

/**
 * Alle sjablonen: de standaard, met daaroverheen wat het team aanpaste, en
 * daarachter de sjablonen die het team zelf toevoegde. In de volgorde van de
 * vormen.
 */
export function alleSjablonen(catalogus: CatalogusGroep[], rijen: SjabloonRij[] = []): Sjabloon[] {
  const perSleutel = new Map(rijen.map((x) => [x.sleutel, x]));
  const standaard = STANDAARD_SJABLONEN.map((s): Sjabloon => {
    const rij = perSleutel.get(s.sleutel);
    if (rij) return uitRij(rij, true);
    return { ...s, regels: s.regels(catalogus), bron: { soort: "standaard" } };
  });
  const eigen = rijen.filter((x) => !STANDAARD_SJABLONEN.some((s) => s.sleutel === x.sleutel)).map((x) => uitRij(x, false));
  const volgorde = (v: Vorm) => ["verzuimbegeleiding", "rie", "pago", "verzuimtraining", "spoor2", "werkfit", "arbeidsdeskundig"].indexOf(v);
  return [...standaard, ...eigen].sort((a, b) => volgorde(a.vorm) - volgorde(b.vorm));
}

/** Een sleutel voor een nieuw sjabloon uit zijn naam: "RI&E kantoor" → "rie-kantoor". */
export function sleutelUit(naam: string): string {
  return (
    naam
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/&/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "sjabloon"
  );
}

/** Oude adressen (?start=basis) uit de eerste versie en vanuit het Postvak IN. */
export function sjabloonVoorStart(start: string | undefined | null): string | null {
  if (!start) return null;
  return ["keuze", "basis", "compleet"].includes(start) ? `verzuim-${start}` : start;
}

/** "1 onderdeel", "3 onderdelen": wat de klant afneemt, zonder de tarieven bij gebruik. */
export function aantalOnderdelen(regels: Regel[]): string {
  const n = regels.filter((x) => x.soort !== "tarief").length;
  return `${n} ${n === 1 ? "onderdeel" : "onderdelen"}`;
}
