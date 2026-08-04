import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import VisitTracker from "@/components/site/VisitTracker";
import { getSetting, CONTACT_FALLBACK, type ContactInfo } from "@/lib/content";
import { normalizeDocs, normalizeCertificates } from "@/lib/nav";
import { normalizeSeoSettings } from "@/lib/seo";

export const revalidate = 300;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl";
const LOGO = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/wp/2023/07/cropped-cropped-Logo_react2u.png`;

// Zonder deze defaults tonen LinkedIn, WhatsApp en X een kale link zonder
// titel of afbeelding. Pagina's die hun eigen openGraph zetten winnen hiervan.
export async function generateMetadata(): Promise<Metadata> {
  const seo = normalizeSeoSettings(await getSetting<unknown>("seo"));
  const image = seo.share_image || LOGO;
  return {
    description: seo.description,
    // Bewust géén title/description in openGraph en twitter: laat Next die
    // afleiden uit de titel en omschrijving van de pagina zelf. Zetten we ze
    // hier hard, dan krijgt élke pagina "React2u" als deeltitel.
    openGraph: {
      type: "website",
      siteName: "React2u",
      locale: "nl_NL",
      url: SITE,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      images: [image],
    },
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [contact, docs, certificates] = await Promise.all([
    getSetting<ContactInfo>("contact"),
    getSetting<unknown>("documents"),
    getSetting<unknown>("certificates"),
  ]);
  return (
    <>
      <Header contact={contact || CONTACT_FALLBACK} />
      <main>{children}</main>
      <Footer
        contact={contact || CONTACT_FALLBACK}
        docs={normalizeDocs(docs)}
        certificates={normalizeCertificates(certificates)}
      />
      {/* Alleen op de publieke site: adminverkeer is jouw eigen verkeer en
          hoort niet in de statistieken. */}
      <VisitTracker />
      <Analytics />
    </>
  );
}
