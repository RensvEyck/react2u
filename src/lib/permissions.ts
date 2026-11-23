/**
 * Rechten in het adminpaneel.
 *
 * Eén recht komt overeen met één onderdeel van het paneel. De sleutels staan
 * als tekst in `roles.permissions` in de database en worden gebruikt door de
 * RLS-policies — **hernoem ze dus nooit** zonder migratie, anders verliezen
 * bestaande rollen stilzwijgend hun rechten.
 *
 * Belangrijk: het menu filteren op rechten is géén beveiliging. Wie de
 * publieke sleutel uit zijn browser haalt, praat rechtstreeks met de API. De
 * echte grens ligt in de policies (`has_perm()` in migratie 0005); dit bestand
 * zorgt er alleen voor dat de app dezelfde taal spreekt.
 */

export const PERMISSIONS = [
  { key: "postvak", label: "Postvak IN", hint: "Berichten en sollicitaties lezen en afhandelen" },
  { key: "bellijst", label: "Bellijst", hint: "Leads bellen, notities en status bijhouden" },
  { key: "paginas", label: "Pagina's", hint: "Pagina's en blokken bewerken" },
  { key: "blog", label: "Blog", hint: "Artikelen schrijven en publiceren" },
  { key: "vacatures", label: "Vacatures", hint: "Vacatures plaatsen en sluiten" },
  { key: "media", label: "Media", hint: "Afbeeldingen en documenten uploaden" },
  { key: "seo", label: "SEO", hint: "SEO-overzicht en standaardwaarden" },
  { key: "bezoek", label: "Bezoek", hint: "Bezoekcijfers en bedrijfsherkenning" },
  { key: "instellingen", label: "Instellingen", hint: "Contactgegevens, documenten, certificaten" },
  { key: "gebruikers", label: "Gebruikers", hint: "Collega's uitnodigen en rollen beheren" },
  { key: "omzet", label: "Omzet", hint: "Omzet, declarabele uren en medewerkers (sinds 0035)" },
  { key: "weekevaluatie", label: "Weekevaluatie", hint: "Je eigen weekevaluatie invullen en teruglezen (sinds 0044)" },
  { key: "overleg", label: "CM-overleg", hint: "Het overleg van de casemanagers: agenda, actiepunten en de kaart met klanten (sinds 0053)" },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["key"];

export const ALL_PERMISSIONS: Permission[] = PERMISSIONS.map((p) => p.key);

/**
 * Het recht dat toegang geeft tot het uitdelen van rechten.
 *
 * Apart benoemd omdat er extra regels aan hangen: er moet er altijd minstens
 * één gebruiker zijn die dit heeft, anders sluit je iedereen buiten.
 */
export const ADMIN_PERMISSION: Permission = "gebruikers";

/**
 * De rol die niet uitgekleed of verwijderd mag worden.
 *
 * Dit is `superadmin`, niet `beheerder`. Beheerder heeft sinds migratie 0006
 * alles behalve `gebruikers`: uitnodigen en rollen verdelen is voorbehouden aan
 * de super admin. Zou deze constante nog naar `beheerder` wijzen, dan kreeg die
 * rol bij elke opslag stilzwijgend alle rechten terug — en was het onderscheid
 * tussen de twee weg zonder dat iemand het merkt.
 */
export const OWNER_ROLE_KEY = "superadmin";

/**
 * De rol voor collega's die alleen hun weekevaluatie invullen (migratie 0044).
 * Geen systeemrol: de super admin mag er rechten bij zetten. De sleutel wordt
 * gebruikt om nieuwe collega's zonder evaluatie toch mee te tellen in de
 * herinnering en het kwartaaloverzicht (lib/weekevaluatie.ts, `doetMee`).
 */
export const WERKNEMER_ROLE_KEY = "werknemer";

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && (ALL_PERMISSIONS as string[]).includes(value);
}

/** Houdt alleen bekende rechten over en ontdubbelt ze. */
export function normalizePermissions(value: unknown): Permission[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<Permission>();
  for (const v of value) if (isPermission(v)) seen.add(v);
  return ALL_PERMISSIONS.filter((p) => seen.has(p));
}

export function labelFor(perm: Permission): string {
  return PERMISSIONS.find((p) => p.key === perm)?.label ?? perm;
}

export function hasPermission(permissions: Permission[] | undefined, perm: Permission): boolean {
  return Boolean(permissions?.includes(perm));
}

/* ---------- koppeling naar het menu ---------- */

/**
 * Welk recht een adminpad vereist.
 *
 * Op volgorde van specifiek naar algemeen: `/admin/paginas/x/blok/y` valt onder
 * `paginas`. Paden die hier niet in staan (zoals `/admin` en `/admin/account`)
 * zijn voor iedereen met een account toegankelijk.
 */
const PATH_PERMISSIONS: [string, Permission][] = [
  ["/admin/postvak-in", "postvak"],
  ["/admin/berichten", "postvak"],
  ["/admin/sollicitaties", "postvak"],
  ["/admin/bellijst", "bellijst"],
  ["/admin/klantenbord", "bellijst"],
  ["/admin/klanten", "bellijst"],
  ["/admin/klantbestand", "bellijst"],
  ["/admin/verkoop", "bellijst"],
  ["/admin/partners", "bellijst"],
  ["/admin/offertes", "bellijst"],
  ["/admin/brochures", "bellijst"],
  ["/admin/onboarding", "bellijst"],
  ["/admin/onboardingvoorbeeld", "bellijst"],
  ["/admin/offertevoorbeeld", "bellijst"],
  ["/admin/contracten", "bellijst"],
  ["/admin/contractvoorbeeld", "bellijst"],
  ["/admin/documenten", "bellijst"],
  ["/admin/evaluatievoorbeeld", "bellijst"],
  ["/admin/paginas", "paginas"],
  ["/admin/blog", "blog"],
  ["/admin/vacatures", "vacatures"],
  ["/admin/media", "media"],
  ["/admin/seo", "seo"],
  ["/admin/bezoek", "bezoek"],
  ["/admin/instellingen", "instellingen"],
  ["/admin/gebruikers", "gebruikers"],
  ["/admin/omzet", "omzet"],
  ["/admin/prognose", "omzet"],
  ["/admin/inwerken", "omzet"],
  // Het kwartaaloverzicht vóór het eigen scherm: specifiek gaat voor algemeen.
  ["/admin/weekevaluatie/team", "omzet"],
  ["/admin/weekevaluatie", "weekevaluatie"],
  ["/admin/overleg", "overleg"],
];

export function permissionForPath(path: string): Permission | null {
  const match = PATH_PERMISSIONS.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`));
  return match ? match[1] : null;
}

/**
 * Waar iemand naartoe moet na het inloggen.
 *
 * Het dashboard is voor iedereen toegankelijk, maar wie geen enkel recht heeft
 * ziet daar een lege pagina. Die situatie hoort niet voor te komen — een rol
 * zonder rechten is een fout, geen geldige configuratie.
 */
export function firstAllowedPath(permissions: Permission[]): string {
  const match = PATH_PERMISSIONS.find(([, perm]) => permissions.includes(perm));
  return match ? match[0] : "/admin/account";
}

/**
 * Rechten voor collega's zonder beheertaak: de eigen weekevaluatie en het
 * CM-overleg (0053). Wie geen ander recht heeft, krijgt het beheer als eigen
 * plek, "Mijn React2u" (Rens, 19 nov 2026): zonder "Systeembeheer" bovenaan,
 * zonder Bekijk website en zonder het zoekpalet (⌘K), dat voor een paar
 * schermen alleen in de weg zit. Dit is vormgeving, geen
 * beveiliging: die blijft in requirePerm() en de RLS-policies.
 */
export const EIGEN_RECHTEN: readonly Permission[] = ["weekevaluatie", "overleg"];

export function isMijnReact2u(permissions: readonly Permission[]): boolean {
  return permissions.every((p) => EIGEN_RECHTEN.includes(p));
}

/**
 * Wisselen tussen Beheer en Mijn React2u (Rens, 23 nov 2026: "het moet ook in
 * het werknemersportaal komen"): wie beheerrechten heeft én minstens één recht
 * uit het portaal, kan Mijn React2u bekijken zoals een casemanager het ziet.
 */
export function kanWisselen(permissions: readonly Permission[]): boolean {
  return !isMijnReact2u(permissions) && permissions.some((p) => EIGEN_RECHTEN.includes(p));
}

/**
 * De rechten zoals de weergave ze toont: in Mijn React2u alleen die van het
 * portaal, zodat menu, dashboard en schermen zich gedragen als bij een
 * werknemer. Weergave, geen beveiliging: de pagina's en de database kijken
 * naar de echte rechten.
 */
export function zichtbareRechten(permissions: readonly Permission[], mijn: boolean): Permission[] {
  return mijn ? permissions.filter((p) => EIGEN_RECHTEN.includes(p)) : [...permissions];
}
