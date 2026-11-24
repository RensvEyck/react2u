import Link from "next/link";
import { outfit } from "@/components/blocks/HomeVerhaal";
import { NAVY, BODY, MUTE, LINE, SOFT, LAV, kop, BREED, Eyebrow, Kruimels, Pijl, Knop } from "@/components/blocks/Gedeeld";
import { GidsenRij } from "@/components/blocks/Gids";
import { gidsenVan, voornaam, type Auteur } from "@/lib/auteurs";
import { ONDERWERPEN } from "@/lib/kennis";

/*
 * De auteurspagina (/auteur/<slug>): wie schreef de gidsen, wat is zijn of
 * haar functie en welke gidsen zijn van deze auteur. De pagina die de naam in
 * de kop van een gids en in de structured data (Person) onderbouwt.
 */

function initialen(naam: string): string {
  return naam.split(/\s+/).filter((w) => /^[A-Za-zÀ-ÿ]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

export default function AuteurPagina({ auteur }: { auteur: Auteur }) {
  const gidsen = gidsenVan(auteur.slug);
  const onderwerpen = ONDERWERPEN.filter((o) => auteur.onderwerpen.includes(o.slug));
  return (
    <div className={`hv ${outfit.variable} bg-white`} style={{ color: NAVY }}>
      <section aria-label={auteur.naam} className="px-[6px] pt-4 md:px-10 md:pt-8 xl:mx-auto xl:max-w-[1280px]">
        <div className="relative grid gap-8 overflow-hidden rounded-[28px] px-6 py-10 md:rounded-[36px] md:p-14 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:gap-16 lg:p-16" style={{ background: LAV }}>
          <span aria-hidden className="absolute right-[-120px] top-[-150px] h-[520px] w-[520px] rounded-full" style={{ background: NAVY, opacity: 0.07 }} />
          <div className="relative flex flex-col gap-5 md:gap-6">
            <Kruimels items={[{ label: "Home", href: "/" }, { label: "Werkgevers", href: "/werkgevers" }, { label: "Kennis", href: "/kennis" }, { label: auteur.naam }]} />
            <Eyebrow>Auteur</Eyebrow>
            <h1 className={`${kop} m-0 text-[40px] leading-[1.02] tracking-[-1.4px] md:text-[60px] md:tracking-[-2px]`}>{auteur.naam}</h1>
            <p className="m-0 text-[19px] font-semibold leading-[1.4] md:text-[22px]">{auteur.functie}{auteur.sinds ? <span className="font-normal" style={{ color: MUTE }}> · bij React2u sinds {auteur.sinds}</span> : null}</p>
            {auteur.bio.map((alinea, i) => (
              <p key={i} className="m-0 max-w-[680px] text-[16.5px] leading-[1.7] md:text-[17px]" style={{ color: BODY }}>{alinea}</p>
            ))}
            {auteur.registraties.length > 0 && (
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Registraties">
                {auteur.registraties.map((r) => (
                  <li key={r} className="rounded-full bg-white px-3.5 py-1.5 text-[13.5px] font-bold" style={{ color: NAVY }}>{r}</li>
                ))}
              </ul>
            )}
            {onderwerpen.length > 0 && (
              <div className="flex flex-col gap-2 border-t pt-5" style={{ borderColor: "rgba(50,46,131,0.12)" }}>
                <span className="text-[13px] font-bold uppercase tracking-[1.4px]" style={{ color: MUTE }}>Schrijft over</span>
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                  {onderwerpen.map((o) => (
                    <li key={o.slug}><Link href={`/kennis/${o.slug}`} className="hv-btn hv-btn-rand inline-flex min-h-[40px] items-center rounded-full px-4 text-[14px] font-bold">{o.naam}</Link></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="relative flex flex-col items-center gap-4 rounded-[24px] bg-white p-8 text-center">
            <span aria-hidden className={`${kop} grid h-[120px] w-[120px] place-items-center rounded-full text-[40px] text-white`} style={{ background: NAVY }}>{initialen(auteur.naam)}</span>
            <span className={`${kop} text-[22px] leading-[1.15]`}>{auteur.naam}</span>
            <span className="text-[15px]" style={{ color: MUTE }}>{auteur.functie}</span>
            <span className="text-[14px] leading-[1.5]" style={{ color: BODY }}>{gidsen.length} {gidsen.length === 1 ? "gids" : "gidsen"} in de kennisbank</span>
            {auteur.linkedin && <a href={auteur.linkedin} rel="noopener" className="text-[14.5px] font-bold underline underline-offset-[3px]" style={{ color: NAVY }}>LinkedIn</a>}
          </div>
        </div>
      </section>

      {gidsen.length > 0 && (
        <section aria-label={`Gidsen van ${voornaam(auteur)}`} className={`${BREED} flex flex-col gap-7 py-14 md:py-[104px]`}>
          <div className="grid gap-4 lg:grid-cols-12 lg:items-end lg:gap-6">
            <div className="flex flex-col gap-3 lg:col-span-7">
              <Eyebrow>Gidsen</Eyebrow>
              <h2 className={`${kop} m-0 text-[30px] leading-[1.1] tracking-[-0.8px] md:text-[40px]`}>Geschreven door {voornaam(auteur)}</h2>
            </div>
            <Link href="/kennis" className="inline-flex items-center gap-2 text-[16px] font-bold underline underline-offset-[5px] lg:col-span-4 lg:col-start-9 lg:justify-self-end" style={{ color: NAVY, textDecorationColor: "rgba(50,46,131,0.35)" }}>Naar de kennisbank<Pijl /></Link>
          </div>
          <GidsenRij lijst={gidsen} label={`Gidsen van ${voornaam(auteur)}`} />
        </section>
      )}

      <section aria-label="Zo werkt React2u" className="px-[6px] pb-6 md:px-10 xl:mx-auto xl:max-w-[1280px]">
        <div className="flex flex-col gap-5 rounded-[28px] px-6 py-10 md:flex-row md:items-center md:justify-between md:rounded-[36px] md:px-14 md:py-12" style={{ background: SOFT, border: `1px solid ${LINE}` }}>
          <div className="flex flex-col gap-2">
            <span className={`${kop} text-[26px] leading-[1.15] md:text-[32px]`}>Een vraag die niet in een gids staat?</span>
            <span className="max-w-[560px] text-[16px] leading-[1.6]" style={{ color: BODY }}>Bel van maandag tot en met vrijdag tussen 9.00 en 17.00 uur, dan neemt een van ons op. Ook als je nog geen klant bent.</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Knop href="/kennismaken">Kennismaken</Knop>
            <Knop href="/over-react2u" rand>Over React2u</Knop>
          </div>
        </div>
      </section>
    </div>
  );
}
