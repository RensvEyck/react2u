import Link from "next/link";
import SiteImage from "./SiteImage";
import { Arrow } from "./Arrow";

/**
 * Een bestemming (meestal een dienst) als foto met de titel erop: het kleine
 * broertje van de helften op het startscherm, met hetzelfde donkere verloop
 * achter de tekst en dezelfde ronde pijl die bij aanwijzen roze wordt.
 *
 * `kicker` staat boven de titel, bijvoorbeeld de situatie waarin de dienst
 * helpt ("Een medewerker meldt zich ziek"). `kop` is het element van de titel:
 * h3 in een los overzicht, h4 onder een eigen tussenkop.
 */
export default function FotoTegel({
  href, image, kicker, title, sizes, kop: Kop = "h3", ratio = "aspect-[4/3]", klein = false, groot = false, className = "",
}: {
  href: string;
  image?: string;
  kicker?: string;
  title: string;
  sizes: string;
  kop?: "h2" | "h3" | "h4";
  ratio?: string;
  klein?: boolean;
  /** Een grote tegel met een titel zo groot als op het startscherm (bv. de keuze op de 404). */
  groot?: boolean;
  className?: string;
}) {
  const pijl = (
    <span className={`grid shrink-0 place-items-center rounded-full bg-white text-primary transition-colors duration-300 group-hover:bg-accent group-hover:text-white group-focus-visible:bg-accent group-focus-visible:text-white ${
      klein ? "h-9 w-9" : "h-11 w-11"
    }`}>
      <Arrow className="transition-transform duration-300 group-hover:translate-x-0.5" />
    </span>
  );
  return (
    <Link href={href}
      className={`group relative isolate flex ${ratio} flex-col justify-end overflow-hidden rounded-2xl bg-primary-deep text-white ${className}`}>
      {image && (
        <SiteImage src={image} alt="" sizes={sizes} widths={[400, 640, 960]}
          className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-[1200ms] ease-[var(--ease-out-soft)] group-hover:scale-[1.05]" />
      )}
      <div className={`relative flex items-end justify-between gap-4 ${klein ? "p-4" : groot ? "p-6 sm:p-8" : "p-5 sm:p-6"}`}>
        {/* Verloop achter de tekst, zoals op het startscherm: achter elke regel
            minstens 78% dekkend (wit haalt daarop 7:1, ook op een witte foto),
            en pas in de 3rem erboven vloeit het weg. Bovenin blijft de foto vrij. */}
        <div aria-hidden className="absolute inset-x-0 -top-12 bottom-0 -z-10 bg-[linear-gradient(to_top,rgb(34_32_90/0.92),rgb(34_32_90/0.78)_calc(100%_-_3rem),rgb(34_32_90/0))]" />
        <span className="min-w-0">
          {kicker && <span className={`block leading-snug text-white ${klein ? "text-[14px]" : groot ? "text-[15px] sm:text-[17px]" : "text-[15px]"}`}>{kicker}</span>}
          <Kop className={`mt-1 font-bold leading-tight !text-white ${
            klein ? "text-[17px]" : groot ? "text-[1.6rem] tracking-[-0.02em] sm:text-[2rem] lg:text-[2.4rem]" : "text-[21px]"
          }`}>{title}</Kop>
        </span>
        {!klein && pijl}
      </div>
      {/* Klein: de pijl rechtsboven in de tegel, zodat lange woorden als
          "Verzuimbegeleiding" de hele breedte van de tekst houden. */}
      {klein && <span className="absolute right-3 top-3">{pijl}</span>}
    </Link>
  );
}
