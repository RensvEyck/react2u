import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import { getSetting, CONTACT_FALLBACK, type ContactInfo } from "@/lib/content";
import { normalizeDocs, normalizeCertificates } from "@/lib/nav";

export const revalidate = 300;

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
    </>
  );
}
