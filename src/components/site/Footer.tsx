import Link from "next/link";
import { LABELS, LINKEDIN_URL, type FooterDoc, type Certificate } from "@/lib/nav";
import type { ContactInfo } from "@/lib/content";
import { LuPhone, LuMail, LuMapPin, LuAward, LuLinkedin, LuClock } from "react-icons/lu";
import SiteImage from "./SiteImage";
import Logo from "./Logo";
import { zinsletters } from "@/lib/tekst";
import { CookieSettingsLink } from "./CookieBanner";
import { DOCUMENTEN } from "@/lib/documenten";

// Net als op de oude site: een kolom voor werkgevers en een voor werknemers.
const WERKNEMERS = [
  { label: "Overzicht", href: "/werknemers" },
  { label: "Ziek, wat nu?", href: "/werknemers#ziek-wat-nu" },
  { label: "Verzuimprotocol", href: "/verzuimprotocol" },
  { label: "Veelgestelde vragen", href: "/werknemers#veelgestelde-vragen" },
];

const REACT2U = [
  { label: "Over React2u", href: "/over-react2u" },
  { label: "Blog", href: "/blog" },
  { label: "Werken bij React2u", href: "/vacatures" },
  { label: "Contact", href: "/contact" },
];

function Kop({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-[15px] font-semibold !text-white">{children}</h2>;
}

/**
 * Footer op indigo: contact, een kolom voor werkgevers (de diensten), een voor
 * werknemers en een voor React2u zelf; daaronder de keurmerken en de
 * documenten.
 */
export default function Footer({
  contact, docs, certificates,
}: {
  contact: ContactInfo;
  docs: FooterDoc[];
  certificates: Certificate[];
}) {
  return (
    <footer className="on-dark bg-primary-deep text-[15.5px] text-white/70">
      <div className="container-site grid gap-12 pb-12 pt-16 sm:grid-cols-2 md:pt-20 lg:grid-cols-12 lg:gap-x-8">
        <div className="sm:col-span-2 lg:col-span-4">
          <Link href="/" className="inline-block" aria-label="React2u, naar de homepage">
            <Logo tone="light" title="" className="h-[48px] w-auto" />
          </Link>
          <p className="mt-6 max-w-[360px] leading-relaxed">
            De persoonlijke arbodienst voor werkgevers én werknemers. Er is altijd een oplossing.
          </p>
          <ul className="mt-7 space-y-2.5">
            <li>
              <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-3 font-semibold text-white underline-offset-4 hover:underline">
                <LuPhone className="text-[16px]" aria-hidden /> {contact.phoneDisplay}
              </a>
            </li>
            <li className="flex gap-3">
              <LuClock className="mt-1 shrink-0 text-[16px]" aria-hidden />
              <span>Ma t/m vr 9.00 tot 17.00 uur</span>
            </li>
            <li>
              <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-3 font-semibold text-white underline-offset-4 hover:underline">
                <LuMail className="text-[16px]" aria-hidden /> {contact.email}
              </a>
            </li>
            <li className="flex gap-3">
              <LuMapPin className="mt-1 shrink-0 text-[16px]" aria-hidden />
              <span>{contact.addressLine1}, {contact.addressLine2}</span>
            </li>
          </ul>
        </div>

        <div className="lg:col-span-3 lg:col-start-6">
          <Kop><Link href="/werkgevers" className="hover:underline">Voor werkgevers</Link></Kop>
          <ul className="space-y-2.5">
            {LABELS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">{l.titel}</Link>
              </li>
            ))}
            <li>
              <Link href="/diensten" className="hover:text-white">Alle diensten</Link>
            </li>
          </ul>
        </div>

        <div className="lg:col-span-2">
          <Kop><Link href="/werknemers" className="hover:underline">Voor werknemers</Link></Kop>
          <ul className="space-y-2.5">
            {WERKNEMERS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <Kop>React2u</Kop>
          <ul className="space-y-2.5">
            {REACT2U.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">{l.label}</Link>
              </li>
            ))}
          </ul>
          <a href={LINKEDIN_URL} target="_blank" rel="noopener" aria-label="React2u op LinkedIn"
             className="mt-7 inline-grid h-10 w-10 place-items-center rounded-lg border border-white/20 text-white transition-colors hover:border-white hover:bg-white hover:text-primary">
            <LuLinkedin aria-hidden />
          </a>
        </div>
      </div>

      {certificates.length > 0 && (
        <div className="border-t border-white/10">
          <ul className="container-site flex flex-wrap items-center gap-x-8 gap-y-3 py-6 text-[14px]">
            {certificates.map((c, i) => {
              // Zonder logo tonen we de omschrijving. Certificaten komen vaak
              // als PDF binnen, en die kan geen <img> zijn — dan is een leesbare
              // link beter dan niets laten zien.
              const inhoud = c.image ? (
                <span className="inline-block rounded-md bg-white px-2 py-1">
                  <SiteImage src={c.image} alt={c.alt} sizes="160px" widths={[160, 320]}
                    className="h-9 w-auto max-w-[110px] object-contain" />
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 font-medium text-white/85">
                  <LuAward className="shrink-0 text-[16px]" aria-hidden />
                  {zinsletters(c.alt)}
                </span>
              );
              return (
                <li key={i}>
                  {c.href ? (
                    <a href={c.href} target="_blank" rel="noopener" className="hover:text-white">{inhoud}</a>
                  ) : (
                    inhoud
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="border-t border-white/10 text-[14px] text-white/60">
        <div className="container-site flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} React2u</span>
            <span>KVK {contact.kvk}</span>
            <span>BTW {contact.btw}</span>
            <span>IBAN {contact.iban}</span>
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {/* Het oude privacyreglement (WordPress-PDF) hoort niet meer in de footer. */}
            {docs.filter((d) => !/reglement/i.test(d.label)).map((d, i) => (
              <li key={`${d.label}-${i}`}>
                <a href={d.href} target="_blank" rel="noopener" className="hover:text-white">{d.label}</a>
              </li>
            ))}
            {/* De cookieverklaring is een vaste PDF (lib/documenten.ts), geen document
                uit de instellingen; staat hij daar toch, dan niet dubbel. */}
            {!docs.some((d) => /cookie/i.test(d.label)) && (
              <li>
                <a href={DOCUMENTEN.cookieverklaring} target="_blank" rel="noopener" className="hover:text-white">Cookieverklaring</a>
              </li>
            )}
            <li>
              <CookieSettingsLink className="hover:text-white" />
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
