import Link from "next/link";
import { PIJLERS, LINKEDIN_URL, type FooterDoc, type Certificate } from "@/lib/nav";
import { kleurVars } from "@/lib/brand";
import type { ContactInfo } from "@/lib/content";
import { LuPhone, LuMail, LuMapPin, LuAward, LuLinkedin } from "react-icons/lu";
import SiteImage from "./SiteImage";
import Logo from "./Logo";
import { zinsletters } from "@/lib/tekst";

const HANDIGE_LINKS = [
  { label: "Over React2u", href: "/over-react2u" },
  { label: "Voor werknemers", href: "/werknemers" },
  { label: "Verzuimprotocol", href: "/verzuimprotocol" },
  { label: "Inzichten", href: "/blog" },
  { label: "Werken bij React2u", href: "/vacatures" },
  { label: "Vragen & contact", href: "/contact" },
];

function Kop({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-[15px] font-bold tracking-normal">{children}</h2>;
}

/**
 * Lichte footer naar het voorbeeld van acture.nl: een witte kaart met logo en
 * adres, daarnaast de oplossingen en handige links, eronder de keurmerken.
 */
export default function Footer({
  contact, docs, certificates,
}: {
  contact: ContactInfo;
  docs: FooterDoc[];
  certificates: Certificate[];
}) {
  return (
    // Geen marge erboven: het laatste blok van de pagina regelt zijn eigen
    // ruimte. Een lijntje scheidt de footer van een blok dat ook lavendel is.
    <footer className="border-t border-primary/10 bg-soft text-[15.5px] text-primary/80">
      <div className="container-site grid gap-12 pb-12 pt-16 md:pt-20 lg:grid-cols-[1.35fr_0.85fr_0.8fr]">
        <div className="rounded-[28px] border border-black/[0.04] bg-white p-7 shadow-[0_20px_40px_-32px_rgba(34,32,90,0.4)] md:p-9">
          <Link href="/" className="inline-block" aria-label="React2u, naar de homepage">
            <Logo title="" className="h-[52px] w-auto" />
          </Link>
          <p className="mt-5 max-w-[440px] leading-relaxed">
            React2u kijkt graag samen met werknemer én werkgever naar de beste weg om de
            arbeidsrelatie voort te zetten. Er is altijd een oplossing!
          </p>
          <div className="mt-8 grid gap-7 sm:grid-cols-2">
            <div>
              <Kop>Bezoekadres</Kop>
              <p className="flex gap-2.5">
                <LuMapPin className="mt-1 shrink-0 text-[16px] text-primary" aria-hidden />
                <span>{contact.addressLine1}<br />{contact.addressLine2}</span>
              </p>
            </div>
            <div>
              <Kop>Contact</Kop>
              <ul className="space-y-2">
                <li>
                  <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-2.5 font-medium text-primary hover:text-accent">
                    <LuPhone className="text-[16px]" aria-hidden /> {contact.phoneDisplay}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2.5 font-medium text-primary hover:text-accent">
                    <LuMail className="text-[16px]" aria-hidden /> {contact.email}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <dl className="mt-7 flex flex-wrap gap-x-6 gap-y-1 border-t border-primary/10 pt-5 text-[13.5px] text-primary/75">
            <div className="flex gap-1.5"><dt>KVK</dt><dd>{contact.kvk}</dd></div>
            <div className="flex gap-1.5"><dt>BTW</dt><dd>{contact.btw}</dd></div>
            <div className="flex gap-1.5"><dt>IBAN</dt><dd>{contact.iban}</dd></div>
          </dl>
        </div>

        <div className="lg:pt-9">
          <Kop>Oplossingen</Kop>
          <ul className="space-y-5">
            {PIJLERS.map((p) => (
              <li key={p.key}>
                <span className="mb-2 block text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--k)]" style={kleurVars(p.kleur)}>
                  {p.title}
                </span>
                <ul className="space-y-1.5">
                  {p.diensten.map((d) => (
                    <li key={d.href} style={kleurVars(d.kleur)}>
                      <Link href={d.href} className="inline-flex items-center gap-2.5 hover:text-accent">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--k-vlak)]" aria-hidden />
                        {d.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:pt-9">
          <Kop>Handige links</Kop>
          <ul className="space-y-2.5">
            {HANDIGE_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-accent">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {certificates.length > 0 && (
        <div className="container-site pb-10">
          <ul className="flex flex-wrap items-stretch gap-3">
            {certificates.map((c, i) => {
              // Zonder logo tonen we de omschrijving als tegel. Certificaten
              // komen vaak als PDF binnen, en die kan geen <img> zijn — dan is
              // een leesbare link beter dan niets laten zien.
              const inhoud = c.image ? (
                <SiteImage src={c.image} alt={c.alt} sizes="160px" widths={[160, 320]}
                  className="h-12 w-auto max-w-[130px] object-contain" />
              ) : (
                <span className="flex items-center gap-2.5 text-[14px] font-semibold text-primary">
                  <LuAward className="shrink-0 text-[18px] text-secondary-ink" aria-hidden />
                  {zinsletters(c.alt)}
                </span>
              );
              const cls = "flex h-full min-h-[64px] items-center rounded-2xl border border-black/[0.05] bg-white px-4 py-3";
              return (
                <li key={i}>
                  {c.href ? (
                    <a href={c.href} target="_blank" rel="noopener" className={`${cls} transition-shadow hover:shadow-[0_12px_24px_-16px_rgba(34,32,90,0.45)]`}>
                      {inhoud}
                    </a>
                  ) : (
                    <span className={cls}>{inhoud}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="border-t border-primary/10 text-[14px] text-primary/75">
        <div className="container-site flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} React2u</p>
          <div className="flex items-center gap-x-5 gap-y-2 max-md:flex-wrap md:justify-end">
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {docs.map((d, i) => (
                <li key={`${d.label}-${i}`}>
                  <a href={d.href} target="_blank" rel="noopener" className="hover:text-accent">{d.label}</a>
                </li>
              ))}
            </ul>
            <a href={LINKEDIN_URL} target="_blank" rel="noopener" aria-label="React2u op LinkedIn"
               className="grid h-9 w-9 place-items-center rounded-full bg-white text-primary shadow-[0_4px_12px_-8px_rgba(34,32,90,0.5)] transition-colors hover:bg-primary hover:text-white">
              <LuLinkedin aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
