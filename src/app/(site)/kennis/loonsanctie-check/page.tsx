import type { Metadata } from "next";
import { breadcrumbLd, jsonLd } from "@/lib/jsonld";
import { openGraphVoor } from "@/lib/og";
import { hulpmiddelVoor } from "@/lib/kennis";
import { HulpmiddelKop, HulpmiddelVoet } from "@/components/kennis/Hulpmiddel";
import LoonsanctieCheck from "@/components/kennis/LoonsanctieCheck";

export const revalidate = 86400;

const h = hulpmiddelVoor("loonsanctie-check")!;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: h.seo_title },
    description: h.seo_description,
    alternates: { canonical: `/kennis/${h.slug}` },
    openGraph: await openGraphVoor({ pad: `/kennis/${h.slug}` }),
  };
}

/** De loonsanctie-check: twaalf vragen over het dossier (lib/loonsanctieCheck.ts). Niets wordt opgeslagen. */
export default function Pagina() {
  const crumbs = [{ label: "Werkgevers", href: "/werkgevers" }, { label: "Kennis", href: "/kennis" }, { label: h.naam, href: `/kennis/${h.slug}` }];
  return (
    <>
      <HulpmiddelKop h={h}>
        <p className="m-0 max-w-[720px] text-[15.5px] leading-[1.65]" style={{ color: "#67657F" }}>
          Een eerste indruk op basis van wat UWV bij de WIA-aanvraag bekijkt, geen oordeel van UWV. Je antwoorden blijven in je browser.
        </p>
      </HulpmiddelKop>
      <div className="hv mx-auto w-full max-w-[1440px] px-5 py-12 md:px-10 md:py-16 lg:px-16 xl:px-[120px]">
        <LoonsanctieCheck />
      </div>
      <HulpmiddelVoet h={h} dienst="recover" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs)) }} />
    </>
  );
}
