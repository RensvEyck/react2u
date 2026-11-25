/**
 * De checklist poortwachterdossier (/kennis/checklist-poortwachterdossier):
 * de 24 documenten en afspraken die UWV bij de WIA-aanvraag in het
 * re-integratieverslag verwacht, per fase van week 1 tot week 104. Dezelfde
 * lijst staat op de pagina, in de pdf (lib/checklistPdf.tsx) en in de mail.
 */

export type ChecklistFase = {
  titel: string;
  periode: string;
  punten: { tekst: string; toelichting?: string }[];
};

export const CHECKLIST_TITEL = "Checklist poortwachterdossier";
export const CHECKLIST_ONDERTITEL = "De 24 punten die UWV bij de WIA-aanvraag controleert";

export const CHECKLIST_FASEN: ChecklistFase[] = [
  {
    titel: "De eerste acht weken",
    periode: "Week 1 tot 8",
    punten: [
      { tekst: "Ziekmelding met de eerste ziektedag", toelichting: "De datum waarop alle termijnen beginnen." },
      { tekst: "Melding bij de arbodienst binnen een week", toelichting: "Met de bevestiging van de arbodienst." },
      { tekst: "Eerste contact met de werknemer vastgelegd", toelichting: "Wanneer, door wie en wat is afgesproken." },
      { tekst: "Probleemanalyse van de bedrijfsarts (week 6)", toelichting: "Beperkingen, mogelijkheden, prognose en advies." },
      { tekst: "Plan van aanpak, ondertekend door beiden (week 8)", toelichting: "Doel, stappen, evaluatiemomenten." },
      { tekst: "Casemanager aangewezen", toelichting: "Staat met naam in het plan van aanpak." },
    ],
  },
  {
    titel: "Het ritme van zes weken",
    periode: "Vanaf week 8",
    punten: [
      { tekst: "Evaluatiegesprek minstens elke zes weken", toelichting: "Datum, aanwezigen en uitkomst." },
      { tekst: "Bijstellingen van het plan van aanpak", toelichting: "Ook vastleggen als er niets verandert, en waarom." },
      { tekst: "Terugkoppelingen van de spreekuren bij de bedrijfsarts", toelichting: "Elk spreekuur een korte terugkoppeling." },
      { tekst: "Opbouwschema of aanpassingen van het werk", toelichting: "Welke uren, welke taken, vanaf wanneer." },
    ],
  },
  {
    titel: "Rond het eerste ziektejaar",
    periode: "Week 42 tot 58",
    punten: [
      { tekst: "42e-weeksmelding bij UWV, met bevestiging", toelichting: "Uiterlijk de eerste werkdag na 42 weken." },
      { tekst: "Arbeidsdeskundig onderzoek bij twijfel over het eigen werk", toelichting: "Het rapport met de vier vragen." },
      { tekst: "Eerstejaarsevaluatie, ondertekend (week 52)", toelichting: "Met een conclusie over terugkeer bij jou." },
      { tekst: "Onderbouwde keuze voor het spoor", toelichting: "Waarom eerste spoor, tweede spoor of beide." },
      { tekst: "Opdracht voor het tweede spoor binnen zes weken na de evaluatie", toelichting: "Als er geen zicht op terugkeer bij jou is." },
      { tekst: "Deskundigenoordeel bij verschil van inzicht", toelichting: "Of de overweging om het niet aan te vragen." },
    ],
  },
  {
    titel: "Het tweede spoor",
    periode: "Zolang het loopt",
    punten: [
      { tekst: "Trajectplan van het tweede spoor", toelichting: "Intake, zoekprofiel, activiteiten, duur." },
      { tekst: "Voortgangsrapportages, minstens elke zes weken", toelichting: "Van de begeleider aan jou, in het dossier." },
      { tekst: "Sollicitatieactiviteiten en proefplaatsingen", toelichting: "Wat is gedaan, met welk resultaat." },
      { tekst: "Het eerste spoor blijft bijgehouden", toelichting: "Ook tijdens het tweede spoor evalueren." },
    ],
  },
  {
    titel: "Naar de WIA-aanvraag",
    periode: "Week 88 tot 104",
    punten: [
      { tekst: "Eindevaluatie, ondertekend door beiden (week 91)", toelichting: "Hoe is het traject verlopen." },
      { tekst: "Actueel oordeel van de bedrijfsarts", toelichting: "De belastbaarheid nu, voor UWV." },
      { tekst: "Re-integratieverslag compleet, met de reactie van de werknemer", toelichting: "Alle documenten hierboven, op datum." },
      { tekst: "WIA-aanvraag ingediend uiterlijk week 93", toelichting: "Door de werknemer, met het verslag." },
    ],
  },
];

export const CHECKLIST_AANTAL = CHECKLIST_FASEN.reduce((a, f) => a + f.punten.length, 0);

/** Dezelfde fasen, met een doorlopend nummer per punt (1 tot 24), voor de pagina en de pdf. */
export const CHECKLIST_GENUMMERD: (Omit<ChecklistFase, "punten"> & { punten: (ChecklistFase["punten"][number] & { nummer: number })[] })[] = (() => {
  let n = 0;
  return CHECKLIST_FASEN.map((f) => ({ ...f, punten: f.punten.map((p) => ({ ...p, nummer: ++n })) }));
})();
