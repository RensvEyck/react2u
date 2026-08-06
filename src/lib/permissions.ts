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
  ["/admin/paginas", "paginas"],
  ["/admin/blog", "blog"],
  ["/admin/vacatures", "vacatures"],
  ["/admin/media", "media"],
  ["/admin/seo", "seo"],
  ["/admin/bezoek", "bezoek"],
  ["/admin/instellingen", "instellingen"],
  ["/admin/gebruikers", "gebruikers"],
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
