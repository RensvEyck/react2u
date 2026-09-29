import Link from "next/link";
import type { Block, Post } from "@/lib/types";
import { MiniMarkdown } from "@/lib/md";
import Icon from "@/components/site/Icon";
import Accordion, { type FaqItem } from "@/components/site/Accordion";
import TypingHeadline from "@/components/site/TypingHeadline";
import LogoCarousel from "@/components/site/LogoCarousel";
import ContactForm from "@/components/site/ContactForm";
import { jsonLd } from "@/lib/jsonld";
import SiteImage from "@/components/site/SiteImage";
import DotCloud, { Arrow } from "@/components/site/DotCloud";
import { PIJLERS } from "@/lib/nav";
import { kleurVars, type Kleur } from "@/lib/brand";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Btn = { label: string; href: string; style?: "accent" | "indigo" | "outline" };

/**
 * Gegevens die een blok niet in zijn eigen `data` heeft, maar die de pagina
 * ophaalt — zoals de nieuwste artikelen. Leeg in het live voorbeeld van de
 * blokeditor: die draait in de browser en haalt niets op.
 */
export type BlockCtx = { posts?: Post[] };

type BlockProps = { d: any; asH1?: boolean; ctx?: BlockCtx };

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

function BtnLink({ b, arrow }: { b?: Btn; arrow?: boolean }) {
  if (!b?.label) return null;
  const cls = b.style === "indigo" ? "btn btn-indigo" : b.style === "outline" ? "btn btn-outline" : "btn";
  const external = b.href?.startsWith("http") || b.href?.startsWith("tel:") || b.href?.startsWith("mailto:");
  const inner = arrow ? <span className="inline-flex items-center gap-2">{b.label} <Arrow /></span> : b.label;
  if (external)
    return <a href={b.href} className={cls}>{inner}</a>;
  return <Link href={b.href || "#"} className={cls}>{inner}</Link>;
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

/** Kop met één woord of woordgroep in de accentkleur, zoals "gezonde" bij Acture. */
function Highlighted({ text, highlight }: { text: string; highlight?: string }) {
  const hl = (highlight || "").trim();
  const at = hl ? text.indexOf(hl) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className="text-accent">{hl}</span>
      {text.slice(at + hl.length)}
    </>
  );
}

/** Bovenkop + kop + tekst, links uitgelijnd — het begin van de meeste nieuwe secties. */
function SectionHead({
  d, asH1, className, dark,
}: {
  d: any;
  asH1?: boolean;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div className={className}>
      {d.eyebrow && <p className={`eyebrow mb-3 ${dark ? "!text-primary-light" : ""}`}>{d.eyebrow}</p>}
      {d.heading && (
        <PageHeading asH1={asH1}
          className={`mb-5 text-[2rem] font-extrabold leading-[1.1] tracking-[-0.015em] md:text-[2.6rem] ${dark ? "!text-white" : ""}`}>
          {d.heading}
        </PageHeading>
      )}
      {d.text && <MiniMarkdown text={d.text} className={dark ? "text-white/75" : ""} />}
    </div>
  );
}

function Hero({ d, asH1 }: BlockProps) {
  return (
    <section className="bg-gradient-to-br from-soft via-white to-secondary/10">
      <div className="container-site grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
        <div>
          {d.eyebrow && <p className="eyebrow mb-4">{d.eyebrow}</p>}
          <PageHeading asH1={asH1} className="text-4xl md:text-5xl mb-6 whitespace-pre-line">{d.heading}</PageHeading>
          {d.text && <MiniMarkdown text={d.text} className="mb-8" />}
          <div className="flex flex-wrap gap-3">
            <BtnLink b={d.button} />
            <BtnLink b={d.button2} />
          </div>
        </div>
        {d.image && (
          <div className="relative">
            <div className="absolute -inset-6 rounded-[48px] bg-secondary/10 rotate-3" aria-hidden />
            <SiteImage src={d.image} alt={d.imageAlt || ""} priority sizes="(min-width: 1024px) 50vw, 100vw"
              className="relative rounded-[40px] w-full object-cover shadow-lg" />
          </div>
        )}
      </div>
    </section>
  );
}

function Intro({ d, asH1 }: BlockProps) {
  // Split: kop links, tekst rechts — de "Onze expertise"-opbouw van Acture.
  if (d.layout === "split") {
    return (
      <section className="py-16 md:py-24">
        <div className="container-site grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            {d.eyebrow && <p className="eyebrow mb-3">{d.eyebrow}</p>}
            {d.heading && (
              <PageHeading asH1={asH1} className="text-[2rem] font-extrabold leading-[1.1] tracking-[-0.015em] md:text-[2.6rem]">
                {d.heading}
              </PageHeading>
            )}
          </div>
          <div className="lg:pt-9">
            {d.text && <MiniMarkdown text={d.text} className="text-[19px]" />}
            {d.button?.label && <div className="mt-8"><BtnLink b={d.button} arrow /></div>}
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="py-14">
      <div className="container-site max-w-[820px] text-center">
        <hr className="mx-auto mb-10 w-24 border-accent" />
        {d.eyebrow && <p className="eyebrow mb-3">{d.eyebrow}</p>}
        {d.heading && <PageHeading asH1={asH1} className="text-3xl md:text-4xl mb-6">{d.heading}</PageHeading>}
        {d.text && <MiniMarkdown text={d.text} className="text-left md:text-center" />}
        {d.button?.label && <div className="mt-8"><BtnLink b={d.button} /></div>}
        <hr className="mx-auto mt-10 w-24 border-accent" />
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
    <section className="py-14">
      <div className="container-site grid items-center gap-10 lg:grid-cols-2">
        <div className={imgLeft ? "lg:order-2" : ""}>
          {d.eyebrow && <p className="eyebrow mb-4">{d.eyebrow}</p>}
          {d.heading && <PageHeading asH1={asH1} className="text-3xl md:text-4xl mb-6">{d.heading}</PageHeading>}
          {d.text && <MiniMarkdown text={d.text} />}
          {d.button?.label && <div className="mt-8"><BtnLink b={d.button} /></div>}
        </div>
        {d.image && (
          <div className={imgLeft ? "lg:order-1" : ""}>
            <SiteImage src={d.image} alt={d.imageAlt || ""} sizes="(min-width: 1024px) 520px, 100vw"
              className="mx-auto w-full max-w-[520px] rounded-[32px]" />
          </div>
        )}
      </div>
    </section>
  );
}

function ServicesGrid({ d }: BlockProps) {
  const cards = (d.cards as any[]) || [];
  return (
    <section className="py-10">
      <div className="container-site grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <div key={i} className="flip-card h-[280px]">
            <div className="flip-inner h-full">
              <div className="flip-face bg-soft border border-primary/10">
                <Icon name={c.icon} className="text-5xl text-accent mb-5" />
                <h3 className="text-2xl text-primary">{c.title}</h3>
              </div>
              <div className="flip-face flip-back bg-primary text-white">
                {/* De titel staat hier alleen om de achterkant van de kaart
                    visueel af te maken; hij is een letterlijke herhaling van de
                    voorkant. Zonder aria-hidden leest een schermlezer elke
                    dienst twee keer voor. */}
                <h3 className="text-2xl !text-white mb-3" aria-hidden="true">{c.title}</h3>
                <p className="text-white/85 text-[16px] mb-5">{c.description}</p>
                {/* "MEER INFO" zegt zonder context niets in een linklijst. */}
                <Link
                  href={c.href || "#"}
                  aria-label={`Meer info over ${c.title}`}
                  className="btn !py-2 !px-6 text-[15px]"
                >
                  MEER INFO
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CtaBanner({ d, asH1 }: BlockProps) {
  return (
    <section className="py-14">
      <div className="container-site">
        <div className="on-dark relative isolate overflow-hidden rounded-[32px] bg-gradient-to-r from-primary to-[#4a46b0] px-8 py-12 text-center text-white md:px-16 md:py-16">
          {/* Achter de tekst: -z-10 binnen de isolate-laag van dit vlak. */}
          <DotCloud className="pointer-events-none absolute right-10 top-10 -z-10 hidden w-[120px] opacity-70 lg:block" />
          {d.eyebrow && <p className="eyebrow !text-secondary mb-3">{d.eyebrow}</p>}
          {d.heading && <PageHeading asH1={asH1} className="text-3xl md:text-4xl !text-white mb-4">{d.heading}</PageHeading>}
          {d.text && <MiniMarkdown text={d.text} className="mx-auto max-w-[700px] text-white/85 mb-2" />}
          <div className="relative mt-6 flex flex-wrap justify-center gap-4">
            {((d.buttons as Btn[]) || []).map((b, i) => <BtnLink key={i} b={b} arrow={i === 0 && !b.href?.startsWith("tel:")} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function SubSections({ d, asH1 }: BlockProps) {
  const items = (d.items as any[]) || [];
  return (
    <section className="py-14 bg-soft">
      <div className="container-site">
        <div className="max-w-[820px]">
          {d.eyebrow && <p className="eyebrow mb-3">{d.eyebrow}</p>}
          {d.heading && <PageHeading asH1={asH1} className="text-3xl md:text-4xl mb-5">{d.heading}</PageHeading>}
          {d.intro && <MiniMarkdown text={d.intro} className="mb-4" />}
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {items.map((it, i) => (
            <div key={i} id={anchorId(it.title) || undefined} className="rounded-2xl bg-white p-7 shadow-sm border border-black/5">
              <h3 className="text-2xl mb-3">{it.title}</h3>
              <MiniMarkdown text={it.body || ""} className="text-[17px]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TwoColumnLists({ d, asH1 }: BlockProps) {
  const cols = (d.columns as any[]) || [];
  return (
    <section className="py-14">
      <div className="container-site">
        {d.heading && <PageHeading asH1={asH1} className="text-3xl md:text-4xl mb-8 text-center">{d.heading}</PageHeading>}
        <div className="grid gap-6 md:grid-cols-2">
          {cols.map((c, i) => (
            <div key={i} className={`rounded-2xl p-8 ${i % 2 === 0 ? "bg-soft" : "bg-secondary/10"}`}>
              <h3 className="text-2xl mb-4">{c.title}</h3>
              <ul className="space-y-2.5">
                {((c.items as string[]) || []).map((item, j) => (
                  <li key={j} className="flex gap-3">
                    <Icon name="check" className="mt-1.5 shrink-0 text-secondary" />
                    <span>{item}</span>
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

const WAARDE_KLEUREN: Kleur[] = ["teal", "roze", "blauw", "oranje", "rood", "indigo"];

function ValueCards({ d, asH1 }: BlockProps) {
  const cards = (d.cards as any[]) || [];
  // Met een kop wordt het "Wat maakt ons anders?": tekst links, waarden als
  // lijst rechts. Zonder kop blijft het de rij kaarten die er al stond.
  if (d.heading) {
    return (
      <section className="py-16 md:py-24">
        <div className="container-site grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <SectionHead d={d} asH1={asH1} />
            {d.button?.label && <div className="mt-8"><BtnLink b={d.button} arrow /></div>}
          </div>
          <ul className="space-y-4">
            {cards.map((c, i) => (
              <li key={i} style={kleurVars(WAARDE_KLEUREN[i % WAARDE_KLEUREN.length])}
                  className="flex gap-5 rounded-[24px] border border-black/[0.06] bg-white p-6 md:p-7">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--k-zacht)] text-2xl text-[var(--k)]">
                  <Icon name={c.icon} />
                </span>
                <div>
                  <h3 className="mb-1.5 text-[22px]">{c.title}</h3>
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
    <section className="py-14">
      <div className="container-site grid gap-6 md:grid-cols-3">
        {cards.map((c, i) => (
          <div key={i} className="rounded-2xl border border-black/5 bg-white p-8 text-center shadow-sm">
            <Icon name={c.icon} className="mx-auto mb-4 text-4xl text-accent" />
            <h3 className="text-2xl mb-3">{c.title}</h3>
            <p className="text-[16px]">{c.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ContactFaq({ d, asH1 }: BlockProps) {
  return (
    <section className="py-14 bg-soft">
      <div className="container-site grid gap-12 lg:grid-cols-2">
        <div>
          {d.heading && <PageHeading asH1={asH1} className="text-3xl md:text-4xl mb-4">{d.heading}</PageHeading>}
          {d.text && <MiniMarkdown text={d.text} className="mb-6" />}
          <ContactForm />
        </div>
        <div>
          <Accordion items={((d.faq as FaqItem[]) || [])} />
        </div>
      </div>
    </section>
  );
}

function FaqBlock({ d, asH1 }: BlockProps) {
  return (
    <section className="py-14">
      <div className="container-site max-w-[860px]">
        {d.heading && <PageHeading asH1={asH1} className="text-3xl md:text-4xl mb-8 text-center">{d.heading}</PageHeading>}
        <Accordion items={((d.items as FaqItem[]) || [])} />
      </div>
    </section>
  );
}

function LogoCarouselBlock({ d }: BlockProps) {
  return (
    <section className="py-14">
      <div className="container-site">
        {d.eyebrow && <p className="eyebrow mb-8 text-center">{d.eyebrow}</p>}
        <LogoCarousel logos={((d.logos as any[]) || [])} />
      </div>
    </section>
  );
}

function RichText({ d, asH1 }: BlockProps) {
  return (
    <section className="py-14">
      <div className="container-site max-w-[860px]">
        {d.eyebrow && <p className="eyebrow mb-3">{d.eyebrow}</p>}
        {d.heading && <PageHeading asH1={asH1} className="text-3xl md:text-4xl mb-6">{d.heading}</PageHeading>}
        <MiniMarkdown text={d.body || ""} />
        {d.button?.label && <div className="mt-8"><BtnLink b={d.button} /></div>}
      </div>
    </section>
  );
}

function ImagesBlock({ d }: BlockProps) {
  const images = (d.images as any[]) || [];
  return (
    <section className="py-10">
      <div className="container-site space-y-8">
        {images.map((im, i) => (
          <SiteImage key={i} src={im.image} alt={im.alt || ""} sizes="(min-width: 900px) 900px, 100vw"
            className="mx-auto w-full max-w-[900px] rounded-2xl" />
        ))}
      </div>
    </section>
  );
}

function ContactDetails({ d, asH1 }: BlockProps) {
  return (
    <section className="py-14">
      <div className="container-site grid gap-10 lg:grid-cols-2">
        <div>
          {d.heading && <PageHeading asH1={asH1} className="text-3xl md:text-4xl mb-4">{d.heading}</PageHeading>}
          {d.text && <MiniMarkdown text={d.text} className="mb-6" />}
          <ul className="space-y-3 text-primary font-medium">
            {d.phoneDisplay && <li><a href={`tel:${d.phone}`} className="hover:text-accent">📞 {d.phoneDisplay}</a></li>}
            {d.email && <li><a href={`mailto:${d.email}`} className="hover:text-accent">✉️ {d.email}</a></li>}
            {d.address && <li className="whitespace-pre-line">📍 {d.address}</li>}
          </ul>
        </div>
        <div>
          <h3 className="text-2xl mb-4">{d.formHeading || "Stuur ons een bericht"}</h3>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}

/* ---------- Opbouw naar acture.nl: hero, pijlers, index, over ons, cijfers, inzichten ---------- */

function HeroStatement({ d, asH1 }: BlockProps) {
  const logos = ((d.logos as any[]) || []).filter((l) => l?.image);
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-soft via-white to-white">
      <div className="container-site grid items-center gap-14 pb-14 pt-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:pb-20 lg:pt-20">
        <div>
          {d.eyebrow && (
            <p className="eyebrow mb-5 flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-secondary" aria-hidden />
              {d.eyebrow}
            </p>
          )}
          <PageHeading asH1={asH1}
            className="mb-6 whitespace-pre-line text-[2.6rem] font-extrabold leading-[1.04] tracking-[-0.025em] sm:text-6xl lg:text-[4.2rem]">
            <Highlighted text={d.heading || ""} highlight={d.highlight} />
          </PageHeading>
          {d.text && <MiniMarkdown text={d.text} className="mb-9 max-w-[570px] text-[19px] md:text-[20px]" />}
          <div className="flex flex-wrap gap-3">
            <BtnLink b={d.button} arrow />
            <BtnLink b={d.button2} />
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[500px]">
          {d.image ? (
            <>
              <div className="absolute -right-3 -top-4 h-full w-full rounded-[44px] bg-[#e9e7f7] sm:-right-5 sm:-top-5" aria-hidden />
              <SiteImage src={d.image} alt={d.imageAlt || ""} priority sizes="(min-width: 1024px) 500px, 100vw"
                className="relative aspect-[5/5.4] w-full rounded-[44px] object-cover shadow-[0_30px_60px_-30px_rgba(34,32,90,0.45)]" />
              <DotCloud animate outline className="absolute -bottom-10 -left-3 w-[40%] sm:-bottom-12 sm:-left-12 sm:w-[44%]" />
              {d.badge && (
                <p className="absolute -right-2 top-8 max-w-[220px] rounded-2xl bg-white px-4 py-3 text-[14.5px] font-semibold leading-snug text-primary shadow-[0_16px_36px_-18px_rgba(34,32,90,0.4)] sm:-right-6">
                  <span className="mb-1 flex gap-1" aria-hidden>
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-blue" />
                    <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-pink" />
                  </span>
                  {d.badge}
                </p>
              )}
            </>
          ) : (
            <DotCloud animate className="w-full" />
          )}
        </div>
      </div>

      {logos.length > 0 && (
        <div className="container-site pb-12 lg:pb-14">
          <div className="flex flex-col gap-6 border-t border-primary/10 pt-8 md:flex-row md:items-center md:gap-12">
            {d.logosLabel && <p className="shrink-0 text-[15px] font-medium text-primary/70">{d.logosLabel}</p>}
            <ul className="flex flex-wrap items-center gap-x-10 gap-y-5">
              {logos.map((l, i) => (
                <li key={`${l.image}-${i}`}>
                  <SiteImage src={l.image} alt={l.alt || ""} sizes="160px" widths={[160, 320]}
                    className="h-12 w-auto max-w-[150px] object-contain opacity-60 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * De drie pijlers. De inhoud (titel, tekst, diensten) komt uit PIJLERS in
 * nav.ts — dezelfde bron als het megamenu en de footer, zodat die drie nooit
 * uit elkaar lopen. Het blok zelf regelt alleen de kop erboven.
 */
function Pillars({ d, asH1 }: BlockProps) {
  return (
    <section className="bg-soft py-16 md:py-24">
      <div className="container-site">
        <div className="mb-12 grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
          <SectionHead d={{ eyebrow: d.eyebrow, heading: d.heading }} asH1={asH1} />
          {d.text && <MiniMarkdown text={d.text} className="text-[19px] lg:pb-5" />}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {PIJLERS.map((p) => (
            <article key={p.key} style={kleurVars(p.kleur)}
              className="lift flex flex-col rounded-[28px] border border-black/[0.05] bg-white p-7 md:p-8">
              <div className="mb-7 grid h-[72px] w-[72px] place-items-center rounded-[22px] bg-[var(--k-zacht)] text-[30px] text-[var(--k)]">
                <Icon name={p.icon} />
              </div>
              <h3 className="mb-3 text-[28px]">{p.title}</h3>
              <p className="mb-8 text-[17px]">{p.text}</p>
              <ul className="mt-auto divide-y divide-black/[0.06] border-t border-black/[0.06]">
                {p.diensten.map((x) => (
                  <li key={x.href} style={kleurVars(x.kleur)}>
                    <Link href={x.href}
                      className="group flex items-center justify-between gap-3 py-3.5 font-semibold text-primary transition-colors hover:text-[var(--k)]">
                      <span className="flex items-center gap-2.5">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--k-vlak)]" aria-hidden />
                        {x.label}
                      </span>
                      <Arrow className="shrink-0 transition-transform group-hover:translate-x-1" />
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

/** "Ontdek React2u": alle onderwerpen als tegels, elk in de kleur van zijn dienst. */
function LinkIndex({ d, asH1 }: BlockProps) {
  const items = ((d.items as any[]) || []).filter((it) => it?.label && it?.href);
  return (
    <section className="py-16 md:py-24">
      <div className="container-site grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHead d={d} asH1={asH1} />
          {d.button?.label && <div className="mt-8"><BtnLink b={d.button} arrow /></div>}
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((it, i) => (
            <li key={`${it.href}-${i}`} style={kleurVars(it.kleur)}>
              <Link href={it.href}
                className="group flex h-full items-center justify-between gap-4 rounded-2xl border border-black/[0.07] bg-white px-5 py-4 font-semibold text-primary transition-colors hover:border-[var(--k-vlak)] hover:bg-[var(--k-zacht)]">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--k-vlak)]" aria-hidden />
                  <span className="min-w-0 hyphens-auto break-words">{it.label}</span>
                </span>
                <Arrow className="shrink-0 text-[var(--k)] transition-transform group-hover:translate-x-1" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** "Over React2u": beeld naast tekst, met een citaat eronder. */
function About({ d, asH1 }: BlockProps) {
  return (
    <section className="py-16 md:py-24">
      <div className="container-site grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {d.image && (
          <div className="relative">
            <div className="absolute -left-4 -top-4 h-full w-full rounded-[40px] bg-secondary/10" aria-hidden />
            <SiteImage src={d.image} alt={d.imageAlt || ""} sizes="(min-width: 1024px) 560px, 100vw"
              className="relative w-full rounded-[40px] bg-[#f3f3f6] object-contain" />
          </div>
        )}
        <div>
          <SectionHead d={d} asH1={asH1} />
          {d.button?.label && <div className="mt-8"><BtnLink b={d.button} arrow /></div>}
          {d.quote && (
            <figure className="relative mt-10 rounded-[28px] bg-soft p-7 pl-8 md:p-8 md:pl-10">
              <span className="absolute left-7 top-1 font-heading text-[72px] leading-none text-accent md:left-9" aria-hidden>“</span>
              <blockquote className="mt-7 font-heading text-[21px] font-bold leading-snug text-primary md:text-[23px]">
                {d.quote}
              </blockquote>
              {(d.quoteName || d.quoteRole) && (
                <figcaption className="mt-4 text-[15.5px]">
                  {d.quoteName && <strong className="font-semibold text-primary">{d.quoteName}</strong>}
                  {d.quoteName && d.quoteRole && " · "}
                  {d.quoteRole}
                </figcaption>
              )}
            </figure>
          )}
        </div>
      </div>
    </section>
  );
}

const FEIT_KLEUREN: Kleur[] = ["roze", "teal", "blauw", "oranje", "rood"];

/**
 * "In één oogopslag": een bento-raster op donker indigo. Een item met `value`
 * wordt een cijferkaart, een item met `image` een beeldkaart over twee rijen,
 * de rest een tekstkaart.
 */
function Facts({ d, asH1 }: BlockProps) {
  const items = (d.items as any[]) || [];
  return (
    <section className="on-dark relative isolate overflow-hidden bg-primary py-16 text-white/75 md:py-24">
      <div className="container-site">
        <div className="mb-12 grid gap-6 lg:grid-cols-2 lg:items-end">
          <SectionHead d={{ eyebrow: d.eyebrow, heading: d.heading }} asH1={asH1} dark />
          {d.text && <MiniMarkdown text={d.text} className="text-[19px] text-white/75 lg:pb-5" />}
        </div>
        <div className="grid auto-rows-[minmax(200px,auto)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => {
            if (it.image) {
              return (
                <figure key={i} className="relative overflow-hidden rounded-[28px] bg-primary-deep sm:row-span-2">
                  <SiteImage src={it.image} alt={it.imageAlt || ""} sizes="(min-width: 1024px) 400px, 50vw"
                    className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-deep via-primary-deep/40 to-transparent" aria-hidden />
                  <figcaption className="relative flex h-full min-h-[340px] flex-col justify-end p-7">
                    {it.title && <h3 className="mb-2 text-[24px] !text-white">{it.title}</h3>}
                    {it.text && <p className="text-[16px] text-white/85">{it.text}</p>}
                  </figcaption>
                </figure>
              );
            }
            if (it.value) {
              return (
                <div key={i} style={kleurVars(FEIT_KLEUREN[i % FEIT_KLEUREN.length])}
                  className="flex flex-col rounded-[28px] border border-white/10 bg-white/[0.06] p-7">
                  <span className="mb-5 h-1.5 w-10 rounded-full bg-[var(--k-vlak)]" aria-hidden />
                  <p className="font-heading text-[2.9rem] font-extrabold leading-none tracking-[-0.02em] text-white">{it.value}</p>
                  {it.title && <h3 className="mb-2 mt-2 text-[19px] !text-white">{it.title}</h3>}
                  {it.text && <p className="text-[15.5px] leading-relaxed">{it.text}</p>}
                </div>
              );
            }
            return (
              <div key={i} className="flex flex-col rounded-[28px] bg-white p-7 text-body">
                {it.title && <h3 className="mb-3 text-[24px]">{it.title}</h3>}
                {it.text && <p className="text-[16px]">{it.text}</p>}
              </div>
            );
          })}
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
    <section className="py-16 md:py-24">
      <div className="container-site">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHead d={d} asH1={asH1} className="max-w-[640px]" />
          {d.button?.label && <div className="shrink-0 md:pb-5"><BtnLink b={{ ...d.button, style: "outline" }} arrow /></div>}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((p) => (
            <article key={p.id} className="lift group relative flex flex-col overflow-hidden rounded-[24px] border border-black/[0.06] bg-white">
              <div className="aspect-[16/10] overflow-hidden bg-soft">
                {p.cover_image ? (
                  <SiteImage src={p.cover_image} alt="" sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw"
                    widths={[480, 800]} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                ) : (
                  <div className="grid h-full place-items-center"><DotCloud className="w-24 opacity-60" /></div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-6">
                {p.published_at && <p className="mb-2 text-[14px] text-primary/60">{fmtDatum(p.published_at)}</p>}
                <h3 className="mb-4 text-[21px] leading-snug">
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
        return <Cmp key={b.id} d={b.data} asH1={i === h1Index} ctx={ctx} />;
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
