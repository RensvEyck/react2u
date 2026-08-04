import Link from "next/link";
import { LOGO_URL, type FooterDoc, type Certificate } from "@/lib/nav";
import type { ContactInfo } from "@/lib/content";
import { FaMapMarkerAlt, FaPhoneAlt, FaEnvelope } from "react-icons/fa";

export default function Footer({
  contact, docs, certificates,
}: {
  contact: ContactInfo;
  docs: FooterDoc[];
  certificates: Certificate[];
}) {
  const cols = [
    { title: "Werkgever", links: [
      { label: "Diensten", href: "/diensten" },
      { label: "Over React2u", href: "/over-react2u" },
      { label: "Contact", href: "/contact" },
    ]},
    { title: "Werknemer", links: [
      { label: "Diensten", href: "/werknemers" },
      { label: "Verzuimprotocol", href: "/verzuimprotocol" },
      { label: "Contact", href: "/contact" },
    ]},
  ];
  return (
    <footer className="mt-20 bg-[#e6e6ea] text-primary">
      <div className="container-site grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_URL} alt="React2u" className="h-[80px] w-auto mb-4" />
          <p className="text-[16px] text-primary/80">
            React2u kijkt graag samen met zowel werknemer, als werkgever naar de beste weg om de
            arbeidsrelatie voort te zetten. <br />Er is altijd een oplossing!
          </p>
        </div>
        {cols.map((col) => (
          <div key={col.title}>
            <h2 className="text-2xl mb-4">{col.title}</h2>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.label + l.href}>
                  <Link href={l.href} className="text-primary/80 hover:text-accent">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h2 className="text-2xl mb-4">React2u</h2>
          <ul className="space-y-3 text-[16px] text-primary/80">
            <li className="flex gap-3 items-start">
              <FaMapMarkerAlt className="mt-1 shrink-0" />
              <span>{contact.addressLine1}<br />{contact.addressLine2}</span>
            </li>
            <li className="flex gap-3 items-center">
              <FaPhoneAlt className="shrink-0" />
              <a href={`tel:${contact.phone}`} className="hover:text-accent">{contact.phoneDisplay}</a>
            </li>
            <li className="flex gap-3 items-center">
              <FaEnvelope className="shrink-0" />
              <a href={`mailto:${contact.email}`} className="hover:text-accent">{contact.email}</a>
            </li>
            <li><strong>KVK</strong>: {contact.kvk}</li>
            <li><strong>BTW</strong>: {contact.btw}</li>
            <li><strong>IBAN</strong>: {contact.iban}</li>
          </ul>
        </div>
      </div>
      {certificates.length > 0 && (
        <div className="border-t border-black/10">
          <div className="container-site flex flex-wrap items-center justify-center gap-x-10 gap-y-6 py-8">
            {certificates.map((c, i) => {
              /* eslint-disable-next-line @next/next/no-img-element */
              const logo = <img src={c.image} alt={c.alt} className="h-14 w-auto max-w-[160px] object-contain" loading="lazy" />;
              return c.href ? (
                <a key={i} href={c.href} target="_blank" rel="noopener" className="transition-opacity hover:opacity-70">
                  {logo}
                </a>
              ) : (
                <span key={i}>{logo}</span>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t border-black/10">
        <div className="container-site py-4 text-[15px] text-primary/70 flex flex-wrap gap-x-2 gap-y-1">
          {docs.map((d, i) => (
            <span key={`${d.label}-${i}`}>
              {i > 0 && <span className="mr-2">|</span>}
              <a href={d.href} target="_blank" rel="noopener" className="hover:text-accent">{d.label}</a>
            </span>
          ))}
          <span>{docs.length > 0 && "| "}© {new Date().getFullYear()} React2u</span>
        </div>
      </div>
    </footer>
  );
}
