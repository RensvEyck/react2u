import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import { getSetting, CONTACT_FALLBACK, type ContactInfo } from "@/lib/content";
import { FOOTER_DOCS_FALLBACK, type FooterDocs } from "@/lib/nav";

export const revalidate = 300;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [contact, docs] = await Promise.all([
    getSetting<ContactInfo>("contact"),
    getSetting<FooterDocs>("documents"),
  ]);
  return (
    <>
      <Header contact={contact || CONTACT_FALLBACK} />
      <main>{children}</main>
      <Footer contact={contact || CONTACT_FALLBACK} docs={{ ...FOOTER_DOCS_FALLBACK, ...(docs || {}) }} />
    </>
  );
}
