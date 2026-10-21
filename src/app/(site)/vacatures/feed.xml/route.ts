import { getPublishedVacancies } from "@/lib/content";
import { isOpdracht, mdNaarHtml, vacatureInTaal, volledigeTekst } from "@/lib/vacatures";

/**
 * Vacaturefeed in het XML-formaat van Indeed (ook gelezen door o.a. Jooble,
 * Adzuna en Werk.nl-aggregators). Aanmelden bij Indeed: in het werkgevers-
 * account de feed-URL https://react2u.nl/vacatures/feed.xml opgeven. Elke
 * gepubliceerde vacature staat er dan vanzelf op; een gesloten vacature
 * verdwijnt bij de volgende keer ophalen.
 *
 * De links krijgen utm_source=indeed, zodat sollicitaties via de feed in de
 * admin als bron "campagne: indeed" verschijnen.
 */
export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl";

function cdata(s: string) {
  return `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

const JOBTYPE: Record<string, string> = {
  FULL_TIME: "fulltime",
  PART_TIME: "parttime",
  "FULL_TIME,PART_TIME": "fulltime, parttime",
  CONTRACTOR: "contract",
  TEMPORARY: "temporary",
  INTERN: "internship",
};

export async function GET() {
  const vacatures = await getPublishedVacancies();
  const jobs = vacatures
    .map((v) => {
      const t = vacatureInTaal(v, "nl");
      const beschrijving = mdNaarHtml([t.intro || "", volledigeTekst(v, "nl")].filter(Boolean).join("\n\n"));
      return `  <job>
    <title>${cdata(t.title)}</title>
    <date>${cdata(new Date(v.published_at || v.created_at).toUTCString())}</date>
    <referencenumber>${cdata(v.id)}</referencenumber>
    <url>${cdata(`${SITE}/vacatures/${v.slug}?utm_source=indeed&utm_medium=feed`)}</url>
    <company>${cdata("React2u")}</company>
    <city>${cdata(v.location || "Eindhoven")}</city>
    <state>${cdata("Noord-Brabant")}</state>
    <country>${cdata("NL")}</country>
    <postalcode>${cdata("5611 NB")}</postalcode>
    <description>${cdata(beschrijving)}</description>
    ${v.salary ? `<salary>${cdata(v.salary)}</salary>` : ""}
    <jobtype>${cdata(JOBTYPE[v.employment_type] || "fulltime")}</jobtype>
    ${v.ervaringsniveau ? `<experience>${cdata(v.ervaringsniveau)}</experience>` : ""}
    ${v.opleidingsniveau ? `<education>${cdata(v.opleidingsniveau)}</education>` : ""}
    ${isOpdracht(v) ? `<category>${cdata("Freelance")}</category>` : v.vakgebied ? `<category>${cdata(v.vakgebied)}</category>` : ""}
  </job>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<source>
  <publisher>React2u</publisher>
  <publisherurl>${SITE}</publisherurl>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${jobs}
</source>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
