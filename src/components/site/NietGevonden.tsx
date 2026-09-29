import Link from "next/link";
import { PIJLERS } from "@/lib/nav";
import DotCloud, { Arrow } from "./DotCloud";
import Pills from "./Pills";

/**
 * Inhoud van de 404-pagina. Geen doodlopende weg: de zes diensten staan er
 * direct onder, plus de weg terug en naar contact.
 */
export default function NietGevonden() {
  const diensten = PIJLERS.flatMap((p) => p.diensten).map((d) => ({ label: d.label, href: d.href, kleur: d.kleur }));
  return (
    <>
      <section className="hero-pull relative isolate overflow-hidden bg-soft">
        <div className="container-site grid items-center gap-12 pb-16 pt-10 md:pb-24 md:pt-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="eyebrow mb-4">Foutcode 404</p>
            <h1 className="text-[2.6rem] font-extrabold leading-[1.04] tracking-[-0.03em] md:text-[3.8rem]">
              Deze pagina bestaat niet (meer)
            </h1>
            <p className="mt-6 max-w-[560px] text-[19px]">
              Misschien is de link verouderd, of is er een tikfout in het adres geslopen. Er is altijd een
              oplossing — ook voor deze.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/" className="btn">Naar de homepage <Arrow /></Link>
              <Link href="/contact" className="btn btn-outline">Neem contact op</Link>
            </div>
          </div>
          <DotCloud animate className="mx-auto hidden w-full max-w-[380px] lg:block" />
        </div>
      </section>
      <section className="py-16 md:py-20">
        <div className="container-site">
          <h2 className="mb-8 text-[1.8rem] font-extrabold tracking-[-0.02em]">Of kijk verder bij onze oplossingen</h2>
          <Pills items={diensten} />
        </div>
      </section>
    </>
  );
}
