import path from "path";
import { Image, Text } from "@react-pdf/renderer";
import { keurmerkenVoor } from "./keurmerken";
import type { Certificate } from "./nav";

const BEELD = path.join(process.cwd(), "public");

/**
 * De keurmerken in de voet van een pdf (offerte, contract, checklist): de
 * certificaten uit Instellingen, dezelfde als op de site (lib/keurmerken.ts).
 * Alleen een logo van de site zelf kan mee in de pdf, want dat is een bestand
 * in public/ dat next.config.ts meeneemt naar Vercel; een certificaat dat de
 * site niet kent, staat er met zijn naam. Zijn er geen certificaten, dan niets.
 */
export function PdfKeurmerken({ certificaten, kleur }: { certificaten: Certificate[]; kleur: string }) {
  return (
    <>
      {keurmerkenVoor(certificaten).map((k, i) =>
        k.src.startsWith("/") ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf kent geen alt
          <Image key={i} src={path.join(BEELD, k.src)} style={{ height: 24, objectFit: "contain" }} />
        ) : (
          <Text key={i} style={{ fontSize: 7.5, color: kleur }}>{k.naam}</Text>
        ),
      )}
    </>
  );
}
