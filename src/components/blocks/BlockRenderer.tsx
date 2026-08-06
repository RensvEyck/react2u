import Link from "next/link";
import type { Block } from "@/lib/types";
import { MiniMarkdown } from "@/lib/md";
import Icon from "@/components/site/Icon";
import Accordion, { type FaqItem } from "@/components/site/Accordion";
import TypingHeadline from "@/components/site/TypingHeadline";
import LogoCarousel from "@/components/site/LogoCarousel";
import ContactForm from "@/components/site/ContactForm";
import { jsonLd } from "@/lib/jsonld";
import SiteImage from "@/components/site/SiteImage";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Btn = { label: string; href: string; style?: "accent" | "indigo" | "outline" };

type BlockProps = { d: any; asH1?: boolean };

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

function BtnLink({ b }: { b?: Btn }) {
  if (!b?.label) return null;
  const cls = b.style === "indigo" ? "btn btn-indigo" : b.style === "outline" ? "btn btn-outline" : "btn";
  const external = b.href?.startsWith("http") || b.href?.startsWith("tel:") || b.href?.startsWith("mailto:");
  if (external)
    return <a href={b.href} className={cls}>{b.label}</a>;
  return <Link href={b.href || "#"} className={cls}>{b.label}</Link>;
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
        <div className="rounded-[32px] bg-gradient-to-r from-primary to-[#4a46b0] px-8 py-12 text-center text-white md:px-16">
          {d.eyebrow && <p className="eyebrow !text-secondary mb-3">{d.eyebrow}</p>}
          {d.heading && <PageHeading asH1={asH1} className="text-3xl md:text-4xl !text-white mb-4">{d.heading}</PageHeading>}
          {d.text && <MiniMarkdown text={d.text} className="mx-auto max-w-[700px] text-white/85 mb-2" />}
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            {((d.buttons as Btn[]) || []).map((b, i) => <BtnLink key={i} b={b} />)}
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
            <div key={i} className="rounded-2xl bg-white p-7 shadow-sm border border-black/5">
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

function ValueCards({ d }: BlockProps) {
  const cards = (d.cards as any[]) || [];
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
]);

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

export default function BlockRenderer({ blocks }: { blocks: Block[] }) {
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
        return <Cmp key={b.id} d={b.data} asH1={i === h1Index} />;
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
