import { Outfit } from "next/font/google";
import Logo from "@/components/site/Logo";

const kopLetter = Outfit({ subsets: ["latin"], weight: ["600"], display: "swap" });

/**
 * Een offertelink die niets (meer) toont: onbekend of ingetrokken. Hetzelfde
 * vel als de offerte zelf (briefhoofd, Outfit, ronde knoppen), zodat de klant
 * ziet dat hij op de goede plek is, met een weg naar een mens.
 */
export default function OfferteMelding({
  titel, children, telefoon, email,
}: {
  titel: string;
  children: React.ReactNode;
  telefoon: string | null;
  email: string | null;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4EFE7] px-5 py-16">
      <div className="w-full max-w-[560px] rounded-[28px] bg-white px-7 py-10 shadow-[0_30px_80px_-50px_rgba(28,26,78,0.35)] sm:px-12 sm:py-12">
        <div className="flex items-center gap-4">
          <Logo className="h-11 w-auto" />
          <span className="h-9 w-px bg-[#E2DBCF]" aria-hidden="true" />
          <p className="m-0 text-[14px] leading-snug text-[#55536F]">
            Jouw mensen,<br /><span className="font-semibold text-[#1C1A4E]">onze aandacht.</span>
          </p>
        </div>
        {/* Kleur inline: de algemene kopstijl van de site staat buiten de Tailwind-lagen en wint anders */}
        <h1 className={`${kopLetter.className} m-0 mt-10 text-balance text-[28px] font-semibold leading-[1.15] tracking-[-0.025em] sm:text-[32px]`} style={{ color: "#1C1A4E" }}>{titel}</h1>
        <p className="m-0 mt-4 text-[16px] leading-[1.7] text-[#55536F]">{children}</p>
        {(telefoon || email) && (
          <div className="mt-8 flex flex-wrap gap-3">
            {telefoon && (
              <a href={`tel:${telefoon.replace(/[^\d+]/g, "")}`} className="inline-flex h-[50px] items-center rounded-full bg-[#322E83] px-6 text-[15px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#322E83]">
                Bel {telefoon}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="inline-flex h-[50px] items-center rounded-full border border-[#E2DBCF] px-6 text-[15px] font-semibold text-[#322E83] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#322E83]">
                Mail {email}
              </a>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
