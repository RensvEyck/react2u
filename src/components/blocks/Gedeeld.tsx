import Link from "next/link";
import Beeld from "@/components/site/Beeld";

/*
 * Bouwstenen die op meerdere pagina's uit het Design-canvas terugkomen:
 * de klantenstrook, "Klanten aan het woord" en de keurmerken. Kleuren en
 * maten zoals op het canvas; koppen in Outfit via `.hv-kop`.
 */

export const NAVY = "#322E83";
export const PINK = "#E61674";
export const TEAL = "#00A098";
export const SKY = "#3AA5DD";
export const ORANGE = "#F19001";
export const BODY = "#5E5C78";
export const MUTE = "#77758F";
export const LINE = "#E6E5EF";
export const SOFT = "#F6F5FB";
export const LAV = "#ECEBF5";

export const kop = "hv-kop font-semibold";

/**
 * Standaardbreedte van de inhoud: 1200 px met 120 px marge op het canvas.
 * Tussen 1024 en 1280 px is die marge 64 px: met 120 px aan weerszijden bleef
 * er op een kleine laptop te weinig over en braken koppen midden in een woord.
 */
export const BREED = "mx-auto w-full max-w-[1440px] px-5 md:px-10 lg:px-16 xl:px-[120px]";

export const KLANTEN = [
  { src: "/beeld/klanten/jumbo.png", alt: "Jumbo Supermarkten" },
  { src: "/beeld/klanten/werkhelden.png", alt: "Werkhelden" },
  { src: "/beeld/klanten/payingit.png", alt: "Payingit" },
  { src: "/beeld/klanten/kester.png", alt: "Kester uitzendbureau" },
  { src: "/beeld/klanten/leebo.png", alt: "Leebo" },
  { src: "/beeld/klanten/zorg-verbindt.png", alt: "Zorg Verbindt" },
];

export const KEURMERKEN = [
  { src: "/beeld/keurmerken/sbca.jpg", alt: "SBCA gecertificeerde arbodienst", naam: "SBCA", wat: "Gecertificeerde arbodienst" },
  { src: "/beeld/keurmerken/iso9001.png", alt: "DNV ISO 9001 certificaat", naam: "ISO 9001", wat: "Kwaliteitsmanagement" },
  { src: "/beeld/keurmerken/iso27001.png", alt: "DNV ISO 27001 certificaat", naam: "ISO 27001", wat: "Informatiebeveiliging" },
  { src: "/beeld/keurmerken/iso27701.png", alt: "DNV ISO 27701 certificaat", naam: "ISO 27701", wat: "Privacy" },
  { src: "/beeld/keurmerken/oval.png", alt: "Lid van OVAL", naam: "OVAL", wat: "Branchevereniging" },
];

export function Pijl({ size = 16 }: { size?: number }) {
  return (
    <svg className="hn-pijl" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function Vink({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

export function Eyebrow({ children, kleur = PINK }: { children: React.ReactNode; kleur?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: kleur }}>
      <span className="h-2 w-2 rounded-full" style={{ background: kleur }} />{children}
    </span>
  );
}

export function Kruimels({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Kruimelpad" className="flex flex-wrap items-center gap-2.5 text-[14px] font-semibold" style={{ color: MUTE }}>
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-2.5">
          {i > 0 && <span aria-hidden>/</span>}
          {c.href ? <Link href={c.href} style={{ color: MUTE }}>{c.label}</Link> : <span aria-current="page" style={{ color: NAVY }}>{c.label}</span>}
        </span>
      ))}
    </nav>
  );
}

/** Knop zoals op het canvas: roze (hoofdactie) of met rand. */
export function Knop({ href, children, rand }: { href: string; children: React.ReactNode; rand?: boolean }) {
  const cls = `hv-btn ${rand ? "hv-btn-rand" : "hv-btn-roze"} inline-flex h-[54px] items-center gap-2.5 whitespace-nowrap rounded-full px-6 text-[15px] font-bold`;
  if (href.startsWith("#") || href.startsWith("tel:") || href.startsWith("mailto:")) return <a href={href} className={cls}>{children}<Pijl /></a>;
  return <Link href={href} className={cls}>{children}<Pijl /></Link>;
}

/** Twee kolommen: links eyebrow en kop, rechts een korte toelichting. */
export function KopBlok({ eyebrow, kopTekst, tekst, size = 44 }: { eyebrow: string; kopTekst: string; tekst?: string; size?: number }) {
  return (
    <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-6">
      <div className="flex flex-col gap-4 lg:col-span-7">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className={`${kop} m-0 leading-[1.1] tracking-[-0.9px]`} style={{ color: NAVY, fontSize: `clamp(32px, 4vw, ${size}px)` }}>{kopTekst}</h2>
      </div>
      {tekst && <p className="m-0 text-[16px] leading-[1.7] md:text-[17px] lg:col-span-4 lg:col-start-9" style={{ color: BODY }}>{tekst}</p>}
    </div>
  );
}

export function KlantenStrook({ label = "We werken samen met:" }: { label?: string }) {
  return (
    <section aria-label="Klanten" className="bg-white">
      <div className={`${BREED} flex flex-col items-center gap-7 py-12 md:py-14`}>
        <span className="text-[14px] font-semibold" style={{ color: MUTE }}>{label}</span>
        <ul className="m-0 flex w-full list-none flex-wrap items-center justify-center gap-x-10 gap-y-6 p-0 md:justify-between">
          {KLANTEN.map((k) => (
            <li key={k.src} className="flex h-10 items-center md:h-11">
              <Beeld src={k.src} alt={k.alt} sizes="150px" className="h-full w-auto max-w-[150px] object-contain" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const QUOTES = [
  {
    tekst: "Korte lijnen, snelle communicatie en altijd bereid om mee te denken. Een fijne arbodienst met oog voor zowel werkgever als werknemer.",
    naam: "Maxime Boonstra", rol: "Algemeen directeur, Kester uitzendbureau", logo: "/beeld/klanten/kester.png",
  },
  {
    tekst: "In een dynamische supermarktorganisatie is snel schakelen essentieel. Dankzij de korte lijnen, deskundige begeleiding en persoonlijke benadering ervaren wij de samenwerking als zeer prettig en betrouwbaar.",
    naam: "Afdeling HR", rol: "De Jumbo’s van Ralf & René", logo: "/beeld/klanten/jumbo.png",
  },
];

export function KlantenAanHetWoord({ bg = SOFT, eyebrow = "Klanten aan het woord", heading = "Wat klanten over ons zeggen" }: { bg?: string; eyebrow?: string; heading?: string }) {
  return (
    <section aria-label="Klanten aan het woord" style={{ background: bg }}>
      <div className={`${BREED} flex flex-col gap-10 py-20 md:gap-12 md:py-[104px]`}>
        <div className="flex flex-col gap-4">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className={`${kop} m-0 text-[34px] leading-[1.1] tracking-[-0.9px] md:text-[44px]`} style={{ color: NAVY }}>{heading}</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 md:gap-6">
          {QUOTES.map((q) => (
            <figure key={q.naam} className="m-0 flex flex-col justify-between gap-8 rounded-[28px] bg-white p-8 md:p-10">
              <blockquote className="m-0 flex flex-col gap-4">
                <span aria-hidden className={`${kop} text-[64px] leading-[0.6]`} style={{ color: PINK }}>“</span>
                <p className={`${kop} m-0 text-[20px] leading-[1.45] md:text-[22px]`} style={{ color: NAVY, fontWeight: 500 }}>{q.tekst}</p>
              </blockquote>
              <figcaption className="flex items-center justify-between gap-6 border-t pt-6" style={{ borderColor: LINE }}>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[16px] font-bold" style={{ color: NAVY }}>{q.naam}</span>
                  <span className="text-[14.5px]" style={{ color: MUTE }}>{q.rol}</span>
                </span>
                <Beeld src={q.logo} alt="" sizes="120px" className="h-8 w-auto max-w-[120px] object-contain" />
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Keurmerken() {
  return (
    <section aria-label="Kwaliteit" className="bg-white">
      <div className={`${BREED} flex flex-col gap-10 pb-20 md:gap-12 md:pb-[112px]`}>
        <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-6">
          <div className="flex flex-col gap-4 lg:col-span-6">
            <Eyebrow>Kwaliteit</Eyebrow>
            <h2 className={`${kop} m-0 text-[34px] leading-[1.1] tracking-[-0.9px] md:text-[44px]`} style={{ color: NAVY }}>Getoetst en gecertificeerd</h2>
          </div>
          <div className="flex flex-col items-start gap-4 lg:col-span-5 lg:col-start-8">
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: BODY }}>
              Je werkt met gevoelige informatie. Daarom laten we onze kwaliteit, beveiliging en privacy onafhankelijk toetsen.
            </p>
            <Link href="/certificeringen" className="inline-flex items-center gap-2 text-[16px] font-bold underline underline-offset-[5px]" style={{ color: NAVY, textDecorationColor: "rgba(50,46,131,0.35)" }}>
              Meer over onze certificeringen<Pijl />
            </Link>
          </div>
        </div>
        <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-5">
          {KEURMERKEN.map((k) => (
            <li key={k.src} className="flex flex-col items-center gap-4 rounded-[22px] border bg-white px-5 py-7 text-center" style={{ borderColor: LINE }}>
              <span className="flex h-[72px] items-center"><Beeld src={k.src} alt={k.alt} sizes="72px" className="max-h-full w-auto max-w-[110px] object-contain" /></span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[16px] font-bold" style={{ color: NAVY }}>{k.naam}</span>
                <span className="text-[14px]" style={{ color: MUTE }}>{k.wat}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
