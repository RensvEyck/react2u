"use client";
import { createContext, useContext } from "react";
import { STANDAARD_TAAL, type Taal } from "@/lib/taal";
import { woordenboek, type Woordenboek } from "@/lib/woordenboek";

/**
 * De taal van de pagina voor client components (header, footer, cookiemelding,
 * formulieren). SiteShell zet de provider; zonder provider (het voorbeeld in
 * de blokeditor) geldt Nederlands.
 */
const TaalContext = createContext<Taal>(STANDAARD_TAAL);

export function TaalProvider({ taal, children }: { taal: Taal; children: React.ReactNode }) {
  return <TaalContext.Provider value={taal}>{children}</TaalContext.Provider>;
}

export function useTaal(): { taal: Taal; t: Woordenboek } {
  const taal = useContext(TaalContext);
  return { taal, t: woordenboek(taal) };
}
