/**
 * Vakgebiedpagina's onder Werken bij (/vacatures/vakgebied/[slug] en
 * /en/jobs/vakgebied/[slug]), naar voorbeeld van werkenbijacture.nl. Ze
 * blijven staan als er geen vacature openstaat, zodat ze vindbaar zijn in
 * Google en AI zoekmachines. Vacatures horen bij een vakgebied via hun
 * kenmerk `vakgebied` uit de admin (zie `onderdelen`).
 *
 * Cijfers (dossiers per casemanager, teamgrootte, werktijden) staan hier
 * bewust nog niet in: die vullen we pas in als ze bevestigd zijn.
 */

type Tekst = {
  titel: string;
  eyebrow: string;
  intro: string;
  seo: string;
  fasenKop: string;
  fasen: { kop: string; tekst: string }[];
  groeiKop: string;
  groeiTekst: string;
  groei: { kop: string; tekst: string }[];
  samenKop: string;
  samen: string;
  faq: { vraag: string; antwoord: string }[];
};

export type Vakgebied = {
  slug: string;
  /** Waarden van `vakgebied` in de admin die bij deze pagina horen. */
  onderdelen: string[];
  nl: Tekst;
  en: Tekst;
};

export const VAKGEBIEDEN: Vakgebied[] = [
  {
    slug: "casemanagement",
    onderdelen: ["Casemanagement", "Re-integratie", "Verzuimadvies"],
    nl: {
      titel: "Werken als casemanager verzuim",
      eyebrow: "Vakgebied",
      intro: "Als casemanager bij React2u heb je de regie op het verzuim van werknemers bij onze klanten. Je zorgt dat werkgever, werknemer en bedrijfsarts op tijd de juiste stappen zetten, en dat iemand zo snel en duurzaam mogelijk terugkeert.",
      seo: "Werken als casemanager verzuim bij arbodienst React2u in Eindhoven. Wat het werk inhoudt, hoe je groeit en met wie je samenwerkt.",
      fasenKop: "Wat doe je als casemanager?",
      fasen: [
        { kop: "Ziekmelding en eerste contact", tekst: "Je neemt contact op met werknemer en werkgever, brengt de situatie in kaart en plant waar nodig het spreekuur bij de bedrijfsarts." },
        { kop: "Regie op het traject", tekst: "Je stelt samen een plan van aanpak op, evalueert minimaal elke 6 weken en bewaakt de termijnen van de Wet verbetering poortwachter." },
        { kop: "Terug naar werk", tekst: "Je begeleidt de terugkeer in eigen of ander werk. Lukt dat niet, dan zet je het tweede spoor in en zorg je voor een dossier dat klaar is voor UWV." },
      ],
      groeiKop: "Zo groei je",
      groeiTekst: "Je hoeft niet alles al te kunnen. Je groeit stap voor stap, met opleidingen die wij betalen.",
      groei: [
        { kop: "Junior casemanager", tekst: "Je leert het vak naast ervaren collega's en volgt de opleiding casemanager verzuim." },
        { kop: "Casemanager verzuim", tekst: "Je begeleidt een eigen dossierpakket en bent vast aanspreekpunt voor je klanten." },
        { kop: "Senior of taakgedelegeerd", tekst: "Je pakt complexe dossiers op, coacht collega's of voert onder supervisie van de bedrijfsarts ook medische gesprekken." },
      ],
      samenKop: "Met wie werk je samen?",
      samen: "Je werkt nauw samen met onze bedrijfsartsen, praktijkondersteuners en planners. Bij complexe dossiers schakel je specialisten in, zoals een arbeidsdeskundige, re-integratiecoach of bedrijfspsycholoog.",
      faq: [
        { vraag: "Is casemanagement vooral administratie?", antwoord: "Een goed dossier hoort erbij, maar het grootste deel van je werk is contact: met werknemers, werkgevers en de bedrijfsarts. Planners nemen je zoveel mogelijk werk uit handen." },
        { vraag: "Heb ik ervaring nodig?", antwoord: "Voor de juniorfunctie niet. Voor de medior en senior functies vragen we ervaring met verzuimdossiers." },
        { vraag: "Betaalt React2u mijn opleiding?", antwoord: "Ja. Opleidingen en registraties die je vak beter maken, zoals casemanager verzuim, taakdelegatie en ROV, vallen onder ons opleidingsbudget." },
      ],
    },
    en: {
      titel: "Working as an absence case manager",
      eyebrow: "Field",
      intro: "As a case manager at React2u you are in charge of the absence of employees at our clients. You make sure employer, employee and occupational physician take the right steps on time, and that people return to work as quickly and sustainably as possible.",
      seo: "Working as an absence case manager at occupational health service React2u in Eindhoven. What the work involves, how you grow and who you work with.",
      fasenKop: "What does a case manager do?",
      fasen: [
        { kop: "Sickness report and first contact", tekst: "You contact the employee and employer, map out the situation and schedule a consultation with the occupational physician where needed." },
        { kop: "Managing the process", tekst: "You draw up an action plan together, evaluate at least every 6 weeks and monitor the deadlines of the Gatekeeper Improvement Act (Wet verbetering poortwachter)." },
        { kop: "Back to work", tekst: "You guide the return to the employee's own or other work. If that does not work out, you start the second track and make sure the file is ready for UWV." },
      ],
      groeiKop: "How you grow",
      groeiTekst: "You do not need to know everything yet. You grow step by step, with training that we pay for.",
      groei: [
        { kop: "Junior case manager", tekst: "You learn the profession alongside experienced colleagues and follow the absence case manager training." },
        { kop: "Absence case manager", tekst: "You manage your own caseload and are the regular point of contact for your clients." },
        { kop: "Senior or delegated", tekst: "You take on complex files, coach colleagues or, under the supervision of the occupational physician, also hold medical conversations." },
      ],
      samenKop: "Who do you work with?",
      samen: "You work closely with our occupational physicians, practice assistants and planners. For complex files you bring in specialists such as a labour expert, reintegration coach or occupational psychologist.",
      faq: [
        { vraag: "Is case management mostly admin?", antwoord: "A good file is part of it, but most of your work is contact: with employees, employers and the occupational physician. Planners take as much work off your hands as possible." },
        { vraag: "Do I need experience?", antwoord: "Not for the junior role. For the medior and senior roles we ask for experience with absence files." },
        { vraag: "Does React2u pay for my training?", antwoord: "Yes. Training and registrations that make you better at your job, such as absence case manager, task delegation and ROV, fall under our training budget." },
      ],
    },
  },
  {
    slug: "bedrijfsgeneeskunde",
    onderdelen: ["Bedrijfsgeneeskunde", "Verzekeringsgeneeskunde", "Bedrijfsgezondheidszorg"],
    nl: {
      titel: "Werken als bedrijfsarts",
      eyebrow: "Vakgebied",
      intro: "Bij React2u heb je als bedrijfsarts tijd voor de mens tegenover je. Casemanagers en planners doen het voorwerk, jij brengt het medische oordeel. Samen met praktijkondersteuners en verpleegkundigen vorm je het medische hart van de arbodienst.",
      seo: "Werken als bedrijfsarts, AIOS, POB of arboverpleegkundige bij arbodienst React2u in Eindhoven. Het werk, de route naar bedrijfsarts en het team.",
      fasenKop: "Wat doe je als bedrijfsarts?",
      fasen: [
        { kop: "Spreekuur", tekst: "Je spreekt werknemers op locatie, op kantoor of online, en beoordeelt belastbaarheid en prognose." },
        { kop: "Advies", tekst: "Je geeft werkgever en casemanager een helder advies en voert sociaal medisch overleg, zodat iedereen weet wat de volgende stap is." },
        { kop: "Preventie en supervisie", tekst: "Je denkt mee over preventie en PMO's en geeft supervisie aan praktijkondersteuners en taakgedelegeerde casemanagers." },
      ],
      groeiKop: "De route naar bedrijfsarts",
      groeiTekst: "Ben je basisarts, dan kun je bij ons de hele route doorlopen, met een vaste supervisor of praktijkopleider naast je.",
      groei: [
        { kop: "Basisarts", tekst: "Je houdt spreekuren onder supervisie van een ervaren bedrijfsarts en ontdekt of het vak bij je past." },
        { kop: "Arts in opleiding (AIOS)", tekst: "Je volgt de opleiding tot bedrijfsarts en krijgt steeds meer eigen verantwoordelijkheid." },
        { kop: "Bedrijfsarts en stafarts", tekst: "Je begeleidt een eigen groep klanten en kunt doorgroeien naar stafarts, met verantwoordelijkheid voor de medische kwaliteit." },
      ],
      samenKop: "Met wie werk je samen?",
      samen: "Je werkt met casemanagers, praktijkondersteuners, arboverpleegkundigen en planners. Waar nodig schakel je specialisten in zoals een arbeidsdeskundige, bedrijfspsycholoog of verzekeringsarts.",
      faq: [
        { vraag: "Kan ik ook als zelfstandige werken?", antwoord: "Ja. Voor bedrijfsartsen en stafartsen hebben we ook ZZP opdrachten, voor een vast aantal dagdelen per week." },
        { vraag: "Kan ik parttime werken?", antwoord: "Ja, dat is bespreekbaar. We stemmen je uren en spreekuren samen af." },
        { vraag: "Werken jullie met taakdelegatie?", antwoord: "Ja. Praktijkondersteuners en taakgedelegeerde casemanagers werken onder supervisie van de bedrijfsarts, volgens de leidraad van de NVAB." },
      ],
    },
    en: {
      titel: "Working as an occupational physician",
      eyebrow: "Field",
      intro: "At React2u, as an occupational physician you have time for the person in front of you. Case managers and planners do the groundwork, you bring the medical judgement. Together with practice assistants and nurses you form the medical heart of the service.",
      seo: "Working as an occupational physician, resident, practice assistant or occupational health nurse at React2u in Eindhoven. The work, the route to occupational physician and the team.",
      fasenKop: "What does an occupational physician do?",
      fasen: [
        { kop: "Consultations", tekst: "You see employees on site, at the office or online, and assess work capacity and prognosis." },
        { kop: "Advice", tekst: "You give employer and case manager clear advice and hold social medical consultations, so everyone knows the next step." },
        { kop: "Prevention and supervision", tekst: "You contribute to prevention and periodic health checks and supervise practice assistants and delegated case managers." },
      ],
      groeiKop: "The route to occupational physician",
      groeiTekst: "As a junior doctor you can follow the whole route with us, with a regular supervisor or practice supervisor at your side.",
      groei: [
        { kop: "Junior doctor", tekst: "You hold consultations under the supervision of an experienced occupational physician and find out whether the field suits you." },
        { kop: "Resident (AIOS)", tekst: "You follow the specialist training and gain more and more responsibility." },
        { kop: "Occupational physician and medical lead", tekst: "You look after your own clients and can grow into medical lead, responsible for medical quality." },
      ],
      samenKop: "Who do you work with?",
      samen: "You work with case managers, practice assistants, occupational health nurses and planners. Where needed you bring in specialists such as a labour expert, occupational psychologist or insurance physician.",
      faq: [
        { vraag: "Can I also work self-employed?", antwoord: "Yes. For occupational physicians and medical leads we also have freelance assignments, for a fixed number of half days a week." },
        { vraag: "Can I work part time?", antwoord: "Yes, that is open for discussion. We agree your hours and consultations together." },
        { vraag: "Do you work with task delegation?", antwoord: "Yes. Practice assistants and delegated case managers work under the supervision of the occupational physician, in line with the NVAB guideline." },
      ],
    },
  },
  {
    slug: "arbo-en-preventie",
    onderdelen: ["Arbo en preventie", "Arbeidsdeskundigheid", "Psychologie", "Maatschappelijk werk"],
    nl: {
      titel: "Werken in arbo en preventie",
      eyebrow: "Vakgebied",
      intro: "Voorkomen is beter dan genezen. Als specialist bij React2u help je werkgevers om uitval te voorkomen en mensen duurzaam aan het werk te houden: van RI&E en werkplekonderzoek tot begeleiding bij werkdruk en psychische klachten.",
      seo: "Werken als arbeidsdeskundige, veiligheidskundige, arbeidshygiënist, A&O-deskundige of bedrijfspsycholoog bij arbodienst React2u in Eindhoven.",
      fasenKop: "Wat doe je als specialist?",
      fasen: [
        { kop: "Onderzoeken", tekst: "Je brengt risico's in kaart: op de werkvloer, in de organisatie of bij een individuele werknemer." },
        { kop: "Adviseren", tekst: "Je vertaalt wat je ziet naar advies dat werkgevers ook echt kunnen uitvoeren." },
        { kop: "Begeleiden", tekst: "Je helpt bij de uitvoering, van een plan van aanpak tot kortdurende begeleiding van werknemers." },
      ],
      groeiKop: "Specialismen",
      groeiTekst: "Binnen arbo en preventie werken verschillende specialisten samen. Wil je je verder ontwikkelen, bijvoorbeeld van middelbaar naar hoger veiligheidskundige, dan valt die opleiding onder ons opleidingsbudget.",
      groei: [
        { kop: "Arbeidsdeskundige", tekst: "Je onderzoekt wat iemand nog kan en wat passend werk is." },
        { kop: "Kerndeskundigen", tekst: "Als A&O-deskundige, arbeidshygiënist of hoger veiligheidskundige toets je RI&E's en adviseer je over risico's." },
        { kop: "Psycholoog en maatschappelijk werker", tekst: "Je begeleidt werknemers bij psychische klachten of als werk en privé in de knel komen." },
      ],
      samenKop: "Met wie werk je samen?",
      samen: "Je werkt samen met bedrijfsartsen en casemanagers, die jou inschakelen bij dossiers en klanten waar jouw expertise het verschil maakt.",
      faq: [
        { vraag: "Werk ik vooral op locatie?", antwoord: "Dat verschilt per specialisme. Veiligheidskundigen en arbeidshygiënisten zijn veel bij klanten, psychologen werken op locatie of online." },
        { vraag: "Heb ik een certificaat nodig?", antwoord: "Om een RI&E te mogen toetsen moet je gecertificeerd kerndeskundige zijn. Voor andere functies vragen we de diploma's en registraties die bij je vak horen." },
      ],
    },
    en: {
      titel: "Working in occupational health and prevention",
      eyebrow: "Field",
      intro: "Prevention is better than cure. As a specialist at React2u you help employers prevent absence and keep people in sustainable work: from risk assessments and workplace research to support with work pressure and mental health issues.",
      seo: "Working as a labour expert, safety expert, occupational hygienist, A&O expert or occupational psychologist at React2u in Eindhoven.",
      fasenKop: "What does a specialist do?",
      fasen: [
        { kop: "Investigate", tekst: "You map out risks: on the shop floor, in the organisation or for an individual employee." },
        { kop: "Advise", tekst: "You translate what you see into advice that employers can actually put into practice." },
        { kop: "Support", tekst: "You help with implementation, from an action plan to short term support for employees." },
      ],
      groeiKop: "Specialisms",
      groeiTekst: "Within occupational health and prevention, different specialists work together. Want to develop further, for example from intermediate to senior safety expert? That training falls under our training budget.",
      groei: [
        { kop: "Labour expert", tekst: "You assess what someone can still do and what suitable work is." },
        { kop: "Core experts", tekst: "As an A&O expert, occupational hygienist or senior safety expert you review risk assessments and advise on risks." },
        { kop: "Psychologist and social worker", tekst: "You support employees with mental health issues or when work and private life are getting squeezed." },
      ],
      samenKop: "Who do you work with?",
      samen: "You work with occupational physicians and case managers, who bring you in on files and clients where your expertise makes the difference.",
      faq: [
        { vraag: "Do I mainly work on site?", antwoord: "That depends on the specialism. Safety experts and occupational hygienists spend a lot of time at clients, psychologists work on site or online." },
        { vraag: "Do I need a certificate?", antwoord: "To review a risk assessment you must be a certified core expert. For other roles we ask for the diplomas and registrations that come with your profession." },
      ],
    },
  },
  {
    slug: "kantoor-en-ondersteuning",
    onderdelen: ["Planning en ondersteuning", "Sales", "Kwaliteit en privacy", "ICT", "Stage"],
    nl: {
      titel: "Werken op kantoor bij React2u",
      eyebrow: "Vakgebied",
      intro: "Zonder planning, sales, kwaliteit en ICT draait geen enkele arbodienst. Op ons kantoor in Eindhoven zorg jij dat artsen en casemanagers hun werk kunnen doen, en dat React2u blijft groeien.",
      seo: "Werken als planner, medewerker verzuimmeldpunt, accountmanager, kwaliteitsfunctionaris of functioneel beheerder bij React2u in Eindhoven.",
      fasenKop: "Wat doe je op kantoor?",
      fasen: [
        { kop: "Plannen en ontvangen", tekst: "Je zorgt dat spreekuren goed gepland zijn en dat ziekmeldingen direct bij de juiste casemanager terechtkomen." },
        { kop: "Groeien", tekst: "Je brengt nieuwe werkgevers binnen en bouwt relaties met klanten en partners uit." },
        { kop: "Borgen en bouwen", tekst: "Je houdt kwaliteit en privacy op orde en bouwt mee aan ons eigen verzuimsysteem." },
      ],
      groeiKop: "Functies",
      groeiTekst: "Op kantoor werken verschillende functies nauw samen. Omdat React2u onderdeel is van een groep met meerdere labels, kun je ook buiten React2u doorgroeien.",
      groei: [
        { kop: "Planning en meldpunt", tekst: "Je bent de spil tussen klanten, artsen en casemanagers." },
        { kop: "Sales", tekst: "Je werft nieuwe mkb klanten en werkt samen met partners zoals accountants en salariskantoren." },
        { kop: "Kwaliteit, privacy en ICT", tekst: "Je zorgt dat we zorgvuldig met medische gegevens werken en dat onze systemen goed werken." },
      ],
      samenKop: "Met wie werk je samen?",
      samen: "Je werkt dagelijks met casemanagers, bedrijfsartsen en de directie, en hebt direct contact met de eigenaar.",
      faq: [
        { vraag: "Werk ik op kantoor?", antwoord: "Ja, de meeste kantoorfuncties werken vanuit ons kantoor in Eindhoven." },
        { vraag: "Kan ik ook stage lopen?", antwoord: "Ja. We bieden stageplekken voor MBO en HBO studenten in HRM en social work." },
      ],
    },
    en: {
      titel: "Working at the React2u office",
      eyebrow: "Field",
      intro: "No occupational health service runs without planning, sales, quality and IT. At our office in Eindhoven you make sure physicians and case managers can do their work, and that React2u keeps growing.",
      seo: "Working as a planner, absence desk employee, account manager, quality officer or functional administrator at React2u in Eindhoven.",
      fasenKop: "What do you do at the office?",
      fasen: [
        { kop: "Planning and reception", tekst: "You make sure consultations are well scheduled and that sickness reports go straight to the right case manager." },
        { kop: "Growth", tekst: "You bring in new employers and build relationships with clients and partners." },
        { kop: "Quality and building", tekst: "You keep quality and privacy in order and help build our own absence management system." },
      ],
      groeiKop: "Roles",
      groeiTekst: "Different roles work closely together at the office. Because React2u is part of a group with several labels, you can also grow beyond React2u.",
      groei: [
        { kop: "Planning and reporting desk", tekst: "You are the hub between clients, physicians and case managers." },
        { kop: "Sales", tekst: "You recruit new SME clients and work with partners such as accountants and payroll bureaus." },
        { kop: "Quality, privacy and IT", tekst: "You make sure we handle medical data carefully and that our systems work well." },
      ],
      samenKop: "Who do you work with?",
      samen: "You work daily with case managers, occupational physicians and management, and have direct contact with the owner.",
      faq: [
        { vraag: "Do I work at the office?", antwoord: "Yes, most office roles work from our office in Eindhoven." },
        { vraag: "Can I do an internship?", antwoord: "Yes. We offer internships for MBO and HBO students in HRM and social work." },
      ],
    },
  },
];

export function vakgebiedVan(vakgebied?: string | null): Vakgebied | null {
  if (!vakgebied) return null;
  return VAKGEBIEDEN.find((g) => g.onderdelen.includes(vakgebied.trim())) || null;
}

export function vakgebiedOpSlug(slug: string): Vakgebied | null {
  return VAKGEBIEDEN.find((g) => g.slug === slug) || null;
}
