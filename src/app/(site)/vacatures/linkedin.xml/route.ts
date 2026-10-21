import { getPublishedVacancies } from "@/lib/content";
import { mdNaarHtml, vacatureInTaal, volledigeTekst } from "@/lib/vacatures";
import { linkedinNiveau } from "@/lib/linkedinFeed";

/**
 * Vacaturefeed in het XML-formaat van LinkedIn (Limited Listings / job
 * wrapping). LinkedIn haalt de feed zelf op zodra React2u daarvoor is
 * aangemeld via de bedrijfspagina of een LinkedIn-accountmanager:
 * https://react2u.nl/vacatures/linkedin.xml
 *
 * Alleen gepubliceerde vacatures staan erin. De sollicitatielink gaat naar
 * react2u.nl met utm_source=linkedin, zodat die sollicitaties in de admin als
 * bron "campagne: linkedin" verschijnen.
 */
export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl";

function cdata(s: string) {
  return `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

/** LinkedIn kent één dienstverband per vacature; bij "fulltime of parttime" kiezen we fulltime. */
const JOBTYPE: Record<string, string> = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  "FULL_TIME,PART_TIME": "FULL_TIME",
  CONTRACTOR: "CONTRACT",
  TEMPORARY: "TEMPORARY",
  INTERN: "INTERNSHIP",
};

export async function GET() {
  const vacatures = await getPublishedVacancies();
  const jobs = vacatures
    .map((v) => {
      const t = vacatureInTaal(v, "nl");
      const beschrijving = mdNaarHtml([t.intro || "", volledigeTekst(v, "nl")].filter(Boolean).join("\n\n"));
      return `  <job>
    <partnerJobId>${cdata(v.id)}</partnerJobId>
    <company>${cdata("React2u")}</company>
    <title>${cdata(t.title)}</title>
    <description>${cdata(beschrijving)}</description>
    <applyUrl>${cdata(`${SITE}/vacatures/${v.slug}?utm_source=linkedin&utm_medium=feed#solliciteren`)}</applyUrl>
    <location>${cdata(`${v.location || "Eindhoven"}, Noord-Brabant, Nederland`)}</location>
    <city>${cdata(v.location || "Eindhoven")}</city>
    <state>${cdata("Noord-Brabant")}</state>
    <country>${cdata("NL")}</country>
    <postalCode>${cdata("5611 NB")}</postalCode>
    <jobtype>${cdata(JOBTYPE[v.employment_type] || "FULL_TIME")}</jobtype>
    <experienceLevel>${cdata(linkedinNiveau(v.ervaringsniveau))}</experienceLevel>
    <workplaceTypes>${cdata("Hybrid")}</workplaceTypes>
    <listDate>${cdata(new Date(v.published_at || v.created_at).toISOString())}</listDate>
  </job>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<source>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <publisherUrl>${SITE}</publisherUrl>
  <publisher>React2u</publisher>
  <expectedJobCount>${vacatures.length}</expectedJobCount>
${jobs}
</source>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
