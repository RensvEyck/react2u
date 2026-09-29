import { optimized, srcSet, DEFAULT_WIDTHS, isOptimizable } from "@/lib/image";

/* eslint-disable @next/next/no-img-element */

/**
 * Afbeelding uit de mediabibliotheek, geschaald door Supabase.
 *
 * Blijft een gewone <img>: de opmaak van de site zit in classNames en die
 * werken hier ongewijzigd door. Zie src/lib/image.ts voor waarom dit niet via
 * next/image loopt.
 */
export default function SiteImage({
  src, alt, className, style, sizes = "100vw", widths = DEFAULT_WIDTHS, priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  /** Bijvoorbeeld `objectPosition`, om bij het bijsnijden het gezicht in beeld te houden. */
  style?: React.CSSProperties;
  /** Hoe breed de afbeelding op het scherm staat — stuurt welke srcSet-variant de browser kiest. */
  sizes?: string;
  widths?: number[];
  /** Voor beeld boven de vouw: niet uitstellen, want dit is vaak het LCP-element. */
  priority?: boolean;
}) {
  if (!src) return null;
  const canScale = isOptimizable(src);
  return (
    <img
      src={canScale ? optimized(src, 1200) : src}
      srcSet={srcSet(src, widths)}
      sizes={canScale ? sizes : undefined}
      alt={alt}
      className={className}
      style={style}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
}
