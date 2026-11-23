"use client";
import { useEffect, useRef } from "react";

/**
 * Het bord is bekeken: wat nieuw was voor deze collega staat op gelezen, zodat
 * het dashboard het niet blijft tonen. De pagina zelf laat de meldingen nog
 * zien tot de volgende keer.
 */
export default function MeldingenGezien({ gezien }: { gezien: () => Promise<void> }) {
  const gedaan = useRef(false);
  useEffect(() => {
    if (gedaan.current) return;
    gedaan.current = true;
    const t = setTimeout(() => void gezien(), 1500);
    return () => clearTimeout(t);
  }, [gezien]);
  return null;
}
