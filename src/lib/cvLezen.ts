import "server-only";
import { schoonSamenvatting, type CvSamenvatting } from "./cvSamenvatting";

/**
 * Leest een cv uit met Claude en geeft de belangrijkste gegevens terug.
 * Staat alleen aan als ANTHROPIC_API_KEY in Vercel staat; zonder sleutel
 * geeft dit altijd null en werkt het formulier zoals altijd.
 * Model: CV_MODEL, standaard claude-haiku-5-5 (snel en goedkoop).
 *
 * Het cv gaat daarvoor naar Anthropic. Dat moet in de privacyverklaring staan.
 */
export const cvLezenAan = () => Boolean(process.env.ANTHROPIC_API_KEY);

const OPDRACHT = `Je leest een cv van iemand die solliciteert bij React2u, een arbodienst (verzuim, casemanagement, bedrijfsgeneeskunde, arbo en preventie).
Geef ALLEEN een JSON-object terug, zonder uitleg, met deze sleutels (laat een sleutel weg als het niet in het cv staat, verzin niets):
naam, email, telefoon, linkedin (volledige profiel-URL), woonplaats, huidigeFunctie (functie en werkgever),
jarenErvaring (bijv. "6 jaar, waarvan 3 in verzuim"), opleiding (hoogste of meest relevante),
registraties (bijv. BIG, RCM, CMVZ, KNB, SKO, als ze genoemd worden), talen,
samenvatting (maximaal drie korte zinnen in het Nederlands over wat deze kandidaat relevant maakt voor een arbodienst).`;

type Blok =
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  | { type: "text"; text: string };

async function inhoud(bestand: File): Promise<Blok | null> {
  const buf = Buffer.from(await bestand.arrayBuffer());
  if (bestand.type === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") } };
  }
  if (bestand.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: buf });
    const tekst = value.trim().slice(0, 40_000);
    return tekst ? { type: "text", text: `Cv:\n${tekst}` } : null;
  }
  return null; // oud .doc: niet uit te lezen
}

export async function leesCvUit(bestand: File): Promise<CvSamenvatting | null> {
  const sleutel = process.env.ANTHROPIC_API_KEY;
  if (!sleutel) return null;
  try {
    const blok = await inhoud(bestand);
    if (!blok) return null;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": sleutel, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.CV_MODEL || "claude-haiku-5-5",
        max_tokens: 800,
        messages: [{ role: "user", content: [blok, { type: "text", text: OPDRACHT }] }],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const tekst: string = (data?.content || []).map((c: { text?: string }) => c.text || "").join("");
    const json = tekst.slice(tekst.indexOf("{"), tekst.lastIndexOf("}") + 1);
    return json ? schoonSamenvatting(JSON.parse(json)) : null;
  } catch {
    return null;
  }
}
