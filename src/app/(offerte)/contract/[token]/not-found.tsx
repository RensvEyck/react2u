import OfferteMelding from "@/components/offerte/OfferteMelding";
import { CONTRACT_EMAIL } from "@/lib/contracten";

/** Onbekende, vervalste of nog niet verstuurde link: geen details, wel een weg naar een mens. */
export default function ContractNietGevonden() {
  return (
    <OfferteMelding soort="Contract" titel="Deze link werkt niet" telefoon="085 620 58 00" email={CONTRACT_EMAIL}>
      Het contract is niet gevonden. Misschien is de link niet helemaal meegekomen uit de mail, of is er inmiddels een nieuwe link. Neem
      gerust contact met ons op.
    </OfferteMelding>
  );
}
