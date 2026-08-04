import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import BlockRenderer from "@/components/blocks/BlockRenderer";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const res = await getPage("home");
  const title = res?.page.seo_title || "Home • React2u";
  return {
    title: { absolute: title },
    description: res?.page.seo_description || undefined,
    alternates: { canonical: "/" },
    // Zie (site)/[slug]/page.tsx: weglaten erft de defaults, `undefined` wist ze.
    ...(res?.page.og_image
      ? {
          openGraph: {
            type: "website" as const,
            siteName: "React2u",
            locale: "nl_NL",
            url: "/",
            title,
            description: res.page.seo_description || undefined,
            images: [res.page.og_image],
          },
        }
      : {}),
  };
}

export default async function HomePage() {
  const res = await getPage("home");
  if (!res) return <div className="container-site py-20">Content wordt nog ingericht.</div>;
  return (
    <>
      <BlockRenderer blocks={res.blocks} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
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
            sameAs: ["https://www.linkedin.com/company/react2u/"],
          }),
        }}
      />
    </>
  );
}
