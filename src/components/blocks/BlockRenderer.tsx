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
import { Arrow } from "@/components/site/Arrow";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import VorigeKeuze from "@/components/site/VorigeKeuze";
import { PIJLERS, dienstVoor } from "@/lib/nav";
import { LuBadgeCheck, LuCheck, LuMail, LuMapPin, LuPhone } from "react-icons/lu";

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * De blokken van de site, in één strakke vormtaal:
 * - indigo en wit, met één neutraal vlak (bg-soft) om secties af te wisselen;
 * - roze alleen voor de hoofdactie (de knop), nergens als decoratie;
 * - echte foto's, rechthoekig, met één afronding (rounded-2xl);
 * - kaarten met een dunne rand (border-line), zonder schaduw tot je erover gaat;
 * - één raster van twaalf kolommen, koppen links uitgelijnd.
 * Geen stippenpatronen, gloed of kleur per dienst: rust is hier de kwaliteit.
 */

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
  /** Dit is het eerste blok van de pagina. */
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

/** Typografie: één h1-maat, één h2-maat. */
const H1 = "text-[2.25rem] font-bold leading-[1.08] tracking-[-0.025em] sm:text-[2.9rem] lg:text-[3.5rem]";
const H2 = "text-[1.85rem] font-bold leading-[1.12] tracking-[-0.02em] sm:text-[2.2rem] lg:text-[2.5rem]";
const LEAD = "text-[18px] leading-relaxed md:text-[19px]";

/** Kaart: wit met een dunne rand. */
const KAART = "rounded-2xl border border-line bg-white";

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
 * elkaar laten de bezoeker kiezen zonder te zeggen wat de hoofdactie is.
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

/** Kop met één woord of woordgroep in de accentkleur. */
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
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      {heading && (
        <PageHeading asH1={asH1} className={H2}>
          <Highlighted text={heading} highlight={highlight} />
        </PageHeading>
      )}
      {text && <MiniMarkdown text={text} className={`mt-4 ${LEAD} ${center ? "mx-auto max-w-[640px]" : "max-w-[620px]"}`} />}
    </div>
  );
}

/** Pictogram in een vierkant vlak — overal hetzelfde formaat en dezelfde kleur. */
function IconTegel({ name, donker }: { name?: string; donker?: boolean }) {
  return (
    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-[22px] ${
      donker ? "bg-white/10 text-white" : "bg-soft text-primary"
    }`}>
      <Icon name={name} />
    </span>
  );
}

/** Rechthoekige foto met één afronding. */
function Foto({
  src, alt, sizes, priority, className = "", ratio = "aspect-[4/3]",
}: {
  src?: string;
  alt?: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  ratio?: string;
}) {
  if (!src) return null;
  return (
    <div className={`overflow-hidden rounded-2xl bg-soft ${ratio} ${className}`}>
      <SiteImage src={src} alt={alt || ""} sizes={sizes} priority={priority} className="h-full w-full object-cover" />
    </div>
  );
}

/**
 * Paginakop voor een pagina die niet met een hero begint (bv. /diensten of de
 * privacyverklaring): kruimelpad en h1 op het neutrale vlak.
 */
function HeaderBand({ ctx, children }: { ctx?: BlockCtx; children: React.ReactNode }) {
  return (
    <section data-tone="band" className="border-b border-line bg-soft">
      <div className="container-site pb-14 pt-8 md:pb-20 md:pt-10">
        {ctx?.crumbs && <Breadcrumbs crumbs={ctx.crumbs} className="mb-8 text-primary" />}
        <div className="max-w-[860px]">{children}</div>
      </div>
    </section>
  );
}

/* ---------- Hero's ---------- */

/**
 * De paginakop met foto: tekst links, foto rechts op hetzelfde raster. Gebruikt
 * door `heroStatement` (startpagina's) en `hero` (de pagina's uit het CMS).
 */
function HeroSplit({ d, asH1, ctx }: BlockProps) {
  return (
    <section data-tone="band" className="border-b border-line bg-soft">
      <div className={`container-site ${SPLIT} items-center gap-y-10 pb-14 pt-8 md:pb-20 md:pt-10`}>
        <div className={d.image ? "lg:col-span-6" : "lg:col-span-9"}>
          {ctx?.crumbs && <Breadcrumbs crumbs={ctx.crumbs} className="mb-8 text-primary" />}
          {d.eyebrow && <p className="eyebrow mb-4">{d.eyebrow}</p>}
          <PageHeading asH1={asH1} className={`${H1} whitespace-pre-line max-sm:hyphens-auto`}>
            <Highlighted text={d.heading || ""} highlight={d.highlight} />
          </PageHeading>
          {d.text && <MiniMarkdown text={d.text} className={`mt-6 max-w-[580px] ${LEAD}`} />}
          <Buttons list={[d.button, d.button2]} className="mt-8" />
          {d.badge && (
            <p className="mt-7 flex items-center gap-2.5 text-[15px] font-medium text-primary">
              <LuBadgeCheck className="shrink-0 text-[19px]" aria-hidden />
              {d.badge}
            </p>
          )}
        </div>
        {d.image && (
          <div className="lg:col-span-6 lg:col-start-7">
            <Foto src={d.image} alt={d.imageAlt} priority sizes="(min-width: 1024px) 580px, 100vw" />
          </div>
        )}
      </div>
    </section>
  );
}

function HeroStatement(p: BlockProps) {
  return <HeroSplit {...p} />;
}

function Hero(p: BlockProps) {
  return <HeroSplit {...p} />;
}

/**
 * Het startscherm. Links wie React2u is, rechts de keuze: werkgever of
 * werknemer, als twee rustige, even zware routekaarten. Zo staat de keuze
 * meteen in beeld, zonder dat hij schreeuwt.
 *
 * `choices` (twee) met { doelgroep, label, title, text, image, href }. `trust`
 * is een lijstje vertrouwen onder de tekst: [{ icon, text, href }].
 */
function AudienceChoice({ d, asH1 }: BlockProps) {
  const choices = ((d.choices as any[]) || []).filter((c) => c?.title && c?.href).slice(0, 2);
  const trust = ((d.trust as any[]) || []).filter((t) => t?.text);
  // Drie rasteritems: tekst, keuze, vertrouwen. Op een telefoon in die
  // volgorde onder elkaar (de keuze direct na de intro); vanaf lg staat de
  // keuze rechts over de volle hoogte en het vertrouwen onder de tekst.
  return (
    <section data-tone="band" className="border-b border-line bg-soft">
      <div className="container-site grid gap-x-8 gap-y-10 pb-14 pt-10 md:pb-20 md:pt-14 lg:grid-cols-12 lg:gap-y-8">
        <div className="lg:col-span-6 lg:row-start-1 lg:self-end">
          {d.eyebrow && <p className="eyebrow mb-4">{d.eyebrow}</p>}
          <PageHeading asH1={asH1} className={H1}>
            <Highlighted text={d.heading || ""} highlight={d.highlight} />
          </PageHeading>
          {d.text && <MiniMarkdown text={d.text} className={`mt-6 max-w-[520px] ${LEAD}`} />}
        </div>

        <div className="lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1 lg:self-center">
          {d.choicesLabel && <p className="mb-4 text-[15px] font-semibold text-primary">{d.choicesLabel}</p>}
          <ul className="space-y-4">
            {choices.map((c, i) => (
              <li key={i}>
                <Link href={c.href}
                  className="group flex items-stretch gap-5 rounded-2xl border border-line bg-white p-3 pr-5 transition-[border-color,box-shadow] duration-300 hover:border-primary hover:shadow-[0_16px_32px_-24px_rgba(34,32,90,0.4)] sm:p-4 sm:pr-6">
                  {c.image && (
                    <div className="relative hidden w-[132px] shrink-0 overflow-hidden rounded-xl bg-soft sm:block">
                      <SiteImage src={c.image} alt="" sizes="132px" widths={[264, 400]} className="absolute inset-0 h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col justify-center py-2 sm:py-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="eyebrow">{c.label}</span>
                      <VorigeKeuze doelgroep={c.doelgroep} />
                    </div>
                    <span className="mt-1.5 block font-heading text-[22px] font-bold leading-tight text-primary sm:text-[24px]">{c.title}</span>
                    {c.text && <span className="mt-1.5 block text-[15.5px] leading-snug">{c.text}</span>}
                  </div>
                  <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center self-center rounded-full border border-line text-primary transition-colors duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-white">
                    <Arrow />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {trust.length > 0 && (
          <ul className="space-y-2.5 text-[15.5px] text-primary lg:col-span-6 lg:row-start-2 lg:self-start">
            {trust.map((t, i) => {
              const inner = (
                <>
                  <Icon name={t.icon} className="shrink-0 text-[18px]" />
                  <span>{t.text}</span>
                </>
              );
              const cls = "inline-flex items-center gap-3";
              return (
                <li key={i}>
                  {t.href ? (
                    isExternal(t.href)
                      ? <a href={t.href} className={`${cls} underline-offset-4 hover:underline`}>{inner}</a>
                      : <Link href={t.href} className={`${cls} underline-offset-4 hover:underline`}>{inner}</Link>
                  ) : (
                    <span className={cls}>{inner}</span>
                  )}
                </li>
              );
            })}
          </ul>
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
        {d.eyebrow && <p className="eyebrow mb-4">{d.eyebrow}</p>}
        <h1 className={H1}>{d.heading}</h1>
        {d.text && <MiniMarkdown text={d.text} className={`mt-6 max-w-[720px] ${LEAD}`} />}
        <Buttons list={[d.button]} className="mt-8" />
      </HeaderBand>
    );
  }
  if (d.layout === "center") {
    return (
      <section data-tone="white" className={PAD}>
        <div className="container-site max-w-[860px] text-center">
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} text={d.text} asH1={asH1} align="center" />
          <Buttons list={[d.button]} className="mt-8 justify-center" />
        </div>
      </section>
    );
  }
  // Alleen een kop: de titel boven het blok dat volgt.
  if (!d.text && !d.button?.label) {
    return (
      <section data-tone="white" className="pb-8 pt-16 md:pt-24">
        <div className="container-site">
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} asH1={asH1} className="max-w-[820px]" />
        </div>
      </section>
    );
  }
  // Geen kop: alleen tekst, op leesbreedte.
  if (!d.heading) {
    return (
      <section data-tone="white" className={PAD}>
        <div className="container-site">
          <div className="max-w-[720px]" data-reveal>
            <MiniMarkdown text={d.text || ""} className={LEAD} />
            <Buttons list={[d.button]} className="mt-8" />
          </div>
        </div>
      </section>
    );
  }
  // Kop links, tekst rechts.
  return (
    <section data-tone="white" className={PAD}>
      <div className={`container-site ${SPLIT}`}>
        <div className={`${LINKS} ${STICKY}`} data-reveal>
          {d.eyebrow && <p className="eyebrow mb-3">{d.eyebrow}</p>}
          <PageHeading asH1={asH1} className={H2}>{d.heading}</PageHeading>
        </div>
        <div className={RECHTS} data-reveal>
          {d.text && <MiniMarkdown text={d.text} className={LEAD} />}
          <Buttons list={[d.button]} className="mt-8" />
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
            {d.imageFit === "cover" ? (
              <Foto src={d.image} alt={d.imageAlt} sizes="(min-width: 1024px) 580px, 100vw" />
            ) : (
              // De oude illustraties hebben een witte achtergrond: hele beeld, op wit met een rand.
              <div className="overflow-hidden rounded-2xl border border-line bg-white">
                <SiteImage src={d.image} alt={d.imageAlt || ""} sizes="(min-width: 1024px) 580px, 100vw" className="mx-auto w-full" />
              </div>
            )}
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
          {d.eyebrow && <p className="eyebrow mb-4">{d.eyebrow}</p>}
          <h1 className={H1}>{d.heading}</h1>
        </HeaderBand>
        <section data-tone="white" className="pb-4 pt-12 md:pt-16">
          <div className="container-site">
            <div className="max-w-[720px]">
              <MiniMarkdown text={d.body || ""} className="text-[18px]" />
              <Buttons list={[d.button]} className="mt-8" />
            </div>
          </div>
        </section>
      </>
    );
  }
  return (
    <section data-tone="white" className="py-12 md:py-16">
      <div className="container-site">
        <div className="max-w-[720px]" data-reveal>
          {d.eyebrow && <p className="eyebrow mb-3">{d.eyebrow}</p>}
          {d.heading && <PageHeading asH1={asH1} className={`${H2} mb-6`}>{d.heading}</PageHeading>}
          <MiniMarkdown text={d.body || ""} className="text-[18px]" />
          <Buttons list={[d.button]} className="mt-8" />
        </div>
      </div>
    </section>
  );
}

function ImagesBlock({ d }: BlockProps) {
  const images = ((d.images as any[]) || []).filter((im) => im?.image);
  return (
    <section data-tone="white" className="py-10 md:py-14">
      <div className="container-site max-w-[900px] space-y-6">
        {images.map((im, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-line bg-white" data-reveal>
            <SiteImage src={im.image} alt={im.alt || ""} sizes="(min-width: 900px) 900px, 100vw" className="mx-auto w-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Diensten ---------- */

const DIENST_VOLGORDE = PIJLERS.flatMap((p) => p.diensten.map((x) => x.href));

/** Een dienst als kaart: foto, stap, titel, één regel. */
function DienstKaart({
  href, image, pijler, title, text,
}: {
  href: string;
  image?: string;
  pijler?: string;
  title: string;
  text?: string;
}) {
  return (
    <Link href={href} className={`${KAART} lift group flex h-full flex-col overflow-hidden`} data-reveal>
      {image && (
        <div className="aspect-[16/10] overflow-hidden bg-soft">
          <SiteImage src={image} alt="" sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw" widths={[480, 800]}
            className="h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.03]" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        {pijler && <span className="eyebrow">{pijler}</span>}
        <h3 className="mt-1.5 text-[21px] leading-snug">{title}</h3>
        {text && <p className="mt-2 text-[16px]">{text}</p>}
        <span className="link-arrow mt-auto pt-5 text-[15px]">Lees meer <Arrow /></span>
      </div>
    </Link>
  );
}

/**
 * Het overzicht van de zes diensten, als kaarten met foto. Titel, foto en
 * stap komen uit PIJLERS (op de link), zodat de kaarten hetzelfde heten als in
 * menu en footer — ook als de blokdata nog de oude titel in hoofdletters heeft.
 */
function ServicesGrid({ d }: BlockProps) {
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
          return (
            <DienstKaart key={i} href={c.href || "#"} image={hit?.dienst.image}
              pijler={hit?.pijler.stap} title={hit?.dienst.label || zinsletters(c.title)} text={c.description} />
          );
        })}
      </div>
    </section>
  );
}

/**
 * "Waar kunnen we je mee helpen?": de diensten per stap (voorkomen,
 * begeleiden, versterken), elk met de situatie waarin hij helpt. Inhoud uit
 * PIJLERS in nav.ts; het blok zelf heeft alleen de kop.
 */
function Pillars({ d, asH1 }: BlockProps) {
  return (
    <section data-tone="white" className={PAD}>
      <div className="container-site">
        <div className={`${SPLIT} mb-12 lg:items-end`}>
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} asH1={asH1} className={LINKS} />
          {d.text && <MiniMarkdown text={d.text} className={`${RECHTS} ${LEAD}`} />}
        </div>
        <div className="grid gap-x-5 gap-y-12 lg:grid-cols-3">
          {PIJLERS.map((p, i) => (
            <div key={p.key} data-reveal style={{ "--ri": i } as React.CSSProperties}>
              <div className="flex items-center gap-4 border-b border-line pb-5">
                <IconTegel name={p.icon} />
                <p>
                  <span className="eyebrow block">Stap {i + 1} · {p.stap}</span>
                  <span className="block font-heading text-[21px] font-bold text-primary">{p.title}</span>
                </p>
              </div>
              <ul className="mt-5 space-y-3">
                {p.diensten.map((x) => (
                  <li key={x.href}>
                    <Link href={x.href} className={`${KAART} lift group flex items-center gap-4 p-3 pr-4`}>
                      <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl bg-soft">
                        <SiteImage src={x.image} alt="" sizes="76px" widths={[160]} className="absolute inset-0 h-full w-full object-cover" />
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14.5px] leading-snug">{x.situatie}</span>
                        <span className="mt-0.5 block font-semibold leading-snug text-primary">{x.label}</span>
                      </span>
                      <Arrow className="shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
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
    <section data-tone="white" className={PAD}>
      <div className={`container-site ${SPLIT}`}>
        <div className={`${LINKS} ${STICKY}`}>
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} asH1={asH1} />
          {d.intro && <MiniMarkdown text={d.intro} className="mt-5 text-[17px]" />}
        </div>
        <ol className={`${RECHTS} divide-y divide-line border-y border-line`}>
          {items.map((it, i) => (
            <li key={i} id={anchorId(it.title) || undefined} data-reveal className="flex gap-6 py-8">
              <span className="w-8 shrink-0 font-heading text-[15px] font-bold tabular-nums text-muted" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <h3 className="text-[21px] leading-snug">{it.title}</h3>
                <MiniMarkdown text={it.body || ""} className="mt-3 text-[16.5px]" />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * "Wat doet de werkgever? / Wat neemt React2u uit handen?" — twee kolommen,
 * de tweede op indigo.
 */
function TwoColumnLists({ d, asH1 }: BlockProps) {
  const cols = (d.columns as any[]) || [];
  return (
    <section data-tone="white" className={PAD}>
      <div className="container-site">
        <SectionHead eyebrow={d.eyebrow} heading={d.heading} text={d.text} asH1={asH1} className="mb-10 max-w-[760px]" />
        <div className="grid gap-5 md:grid-cols-2">
          {cols.map((c, i) => {
            const dark = i % 2 === 1;
            return (
              <div key={i} data-reveal style={{ "--ri": i } as React.CSSProperties}
                className={`rounded-2xl p-8 md:p-10 ${dark ? "on-dark bg-primary text-white/85" : "border border-line bg-soft"}`}>
                <h3 className="mb-6 text-[22px]">{c.title}</h3>
                <ul className="space-y-3.5">
                  {((c.items as string[]) || []).map((item, j) => (
                    <li key={j} className="flex gap-3 text-[17px]">
                      <LuCheck className={`mt-1 shrink-0 text-[18px] ${dark ? "text-white" : "text-primary"}`} aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <Buttons list={[d.button && { ...d.button, style: d.button.style || "indigo" }]} className="mt-10" />
      </div>
    </section>
  );
}

/** Waarden als drie kaarten. Met een kop: kop erboven. */
function ValueCards({ d, asH1 }: BlockProps) {
  const cards = (d.cards as any[]) || [];
  return (
    <section data-tone="white" className={PAD}>
      <div className="container-site">
        {d.heading && (
          <div className={`${SPLIT} mb-12 lg:items-end`}>
            <SectionHead eyebrow={d.eyebrow} heading={d.heading} asH1={asH1} className={LINKS} />
            {d.text && <MiniMarkdown text={d.text} className={`${RECHTS} ${LEAD}`} />}
          </div>
        )}
        <div className="grid gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <div key={i} className={`${KAART} p-7 md:p-8`} data-reveal style={{ "--ri": i } as React.CSSProperties}>
              <IconTegel name={c.icon} />
              <h3 className="mt-6 text-[22px]">{c.title}</h3>
              <MiniMarkdown text={c.text || ""} className="mt-2.5 text-[16.5px]" />
            </div>
          ))}
        </div>
        <Buttons list={[d.button]} className="mt-10" />
      </div>
    </section>
  );
}

/* ---------- Oproep, contact en vragen ---------- */

/**
 * Afsluitende oproep op indigo: tekst links, rechts de knoppen, of met
 * `routes` (lijst van { icon, label, sub, href }) de manieren om contact op te
 * nemen, zodat iedereen zijn eigen weg kiest.
 */
function CtaBanner({ d, asH1 }: BlockProps) {
  const buttons = (d.buttons as Btn[]) || [];
  const routes = ((d.routes as any[]) || []).filter((r) => r?.label && r?.href);
  return (
    <section data-tone="white" className="py-12 md:py-16">
      <div className="container-site">
        {/* grid-cols-1 (= minmax(0, 1fr)): zonder die ondergrens kan lange
            tekst in de routes de kolom breder duwen dan het scherm. */}
        <div className="on-dark grid grid-cols-1 items-center gap-10 rounded-2xl bg-primary px-6 py-12 text-white/80 sm:px-12 md:py-14 lg:grid-cols-12 lg:px-14" data-reveal>
          <div className={routes.length ? "lg:col-span-6" : "lg:col-span-7"}>
            {d.eyebrow && <p className="eyebrow mb-3">{d.eyebrow}</p>}
            {d.heading && <PageHeading asH1={asH1} className={H2}>{d.heading}</PageHeading>}
            {d.text && <MiniMarkdown text={d.text} className="mt-4 max-w-[560px] text-[17.5px]" />}
            {routes.length > 0 && <Buttons list={buttons} className="mt-8" />}
          </div>
          {routes.length > 0 ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-6 lg:grid-cols-1">
              {routes.map((r, i) => {
                const inner = (
                  <>
                    <IconTegel name={r.icon} donker />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-white">{r.label}</span>
                      {r.sub && <span className="block text-[15px] leading-snug text-white/70">{r.sub}</span>}
                    </span>
                    <Arrow className="shrink-0 text-white/70 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                );
                const cls = "group flex items-center gap-4 rounded-xl border border-white/15 px-4 py-3.5 transition-colors hover:border-white/45 hover:bg-white/[0.06]";
                return (
                  <li key={i}>
                    {isExternal(r.href) ? <a href={r.href} className={cls}>{inner}</a> : <Link href={r.href} className={cls}>{inner}</Link>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="lg:col-span-5">
              <Buttons list={buttons} className="lg:justify-end" />
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
      <p className="eyebrow mb-3">Vragen en antwoorden</p>
      <PageHeading asH1={asH1} className={H2}>{heading || "Veelgestelde vragen"}</PageHeading>
      <p className="mt-4 max-w-[400px] text-[17px]">Staat je vraag er niet bij? We helpen je graag persoonlijk verder.</p>
      <Link href="/contact" className="link-arrow mt-5">Stel je vraag <Arrow /></Link>
    </div>
  );
}

function FaqBlock({ d, asH1 }: BlockProps) {
  return (
    <section id="veelgestelde-vragen" data-tone="white" className={PAD}>
      <div className={`container-site ${SPLIT}`}>
        <FaqSide heading={d.heading} asH1={asH1} />
        <div className={RECHTS} data-reveal>
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
        <div className={`${KAART} p-7 md:p-10`} data-reveal>
          {d.heading && <PageHeading asH1={asH1} className={H2}>{d.heading}</PageHeading>}
          {d.text && <MiniMarkdown text={d.text} className="mb-8 mt-4 text-[17px]" />}
          <ContactForm />
        </div>
        <div data-reveal>
          <p className="eyebrow mb-5">Veelgestelde vragen</p>
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
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {rows.map((r, i) => {
              const inner = (
                <>
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-soft text-[20px] text-primary" aria-hidden>{r.icon}</span>
                  <span>
                    <span className="block text-[14px]">{r.label}</span>
                    <span className="block whitespace-pre-line font-semibold text-primary">{r.value}</span>
                  </span>
                </>
              );
              const cls = "flex items-center gap-4 py-4";
              return (
                <li key={i}>
                  {r.href ? <a href={r.href} className={`${cls} hover:text-accent`}>{inner}</a> : <div className={cls}>{inner}</div>}
                </li>
              );
            })}
          </ul>
        </div>
        <div className={`${RECHTS} ${KAART} p-7 md:p-10`} data-reveal>
          <h3 className="mb-6 text-[24px]">{d.formHeading || "Stuur ons een bericht"}</h3>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}

/** Klantlogo's: één rustige rij, in grijs tot je erover gaat. */
function LogoCarouselBlock({ d }: BlockProps) {
  const logos = ((d.logos as any[]) || []).filter((l) => l?.image);
  return (
    // Eigen toon: tussen twee lijnen houdt deze rij altijd zijn eigen ruimte.
    <section data-tone="logos" className="border-y border-line py-12 md:py-14">
      <div className="container-site flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-16" data-reveal>
        {d.eyebrow && <p className="eyebrow shrink-0 lg:w-[220px]">{d.eyebrow}</p>}
        <ul className="flex flex-1 flex-wrap items-center gap-x-12 gap-y-8 lg:justify-between">
          {logos.map((l, i) => (
            <li key={`${l.image}-${i}`}>
              <SiteImage src={l.image} alt={l.alt || ""} sizes="160px" widths={[160, 320]}
                className="h-11 w-auto max-w-[140px] object-contain opacity-70 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Het REACT-model: de werkwijze van React2u. Links de vijf letters met wat ze
 * betekenen, rechts het wiel. `steps` is een lijst van { title, text }; de
 * letter is de eerste letter van de titel.
 */
function Method({ d, asH1 }: BlockProps) {
  const steps = ((d.steps as any[]) || []).filter((st) => st?.title);
  return (
    <section data-tone="soft" className={`bg-soft ${PAD}`}>
      <div className={`container-site ${SPLIT} items-center gap-y-12`}>
        <div className="lg:col-span-6">
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} text={d.text} asH1={asH1} />
          {steps.length > 0 && (
            <ol className="mt-8 divide-y divide-line border-y border-line">
              {steps.map((st, i) => (
                <li key={i} className="flex gap-5 py-4" data-reveal style={{ "--ri": i } as React.CSSProperties}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary font-heading text-[17px] font-bold text-white" aria-hidden>
                    {String(st.title).charAt(0)}
                  </span>
                  <div>
                    <h3 className="text-[18px]">{st.title}</h3>
                    {st.text && <p className="mt-0.5 text-[16px]">{st.text}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
          <Buttons list={[d.button && { ...d.button, style: d.button.style || "outline" }]} className="mt-8" />
        </div>
        <div className="lg:col-span-5 lg:col-start-8" data-reveal>
          {d.image && (
            // Het wiel heeft zelf een lichtgrijze achtergrond; die wordt het vlak.
            <div className="overflow-hidden rounded-2xl">
              <SiteImage src={d.image} alt={d.imageAlt || ""} sizes="(min-width: 1024px) 460px, 90vw" className="w-full" />
            </div>
          )}
          {d.quote && (
            <blockquote className="mt-6 border-l-2 border-accent pl-5 font-heading text-[19px] font-semibold leading-snug text-primary">
              “{d.quote}”
            </blockquote>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Stappen onder elkaar: zoals het visuele verzuimprotocol van React2u
 * (R-E-A-C-T-2U). `steps` is een lijst van { badge, title, text }; `badge` is
 * wat in het vakje staat (een letter, "2U", of een nummer). Met `anchor` kun je
 * ernaar linken.
 */
function Steps({ d, asH1 }: BlockProps) {
  const steps = ((d.steps as any[]) || []).filter((st) => st?.title);
  return (
    <section id={d.anchor || undefined} data-tone="white" className={PAD}>
      <div className={`container-site ${SPLIT}`}>
        <div className={`${LINKS} ${STICKY}`}>
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} text={d.text} asH1={asH1} />
          <Buttons list={[d.button]} className="mt-8" />
        </div>
        <ol className={`${RECHTS} divide-y divide-line border-y border-line`}>
          {steps.map((st, i) => (
            <li key={i} data-reveal className="flex gap-6 py-7">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary font-heading text-[16px] font-bold text-white" aria-hidden>
                {st.badge || i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="text-[20px] leading-snug">
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

/**
 * "Voor iedereen gezond, menselijk en duidelijk": de drie waarden, elk met
 * een feit dat het onderbouwt. `cards` is een lijst van { title, text, value,
 * valueLabel }.
 */
function Values({ d, asH1 }: BlockProps) {
  const cards = (d.cards as any[]) || [];
  return (
    <section data-tone="white" className={PAD}>
      <div className="container-site">
        <div className={`${SPLIT} mb-12 lg:items-end`}>
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} highlight={d.highlight} asH1={asH1} className={LINKS} />
          {d.text && <MiniMarkdown text={d.text} className={`${RECHTS} ${LEAD}`} />}
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <div key={i} className={`${KAART} flex flex-col p-7 md:p-8`} data-reveal style={{ "--ri": i } as React.CSSProperties}>
              <h3 className="text-[24px]">{c.title}</h3>
              {c.text && <p className="mt-3 text-[16.5px]">{c.text}</p>}
              {c.value && (
                <p className="mt-auto flex items-baseline gap-3 border-t border-line pt-5">
                  <span className="shrink-0 font-heading text-[1.9rem] font-bold leading-none tracking-[-0.02em] text-primary">{c.value}</span>
                  {c.valueLabel && <span className="text-[15px] font-medium text-primary">{c.valueLabel}</span>}
                </p>
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
 * De nieuwste artikelen. Zonder gepubliceerde artikelen verdwijnt het blok
 * helemaal — een lege sectie oogt slechter dan geen sectie.
 */
function LatestPosts({ d, asH1, ctx }: BlockProps) {
  const count = Math.max(1, Math.min(6, Number(d.count) || 3));
  // In de blokeditor is er geen ctx: toon daar lege voorbeeldkaarten.
  const preview = !ctx;
  const posts = (ctx?.posts || []).slice(0, count);
  if (!preview && posts.length === 0) return null;
  const cards = preview
    ? Array.from({ length: count }, (_, i) => ({ id: String(i), slug: "", title: "Titel van een artikel", published_at: null, cover_image: null }))
    : posts;
  return (
    <section data-tone="white" className={PAD}>
      <div className="container-site">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} text={d.text} asH1={asH1} className="max-w-[640px]" />
          {d.button?.label && <div className="shrink-0"><BtnLink b={{ ...d.button, style: "outline" }} /></div>}
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((p) => (
            <article key={p.id} className={`${KAART} lift group relative flex flex-col overflow-hidden`} data-reveal>
              <div className="aspect-[16/10] overflow-hidden bg-soft">
                {p.cover_image && (
                  <SiteImage src={p.cover_image} alt="" sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw"
                    widths={[480, 800]} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex flex-1 flex-col p-6">
                {p.published_at && <p className="mb-2 text-[14px] text-muted">{fmtDatum(p.published_at)}</p>}
                <h3 className="mb-4 text-[20px] leading-snug">
                  {/* De hele kaart is klikbaar via de ::after van deze link. */}
                  <Link href={p.slug ? `/blog/${p.slug}` : "#"} className="after:absolute after:inset-0">{p.title}</Link>
                </h3>
                <span className="link-arrow mt-auto text-[15px]">Lees verder <Arrow /></span>
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
