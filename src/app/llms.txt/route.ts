import { CONTACT_FALLBACK, getPublishedPages, getPublishedPosts, getPublishedVacancies, getSetting, type ContactInfo } from "@/lib/content";
import { llmsTekst } from "@/lib/llms";
import { SITE_URL } from "@/lib/metadata";

// Net als sitemap.xml: een uur vers. Mislukt een verversing, dan blijft de vorige versie staan.
export const revalidate = 3600;

/**
 * /llms.txt (https://llmstxt.org): een Markdown-overzicht van de site voor
 * taalmodellen en AI-agents. De inhoud komt uit lib/llms.ts. De middleware
 * slaat adressen met een extensie over, dus ook in onderhoudsmodus is dit
 * bestand bereikbaar, zoals robots.txt en sitemap.xml.
 */
export async function GET() {
  const [pages, posts, vacancies, contact] = await Promise.all([
    getPublishedPages(),
    getPublishedPosts(),
    getPublishedVacancies(),
    getSetting<Partial<ContactInfo>>("contact"),
  ]);
  const tekst = llmsTekst({
    base: SITE_URL.replace(/\/$/, ""),
    pages,
    posts,
    vacancies,
    contact: { ...CONTACT_FALLBACK, ...contact },
  });
  return new Response(tekst, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Bedoeld voor agents, niet als zoekresultaat: zo komt het bestand niet tussen de pagina's in Google.
      "X-Robots-Tag": "noindex",
    },
  });
}
