import Link from "next/link";
import type { Post } from "@/lib/types";
import { outfit } from "@/components/blocks/HomeVerhaal";
import { NAVY, BODY, MUTE, LINE, SOFT, LAV, kop, BREED, Eyebrow, Kruimels, Pijl, Knop } from "@/components/blocks/Gedeeld";
import { GidsenRij } from "@/components/blocks/Gids";
import { ArtikelKaart } from "@/components/blocks/Blog";
import { GIDSEN } from "@/lib/gidsen";
import { HULPMIDDELEN, ONDERWERPEN, gidsenPerOnderwerp, kennisItems, onderwerpVanArtikel } from "@/lib/kennis";
import KennisZoeker from "./KennisZoeker";
import { HulpmiddelKaart } from "./Hulpmiddel";

/*
 * De kennisbank (/kennis): het startpunt voor alles wat React2u uitlegt. Een
 * zoekveld bovenaan, de gidsen per onderwerp als pijlers, de hulpmiddelen en
 * de artikelen eronder. Vervangt sinds november 2026 het blogoverzicht
 * (/blog gaat met een 301 hierheen); de artikelen zelf blijven op /blog/<slug>.
 */

export default function KennisHub({ posts }: { posts: Post[] }) {
  const items = kennisItems(posts);
  const onderwerpen = ONDERWERPEN.map((o) => ({ slug: o.slug, naam: o.naam }));
  const stats = [
    [String(GIDSEN.length), "gidsen"],
    [String(HULPMIDDELEN.length), "hulpmiddelen"],
    [String(posts.length), posts.length === 1 ? "artikel" : "artikelen"],
    [String(ONDERWERPEN.length), "onderwerpen"],
  ];
  return (
    <div className={`hv ${outfit.variable} bg-white`} style={{ color: NAVY }}>
      <section aria-label="Kennisbank" className="px-[6px] pt-4 md:px-10 md:pt-8 xl:mx-auto xl:max-w-[1280px]">
        <div className="relative grid gap-8 overflow-hidden rounded-[28px] px-6 py-10 md:gap-10 md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center lg:gap-16 lg:p-16" style={{ background: LAV }}>
          <span aria-hidden className="absolute right-[-120px] top-[-150px] h-[520px] w-[520px] rounded-full" style={{ background: NAVY, opacity: 0.07 }} />
          <div className="relative flex flex-col gap-6">
            <Kruimels items={[{ label: "Home", href: "/" }, { label: "Werkgevers", href: "/werkgevers" }, { label: "Kennis" }]} />
            <Eyebrow>Kennisbank voor werkgevers</Eyebrow>
            <h1 className={`${kop} m-0 text-[44px] leading-[0.98] tracking-[-1.6px] md:text-[68px] md:tracking-[-2.2px]`}>Verzuim,<br />helder uitgelegd</h1>
            <p className="m-0 max-w-[600px] text-[17px] leading-[1.65] md:text-[19px]" style={{ color: BODY }}>
              Gidsen die één vraag volledig beantwoorden, hulpmiddelen die het dossier op orde houden en artikelen over wat werkgevers tegenkomen. Zonder jargon, met de wet erbij.
            </p>
            <KennisZoeker items={items} onderwerpen={onderwerpen} />
          </div>
          <div className="relative grid grid-cols-2 gap-px overflow-hidden rounded-[24px]" style={{ background: LINE }}>
            {stats.map(([g, l]) => (
              <div key={l} className="flex flex-col gap-1 bg-white px-5 py-5 md:px-7 md:py-6">
                <span className={`${kop} text-[32px] leading-none tracking-[-1px] md:text-[40px]`}>{g}</span>
                <span className="text-[14.5px]" style={{ color: MUTE }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {gidsenPerOnderwerp().map(({ onderwerp, gidsen }, i) => gidsen.length > 0 && (
        <section key={onderwerp.slug} aria-label={`Gidsen over ${onderwerp.naam}`} className={`${BREED} flex flex-col gap-7 ${i === 0 ? "pt-14 md:pt-[104px]" : "pt-12 md:pt-20"}`}>
          <div className="grid gap-4 lg:grid-cols-12 lg:items-end lg:gap-6">
            <div className="flex flex-col gap-3 lg:col-span-7">
              {i === 0 && <Eyebrow>Gidsen</Eyebrow>}
              <h2 className={`${kop} m-0 text-[28px] leading-[1.12] tracking-[-0.7px] md:text-[36px]`}>
                <Link href={`/kennis/${onderwerp.slug}`} className="hover:underline" style={{ textDecorationColor: "rgba(50,46,131,0.35)", textUnderlineOffset: 6 }}>{onderwerp.kop}</Link>
              </h2>
            </div>
            <Link href={`/kennis/${onderwerp.slug}`} className="inline-flex items-center gap-2 text-[16px] font-bold underline underline-offset-[5px] lg:col-span-4 lg:col-start-9 lg:justify-self-end" style={{ color: NAVY, textDecorationColor: "rgba(50,46,131,0.35)" }}>Alles over {onderwerp.naam.toLowerCase()}<Pijl /></Link>
          </div>
          <GidsenRij lijst={gidsen} label={`Gidsen over ${onderwerp.naam}`} />
        </section>
      ))}

      <section aria-label="Hulpmiddelen" className="mt-14 md:mt-[104px]" style={{ background: SOFT }}>
        <div className={`${BREED} flex flex-col gap-8 py-14 md:gap-10 md:py-[104px]`}>
          <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-6">
            <div className="flex flex-col gap-4 lg:col-span-7">
              <Eyebrow kleur="#007A6D">Hulpmiddelen</Eyebrow>
              <h2 className={`${kop} m-0 text-[32px] leading-[1.1] tracking-[-0.9px] md:text-[44px]`}>Niet alleen lezen, ook meteen doen</h2>
            </div>
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px] lg:col-span-4 lg:col-start-9" style={{ color: BODY }}>Drie hulpmiddelen voor het poortwachterdossier. Niets wordt opgeslagen; je gebruikt ze zo vaak je wilt.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {HULPMIDDELEN.map((h) => <HulpmiddelKaart key={h.slug} h={h} />)}
          </div>
        </div>
      </section>

      {posts.length > 0 && (
        <section aria-label="Artikelen" className={`${BREED} flex flex-col gap-8 py-14 md:py-[104px]`}>
          <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-6">
            <div className="flex flex-col gap-4 lg:col-span-7">
              <Eyebrow>Artikelen</Eyebrow>
              <h2 className={`${kop} m-0 text-[32px] leading-[1.1] tracking-[-0.9px] md:text-[44px]`}>Uit de praktijk van werkgevers</h2>
            </div>
            <p className="m-0 text-[16px] leading-[1.7] md:text-[17px] lg:col-span-4 lg:col-start-9" style={{ color: BODY }}>Kortere stukken over wat werkgevers tegenkomen: de kosten, de fouten, de keuzes. Elk artikel hoort bij een onderwerp.</p>
          </div>
          <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <div key={p.id} className="flex flex-col gap-2">
                <Link href={`/kennis/${onderwerpVanArtikel(p)}`} className="self-start text-[12.5px] font-bold uppercase tracking-[1px]" style={{ color: "#D4136A" }}>{ONDERWERPEN.find((o) => o.slug === onderwerpVanArtikel(p))?.naam}</Link>
                <ArtikelKaart p={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Contact" className="px-[6px] pb-6 md:px-10 xl:mx-auto xl:max-w-[1280px]">
        <div className="flex flex-col gap-5 rounded-[28px] px-6 py-10 md:flex-row md:items-center md:justify-between md:rounded-[36px] md:px-14 md:py-12" style={{ background: NAVY }}>
          <div className="flex flex-col gap-2">
            <span className={`${kop} text-[26px] leading-[1.15] md:text-[32px]`} style={{ color: "#ffffff" }}>Staat je vraag er niet bij?</span>
            <span className="max-w-[560px] text-[16px] leading-[1.6]" style={{ color: "rgba(255,255,255,0.8)" }}>Bel van maandag tot en met vrijdag tussen 9.00 en 17.00 uur, dan neemt een van ons op. Ook als je nog geen klant bent.</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Knop href="/kennismaken">Kennismaken</Knop>
            <a href="tel:+31856205800" className="hv-btn inline-flex h-[54px] items-center gap-2.5 rounded-full border-[1.5px] border-white/50 px-6 text-[15px] font-bold text-white hover:bg-white/10">085 620 58 00</a>
          </div>
        </div>
      </section>
    </div>
  );
}
