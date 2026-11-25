import Link from "next/link";
import type { Post } from "@/lib/types";
import { outfit } from "@/components/blocks/HomeVerhaal";
import { NAVY, BODY, MUTE, LINE, SOFT, kop, BREED, Eyebrow, Kruimels, Pijl } from "@/components/blocks/Gedeeld";
import { GidsenRij } from "@/components/blocks/Gids";
import { ArtikelKaart } from "@/components/blocks/Blog";
import { DIENST_KLEUR, DIENST_TINT, gidsenBijOnderwerp } from "@/lib/gidsen";
import { DIENSTEN } from "@/lib/organisatie";
import { inkt } from "@/lib/kleur";
import { ONDERWERPEN, artikelenBij, hulpmiddelenBij, type Onderwerp } from "@/lib/kennis";
import { HulpmiddelKaart } from "./Hulpmiddel";

/*
 * Een onderwerp van de kennisbank (/kennis/<onderwerp>): de gidsen die
 * eronder hangen, de hulpmiddelen, de artikelen en de dienst die erbij hoort.
 * De pagina die de kracht van het cluster bundelt en terug linkt naar de
 * dienst; de gidsen linken via het kruimelpad en "Lees ook" weer hierheen.
 */

export default function OnderwerpPagina({ onderwerp, posts }: { onderwerp: Onderwerp; posts: Post[] }) {
  const gidsen = gidsenBijOnderwerp(onderwerp.slug);
  const hulpmiddelen = hulpmiddelenBij(onderwerp.slug);
  const artikelen = artikelenBij(posts, onderwerp.slug);
  const c = DIENST_KLEUR[onderwerp.dienst];
  const t = DIENST_TINT[onderwerp.dienst];
  const tc = inkt(c);
  const d = DIENSTEN[onderwerp.dienst];
  const andere = ONDERWERPEN.filter((o) => o.slug !== onderwerp.slug);
  return (
    <div className={`hv ${outfit.variable} bg-white`} style={{ color: NAVY }}>
      <section aria-label={onderwerp.naam} className="px-[6px] pt-4 md:px-10 md:pt-8 xl:mx-auto xl:max-w-[1280px]">
        <div className="relative overflow-hidden rounded-[28px] px-6 py-10 md:rounded-[36px] md:p-14 lg:p-16" style={{ background: t }}>
          <span aria-hidden className="absolute right-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full md:h-[520px] md:w-[520px]" style={{ background: c, opacity: 0.12 }} />
          <div className="relative flex max-w-[820px] flex-col gap-5 md:gap-6">
            <Kruimels items={[{ label: "Home", href: "/" }, { label: "Werkgevers", href: "/werkgevers" }, { label: "Kennis", href: "/kennis" }, { label: onderwerp.naam }]} />
            <span className="inline-flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: tc }}>
              <span className="h-2 w-2 rounded-full" style={{ background: c }} />Kennisbank · {onderwerp.naam}
            </span>
            <h1 className={`${kop} m-0 text-[36px] leading-[1.04] tracking-[-1.2px] hyphens-auto [overflow-wrap:anywhere] md:text-[52px] md:tracking-[-1.6px]`} lang="nl">{onderwerp.kop}</h1>
            <p className="m-0 max-w-[720px] text-[18px] leading-[1.6] md:text-[20px]" style={{ color: BODY }}>{onderwerp.tekst}</p>
            <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-[14.5px] font-bold" style={{ color: MUTE }} aria-label="Inhoud">
              <li>{gidsen.length} {gidsen.length === 1 ? "gids" : "gidsen"}</li>
              <li>{hulpmiddelen.length} hulpmiddelen</li>
              <li>{artikelen.length} {artikelen.length === 1 ? "artikel" : "artikelen"}</li>
            </ul>
          </div>
        </div>
      </section>

      {gidsen.length > 0 && (
        <section aria-label="Gidsen" className={`${BREED} flex flex-col gap-7 pt-14 md:pt-[104px]`}>
          <div className="flex flex-col gap-3">
            <Eyebrow kleur={tc}>Gidsen</Eyebrow>
            <h2 className={`${kop} m-0 text-[30px] leading-[1.1] tracking-[-0.8px] md:text-[40px]`}>Eén vraag, volledig beantwoord</h2>
          </div>
          <GidsenRij lijst={gidsen} label={`Gidsen over ${onderwerp.naam}`} />
        </section>
      )}

      <section aria-label="Hulpmiddelen" className={`${BREED} flex flex-col gap-7 pt-14 md:pt-[96px]`}>
        <div className="flex flex-col gap-3">
          <Eyebrow kleur="#007A6D">Hulpmiddelen</Eyebrow>
          <h2 className={`${kop} m-0 text-[30px] leading-[1.1] tracking-[-0.8px] md:text-[40px]`}>Meteen aan de slag</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {hulpmiddelen.map((h) => <HulpmiddelKaart key={h.slug} h={h} />)}
        </div>
      </section>

      {artikelen.length > 0 && (
        <section aria-label="Artikelen" className={`${BREED} flex flex-col gap-7 pt-14 md:pt-[96px]`}>
          <div className="flex flex-col gap-3">
            <Eyebrow>Artikelen</Eyebrow>
            <h2 className={`${kop} m-0 text-[30px] leading-[1.1] tracking-[-0.8px] md:text-[40px]`}>Uit de praktijk</h2>
          </div>
          <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {artikelen.map((p) => <ArtikelKaart key={p.id} p={p} />)}
          </div>
        </section>
      )}

      <section aria-label="Zo helpt React2u" className="px-[6px] pt-14 md:px-10 md:pt-[96px] xl:mx-auto xl:max-w-[1280px]">
        <div className="relative grid gap-8 overflow-hidden rounded-[28px] px-6 py-10 md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center lg:gap-16" style={{ background: t }}>
          <span aria-hidden className="absolute bottom-[-200px] left-[-140px] h-[460px] w-[460px] rounded-full" style={{ background: c, opacity: 0.1 }} />
          <div className="relative flex flex-col gap-4">
            <span className="inline-flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[1.6px]" style={{ color: tc }}>
              <span className="h-2 w-2 rounded-full" style={{ background: c }} />Zo helpt React2u
            </span>
            <h2 className={`${kop} m-0 text-[30px] leading-[1.1] tracking-[-0.8px] md:text-[38px]`}>Lezen is het begin. Regelen doen we samen.</h2>
            <p className="m-0 max-w-[600px] text-[16.5px] leading-[1.7]" style={{ color: BODY }}>Elke gids over {onderwerp.naam.toLowerCase()} hoort bij een dienst van React2u: één vaste casemanager, de bedrijfsarts en specialisten die het van je overnemen als je dat wilt.</p>
          </div>
          <div className="relative flex flex-col gap-2.5 rounded-[24px] bg-white p-6 md:p-7">
            <span className={`${kop} text-[19px] leading-[1.15]`}>React2u <span style={{ color: tc }}>{d.naam}</span></span>
            <span className="text-[15px] font-bold">{d.nl}</span>
            <Link href={`/${onderwerp.dienst}`} className="hv-btn hv-btn-roze mt-2 inline-flex h-[52px] items-center justify-center gap-2.5 rounded-full px-6 text-[15px] font-bold">Meer over React2u {d.naam}<Pijl /></Link>
            <Link href="/kennismaken" className="hv-btn hv-btn-rand inline-flex h-[52px] items-center justify-center gap-2.5 rounded-full px-6 text-[15px] font-bold">Kennismaken<Pijl /></Link>
          </div>
        </div>
      </section>

      <section aria-label="Andere onderwerpen" className={`${BREED} flex flex-col gap-5 py-14 md:py-[96px]`}>
        <h2 className={`${kop} m-0 text-[24px] tracking-[-0.5px] md:text-[28px]`}>Andere onderwerpen</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {andere.map((o) => (
            <Link key={o.slug} href={`/kennis/${o.slug}`} className="hv-btn flex flex-col gap-2 rounded-[22px] p-6 transition-transform duration-300 hover:-translate-y-1" style={{ background: SOFT, color: NAVY }}>
              <span className="text-[13px] font-bold uppercase tracking-[1.2px]" style={{ color: MUTE }}>{o.naam}</span>
              <span className={`${kop} text-[20px] leading-[1.25]`}>{o.kop}</span>
              <span className="mt-1 flex items-center gap-2 text-[14.5px] font-bold">Bekijk<Pijl size={14} /></span>
            </Link>
          ))}
        </div>
        <Link href="/kennis" className="inline-flex items-center gap-2 self-start border-t pt-5 text-[15px] font-bold" style={{ color: NAVY, borderColor: LINE }}>Terug naar de kennisbank<Pijl size={14} /></Link>
      </section>
    </div>
  );
}
