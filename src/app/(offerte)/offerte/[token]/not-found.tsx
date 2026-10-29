import Logo from "@/components/site/Logo";

/** Onbekende, vervalste of nog niet verstuurde link: geen details, wel een weg naar een mens. */
export default function OfferteNietGevonden() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F2EC] px-5 py-16">
      <div className="w-full max-w-[520px] rounded-[22px] bg-white p-8 text-center">
        <Logo className="mx-auto h-10 w-auto" />
        <h1 className="font-heading mt-8 text-[26px] font-bold text-[#322E83]">Deze link werkt niet</h1>
        <p className="mt-3 text-[16px] leading-[1.65] text-[#5E5C78]">
          De offerte is niet gevonden. Misschien is de link niet helemaal meegekomen uit de mail, of is er inmiddels een nieuwe
          link. Neem gerust contact met ons op.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href="tel:0856205800" className="inline-flex h-[48px] items-center rounded-[12px] bg-[#322E83] px-5 text-[15px] font-semibold text-white">
            Bel 085 620 58 00
          </a>
          <a href="mailto:sales@react2u.nl" className="inline-flex h-[48px] items-center rounded-[12px] border border-[#DCDBEA] px-5 text-[15px] font-semibold text-[#322E83]">
            Mail sales@react2u.nl
          </a>
        </div>
      </div>
    </main>
  );
}
