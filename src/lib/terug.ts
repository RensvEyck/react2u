/**
 * Terug naar waar je was, na opnieuw inloggen.
 *
 * Verloopt je sessie halverwege, dan stuurt `requireAdmin()` je naar het
 * inlogscherm met het pad waar je was als `?terug=`. Na het inloggen ga je daar
 * weer heen in plaats van naar het dashboard.
 *
 * Dat pad komt uit de URL, dus van buiten. Zonder controle is dit een open
 * redirect: `?terug=//evil.example` of `?terug=https://…` zou na een echte
 * inlog naar een andere site sturen, met de geloofwaardigheid van ons eigen
 * inlogscherm. Daarom alleen paden binnen het adminpaneel, en nooit terug naar
 * de inlog- of uitnodigingspagina zelf (dat zou een lus geven).
 */

/** Request-header waarin de middleware het huidige adminpad meegeeft. */
export const ADMIN_PAD_HEADER = "x-admin-pad";

const UITGESLOTEN = ["/admin/login", "/admin/uitnodiging"];

export function veiligTerugPad(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const pad = raw.trim();
  if (pad.length > 512) return null;
  // Geen protocol-relatieve URL's, geen backslashes (die sommige browsers als
  // "/" lezen), geen stuurtekens.
  if (!pad.startsWith("/") || pad.startsWith("//") || pad.includes("\\") || /[\u0000-\u001f\u007f]/.test(pad)) return null;

  let url: URL;
  try {
    url = new URL(pad, "https://basis.invalid");
  } catch {
    return null;
  }
  // Wat na het parsen niet meer op onze eigen basis staat, kwam van elders.
  if (url.origin !== "https://basis.invalid") return null;
  const p = url.pathname;
  if (p !== "/admin" && !p.startsWith("/admin/")) return null;
  if (UITGESLOTEN.some((u) => p === u || p.startsWith(`${u}/`))) return null;
  return `${p}${url.search}`;
}

/** De query voor het inlogscherm, of niets als er geen zinnig pad is. */
export function terugQuery(pad: string | null | undefined): string {
  const veilig = veiligTerugPad(pad);
  if (!veilig || veilig === "/admin") return "";
  return `terug=${encodeURIComponent(veilig)}`;
}
