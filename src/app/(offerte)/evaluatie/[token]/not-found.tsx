import OfferteMelding from "@/components/offerte/OfferteMelding";
import { EVALUATIE_EMAIL } from "@/lib/evaluatie";

/** Onbekende, vervalste of verlopen link: geen details, wel een weg naar een mens. */
export default function EvaluatieNietGevonden() {
  return (
    <OfferteMelding soort="Klantevaluatie" titel="Deze link werkt niet" telefoon="085 620 58 00" email={EVALUATIE_EMAIL}>
      De evaluatie is niet gevonden. Misschien is de link niet helemaal meegekomen uit de mail, of is er inmiddels een nieuwe link. Neem
      gerust contact met ons op.
    </OfferteMelding>
  );
}
