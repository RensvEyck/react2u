import Breadcrumbs from "./Breadcrumbs";
import SiteImage from "./SiteImage";

/**
 * Kop voor pagina's die niet uit blokken bestaan (blog, vacatures): kruimelpad,
 * kop en intro op zand — dezelfde vormtaal als de hero-blokken. Met `image`
 * wordt het een half scherm: de tekst links, de foto van rand tot rand rechts,
 * precies zoals HeroSplit in BlockRenderer.
 */
export default function PageHeader({
  crumbs = [], eyebrow, title, children, narrow = false, image, focus,
}: {
  crumbs?: { label: string; href: string }[];
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
  narrow?: boolean;
  image?: string;
  /** object-position van de foto, bv. "center 30%". */
  focus?: string;
}) {
  const tekst = (
    <>
      <Breadcrumbs crumbs={crumbs} className="mb-8 text-primary" />
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <h1 className={`max-w-[860px] font-bold leading-[1.08] tracking-[-0.025em] ${
        image ? "text-[2.25rem] sm:text-[2.8rem] lg:text-[3.1rem]" : "text-[2.25rem] sm:text-[2.9rem] lg:text-[3.5rem]"
      }`}>
        {title}
      </h1>
      {children && <div className="mt-6 max-w-[680px] text-[18px] leading-relaxed md:text-[19px]">{children}</div>}
    </>
  );
  if (!image) {
    return (
      <section data-tone="band" className="bg-soft">
        <div className={`container-site pb-14 pt-8 md:pb-20 md:pt-10 ${narrow ? "max-w-[900px]" : ""}`}>{tekst}</div>
      </section>
    );
  }
  return (
    <section data-tone="bleed" className="bg-soft lg:grid lg:min-h-[clamp(440px,calc(100svh-var(--hh)-10rem),600px)] lg:grid-cols-2">
      <div className="relative aspect-[4/3] overflow-hidden bg-soft sm:aspect-[16/9] lg:order-last lg:aspect-auto">
        <SiteImage src={image} alt="" priority sizes="(min-width: 1024px) 50vw, 100vw" widths={[640, 960, 1280, 1600]}
          className="absolute inset-0 h-full w-full object-cover" style={focus ? { objectPosition: focus } : undefined} />
      </div>
      <div className="flex flex-col justify-center px-5 pb-14 pt-8 sm:px-8 md:pb-16 lg:py-16 lg:pl-[max(2rem,calc(50vw-620px+2rem))] lg:pr-14 xl:pr-20">
        <div className="max-w-[600px]">{tekst}</div>
      </div>
    </section>
  );
}
