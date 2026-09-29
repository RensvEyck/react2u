import Link from "next/link";
import type { Block, Post } from "@/lib/types";
import { MiniMarkdown } from "@/lib/md";
import { zinsletters } from "@/lib/tekst";
import Icon from "@/components/site/Icon";
import Accordion, { type FaqItem } from "@/components/site/Accordion";
import TypingHeadline from "@/components/site/TypingHeadline";
import ContactForm from "@/components/site/ContactForm";
import { jsonLd } from "@/lib/jsonld";
import SiteImage from "@/components/site/SiteImage";
import DotCloud, { Arrow } from "@/components/site/DotCloud";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import { PIJLERS, dienstVoor } from "@/lib/nav";
import { kleurVars, type Kleur } from "@/lib/brand";
import { LuBadgeCheck, LuCheck, LuMail, LuMapPin, LuPhone } from "react-icons/lu";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Btn = { label: string; href: string; style?: "accent" | "indigo" | "outline" };
type Crumb = { label: string; href: string };

/**
 * Gegevens die een blok niet in zijn eigen `data` heeft, maar die de pagina
 * aanlevert: de nieuwste artikelen en het kruimelpad. Leeg in het live
 * voorbeeld van de blokeditor: die draait in de browser en haalt niets op.
 */
export type BlockCtx = { posts?: Post[]; crumbs?: Crumb[] };

type BlockProps = {
  d: any;
  /** Dit blok levert de h1 van de pagina. */
  asH1?: boolean;
  /** Dit is het eerste blok van de pagina (en schuift dus onder de header). */
  first?: boolean;
  ctx?: BlockCtx;
};

/**
 * Standaard verticale ruimte van een sectie. Volgen twee secties met dezelfde
 * achtergrond elkaar op, dan haalt globals.css de bovenruimte van de tweede
 * weg (via `data-tone`), zodat de ruimte ertussen niet verdubbelt.
 */
const PAD = "py-16 md:py-24";

/**
 * Twee kolommen op één raster van twaalf: links vijf kolommen, rechts vanaf
 * kolom zeven. Zo begint de rechterkolom op elke pagina op dezelfde lijn.
 */
const SPLIT = "grid gap-10 lg:grid-cols-12 lg:gap-x-8";
const LINKS = "lg:col-span-5";
const RECHTS = "lg:col-span-6 lg:col-start-7";
/** De linkerkolom blijft staan terwijl je langs een lange rechterkolom scrolt. */
const STICKY = "lg:sticky lg:top-[calc(var(--hh)+2rem)] lg:self-start";

/* ---------- Bouwstenen ---------- */

/**
 * Kop van een blok.
 *
 * Welk niveau een kop krijgt hangt af van de *positie* op de pagina, niet van
 * het bloktype: het eerste blok met een kop wordt de `<h1>`, de rest `<h2>`.
 * Zou alleen `hero` een h1 renderen, dan heeft een pagina die met een intro of
 * een tekstblok begint helemaal geen h1 — en dan weet een zoekmachine niet
 * waar de pagina over gaat. Visueel verandert er niets; de opmaak zit in de
 * className, niet in het element.
 */
function PageHeading({
  asH1, className, children,
}: {
  asH1?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const Tag = asH1 ? "h1" : "h2";
  return <Tag className={className}>{children}</Tag>;
}

function isExternal(href?: string) {
  return !!href && (href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:"));
}

/**
 * Knop uit blokdata. Een interne link krijgt een pijl, een telefoonnummer een
 * telefoontje — zo zie je vooraf wat een klik doet. Een label in hoofdletters
 * (zo stond het op de oude site) wordt gewone zinsopbouw.
 */
function BtnLink({ b, full }: { b?: Btn; full?: boolean }) {
  if (!b?.label) return null;
  const cls = `${b.style === "indigo" ? "btn btn-indigo" : b.style === "outline" ? "btn btn-outline" : "btn"}${
    full ? " max-[479px]:w-full" : ""
  }`;
  const tel = b.href?.startsWith("tel:");
  const inner = (
    <>
      {tel && <LuPhone aria-hidden />}
      {zinsletters(b.label)}
      {!tel && b.style !== "outline" && <Arrow />}
    </>
  );
  if (isExternal(b.href)) return <a href={b.href} className={cls}>{inner}</a>;
  return <Link href={b.href || "#"} className={cls}>{inner}</Link>;
}

/**
 * Een groep knoppen. Alleen de eerste is een volle knop; de rest wordt een
 * outline, tenzij de data iets anders vraagt — twee even zware knoppen naast
 * elkaar laten de bezoeker kiezen zonder te zeggen wat de hoofdactie is. Op
 * een smalle telefoon vullen ze de breedte, zodat ze even lang zijn.
 */
function Buttons({ list, className = "" }: { list: (Btn | undefined)[]; className?: string }) {
  const shown = list.filter((b): b is Btn => !!b?.label);
  if (!shown.length) return null;
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {shown.map((b, i) => (
        <BtnLink key={i} b={i > 0 && !b.style ? { ...b, style: "outline" } : b} full />
      ))}
    </div>
  );
}

/**
 * Anker voor een kop, zodat je vanaf elders naar een onderdeel van een pagina
 * kunt linken (`/begeleiding-en-coaching#burn-out-coaching-op-maat`).
 * Accenten eraf: "Eén-op-één" wordt "een-op-een".
 */
export function anchorId(title: string): string {
  return String(title || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Kop met één woord of woordgroep in de accentkleur ("Jouw mensen, onze aandacht"). */
function Highlighted({ text, highlight }: { text: string; highlight?: string }) {
  const hl = (highlight || "").trim();
  const at = hl ? text.indexOf(hl) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className="hl">{hl}</span>
      {text.slice(at + hl.length)}
    </>
  );
}

// Op een telefoon iets kleiner: dan past een woord als "Verzuimbegeleiding"
// zonder afbreken.
const H2 = "text-[1.85rem] font-extrabold leading-[1.08] tracking-[-0.022em] sm:text-[2.1rem] md:text-[2.75rem]";

/** Bovenkop + kop + tekst: het begin van bijna elke sectie. */
function SectionHead({
  eyebrow, heading, highlight, text, asH1, align = "left", className = "",
}: {
  eyebrow?: string;
  heading?: string;
  highlight?: string;
  text?: string;
  asH1?: boolean;
  align?: "left" | "center";
  className?: string;
}) {
  if (!eyebrow && !heading && !text) return null;
  const center = align === "center";
  return (
    <div className={`${center ? "mx-auto text-center" : ""} ${className}`} data-reveal>
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      {heading && (
        <PageHeading asH1={asH1} className={H2}>
          <Highlighted text={heading} highlight={highlight} />
        </PageHeading>
      )}
      {text && (
        <MiniMarkdown text={text} className={`mt-5 text-[18.5px] ${center ? "mx-auto max-w-[680px]" : "max-w-[640px]"}`} />
      )}
    </div>
  );
}

/**
 * Band boven aan een pagina die niet met een hero begint (bv. /diensten of de
 * privacyverklaring): kruimelpad en h1 op een lichte achtergrond die onder de
 * zwevende header doorloopt. Zo begint elke pagina met dezelfde rust.
 */
function HeaderBand({ ctx, children }: { ctx?: BlockCtx; children: React.ReactNode }) {
  return (
    <section data-tone="band" className="hero-pull relative bg-soft">
      <div className="container-site relative pb-16 pt-8 md:pb-20 md:pt-12">
        <DotCloud className="pointer-events-none absolute right-8 top-1/2 hidden w-[120px] -translate-y-1/2 lg:block" />
        {ctx?.crumbs && <Breadcrumbs crumbs={ctx.crumbs} className="mb-8 text-primary" />}
        <div className="lg:pr-48">{children}</div>
      </div>
    </section>
  );
}

const H1_BAND = "max-w-[900px] text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.028em] md:text-[3.5rem]";

/* ---------- Hero's ---------- */

/**
 * Ronde foto met de stippenwolk uit het logo ernaast: de vormtaal van React2u
 * (stippen, het REACT-wiel, de ronde foto op de oude site). De stippen staan in
 * de hoek van het vierkant, buiten de cirkel — nooit over een gezicht.
 */
function RondeFoto({
  src, alt, priority, klein,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  klein?: boolean;
}) {
  return (
    <div className={`relative mx-auto aspect-square w-full ${klein ? "max-w-[420px]" : "max-w-[540px]"}`}>
      {/* Een zachte ring in de kleur van de pagina (op een dienstpagina de pijler). */}
      <div aria-hidden className="absolute inset-0 rounded-full bg-[var(--k-zacht,var(--color-soft))]" />
      <div className="absolute inset-[5%] overflow-hidden rounded-full bg-soft shadow-[0_30px_60px_-30px_rgba(34,32,90,0.45)]">
        <SiteImage src={src} alt={alt} priority={priority} sizes="(min-width: 1024px) 540px, 90vw"
          className="h-full w-full object-cover object-[center_28%]" />
      </div>
      <DotCloud animate className="pointer-events-none absolute -left-2 top-0 w-[27%] sm:-left-6" />
    </div>
  );
}

/**
 * De homepage-hero: de belofte links, rechts de ronde foto met de stippen uit
 * het logo. Klantlogo's horen niet hier maar in een eigen blok verderop.
 */
function HeroStatement({ d, asH1 }: BlockProps) {
  return (
    <section data-tone="hero" className="relative overflow-hidden">
      <div className={`container-site ${SPLIT} items-center gap-y-12 pb-16 pt-10 md:pb-24 md:pt-14`}>
        <div className="lg:col-span-6">
          {d.eyebrow && (
            <p className="eyebrow mb-6" data-reveal>
              <span className="h-2 w-2 rounded-full bg-secondary" aria-hidden />
              {d.eyebrow}
            </p>
          )}
          <PageHeading asH1={asH1}
            className="whitespace-pre-line text-[2.6rem] font-extrabold leading-[1.03] tracking-[-0.032em] sm:text-[3.6rem] lg:text-[4.4rem]">
            <Highlighted text={d.heading || ""} highlight={d.highlight} />
          </PageHeading>
          {d.text && (
            <div data-reveal style={{ "--ri": 1 } as React.CSSProperties}>
              <MiniMarkdown text={d.text} className="mt-7 max-w-[560px] text-[19px] md:text-[20px]" />
            </div>
          )}
          <div data-reveal style={{ "--ri": 2 } as React.CSSProperties}>
            <Buttons list={[d.button, d.button2]} className="mt-9" />
            {d.badge && (
              <p className="mt-8 flex items-center gap-2.5 text-[15px] font-medium text-primary">
                <LuBadgeCheck className="shrink-0 text-[20px] text-secondary-ink" aria-hidden />
                {d.badge}
              </p>
            )}
          </div>
        </div>
        {d.image && (
          <div className="lg:col-span-6 lg:col-start-7" data-reveal style={{ "--ri": 1 } as React.CSSProperties}>
            <RondeFoto src={d.image} alt={d.imageAlt || ""} priority />
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Hero voor gewone pagina's: kruimelpad en tekst links, de ronde foto rechts.
 * Op een dienstpagina krijgt de ring de kleur van de pijler (--k-zacht).
 */
function Hero({ d, asH1, ctx }: BlockProps) {
  return (
    <section data-tone="hero" className="relative">
      <div className={`container-site ${SPLIT} items-center gap-y-10 pb-12 pt-8 md:pb-16 md:pt-12`}>
        <div className={d.image ? "lg:col-span-7" : "lg:col-span-9"}>
          {ctx?.crumbs && <Breadcrumbs crumbs={ctx.crumbs} className="mb-8 text-primary" />}
          {d.eyebrow && <p className="eyebrow mb-5" data-reveal>{d.eyebrow}</p>}
          <PageHeading asH1={asH1}
            className="whitespace-pre-line text-[2rem] font-extrabold leading-[1.06] tracking-[-0.028em] sm:text-[2.9rem] lg:text-[3.4rem]">
            {d.heading}
          </PageHeading>
          {d.text && (
            <div data-reveal style={{ "--ri": 1 } as React.CSSProperties}>
              <MiniMarkdown text={d.text} className="mt-6 max-w-[640px] text-[18.5px]" />
            </div>
          )}
          <div data-reveal style={{ "--ri": 2 } as React.CSSProperties}>
            <Buttons list={[d.button, d.button2]} className="mt-8" />
          </div>
        </div>
        {d.image && (
          <div className="lg:col-span-5 lg:col-start-8" data-reveal style={{ "--ri": 1 } as React.CSSProperties}>
            <RondeFoto src={d.image} alt={d.imageAlt || ""} priority klein />
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- Tekstsecties ---------- */

function Intro({ d, asH1, first, ctx }: BlockProps) {
  // Eerste blok van de pagina: dan is dit de paginakop.
  if (first && asH1) {
    return (
      <HeaderBand ctx={ctx}>
        {d.eyebrow && <p className="eyebrow mb-4" data-reveal>{d.eyebrow}</p>}
        <h1 className={H1_BAND}>{d.heading}</h1>
        {d.text && <MiniMarkdown text={d.text} className="mt-6 max-w-[720px] text-[19px]" />}
        <Buttons list={[d.button]} className="mt-8" />
      </HeaderBand>
    );
  }
  // Uitdrukkelijk gecentreerd.
  if (d.layout === "center") {
    return (
      <section data-tone="white" className={PAD}>
        <div className="container-site max-w-[900px] text-center">
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} text={d.text} asH1={asH1} align="center" />
          <Buttons list={[d.button]} className="mt-8 justify-center" />
        </div>
      </section>
    );
  }
  // Alleen een kop: de titel boven het blok dat volgt. Minder ruimte eronder,
  // anders staat zo'n kop verloren.
  if (!d.text && !d.button?.label) {
    return (
      <section data-tone="white" className="pb-10 pt-16 md:pt-24">
        <div className="container-site">
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} asH1={asH1} className="max-w-[820px]" />
        </div>
      </section>
    );
  }
  // Geen kop: alleen tekst, op leesbreedte en links op het raster.
  if (!d.heading) {
    return (
      <section data-tone="white" className={PAD}>
        <div className="container-site">
          <div className="max-w-[760px]" data-reveal>
            <MiniMarkdown text={d.text || ""} className="text-[19px]" />
            <Buttons list={[d.button]} className="mt-8" />
          </div>
        </div>
      </section>
    );
  }
  // Kop en tekst: kop links (blijft staan), tekst rechts — de "Onze
  // expertise"-opbouw van Acture. Lange gecentreerde alinea's lezen slecht.
  return (
    <section data-tone="white" className={PAD}>
      <div className={`container-site ${SPLIT}`}>
        <div className={`${LINKS} ${STICKY}`} data-reveal>
          {d.eyebrow && <p className="eyebrow mb-4">{d.eyebrow}</p>}
          <PageHeading asH1={asH1} className={H2}>{d.heading}</PageHeading>
          {/* Op een groot scherm staat de knop onder de kop: dat vult de kolom. */}
          <Buttons list={[d.button]} className="mt-9 hidden lg:flex" />
        </div>
        <div className={`${RECHTS} lg:pt-9`} data-reveal style={{ "--ri": 1 } as React.CSSProperties}>
          {d.text && <MiniMarkdown text={d.text} className="text-[19px]" />}
          <Buttons list={[d.button]} className="mt-8 lg:hidden" />
        </div>
      </div>
    </section>
  );
}

function AnimatedHeadline({ d }: BlockProps) {
  return (
    <section data-tone="white" className="py-10">
      <div className="container-site">
        <TypingHeadline before={d.before || ""} words={(d.words as string[]) || []} after={d.after || ""} />
      </div>
    </section>
  );
}

function ImageText({ d, asH1 }: BlockProps) {
  const imgLeft = d.imagePosition === "left";
  return (
    <section data-tone="white" className={PAD}>
      <div className={`container-site ${SPLIT} items-center`}>
        <div className={imgLeft ? "lg:col-span-5 lg:col-start-8 lg:row-start-1" : LINKS}>
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} text={d.text} asH1={asH1} />
          <Buttons list={[d.button]} className="mt-8" />
        </div>
        {d.image && (
          <div className={imgLeft ? "lg:col-span-6 lg:col-start-1 lg:row-start-1" : RECHTS} data-reveal>
            <SiteImage src={d.image} alt={d.imageAlt || ""} sizes="(min-width: 1024px) 560px, 100vw"
              className="mx-auto w-full max-w-[560px] rounded-[28px] border border-black/[0.06] bg-white object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}

function RichText({ d, asH1, first, ctx }: BlockProps) {
  if (first && asH1) {
    return (
      <>
        <HeaderBand ctx={ctx}>
          {d.eyebrow && <p className="eyebrow mb-4" data-reveal>{d.eyebrow}</p>}
          <h1 className={H1_BAND}>{d.heading}</h1>
        </HeaderBand>
        <section data-tone="white" className="pb-6 pt-14 md:pt-20">
          <div className="container-site">
            <div className="max-w-[760px]">
              <MiniMarkdown text={d.body || ""} className="text-[18.5px]" />
              <Buttons list={[d.button]} className="mt-9" />
            </div>
          </div>
        </section>
      </>
    );
  }
  return (
    <section data-tone="white" className={PAD}>
      <div className="container-site">
        <div className="max-w-[760px]" data-reveal>
          {d.eyebrow && <p className="eyebrow mb-4">{d.eyebrow}</p>}
          {d.heading && <PageHeading asH1={asH1} className={`${H2} mb-6`}>{d.heading}</PageHeading>}
          <MiniMarkdown text={d.body || ""} className="text-[18.5px]" />
          <Buttons list={[d.button]} className="mt-9" />
        </div>
      </div>
    </section>
  );
}

function ImagesBlock({ d }: BlockProps) {
  const images = ((d.images as any[]) || []).filter((im) => im?.image);
  return (
    <section data-tone="white" className="py-10 md:py-14">
      <div className="container-site max-w-[940px] space-y-8">
        {images.map((im, i) => (
          <div key={i} className="overflow-hidden rounded-[28px] border border-black/[0.06] bg-white" data-reveal>
            <SiteImage src={im.image} alt={im.alt || ""} sizes="(min-width: 940px) 940px, 100vw" className="mx-auto w-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Diensten ---------- */

/**
 * Het overzicht van de zes diensten. Titel en kleur komen uit PIJLERS (op de
 * link), zodat de kaarten dezelfde naam en kleur dragen als menu en footer —
 * ook als de blokdata nog de oude titel in hoofdletters heeft.
 */
const DIENST_VOLGORDE = PIJLERS.flatMap((p) => p.diensten.map((x) => x.href));

function ServicesGrid({ d }: BlockProps) {
  // Op de volgorde van de pijlers (preventie, verzuim, ontwikkeling), zoals in
  // het menu. Een kaart die niet bij een dienst hoort, komt achteraan.
  const plek = (c: any) => {
    const i = DIENST_VOLGORDE.indexOf(c.href);
    return i < 0 ? Infinity : i;
  };
  const cards = [...((d.cards as any[]) || [])].sort((a, b) => plek(a) - plek(b));
  return (
    <section data-tone="white" className={PAD}>
      <div className="container-site grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => {
          const hit = c.href ? dienstVoor(c.href) : null;
          const title = hit?.dienst.label || c.title;
          return (
            <Link key={i} href={c.href || "#"} style={{ ...kleurVars(hit?.dienst.kleur), "--ri": i % 3 } as React.CSSProperties}
              className="lift group flex flex-col rounded-[28px] border border-black/[0.06] bg-white p-7 md:p-8" data-reveal>
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--k-zacht)] text-[26px] text-[var(--k)]">
                <Icon name={c.icon} />
              </span>
              {hit && <span className="mt-7 text-[12.5px] font-bold uppercase tracking-[0.14em] text-[var(--k)]">{hit.pijler.title}</span>}
              <h3 className={`${hit ? "mt-1.5" : "mt-7"} text-[23px] leading-tight`}>{title}</h3>
              <p className="mt-3 text-[16.5px]">{c.description}</p>
              <span className="link-arrow mt-auto pt-7 text-[15.5px]">
                Lees verder <Arrow />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/**
 * "Dit kun je van ons verwachten": de inleiding blijft links staan terwijl je
 * langs de genummerde onderdelen scrolt. Elk onderdeel krijgt een anker.
 */
function SubSections({ d, asH1 }: BlockProps) {
  const items = (d.items as any[]) || [];
  return (
    <section data-tone="soft" className={`bg-soft ${PAD}`}>
      <div className={`container-site ${SPLIT}`}>
        <div className={`${LINKS} ${STICKY}`}>
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} asH1={asH1} />
          {d.intro && <MiniMarkdown text={d.intro} className="mt-6 text-[17.5px]" />}
        </div>
        <ol className={`${RECHTS} space-y-4`}>
          {items.map((it, i) => (
            <li key={i} id={anchorId(it.title) || undefined} data-reveal
              className="rounded-[26px] border border-black/[0.05] bg-white p-7 md:p-9">
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-5">
                <span className="font-heading text-[15px] font-extrabold tabular-nums text-[var(--k,var(--color-accent))]" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[22px] leading-snug">{it.title}</h3>
                  <MiniMarkdown text={it.body || ""} className="mt-3 text-[16.5px]" />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * "Wat doet de werkgever? / Wat neemt React2u uit handen?" — twee kaarten, de
 * tweede op indigo. Met `text` (bv. over de wettelijke plicht van de
 * werkgever) en `button` wordt het een volwaardige sectie voor de homepage.
 */
function TwoColumnLists({ d, asH1 }: BlockProps) {
  const cols = (d.columns as any[]) || [];
  return (
    <section data-tone="white" className={PAD}>
      <div className="container-site">
        <SectionHead eyebrow={d.eyebrow} heading={d.heading} text={d.text} asH1={asH1} align="center" className="mb-12 max-w-[760px]" />
        <div className="relative grid gap-5 md:grid-cols-2">
          {cols.map((c, i) => {
            const dark = i % 2 === 1;
            return (
              <div key={i} data-reveal style={{ "--ri": i } as React.CSSProperties}
                className={`rounded-[28px] p-8 md:p-10 ${dark ? "on-dark dot-texture bg-primary text-white/85" : "bg-[var(--k-zacht,var(--color-soft))]"}`}>
                <h3 className={`mb-7 text-[24px] ${dark ? "!text-white" : ""}`}>{c.title}</h3>
                <ul className="space-y-4">
                  {((c.items as string[]) || []).map((item, j) => (
                    <li key={j} className="flex gap-3.5 text-[17px]">
                      <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${dark ? "bg-white/15 text-white" : "bg-white text-[var(--k,var(--color-secondary-ink))]"}`}>
                        <LuCheck className="text-[14px]" aria-hidden />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <Buttons list={[d.button && { ...d.button, style: d.button.style || "indigo" }]} className="mt-10 justify-center" />
      </div>
    </section>
  );
}

/**
 * Het startscherm: je kiest eerst of je werkgever of werknemer bent. Die twee
 * zoeken iets heel anders — diensten en een partner, of: ik ben ziek, wat nu?
 * `choices` is een lijst van { label, title, text, icon, image, imageAlt,
 * href, button, links: [{ label, href }] }. De eerste keuze staat op indigo.
 */
function AudienceChoice({ d, asH1 }: BlockProps) {
  const choices = ((d.choices as any[]) || []).filter((c) => c?.title && c?.href);
  return (
    <section data-tone="hero" className="relative isolate overflow-hidden bg-soft">
      <div aria-hidden className="dot-texture-light absolute inset-0 -z-10" />
      <div className="container-site pb-16 pt-12 md:pb-24 md:pt-16">
        <div className="mx-auto max-w-[820px] text-center">
          <DotCloud animate className="mx-auto mb-8 w-[92px]" />
          {d.eyebrow && <p className="eyebrow mb-5 justify-center">{d.eyebrow}</p>}
          <PageHeading asH1={asH1}
            className="text-[2.4rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[3.2rem] lg:text-[3.8rem]">
            <Highlighted text={d.heading || ""} highlight={d.highlight} />
          </PageHeading>
          {d.text && <MiniMarkdown text={d.text} className="mx-auto mt-6 max-w-[620px] text-[19px] md:text-[20px]" />}
        </div>

        <div className="mt-12 grid gap-5 md:mt-14 lg:grid-cols-2">
          {choices.map((c, i) => {
            const dark = i === 0;
            return (
              <div key={i} data-reveal style={{ "--ri": i } as React.CSSProperties}
                className={`relative flex flex-col rounded-[32px] p-7 sm:p-9 lg:p-10 ${
                  dark ? "on-dark bg-primary text-white/80" : "border border-black/[0.06] bg-white shadow-[0_24px_48px_-36px_rgba(34,32,90,0.45)]"
                }`}>
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="eyebrow mb-3">
                      <Icon name={c.icon} className="text-[17px]" />
                      {c.label}
                    </p>
                    <h2 className="text-[2rem] font-extrabold leading-[1.08] tracking-[-0.02em] md:text-[2.4rem]">
                      <Link href={c.href} className="hover:underline hover:decoration-2 hover:underline-offset-4">{c.title}</Link>
                    </h2>
                  </div>
                  {c.image && (
                    <div className={`hidden h-[104px] w-[104px] shrink-0 overflow-hidden rounded-full sm:block ${dark ? "ring-4 ring-white/15" : "ring-4 ring-soft"}`}>
                      <SiteImage src={c.image} alt={c.imageAlt || ""} sizes="104px" widths={[240]} className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
                {c.text && <p className="mt-4 max-w-[520px] text-[17.5px]">{c.text}</p>}
                <ul className={`mt-7 divide-y ${dark ? "divide-white/15 border-y border-white/15" : "divide-primary/10 border-y border-primary/10"}`}>
                  {((c.links as any[]) || []).filter((l) => l?.label).map((l, j) => (
                    <li key={j}>
                      <Link href={l.href || "#"}
                        className={`group flex items-center justify-between gap-4 py-3.5 font-semibold ${dark ? "text-white" : "text-primary"}`}>
                        {l.label}
                        <Arrow className={`shrink-0 transition-transform duration-300 group-hover:translate-x-1 ${dark ? "text-white/70" : "text-accent"}`} />
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Link href={c.href} className={`btn max-[479px]:w-full ${dark ? "" : "btn-indigo"}`}>
                    {c.button || `Verder als ${String(c.label || "").toLowerCase()}`} <Arrow />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {d.note && <MiniMarkdown text={d.note} className="mt-10 text-center text-[16px] text-primary" />}
      </div>
    </section>
  );
}

/**
 * Stappen onder elkaar, verbonden door een stippellijn: zoals het visuele
 * verzuimprotocol van React2u (R-E-A-C-T-2U). `steps` is een lijst van
 * { badge, title, text, kleur }; `badge` is wat in de cirkel staat (een
 * letter, "2U", of een nummer). Met `anchor` kun je ernaar linken.
 */
function Steps({ d, asH1 }: BlockProps) {
  const steps = ((d.steps as any[]) || []).filter((st) => st?.title);
  return (
    <section id={d.anchor || undefined} data-tone="soft" className={`bg-soft ${PAD}`}>
      <div className={`container-site ${SPLIT}`}>
        <div className={`${LINKS} ${STICKY}`}>
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} text={d.text} asH1={asH1} />
          <Buttons list={[d.button]} className="mt-9" />
        </div>
        <ol className={`${RECHTS} relative`}>
          {/* De stippellijn door de cirkels heen. */}
          <div aria-hidden className="absolute bottom-10 left-[27px] top-10 border-l-2 border-dotted border-primary/25" />
          {steps.map((st, i) => (
            <li key={i} data-reveal style={{ ...kleurVars(st.kleur), "--ri": i % 3 } as React.CSSProperties}
              className="relative flex gap-5 pb-4 last:pb-0">
              <span className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-full border-[3px] border-[var(--k-vlak)] bg-white font-heading text-[20px] font-extrabold text-[var(--k)]" aria-hidden>
                {st.badge || i + 1}
              </span>
              <div className="min-w-0 flex-1 rounded-[24px] bg-white p-6 md:p-7">
                <h3 className="text-[20px]">
                  <span className="sr-only">Stap {i + 1}: </span>{st.title}
                </h3>
                {st.text && <MiniMarkdown text={st.text} className="mt-2 text-[16.5px]" />}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const WAARDE_KLEUREN: Kleur[] = ["teal", "roze", "blauw", "oranje", "rood", "indigo"];

function ValueCards({ d, asH1 }: BlockProps) {
  const cards = (d.cards as any[]) || [];
  // Met een kop wordt het "Wat maakt ons anders?": tekst links, waarden als
  // lijst rechts. Zonder kop blijft het een rij kaarten.
  if (d.heading) {
    return (
      <section data-tone="soft" className={`bg-soft ${PAD}`}>
        <div className={`container-site ${SPLIT}`}>
          <div className={`${LINKS} ${STICKY}`}>
            <SectionHead eyebrow={d.eyebrow} heading={d.heading} text={d.text} asH1={asH1} />
            <Buttons list={[d.button]} className="mt-9" />
          </div>
          <ul className={`${RECHTS} space-y-4`}>
            {cards.map((c, i) => (
              <li key={i} style={{ ...kleurVars(WAARDE_KLEUREN[i % WAARDE_KLEUREN.length]), "--ri": i } as React.CSSProperties}
                  className="flex flex-col gap-5 rounded-[26px] bg-white p-7 sm:flex-row md:p-8" data-reveal>
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--k-zacht)] text-[26px] text-[var(--k)]">
                  <Icon name={c.icon} />
                </span>
                <div>
                  <h3 className="mb-3 text-[22px]">{c.title}</h3>
                  <p className="text-[16.5px]">{c.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }
  return (
    <section data-tone="white" className={PAD}>
      <div className="container-site grid gap-5 md:grid-cols-3">
        {cards.map((c, i) => (
          <div key={i} style={{ ...kleurVars(WAARDE_KLEUREN[i % WAARDE_KLEUREN.length]), "--ri": i } as React.CSSProperties}
               className="rounded-[28px] bg-soft p-8" data-reveal>
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-[26px] text-[var(--k)]">
              <Icon name={c.icon} />
            </span>
            <h3 className="mt-7 text-[24px]">{c.title}</h3>
            <p className="mt-3 text-[16.5px]">{c.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Oproep, contact en vragen ---------- */

/**
 * Afsluitende oproep: tekst links, rechts de stippenwolk uit het logo op
 * groot formaat — hetzelfde beeld als op de onderhoudspagina. Met `routes`
 * (lijst van { icon, label, sub, href }) staan rechts de manieren om contact
 * op te nemen, zodat iedereen zijn eigen weg kiest: bellen, mailen, een
 * bericht sturen, of als werknemer meteen naar het verzuimprotocol.
 */
function CtaBanner({ d, asH1 }: BlockProps) {
  const buttons = (d.buttons as Btn[]) || [];
  const routes = ((d.routes as any[]) || []).filter((r) => r?.label && r?.href);
  return (
    <section data-tone="white" className="py-12 md:py-16">
      <div className="container-site">
        {/* grid-cols-1 (= minmax(0, 1fr)): zonder die ondergrens kan lange
            tekst in de routes de kolom breder duwen dan het scherm. */}
        <div className="on-dark relative isolate grid grid-cols-1 items-center gap-10 overflow-hidden rounded-[36px] bg-primary px-6 py-14 text-white/80 sm:px-12 md:py-16 lg:grid-cols-12 lg:px-16" data-reveal>
          {/* Achter de tekst: -z-10 binnen de isolate-laag van dit vlak. */}
          <div aria-hidden className="dot-texture absolute inset-0 -z-10" />
          <div className={routes.length ? "lg:col-span-6" : "lg:col-span-8"}>
            {routes.length > 0 && <DotCloud animate className="mb-8 w-[88px]" />}
            {d.eyebrow && <p className="eyebrow mb-4">{d.eyebrow}</p>}
            {d.heading && (
              <PageHeading asH1={asH1} className="max-w-[720px] text-[2.1rem] font-extrabold leading-[1.06] tracking-[-0.025em] md:text-[2.9rem]">
                {d.heading}
              </PageHeading>
            )}
            {d.text && <MiniMarkdown text={d.text} className="mt-5 max-w-[620px] text-[18.5px]" />}
            <Buttons list={buttons} className="mt-9" />
          </div>
          {routes.length > 0 ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-6 lg:grid-cols-1">
              {routes.map((r, i) => {
                const inner = (
                  <>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-[19px] text-white">
                      <Icon name={r.icon} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-white">{r.label}</span>
                      {r.sub && <span className="block text-[15px] leading-snug text-white/70">{r.sub}</span>}
                    </span>
                    <Arrow className="shrink-0 text-white/70 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                );
                const cls = "group flex items-center gap-4 rounded-[20px] border border-white/10 bg-white/[0.06] px-4 py-3.5 transition-colors hover:border-white/35 hover:bg-white/10";
                return (
                  <li key={i}>
                    {isExternal(r.href) ? <a href={r.href} className={cls}>{inner}</a> : <Link href={r.href} className={cls}>{inner}</Link>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="hidden lg:col-span-4 lg:block">
              <DotCloud animate className="ml-auto w-full max-w-[260px]" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FaqSide({ heading, asH1 }: { heading?: string; asH1?: boolean }) {
  return (
    <div className={`${LINKS} ${STICKY}`} data-reveal>
      <p className="eyebrow mb-4">Vragen & antwoorden</p>
      <PageHeading asH1={asH1} className={H2}>{heading || "Veelgestelde vragen"}</PageHeading>
      <p className="mt-5 max-w-[420px] text-[18px]">Staat je vraag er niet bij? We helpen je graag persoonlijk verder.</p>
      <Link href="/contact" className="link-arrow mt-6">Stel je vraag <Arrow /></Link>
    </div>
  );
}

function FaqBlock({ d, asH1 }: BlockProps) {
  return (
    <section id="veelgestelde-vragen" data-tone="white" className={PAD}>
      <div className={`container-site ${SPLIT}`}>
        <FaqSide heading={d.heading} asH1={asH1} />
        <div className={RECHTS} data-reveal style={{ "--ri": 1 } as React.CSSProperties}>
          <Accordion items={((d.items as FaqItem[]) || [])} />
        </div>
      </div>
    </section>
  );
}

function ContactFaq({ d, asH1 }: BlockProps) {
  return (
    <section data-tone="soft" className={`bg-soft ${PAD}`}>
      <div className="container-site grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="rounded-[32px] bg-white p-7 md:p-10" data-reveal>
          {d.heading && <PageHeading asH1={asH1} className={H2}>{d.heading}</PageHeading>}
          {d.text && <MiniMarkdown text={d.text} className="mb-8 mt-4 text-[17.5px]" />}
          <ContactForm />
        </div>
        <div data-reveal style={{ "--ri": 1 } as React.CSSProperties}>
          <p className="eyebrow mb-6">Veelgestelde vragen</p>
          <Accordion items={((d.faq as FaqItem[]) || [])} />
        </div>
      </div>
    </section>
  );
}

function ContactDetails({ d, asH1 }: BlockProps) {
  const rows = [
    d.phoneDisplay && { icon: <LuPhone />, label: "Bel ons", value: d.phoneDisplay, href: `tel:${d.phone}` },
    d.email && { icon: <LuMail />, label: "Mail ons", value: d.email, href: `mailto:${d.email}` },
    d.address && { icon: <LuMapPin />, label: "Bezoekadres", value: d.address, href: "" },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string; href: string }[];
  return (
    <section data-tone="white" className={PAD}>
      <div className={`container-site ${SPLIT}`}>
        <div className={LINKS}>
          <SectionHead heading={d.heading} text={d.text} asH1={asH1} />
          <ul className="mt-9 space-y-3">
            {rows.map((r, i) => {
              const inner = (
                <>
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-soft text-[20px] text-primary" aria-hidden>{r.icon}</span>
                  <span>
                    <span className="block text-[14px] text-body">{r.label}</span>
                    <span className="block whitespace-pre-line font-semibold text-primary">{r.value}</span>
                  </span>
                </>
              );
              const cls = "flex items-center gap-4 rounded-[20px] border border-black/[0.06] bg-white p-4";
              return (
                <li key={i} data-reveal style={{ "--ri": i } as React.CSSProperties}>
                  {r.href ? <a href={r.href} className={`${cls} transition-colors hover:border-primary/30`}>{inner}</a> : <div className={cls}>{inner}</div>}
                </li>
              );
            })}
          </ul>
        </div>
        <div className={`${RECHTS} rounded-[32px] border border-black/[0.06] bg-white p-7 shadow-[0_20px_40px_-24px_rgba(34,32,90,0.28)] md:p-10`} data-reveal>
          <h3 className="mb-6 text-[26px]">{d.formHeading || "Stuur ons een bericht"}</h3>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}

function LogoCarouselBlock({ d }: BlockProps) {
  const logos = ((d.logos as any[]) || []).filter((l) => l?.image);
  return (
    <section data-tone="white" className="py-14 md:py-20">
      <div className="container-site text-center" data-reveal>
        {d.eyebrow && <p className="eyebrow mb-8">{d.eyebrow}</p>}
        <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          {logos.map((l, i) => (
            <li key={`${l.image}-${i}`}>
              <SiteImage src={l.image} alt={l.alt || ""} sizes="180px" widths={[180, 360]}
                className="h-14 w-auto max-w-[170px] object-contain opacity-75 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Opbouw naar acture.nl: pijlers, index, over ons, cijfers, inzichten ---------- */

/**
 * De diensten vanuit de werkgever: "waar loop je tegenaan?". Drie stappen —
 * voorkomen, begeleiden, versterken — met per dienst de situatie waarin hij
 * helpt. De inhoud komt uit PIJLERS in nav.ts, dezelfde bron als menu en
 * footer; het blok zelf regelt alleen de kop.
 */
function Pillars({ d, asH1 }: BlockProps) {
  return (
    <section data-tone="soft" className={`bg-soft ${PAD}`}>
      <div className="container-site">
        <div className={`${SPLIT} mb-14 lg:items-end`}>
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} asH1={asH1} className={LINKS} />
          {d.text && <MiniMarkdown text={d.text} className={`${RECHTS} text-[18.5px]`} />}
        </div>
        <ol className="relative grid gap-5 md:grid-cols-3">
          {/* De stappen hangen aan een stippellijn: van voorkomen naar versterken. */}
          <div aria-hidden className="absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dotted border-primary/20 md:block" />
          {PIJLERS.map((p, i) => (
            <li key={p.key} style={{ ...kleurVars(p.kleur), "--ri": i } as React.CSSProperties} data-reveal className="relative">
              <div className="flex items-center gap-4 md:flex-col md:items-start">
                <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 border-soft bg-white text-[24px] text-[var(--k)] shadow-[0_6px_16px_-10px_rgba(34,32,90,0.5)]">
                  <Icon name={p.icon} />
                </span>
                <p>
                  <span className="block text-[12.5px] font-bold uppercase tracking-[0.14em] text-[var(--k)]">Stap {i + 1} · {p.stap}</span>
                  <span className="block font-heading text-[24px] font-bold text-primary">{p.title}</span>
                </p>
              </div>
              <p className="mt-4 text-[16.5px]">{p.text}</p>
              <ul className="mt-6 space-y-3">
                {p.diensten.map((x) => (
                  <li key={x.href} style={kleurVars(x.kleur)}>
                    <Link href={x.href}
                      className="group block rounded-[22px] border border-black/[0.05] bg-white px-5 py-4 transition-[border-color,box-shadow] duration-300 hover:border-[var(--k-vlak)] hover:shadow-[0_16px_32px_-24px_rgba(34,32,90,0.5)]">
                      <span className="block text-[15px] text-body">{x.situatie}</span>
                      <span className="mt-1 flex items-center justify-between gap-3 font-semibold text-primary">
                        {x.label}
                        <Arrow className="shrink-0 text-[var(--k)] transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * Het REACT-model: de werkwijze van React2u. Links de vijf letters met wat ze
 * betekenen, rechts het wiel. `steps` is een lijst van { title, text, kleur };
 * de letter is de eerste letter van de titel. Op indigo, zodat de kleuren van
 * het wiel oplichten.
 */
function Method({ d, asH1 }: BlockProps) {
  const steps = ((d.steps as any[]) || []).filter((st) => st?.title);
  return (
    <section data-tone="dark" className="on-dark relative isolate overflow-hidden bg-primary-deep py-20 text-white/75 md:py-28">
      <div aria-hidden className="dot-texture absolute inset-0 -z-10 opacity-80" />
      <div className={`container-site ${SPLIT} items-center gap-y-14`}>
        <div className="lg:col-span-6">
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} text={d.text} asH1={asH1} />
          {steps.length > 0 && (
            <ol className="mt-10 space-y-5">
              {steps.map((st, i) => (
                <li key={i} style={{ ...kleurVars(st.kleur), "--ri": i } as React.CSSProperties} data-reveal className="flex gap-5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-[var(--k-donker)] font-heading text-[22px] font-extrabold text-[var(--k-donker)]" aria-hidden>
                    {String(st.title).charAt(0)}
                  </span>
                  <div>
                    <h3 className="text-[19px]">{st.title}</h3>
                    {st.text && <p className="mt-1 text-[16px]">{st.text}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
          <Buttons list={[d.button && { ...d.button, style: "outline" }]} className="mt-10" />
        </div>
        <div className="lg:col-span-5 lg:col-start-8" data-reveal>
          {d.image && (
            <div className="mx-auto aspect-square w-full max-w-[460px] overflow-hidden rounded-full bg-[#ececf1] ring-[12px] ring-white/[0.06]">
              <SiteImage src={d.image} alt={d.imageAlt || ""} sizes="(min-width: 1024px) 460px, 90vw" className="h-full w-full object-cover" />
            </div>
          )}
          {d.quote && (
            <blockquote className="mx-auto mt-10 max-w-[460px] text-center font-heading text-[23px] font-bold leading-snug text-white md:text-[26px]">
              “{d.quote}”
            </blockquote>
          )}
        </div>
      </div>
    </section>
  );
}

const WAARDE_KLEUREN_VAST: Kleur[] = ["teal", "roze", "blauw"];

/**
 * "Voor iedereen gezond, menselijk en duidelijk": de drie waarden van
 * React2u, elk met een feit dat het onderbouwt. `cards` is een lijst van
 * { title, text, value, valueLabel, kleur? }.
 */
function Values({ d, asH1 }: BlockProps) {
  const cards = (d.cards as any[]) || [];
  return (
    <section data-tone="white" className={PAD}>
      <div className="container-site">
        <SectionHead eyebrow={d.eyebrow} heading={d.heading} highlight={d.highlight} text={d.text} asH1={asH1} className="mb-14 max-w-[820px]" />
        <div className="grid gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <div key={i} style={{ ...kleurVars(c.kleur || WAARDE_KLEUREN_VAST[i % 3]), "--ri": i } as React.CSSProperties} data-reveal
              className="flex flex-col rounded-[30px] bg-soft p-8 md:p-9">
              <p className="font-heading text-[2.4rem] font-extrabold leading-none tracking-[-0.03em] text-[var(--k)] md:text-[2.8rem]">
                {c.title}.
              </p>
              {c.text && <p className="mt-5 text-[16.5px]">{c.text}</p>}
              {c.value && (
                <div className="mt-auto flex items-baseline gap-3 border-t border-primary/10 pt-6">
                  <span className={`shrink-0 font-heading font-extrabold leading-none tracking-[-0.02em] text-primary ${
                    String(c.value).length > 4 ? "text-[1.7rem]" : "text-[2.4rem]"
                  }`}>{c.value}</span>
                  {c.valueLabel && <span className="text-[15px] font-medium leading-snug text-primary">{c.valueLabel}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function fmtDatum(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * De nieuwste artikelen ("Volg ons nieuws" bij Acture). Zonder gepubliceerde
 * artikelen verdwijnt het blok helemaal — een lege sectie met "binnenkort"
 * oogt slechter dan geen sectie.
 */
function LatestPosts({ d, asH1, ctx }: BlockProps) {
  const count = Math.max(1, Math.min(6, Number(d.count) || 3));
  // In de blokeditor is er geen ctx: toon daar lege voorbeeldkaarten, zodat je
  // ziet hoe het blok eruitziet.
  const preview = !ctx;
  const posts = (ctx?.posts || []).slice(0, count);
  if (!preview && posts.length === 0) return null;
  const cards = preview
    ? Array.from({ length: count }, (_, i) => ({ id: String(i), slug: "", title: "Titel van een artikel", published_at: null, cover_image: null }))
    : posts;
  return (
    <section data-tone="white" className={PAD}>
      <div className="container-site">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} text={d.text} asH1={asH1} className="max-w-[640px]" />
          {d.button?.label && <div className="shrink-0"><BtnLink b={{ ...d.button, style: "outline" }} /></div>}
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((p, i) => (
            <article key={p.id} data-reveal style={{ "--ri": i } as React.CSSProperties}
              className="lift group relative flex flex-col overflow-hidden rounded-[28px] bg-soft">
              <div className="aspect-[16/10] overflow-hidden bg-[#e9e7f5]">
                {p.cover_image ? (
                  <SiteImage src={p.cover_image} alt="" sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw"
                    widths={[480, 800]} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
                ) : (
                  <div className="grid h-full place-items-center"><DotCloud className="w-24 opacity-60" /></div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-7">
                {p.published_at && <p className="mb-2 text-[14px] text-primary/75">{fmtDatum(p.published_at)}</p>}
                <h3 className="mb-5 text-[21px] leading-snug">
                  {/* De hele kaart is klikbaar via de ::after van deze link. */}
                  <Link href={p.slug ? `/blog/${p.slug}` : "#"} className="after:absolute after:inset-0">{p.title}</Link>
                </h3>
                <span className="link-arrow mt-auto text-[15.5px]">Lees verder <Arrow /></span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Register ---------- */

const REGISTRY: Record<string, (p: BlockProps) => React.ReactNode> = {
  hero: Hero,
  intro: Intro,
  animatedHeadline: AnimatedHeadline,
  imageText: ImageText,
  servicesGrid: ServicesGrid,
  ctaBanner: CtaBanner,
  subSections: SubSections,
  twoColumnLists: TwoColumnLists,
  valueCards: ValueCards,
  contactFaq: ContactFaq,
  faqAccordion: FaqBlock,
  logoCarousel: LogoCarouselBlock,
  richText: RichText,
  imagesBlock: ImagesBlock,
  contactDetails: ContactDetails,
  heroStatement: HeroStatement,
  audienceChoice: AudienceChoice,
  steps: Steps,
  pillars: Pillars,
  method: Method,
  values: Values,
  latestPosts: LatestPosts,
};

export const BLOCK_TYPES = Object.keys(REGISTRY);

// Used by the admin block editor to render a live preview of a single block.
export function RenderBlockBody({ type, data }: { type: string; data: unknown }) {
  const Cmp = REGISTRY[type];
  if (!Cmp) return null;
  return <Cmp d={data} />;
}

// Bloktypes die een kop op paginaniveau renderen. Alleen deze komen in
// aanmerking voor de h1; kaartjes en lijstitems gebruiken h3 en tellen niet mee.
const HEADING_BLOCKS = new Set([
  "hero", "intro", "imageText", "ctaBanner", "subSections",
  "twoColumnLists", "contactFaq", "faqAccordion", "richText", "contactDetails",
  "heroStatement", "audienceChoice", "steps", "pillars", "method", "values", "valueCards",
]);

// `latestPosts` staat er bewust niet in: dat blok verdwijnt zonder artikelen,
// en dan zou de pagina zijn h1 kwijt zijn.
function rendersPageHeading(b: Block): boolean {
  return HEADING_BLOCKS.has(b.type) && Boolean((b.data as { heading?: string })?.heading);
}

/**
 * Verzamelt de FAQ-vragen van een pagina voor `FAQPage`-structured-data.
 *
 * Twee bloktypes bevatten vragen — `faqAccordion` onder `items`, `contactFaq`
 * onder `faq` — en Google wil er één FAQPage per pagina, niet één per blok.
 * Vandaar het samenvoegen hier in plaats van in de blokken zelf.
 */
function collectFaq(blocks: Block[]): { question: string; answer: string }[] {
  const out: { question: string; answer: string }[] = [];
  for (const b of blocks) {
    const d = b.data as { items?: unknown; faq?: unknown };
    const raw = b.type === "faqAccordion" ? d.items : b.type === "contactFaq" ? d.faq : null;
    if (!Array.isArray(raw)) continue;
    for (const item of raw) {
      const q = String((item as { question?: string })?.question ?? "").trim();
      // De opmaaktekens uit het antwoord halen: JSON-LD hoort platte tekst te
      // bevatten, geen markdown.
      const a = String((item as { answer?: string })?.answer ?? "")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/^###\s+/gm, "")
        .replace(/^-\s+/gm, "")
        .trim();
      if (q && a) out.push({ question: q, answer: a });
    }
  }
  return out;
}

/** Of een pagina met deze blokken de nieuwste artikelen nodig heeft. */
export function needsPosts(blocks: Block[]): boolean {
  return blocks.some((b) => b.type === "latestPosts");
}

export default function BlockRenderer({ blocks, ctx = {} }: { blocks: Block[]; ctx?: BlockCtx }) {
  // Precies één h1 per pagina: het eerste blok dát een kop heeft. Een blok van
  // het juiste type maar met een lege kop slaan we over, anders zou de h1 op
  // een pagina zonder hero stilletjes verdwijnen.
  const h1Index = blocks.findIndex(rendersPageHeading);
  const faq = collectFaq(blocks);
  return (
    <>
      {blocks.map((b, i) => {
        const Cmp = REGISTRY[b.type];
        if (!Cmp) return null;
        return <Cmp key={b.id} d={b.data} asH1={i === h1Index} first={i === 0} ctx={ctx} />;
      })}
      {faq.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faq.map((f) => ({
                "@type": "Question",
                name: f.question,
                acceptedAnswer: { "@type": "Answer", text: f.answer },
              })),
            }),
          }}
        />
      )}
    </>
  );
}
