import OfferteMelding from "@/components/offerte/OfferteMelding";
import { ONBOARDING_EMAIL } from "@/lib/onboarding";

/** Onbekende, vervalste of verlopen link: geen details, wel een weg naar een mens. */
export default function MachtigingNietGevonden() {
  return (
    <OfferteMelding soort="Machtiging" titel="Deze link werkt niet" telefoon="085 620 58 00" email={ONBOARDING_EMAIL}>
      De machtiging is niet gevonden. Misschien is de link niet helemaal meegekomen uit de mail, of is de uitnodiging weggehaald. Vraag je werkgever om een nieuwe, of neem
      gerust contact met ons op.
    </OfferteMelding>
  );
}
