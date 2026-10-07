import type { Metadata } from "next";
import { getPage, getPublishedPosts } from "@/lib/content";
import BlockRenderer, { needsPosts } from "@/components/blocks/BlockRenderer";
import { jsonLd } from "@/lib/jsonld";
import { LINKEDIN_URL } from "@/lib/nav";
import { concept } from "@/lib/concept";
import { HOME_TITEL, metOmschrijving, omschrijving } from "@/lib/seo";
import { openGraphVoor } from "@/lib/og";
import { hreflangVoor } from "@/lib/taal";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const res = await getPage("home");
  // Zonder eigen SEO-titel een titel die zegt wat React2u is, niet "Home".
  const title = res?.page.seo_title || HOME_TITEL;
  return {
    title: { absolute: title },
    // Zonder eigen omschrijving erft de homepage de site-brede standaardtekst
    // uit (site)/layout.tsx; zie (site)/[slug]/page.tsx.
    ...metOmschrijving(omschrijving(res?.page.seo_description)),
    // Met hreflang naar /en zodra het startscherm er in het Engels is (lib/taal.ts).
    alternates: { canonical: "/", languages: hreflangVoor("/") ?? undefined },
    openGraph: await openGraphVoor({ pad: "/", afbeelding: res?.page.og_image }),
  };
}

export default async function HomePage() {
  const blocks = concept("home")?.blocks ?? (await getPage("home"))?.blocks;
  if (!blocks) return <div className="container-site py-20">Content wordt nog ingericht.</div>;
  const posts = needsPosts(blocks) ? await getPublishedPosts() : [];
  return (
    <>
      <BlockRenderer blocks={blocks} ctx={{ posts }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "React2u",
            alternateName: "R2U",
            url: process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl",
            logo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/wp/2023/05/Logo-kleur.svg`,
            telephone: "+31856205800",
            email: "info@react2u.nl",
            address: {
              "@type": "PostalAddress",
              streetAddress: "Stratumsedijk 29",
              postalCode: "5611 NB",
              addressLocality: "Eindhoven",
              addressCountry: "NL",
            },
            sameAs: [LINKEDIN_URL],
            image: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/wp/2023/05/Logo-kleur.svg`,
            openingHoursSpecification: [
              {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                opens: "09:00",
                closes: "17:00",
              },
            ],
          }),
        }}
      />
    </>
  );
}
