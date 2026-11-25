/**
 * De loonsanctie-check (/kennis/loonsanctie-check): twaalf vragen over het
 * poortwachterdossier, de punten waar UWV bij de WIA-aanvraag op let. Elk
 * "nee" of "weet ik niet" weegt mee naar een risico: laag, verhoogd of hoog.
 * Geen oordeel van UWV en geen advies op maat; wel precies de zwakke plekken,
 * met wat je nog kunt herstellen. De teksten sluiten aan op de gidsen over de
 * Wet verbetering poortwachter en de loonsanctie.
 *
 * Puur, zodat de component en de test dezelfde rekensom gebruiken.
 */

export type Antwoord = "ja" | "nee" | "onbekend";

export type CheckVraag = {
  id: string;
  vraag: string;
  /** Hoe zwaar een ontbrekend onderdeel weegt (1 tot 3). */
  gewicht: 1 | 2 | 3;
  /** Waarom UWV hierop let. */
  waarom: string;
  /** Wat je nog kunt doen als het antwoord nee is. */
  herstel: string;
  /** Vanaf welke week de vraag speelt; eerder is "nog niet aan de orde" en telt als ja. */
  vanafWeek: number;
};

export const CHECK_VRAGEN: CheckVraag[] = [
  { id: "ziekmelding", vanafWeek: 1, gewicht: 1, vraag: "Is de ziekmelding binnen een week bij de arbodienst gemeld?", waarom: "Een late melding betekent een late probleemanalyse en een plan van aanpak dat krap zit.", herstel: "Leg vast wanneer je meldde en waarom later; zorg dat de volgende stappen wél op tijd zijn." },
  { id: "probleemanalyse", vanafWeek: 6, gewicht: 3, vraag: "Ligt er een probleemanalyse van de bedrijfsarts uit uiterlijk week 6?", waarom: "Zonder probleemanalyse is er geen basis voor het plan van aanpak; UWV ziet dat als een gemiste stap.", herstel: "Laat de bedrijfsarts alsnog een probleemanalyse maken en leg uit waarom die later kwam." },
  { id: "plan-van-aanpak", vanafWeek: 8, gewicht: 3, vraag: "Is het plan van aanpak in week 8 opgesteld en door jou en je werknemer ondertekend?", waarom: "Het plan van aanpak is het hart van het dossier: doel, stappen en wie wat doet.", herstel: "Maak het plan alsnog, dateer het eerlijk en laat beiden tekenen." },
  { id: "evaluaties", vanafWeek: 14, gewicht: 3, vraag: "Is het plan van aanpak minstens elke zes weken geëvalueerd en bijgesteld, en is dat vastgelegd?", waarom: "Een plan uit week 8 dat nooit is bijgesteld, zegt UWV dat er niets is gebeurd.", herstel: "Begin nu met evaluaties om de zes weken en leg elk gesprek kort vast, ook als er niets verandert." },
  { id: "42-weken", vanafWeek: 42, gewicht: 2, vraag: "Is de 42e-weeksmelding op tijd bij UWV gedaan?", waarom: "Een verplichte melding; te laat melden kan een boete opleveren en valt op in het dossier.", herstel: "Meld alsnog en bewaar de bevestiging; het kost een boete, maar een ontbrekende melding kost meer." },
  { id: "eerstejaarsevaluatie", vanafWeek: 52, gewicht: 3, vraag: "Is de eerstejaarsevaluatie in week 52 gedaan en vastgelegd, met een conclusie over terugkeer?", waarom: "Het opschudmoment: UWV kijkt precies hier of je op tijd de juiste keuze hebt gemaakt.", herstel: "Doe de evaluatie alsnog, onderbouw de keuze voor het spoor en laat beiden tekenen." },
  { id: "eigen-werk", vanafWeek: 8, gewicht: 2, vraag: "Is onderzocht of het eigen werk passend te maken is, met aanpassingen of een opbouw, en is dat vastgelegd?", waarom: "Het eerste spoor begint bij het eigen werk; UWV wil zien dat je dat serieus hebt geprobeerd.", herstel: "Leg vast welke aanpassingen zijn overwogen en waarom ze wel of niet haalbaar waren." },
  { id: "ander-werk", vanafWeek: 26, gewicht: 2, vraag: "Is ander werk bij jou onderzocht, in een andere functie of op een andere afdeling?", waarom: "Van een werkgever verwacht UWV dat hij verder kijkt dan de eigen functie, zeker bij een grotere organisatie.", herstel: "Beschrijf welke functies zijn bekeken en waarom ze niet passen; een arbeidsdeskundig onderzoek onderbouwt dat." },
  { id: "arbeidsdeskundig", vanafWeek: 42, gewicht: 2, vraag: "Is er een arbeidsdeskundig onderzoek gedaan toen terugkeer in het eigen werk onzeker werd?", waarom: "Het rapport is de onderbouwing van de keuze voor het spoor; zonder rapport is die keuze lastig te verdedigen.", herstel: "Laat het onderzoek alsnog doen; een rapport van later is beter dan geen rapport." },
  { id: "tweede-spoor", vanafWeek: 58, gewicht: 3, vraag: "Is het tweede spoor gestart binnen zes weken na de eerstejaarsevaluatie, als er geen zicht op terugkeer bij jou was?", waarom: "Een te laat gestart tweede spoor is de meest voorkomende reden voor een loonsanctie.", herstel: "Start nu een volwaardig traject met een vaste begeleider en rapportages; leg uit waarom het later begon." },
  { id: "dossier", vanafWeek: 1, gewicht: 2, vraag: "Staan alle gesprekken, afspraken en adviezen van de bedrijfsarts in het dossier?", waarom: "Wat niet in het dossier staat, heeft voor UWV niet plaatsgevonden.", herstel: "Verzamel alle terugkoppelingen en gespreksverslagen en zet ze op datum in het dossier." },
  { id: "werknemer", vanafWeek: 8, gewicht: 1, vraag: "Heeft je werknemer van elk document een exemplaar gekregen en kunnen reageren?", waarom: "Het re-integratieverslag is van jullie samen; de werknemer mag zijn eigen mening toevoegen.", herstel: "Geef de stukken alsnog en vraag om een reactie, ook als die er niet komt: leg vast dat je het hebt gevraagd." },
];

export const MAX_SCORE = CHECK_VRAGEN.reduce((a, v) => a + v.gewicht, 0);

export type Risico = "laag" | "verhoogd" | "hoog";

export type Uitkomst = {
  score: number;
  max: number;
  risico: Risico;
  /** De vragen met nee of weet ik niet, zwaarste eerst. */
  zwak: (CheckVraag & { antwoord: Antwoord })[];
  /** Vragen die nog niet aan de orde zijn, gezien de week. */
  nogNiet: CheckVraag[];
};

/**
 * De uitkomst: de som van de gewichten van wat ontbreekt of onbekend is.
 * Onbekend telt als ontbrekend: wat je niet zeker weet, kun je UWV ook niet
 * laten zien. Een vraag die nog niet aan de orde is (de week is nog niet
 * bereikt) telt niet mee; zonder week tellen alle vragen.
 */
export function uitkomst(antwoorden: Partial<Record<string, Antwoord>>, week?: number | null): Uitkomst {
  const nogNiet = week ? CHECK_VRAGEN.filter((v) => v.vanafWeek > week) : [];
  const actueel = CHECK_VRAGEN.filter((v) => !nogNiet.includes(v));
  const zwak = actueel
    .filter((v) => (antwoorden[v.id] ?? "onbekend") !== "ja")
    .map((v) => ({ ...v, antwoord: antwoorden[v.id] ?? ("onbekend" as Antwoord) }))
    .sort((a, b) => b.gewicht - a.gewicht);
  const score = zwak.reduce((a, v) => a + v.gewicht, 0);
  const max = actueel.reduce((a, v) => a + v.gewicht, 0);
  const risico: Risico = score <= 3 ? "laag" : score <= 9 ? "verhoogd" : "hoog";
  return { score, max, risico, zwak, nogNiet };
}

export const RISICO_TEKST: Record<Risico, { kop: string; tekst: string }> = {
  laag: { kop: "Laag risico", tekst: "Je dossier ziet er op de hoofdpunten goed uit. Houd het ritme van zes weken vast en leg elk gesprek vast." },
  verhoogd: { kop: "Verhoogd risico", tekst: "Er ontbreken onderdelen die UWV zeker bekijkt. De meeste zijn alsnog te herstellen, zolang je dat eerlijk dateert en uitlegt." },
  hoog: { kop: "Hoog risico", tekst: "Op meerdere zware punten ontbreekt bewijs. Begin vandaag met herstellen en laat iemand meekijken: een loonsanctie kost tot een jaar loon." },
};
