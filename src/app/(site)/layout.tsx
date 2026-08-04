import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import { getSetting, CONTACT_FALLBACK, type ContactInfo } from "@/lib/content";

export const revalidate = 300;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const contact = (await getSetting<ContactInfo>("contact")) || CONTACT_FALLBACK;
  return (
    <>
      <Header contact={contact} />
      <main>{children}</main>
      <Footer contact={contact} />
    </>
  );
}
