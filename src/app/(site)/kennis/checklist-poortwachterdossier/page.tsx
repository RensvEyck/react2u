import type { Metadata } from "next";
import { breadcrumbLd, jsonLd } from "@/lib/jsonld";
import { openGraphVoor } from "@/lib/og";
import { hulpmiddelVoor } from "@/lib/kennis";
import { CHECKLIST_AANTAL, CHECKLIST_GENUMMERD } from "@/lib/checklistPoortwachter";
import { HulpmiddelKop, HulpmiddelVoet } from "@/components/kennis/Hulpmiddel";
import ChecklistAanvraag from "@/components/kennis/ChecklistAanvraag";
import { NAVY, BODY, MUTE, LINE, SOFT, kop } from "@/components/blocks/Gedeeld";

export const revalidate = 86400;

const h = hulpmiddelVoor("checklist-poortwachterdossier")!;
const PDF = "/kennis/checklist-poortwachterdossier/pdf?download=1";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: h.seo_title },
    description: h.seo_description,
    alternates: { canonical: `/kennis/${h.slug}` },
    openGraph: await openGraphVoor({ pad: `/kennis/${h.slug}` }),
  };
}

/**
 * De checklist poortwachterdossier: de 24 punten staan op de pagina
 * (lib/checklistPoortwachter.ts) en als pdf (lib/checklistPdf.tsx), per
 * mail via het formulier of meteen als download.
 */
export default function Pagina() {
  const crumbs = [{ label: "Werkgevers", href: "/werkgevers" }, { label: "Kennis", href: "/kennis" }, { label: h.naam, href: `/kennis/${h.slug}` }];
  return (
    <>
      <HulpmiddelKop h={h} />
      <div className="hv mx-auto grid w-full max-w-[1440px] gap-10 px-5 py-12 md:px-10 md:py-16 lg:grid-cols-12 lg:gap-8 lg:px-16 xl:px-[120px]">
        <div className="flex flex-col gap-8 lg:col-span-7">
          <p className="m-0 max-w-[680px] text-[17px] leading-[1.7]" style={{ color: BODY }}>
            Bij de WIA-aanvraag beoordeelt UWV het re-integratieverslag: alles wat jij en je werknemer in twee jaar hebben gedaan. Ontbreekt er iets, dan kan een loonsanctie volgen van maximaal 52 weken. Dit zijn de {CHECKLIST_AANTAL} punten die UWV verwacht, per fase. Vink af wat in het dossier zit; wat ontbreekt, herstel je alsnog en dateer je eerlijk.
          </p>
          {CHECKLIST_GENUMMERD.map((fase) => (
            <section key={fase.titel} aria-label={fase.titel} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-3" style={{ borderColor: LINE }}>
                <h2 className={`${kop} m-0 text-[22px] md:text-[24px]`} style={{ color: NAVY }}>{fase.titel}</h2>
                <span className="text-[13.5px] font-bold uppercase tracking-[1px]" style={{ color: "#D4136A" }}>{fase.periode}</span>
              </div>
              <ol className="m-0 flex list-none flex-col p-0">
                {fase.punten.map((p) => (
                  <li key={p.tekst} className="flex gap-4 border-b py-3.5 last:border-b-0" style={{ borderColor: "#F0EFF6" }}>
                    <span aria-hidden className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-[7px] border-[1.5px] text-[11px] font-bold" style={{ borderColor: NAVY, color: MUTE }}>{p.nummer}</span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[16px] font-bold leading-[1.4]" style={{ color: NAVY }}>{p.tekst}</span>
                      {p.toelichting && <span className="text-[14.5px] leading-[1.5]" style={{ color: MUTE }}>{p.toelichting}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
          <p className="m-0 max-w-[680px] rounded-[18px] px-5 py-4 text-[15px] leading-[1.65]" style={{ background: SOFT, color: BODY }}>
            Twijfel je over een punt? Bel 085 620 58 00. We kijken mee met je dossier, ook als je nog geen klant bent.
          </p>
        </div>
        <aside className="h-fit lg:sticky lg:top-[calc(var(--hh,96px)+24px)] lg:col-span-5">
          <ChecklistAanvraag pdfHref={PDF} />
          <p className="m-0 mt-3 text-center text-[13.5px]" style={{ color: MUTE }}>
            Liever zonder mail? <a href={PDF} className="font-bold underline underline-offset-[3px]" style={{ color: NAVY }}>Download de pdf direct</a>.
          </p>
        </aside>
      </div>
      <HulpmiddelVoet h={h} dienst="recover" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs)) }} />
    </>
  );
}
