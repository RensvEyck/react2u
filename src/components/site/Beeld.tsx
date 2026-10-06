import Image from "next/image";
import SiteImage from "./SiteImage";
import { isOptimizable } from "@/lib/image";
import afmetingen from "@/lib/beeldAfmetingen.json";

/* eslint-disable @next/next/no-img-element */

/**
 * Eén component voor elke foto op de site, die per bron de beste route kiest:
 *
 * - **Lokaal beeld** (`/beeld/…`) gaat door `next/image`: dat levert per
 *   schermbreedte een kleinere variant en WebP. Zonder dit laadde een telefoon
 *   de volle desktopfoto van 150 KB voor een vlak van 400 pixels breed.
 * - **Beeld uit de mediabibliotheek** (Supabase) blijft via `SiteImage` lopen:
 *   daar schaalt Supabase zelf (zie src/lib/image.ts voor waarom niet via
 *   next/image — voor geüpload beeld zijn geen afmetingen bekend).
 * - **Externe URL's** blijven een gewone <img>.
 *
 * `fill` is voor een foto die zijn vlak vult (`absolute inset-0 h-full w-full
 * object-cover`): het vlak eromheen bepaalt dan de maat, en next/image hoeft
 * geen afmetingen te kennen. Zonder `fill` komen de afmetingen uit
 * beeldAfmetingen.json (scripts/beeld-afmetingen.mjs); is het bestand daar
 * onbekend, dan valt het terug op een gewone <img> in plaats van te breken.
 *
 * `sizes` is verplicht: zonder die hint kiest de browser de grootste variant,
 * en dan is de hele optimalisatie voor niets.
 */
export default function Beeld({
  src, alt, sizes, className, style, fill = false, priority = false, loading, fetchPriority, decoding, quality,
  "aria-hidden": ariaHidden,
}: {
  src?: string | null;
  alt: string;
  /** Hoe breed de foto op het scherm staat, bv. "(min-width: 768px) 50vw, 100vw" of "150px". */
  sizes: string;
  className?: string;
  style?: React.CSSProperties;
  /** De foto vult zijn (gepositioneerde) vlak; next/image hoeft dan geen afmetingen te kennen. */
  fill?: boolean;
  /** Boven de vouw: meteen laden en vooraf aankondigen (LCP). */
  priority?: boolean;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  decoding?: "sync" | "async" | "auto";
  quality?: number;
  "aria-hidden"?: boolean | "true" | "false";
}) {
  if (!src) return null;

  const lokaal = src.startsWith("/") && !src.startsWith("//");
  if (lokaal) {
    const maat = (afmetingen as unknown as Record<string, [number, number] | undefined>)[src.split("?")[0]];
    const gedeeld = {
      src, alt, sizes, className, style, quality,
      ...(priority ? { priority: true } : { loading }),
      ...(fetchPriority && !priority ? { fetchPriority } : {}),
      ...(decoding ? { decoding } : {}),
      ...(ariaHidden !== undefined ? { "aria-hidden": ariaHidden } : {}),
    };
    if (fill) return <Image {...gedeeld} alt={alt} fill />;
    if (maat) return <Image {...gedeeld} alt={alt} width={maat[0]} height={maat[1]} />;
    // Niet in het manifest: liever onbewerkt tonen dan een kapotte pagina.
    return <img src={src} alt={alt} className={className} style={style} loading={priority ? "eager" : loading ?? "lazy"} aria-hidden={ariaHidden} />;
  }

  if (isOptimizable(src)) {
    return <SiteImage src={src} alt={alt} sizes={sizes} className={className} style={style} priority={priority} loading={loading} />;
  }

  return (
    <img src={src} alt={alt} className={className} style={style} loading={priority ? "eager" : loading ?? "lazy"}
      decoding={decoding} aria-hidden={ariaHidden} {...(fetchPriority ? { fetchPriority } : {})} />
  );
}
