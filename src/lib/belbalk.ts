import { doelgroepVoorPad } from "./nav";

/**
 * Op welke pagina's de belbalk (mobiel) staat: de werkgeverspagina's volgens
 * doelgroepVoorPad (sinds november 2026 ook de abonnementen, de kennismaking
 * en het werkgebied). Op pagina's met een eigen formulier (contact,
 * kennismaken) niet — twee manieren om hetzelfde te vragen op één scherm is er
 * één te veel. Voor werknemers staat "Bel je casemanager" al in de header.
 */
const EIGEN_FORMULIER = ["/kennismaken", "/contact"];

export function toontBelbalk(path: string): boolean {
  return doelgroepVoorPad(path) === "werkgever" && !EIGEN_FORMULIER.includes(path);
}
