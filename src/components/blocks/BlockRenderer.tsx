import Link from "next/link";
import { ViewTransition } from "react";
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
import FotoTegel from "@/components/site/FotoTegel";
import { PIJLERS, CONTACT_FOTO, dienstVoor } from "@/lib/nav";
import { LuBadgeCheck, LuCheck, LuMail, LuMapPin, LuPhone } from "react-icons/lu";

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * De blokken van de site, in de taal van het startscherm (het splitscreen
 * werkgever | werknemer):
 * - mensen op grote foto's; waar een foto een sectie draagt, loopt hij van
 *   rand tot rand, naast een tekstkolom op zand of wit ("half scherm");
 * - tekst op een foto alleen met het donkere verloop erachter;
 * - zand en wit wisselen elkaar af, indigo voor tekst en het slot;
 * - roze alleen voor de hoofdactie (de knop, de pijl onder de muis);
 * - geen kaartjes met dunne randen: vlakken, foto's en ruimte.
 */

type Btn = { label: string; href: string; style?: "accent" | "indigo" | "outline" };
type Crumb = { label: string; href: string };

/**
 * Gegevens die een blok niet in zijn eigen `data` heeft, maar die de pagina
 * aanlevert: de nieuwste artikelen en het kruimelpad. Leeg in het live
 * voorbeeld van de blokeditor: die draait in de browser en haalt niets op.
 */
export type BlockCtx = {
  posts?: Post[];
  crumbs?: Crumb[];
  /** Knoppen voor een paginakop die er zelf geen heeft (de dienstpagina's). */
  knoppen?: Btn[];
};

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

/**
 * Een tekstkolom naast een foto van rand tot rand: de buitenkant lijnt uit met
 * de inhoud van de rest van de pagina (container-site: 1240px, 2rem rand).
 */
const RAND_L = "lg:pl-[max(2rem,calc(50vw-620px+2rem))]";
const RAND_R = "lg:pr-[max(2rem,calc(50vw-620px+2rem))]";

/** Typografie: één h1-maat, één h2-maat. */
const H1 = "text-[2.25rem] font-bold leading-[1.08] tracking-[-0.025em] sm:text-[2.9rem] lg:text-[3.5rem]";
const H2 = "text-[1.85rem] font-bold leading-[1.12] tracking-[-0.02em] sm:text-[2.2rem] lg:text-[2.5rem]";
const LEAD = "text-[18px] leading-relaxed md:text-[19px]";
/** h1 op een half scherm: dezelfde maat als "Ik ben werkgever" op het startscherm. */
const H1_HALF = "text-[2.25rem] font-bold leading-[1.06] tracking-[-0.025em] sm:text-[2.8rem] lg:text-[3.1rem]";

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
    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-[21px] ${
      donker ? "bg-white/10 text-white" : "bg-soft text-primary"
    }`}>
      <Icon name={name} />
    </span>
  );
}

/**
 * Foto die een half scherm (of een hele helft van het startscherm) vult. Met
 * `vt` krijgt hij een naam voor een ViewTransition: staat op de volgende
 * pagina een foto met dezelfde naam, dan vloeit de een in de ander over in
 * plaats van te knipperen. Zo blijft de foto waarop je klikte in beeld.
 */
function VolFoto({
  src, alt = "", focus, sizes, priority, vt, className = "",
}: {
  src: string;
  alt?: string;
  focus?: string;
  sizes: string;
  priority?: boolean;
  vt?: string;
  className?: string;
}) {
  const img = (
    <SiteImage src={src} alt={alt} sizes={sizes} priority={priority} widths={[640, 960, 1280, 1600]}
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
      style={focus ? { objectPosition: focus } : undefined} />
  );
  return vt ? <ViewTransition name={vt} share="morph" default="none">{img}</ViewTransition> : img;
}

/**
 * Paginakop voor een pagina die niet met een hero begint (bv. /diensten of de
 * privacyverklaring): kruimelpad en h1 op het neutrale vlak.
 */
function HeaderBand({ ctx, children }: { ctx?: BlockCtx; children: React.ReactNode }) {
  return (
    <section data-tone="band" className="bg-soft">
      <div className="container-site pb-14 pt-8 md:pb-20 md:pt-10">
        {ctx?.crumbs && <Breadcrumbs crumbs={ctx.crumbs} className="mb-8 text-primary" />}
        <div className="max-w-[860px]">{children}</div>
      </div>
    </section>
  );
}

/* ---------- Hero's ---------- */

/**
 * De paginakop met foto, als een helft van het startscherm: tekst op zand, de
 * foto van rand tot rand ernaast en even hoog. Gebruikt door `heroStatement`
 * (de startpagina's per doelgroep) en `hero` (de pagina's uit het CMS).
 *
 * `imagePosition: "left"` zet de foto links. Op /werkgevers staat hij links
 * omdat de werkgever op het startscherm links staat; met `doelgroep` vloeit de
 * foto van die helft bij het doorklikken over in deze (zie VolFoto). `focus`
 * is de object-position. Zonder foto wordt het een gewone kopband.
 */
function HeroSplit({ d, asH1, ctx }: BlockProps) {
  const tekst = (
    <>
      {ctx?.crumbs && <Breadcrumbs crumbs={ctx.crumbs} className="mb-8 text-primary" />}
      {d.eyebrow && <p className="eyebrow mb-4">{d.eyebrow}</p>}
      <PageHeading asH1={asH1} className={`${d.image ? H1_HALF : H1} whitespace-pre-line max-sm:hyphens-auto`}>
        <Highlighted text={d.heading || ""} highlight={d.highlight} />
      </PageHeading>
      {d.text && <MiniMarkdown text={d.text} className={`mt-6 max-w-[580px] ${LEAD}`} />}
      <Buttons list={[d.button, d.button2].some((b) => b?.label) ? [d.button, d.button2] : ctx?.knoppen || []} className="mt-8" />
      {d.badge && (
        <p className="mt-7 flex items-center gap-2.5 text-[15px] font-medium text-primary">
          <LuBadgeCheck className="shrink-0 text-[19px]" aria-hidden />
          {d.badge}
        </p>
      )}
    </>
  );
  if (!d.image) {
    return (
      <section data-tone="band" className="bg-soft">
        <div className="container-site pb-14 pt-8 md:pb-20 md:pt-10">
          <div className="max-w-[860px]">{tekst}</div>
        </div>
      </section>
    );
  }
  const fotoLinks = d.imagePosition === "left";
  return (
    // Hoogte: het scherm min de kopbalk, met ruimte om te zien dat er meer komt.
    <section data-tone="bleed" className="bg-soft lg:grid lg:min-h-[clamp(480px,calc(100svh-var(--hh)-8rem),660px)] lg:grid-cols-2">
      {/* Zand als ondergrond: zo zie je tijdens het overvloeien (en zolang de foto laadt) geen donkere rand. */}
      <div className={`relative aspect-[4/3] overflow-hidden bg-soft sm:aspect-[16/9] lg:aspect-auto ${fotoLinks ? "" : "lg:order-last"}`}>
        <VolFoto src={d.image} alt={d.imageAlt} focus={d.focus} priority sizes="(min-width: 1024px) 50vw, 100vw"
          vt={d.doelgroep ? `foto-${d.doelgroep}` : undefined} />
      </div>
      <div className={`flex flex-col justify-center px-5 pb-14 pt-8 sm:px-8 md:pb-16 lg:py-16 ${
        fotoLinks ? `lg:pl-14 xl:pl-20 ${RAND_R}` : `lg:pr-14 xl:pr-20 ${RAND_L}`
      }`}>
        <div className="max-w-[600px]">{tekst}</div>
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
 * Het startscherm: een splitscreen. Werkgever en werknemer zoeken iets heel
 * anders, dus het scherm is in tweeën gedeeld — elk een paginavullende foto met
 * de keuze erop. Daarboven alleen een smalle kopregel met de h1.
 *
 * `choices` (twee) met { doelgroep, title, text, button, image, focus, href };
 * `focus` is de object-position van de foto (bv. "30% 25%"). De foto is sfeer
 * (alt=""); de link heet naar zijn tekst. `text` valt op de telefoon weg. `trust` is één regel vertrouwen eronder: [{ icon, text, href }].
 */
function AudienceChoice({ d, asH1 }: BlockProps) {
  const choices = ((d.choices as any[]) || []).filter((c) => c?.title && c?.href).slice(0, 2);
  const trust = ((d.trust as any[]) || []).filter((t) => t?.text);
  return (
    <section data-tone="band" className="bg-soft">
      <div className="container-site flex flex-col gap-3 pb-7 pt-7 md:flex-row md:items-end md:justify-between md:gap-12 md:pb-8 md:pt-9">
        <div>
          {d.eyebrow && <p className="eyebrow mb-2">{d.eyebrow}</p>}
          <PageHeading asH1={asH1} className="text-[1.9rem] font-bold leading-[1.1] tracking-[-0.022em] sm:text-[2.3rem] lg:text-[2.6rem]">
            <Highlighted text={d.heading || ""} highlight={d.highlight} />
          </PageHeading>
        </div>
        {d.text && <MiniMarkdown text={d.text} className="max-w-[440px] text-[16.5px] leading-relaxed md:pb-1 lg:text-[17px]" />}
      </div>

      {/* De twee helften, van rand tot rand en ook op de telefoon naast elkaar: zo
          ziet iedereen beide keuzes meteen. De hoogte vult het scherm tot de vouw
          (min de kopregel), met een onder- en bovengrens. De smalle naad
          ertussen is de zandkleur van de sectie. */}
      <div className="split flex h-[clamp(300px,calc(100svh-372px),560px)] gap-1 md:h-[clamp(440px,calc(100svh-280px),720px)]">
        {choices.map((c, i) => (
          <Link key={i} href={c.href}
            className="split-half group relative isolate flex flex-1 basis-0 flex-col justify-end overflow-hidden bg-primary-deep text-white">
            {c.image && (
              // Dezelfde naam als de foto in de paginakop van /werkgevers of
              // /werknemers: bij doorklikken schuift deze foto daarin over.
              <VolFoto src={c.image} focus={c.focus} priority sizes="(min-width: 768px) 60vw, 50vw"
                vt={c.doelgroep ? `foto-${c.doelgroep}` : undefined}
                className="-z-20 transition-transform duration-[1200ms] ease-[var(--ease-out-soft)] group-hover:scale-[1.04]" />
            )}
            {/* Dimt de andere helft zodra je er één aanwijst (zie .split in globals.css). */}
            <div aria-hidden className="split-dim absolute inset-0 -z-10 bg-primary-deep/25 opacity-0 transition-opacity duration-500" />

            <div className="absolute left-3 top-3 sm:left-5 sm:top-5 md:left-10 md:top-8">
              <VorigeKeuze doelgroep={c.doelgroep} />
            </div>

            {/* Op brede schermen lijnt de linkertekst uit met de inhoud van de pagina (container-site, 1240px). */}
            <div className={`relative p-4 sm:p-8 md:p-10 xl:px-14 xl:pb-12 ${i === 0 ? "xl:pl-[max(3.5rem,calc(50vw-620px+2rem))]" : ""}`}>
              {/* Donker verloop alleen achter de tekst, zodat de foto zelf warm en helder blijft.
                  Grote kop: 3:1 is genoeg, dus bovenin mag het licht zijn; achter de
                  kleinere regel eronder is het zo donker dat wit er ook op een witte
                  foto ruim 4,5:1 haalt. */}
              <div aria-hidden className="absolute inset-x-0 -top-16 bottom-0 -z-10 bg-[linear-gradient(to_top,rgb(34_32_90/0.9),rgb(34_32_90/0.78)_40%,rgb(34_32_90/0.5)_72%,rgb(34_32_90/0))]" />
              <h2 className="text-[1.6rem] font-bold leading-[1.05] tracking-[-0.025em] !text-white sm:text-[2.2rem] lg:text-[2.6rem] xl:text-[3.1rem]">
                {c.title}
              </h2>
              {c.text && <p className="mt-3 hidden max-w-[420px] text-[16.5px] leading-snug text-white sm:block md:text-[18px]">{c.text}</p>}
              {/* Op de telefoon alleen een ronde pijl; de knoptekst blijft voor schermlezers. */}
              <span className="mt-4 inline-grid h-11 w-11 place-items-center rounded-full bg-white text-primary transition-colors duration-300 group-hover:bg-accent group-hover:text-white group-focus-visible:bg-accent group-focus-visible:text-white sm:mt-6 sm:inline-flex sm:h-auto sm:w-auto sm:items-center sm:gap-2 sm:rounded-lg sm:px-5 sm:py-3 sm:text-[15.5px] sm:font-semibold">
                <span className="sr-only sm:not-sr-only">{c.button || "Verder"}</span>
                <Arrow className="transition-transform duration-300 group-hover:translate-x-1 group-focus-visible:translate-x-1" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {trust.length > 0 && (
        <ul className="container-site flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-5 text-[15px] text-primary">
          {trust.map((t, i) => {
            const inner = (
              <>
                <Icon name={t.icon} className="shrink-0 text-[17px]" />
                <span>{t.text}</span>
              </>
            );
            const cls = "inline-flex items-center gap-2.5";
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

/**
 * Tekst naast een foto. Een echte foto (`imageFit: "cover"`) loopt van rand
 * tot rand en is even hoog als de tekst, zoals een helft van het startscherm;
 * `imagePosition: "left"` zet hem links. Een illustratie met witte achtergrond
 * (zoals het REACT-wiel) blijft heel, binnen de kolom.
 */
function ImageText({ d, asH1 }: BlockProps) {
  const imgLeft = d.imagePosition === "left";
  if (d.image && d.imageFit === "cover") {
    return (
      <section data-tone="bleed" className="bg-white lg:grid lg:min-h-[600px] lg:grid-cols-2">
        <div className={`relative aspect-[4/3] overflow-hidden bg-soft sm:aspect-[16/9] lg:aspect-auto ${imgLeft ? "" : "lg:order-last"}`}>
          <VolFoto src={d.image} alt={d.imageAlt} focus={d.focus} sizes="(min-width: 1024px) 50vw, 100vw" className="diepte" />
        </div>
        <div className={`flex flex-col justify-center px-5 py-14 sm:px-8 md:py-20 lg:py-24 ${
          imgLeft ? `lg:pl-14 xl:pl-20 ${RAND_R}` : `lg:pr-14 xl:pr-20 ${RAND_L}`
        }`}>
          <div className="max-w-[560px]">
            <SectionHead eyebrow={d.eyebrow} heading={d.heading} text={d.text} asH1={asH1} />
            <Buttons list={[d.button]} className="mt-8" />
          </div>
        </div>
      </section>
    );
  }
  return (
    <section data-tone="white" className={PAD}>
      <div className={`container-site ${SPLIT} items-center`}>
        <div className={imgLeft ? "lg:col-span-5 lg:col-start-8 lg:row-start-1" : LINKS}>
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} text={d.text} asH1={asH1} />
          <Buttons list={[d.button]} className="mt-8" />
        </div>
        {d.image && (
          <div className={imgLeft ? "lg:col-span-6 lg:col-start-1 lg:row-start-1" : RECHTS} data-reveal>
            {/* De oude illustraties hebben een witte achtergrond: hele beeld, niet bijgesneden. */}
            <div className="overflow-hidden rounded-2xl bg-white">
              <SiteImage src={d.image} alt={d.imageAlt || ""} sizes="(min-width: 1024px) 580px, 100vw" className="mx-auto w-full" />
            </div>
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

/**
 * Het overzicht van de zes diensten, als fototegels. Titel, foto en situatie
 * komen uit PIJLERS (op de link), zodat de tegels hetzelfde heten als in menu
 * en footer — ook als de blokdata nog de oude titel in hoofdletters heeft.
 */
function ServicesGrid({ d }: BlockProps) {
  const plek = (c: any) => {
    const i = DIENST_VOLGORDE.indexOf(c.href);
    return i < 0 ? Infinity : i;
  };
  const cards = [...((d.cards as any[]) || [])].sort((a, b) => plek(a) - plek(b));
  return (
    <section data-tone="white" className={PAD}>
      <ul className="container-site grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => {
          const hit = c.href ? dienstVoor(c.href) : null;
          return (
            <li key={i} data-reveal style={{ "--ri": i % 3 } as React.CSSProperties}>
              <FotoTegel href={c.href || "#"} image={hit?.dienst.image} kicker={hit?.dienst.situatie || c.description}
                title={hit?.dienst.label || zinsletters(c.title)} sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * "Waar kunnen we je mee helpen?": de diensten per stap (voorkomen,
 * begeleiden, versterken), elk als fototegel met de situatie waarin hij helpt.
 * Inhoud uit PIJLERS in nav.ts; het blok zelf heeft alleen de kop.
 *
 * De kolommen delen hun rijen (subgrid), zodat de tegels van de drie stappen op
 * één lijn beginnen, ook als de ene stap een langere uitleg heeft.
 */
function Pillars({ d, asH1 }: BlockProps) {
  return (
    <section data-tone="white" className={PAD}>
      <div className="container-site">
        <div className={`${SPLIT} mb-12 lg:items-end`}>
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} asH1={asH1} className={LINKS} />
          {d.text && <MiniMarkdown text={d.text} className={`${RECHTS} ${LEAD}`} />}
        </div>
        <div className="grid gap-y-14 lg:grid-cols-3 lg:grid-rows-[auto_auto] lg:gap-x-6 lg:gap-y-7">
          {PIJLERS.map((p, i) => (
            <div key={p.key} className="grid gap-y-6 lg:row-span-2 lg:grid-rows-subgrid" data-reveal style={{ "--ri": i } as React.CSSProperties}>
              <div>
                <p className="eyebrow">Stap {i + 1} · {p.stap}</p>
                <h3 className="mt-2 text-[26px] leading-tight">{p.title}</h3>
                <p className="mt-2.5 max-w-[440px] text-[16.5px]">{p.text}</p>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {p.diensten.map((x) => (
                  <li key={x.href}>
                    <FotoTegel href={x.href} image={x.image} kicker={x.situatie} title={x.label} kop="h4"
                      ratio="aspect-[16/10]" sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" />
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
                className={`rounded-2xl p-8 md:p-10 ${dark ? "on-dark bg-primary text-white/85" : "bg-soft"}`}>
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

/** Waarden als drie witte vlakken op zand. Met een kop: kop erboven. */
function ValueCards({ d, asH1 }: BlockProps) {
  const cards = (d.cards as any[]) || [];
  return (
    <section data-tone="soft" className={`bg-soft ${PAD}`}>
      <div className="container-site">
        {d.heading && (
          <div className={`${SPLIT} mb-12 lg:items-end`}>
            <SectionHead eyebrow={d.eyebrow} heading={d.heading} asH1={asH1} className={LINKS} />
            {d.text && <MiniMarkdown text={d.text} className={`${RECHTS} ${LEAD}`} />}
          </div>
        )}
        <div className="grid gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <div key={i} className="rounded-2xl bg-white p-7 md:p-9" data-reveal style={{ "--ri": i } as React.CSSProperties}>
              <IconTegel name={c.icon} />
              <h3 className="mt-6 text-[24px]">{c.title}</h3>
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
 * De afsluitende oproep, als half scherm: links een foto van iemand aan de
 * telefoon (`image`, anders CONTACT_FOTO), rechts op zand de tekst en de
 * manieren om contact op te nemen. `routes` is een lijst van
 * { icon, label, sub, href }: het label klein, `sub` (het nummer, het adres)
 * groot — dat is waar je naar zoekt. Zonder routes staan er alleen knoppen.
 */
function CtaBanner({ d, asH1 }: BlockProps) {
  const buttons = (d.buttons as Btn[]) || [];
  const routes = ((d.routes as any[]) || []).filter((r) => r?.label && r?.href);
  return (
    <section data-tone="bleed" className="bg-soft lg:grid lg:min-h-[540px] lg:grid-cols-2">
      <div className="relative aspect-[16/10] overflow-hidden bg-soft sm:aspect-[2/1] lg:aspect-auto">
        <VolFoto src={d.image || CONTACT_FOTO} alt={d.imageAlt} focus={d.focus || "center 30%"} sizes="(min-width: 1024px) 50vw, 100vw" className="diepte" />
      </div>
      <div className={`flex flex-col justify-center px-5 py-14 sm:px-8 md:py-20 lg:pl-14 xl:pl-20 ${RAND_R}`}>
        <div className="max-w-[540px]" data-reveal>
          {d.eyebrow && <p className="eyebrow mb-3">{d.eyebrow}</p>}
          {d.heading && <PageHeading asH1={asH1} className={H2}>{d.heading}</PageHeading>}
          {d.text && <MiniMarkdown text={d.text} className="mt-4 text-[17.5px]" />}
          {routes.length > 0 && (
            <ul className="mt-8 divide-y divide-line border-y border-line">
              {routes.map((r, i) => {
                const inner = (
                  <>
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-[20px] text-primary transition-colors duration-300 group-hover:bg-accent group-hover:text-white" aria-hidden>
                      <Icon name={r.icon} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] leading-snug">{r.label}</span>
                      {r.sub && <span className="block break-words font-heading text-[20px] font-bold leading-snug text-primary sm:text-[22px]">{r.sub}</span>}
                    </span>
                    <Arrow className="shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                );
                const cls = "group flex items-center gap-4 py-4";
                return (
                  <li key={i}>
                    {isExternal(r.href) ? <a href={r.href} className={cls}>{inner}</a> : <Link href={r.href} className={cls}>{inner}</Link>}
                  </li>
                );
              })}
            </ul>
          )}
          <Buttons list={buttons} className="mt-8" />
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
        <div className="rounded-2xl bg-white p-7 md:p-10" data-reveal>
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
    <section data-tone="soft" className={`bg-soft ${PAD}`}>
      <div className={`container-site ${SPLIT}`}>
        <div className={LINKS}>
          <SectionHead heading={d.heading} text={d.text} asH1={asH1} />
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {rows.map((r, i) => {
              const inner = (
                <>
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-[20px] text-primary" aria-hidden>{r.icon}</span>
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
        <div className={`${RECHTS} rounded-2xl bg-white p-7 md:p-10`} data-reveal>
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
    // Eigen toon: deze rij houdt altijd zijn eigen ruimte, ook tussen twee witte secties.
    <section data-tone="logos" className="py-14 md:py-16">
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
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary font-heading text-[17px] font-bold text-white" aria-hidden>
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
            // Het REACT-wiel staat op een grijs vierkant, en grijs vloekt met het
            // zand. Met `imageRond` knippen we het rond uit, iets ingezoomd (het
            // wiel beslaat 92% van het beeld), zodat alleen het wiel overblijft.
            d.imageRond ? (
              <div className="mx-auto aspect-square max-w-[460px] overflow-hidden rounded-full">
                <SiteImage src={d.image} alt={d.imageAlt || ""} sizes="(min-width: 1024px) 460px, 90vw" className="h-full w-full scale-[1.1] object-cover" />
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl">
                <SiteImage src={d.image} alt={d.imageAlt || ""} sizes="(min-width: 1024px) 460px, 90vw" className="w-full" />
              </div>
            )
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
        {/* Een tijdlijn: ronde stappen, verbonden door een lijn. */}
        <ol className={RECHTS}>
          {steps.map((st, i) => (
            <li key={i} data-reveal className="relative flex gap-6 pb-11 last:pb-0">
              {i < steps.length - 1 && <span aria-hidden className="absolute bottom-0 left-[23px] top-[52px] w-0.5 rounded-full bg-line" />}
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary font-heading text-[16px] font-bold text-white" aria-hidden>
                {st.badge || i + 1}
              </span>
              <div className="min-w-0 pt-2.5">
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
    <section data-tone="soft" className={`bg-soft ${PAD}`}>
      <div className="container-site">
        <div className={`${SPLIT} mb-14 lg:items-end`}>
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} highlight={d.highlight} asH1={asH1} className={LINKS} />
          {d.text && <MiniMarkdown text={d.text} className={`${RECHTS} ${LEAD}`} />}
        </div>
        {/* De drie woorden groot, als de titels op het startscherm; het feit eronder als een label. */}
        <div className="grid gap-y-12 md:grid-cols-3 md:divide-x md:divide-line">
          {cards.map((c, i) => (
            <div key={i} className="flex flex-col md:px-8 md:first:pl-0 md:last:pr-0 lg:px-10" data-reveal style={{ "--ri": i } as React.CSSProperties}>
              <h3 className="text-[2.1rem] leading-none tracking-[-0.025em] lg:text-[2.5rem]">{c.title}</h3>
              {c.text && <p className="mt-4 text-[16.5px]">{c.text}</p>}
              {c.value && (
                <p className="mt-auto pt-7">
                  <span className="inline-flex items-baseline gap-2 rounded-full bg-white px-4 py-2">
                    <span className="font-heading text-[18px] font-bold text-primary">{c.value}</span>
                    {c.valueLabel && <span className="text-[14.5px] font-medium text-primary">{c.valueLabel}</span>}
                  </span>
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
            <article key={p.id} className="group relative flex flex-col" data-reveal>
              <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-soft">
                {p.cover_image && (
                  <SiteImage src={p.cover_image} alt="" sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw"
                    widths={[480, 800]} className="h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]" />
                )}
              </div>
              <div className="flex flex-1 flex-col pt-5">
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
