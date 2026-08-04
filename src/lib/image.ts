/**
 * Beeldoptimalisatie via het render-endpoint van Supabase Storage.
 *
 * De media komen uit de WordPress-export en zijn niet geoptimaliseerd: één PNG
 * op de homepage was 2,4 MB. Supabase kan ze on-the-fly schalen en levert
 * automatisch WebP zodra de browser dat in zijn Accept-header meldt — dezelfde
 * afbeelding werd daarmee 78 KB.
 *
 * Bewust niet via next/image: dat vraagt width en height per afbeelding, en die
 * staan nergens vast voor beeld dat een beheerder zelf uploadt. Verkeerd gokken
 * geeft verschuivende pagina's, en juist dat kost punten in de Core Web Vitals.
 * Deze route laat de opmaak volledig met rust — alleen de URL verandert.
 */

const OBJECT_PATH = "/storage/v1/object/public/";
const RENDER_PATH = "/storage/v1/render/image/public/";

/** Standaardbreedtes voor de srcSet. Dekt telefoon tot retina-desktop. */
export const DEFAULT_WIDTHS = [480, 800, 1200, 1600];

/**
 * Kan deze URL geschaald worden?
 *
 * SVG blijft ongemoeid — dat is al vectorformaat en schalen levert niets op.
 * Externe URL's laten we met rust; die kunnen we toch niet transformeren.
 */
export function isOptimizable(url: string): boolean {
  if (!url || !url.includes(OBJECT_PATH)) return false;
  if (/\.svg(\?|$)/i.test(url)) return false;
  return true;
}

/** Bouwt de URL voor één breedte. Geeft het origineel terug als dat niet kan. */
export function optimized(url: string, width: number, quality = 75): string {
  if (!isOptimizable(url)) return url;
  const [path] = url.split("?");
  return `${path.replace(OBJECT_PATH, RENDER_PATH)}?width=${width}&quality=${quality}`;
}

/** srcSet-waarde: "…?width=480 480w, …?width=800 800w, …" */
export function srcSet(url: string, widths: number[] = DEFAULT_WIDTHS, quality = 75): string | undefined {
  if (!isOptimizable(url)) return undefined;
  return widths.map((w) => `${optimized(url, w, quality)} ${w}w`).join(", ");
}
