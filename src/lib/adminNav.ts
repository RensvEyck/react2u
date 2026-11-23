import {
  LuLayoutDashboard, LuFileText, LuBriefcase, LuUsers, LuInbox, LuImage,
  LuSettings, LuUserRound, LuMessageSquare, LuNewspaper, LuSearch, LuPhone,
  LuChartNoAxesColumn, LuUserCog, LuPlus, LuConstruction, LuExternalLink, LuUserPlus, LuUpload,
  LuShieldCheck, LuSignpost, LuTrash2, LuBuilding, LuLogOut, LuMail, LuHandshake, LuFilePenLine, LuBookOpen, LuScrollText,
  LuTrendingUp, LuEuro, LuClock, LuGauge, LuClipboardCheck, LuLayoutGrid, LuFiles, LuClipboardList, LuCalendarCheck, LuChartColumn, LuIdCard, LuGlobe, LuSlidersHorizontal, LuRoute, LuMap, LuMessagesSquare } from "react-icons/lu";
import type { IconType } from "react-icons";

/**
 * De schermen van het adminpaneel, voor het menu én het commandopalet.
 *
 * Eén lijst, zodat een nieuw scherm op beide plekken verschijnt. Welk recht
 * een scherm vraagt staat in `permissionForPath()` (permissions.ts), niet
 * hier — daar kijkt ook `requirePerm()` naar.
 */

export type Counts = { apps: number; msgs: number; inbox: number; leads: number };

/** Wat per collega aan of uit staat, los van rechten: heeft deze collega een inwerkreis (0050)? */
export type NavVlaggen = { inwerkreis: boolean };

export type NavItem = {
  label: string;
  href: string;
  icon: IconType;
  badge?: keyof Counts;
  /** Extra zoekwoorden voor het palet: wat iemand intikt die de naam niet weet. */
  keywords?: string;
  /** Alleen in het palet, niet in het zijmenu — bijvoorbeeld een tab binnen een scherm. */
  paletteOnly?: boolean;
  /** In het zijmenu ingeklapt onder deze groep (zie NAV_GROEPEN). */
  groep?: NavGroepKey;
  /** Andere adressen waarop dit menu-item oplicht, zoals de documentsoorten onder Documenten. */
  ook?: string[];
  /** Alleen in het menu als dit voor de ingelogde collega aan staat (zie NavVlaggen); nooit in het palet. */
  alleenMet?: keyof NavVlaggen;
};

/**
 * Het zijmenu kort houden (Rens, 19 nov 2026: "maak de sidebar een stuk minder
 * uitgebreid"): wat je dagelijks gebruikt staat los, de rest zit ingeklapt in
 * een groep die vanzelf openklapt als je erin zit. Een groep waarvan je maar
 * één scherm mag zien, wordt gewoon dat ene item.
 */
export type NavGroepKey = "cijfers" | "website" | "beheer";

export const NAV_GROEPEN: Record<NavGroepKey, { label: string; icon: IconType }> = {
  cijfers: { label: "Cijfers", icon: LuChartColumn },
  website: { label: "Website", icon: LuGlobe },
  beheer: { label: "Beheer", icon: LuSlidersHorizontal },
};

/** De documentsoorten die onder Documenten vallen (zie klantdocumenten.ts). */
export const DOCUMENT_PADEN = ["/admin/offertes", "/admin/contracten", "/admin/onboarding", "/admin/brochures"];

export const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LuLayoutDashboard, keywords: "home start overzicht vandaag" },
  { label: "Postvak IN", href: "/admin/postvak-in", icon: LuInbox, badge: "inbox", keywords: "inbox berichten sollicitaties inzendingen" },
  { label: "Bellijst", href: "/admin/bellijst", icon: LuPhone, badge: "leads", keywords: "leads bellen crm terugbellen" },
  { label: "Klantenbord", href: "/admin/klantenbord", icon: LuLayoutGrid, keywords: "whiteboard klanten leads bord kanban status laatste gesprek volgende stap pijplijn klantlijst importeren crm" },
  { label: "Vandaag: wie bel ik", href: "/admin/klantenbord/vandaag", icon: LuPhone, keywords: "werkrij vandaag bellen te laat opvolgen warm klantenbord", paletteOnly: true },
  // De klantenlijst met stamkaart (0048): alle klanten onder elkaar, per klant de bedrijfsgegevens, documenten en tariefafspraken.
  { label: "Alle klanten: stamkaarten", href: "/admin/klanten", icon: LuIdCard, keywords: "klantenlijst klanten stamkaart bedrijfsgegevens kvk iban documenten tariefafspraken tarieven adres contactpersoon factuur", paletteOnly: true },
  // Documenten: één ingang voor alles wat naar een klant gaat (offertes, contracten, onboarding, brochures, klantevaluaties); de soorten zelf staan in het palet.
  { label: "Documenten", href: "/admin/documenten", icon: LuFiles, keywords: "documenten alle documenten offertes contracten onboarding brochures klantevaluatie evaluatie formulier invullen versturen tekenen staat uit bij de klant", ook: DOCUMENT_PADEN },
  { label: "Offertes", href: "/admin/offertes", icon: LuFilePenLine, keywords: "offerte voorstel ondertekenen tekenen handtekening prijsopgave aanbieding sales", paletteOnly: true },
  { label: "Offertesjablonen", href: "/admin/offertes/sjablonen", icon: LuFilePenLine, keywords: "sjabloon template rie pago spoor 2 werkfit verzuimtraining arbeidsdeskundig onderzoek vorm", paletteOnly: true },
  { label: "Contracten", href: "/admin/contracten", icon: LuScrollText, keywords: "contract basiscontract arbodienstverlening arbowet overeenkomst ondertekenen tekenen looptijd opzeggen verlengen sales", paletteOnly: true },
  { label: "Onboarding", href: "/admin/onboarding", icon: LuClipboardCheck, keywords: "onboarding nieuwe klant welkom inrichting werknemersbestand xpertsuite import machtiging verzuimprotocol documenten versturen invullen", paletteOnly: true },
  { label: "Brochures", href: "/admin/brochures", icon: LuBookOpen, keywords: "brochure prospect kennismaking diensten specialismen template versturen sales", paletteOnly: true },
  { label: "Klantevaluaties", href: "/admin/documenten/evaluaties", icon: LuClipboardList, keywords: "klantevaluatie evaluatie jaarlijks bezoek checklist rie psa pmo preventiemedewerker dienstverlening wensen afspraken acties", paletteOnly: true },
  { label: "Partners", href: "/admin/partners", icon: LuHandshake, keywords: "partnerprogramma accountants aanmeldlink partnercode vergoeding kwartaal" },
  { label: "Weekevaluatie", href: "/admin/weekevaluatie", icon: LuCalendarCheck, keywords: "weekevaluatie week evaluatie energie werkdruk cijfer invullen reflectie collega's werknemers" },
  { label: "CM-overleg", href: "/admin/overleg", icon: LuMessagesSquare, keywords: "overleg casemanagers agenda notulen actiepunten kaart nederland verdeling klanten werkgebied" },
  { label: "Inwerkreis", href: "/admin/inwerkreis", icon: LuRoute, keywords: "inwerken nieuwe collega eerste 90 dagen buddy taken oefencasussen mijlpalen", alleenMet: "inwerkreis" },
  { label: "Kwartaaloverzicht weekevaluaties", href: "/admin/weekevaluatie/team", icon: LuChartColumn, keywords: "kwartaalmeeting kwartaal team gemiddelden trend gemist export excel weekevaluaties", paletteOnly: true },
  { label: "Verkoop", href: "/admin/verkoop", icon: LuTrendingUp, keywords: "sales dashboard pijplijn trechter hitrate conversie verkopers doorlooptijd opvolgen", groep: "cijfers" },
  { label: "Losse klanten en opdrachten", href: "/admin/verkoop/los", icon: LuPlus, keywords: "los opvoeren bestaande klant abonnement opdracht eenmalig handmatig invoeren zonder offerte", paletteOnly: true },
  { label: "Omzet", href: "/admin/omzet", icon: LuEuro, keywords: "omzet abonnementen mrr arr maandomzet financieel declarabel uren klanten", groep: "cijfers" },
  { label: "Prognose", href: "/admin/prognose", icon: LuGauge, keywords: "prognose werkdruk capaciteit bezetting casemanagers fte werven personeel planning forecast komende maanden", groep: "cijfers" },
  { label: "Uren", href: "/admin/omzet/uren", icon: LuClock, keywords: "declarabele uren medewerkers werknemers urenregistratie declarabiliteit norm week invullen", paletteOnly: true },
  { label: "Pagina's", href: "/admin/paginas", icon: LuFileText, keywords: "teksten blokken content cms", groep: "website" },
  { label: "Blog", href: "/admin/blog", icon: LuNewspaper, keywords: "artikelen nieuws posts", groep: "website" },
  { label: "Vacatures", href: "/admin/vacatures", icon: LuBriefcase, keywords: "banen werken bij jobs", groep: "website" },
  { label: "Sollicitaties", href: "/admin/sollicitaties", icon: LuUsers, badge: "apps", keywords: "kandidaten cv", groep: "website" },
  { label: "Berichten", href: "/admin/berichten", icon: LuMessageSquare, badge: "msgs", keywords: "contactformulier", groep: "website" },
  { label: "Bezoek", href: "/admin/bezoek", icon: LuChartNoAxesColumn, keywords: "statistieken analytics bezoekers", groep: "website" },
  { label: "Bedrijven op de site", href: "/admin/bezoek/bedrijven", icon: LuBuilding, keywords: "bezoekers herkend warm leads salesfeed leadinfo", paletteOnly: true },
  { label: "Media", href: "/admin/media", icon: LuImage, keywords: "afbeeldingen foto's uploaden pdf documenten", groep: "website" },
  { label: "SEO", href: "/admin/seo", icon: LuSearch, keywords: "google zoekmachine meta titel omschrijving", groep: "website" },
  { label: "Doorverwijzingen", href: "/admin/seo/doorverwijzingen", icon: LuSignpost, keywords: "redirect 404 niet gevonden oude url kapotte link", paletteOnly: true },
  { label: "Inwerken", href: "/admin/inwerken", icon: LuMap, keywords: "inwerkreis nieuwe collega sjabloon functie casemanager backoffice sales buddy mijlpaal oefencasus 30 60 90 dagen", groep: "beheer" },
  { label: "Gebruikers", href: "/admin/gebruikers", icon: LuUserCog, keywords: "rollen rechten collega's uitnodigen", groep: "beheer" },
  { label: "Instellingen", href: "/admin/instellingen", icon: LuSettings, keywords: "contactgegevens footer documenten certificaten onderhoud", groep: "beheer" },
  { label: "Account", href: "/admin/account", icon: LuUserRound, keywords: "wachtwoord tweestapsverificatie 2fa profiel", paletteOnly: true },
  { label: "Prullenbak", href: "/admin/prullenbak", icon: LuTrash2, keywords: "verwijderd terugzetten herstellen ongedaan maken", paletteOnly: true },
];

/** Geen adres maar een teken voor het palet: deze actie roept de uitlog-action aan. */
export const SIGN_OUT_HREF = "#uitloggen";

/** Snelle acties in het palet. `href` bepaalt ook welk recht nodig is. */
export type PaletteAction = NavItem & { external?: boolean };

export const ADMIN_ACTIONS: PaletteAction[] = [
  { label: "Nieuwe vacature", href: "/admin/vacatures/nieuw", icon: LuPlus, keywords: "vacature toevoegen aanmaken" },
  { label: "Nieuw artikel", href: "/admin/blog/nieuw", icon: LuPlus, keywords: "blog schrijven post toevoegen" },
  { label: "Nieuwe pagina", href: "/admin/paginas#nieuw", icon: LuPlus, keywords: "pagina toevoegen aanmaken" },
  { label: "Nieuwe offerte", href: "/admin/offertes/nieuw", icon: LuFilePenLine, keywords: "offerte maken opstellen voorstel prijsopgave versturen" },
  { label: "Nieuw contract", href: "/admin/contracten/nieuw", icon: LuScrollText, keywords: "contract basiscontract arbodienstverlening maken versturen ondertekenen" },
  { label: "Nieuwe onboarding", href: "/admin/onboarding/nieuw", icon: LuClipboardCheck, keywords: "onboarding nieuwe klant welkom documenten versturen invullen" },
  { label: "Nieuwe brochure", href: "/admin/brochures/nieuw", icon: LuBookOpen, keywords: "brochure maken versturen prospect kennismaking" },
  { label: "Nieuwe klantevaluatie", href: "/admin/documenten/evaluaties/nieuw", icon: LuClipboardList, keywords: "evaluatie klant jaarlijks bezoek maken versturen formulier" },
  { label: "Lead toevoegen", href: "/admin/bellijst#nieuw", icon: LuUserPlus, keywords: "lead nieuw bellijst" },
  { label: "Lead of klant op het bord", href: "/admin/klantenbord#nieuw", icon: LuLayoutGrid, keywords: "klantenbord nieuw klant lead kaart toevoegen" },
  { label: "Klantlijst importeren", href: "/admin/klantenbord#import", icon: LuUpload, keywords: "klantenbord excel klantlijst xlsx importeren upload" },
  { label: "Partner toevoegen", href: "/admin/partners#nieuw", icon: LuHandshake, keywords: "partner nieuw accountant aanmeldlink code" },
  { label: "Bestand uploaden", href: "/admin/media", icon: LuUpload, keywords: "media afbeelding pdf" },
  { label: "Doorverwijzing toevoegen", href: "/admin/seo/doorverwijzingen#nieuw", icon: LuSignpost, keywords: "redirect oude url doorsturen 404" },
  { label: "Onderhoudsmodus", href: "/admin/instellingen#onderhoud", icon: LuConstruction, keywords: "site dicht offline maintenance" },
  { label: "E-mail en testmail", href: "/admin/instellingen#email", icon: LuMail, keywords: "mail resend meldingen uitnodigingen afzender testmail notificaties" },
  { label: "Collega uitnodigen", href: "/admin/gebruikers", icon: LuUserPlus, keywords: "gebruiker toevoegen uitnodiging" },
  { label: "Tweestapsverificatie", href: "/admin/account", icon: LuShieldCheck, keywords: "2fa beveiliging authenticator" },
  { label: "Bekijk website", href: "/", icon: LuExternalLink, external: true, keywords: "site openen live" },
  { label: "Uitloggen", href: SIGN_OUT_HREF, icon: LuLogOut, keywords: "afmelden log out logout weg stoppen account" },
];

export const CRUMBS: Record<string, string> = {
  admin: "Dashboard", "postvak-in": "Postvak IN", bellijst: "Bellijst", klantenbord: "Klantenbord", vandaag: "Vandaag", klanten: "Klanten", brochures: "Brochures", paginas: "Pagina's", blog: "Blog",
  vacatures: "Vacatures", sollicitaties: "Sollicitaties", berichten: "Berichten",
  bezoek: "Bezoek", media: "Media", seo: "SEO", gebruikers: "Gebruikers",
  instellingen: "Instellingen", account: "Account",
  documenten: "Documenten", evaluaties: "Klantevaluaties",
  offertes: "Offertes", contracten: "Contracten", onboarding: "Onboarding", werknemers: "Werknemers", verkoop: "Verkoop", los: "Los opgevoerd", omzet: "Omzet", uren: "Uren", partners: "Partners", voorbeeld: "Voorbeeld", sjablonen: "Sjablonen",
  weekevaluatie: "Weekevaluatie", team: "Kwartaaloverzicht", prognose: "Prognose", inwerkreis: "Inwerkreis", inwerken: "Inwerken", sjabloon: "Sjabloon", overleg: "CM-overleg",
  nieuw: "Nieuw", blok: "Blok", doorverwijzingen: "Doorverwijzingen", prullenbak: "Prullenbak", bedrijven: "Bedrijven",
};
