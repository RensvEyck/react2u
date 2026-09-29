import Link from "next/link";
import type { Block, Post } from "@/lib/types";
import { MiniMarkdown } from "@/lib/md";
import Icon from "@/components/site/Icon";
import Accordion, { type FaqItem } from "@/components/site/Accordion";
import TypingHeadline from "@/components/site/TypingHeadline";
import ContactForm from "@/components/site/ContactForm";
import { jsonLd } from "@/lib/jsonld";
import SiteImage from "@/components/site/SiteImage";
import DotCloud, { Arrow } from "@/components/site/DotCloud";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import Pills from "@/components/site/Pills";
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

/** Standaard verticale ruimte van een sectie. */
const PAD = "py-20 md:py-28";

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
 * telefoontje — zo zie je vooraf wat een klik doet.
 */
function BtnLink({ b, arrow = true }: { b?: Btn; arrow?: boolean }) {
  if (!b?.label) return null;
  const cls = b.style === "indigo" ? "btn btn-indigo" : b.style === "outline" ? "btn btn-outline" : "btn";
  const tel = b.href?.startsWith("tel:");
  const inner = (
    <>
      {tel && <LuPhone aria-hidden />}
      {b.label}
      {arrow && !tel && b.style !== "outline" && <Arrow />}
    </>
  );
  if (isExternal(b.href)) return <a href={b.href} className={cls}>{inner}</a>;
  return <Link href={b.href || "#"} className={cls}>{inner}</Link>;
}

function Buttons({ list, className = "" }: { list: (Btn | undefined)[]; className?: string }) {
  const shown = list.filter((b) => b?.label);
  if (!shown.length) return null;
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {shown.map((b, i) => <BtnLink key={i} b={b} />)}
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

/** Kop met één woord of woordgroep onder een markeerstift, zoals "oogopslag" bij Acture. */
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

const H2 = "text-[2.1rem] font-extrabold leading-[1.08] tracking-[-0.022em] md:text-[2.75rem]";

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
    <section className="hero-pull relative isolate overflow-hidden bg-soft">
      <DotCloud className="pointer-events-none absolute -right-10 top-1/2 -z-10 hidden w-[340px] -translate-y-1/3 opacity-[0.14] md:block" />
      <div className="container-site pb-16 pt-8 md:pb-20 md:pt-12">
        {ctx?.crumbs && <Breadcrumbs crumbs={ctx.crumbs} className="mb-8 text-primary" />}
        {children}
      </div>
    </section>
  );
}

const H1_BAND = "max-w-[900px] text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.028em] md:text-[3.5rem]";

/* ---------- Hero's ---------- */

/**
 * De homepage-hero naar acture.nl: twee panelen naast elkaar — de belofte op
 * indigo, de foto ernaast met de stippenwolk — en daaronder de klantlogo's.
 */
function HeroStatement({ d, asH1 }: BlockProps) {
  const logos = ((d.logos as any[]) || []).filter((l) => l?.image);
  return (
    <section className="hero-pull relative isolate overflow-hidden bg-soft">
      {/* Een brede, lichte baan schuin door de achtergrond, zoals bij Acture. */}
      <div aria-hidden className="pointer-events-none absolute -right-[18%] -top-[35%] -z-10 h-[150%] w-[62%] rotate-[16deg] rounded-[140px] bg-white/70" />
      <div className="container-site pb-12 pt-3 md:pb-16 lg:pt-5">
        <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr] lg:gap-5">
          <div className="on-dark relative isolate flex flex-col justify-center overflow-hidden rounded-[32px] bg-primary px-7 py-12 text-white sm:px-10 lg:min-h-[600px] lg:px-14 lg:py-16">
            <div aria-hidden className="dot-texture absolute inset-0 -z-10 opacity-70" />
            <div aria-hidden className="absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-accent-pink/25 blur-[90px]" />
            {d.eyebrow && (
              <p className="eyebrow mb-6" data-reveal>
                <span className="relative flex h-2 w-2" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
                </span>
                {d.eyebrow}
              </p>
            )}
            <PageHeading asH1={asH1}
              className="whitespace-pre-line text-[2.7rem] font-extrabold leading-[1.02] tracking-[-0.032em] !text-white sm:text-[3.5rem] lg:text-[4.3rem]">
              <Highlighted text={d.heading || ""} highlight={d.highlight} />
            </PageHeading>
            {d.text && (
              <div data-reveal style={{ "--ri": 1 } as React.CSSProperties}>
                <MiniMarkdown text={d.text} className="mt-7 max-w-[560px] text-[18.5px] text-white/80 md:text-[20px]" />
              </div>
            )}
            <div data-reveal style={{ "--ri": 2 } as React.CSSProperties}>
              <Buttons list={[d.button, d.button2]} className="mt-9" />
            </div>
          </div>

          <div className="relative min-h-[380px] overflow-hidden rounded-[32px] bg-[#dcdaf0] sm:min-h-[480px]">
            {d.image && (
              <SiteImage src={d.image} alt={d.imageAlt || ""} priority sizes="(min-width: 1024px) 560px, 100vw"
                className="absolute inset-0 h-full w-full object-cover object-[center_30%]" />
            )}
            <DotCloud animate outline className="absolute right-6 top-6 w-[24%] max-w-[130px] sm:right-8 sm:top-8" />
            {d.badge && (
              <p className="absolute bottom-5 left-5 flex max-w-[calc(100%-2.5rem)] items-center gap-3 rounded-2xl bg-white/95 py-3 pl-3 pr-5 text-[15px] font-semibold leading-snug text-primary shadow-[0_18px_40px_-20px_rgba(34,32,90,0.55)] backdrop-blur sm:bottom-7 sm:left-7">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky text-[20px] text-[#186c98]">
                  <LuBadgeCheck aria-hidden />
                </span>
                {d.badge}
              </p>
            )}
          </div>
        </div>

        {logos.length > 0 && (
          <div className="mt-10 flex flex-col gap-6 md:mt-12 md:flex-row md:items-center md:gap-12" data-reveal>
            {d.logosLabel && <p className="shrink-0 text-[16px] font-medium text-primary">{d.logosLabel}</p>}
            <ul className="flex flex-wrap items-center gap-x-10 gap-y-6">
              {logos.map((l, i) => (
                <li key={`${l.image}-${i}`}>
                  <SiteImage src={l.image} alt={l.alt || ""} sizes="160px" widths={[160, 320]}
                    className="h-11 w-auto max-w-[150px] object-contain opacity-75 mix-blend-multiply grayscale transition duration-300 hover:opacity-100 hover:grayscale-0" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Hero voor gewone pagina's: tekstpaneel met kruimelpad naast de foto. Op een
 * dienstpagina kleurt het paneel mee met de dienst (--k-zacht).
 */
function Hero({ d, asH1, ctx }: BlockProps) {
  return (
    <section className="relative">
      <div className="container-site pt-3 lg:pt-5">
        <div className={`grid gap-4 lg:gap-5 ${d.image ? "lg:grid-cols-[1.12fr_0.88fr]" : ""}`}>
          <div className="relative isolate flex flex-col justify-center overflow-hidden rounded-[32px] bg-[var(--k-zacht,var(--color-soft))] px-7 py-10 sm:px-10 lg:min-h-[540px] lg:px-14 lg:py-14">
            <DotCloud className="pointer-events-none absolute -bottom-12 -right-10 -z-10 w-[260px] opacity-[0.13]" />
            {ctx?.crumbs && <Breadcrumbs crumbs={ctx.crumbs} className="mb-8 text-primary" />}
            {d.eyebrow && <p className="eyebrow mb-5" data-reveal>{d.eyebrow}</p>}
            <PageHeading asH1={asH1}
              className="whitespace-pre-line text-[2.3rem] font-extrabold leading-[1.05] tracking-[-0.028em] sm:text-[2.9rem] lg:text-[3.3rem]">
              {d.heading}
            </PageHeading>
            {d.text && (
              <div data-reveal style={{ "--ri": 1 } as React.CSSProperties}>
                <MiniMarkdown text={d.text} className="mt-6 max-w-[620px] text-[18px]" />
              </div>
            )}
            <div data-reveal style={{ "--ri": 2 } as React.CSSProperties}>
              <Buttons list={[d.button, d.button2]} className="mt-8" />
            </div>
          </div>
          {d.image && (
            <div className="relative min-h-[320px] overflow-hidden rounded-[32px] bg-soft sm:min-h-[420px]">
              <SiteImage src={d.image} alt={d.imageAlt || ""} priority sizes="(min-width: 1024px) 520px, 100vw"
                className="absolute inset-0 h-full w-full object-cover" />
            </div>
          )}
        </div>
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
  // Split: kop links, tekst rechts — de "Onze expertise"-opbouw van Acture.
  if (d.layout === "split") {
    return (
      <section className={PAD}>
        <div className="container-site grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
          <div data-reveal>
            {d.eyebrow && <p className="eyebrow mb-4">{d.eyebrow}</p>}
            {d.heading && (
              <PageHeading asH1={asH1} className="text-[2.2rem] font-extrabold leading-[1.06] tracking-[-0.025em] md:text-[3.1rem]">
                {d.heading}
              </PageHeading>
            )}
          </div>
          <div className="lg:pt-10" data-reveal style={{ "--ri": 1 } as React.CSSProperties}>
            {d.text && <MiniMarkdown text={d.text} className="text-[19px] md:text-[20px]" />}
            <Buttons list={[d.button]} className="mt-9" />
          </div>
        </div>
      </section>
    );
  }
  // Alleen een kop (vaak de titel boven het blok dat volgt): minder ruimte,
  // anders staat zo'n kop verloren in een grote witte band.
  const alleenKop = !d.text && !d.button?.label;
  return (
    <section className={alleenKop ? "pb-4 pt-14 md:pt-20" : "py-16 md:py-24"}>
      <div className="container-site max-w-[900px] text-center">
        <SectionHead eyebrow={d.eyebrow} heading={d.heading} text={d.text} asH1={asH1} align="center" />
        <Buttons list={[d.button]} className="mt-8 justify-center" />
      </div>
    </section>
  );
}

function AnimatedHeadline({ d }: BlockProps) {
  return (
    <section className="py-10">
      <div className="container-site">
        <TypingHeadline before={d.before || ""} words={(d.words as string[]) || []} after={d.after || ""} />
      </div>
    </section>
  );
}

function ImageText({ d, asH1 }: BlockProps) {
  const imgLeft = d.imagePosition === "left";
  return (
    <section className={PAD}>
      <div className="container-site grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div className={imgLeft ? "lg:order-2" : ""}>
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} text={d.text} asH1={asH1} />
          <Buttons list={[d.button]} className="mt-8" />
        </div>
        {d.image && (
          <div className={`relative mx-auto w-full max-w-[540px] ${imgLeft ? "lg:order-1" : ""}`} data-reveal>
            <div aria-hidden className={`absolute inset-0 rounded-[36px] bg-[var(--k-zacht,var(--color-soft))] ${imgLeft ? "-translate-x-4" : "translate-x-4"} translate-y-4`} />
            <SiteImage src={d.image} alt={d.imageAlt || ""} sizes="(min-width: 1024px) 540px, 100vw"
              className="relative w-full rounded-[32px] bg-white object-cover" />
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
        <section className="pb-6 pt-14 md:pt-20">
          <div className="container-site max-w-[820px]">
            <MiniMarkdown text={d.body || ""} className="text-[18.5px]" />
            <Buttons list={[d.button]} className="mt-9" />
          </div>
        </section>
      </>
    );
  }
  return (
    <section className="py-14 md:py-20">
      <div className="container-site max-w-[820px]" data-reveal>
        {d.eyebrow && <p className="eyebrow mb-4">{d.eyebrow}</p>}
        {d.heading && (
          <PageHeading asH1={asH1} className="mb-6 text-[1.9rem] font-extrabold leading-[1.1] tracking-[-0.02em] md:text-[2.4rem]">
            {d.heading}
          </PageHeading>
        )}
        <MiniMarkdown text={d.body || ""} className="text-[18.5px]" />
        <Buttons list={[d.button]} className="mt-9" />
      </div>
    </section>
  );
}

function ImagesBlock({ d }: BlockProps) {
  const images = ((d.images as any[]) || []).filter((im) => im?.image);
  return (
    <section className="py-10 md:py-14">
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
function ServicesGrid({ d }: BlockProps) {
  const cards = (d.cards as any[]) || [];
  return (
    <section className="pb-20 pt-4 md:pb-28">
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
              <span className="link-arrow mt-auto pt-7 text-[15.5px] text-[var(--k)]">
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
    <section className={`bg-soft ${PAD}`}>
      <div className="container-site grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="lg:sticky lg:top-[calc(var(--hh)+2rem)] lg:self-start">
          <SectionHead eyebrow={d.eyebrow} heading={d.heading} asH1={asH1} />
          {d.intro && <MiniMarkdown text={d.intro} className="mt-6 text-[17.5px]" />}
        </div>
        <ol className="space-y-4">
          {items.map((it, i) => (
            <li key={i} id={anchorId(it.title) || undefined} data-reveal
              className="rounded-[26px] border border-black/[0.05] bg-white p-7 md:p-9">
              <div className="flex gap-5">
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

/** "Wat doet de werkgever? / Wat neemt React2u uit handen?" — twee kaarten, de tweede op indigo. */
function TwoColumnLists({ d, asH1 }: BlockProps) {
  const cols = (d.columns as any[]) || [];
  return (
    <section className={PAD}>
      <div className="container-site">
        <SectionHead heading={d.heading} asH1={asH1} align="center" className="mb-12 max-w-[760px]" />
        <div className="grid gap-5 md:grid-cols-2">
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
      <section className={`bg-sky ${PAD}`}>
        <div className="container-site grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
          <div className="lg:sticky lg:top-[calc(var(--hh)+2rem)] lg:self-start">
            <SectionHead eyebrow={d.eyebrow} heading={d.heading} text={d.text} asH1={asH1} />
            <Buttons list={[d.button]} className="mt-9" />
          </div>
          <ul className="space-y-4">
            {cards.map((c, i) => (
              <li key={i} style={{ ...kleurVars(WAARDE_KLEUREN[i % WAARDE_KLEUREN.length]), "--ri": i } as React.CSSProperties}
                  className="flex gap-5 rounded-[26px] bg-white p-7 md:p-8" data-reveal>
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--k-zacht)] text-[26px] text-[var(--k)]">
                  <Icon name={c.icon} />
                </span>
                <div>
                  <h3 className="mb-2 text-[22px]">{c.title}</h3>
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
    <section className="py-14 md:py-20">
      <div className="container-site grid gap-5 md:grid-cols-3">
        {cards.map((c, i) => (
          <div key={i} style={{ ...kleurVars(WAARDE_KLEUREN[i % WAARDE_KLEUREN.length]), "--ri": i } as React.CSSProperties}
               className="rounded-[28px] bg-soft p-8" data-reveal>
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-[26px] text-[var(--k)]">
              <Icon name={c.icon} />
            </span>
            <h3 className="mt-7 text-[24px]">{c.title}</h3>
            <p className="mt-2 text-[16.5px]">{c.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Oproep, contact en vragen ---------- */

function CtaBanner({ d, asH1 }: BlockProps) {
  const buttons = (d.buttons as Btn[]) || [];
  return (
    <section className="py-12 md:py-16">
      <div className="container-site">
        <div className="on-dark relative isolate overflow-hidden rounded-[36px] bg-primary px-7 py-16 text-center text-white/80 sm:px-12 md:py-20" data-reveal>
          {/* Achter de tekst: -z-10 binnen de isolate-laag van dit vlak. */}
          <div aria-hidden className="dot-texture absolute inset-0 -z-10" />
          <div aria-hidden className="absolute -right-24 -top-32 -z-10 h-96 w-96 rounded-full bg-accent-pink/30 blur-[110px]" />
          <div aria-hidden className="absolute -bottom-40 -left-24 -z-10 h-96 w-96 rounded-full bg-accent-blue/25 blur-[110px]" />
          <DotCloud className="pointer-events-none absolute right-10 top-10 -z-10 hidden w-[110px] lg:block" />
          {d.eyebrow && <p className="eyebrow mb-4">{d.eyebrow}</p>}
          {d.heading && (
            <PageHeading asH1={asH1} className="mx-auto max-w-[820px] text-[2.2rem] font-extrabold leading-[1.06] tracking-[-0.025em] !text-white md:text-[3rem]">
              {d.heading}
            </PageHeading>
          )}
          {d.text && <MiniMarkdown text={d.text} className="mx-auto mt-5 max-w-[640px] text-[18.5px]" />}
          {buttons.length > 0 && (
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              {buttons.map((b, i) => <BtnLink key={i} b={b} />)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FaqSide({ heading, asH1 }: { heading?: string; asH1?: boolean }) {
  return (
    <div className="lg:sticky lg:top-[calc(var(--hh)+2rem)] lg:self-start" data-reveal>
      <p className="eyebrow mb-4">Vragen & antwoorden</p>
      <PageHeading asH1={asH1} className={H2}>{heading || "Veelgestelde vragen"}</PageHeading>
      <p className="mt-5 max-w-[420px] text-[18px]">Staat je vraag er niet bij? We helpen je graag persoonlijk verder.</p>
      <Link href="/contact" className="link-arrow mt-6">Stel je vraag <Arrow /></Link>
    </div>
  );
}

function FaqBlock({ d, asH1 }: BlockProps) {
  return (
    <section className={PAD}>
      <div className="container-site grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <FaqSide heading={d.heading} asH1={asH1} />
        <div data-reveal style={{ "--ri": 1 } as React.CSSProperties}>
          <Accordion items={((d.items as FaqItem[]) || [])} />
        </div>
      </div>
    </section>
  );
}

function ContactFaq({ d, asH1 }: BlockProps) {
  return (
    <section className={`bg-soft ${PAD}`}>
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
    <section className={PAD}>
      <div className="container-site grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
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
        <div className="rounded-[32px] border border-black/[0.05] bg-white p-7 shadow-[0_30px_60px_-40px_rgba(34,32,90,0.5)] md:p-10" data-reveal>
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
    <section className="py-14 md:py-20">
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
 * De drie pijlers. De inhoud (titel, tekst, diensten) komt uit PIJLERS in
 * nav.ts — dezelfde bron als het megamenu en de footer, zodat die drie nooit
 * uit elkaar lopen. Het blok zelf regelt alleen de kop erboven.
 */
function Pillars({ d, asH1 }: BlockProps) {
  return (
    <section className={`bg-soft ${PAD}`}>
      <div className="container-site">
        <SectionHead eyebrow={d.eyebrow} heading={d.heading} text={d.text} asH1={asH1} align="center" className="mb-14 max-w-[780px]" />
        <div className="grid gap-5 md:grid-cols-3">
          {PIJLERS.map((p, i) => (
            <article key={p.key} style={{ ...kleurVars(p.kleur), "--ri": i } as React.CSSProperties} data-reveal
              className="lift flex flex-col rounded-[30px] border border-black/[0.04] bg-white p-7 md:p-9">
              <span className="grid h-16 w-16 place-items-center rounded-[20px] bg-[var(--k-zacht)] text-[30px] text-[var(--k)]">
                <Icon name={p.icon} />
              </span>
              <h3 className="mt-8 text-[28px]">{p.title}</h3>
              <p className="mt-3 text-[17px]">{p.text}</p>
              <ul className="mt-auto space-y-2 pt-8">
                {p.diensten.map((x) => (
                  <li key={x.href} style={kleurVars(x.kleur)}>
                    <Link href={x.href}
                      className="group flex items-center justify-between gap-3 rounded-2xl bg-[var(--k-zacht)] py-2 pl-5 pr-2 font-semibold text-primary transition-colors duration-300 hover:bg-[var(--k)] hover:text-white">
                      {x.label}
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[var(--k)] transition-transform duration-300 group-hover:translate-x-0.5">
                        <Arrow />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** "Ontdek React2u": alle onderwerpen als pil-tegels, elk in de kleur van zijn dienst. */
function LinkIndex({ d, asH1 }: BlockProps) {
  const items = ((d.items as any[]) || []).filter((it) => it?.label && it?.href);
  return (
    <section className={PAD}>
      <div className="container-site">
        <SectionHead eyebrow={d.eyebrow} heading={d.heading} text={d.text} asH1={asH1} align="center" className="mb-12 max-w-[780px]" />
        <Pills items={items} className="mx-auto max-w-[1080px] justify-center" />
        <Buttons list={[d.button && { ...d.button, style: "indigo" }]} className="mt-12 justify-center" />
      </div>
    </section>
  );
}

/**
 * "Over React2u" op donker indigo: tekst links, beeld rechts met een witte
 * citaatkaart eroverheen. `imageShape: "circle"` snijdt het beeld rond bij,
 * zoals het REACT-wiel.
 */
function About({ d, asH1 }: BlockProps) {
  const circle = d.imageShape === "circle";
  return (
    <section className="on-dark relative isolate overflow-hidden bg-primary-deep py-20 text-white/75 md:py-32">
      <div aria-hidden className="dot-texture absolute inset-0 -z-10 opacity-80" />
      <div aria-hidden className="absolute right-[-10%] top-1/2 -z-10 h-[520px] w-[520px] -translate-y-1/2 rounded-full bg-accent-blue/20 blur-[130px]" />
      <div className="container-site grid items-center gap-16 lg:grid-cols-2 lg:gap-24">
        <div>
          <div data-reveal>
            {d.eyebrow && <p className="eyebrow mb-4">{d.eyebrow}</p>}
            {d.heading && <PageHeading asH1={asH1} className={`${H2} !text-white`}>{d.heading}</PageHeading>}
            {d.text && <MiniMarkdown text={d.text} className="mt-6 max-w-[560px] text-[18.5px]" />}
          </div>
          <div data-reveal style={{ "--ri": 1 } as React.CSSProperties}>
            <Buttons list={[d.button && { ...d.button, style: "outline" }]} className="mt-9" />
          </div>
        </div>
        {d.image && (
          // Met een citaat komt er ruimte onder het beeld: de kaart valt dan in
          // de hoek linksonder en bedekt zo min mogelijk van het beeld zelf.
          <div className={`relative mx-auto w-full max-w-[520px] ${d.quote ? "sm:pb-36" : ""}`} data-reveal>
            <div className={`relative overflow-hidden bg-[#ececf1] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)] ${circle ? "aspect-square rounded-full ring-[10px] ring-white/[0.06]" : "rounded-[32px]"}`}>
              <SiteImage src={d.image} alt={d.imageAlt || ""} sizes="(min-width: 1024px) 520px, 100vw"
                className={circle ? "h-full w-full scale-[1.04] object-cover" : "w-full object-cover"} />
            </div>
            {d.quote && (
              // Op een telefoon onder het beeld (met een kleine overlap), vanaf
              // sm in de hoek linksonder.
              <figure className="relative mx-4 -mt-10 rounded-[24px] bg-white p-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.55)] sm:absolute sm:bottom-0 sm:-left-10 sm:mx-0 sm:mt-0 sm:max-w-[360px] md:p-7">
                {(d.quoteName || d.quoteRole) && (
                  <figcaption className="mb-3 text-[14px] text-body">
                    {d.quoteName && <strong className="font-semibold text-primary">{d.quoteName}</strong>}
                    {d.quoteName && d.quoteRole && " · "}
                    {d.quoteRole}
                  </figcaption>
                )}
                <blockquote className="font-heading text-[20px] font-bold leading-snug tracking-[-0.01em] text-primary md:text-[21px]">
                  “{d.quote}”
                </blockquote>
              </figure>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const FEIT_KLEUREN: Kleur[] = ["roze", "teal", "blauw", "oranje", "rood"];

/**
 * Verdeelt n items over drie kolommen, op volgorde. De middelste kolom krijgt
 * het eerste extra item: die begint het hoogst, dus daar mag de meeste inhoud.
 * Op volgorde (niet om-en-om) zodat een telefoon ze in de volgorde van het CMS
 * toont.
 */
function driekolom<T>(items: T[]): T[][] {
  const base = Math.floor(items.length / 3);
  const extra = items.length % 3;
  const sizes = [base + (extra === 2 ? 1 : 0), base + (extra >= 1 ? 1 : 0), base];
  return [items.slice(0, sizes[0]), items.slice(sizes[0], sizes[0] + sizes[1]), items.slice(sizes[0] + sizes[1])];
}

/**
 * "In één oogopslag": kaarten in drie verspringende kolommen, zoals bij Acture.
 * Een item met `value` wordt een cijferkaart, een item met `image` een kaart
 * met beeld, de rest een tekstkaart.
 */
function Facts({ d, asH1 }: BlockProps) {
  const items = (d.items as any[]) || [];
  const offsets = ["lg:mt-20", "", "lg:mt-36"];
  let n = 0;
  return (
    <section className={PAD}>
      <div className="container-site">
        <SectionHead eyebrow={d.eyebrow} heading={d.heading} highlight={d.highlight} text={d.text} asH1={asH1}
          align="center" className="max-w-[760px]" />
        <div className="mt-14 grid gap-5 lg:mt-6 lg:grid-cols-3">
          {driekolom(items).map((col, ci) => (
            <div key={ci} className={`space-y-5 ${offsets[ci]}`}>
              {col.map((it) => {
                const i = n++;
                const kleurStijl = { ...kleurVars(FEIT_KLEUREN[i % FEIT_KLEUREN.length]), "--ri": ci } as React.CSSProperties;
                return (
                  <div key={i} style={kleurStijl} data-reveal className="rounded-[28px] bg-soft p-7 md:p-8">
                    {it.value && (
                      <>
                        <span className="block h-1.5 w-10 rounded-full bg-[var(--k-vlak)]" aria-hidden />
                        {/* Een kernwoord als "WVP + ERD" is langer dan een cijfer; kleiner, zodat het op één regel past. */}
                        <p className={`mt-6 font-heading font-extrabold leading-none tracking-[-0.035em] text-primary ${
                          String(it.value).length > 6 ? "text-[2.6rem] md:text-[2.9rem]" : "text-[3.4rem] md:text-[3.9rem]"
                        }`}>
                          {it.value}
                        </p>
                      </>
                    )}
                    {it.title && <h3 className={`${it.value ? "mt-5 text-[19px]" : "text-[25px]"} leading-snug`}>{it.title}</h3>}
                    {it.text && <p className="mt-3 text-[16px]">{it.text}</p>}
                    {it.image && (
                      <div className="mt-6 overflow-hidden rounded-[20px]">
                        <SiteImage src={it.image} alt={it.imageAlt || ""} sizes="(min-width: 1024px) 360px, 100vw"
                          className="aspect-[4/3.4] w-full object-cover" />
                      </div>
                    )}
                  </div>
                );
              })}
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
    <section className={PAD}>
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
  pillars: Pillars,
  linkIndex: LinkIndex,
  about: About,
  facts: Facts,
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
  "heroStatement", "pillars", "linkIndex", "about", "facts", "valueCards",
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
