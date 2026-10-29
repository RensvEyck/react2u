import "server-only";
import { CONTACT_FALLBACK, getSetting, type ContactInfo } from "./content";
import { normalizeCertificates, type Certificate } from "./nav";

/**
 * Wat de offertepagina van React2u zelf laat zien: de bedrijfsgegevens
 * (adres, KvK, btw, telefoon) en de certificaten uit Instellingen, dezelfde als
 * in de footer van de site. Faalt het ophalen, dan de vaste gegevens: een
 * offerte mag niet stuklopen op een instelling.
 */
export async function offerteHuisstijl(): Promise<{ contact: ContactInfo; certificaten: Certificate[] }> {
  try {
    const [contact, certificaten] = await Promise.all([getSetting<Partial<ContactInfo>>("contact"), getSetting("certificates")]);
    return { contact: { ...CONTACT_FALLBACK, ...(contact || {}) }, certificaten: normalizeCertificates(certificaten) };
  } catch {
    return { contact: CONTACT_FALLBACK, certificaten: [] };
  }
}
