import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import BlockRenderer from "@/components/blocks/BlockRenderer";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const res = await getPage("home");
  return {
    title: { absolute: res?.page.seo_title || "Home • React2u" },
    description: res?.page.seo_description || undefined,
    openGraph: res?.page.og_image ? { images: [res.page.og_image] } : undefined,
    alternates: { canonical: "/" },
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
