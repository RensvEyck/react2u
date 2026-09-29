import Link from "next/link";
import { PIJLERS, LINKEDIN_URL, type FooterDoc, type Certificate } from "@/lib/nav";
import { kleurVars } from "@/lib/brand";
import type { ContactInfo } from "@/lib/content";
import { LuPhone, LuMail, LuMapPin, LuAward, LuLinkedin } from "react-icons/lu";
import SiteImage from "./SiteImage";
import Logo from "./Logo";
import { zinsletters } from "@/lib/tekst";

const MEER = [
  { label: "Over React2u", href: "/over-react2u" },
  { label: "Voor werknemers", href: "/werknemers" },
  { label: "Verzuimprotocol", href: "/verzuimprotocol" },
  { label: "Blog", href: "/blog" },
  { label: "Werken bij React2u", href: "/vacatures" },
  { label: "Contact", href: "/contact" },
];

function Kop({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-5 text-[13px] font-bold uppercase tracking-[0.14em] !text-primary-light">{children}</h2>;
}

/**
 * Footer op indigo, met de zin waar React2u zelf mee afsluit: "Er is altijd
 * een oplossing." Daaronder bellen, mailen en de diensten per stap.
 */
export default function Footer({
  contact, docs, certificates,
}: {
  contact: ContactInfo;
  docs: FooterDoc[];
  certificates: Certificate[];
}) {
  return (
    <footer className="on-dark bg-primary-deep text-[15.5px] text-white/75">
      <div className="container-site grid gap-12 pb-12 pt-16 md:pt-20 lg:grid-cols-12 lg:gap-x-8">
        <div className="lg:col-span-5">
          <Link href="/" className="inline-block" aria-label="React2u, naar de homepage">
            <Logo tone="light" title="" className="h-[54px] w-auto" />
          </Link>
          <p className="mt-9 flex items-center gap-4 font-heading text-[2rem] font-extrabold leading-tight tracking-[-0.02em] text-white">
            Er is altijd een oplossing.
          </p>
          <p className="mt-3 max-w-[420px] leading-relaxed">
            React2u kijkt graag samen met werknemer én werkgever naar de beste weg om de arbeidsrelatie
            voort te zetten.
          </p>
          <ul className="mt-8 space-y-2.5">
            <li>
              <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-3 font-semibold text-white hover:text-primary-light">
                <LuPhone className="text-[16px]" aria-hidden /> {contact.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-3 font-semibold text-white hover:text-primary-light">
                <LuMail className="text-[16px]" aria-hidden /> {contact.email}
              </a>
            </li>
            <li className="flex gap-3">
              <LuMapPin className="mt-1 shrink-0 text-[16px]" aria-hidden />
              <span>{contact.addressLine1}, {contact.addressLine2}</span>
            </li>
          </ul>
        </div>

        <div className="lg:col-span-3 lg:col-start-7">
          <Kop>Diensten</Kop>
          <ul className="space-y-5">
            {PIJLERS.map((p) => (
              <li key={p.key}>
                <span className="mb-2 block text-[13px] font-semibold text-white">{p.stap}</span>
                <ul className="space-y-1.5">
                  {p.diensten.map((d) => (
                    <li key={d.href} style={kleurVars(d.kleur)}>
                      <Link href={d.href} className="inline-flex items-center gap-2.5 hover:text-white">
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

        <div className="lg:col-span-3">
          <Kop>Meer React2u</Kop>
          <ul className="space-y-2.5">
            {MEER.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">{l.label}</Link>
              </li>
            ))}
          </ul>
          <a href={LINKEDIN_URL} target="_blank" rel="noopener" aria-label="React2u op LinkedIn"
             className="mt-8 inline-grid h-10 w-10 place-items-center rounded-full border border-white/20 text-white transition-colors hover:border-white hover:bg-white hover:text-primary">
            <LuLinkedin aria-hidden />
          </a>
        </div>
      </div>

      {certificates.length > 0 && (
        <div className="container-site pb-10">
          <ul className="flex flex-wrap items-stretch gap-3">
            {certificates.map((c, i) => {
              // Zonder logo tonen we de omschrijving. Certificaten komen vaak
              // als PDF binnen, en die kan geen <img> zijn — dan is een leesbare
              // link beter dan niets laten zien.
              const inhoud = c.image ? (
                <span className="rounded-lg bg-white px-2 py-1">
                  <SiteImage src={c.image} alt={c.alt} sizes="160px" widths={[160, 320]}
                    className="h-10 w-auto max-w-[120px] object-contain" />
                </span>
              ) : (
                <span className="flex items-center gap-2.5 text-[14px] font-semibold text-white/90">
                  <LuAward className="shrink-0 text-[17px] text-primary-light" aria-hidden />
                  {zinsletters(c.alt)}
                </span>
              );
              const cls = "flex h-full min-h-[52px] items-center rounded-full border border-white/10 bg-white/[0.05] px-5 py-2";
              return (
                <li key={i}>
                  {c.href ? (
                    <a href={c.href} target="_blank" rel="noopener" className={`${cls} transition-colors hover:border-white/40`}>
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

      <div className="border-t border-white/10 text-[14px] text-white/65">
        <div className="container-site flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} React2u</span>
            <span>KVK {contact.kvk}</span>
            <span>BTW {contact.btw}</span>
            <span>IBAN {contact.iban}</span>
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
