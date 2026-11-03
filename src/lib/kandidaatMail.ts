/**
 * Vaste, persoonlijke mails aan kandidaten, verstuurd vanuit Sollicitaties in
 * het beheer: uitnodiging voor een gesprek, tussenbericht, afwijzing, aanbod.
 *
 * Alleen de tekst en de keuzes staan hier; versturen doet `sendKandidaatMail`
 * in app/admin/actions.ts via `sendBrief()` in mail.ts. Dit bestand heeft geen
 * server-afhankelijkheden, want het formulier gebruikt het ook in de browser
 * voor het voorbeeld terwijl je typt.
 *
 * De toon is die van React2u: je-vorm, korte zinnen, een mens aan het woord.
 * Een afwijzing noemt een reden en biedt een telefoontje aan; niemand hoort
 * het gevoel te krijgen een nummer te zijn geweest. De kandidaat krijgt de mail
 * in de taal waarin hij solliciteerde (`lang`, migratie 0015).
 */
import type { Taal } from "./taal";
import type { Application } from "./types";

export type Sjabloon = "uitnodiging" | "tweede_gesprek" | "tussenbericht" | "afwijzing" | "afwijzing_na_gesprek" | "aanbod";

export type VeldKey = "moment" | "locatie" | "uiterlijk";

export type Veld = {
  key: VeldKey;
  label: string;
  /** Voorbeeld in het lege veld. */
  hint: string;
  /** Vooraf ingevuld, in de taal van de kandidaat. */
  standaard?: Record<Taal, string>;
  verplicht?: boolean;
};

export type SjabloonDef = {
  key: Sjabloon;
  label: string;
  uitleg: string;
  /** De fase waar de sollicitatie na deze mail in staat; null laat hem staan. */
  fase: Application["status"] | null;
  velden: Veld[];
};

const WANNEER: Veld = { key: "moment", label: "Wanneer", hint: "bijv. donderdag 30 oktober om 10.00 uur", verplicht: true };
const WAAR: Veld = {
  key: "locatie",
  label: "Waar",
  hint: "of: online via Microsoft Teams, de link volgt",
  standaard: {
    nl: "bij ons op kantoor aan de Stratumsedijk 29 in Eindhoven",
    en: "at our office at Stratumsedijk 29 in Eindhoven",
  },
};

export const SJABLONEN: SjabloonDef[] = [
  {
    key: "uitnodiging", label: "Uitnodiging gesprek", fase: "gesprek",
    uitleg: "Een eerste kennismaking, bij ons op kantoor of online.",
    velden: [WANNEER, WAAR],
  },
  {
    key: "tweede_gesprek", label: "Tweede gesprek", fase: "gesprek",
    uitleg: "Na een goed eerste gesprek: kennismaken met het team.",
    velden: [WANNEER, WAAR],
  },
  {
    key: "tussenbericht", label: "Tussenbericht", fase: null,
    uitleg: "Het duurt langer dan beloofd; zeg wanneer de kandidaat wél iets hoort.",
    velden: [{
      key: "uiterlijk", label: "Je hoort uiterlijk", hint: "bijv. eind volgende week", verplicht: true,
      standaard: { nl: "eind volgende week", en: "the end of next week" },
    }],
  },
  {
    key: "afwijzing", label: "Afwijzing", fase: "afgewezen",
    uitleg: "Zonder gesprek: vriendelijk, met een reden en zonder de deur dicht te gooien.",
    velden: [],
  },
  {
    key: "afwijzing_na_gesprek", label: "Afwijzing na gesprek", fase: "afgewezen",
    uitleg: "Na een of meer gesprekken, met het aanbod om de keuze telefonisch toe te lichten.",
    velden: [],
  },
  {
    key: "aanbod", label: "Aanbod", fase: "aanbod",
    uitleg: "Goed nieuws, met het telefoontje waarin je het aanbod doorneemt.",
    velden: [{
      key: "moment", label: "Ik bel je", hint: "bijv. morgenochtend of vrijdag rond 14.00 uur", verplicht: true,
      standaard: { nl: "morgen", en: "tomorrow" },
    }],
  },
];

export function isSjabloon(v: unknown): v is Sjabloon {
  return typeof v === "string" && SJABLONEN.some((s) => s.key === v);
}

export function sjabloonDef(key: Sjabloon): SjabloonDef {
  return SJABLONEN.find((s) => s.key === key) ?? SJABLONEN[0];
}

/**
 * Welk sjabloon past bij de fase, en of de kandidaat nog iets van ons moet
 * horen. De fase zelf verzetten mailt niemand; staat iemand op afgewezen
 * zonder afwijzing in het logboek, dan zegt de kaart dat. Na een uitnodiging
 * ligt "na gesprek" voor de hand.
 */
export function mailVoorstel(fase: string, mails: Pick<KandidaatMailLog, "sjabloon">[]): { voorstel: Sjabloon; herinnering?: string } {
  const gehad = (...s: Sjabloon[]) => mails.some((m) => s.includes(m.sjabloon));
  const naGesprek = gehad("uitnodiging", "tweede_gesprek");
  if (fase === "afgewezen") {
    const voorstel: Sjabloon = naGesprek ? "afwijzing_na_gesprek" : "afwijzing";
    return gehad("afwijzing", "afwijzing_na_gesprek") ? { voorstel } : { voorstel, herinnering: "Nog geen afwijzing gemaild" };
  }
  if (fase === "aanbod") return { voorstel: "aanbod" };
  if (fase === "gesprek" && naGesprek) return { voorstel: "tweede_gesprek" };
  return { voorstel: "uitnodiging" };
}

export type Invoer = {
  naam: string;
  vacature: string | null;
  taal?: Taal;
  /** De kandidaat gaf toestemming om een jaar te bewaren (`retain_longer`). */
  retainLonger?: boolean;
  /** Wie ondertekent: de voornaam van de collega. */
  afzender: string;
  moment?: string;
  locatie?: string;
  uiterlijk?: string;
  /** Eigen tekst, komt als eigen alinea in de mail. */
  toevoeging?: string;
};

export type Brief = { onderwerp: string; aanhef: string; alineas: string[]; groet: string[] };

/** Logregel bij een sollicitatie (kolom `mails`, migratie 0032). */
export type KandidaatMailLog = { sjabloon: Sjabloon; onderwerp: string; at: string; door: string };

/** De waarde van een veld: ingevuld, anders de standaard in de taal van de kandidaat. */
export function veldWaarde(def: SjabloonDef, key: VeldKey, invoer: Partial<Record<VeldKey, string>>, taal: Taal): string {
  const eigen = (invoer[key] || "").trim();
  if (eigen) return eigen;
  return def.velden.find((v) => v.key === key)?.standaard?.[taal] || "";
}

/** Het eerste verplichte veld dat leeg is, als label; null als alles er is. */
export function ontbreekt(sjabloon: Sjabloon, invoer: Partial<Record<VeldKey, string>>, taal: Taal = "nl"): string | null {
  const def = sjabloonDef(sjabloon);
  const leeg = def.velden.find((v) => v.verplicht && !veldWaarde(def, v.key, invoer, taal));
  return leeg ? leeg.label : null;
}

/** "rens@react2u.nl" → "Rens"; "cindy.jansen@…" → "Cindy". */
export function voornaamUitEmail(email: string): string {
  const deel = email.split("@")[0].split(/[._-]/)[0] || "";
  return deel ? deel.charAt(0).toUpperCase() + deel.slice(1).toLowerCase() : "";
}

const voornaamVan = (naam: string) => naam.trim().split(/\s+/)[0] || naam;

export function stelOp(sjabloon: Sjabloon, i: Invoer): Brief {
  const taal: Taal = i.taal === "en" ? "en" : "nl";
  const def = sjabloonDef(sjabloon);
  const w = (k: VeldKey) => veldWaarde(def, k, i, taal);
  const voornaam = voornaamVan(i.naam);
  const tekst = (taal === "en" ? EN : NL)[sjabloon]({
    vacature: i.vacature?.trim() || null,
    retainLonger: i.retainLonger === true,
    moment: w("moment"),
    locatie: w("locatie"),
    uiterlijk: w("uiterlijk"),
    extra: (i.toevoeging || "").trim(),
  });
  const afzender = i.afzender.trim() || "React2u";
  return {
    onderwerp: tekst.onderwerp,
    aanhef: taal === "en" ? `Hi ${voornaam},` : `Hoi ${voornaam},`,
    alineas: tekst.alineas.filter(Boolean),
    groet: taal === "en"
      ? ["Kind regards,", afzender, "React2u · +31 85 620 58 00"]
      : ["Groet,", afzender, "React2u · 085 - 620 58 00"],
  };
}

type Ctx = { vacature: string | null; retainLonger: boolean; moment: string; locatie: string; uiterlijk: string; extra: string };
type Teksten = Record<Sjabloon, (c: Ctx) => { onderwerp: string; alineas: string[] }>;

const sollicitatieNl = (v: string | null) => (v ? `sollicitatie als ${v}` : "open sollicitatie");
const bewaarNl = (toestemming: boolean) =>
  toestemming
    ? "Je gaf toestemming om je gegevens een jaar te bewaren. Komt er een functie voorbij die bij je past, dan nemen we contact met je op."
    : "Je gegevens verwijderen we na afloop van de procedure, zoals in onze privacyverklaring staat.";
const SUCCES_NL = "We wensen je veel succes met je zoektocht.";
const ANDER_MOMENT_NL = "Komt dit moment niet uit? Antwoord dan op deze mail, dan zoeken we samen een ander moment.";

const NL: Teksten = {
  uitnodiging: (c) => ({
    onderwerp: "Uitnodiging voor een kennismakingsgesprek bij React2u",
    alineas: [
      `Bedankt voor je ${sollicitatieNl(c.vacature)}. We hebben je gegevens met interesse gelezen en maken graag kennis met je.`,
      `We nodigen je uit voor een gesprek op ${c.moment}, ${c.locatie}.`,
      "Reken op ongeveer een uur. We vertellen je over React2u en het werk, en zijn vooral benieuwd naar jou. Voorbereiden hoeft niet.",
      c.extra,
      ANDER_MOMENT_NL,
      "Tot dan!",
    ],
  }),
  tweede_gesprek: (c) => ({
    onderwerp: "Uitnodiging voor een tweede gesprek bij React2u",
    alineas: [
      "Fijn dat we elkaar hebben gesproken. We waren enthousiast en nodigen je graag uit voor een tweede gesprek.",
      `Dat is op ${c.moment}, ${c.locatie}. Je maakt dan kennis met een paar collega's uit het team.`,
      c.extra,
      ANDER_MOMENT_NL,
      "Tot dan!",
    ],
  }),
  tussenbericht: (c) => ({
    onderwerp: "Even een update over je sollicitatie bij React2u",
    alineas: [
      `Even een bericht tussendoor. Je ${sollicitatieNl(c.vacature)} heeft onze aandacht, maar we hebben iets meer tijd nodig dan we hadden beloofd.`,
      `Je hoort uiterlijk ${c.uiterlijk} van ons. We laten je niet in het ongewisse.`,
      c.extra,
      "Heb je in de tussentijd vragen? Antwoord gerust op deze mail.",
    ],
  }),
  afwijzing: (c) => ({
    onderwerp: "Je sollicitatie bij React2u",
    alineas: [
      `Bedankt voor je ${sollicitatieNl(c.vacature)} en voor de tijd die je erin hebt gestoken.`,
      "We hebben je gegevens zorgvuldig bekeken. Helaas gaan we niet met je verder: we kiezen voor kandidaten van wie de ervaring dichter ligt bij wat we voor deze functie zoeken. Dat zegt niets over jouw kwaliteiten, wel over wat wij nu nodig hebben.",
      c.extra,
      bewaarNl(c.retainLonger),
      SUCCES_NL,
    ],
  }),
  afwijzing_na_gesprek: (c) => ({
    onderwerp: "Je sollicitatie bij React2u",
    alineas: [
      "Bedankt voor het gesprek. We vonden het fijn om je te leren kennen en waarderen de openheid waarmee je over je werk en jezelf vertelde.",
      "Toch hebben we besloten niet met je verder te gaan. We kiezen voor een kandidaat die op dit moment net beter past bij de functie en het team. Dat was geen makkelijke keuze.",
      c.extra,
      "Wil je weten wat de doorslag gaf? Antwoord dan op deze mail, dan bel ik je om het toe te lichten.",
      bewaarNl(c.retainLonger),
      SUCCES_NL,
    ],
  }),
  aanbod: (c) => ({
    onderwerp: "Goed nieuws over je sollicitatie bij React2u",
    alineas: [
      `We hebben goed nieuws: we willen je graag een aanbod doen${c.vacature ? ` voor de functie van ${c.vacature}` : ""}.`,
      `Ik bel je ${c.moment} om het aanbod door te nemen: salaris, uren, startdatum en alles wat je verder wilt weten. Daarna zetten we het op papier.`,
      c.extra,
      "We hopen dat je net zo enthousiast bent als wij.",
    ],
  }),
};

const applicationEn = (v: string | null) => (v ? `application for ${v}` : "open application");
const bewaarEn = (toestemming: boolean) =>
  toestemming
    ? "You gave us permission to keep your details for a year. If a role comes up that suits you, we will get in touch."
    : "We will delete your details after the procedure, as described in our privacy statement.";
const SUCCES_EN = "We wish you every success in your search.";
const ANDER_MOMENT_EN = "Does this time not suit you? Reply to this email and we will find another moment together.";

const EN: Teksten = {
  uitnodiging: (c) => ({
    onderwerp: "Invitation to an introductory meeting at React2u",
    alineas: [
      `Thank you for your ${applicationEn(c.vacature)}. We read your details with interest and would like to get to know you.`,
      `We would like to invite you for a meeting on ${c.moment}, ${c.locatie}.`,
      "Count on about an hour. We will tell you about React2u and the work, and above all we are curious about you. No preparation needed.",
      c.extra,
      ANDER_MOMENT_EN,
      "See you then!",
    ],
  }),
  tweede_gesprek: (c) => ({
    onderwerp: "Invitation to a second meeting at React2u",
    alineas: [
      "It was good to talk to you. We were enthusiastic and would like to invite you for a second meeting.",
      `That is on ${c.moment}, ${c.locatie}. You will meet a few colleagues from the team.`,
      c.extra,
      ANDER_MOMENT_EN,
      "See you then!",
    ],
  }),
  tussenbericht: (c) => ({
    onderwerp: "A quick update on your application at React2u",
    alineas: [
      `A quick note in the meantime. Your ${applicationEn(c.vacature)} has our attention, but we need a little more time than we promised.`,
      `You will hear from us by ${c.uiterlijk} at the latest. We will not leave you guessing.`,
      c.extra,
      "Any questions in the meantime? Feel free to reply to this email.",
    ],
  }),
  afwijzing: (c) => ({
    onderwerp: "Your application at React2u",
    alineas: [
      `Thank you for your ${applicationEn(c.vacature)} and for the time you put into it.`,
      "We have looked at your details carefully. Unfortunately we will not be taking your application further: we are choosing candidates whose experience is closer to what we are looking for in this role. That says nothing about your qualities, only about what we need right now.",
      c.extra,
      bewaarEn(c.retainLonger),
      SUCCES_EN,
    ],
  }),
  afwijzing_na_gesprek: (c) => ({
    onderwerp: "Your application at React2u",
    alineas: [
      "Thank you for the conversation. We enjoyed getting to know you and appreciate how openly you talked about your work and yourself.",
      "Still, we have decided not to continue with your application. We are choosing a candidate who, at this moment, is a slightly better fit for the role and the team. It was not an easy choice.",
      c.extra,
      "Would you like to know what tipped the balance? Reply to this email and I will call you to explain.",
      bewaarEn(c.retainLonger),
      SUCCES_EN,
    ],
  }),
  aanbod: (c) => ({
    onderwerp: "Good news about your application at React2u",
    alineas: [
      `We have good news: we would like to make you an offer${c.vacature ? ` for the position of ${c.vacature}` : ""}.`,
      `I will call you ${c.moment} to go through the offer: salary, hours, start date and anything else you want to know. After that we put it in writing.`,
      c.extra,
      "We hope you are as enthusiastic as we are.",
    ],
  }),
};
