import { requirePerm } from "@/lib/admin";
import { BLOCK_TEMPLATES } from "@/lib/blockTemplates";
import { buildUsage, type Source } from "@/lib/mediaUsage";
import { FAVICON_URL, LOGO_SVG_URL, LOGO_URL } from "@/lib/nav";
import MediaBeheer from "./MediaBeheer";

const SETTING_LABELS: Record<string, { label: string; href: string }> = {
  documents: { label: "Documenten in de footer", href: "/admin/instellingen" },
  certificates: { label: "Certificaten in de footer", href: "/admin/instellingen" },
  seo: { label: "Standaard deelafbeelding", href: "/admin/seo" },
  contact: { label: "Contactgegevens", href: "/admin/instellingen" },
};

/**
 * De mediabibliotheek zelf is een client component (uploaden gebeurt
 * rechtstreeks vanuit de browser naar Supabase Storage). Die kan dus geen
 * rechtencontrole doen. Deze server-wrapper doet dat wél — zonder hem was
 * elke ingelogde gebruiker binnen, ongeacht zijn rol.
 *
 * De echte grens blijft de storage-policy: `has_perm('media')` op
 * storage.objects. Dit voorkomt alleen dat iemand zonder dat recht een scherm
 * te zien krijgt waar niets werkt.
 *
 * Hier wordt ook uitgezocht waar elk bestand gebruikt wordt, zodat
 * verwijderen niet meer "controleer zelf of het nergens staat" is.
 */
export default async function MediaPage() {
  const { sb, admin } = await requirePerm("media");
  const [blocks, pages, posts, vacancies, settings] = await Promise.all([
    sb.from("blocks").select("id, page_id, type, label, data"),
    sb.from("pages").select("id, slug, title, og_image"),
    sb.from("posts").select("id, title, cover_image, og_image, excerpt, body_md"),
    sb.from("vacancies").select("id, title, intro, description_md"),
    sb.from("site_settings").select("key, value"),
  ]);

  type PageRow = { id: string; slug: string; title: string; og_image: string | null };
  type BlockRow = { id: string; page_id: string; type: string; label: string | null; data: unknown };
  type PostRow = { id: string; title: string; cover_image: string | null; og_image: string | null; excerpt: string | null; body_md: string | null };
  type VacancyRow = { id: string; title: string; intro: string | null; description_md: string | null };

  const pageRows = (pages.data as PageRow[]) || [];
  const pageById = new Map(pageRows.map((p) => [p.id, p]));

  const sources: Source[] = [
    ...pageRows.map((p) => ({
      label: `Pagina ${p.title} (deelafbeelding)`, href: `/admin/paginas/${p.slug}`, text: p.og_image || "",
    })),
    ...((blocks.data as BlockRow[]) || []).map((b) => {
      const page = pageById.get(b.page_id);
      const name = b.label || BLOCK_TEMPLATES[b.type]?.label || b.type;
      return {
        label: page ? `${page.title} — ${name}` : name,
        href: page ? `/admin/paginas/${page.slug}/blok/${b.id}` : "/admin/paginas",
        text: JSON.stringify(b.data),
      };
    }),
    ...((posts.data as PostRow[]) || []).map((p) => ({
      label: `Artikel ${p.title}`,
      href: `/admin/blog/${p.id}`,
      text: [p.cover_image, p.og_image, p.excerpt, p.body_md].filter(Boolean).join(" "),
    })),
    ...((vacancies.data as VacancyRow[]) || []).map((v) => ({
      label: `Vacature ${v.title}`,
      href: `/admin/vacatures/${v.id}`,
      text: [v.intro, v.description_md].filter(Boolean).join(" "),
    })),
    ...((settings.data as { key: string; value: unknown }[]) || []).map((s) => ({
      label: SETTING_LABELS[s.key]?.label || `Instelling ${s.key}`,
      href: SETTING_LABELS[s.key]?.href || "/admin/instellingen",
      text: JSON.stringify(s.value),
    })),
    // Vast in de code, dus nergens in de database te vinden — maar wel in gebruik.
    { label: "Logo en favicon (vast in de code)", href: "", text: [LOGO_URL, FAVICON_URL, LOGO_SVG_URL].join(" ") },
  ];

  // Zonder deze rechten geeft RLS concepten niet terug; een bestand dat alleen
  // in een concept staat, lijkt dan ongebruikt. Dat zeggen we er dan bij.
  const complete = (["paginas", "blog", "vacatures"] as const).every((p) => admin.permissions.includes(p));

  return <MediaBeheer usage={buildUsage(sources)} complete={complete} />;
}
