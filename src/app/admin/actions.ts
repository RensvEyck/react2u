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
}

export async function toggleMessageRead(id: string, read: boolean) {
  const { sb } = await requireAdmin();
  await sb.from("contact_messages").update({ read }).eq("id", id);
  revalidatePath("/admin/berichten");
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
