import Link from "next/link";
import { FaPhoneAlt, FaArrowRight } from "react-icons/fa";
import { getSetting, CONTACT_FALLBACK, type ContactInfo } from "@/lib/content";

const LINKS = [
  { label: "Onze diensten", href: "/diensten", text: "Verzuimbegeleiding, preventie en coaching" },
  { label: "Voor werknemers", href: "/werknemers", text: "Ziek? Zo gaat het verder" },
  { label: "Vacatures", href: "/vacatures", text: "Werken bij React2u" },
  { label: "Contact", href: "/contact", text: "Stel je vraag direct" },
];

/**
 * Inhoud van de 404-pagina.
 *
 * `data-niet-gevonden` is het signaal voor de VisitTracker: die telt deze
 * weergave dan niet als bezoek maar meldt het pad als 404, zodat het onder
 * SEO → Doorverwijzingen verschijnt en daar met één klik door te sturen is.
 */
export default async function NotFound() {
  const contact = { ...CONTACT_FALLBACK, ...((await getSetting<Partial<ContactInfo>>("contact")) || {}) };
  return (
    <section data-niet-gevonden className="container-site py-16 md:py-24">
      <div className="mx-auto max-w-[760px] text-center">
        <p className="eyebrow">Pagina niet gevonden</p>
        <h1 className="mt-3 text-[34px] md:text-[46px]">Deze pagina bestaat niet (meer)</h1>
        <p className="mx-auto mt-4 max-w-[560px] text-[18px]">
          Misschien is hij verhuisd, of zat er een tikfout in de link. Hiermee kom je waarschijnlijk verder:
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-[860px] gap-4 sm:grid-cols-2">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-black/[0.07] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span>
              <span className="block font-heading text-[19px] font-bold text-primary">{l.label}</span>
              <span className="block text-[15.5px]">{l.text}</span>
            </span>
            <FaArrowRight className="shrink-0 text-accent transition group-hover:translate-x-1" />
          </Link>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link href="/" className="btn">Naar de homepage</Link>
        <a href={`tel:${contact.phone}`} className="btn btn-outline">
          <span className="inline-flex items-center gap-2">
            <FaPhoneAlt className="text-[14px]" /> {contact.phoneDisplay}
          </span>
        </a>
      </div>
    </section>
  );
}
