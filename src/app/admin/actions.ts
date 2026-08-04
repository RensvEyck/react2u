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

export async function saveDocumentsSettings(formData: FormData) {
  const { sb } = await requireAdmin();
  const value = {
    algemene_voorwaarden: String(formData.get("algemene_voorwaarden") || ""),
    klachtenprocedure: String(formData.get("klachtenprocedure") || ""),
    privacy_reglement: String(formData.get("privacy_reglement") || ""),
  };
  await sb.from("site_settings").upsert({ key: "documents", value });
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
