import { doelgroepVoorPad } from "./nav";

/**
 * Op welke pagina's de belbalk (mobiel) staat: de werkgeverspagina's en de
 * tarieven. Op pagina's met een eigen formulier (contact, kennismaken) niet —
 * twee manieren om hetzelfde te vragen op één scherm is er één te veel. Voor
 * werknemers staat "Bel je casemanager" al in de header.
 */
const EXTRA = ["/verzuimabonnementen"];

export function toontBelbalk(path: string): boolean {
  return doelgroepVoorPad(path) === "werkgever" || EXTRA.includes(path);
}
