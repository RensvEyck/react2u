import "server-only";
import { CONTACT_FALLBACK, getPage, getSetting, type ContactInfo } from "./content";
import { merkMet, merkSlug, merkVoorVorm, type Merk } from "./offerteMerk";
import { VORMEN, type Vorm } from "./offertes";
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

/**
 * De branding van het traject: het label van de vorm, zoals de dienstpagina
 * van dat label hem laat zien (het dienstLabel-blok in het CMS). Lukt het
 * ophalen niet, of staat de pagina er (nog) niet, dan de vaste gegevens.
 */
export async function offerteMerk(vorm: string | null | undefined): Promise<Merk> {
  const v: Vorm = vorm && vorm in VORMEN ? (vorm as Vorm) : "verzuimbegeleiding";
  const basis = merkVoorVorm(v);
  try {
    const pagina = await getPage(merkSlug(v));
    const blok = pagina?.blocks.find((b) => b.type === "dienstLabel");
    return merkMet(basis, (blok?.data as Record<string, unknown> | undefined) ?? null);
  } catch {
    return basis;
  }
}

