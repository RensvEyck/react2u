import Link from "next/link";
import { PIJLERS, LINKEDIN_URL, type FooterDoc, type Certificate } from "@/lib/nav";
import { kleurVars } from "@/lib/brand";
import type { ContactInfo } from "@/lib/content";
import { FaPhoneAlt, FaEnvelope, FaCertificate, FaLinkedinIn } from "react-icons/fa";
import SiteImage from "./SiteImage";
import Logo from "./Logo";

const HANDIGE_LINKS = [
  { label: "Over React2u", href: "/over-react2u" },
  { label: "Voor werknemers", href: "/werknemers" },
  { label: "Verzuimprotocol", href: "/verzuimprotocol" },
  { label: "Inzichten", href: "/blog" },
  { label: "Werken bij React2u", href: "/vacatures" },
  { label: "Vragen & contact", href: "/contact" },
];

function Kop({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-[13px] font-bold uppercase tracking-[0.14em] !text-primary-light">{children}</h2>
  );
}

export default function Footer({
  contact, docs, certificates,
}: {
  contact: ContactInfo;
  docs: FooterDoc[];
  certificates: Certificate[];
}) {
  return (
    <footer className="on-dark mt-20 bg-primary-deep text-[16px] text-white/75">
      <div className="container-site grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-block">
            <Logo tone="light" className="mb-5 h-[64px] w-auto" />
          </Link>
          <p className="max-w-[320px] leading-relaxed">
            React2u kijkt graag samen met werknemer én werkgever naar de beste weg om de
            arbeidsrelatie voort te zetten. Er is altijd een oplossing!
          </p>
          <a href={LINKEDIN_URL} target="_blank" rel="noopener" aria-label="React2u op LinkedIn"
             className="mt-6 grid h-10 w-10 place-items-center rounded-full border border-white/20 text-white transition-colors hover:border-white hover:bg-white hover:text-primary">
            <FaLinkedinIn aria-hidden />
          </a>
        </div>

        <div className="space-y-8">
          <div>
            <Kop>Bezoekadres</Kop>
            <p>React2u<br />{contact.addressLine1}<br />{contact.addressLine2}</p>
          </div>
          <div>
            <Kop>Contact</Kop>
            <ul className="space-y-2">
              <li>
                <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-2.5 hover:text-white">
                  <FaPhoneAlt className="text-[12px]" aria-hidden /> {contact.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2.5 hover:text-white">
                  <FaEnvelope className="text-[12px]" aria-hidden /> {contact.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div>
          <Kop>Oplossingen</Kop>
          <ul className="space-y-4">
            {PIJLERS.map((p) => (
              <li key={p.key}>
                <span className="mb-1.5 block font-semibold text-white">{p.title}</span>
                <ul className="space-y-1.5">
                  {p.diensten.map((d) => (
                    <li key={d.href} style={kleurVars(d.kleur)}>
                      <Link href={d.href} className="inline-flex items-center gap-2 hover:text-white">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--k-donker)]" aria-hidden />
                        {d.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <Kop>Handige links</Kop>
          <ul className="space-y-2">
            {HANDIGE_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {certificates.length > 0 && (
        <div className="border-t border-white/10">
          <div className="container-site flex flex-wrap items-center gap-x-8 gap-y-4 py-7">
            <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-primary-light">Gecertificeerd</span>
            {certificates.map((c, i) => {
              // Zonder logo tonen we de omschrijving als link. Certificaten
              // komen vaak als PDF binnen, en die kan geen <img> zijn — dan is
              // een leesbare link beter dan niets laten zien. Een logo krijgt
              // een witte kaart: de meeste keurmerken zijn donker op transparant.
              const inhoud = c.image ? (
                <span className="inline-block rounded-xl bg-white px-3 py-2">
                  <SiteImage src={c.image} alt={c.alt} sizes="160px" widths={[160, 320]}
                    className="h-10 w-auto max-w-[140px] object-contain" />
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-[15px] font-medium">
                  <FaCertificate className="shrink-0 text-secondary" aria-hidden />
                  {c.alt}
                </span>
              );
              return c.href ? (
                <a key={i} href={c.href} target="_blank" rel="noopener" className="transition-colors hover:text-white">
                  {inhoud}
                </a>
              ) : (
                <span key={i}>{inhoud}</span>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t border-white/10 text-[14px] text-white/55">
        <div className="container-site flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} React2u · KVK {contact.kvk} · BTW {contact.btw} · IBAN {contact.iban}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {docs.map((d, i) => (
              <li key={`${d.label}-${i}`}>
                <a href={d.href} target="_blank" rel="noopener" className="hover:text-white">{d.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
