import {
  LuLayoutDashboard, LuFileText, LuBriefcase, LuUsers, LuInbox, LuImage,
  LuSettings, LuUserRound, LuMessageSquare, LuNewspaper, LuSearch, LuPhone,
  LuChartNoAxesColumn, LuUserCog, LuPlus, LuConstruction, LuExternalLink, LuUserPlus, LuUpload,
  LuShieldCheck, LuSignpost, LuTrash2, LuBuilding, LuLogOut,
} from "react-icons/lu";
import type { IconType } from "react-icons";

/**
 * De schermen van het adminpaneel, voor het menu én het commandopalet.
 *
 * Eén lijst, zodat een nieuw scherm op beide plekken verschijnt. Welk recht
 * een scherm vraagt staat in `permissionForPath()` (permissions.ts), niet
 * hier — daar kijkt ook `requirePerm()` naar.
 */

export type Counts = { apps: number; msgs: number; inbox: number; leads: number };

export type NavItem = {
  label: string;
  href: string;
  icon: IconType;
  badge?: keyof Counts;
  /** Extra zoekwoorden voor het palet: wat iemand intikt die de naam niet weet. */
  keywords?: string;
  /** Alleen in het palet, niet in het zijmenu — bijvoorbeeld een tab binnen een scherm. */
  paletteOnly?: boolean;
};

export const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LuLayoutDashboard, keywords: "home start overzicht vandaag" },
  { label: "Postvak IN", href: "/admin/postvak-in", icon: LuInbox, badge: "inbox", keywords: "inbox berichten sollicitaties inzendingen" },
  { label: "Bellijst", href: "/admin/bellijst", icon: LuPhone, badge: "leads", keywords: "leads bellen crm terugbellen" },
  { label: "Pagina's", href: "/admin/paginas", icon: LuFileText, keywords: "teksten blokken content cms" },
  { label: "Blog", href: "/admin/blog", icon: LuNewspaper, keywords: "artikelen nieuws posts" },
  { label: "Vacatures", href: "/admin/vacatures", icon: LuBriefcase, keywords: "banen werken bij jobs" },
  { label: "Sollicitaties", href: "/admin/sollicitaties", icon: LuUsers, badge: "apps", keywords: "kandidaten cv" },
  { label: "Berichten", href: "/admin/berichten", icon: LuMessageSquare, badge: "msgs", keywords: "contactformulier" },
  { label: "Bezoek", href: "/admin/bezoek", icon: LuChartNoAxesColumn, keywords: "statistieken analytics bezoekers" },
  { label: "Bedrijven op de site", href: "/admin/bezoek/bedrijven", icon: LuBuilding, keywords: "bezoekers herkend warm leads salesfeed leadinfo", paletteOnly: true },
  { label: "Media", href: "/admin/media", icon: LuImage, keywords: "afbeeldingen foto's uploaden pdf documenten" },
  { label: "SEO", href: "/admin/seo", icon: LuSearch, keywords: "google zoekmachine meta titel omschrijving" },
  { label: "Doorverwijzingen", href: "/admin/seo/doorverwijzingen", icon: LuSignpost, keywords: "redirect 404 niet gevonden oude url kapotte link", paletteOnly: true },
  { label: "Gebruikers", href: "/admin/gebruikers", icon: LuUserCog, keywords: "rollen rechten collega's uitnodigen" },
  { label: "Instellingen", href: "/admin/instellingen", icon: LuSettings, keywords: "contactgegevens footer documenten certificaten onderhoud" },
  { label: "Account", href: "/admin/account", icon: LuUserRound, keywords: "wachtwoord tweestapsverificatie 2fa profiel" },
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
  { label: "Lead toevoegen", href: "/admin/bellijst#nieuw", icon: LuUserPlus, keywords: "lead nieuw bellijst" },
  { label: "Bestand uploaden", href: "/admin/media", icon: LuUpload, keywords: "media afbeelding pdf" },
  { label: "Doorverwijzing toevoegen", href: "/admin/seo/doorverwijzingen#nieuw", icon: LuSignpost, keywords: "redirect oude url doorsturen 404" },
  { label: "Onderhoudsmodus", href: "/admin/instellingen#onderhoud", icon: LuConstruction, keywords: "site dicht offline maintenance" },
  { label: "Collega uitnodigen", href: "/admin/gebruikers", icon: LuUserPlus, keywords: "gebruiker toevoegen uitnodiging" },
  { label: "Tweestapsverificatie", href: "/admin/account", icon: LuShieldCheck, keywords: "2fa beveiliging authenticator" },
  { label: "Bekijk website", href: "/", icon: LuExternalLink, external: true, keywords: "site openen live" },
  { label: "Uitloggen", href: SIGN_OUT_HREF, icon: LuLogOut, keywords: "afmelden log out logout weg stoppen account" },
];

export const CRUMBS: Record<string, string> = {
  admin: "Dashboard", "postvak-in": "Postvak IN", bellijst: "Bellijst", paginas: "Pagina's", blog: "Blog",
  vacatures: "Vacatures", sollicitaties: "Sollicitaties", berichten: "Berichten",
  bezoek: "Bezoek", media: "Media", seo: "SEO", gebruikers: "Gebruikers",
  instellingen: "Instellingen", account: "Account",
  nieuw: "Nieuw", blok: "Blok", doorverwijzingen: "Doorverwijzingen", prullenbak: "Prullenbak", bedrijven: "Bedrijven",
};
