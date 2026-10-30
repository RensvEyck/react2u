import { Outfit } from "next/font/google";
import Logo from "@/components/site/Logo";
import { BODY, Eyebrow, kop, NAVY, Pijl, SOFT } from "@/components/blocks/Gedeeld";

// Dezelfde variabele als de site (.hv .hv-kop leest --font-outfit).
const outfit = Outfit({ subsets: ["latin"], weight: ["600"], variable: "--font-outfit", display: "swap" });

/**
 * Een offertelink die niets (meer) toont: onbekend of ingetrokken. In de
 * vormgeving van de offerte en de site (lila band, Outfit, ronde knoppen met
 * een pijl), zodat de klant ziet dat hij op de goede plek is, met een weg naar
 * een mens.
 */
export default function OfferteMelding({
  titel, children, telefoon, email,
}: {
  titel: string;
  children: React.ReactNode;
  telefoon: string | null;
  email: string | null;
}) {
  const knop = "hv-btn inline-flex h-[52px] items-center gap-2.5 whitespace-nowrap rounded-full px-6 text-[15px] font-bold";
  return (
    <main className={`hv ${outfit.variable} flex min-h-screen items-center justify-center px-5 py-16`} style={{ background: SOFT }}>
      <div className="w-full max-w-[580px] rounded-[28px] bg-white px-7 py-10 shadow-[0_24px_48px_-36px_rgba(50,46,131,0.35)] sm:px-12 sm:py-12">
        <Logo className="h-11 w-auto" />
        <div className="mt-10 flex flex-col gap-4">
          <Eyebrow>Offerte</Eyebrow>
          {/* Kleur inline: de algemene kopstijl van de site staat buiten de Tailwind-lagen en wint anders */}
          <h1 className={`${kop} m-0 text-[30px] leading-[1.12] tracking-[-0.8px] sm:text-[36px]`} style={{ color: NAVY }}>{titel}</h1>
        </div>
        <p className="m-0 mt-4 text-[16px] leading-[1.7] md:text-[17px]" style={{ color: BODY }}>{children}</p>
        {(telefoon || email) && (
          <div className="mt-8 flex flex-wrap gap-2.5">
            {telefoon && (
              <a href={`tel:${telefoon.replace(/[^\d+]/g, "")}`} className={`${knop} hv-btn-roze`}>
                Bel {telefoon}<Pijl />
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className={`${knop} hv-btn-rand`}>
                Mail {email}<Pijl />
              </a>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
