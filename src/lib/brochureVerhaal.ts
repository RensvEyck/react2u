/**
 * Het verhaal van de brochure: de hoofdstukken en hun teksten, gedeeld door
 * de pagina (BrochurePagina.tsx) en de pdf (brochurePdf.tsx).
 *
 * De opbouw komt uit de voorbeeldbrochure die Rens op 3 nov 2026 stuurde
 * ("er moet een veel duidelijkere lijn inzitten, geen kopie want dit ontwerp
 * is niet goed, alleen wel de opbouw"), de teksten ook, met de opmerkingen
 * van Susanne erin verwerkt:
 * - minder pagina's, minder ruim, en onze werkwijze benoemd (het voorwoord van
 *   de offerte, lib/offerteVoorwoord.ts);
 * - de taakgedelegeerde casemanager werkt in taakdelegatie binnen het medisch
 *   team met de bedrijfsarts, niet andersom;
 * - ons systeem (XpertSuite) bewaakt de termijnen, voor de Wet verbetering
 *   poortwachter én voor eigenrisicodragers Ziektewet;
 * - naar een vangnetregeling mag je wél vragen (niet welke);
 * - overstappen duurt drie tot vier weken, de werkgever vraagt de medische
 *   informatie op, en de OR heeft instemmingsrecht.
 * De feiten zijn rechtgezet: zes diensten met Reward, prijzen uit de
 * prijslijst. De marktvergelijking uit het voorbeeld staat er bewust niet in.
 *
 * De lijn: een ziekmelding op maandagochtend (01) zet een klok in gang die
 * pas na 104 weken stopt. Elk hoofdstuk beantwoordt een vraag uit die
 * ochtend, tot en met wat jij per termijn doet (06) en hoe je overstapt (08).
 */
import type { DienstSlug } from "./brochures";
import type { Prijslijst } from "./brochurePrijslijst";
import { parsePrijs } from "./offerteCatalogus";
import { euro } from "./offertes";

export type Hoofdstuk = {
  nr: string;
  /** Het anker op de pagina. */
  id: string;
  /** "Hoe het gaat": het bovenkopje en de naam in de inhoud. */
  kort: string;
  /** Eén regel in de inhoud: welke vraag dit hoofdstuk beantwoordt. */
  vraag: string;
};

export const HOOFDSTUKKEN: Hoofdstuk[] = [
  { nr: "01", id: "hoe-het-gaat", kort: "Hoe het gaat", vraag: "Maandagochtend, 08:12: een ziekmelding vanaf jouw kant." },
  { nr: "02", id: "voorwoord", kort: "Voorwoord", vraag: "Waarom we React2u zijn begonnen." },
  { nr: "03", id: "werkwijze", kort: "Onze werkwijze", vraag: "Eén aanspreekpunt, een medisch team en een systeem dat de termijnen bewaakt." },
  { nr: "04", id: "kosten", kort: "Wat het kost", vraag: "De rekensom achter een dossier dat vastloopt bij het UWV." },
  { nr: "05", id: "diensten", kort: "Onze diensten", vraag: "Zes diensten onder één dak." },
  { nr: "06", id: "jouw-rol", kort: "Jouw rol", vraag: "Wat je mag vragen, en wat de wet per termijn van je vraagt." },
  { nr: "07", id: "tarieven", kort: "Tarieven", vraag: "Alle prijzen, vooraf bekend." },
  { nr: "08", id: "overstappen", kort: "Overstappen", vraag: "Hoe een overstap verloopt, en wie er nog meer in de groep zit." },
];

export const hoofdstuk = (id: string): Hoofdstuk => HOOFDSTUKKEN.find((h) => h.id === id)!;

/**
 * Het beeld bij de opening en bij elk hoofdstuk: de eigen fotoreeks van de
 * site, met een stempel die de klok van hoofdstuk 01 volgt. Wat het kost (04)
 * toont het bedrag in plaats van een foto.
 */
export const BEELDEN: Record<string, { src: string; alt: string; stempel: string }> = {
  opening: { src: "/beeld/home/kring-gesprek.webp", alt: "Vier mensen in een ontspannen gesprek aan een ronde tafel", stempel: "Brochure voor werkgevers" },
  "hoe-het-gaat": { src: "/beeld/home/even-bellen.webp", alt: "Een vrouw belt in haar keuken", stempel: "Maandag 08:12" },
  voorwoord: { src: "/beeld/kantoor/overleg.webp", alt: "Overleg aan een lange houten tafel op kantoor", stempel: "Sinds 2023, Eindhoven" },
  werkwijze: { src: "/beeld/werkgevers/persoonlijk-gesprek.webp", alt: "Twee vrouwen in een persoonlijk gesprek", stempel: "Vanaf dag 1" },
  diensten: { src: "/beeld/werkgevers/op-de-werkvloer.webp", alt: "Twee collega's op de werkvloer", stempel: "Van preventie tot re-integratie" },
  "jouw-rol": { src: "/beeld/home/samen-buiten.webp", alt: "Een leidinggevende en een medewerker wandelen samen", stempel: "Dag 1 tot week 104" },
  tarieven: { src: "/beeld/home/kring-samen-scherm.webp", alt: "Twee collega's kijken samen naar een scherm", stempel: "Tarieven, vooraf bekend" },
  overstappen: { src: "/beeld/werkgevers/werkplezier.webp", alt: "Drie collega's lachen samen aan tafel", stempel: "Week 1" },
};

/* ---------- Opening ---------- */

export const OPENING = {
  kop: "Grip op verzuim,",
  accent: "van preventie tot re-integratie.",
  onder: "Eén vast aanspreekpunt, van de eerste ziektedag tot de WIA-aanvraag. Ons systeem bewaakt elke poortwachtertermijn.",
};

/* ---------- 01 Hoe het gaat ---------- */

export const TIJDLIJN = {
  titel: "Maandagochtend, 08:12",
  lead: "Niemand plant een ziekmelding in. Hij komt op een ochtend binnen, en vanaf dat moment loopt er een klok die je niet ziet. Herken je deze maandagochtend? Heb je er grip op, of mogen we je helpen?",
  momenten: [
    { wanneer: "08:12", wat: "Mark meldt zich ziek. Rugklachten, zegt hij, hij weet niet hoe lang.", vraag: "Mag je doorvragen? En wat precies?" },
    { wanneer: "08:40", wat: "Je belt de planning. Zijn ploeg staat er vandaag één man korter op.", vraag: "Hoe lang kun je dit opvangen?" },
    { wanneer: "Dag 3", wat: "Je hebt niets meer gehoord. Je twijfelt of je hem zult bellen.", vraag: "Ben jij eigenlijk de regiehouder?" },
    { wanneer: "Week 2", wat: "De arbodienst plant een spreekuur in. Over drie weken, eerder is er geen plek.", vraag: "Wat mag je van je arbodienst verwachten?" },
    { wanneer: "Week 6", wat: "De probleemanalyse had er moeten liggen. Je weet niet of hij er is.", vraag: "Wie bewaakt dat eigenlijk?" },
    { wanneer: "Week 8", wat: "Er moet een plan van aanpak komen. Jij moet het opstellen.", vraag: "Wat moet daar eigenlijk in staan?" },
    { wanneer: "Week 42", wat: "Je had Mark bij het UWV moeten melden. Niemand heeft je eraan herinnerd.", vraag: "Was dat week 42 of week 44?" },
    { wanneer: "Week 104", wat: "Het UWV kijkt terug op twee jaar, op alles wat je had moeten doen.", vraag: "En nu is het te laat voor een UWV-proof dossier." },
  ],
  slot: "Op geen van deze momenten belde er iemand om te zeggen wat er moest gebeuren.",
  slotAccent: "Dat is precies het werk dat wij doen.",
};

/* ---------- 02 Voorwoord ---------- */

export const VOORWOORD_BROCHURE = {
  kop: "Verzuim gaat zelden mis omdat iemand niet beter wil worden.",
  accent: "Het gaat mis omdat niemand de termijnen bewaakt.",
  /** Na het verhaal uit de offerte (VOORWOORD, zonder de zinnen over "dit voorstel"). */
  slot: "Als werkgever ben en blijf je samen met je werknemer verantwoordelijk. Maar wie helpt je daarbij? Dat doen wij. Op de volgende pagina's lees je hoe, wat het je bespaart en wat het kost.",
};

/* ---------- 03 Onze werkwijze ---------- */

export const WERKWIJZE = {
  titel: "Wat je van ons merkt",
  citaat: "Onze eigen arbodienst belde niet terug.",
  lead: "Dat is de zin die we het vaakst horen in een eerste gesprek. Dit zijn de drie dingen die bij ons anders lopen, en die samen het verschil maken tussen een dossier dat je overkomt en een dossier dat je ziet aankomen.",
  punten: [
    {
      titel: "Je krijgt één aanspreekpunt",
      tekst: "Geen afdeling en geen keuzemenu. Je taakgedelegeerde casemanager kent je mensen en je dossiers en is bereikbaar op een direct nummer. Is je casemanager er niet, dan neemt een collega over die het dossier al kent.",
      label: "Bereikbaarheid",
      kern: "Direct nummer, geen keuzemenu",
    },
    {
      titel: "Een medisch team, sneller bij de bedrijfsarts",
      tekst: "Je casemanager werkt in taakdelegatie en vormt samen met de bedrijfsarts het medisch team, onder eindverantwoordelijkheid van de bedrijfsarts. Bij elke ziekmelding scheiden we snel medisch van niet-medisch verzuim. Zo zit je eerder aan tafel en blijft het spreekuur vrij voor wat de arts medisch moet toetsen.",
      label: "Snelheid",
      kern: "Eerder aan de beurt bij de bedrijfsarts",
    },
    {
      titel: "Ons systeem bewaakt de termijnen",
      tekst: "Afspraken, documenten en deadlines staan op één plek, in XpertSuite. Het systeem houdt bij welke stap wanneer moet, volgens de Wet verbetering poortwachter en voor eigenrisicodragers volgens de Ziektewet. Je leidinggevenden kijken mee met hun eigen rechten, zonder dat ze bij medische gegevens kunnen.",
      label: "Regie",
      kern: "Je kijkt zelf mee, elke dag",
    },
  ],
};

/* ---------- 04 Wat het kost ---------- */

/** Het rekenvoorbeeld: één werknemer met een jaarsalaris van €45.000, 70 procent loondoorbetaling. */
const SALARIS = 45_000;
const LOONDOORBETALING = 0.7;
const WERKNEMERS = 50;

export type Kostenvoorbeeld = {
  totaal: string;
  loon: string;
  sanctie: string;
  /** Een tweede spoor voor de eerste zes maanden, uit de prijslijst; null als hij er niet op staat. */
  spoor2: string | null;
  /** Een jaar Casemanagement Compleet voor vijftig werknemers; null zonder die aansluiting. */
  compleet: { bedrag: string; werknemers: number; jaren: string } | null;
};

/** De bedragen van hoofdstuk 04, met de prijzen uit de prijslijst van dit jaar. */
export function kostenvoorbeeld(p: Prijslijst): Kostenvoorbeeld {
  const loon = 2 * SALARIS * LOONDOORBETALING;
  const sanctie = SALARIS * LOONDOORBETALING;
  const spoor2 = p.groepen.flatMap((g) => g.kolommen.flat().flatMap((l) => l.regels)).find((r) => /^spoor 2, eerste/i.test(r.naam));
  const compleetPrijs = parsePrijs(p.aansluitingen.find((a) => /compleet/i.test(a.naam))?.prijs);
  const compleet = compleetPrijs ? compleetPrijs * WERKNEMERS : null;
  return {
    totaal: euro(loon + sanctie),
    loon: euro(loon),
    sanctie: euro(sanctie),
    spoor2: spoor2 ? spoor2.prijs : null,
    compleet: compleet
      ? { bedrag: euro(compleet), werknemers: WERKNEMERS, jaren: (Math.floor((sanctie / compleet) * 10) / 10).toLocaleString("nl-NL") }
      : null,
  };
}

export const KOSTEN = {
  titel: "Eén dossier dat vastloopt bij het UWV kost je dit, bij één werknemer.",
  onder: "Twee jaar loondoorbetaling plus een loonsanctie van het UWV",
  tekst: "Dit is geen schrikbedrag. Het is de optelsom die het UWV maakt als het oordeelt dat je te weinig hebt gedaan aan re-integratie. Het zwaarste deel is de loondoorbetaling, en die heb je sowieso. Het verschil zit in de sanctie: tot 52 weken extra loon, opgelegd omdat het dossier niet op orde was. Dat is het deel waar je op kunt sturen, en daar is onze hele werkwijze op gericht.",
  loon: "Wettelijk minimaal 70 procent, vaak meer volgens je cao. Gerekend met een jaarsalaris van €45.000. Deze kosten heb je hoe dan ook.",
  sanctie: "Tot 52 weken extra loondoorbetaling, opgelegd als je te weinig hebt gedaan aan re-integratie. Dit deel is te voorkomen.",
  bovenop: (spoor2: string | null) =>
    `Nog niet meegeteld: de re-integratiekosten die je week na week opbouwt${spoor2 ? `, zoals een tweede spoor (${spoor2} voor de eerste zes maanden)` : ""}, en de vervanging: een invalkracht, overwerk en inwerken.`,
  slot: "Een loonsanctie krijg je zelden door één grote fout.",
  slotAccent: "Je krijgt hem door vier weken waarin niemand iets deed.",
};

/* ---------- 05 Onze diensten ---------- */

/** Per label wat de brochure zegt: de teksten uit het voorbeeld, met de vinkjes van Susanne. */
export const DIENSTEN_BROCHURE: Record<DienstSlug, { dienst: string; tekst: string; punten: string[] }> = {
  recover: {
    dienst: "Verzuimbegeleiding",
    tekst: "Je taakgedelegeerde casemanager begeleidt elk dossier poortwachterproof, en voor eigenrisicodragers ook volgens de Ziektewet: ons systeem kent beide protocollen. Hiervoor bellen de meeste werkgevers ons.",
    punten: ["Taakgedelegeerde casemanager", "Bedrijfsarts en medisch team", "Poortwachterproof dossier", "Begeleiding eigenrisicodragers Ziektewet", "Online dossier in XpertSuite"],
  },
  resist: {
    dienst: "Preventie en vitaliteit",
    tekst: "We brengen risico's in kaart en houden teams gezond aan het werk.",
    punten: ["RI&E en toetsing", "Alle vier kerndeskundigen in huis", "Preventief medisch onderzoek", "Vitaliteit op de werkvloer", "Werkplekonderzoek", "Vertrouwenspersoon"],
  },
  restart: {
    dienst: "Re-integratie en loopbaan",
    tekst: "Lukt terugkeer in het eigen werk niet, dan zoeken we samen nieuw perspectief.",
    punten: ["Tweede spoor", "Loopbaanscan", "Coaching", "Outplacement", "Arbeidsdeskundig onderzoek"],
  },
  reflex: {
    dienst: "Voor de flexbranche",
    tekst: "Voor uitzendbureaus en eigenrisicodragers Ziektewet, ook na het einde van het dienstverband.",
    punten: ["Zieke flexkrachten", "Na einde dienstverband", "Eigenrisicodragerschap Ziektewet"],
  },
  ready: {
    dienst: "HR en arbeidsrecht",
    tekst: "Vragen over contracten, verlof of ontslag bij ziekte? Helder advies, snel geregeld.",
    punten: ["HR-advies rond verzuim", "Arbeidsrecht", "Advies bij conflicten", "Deskundigenoordeel UWV en second opinion bedrijfsarts"],
  },
  reward: {
    dienst: "Salaris en verloning",
    tekst: "Salaris en verloning door mensen die verzuim kennen, ook als iemand ziek is.",
    punten: ["Maand- of vierwekelijkse verloning", "Verloning van zieke medewerkers", "Extra runs en correcties", "Overgang Ziektewet en tweede ziektejaar"],
  },
};

export const DIENSTEN_INTRO = {
  titel: "Zes diensten, één dak",
  lead: "Al het werk rond verzuim zit bij ons onder één dak, in zes labels. Je casemanager haalt erbij wat een dossier nodig heeft, zonder dat je opnieuw hoeft uit te leggen wie je bent of een tweede contract hoeft te tekenen.",
  twijfel: "Niet zeker wat je nodig hebt?",
  twijfelTekst: "Bel ons en leg je situatie voor. We zeggen ook als je iets niet nodig hebt. Een advies op maat volgt binnen twee werkdagen.",
};

/* ---------- 06 Jouw rol ---------- */

export const VRAGEN = {
  titel: "Wat mag je eigenlijk vragen?",
  lead: "Dit is de vraag die we het vaakst krijgen, en de reden dat veel leidinggevenden maar helemaal niet bellen. Je wilt betrokken zijn zonder over een grens te gaan. De wet is daar duidelijker over dan je denkt.",
  mag: {
    kop: "Dit mag je gewoon vragen",
    onder: "Alles wat gaat over het werk en over wat iemand nog kan.",
    items: [
      "Hoe lang hij denkt dat het duurt",
      "Welke afspraken en klussen overgenomen moeten worden",
      "Welk werk hij op dit moment nog wél kan doen",
      "Of het verzuim komt door een bedrijfsongeval",
      "Of er een derde aansprakelijk is, bijvoorbeeld bij een aanrijding",
      "Of hij onder een vangnetregeling van de Ziektewet valt (niet welke)",
      "Op welk adres en nummer hij bereikbaar is",
    ],
  },
  magNiet: {
    kop: "Dit mag je niet vragen of vastleggen",
    onder: "Alles wat gaat over de ziekte zelf. Ook niet als hij het uit zichzelf vertelt.",
    items: [
      "Wat hij precies heeft, of wat de diagnose is",
      "Welke behandeling of medicatie hij krijgt",
      "Wat de huisarts of specialist heeft gezegd",
      "Of hij al eerder iets vergelijkbaars had",
      "Wat hij zelf over zijn klachten vertelt: dat mag je niet vastleggen",
    ],
  },
  bedrijfsarts: "En de bedrijfsarts dan?",
  bedrijfsartsTekst: "Die ziet het hele medische beeld, maar deelt met jou alleen wat je nodig hebt om het werk te regelen: welke belasting iemand aankan, welke taken wel en niet kunnen, en hoe lang dat naar verwachting duurt. Nooit de diagnose. Twijfel je of een vraag mag, bel dan even je casemanager.",
};

export const TERMIJNEN = {
  titel: "Wat moet jij doen als iemand ziek is?",
  lead: "De wet legt vaste stappen op een termijn. Per moment staat hier wat jouw verplichting is, en wat wij ervan overnemen.",
  rijen: [
    { moment: "Dag 1", stap: "Ziekmelding", jij: "Meld je medewerker ziek, het liefst op de eerste werkdag.", wij: "We nemen eerst met jou (HR of leidinggevende) contact op over de context van de ziekmelding. Daarna bellen we je werknemer en nemen zo nodig de medische anamnese af." },
    { moment: "Week 6", stap: "Probleemanalyse", jij: "De bedrijfsarts moet uiterlijk in week 6 een probleemanalyse maken.", wij: "We plannen het spreekuur en delen het advies met je." },
    { moment: "Week 8", stap: "Plan van aanpak", jij: "Stel samen met je medewerker een plan van aanpak op.", wij: "We begeleiden desgewenst jou en je werknemer bij het gesprek en leggen het plan vast." },
    { moment: "Elke 6 weken", stap: "Evaluatie", jij: "Bespreek de voortgang en leg die vast, ook als er niets verandert. Houd daarnaast minstens elke één à twee weken contact met je werknemer.", wij: "Het systeem signaleert de momenten. Jij en je werknemer stellen de evaluatie samen op en ondertekenen digitaal." },
    { moment: "Week 42", stap: "Ziekmelding bij UWV", jij: "Meld je werknemer uiterlijk in week 42 ziek bij het UWV.", wij: "Ons systeem herinnert je op tijd en we bewaken de melding." },
    { moment: "Week 52", stap: "Eerstejaarsevaluatie", jij: "Evalueer het eerste ziektejaar en maak nieuwe afspraken.", wij: "Op jouw verzoek bereiden we de evaluatie samen met je voor." },
    { moment: "Week 88", stap: "Re-integratieverslag", jij: "Leg het hele traject vast voor de WIA-aanvraag. Jij en je werknemer blijven verantwoordelijk voor het dossier.", wij: "Het systeem ordent mee en maakt het re-integratieverslag compleet, zodat je het eenvoudig toevoegt in het portaal van het UWV." },
    { moment: "Tot 2 jaar", stap: "Loondoorbetaling", jij: "Je betaalt maximaal 104 weken loon door, volgens je cao.", wij: "We sturen op herstel en passend werk, elke week." },
  ],
};

/* ---------- Tussen 06 en 07: klanten ---------- */

export const KLANTEN_KOP = "Wat werkgevers over ons zeggen";

/* ---------- 07 Tarieven ---------- */

export const OFFERTE_SNEL = {
  kop: "Binnen twee werkdagen",
  tekst: "ligt je offerte er na een eerste gesprek, op maat van je personeelsbestand.",
};

/* ---------- 08 Overstappen ---------- */

export const OVERSTAP = {
  titel: "Zo stap je over",
  lead: "Lopende verzuimdossiers nemen we over, zodat er geen termijn wordt gemist. Opzeggen bij je huidige arbodienst doe je zelf, de rest regelen we samen.",
  stappen: [
    { kop: "Week 1: inrichten", tekst: "We zetten XpertSuite klaar en koppelen je personeelsbestand. De medische informatie vraag je samen met je werknemer op bij je huidige arbodienst; je werknemer tekent daarvoor een machtiging." },
    { kop: "Week 2: kennismaken", tekst: "Je casemanager stelt zich voor aan je leidinggevenden en we vertellen je medewerkers wat er verandert. Lopende dossiers krijgen een eerste gesprek zodra de medische informatie van je huidige arbodienst binnen is." },
    { kop: "Daarna: draaien", tekst: "Nieuw verzuim pakken we vanaf dag één op. Binnen drie tot vier weken loopt alles, ook de termijnbewaking op de bestaande dossiers." },
  ],
  geenDatum: "Je hoeft niet te wachten op een contractdatum.",
  geenDatumTekst: "We nemen lopende dossiers midden in het jaar over, met de termijnen die al lopen. Het opzeggen bij je huidige arbodienst en de financiële afwikkeling regel je zelf, maar de begeleiding van je zieke medewerkers hoeft daar geen dag op te wachten.",
  or: "Let op: heeft je organisatie een ondernemingsraad (vanaf 50 medewerkers), dan heeft die instemmingsrecht bij de keuze van een arbodienst.",
};

export const ZUSTERLABELS = {
  titel: "Drie zusterlabels, één telefoonnummer",
  lead: "React2u hoort bij een groep die ook uitzendt en verloont. Zoek je naast arbodienstverlening ook personeel of payroll, dan schakelt je casemanager rechtstreeks met de collega's hiernaast.",
  labels: [
    { naam: "React2u", soort: "Arbodienst", tekst: "Verzuim en re-integratie, van de eerste ziektedag tot de WIA-aanvraag.", url: null, kleur: "#E61674" },
    { naam: "FlexHero", soort: "Technisch uitzenden", tekst: "Technisch personeel uit Nederland en Europa, met een eigen recruitmentkantoor in Braga.", url: "flexhero.com", kleur: "#3FA535" },
    { naam: "Jobbs", soort: "Payroll", tekst: "Payrolling en verloning voor werkgevers die het werkgeverschap willen beleggen.", url: "jobbs.nl", kleur: "#2F6FB5" },
    { naam: "Zorg Verbindt", soort: "Zorg", tekst: "Zorgpersoneel voor instellingen door heel Nederland.", url: "zorg-verbindt.nl", kleur: "#7AB51D" },
  ],
};
