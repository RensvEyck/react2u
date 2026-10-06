import type { Metadata } from "next";
import { getPage, getPublishedPosts } from "@/lib/content";
import BlockRenderer, { needsPosts } from "@/components/blocks/BlockRenderer";
import { jsonLd } from "@/lib/jsonld";
import { LINKEDIN_URL } from "@/lib/nav";
import { concept } from "@/lib/concept";
import { kort } from "@/lib/seo";
import { hreflangVoor } from "@/lib/taal";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const res = await getPage("home");
  const title = res?.page.seo_title || "Home • React2u";
  const description = kort(res?.page.seo_description);
  return {
    title: { absolute: title },
    description,
    // Met hreflang naar /en zodra het startscherm er in het Engels is (lib/taal.ts).
    alternates: { canonical: "/", languages: hreflangVoor("/") ?? undefined },
    // Zie (site)/[slug]/page.tsx: weglaten erft de defaults, `undefined` wist ze.
    ...(res?.page.og_image
      ? {
          openGraph: {
            type: "website" as const,
            siteName: "React2u",
            locale: "nl_NL",
            url: "/",
            title,
            description,
            images: [res.page.og_image],
          },
        }
      : {}),
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
            "@type": "Organization",
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
          }),
        }}
      />
    </>
  );
}
