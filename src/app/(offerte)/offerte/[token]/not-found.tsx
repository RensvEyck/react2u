import OfferteMelding from "@/components/offerte/OfferteMelding";
import { OFFERTE_EMAIL } from "@/lib/offertes";

/** Onbekende, vervalste of nog niet verstuurde link: geen details, wel een weg naar een mens. */
export default function OfferteNietGevonden() {
  return (
    <OfferteMelding titel="Deze link werkt niet" telefoon="085 620 58 00" email={OFFERTE_EMAIL}>
      De offerte is niet gevonden. Misschien is de link niet helemaal meegekomen uit de mail, of is er inmiddels een nieuwe link. Neem
      gerust contact met ons op.
    </OfferteMelding>
  );
}
