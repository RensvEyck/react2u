/**
 * De termijnen van de Wet verbetering poortwachter als datums, voor de
 * Poortwachter-planner (/kennis/poortwachter-planner) en het agenda-bestand.
 *
 * De weken tellen vanaf de eerste ziektedag: dag 1 is de eerste ziektedag,
 * week 6 eindigt op dag 42. "Uiterlijk in week 6" is dus de laatste dag van
 * die week; eerder mag altijd. De 42e-weeksmelding is de uitzondering: UWV
 * wil die uiterlijk op de eerste werkdag nadat de werknemer 42 weken ziek is.
 *
 * Alles hier is puur en rekent in UTC op de middag, zodat de zomertijd geen
 * dag verschuift. De teksten zijn dezelfde als in de gids
 * (src/content/wet-verbetering-poortwachter.json).
 */

export type Mijlpaal = {
  sleutel: string;
  /** De week uit de wet; null voor "elke zes weken". */
  week: number | null;
  /** De dag vanaf de eerste ziektedag (dag 1) waarop de termijn afloopt. */
  dag: number;
  titel: string;
  wie: string;
  tekst: string;
  /** "uiterlijk" (een harde termijn), "rond" (een gebruikelijk moment) of "elke 6 weken". */
  aard: "uiterlijk" | "rond" | "herhalend";
};

export const MIJLPALEN: Mijlpaal[] = [
  { sleutel: "ziekmelding", week: 1, dag: 7, aard: "uiterlijk", titel: "Ziekmelding bij de arbodienst", wie: "Werkgever", tekst: "Uiterlijk een week na de eerste ziektedag; bij React2u meld je op dag één." },
  { sleutel: "probleemanalyse", week: 6, dag: 42, aard: "uiterlijk", titel: "Probleemanalyse", wie: "Bedrijfsarts", tekst: "Wat kan je werknemer nog, wat is de verwachting en welk advies geldt voor werkhervatting." },
  { sleutel: "plan-van-aanpak", week: 8, dag: 56, aard: "uiterlijk", titel: "Plan van aanpak", wie: "Werkgever en werknemer", tekst: "Doel, stappen en evaluatiemomenten, door beiden ondertekend; je wijst een casemanager aan." },
  { sleutel: "evaluatie", week: null, dag: 98, aard: "herhalend", titel: "Evaluatie plan van aanpak", wie: "Werkgever en werknemer", tekst: "Minstens elke zes weken bespreken hoe het gaat en het plan bijstellen; elk gesprek vastleggen." },
  { sleutel: "42-weken", week: 42, dag: 294, aard: "uiterlijk", titel: "Ziekmelding bij UWV (42e-weeksmelding)", wie: "Werkgever", tekst: "Uiterlijk op de eerste werkdag nadat je werknemer 42 weken ziek is." },
  { sleutel: "eerstejaarsevaluatie", week: 52, dag: 364, aard: "uiterlijk", titel: "Eerstejaarsevaluatie", wie: "Werkgever en werknemer", tekst: "Het opschudmoment: is er concreet zicht op terugkeer bij jou?" },
  { sleutel: "tweede-spoor", week: 58, dag: 406, aard: "uiterlijk", titel: "Start tweede spoor (als terugkeer bij jou niet haalbaar is)", wie: "Werkgever", tekst: "Uiterlijk zes weken na de eerstejaarsevaluatie, als er dan geen concreet zicht op terugkeer bij jou is." },
  { sleutel: "wia-brief", week: 88, dag: 616, aard: "rond", titel: "Brief van UWV over de WIA-aanvraag", wie: "UWV", tekst: "Je werknemer krijgt de brief; samen stellen jullie het re-integratieverslag samen." },
  { sleutel: "eindevaluatie", week: 91, dag: 637, aard: "uiterlijk", titel: "Eindevaluatie en actueel oordeel", wie: "Werkgever, werknemer en bedrijfsarts", tekst: "Hoe is het traject verlopen; de bedrijfsarts beschrijft de huidige belastbaarheid." },
  { sleutel: "wia-aanvraag", week: 93, dag: 651, aard: "uiterlijk", titel: "WIA-aanvraag", wie: "Werknemer", tekst: "Met het complete re-integratieverslag; UWV toetst eerst de inspanningen." },
  { sleutel: "einde-loondoorbetaling", week: 104, dag: 728, aard: "uiterlijk", titel: "Einde loondoorbetaling", wie: "UWV", tekst: "Na twee jaar stopt de loondoorbetaling, als UWV de re-integratie voldoende vindt." },
];

/** Interval van de evaluaties, in dagen. */
export const EVALUATIE_INTERVAL = 42;

/** Een datum "JJJJ-MM-DD" als UTC-middag, of null als hij ongeldig is. */
export function parseDatum(s: string | null | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00Z`);
  if (Number.isNaN(+d)) return null;
  // "2026-02-31" wordt door Date naar maart geschoven; dat is geen geldige invoer.
  return d.toISOString().slice(0, 10) === s ? d : null;
}

export function isoDatum(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function plusDagen(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

/** De eerstvolgende werkdag (maandag tot en met vrijdag) op of na deze datum. */
export function werkdagOpOfNa(d: Date): Date {
  let x = d;
  while (x.getUTCDay() === 0 || x.getUTCDay() === 6) x = plusDagen(x, 1);
  return x;
}

export type Termijn = Mijlpaal & { datum: Date; iso: string };

/**
 * Alle termijnen voor een eerste ziektedag. Dag 1 is de eerste ziektedag,
 * dus dag n valt op eersteZiektedag + (n - 1). De 42e-weeksmelding valt op de
 * eerste werkdag ná dag 294.
 */
export function termijnen(eersteZiektedag: Date): Termijn[] {
  return MIJLPALEN.map((m) => {
    let datum = plusDagen(eersteZiektedag, m.dag - 1);
    if (m.sleutel === "42-weken") datum = werkdagOpOfNa(plusDagen(datum, 1));
    return { ...m, datum, iso: isoDatum(datum) };
  });
}

/** De termijnen die nog komen, gezien vanaf vandaag; de rest is verstreken. */
export function nogTeDoen(lijst: Termijn[], vandaag: Date): { komend: Termijn[]; verstreken: Termijn[] } {
  const v = isoDatum(vandaag);
  return { komend: lijst.filter((t) => t.iso >= v), verstreken: lijst.filter((t) => t.iso < v) };
}

export function datumLangNl(d: Date): string {
  return d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/* ---------- het agenda-bestand ---------- */

function icsDatum(d: Date): string {
  return isoDatum(d).replace(/-/g, "");
}

/** Tekst in een ics-regel: komma's, puntkomma's en regeleinden ontsnapt. */
function icsTekst(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Regels langer dan 75 bytes vouwen, zoals RFC 5545 vraagt (de vervolgregel begint met een spatie). */
function vouw(regel: string): string {
  const delen: string[] = [];
  let rest = regel;
  while (rest.length > 73) {
    delen.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  delen.push(rest);
  return delen.join("\r\n");
}

/**
 * Een iCalendar-bestand met alle termijnen als hele dagen, en de evaluaties
 * als een herhalende afspraak elke zes weken tot de eindevaluatie. Elke
 * afspraak linkt naar de gids; de uid is vast per ziektedag en termijn, zodat
 * opnieuw importeren dezelfde afspraken bijwerkt in plaats van dubbel zet.
 */
export function naarIcs(eersteZiektedag: Date, site: string): string {
  const lijst = termijnen(eersteZiektedag);
  const stempel = `${icsDatum(new Date())}T000000Z`;
  const gids = `${site}/wet-verbetering-poortwachter`;
  const regels: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//React2u//Poortwachter-planner//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsTekst(`Poortwachter, eerste ziektedag ${datumLangNl(eersteZiektedag)}`)}`,
  ];
  for (const t of lijst) {
    const einde = plusDagen(t.datum, 1);
    const kop = t.aard === "herhalend" ? "Elke 6 weken" : t.week ? `week ${t.week}` : "";
    regels.push(
      "BEGIN:VEVENT",
      `UID:poortwachter-${isoDatum(eersteZiektedag)}-${t.sleutel}@react2u.nl`,
      `DTSTAMP:${stempel}`,
      `DTSTART;VALUE=DATE:${icsDatum(t.datum)}`,
      `DTEND;VALUE=DATE:${icsDatum(einde)}`,
      `SUMMARY:${icsTekst(`Poortwachter: ${t.titel}${kop ? ` (${kop})` : ""}`)}`,
      `DESCRIPTION:${icsTekst(`${t.aard === "uiterlijk" ? "Uiterlijk op deze dag. " : t.aard === "rond" ? "Rond deze dag. " : ""}${t.tekst} Wie: ${t.wie}. Meer: ${gids}`)}`,
      `URL:${gids}`,
      "CATEGORIES:Verzuim",
    );
    if (t.aard === "herhalend") {
      const laatste = lijst.find((x) => x.sleutel === "eindevaluatie")?.datum ?? plusDagen(eersteZiektedag, 637);
      regels.push(`RRULE:FREQ=WEEKLY;INTERVAL=6;UNTIL=${icsDatum(laatste)}`);
    }
    regels.push("END:VEVENT");
  }
  regels.push("END:VCALENDAR");
  return `${regels.map(vouw).join("\r\n")}\r\n`;
}
