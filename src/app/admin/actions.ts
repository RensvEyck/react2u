"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabase/server";

function revalidateSite() {
  revalidatePath("/", "layout");
}

export async function signOutAction() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/admin/login");
}

export async function updatePageMeta(slug: string, formData: FormData) {
  const { sb } = await requireAdmin();
  await sb
    .from("pages")
    .update({
      title: String(formData.get("title") || ""),
      seo_title: String(formData.get("seo_title") || "") || null,
      seo_description: String(formData.get("seo_description") || "") || null,
      og_image: String(formData.get("og_image") || "") || null,
      published: formData.get("published") === "on",
    })
    .eq("slug", slug);
  revalidateSite();
  redirect(`/admin/paginas/${slug}?opgeslagen=1`);
}

export async function updateBlockData(blockId: string, pageSlug: string, formData: FormData) {
  const { sb } = await requireAdmin();
  let data: unknown;
  try {
    data = JSON.parse(String(formData.get("json") || "{}"));
  } catch {
    redirect(`/admin/paginas/${pageSlug}/blok/${blockId}?fout=json`);
  }
  await sb.from("blocks").update({ data }).eq("id", blockId);
  revalidateSite();
  redirect(`/admin/paginas/${pageSlug}?opgeslagen=1`);
}

export async function moveBlock(blockId: string, pageSlug: string, direction: "up" | "down") {
  const { sb } = await requireAdmin();
  const { data: block } = await sb.from("blocks").select("*").eq("id", blockId).single();
  if (!block) return;
  const { data: siblings } = await sb.from("blocks").select("id, sort").eq("page_id", block.page_id).order("sort");
  if (!siblings) return;
  const idx = siblings.findIndex((b) => b.id === blockId);
  const swapWith = direction === "up" ? siblings[idx - 1] : siblings[idx + 1];
  if (!swapWith) return;
  await sb.from("blocks").update({ sort: swapWith.sort }).eq("id", blockId);
  await sb.from("blocks").update({ sort: block.sort }).eq("id", swapWith.id);
  revalidateSite();
  revalidatePath(`/admin/paginas/${pageSlug}`);
}

export async function saveVacancy(formData: FormData) {
  const { sb } = await requireAdmin();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "draft");
  const payload = {
    title: String(formData.get("title") || ""),
    slug: String(formData.get("slug") || "")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/(^-|-$)/g, ""),
    location: String(formData.get("location") || "Eindhoven"),
    employment_type: String(formData.get("employment_type") || "FULL_TIME"),
    hours: String(formData.get("hours") || "") || null,
    salary: String(formData.get("salary") || "") || null,
    intro: String(formData.get("intro") || "") || null,
    description_md: String(formData.get("description_md") || "") || null,
    status,
    valid_through: String(formData.get("valid_through") || "") || null,
    seo_title: String(formData.get("seo_title") || "") || null,
    seo_description: String(formData.get("seo_description") || "") || null,
  };
  if (!payload.title || !payload.slug) redirect(`/admin/vacatures?fout=titel-of-slug`);

  if (id) {
    const { data: existing } = await sb.from("vacancies").select("status, published_at").eq("id", id).single();
    const published_at =
      status === "published" && !existing?.published_at ? new Date().toISOString() : existing?.published_at || null;
    await sb.from("vacancies").update({ ...payload, published_at }).eq("id", id);
  } else {
    await sb.from("vacancies").insert({
      ...payload,
      published_at: status === "published" ? new Date().toISOString() : null,
    });
  }
  revalidateSite();
  redirect("/admin/vacatures?opgeslagen=1");
}

export async function deleteVacancy(id: string) {
  const { sb } = await requireAdmin();
  await sb.from("vacancies").delete().eq("id", id);
  revalidateSite();
  revalidatePath("/admin/vacatures");
}

function slugify(raw: string) {
  return raw.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function savePost(formData: FormData) {
  const { sb } = await requireAdmin();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "draft");
  const payload = {
    title: String(formData.get("title") || "").trim(),
    slug: slugify(String(formData.get("slug") || "")),
    excerpt: String(formData.get("excerpt") || "") || null,
    body_md: String(formData.get("body_md") || "") || null,
    cover_image: String(formData.get("cover_image") || "") || null,
    author: String(formData.get("author") || "") || null,
    status,
    seo_title: String(formData.get("seo_title") || "") || null,
    seo_description: String(formData.get("seo_description") || "") || null,
    og_image: String(formData.get("og_image") || "") || null,
  };
  if (!payload.title || !payload.slug) redirect("/admin/blog?fout=titel-of-slug");

  if (id) {
    // published_at markeert de eerste publicatie en blijft daarna staan, zodat
    // een latere correctie de datum in het overzicht en de sitemap niet verzet.
    const { data: existing } = await sb.from("posts").select("published_at").eq("id", id).single();
    const published_at =
      status === "published" && !existing?.published_at ? new Date().toISOString() : existing?.published_at || null;
    const { error } = await sb.from("posts").update({ ...payload, published_at }).eq("id", id);
    if (error) redirect(`/admin/blog/${id}?fout=opslaan`);
  } else {
    const { error } = await sb.from("posts").insert({
      ...payload,
      published_at: status === "published" ? new Date().toISOString() : null,
    });
    if (error) redirect("/admin/blog?fout=slug-bestaat-al");
  }
  revalidateSite();
  redirect("/admin/blog?opgeslagen=1");
}

export async function deletePost(id: string) {
  const { sb } = await requireAdmin();
  await sb.from("posts").delete().eq("id", id);
  revalidateSite();
  revalidatePath("/admin/blog");
}

export async function setApplicationStatus(id: string, formData: FormData) {
  const { sb } = await requireAdmin();
  const status = String(formData.get("status") || "nieuw");
  await sb.from("applications").update({ status }).eq("id", id);
  revalidatePath("/admin/sollicitaties");
  revalidatePath("/admin/postvak-in");
}

export async function toggleMessageRead(id: string, read: boolean) {
  const { sb } = await requireAdmin();
  await sb.from("contact_messages").update({ read }).eq("id", id);
  revalidatePath("/admin/berichten");
  revalidatePath("/admin/postvak-in");
}

export async function addBlock(pageSlug: string, formData: FormData) {
  const { sb } = await requireAdmin();
  const type = String(formData.get("type") || "richText");
  const { BLOCK_TEMPLATES } = await import("@/lib/blockTemplates");
  const template = BLOCK_TEMPLATES[type] || BLOCK_TEMPLATES.richText;
  const { data: page } = await sb.from("pages").select("id").eq("slug", pageSlug).single();
  if (!page) return;
  const { data: last } = await sb
    .from("blocks").select("sort").eq("page_id", page.id).order("sort", { ascending: false }).limit(1).maybeSingle();
  const { data: inserted } = await sb
    .from("blocks")
    .insert({ page_id: page.id, type, label: template.label, sort: (last?.sort ?? -1) + 1, data: template.data })
    .select("id").single();
  revalidateSite();
  if (inserted) redirect(`/admin/paginas/${pageSlug}/blok/${inserted.id}`);
  redirect(`/admin/paginas/${pageSlug}`);
}

export async function deleteBlock(blockId: string, pageSlug: string) {
  const { sb } = await requireAdmin();
  await sb.from("blocks").delete().eq("id", blockId);
  revalidateSite();
  revalidatePath(`/admin/paginas/${pageSlug}`);
}

export async function createPage(formData: FormData) {
  const { sb } = await requireAdmin();
  const title = String(formData.get("title") || "").trim();
  const slug = String(formData.get("slug") || "")
    .toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "");
  if (!title || !slug) redirect("/admin/paginas?fout=titel-of-slug");
  const { data: last } = await sb.from("pages").select("sort").order("sort", { ascending: false }).limit(1).maybeSingle();
  const { error } = await sb.from("pages").insert({ slug, title, published: false, sort: (last?.sort ?? 0) + 1 });
  if (error) redirect("/admin/paginas?fout=slug-bestaat-al");
  revalidateSite();
  redirect(`/admin/paginas/${slug}`);
}

export async function deletePage(slug: string) {
  const { sb } = await requireAdmin();
  await sb.from("pages").delete().eq("slug", slug);
  revalidateSite();
  redirect("/admin/paginas");
}

// De lijst-editor stuurt genummerde velden mee (label.0, href.0, label.1, …).
// De nummers hoeven niet aaneengesloten te zijn: verwijder je een regel in het
// midden, dan ontbreekt die index gewoon. Daarom lopen we over de aanwezige
// sleutels in plaats van over een teller.
function collectRows(formData: FormData, fields: string[]): Record<string, string>[] {
  const indices = new Set<number>();
  for (const key of formData.keys()) {
    const m = key.match(/^(?:.+)\.(\d+)$/);
    if (m) indices.add(Number(m[1]));
  }
  return [...indices]
    .sort((a, b) => a - b)
    .map((i) => Object.fromEntries(fields.map((f) => [f, String(formData.get(`${f}.${i}`) || "").trim()])));
}

export async function saveDocumentsSettings(formData: FormData) {
  const { sb } = await requireAdmin();
  const value = collectRows(formData, ["label", "href"]).filter((r) => r.label && r.href);
  await sb.from("site_settings").upsert({ key: "documents", value });
  revalidateSite();
  redirect("/admin/instellingen?opgeslagen=1");
}

export async function saveSeoSettings(formData: FormData) {
  const { sb } = await requireAdmin();
  const value = {
    description: String(formData.get("description") || "").trim(),
    share_image: String(formData.get("share_image") || "").trim(),
  };
  await sb.from("site_settings").upsert({ key: "seo", value });
  revalidateSite();
  redirect("/admin/seo?opgeslagen=1");
}

export async function saveCertificatesSettings(formData: FormData) {
  const { sb } = await requireAdmin();
  // Zonder afbeelding valt er niets te tonen; alt en href mogen leeg blijven.
  const value = collectRows(formData, ["image", "alt", "href"]).filter((r) => r.image);
  await sb.from("site_settings").upsert({ key: "certificates", value });
  revalidateSite();
  redirect("/admin/instellingen?opgeslagen=1");
}

export async function saveContactSettings(formData: FormData) {
  const { sb } = await requireAdmin();
  const value = {
    phone: String(formData.get("phone") || ""),
    phoneDisplay: String(formData.get("phoneDisplay") || ""),
    email: String(formData.get("email") || ""),
    addressLine1: String(formData.get("addressLine1") || ""),
    addressLine2: String(formData.get("addressLine2") || ""),
    kvk: String(formData.get("kvk") || ""),
    btw: String(formData.get("btw") || ""),
    iban: String(formData.get("iban") || ""),
  };
  await sb.from("site_settings").upsert({ key: "contact", value });
  revalidateSite();
  redirect("/admin/instellingen?opgeslagen=1");
}
