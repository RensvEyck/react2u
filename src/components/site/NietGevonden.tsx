import Link from "next/link";
import { PIJLERS } from "@/lib/nav";
import { Arrow } from "./Arrow";

const VOOR_WERKNEMERS = [
  { label: "Ziek, wat nu?", href: "/werknemers#ziek-wat-nu" },
  { label: "Het verzuimprotocol", href: "/verzuimprotocol" },
  { label: "Veelgestelde vragen", href: "/werknemers#veelgestelde-vragen" },
];

function Lijst({ items }: { items: { label: string; href: string }[] }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((l) => (
        <li key={l.href}>
          <Link href={l.href} className="group flex items-center justify-between gap-4 py-3.5 font-semibold text-primary">
            {l.label}
            <Arrow className="shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Inhoud van de 404-pagina. Geen doodlopende weg: per doelgroep de weg verder,
 * plus terug naar het startscherm en naar contact.
 *
 * `data-niet-gevonden` is het signaal voor de VisitTracker: die telt deze
 * weergave dan niet als bezoek maar meldt het pad als 404, zodat het in de
 * admin onder SEO → Doorverwijzingen verschijnt en daar door te sturen is.
 */
export default function NietGevonden() {
  const diensten = PIJLERS.flatMap((p) => p.diensten).map((d) => ({ label: d.label, href: d.href }));
  return (
    <div data-niet-gevonden>
      <section className="border-b border-line bg-soft">
        <div className="container-site pb-14 pt-10 md:pb-20 md:pt-14">
          <p className="eyebrow mb-4">Pagina niet gevonden</p>
          <h1 className="max-w-[760px] text-[2.25rem] font-bold leading-[1.08] tracking-[-0.025em] sm:text-[2.9rem] lg:text-[3.5rem]">
            Deze pagina bestaat niet (meer)
          </h1>
          <p className="mt-6 max-w-[560px] text-[18px] leading-relaxed md:text-[19px]">
            Misschien is hij verhuisd, of zat er een tikfout in de link. Hieronder vind je de weg verder.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/" className="btn">Naar de startpagina <Arrow /></Link>
            <Link href="/contact" className="btn btn-outline">Neem contact op</Link>
          </div>
        </div>
      </section>
      <section className="py-16 md:py-20">
        <div className="container-site grid gap-12 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-6">
            <h2 className="mb-5 text-[1.5rem] font-bold">
              <Link href="/werkgevers" className="hover:underline">Voor werkgevers</Link>
            </h2>
            <Lijst items={diensten} />
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <h2 className="mb-5 text-[1.5rem] font-bold">
              <Link href="/werknemers" className="hover:underline">Voor werknemers</Link>
            </h2>
            <Lijst items={VOOR_WERKNEMERS} />
          </div>
        </div>
      </section>
    </div>
  );
}
