import Link from "next/link";
import { PIJLERS } from "@/lib/nav";
import DotCloud, { Arrow } from "./DotCloud";
import Pills from "./Pills";

const VOOR_WERKNEMERS = [
  { label: "Ziek, wat nu?", href: "/werknemers#ziek-wat-nu" },
  { label: "Het verzuimprotocol", href: "/verzuimprotocol" },
  { label: "Veelgestelde vragen", href: "/werknemers#veelgestelde-vragen" },
];

/**
 * Inhoud van de 404-pagina. Geen doodlopende weg: per doelgroep de weg verder,
 * plus terug naar het startscherm en naar contact.
 *
 * `data-niet-gevonden` is het signaal voor de VisitTracker: die telt deze
 * weergave dan niet als bezoek maar meldt het pad als 404, zodat het in de
 * admin onder SEO → Doorverwijzingen verschijnt en daar door te sturen is.
 */
export default function NietGevonden() {
  const diensten = PIJLERS.flatMap((p) => p.diensten).map((d) => ({ label: d.label, href: d.href, kleur: d.kleur }));
  return (
    <div data-niet-gevonden>
      <section className="hero-pull relative bg-soft">
        <div className="container-site grid items-center gap-12 pb-16 pt-10 md:pb-24 md:pt-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="eyebrow mb-4">Pagina niet gevonden</p>
            <h1 className="text-[2.6rem] font-extrabold leading-[1.04] tracking-[-0.03em] md:text-[3.8rem]">
              Deze pagina bestaat niet (meer)
            </h1>
            <p className="mt-6 max-w-[560px] text-[19px]">
              Misschien is hij verhuisd, of zat er een tikfout in de link. Er is altijd een oplossing — ook
              voor deze.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/" className="btn">Naar de startpagina <Arrow /></Link>
              <Link href="/contact" className="btn btn-outline">Neem contact op</Link>
            </div>
          </div>
          <DotCloud animate className="mx-auto hidden w-full max-w-[380px] lg:block" />
        </div>
      </section>
      <section className="py-16 md:py-20">
        <div className="container-site grid gap-12 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-7">
            <h2 className="mb-6 text-[1.6rem] font-extrabold tracking-[-0.02em]">
              <Link href="/werkgevers" className="hover:text-accent">Voor werkgevers</Link>
            </h2>
            <Pills items={diensten} />
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <h2 className="mb-6 text-[1.6rem] font-extrabold tracking-[-0.02em]">
              <Link href="/werknemers" className="hover:text-accent">Voor werknemers</Link>
            </h2>
            <ul className="divide-y divide-primary/10 border-y border-primary/10">
              {VOOR_WERKNEMERS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="group flex items-center justify-between gap-4 py-3.5 font-semibold text-primary">
                    {l.label}
                    <Arrow className="shrink-0 text-accent transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
