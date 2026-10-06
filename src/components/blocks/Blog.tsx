import Link from "next/link";
import type { Post } from "@/lib/types";
import { MiniMarkdown } from "@/lib/md";
import { outfit } from "./HomeVerhaal";
import { NAVY, PINK, TEAL, BODY, MUTE, LINE, SOFT, LAV, kop, BREED, Eyebrow, Kruimels, Pijl } from "./Gedeeld";

/* eslint-disable @next/next/no-img-element */

/*
 * Blog en blogartikel (canvas: "Blog" en "Blogartikel"). De artikelen komen
 * uit de admin (tabel `posts`). Zonder artikelen toont het overzicht geen
 * voorbeeldartikelen, maar de weg naar de antwoorden die er al zijn.
 */

const ONDERWERPEN = [
  { label: "React2u Resist", titel: "Preventie", tekst: "Gezond werken en uitval voorkomen.", href: "/resist", kleur: TEAL, tint: "#E5F5F4" },
  { label: "React2u Recover", titel: "Verzuim", tekst: "Van ziekmelding tot herstel.", href: "/recover", kleur: PINK, tint: "#fef0f7" },
  { label: "React2u Restart", titel: "Re-integratie", tekst: "Nieuwe stappen, binnen of buiten.", href: "/restart", kleur: "#F19001", tint: "#FEF3E3" },
  { label: "React2u Reflex", titel: "Flex en Ziektewet", tekst: "Voor uitzenders en eigenrisicodragers.", href: "/reflex", kleur: "#3AA5DD", tint: "#E9F5FC" },
];

/** Leestijd in minuten, op 200 woorden per minuut. */
export function leestijd(p: Post): number {
  const woorden = `${p.excerpt || ""} ${p.body_md || ""}`.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(woorden / 200));
}

function datum(d: string | null) {
  return d ? new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : null;
}

function Kaart({ p }: { p: Post }) {
  return (
    <article className="group relative flex flex-col gap-3">
      <div className="aspect-[16/10] overflow-hidden rounded-[18px]" style={{ background: LAV }}>
        {p.cover_image && <img src={p.cover_image} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" loading="lazy" />}
      </div>
      {p.published_at && <span className="text-[13px] font-semibold" style={{ color: MUTE }}>{datum(p.published_at)}</span>}
      <h3 className={`${kop} m-0 text-[20px] leading-[1.25]`} style={{ color: NAVY }}>
        <Link href={`/blog/${p.slug}`} className="after:absolute after:inset-0">{p.title}</Link>
      </h3>
      {p.excerpt && <p className="m-0 text-[15px] leading-[1.6]" style={{ color: BODY }}>{p.excerpt}</p>}
      <span className="mt-auto flex items-center justify-between border-t pt-3 text-[13.5px]" style={{ borderColor: LINE, color: MUTE }}>
        {leestijd(p)} min lezen<span style={{ color: NAVY }}><Pijl size={14} /></span>
      </span>
    </article>
  );
}

function Onderwerpen() {
  return (
    <section aria-label="Per onderwerp" style={{ background: SOFT }}>
      <div className={`${BREED} flex flex-col gap-10 py-20 md:py-24`}>
        <div className="grid gap-5 lg:grid-cols-12 lg:items-end">
          <h2 className={`${kop} m-0 text-[32px] leading-[1.1] tracking-[-0.9px] md:text-[40px] lg:col-span-7`} style={{ color: NAVY }}>Lees per onderwerp</h2>
          <p className="m-0 text-[16px] leading-[1.7] lg:col-span-4 lg:col-start-9" style={{ color: BODY }}>Elk onderwerp hoort bij een van onze specialismen. Zo vind je snel wat je zoekt.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ONDERWERPEN.map((o) => (
            <Link key={o.href} href={o.href} className="hv-btn relative flex flex-col gap-2 overflow-hidden rounded-[22px] p-6" style={{ background: o.tint }}>
              <span aria-hidden className="absolute right-[-36px] top-[-36px] h-[110px] w-[110px] rounded-full" style={{ background: o.kleur, opacity: 0.16 }} />
              <span className="text-[13px] font-bold" style={{ color: o.kleur }}>{o.label}</span>
              <span className={`${kop} text-[22px]`} style={{ color: NAVY }}>{o.titel}</span>
              <span className="text-[15px] leading-[1.55]" style={{ color: BODY }}>{o.tekst}</span>
              <span className="mt-2 inline-flex items-center gap-2 text-[14.5px] font-bold" style={{ color: NAVY }}>Meer over {o.titel.toLowerCase()}<Pijl size={14} /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BlogOverzicht({ posts }: { posts: Post[] }) {
  const [uitgelicht, ...rest] = posts;
  return (
    <div className={`hv ${outfit.variable} bg-white`}>
      <section aria-label="Blog en kennis" className={`${BREED} grid gap-10 pb-16 pt-10 md:pt-14 lg:grid-cols-12 lg:items-center lg:gap-6`}>
        <div className="flex flex-col gap-6 lg:col-span-5">
          <Kruimels items={[{ label: "Home", href: "/" }, { label: "Blog" }]} />
          <Eyebrow>Blog en kennis</Eyebrow>
          <h1 className={`${kop} m-0 text-[48px] leading-[0.98] tracking-[-1.8px] md:text-[72px] md:tracking-[-2.4px]`} style={{ color: NAVY }}>
            Verzuim,<br />helder uitgelegd
          </h1>
          <p className="m-0 text-[17px] leading-[1.65] md:text-[18px]" style={{ color: BODY }}>
            Praktische artikelen over ziekte, re-integratie en gezond werken. Voor werkgevers én werknemers.
          </p>
        </div>
        {uitgelicht ? (
          <Link href={`/blog/${uitgelicht.slug}`} className="group relative flex min-h-[380px] flex-col justify-end overflow-hidden rounded-[28px] p-7 md:p-10 lg:col-span-7" style={{ background: NAVY }}>
            {uitgelicht.cover_image && <img src={uitgelicht.cover_image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60 transition duration-700 group-hover:scale-[1.03]" />}
            <span aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(50,46,131,0) 20%, rgba(50,46,131,0.92) 85%)" }} />
            <span className="absolute left-6 top-6 rounded-full bg-white px-3 py-1.5 text-[13px] font-bold" style={{ color: NAVY }}>Uitgelicht</span>
            <span className="relative flex flex-col gap-3">
              <span className="text-[13px] font-bold uppercase tracking-[1.4px]" style={{ color: "rgba(255,255,255,0.75)" }}>{leestijd(uitgelicht)} min lezen</span>
              <span className={`${kop} text-[28px] leading-[1.15] md:text-[36px]`} style={{ color: "#ffffff" }}>{uitgelicht.title}</span>
              {uitgelicht.excerpt && <span className="max-w-[520px] text-[16px] leading-[1.6]" style={{ color: "rgba(255,255,255,0.85)" }}>{uitgelicht.excerpt}</span>}
              <span className="inline-flex items-center gap-2 text-[15px] font-bold" style={{ color: "#ffffff" }}>Lees artikel<Pijl /></span>
            </span>
          </Link>
        ) : (
          <div className="flex flex-col gap-4 rounded-[28px] p-8 md:p-10 lg:col-span-7" style={{ background: LAV }}>
            <span className={`${kop} text-[26px] leading-[1.2] md:text-[30px]`} style={{ color: NAVY }}>Binnenkort verschijnen hier onze eerste artikelen</span>
            <span className="text-[16.5px] leading-[1.65]" style={{ color: BODY }}>Tot die tijd beantwoorden we je vragen graag persoonlijk. En misschien staat het antwoord er al tussen.</span>
            <div className="flex flex-wrap gap-2.5 pt-2">
              <Link href="/verzuimprotocol" className="hv-btn hv-btn-roze inline-flex h-[50px] items-center gap-2.5 rounded-full px-6 text-[15px] font-bold">Ziek, wat nu?<Pijl /></Link>
              <Link href="/werkgevers#vragen" className="hv-btn hv-btn-rand inline-flex h-[50px] items-center gap-2.5 rounded-full px-6 text-[15px] font-bold">Vragen van werkgevers<Pijl /></Link>
            </div>
          </div>
        )}
      </section>
      {rest.length > 0 && (
        <section aria-label="Artikelen" className={`${BREED} flex flex-col gap-8 border-t pb-20 pt-10 md:pb-24`} style={{ borderColor: LINE }}>
          <h2 className={`${kop} m-0 text-[28px]`} style={{ color: NAVY }}>Alle artikelen</h2>
          <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => <Kaart key={p.id} p={p} />)}
          </div>
        </section>
      )}
      <Onderwerpen />
    </div>
  );
}

/** Splitst de markdown op "## "-koppen, zodat de inhoudsopgave naar de juiste plek springt. */
function secties(md: string) {
  const delen: { kop: string | null; id: string | null; tekst: string }[] = [];
  let huidig: { kop: string | null; id: string | null; tekst: string } = { kop: null, id: null, tekst: "" };
  for (const regel of (md || "").split("\n")) {
    const m = regel.match(/^##\s+(.+)$/);
    if (m) {
      delen.push(huidig);
      const kopTekst = m[1].trim();
      huidig = { kop: kopTekst, id: kopTekst.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), tekst: "" };
    } else {
      huidig.tekst += `${regel}\n`;
    }
  }
  delen.push(huidig);
  return delen.filter((d) => d.kop || d.tekst.trim());
}

export function BlogArtikel({ p, andere }: { p: Post; andere: Post[] }) {
  const delen = secties(p.body_md || "");
  const inhoud = delen.filter((d) => d.kop);
  return (
    <div className={`hv ${outfit.variable} bg-white`}>
      <section aria-label="Artikel" className="pb-12 pt-10 md:pb-14 md:pt-14" style={{ background: "linear-gradient(180deg, #F6F5FB 0%, #ffffff 100%)" }}>
        <div className={`${BREED} flex flex-col gap-5`}>
          <Kruimels items={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: p.title }]} />
          <h1 className={`${kop} m-0 max-w-[900px] text-[38px] leading-[1.05] tracking-[-1.2px] md:text-[56px] md:tracking-[-1.6px]`} style={{ color: NAVY }}>{p.title}</h1>
          <span className="flex flex-wrap gap-x-4 gap-y-1 text-[14.5px]" style={{ color: MUTE }}>
            <strong style={{ color: NAVY }}>{p.author || "Team React2u"}</strong>
            <span>{leestijd(p)} minuten lezen</span>
            {p.published_at && <span>{datum(p.published_at)}</span>}
          </span>
        </div>
      </section>
      {p.cover_image && (
        <div className={`${BREED} pb-4`}>
          <img src={p.cover_image} alt="" className="max-h-[520px] w-full rounded-[24px] object-cover" />
        </div>
      )}
      <section aria-label="Inhoud" className={`${BREED} grid gap-10 py-12 md:py-16 lg:grid-cols-12 lg:gap-6`}>
        {inhoud.length > 1 && (
          <nav aria-label="In dit artikel" className="h-fit lg:sticky lg:top-[calc(var(--hh,96px)+24px)] lg:col-span-3">
            <span className="mb-3 block text-[13px] font-bold" style={{ color: MUTE }}>In dit artikel</span>
            <ul className="m-0 flex list-none flex-col border-l-2 p-0" style={{ borderColor: LINE }}>
              {inhoud.map((d) => (
                <li key={d.id}><a href={`#${d.id}`} className="-ml-0.5 block border-l-2 border-transparent py-2 pl-4 text-[14.5px] font-semibold hover:border-[#322E83]" style={{ color: NAVY }}>{d.kop}</a></li>
              ))}
            </ul>
          </nav>
        )}
        <article className={`flex flex-col gap-6 ${inhoud.length > 1 ? "lg:col-span-7 lg:col-start-5" : "lg:col-span-8 lg:col-start-3"}`} style={{ color: BODY }}>
          {p.excerpt && <p className="m-0 text-[19px] leading-[1.7] md:text-[20px]" style={{ color: NAVY }}>{p.excerpt}</p>}
          {delen.map((d, i) => (
            <div key={i} className="flex flex-col gap-4">
              {d.kop && <h2 id={d.id || undefined} className={`${kop} m-0 scroll-mt-28 text-[26px] leading-[1.2] md:text-[28px]`} style={{ color: NAVY }}>{d.kop}</h2>}
              <MiniMarkdown text={d.tekst} className="text-[17px] leading-[1.75]" />
            </div>
          ))}
          <div className="mt-4 flex flex-col gap-5 rounded-[24px] p-7 md:flex-row md:items-center md:justify-between" style={{ background: LAV }}>
            <span className="flex flex-col gap-1">
              <span className={`${kop} text-[21px]`} style={{ color: NAVY }}>Hulp nodig bij een dossier?</span>
              <span className="text-[15.5px]" style={{ color: BODY }}>We kijken graag met je mee, ook als je nog geen klant bent.</span>
            </span>
            <Link href="/kennismaken" className="hv-btn hv-btn-roze inline-flex h-[52px] items-center gap-2.5 self-start rounded-full px-6 text-[15px] font-bold md:self-auto">Kennismaken<Pijl /></Link>
          </div>
        </article>
      </section>
      {andere.length > 0 && (
        <section aria-label="Lees ook" style={{ background: SOFT }}>
          <div className={`${BREED} flex flex-col gap-8 py-20 md:py-24`}>
            <div className="flex flex-col gap-4">
              <Eyebrow kleur={TEAL}>Lees ook</Eyebrow>
              <h2 className={`${kop} m-0 text-[32px] tracking-[-0.9px] md:text-[40px]`} style={{ color: NAVY }}>Meer over verzuim</h2>
            </div>
            <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {andere.slice(0, 3).map((a) => <Kaart key={a.id} p={a} />)}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/* ---------- 404 ---------- */

const STIPPEN_BOVEN = [[44, 0, TEAL], [64, 10, TEAL], [80, 26, TEAL], [20, 30, "#3AA5DD"], [42, 30, "#3AA5DD"], [62, 40, "#3AA5DD"], [100, 26, NAVY]] as const;
const STIPPEN_ONDER = [[10, 0, "#F19001"], [34, 6, PINK], [60, 4, "#CB152B"], [80, 10, "#CB152B"], [98, 6, "#CB152B"], [116, 0, "#CB152B"], [12, 22, "#F19001"], [44, 20, PINK], [64, 30, PINK], [84, 34, PINK]] as const;

export function NietGevonden404() {
  return (
    <section data-niet-gevonden aria-label="Pagina niet gevonden" className={`hv ${outfit.variable}`} style={{ background: "linear-gradient(180deg, #F6F5FB 0%, #ffffff 70%)" }}>
      <div className="mx-auto flex max-w-[720px] flex-col items-center gap-6 px-5 pb-24 pt-16 text-center md:pb-32 md:pt-20">
        <Eyebrow kleur={TEAL}>Pagina niet gevonden</Eyebrow>
        <div aria-hidden className="relative h-[60px] w-[130px]">
          {STIPPEN_BOVEN.map(([x, y, c], i) => <span key={i} className="absolute h-[14px] w-[14px] rounded-full" style={{ left: x, top: y, background: c }} />)}
        </div>
        <h1 className={`${kop} m-0 text-[120px] leading-[0.9] tracking-[-4px] md:text-[150px]`} style={{ color: NAVY }}>404</h1>
        <div aria-hidden className="relative h-[50px] w-[130px]">
          {STIPPEN_ONDER.map(([x, y, c], i) => <span key={i} className="absolute h-[14px] w-[14px] rounded-full" style={{ left: x, top: y, background: c }} />)}
        </div>
        <p className="m-0 text-[18px] leading-[1.6]" style={{ color: BODY }}>
          De pagina die je zoekt bestaat niet (meer) of is verplaatst. Geen zorgen, we helpen je graag verder.
        </p>
        <p className="m-0 text-[15.5px]" style={{ color: BODY }}><strong style={{ color: NAVY }}>Deze pagina is even kwijt, wij niet.</strong> Ga terug naar de homepage of neem contact op.</p>
        <div className="flex flex-wrap justify-center gap-2.5 pt-2">
          <Link href="/" className="hv-btn hv-btn-roze inline-flex h-[52px] items-center gap-2.5 rounded-full px-6 text-[15px] font-bold">Naar de homepage<Pijl /></Link>
          <Link href="/contact" className="hv-btn hv-btn-rand inline-flex h-[52px] items-center gap-2.5 rounded-full px-6 text-[15px] font-bold">Contact<Pijl /></Link>
        </div>
      </div>
    </section>
  );
}
