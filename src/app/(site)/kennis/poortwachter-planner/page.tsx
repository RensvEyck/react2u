import type { Metadata } from "next";
import { Suspense } from "react";
import { breadcrumbLd, jsonLd } from "@/lib/jsonld";
import { openGraphVoor } from "@/lib/og";
import { hulpmiddelVoor } from "@/lib/kennis";
import { HulpmiddelKop, HulpmiddelVoet } from "@/components/kennis/Hulpmiddel";
import PoortwachterPlanner from "@/components/kennis/PoortwachterPlanner";

export const revalidate = 3600;

const h = hulpmiddelVoor("poortwachter-planner")!;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: h.seo_title },
    description: h.seo_description,
    alternates: { canonical: `/kennis/${h.slug}` },
    openGraph: await openGraphVoor({ pad: `/kennis/${h.slug}` }),
  };
}

/**
 * De Poortwachter-planner: de termijnen van de wet op datum (lib/poortwachter.ts).
 * De datum mag in de link staan (?datum=JJJJ-MM-DD), zodat een planner te
 * delen is; de pagina zelf blijft statisch, de browser leest de datum.
 */
export default function Pagina() {
  const crumbs = [{ label: "Werkgevers", href: "/werkgevers" }, { label: "Kennis", href: "/kennis" }, { label: h.naam, href: `/kennis/${h.slug}` }];
  return (
    <>
      <HulpmiddelKop h={h} />
      <div className="hv mx-auto w-full max-w-[1440px] px-5 py-12 md:px-10 md:py-16 lg:px-16 xl:px-[120px]">
        {/* useSearchParams in de planner vraagt een Suspense; de pagina zelf blijft statisch. */}
        <Suspense fallback={null}><PoortwachterPlanner /></Suspense>
      </div>
      <HulpmiddelVoet h={h} dienst="recover" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs)) }} />
    </>
  );
}
