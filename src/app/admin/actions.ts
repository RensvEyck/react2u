"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { leadFromApplication, leadFromMessage, type NewLead } from "@/lib/leads";

function revalidateSite() {
  revalidatePath("/", "layout");
}

export async function signOutAction() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/admin/login");
}

export async function updatePageMeta(slug: string, formData: FormData) {
  const { sb } = await requirePerm("paginas");
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
  const { sb } = await requirePerm("paginas");
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
  const { sb } = await requirePerm("paginas");
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
  const { sb } = await requirePerm("vacatures");
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
  const { sb } = await requirePerm("vacatures");
  await sb.from("vacancies").delete().eq("id", id);
  revalidateSite();
  revalidatePath("/admin/vacatures");
}

/* ---------- bellijst ---------- */

export async function createLead(formData: FormData) {
  const { sb } = await requirePerm("bellijst");
  const name = String(formData.get("name") || "").trim();
  if (!name) redirect("/admin/bellijst?fout=naam");
  await sb.from("leads").insert({
    name,
    company: String(formData.get("company") || "").trim() || null,
    phone: String(formData.get("phone") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
    source: String(formData.get("source") || "").trim() || null,
    status: "te_bellen",
  });
  revalidatePath("/admin/bellijst");
  redirect("/admin/bellijst?opgeslagen=1");
}

export async function setLeadStatus(id: string, formData: FormData) {
  const { sb } = await requirePerm("bellijst");
  const status = String(formData.get("status") || "te_bellen");
  // Een poging telt als contactmoment, ook als er niet werd opgenomen — zo zie
  // je later of een lead al benaderd is en wanneer voor het laatst.
  const attempted = status === "gebeld" || status === "niet_bereikt";
  await sb
    .from("leads")
    .update({ status, ...(attempted ? { last_called_at: new Date().toISOString() } : {}) })
    .eq("id", id);
  revalidatePath("/admin/bellijst");
}

export async function updateLead(id: string, formData: FormData) {
  const { sb } = await requirePerm("bellijst");
  await sb
    .from("leads")
    .update({
      name: String(formData.get("name") || "").trim(),
      company: String(formData.get("company") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
      follow_up_on: String(formData.get("follow_up_on") || "") || null,
    })
    .eq("id", id);
  revalidatePath("/admin/bellijst");
  redirect("/admin/bellijst?opgeslagen=1");
}

export async function deleteLead(id: string) {
  const { sb } = await requirePerm("bellijst");
  await sb.from("leads").delete().eq("id", id);
  revalidatePath("/admin/bellijst");
}

/**
 * Zet een bericht of sollicitatie uit het Postvak IN op de bellijst.
 *
 * Idempotent dankzij de unieke index op `leads.source_id`: een tweede klik
 * levert een uniekheidsfout op die we hier inslikken, want wat gevraagd werd —
 * deze inzending staat op de bellijst — is dan al waar. Een controle vooraf zou
 * dat niet dichttimmeren; tussen lezen en schrijven past nog een tweede klik.
 *
 * De inzending zelf blijft onaangeraakt: gelezen/onbehandeld gaat over of je
 * hem hebt gezien, de bellijst over of je hem nog moet spreken. Dat zijn twee
 * dingen, en het Postvak IN moet ongelezen kunnen blijven tot je hem afhandelt.
 */
export async function addLeadFromInbox(kind: "bericht" | "sollicitatie", id: string) {
  const { sb } = await requirePerm("bellijst");

  let lead: NewLead;
  if (kind === "bericht") {
    const { data } = await sb
      .from("contact_messages")
      .select("name, email, phone, subject, message")
      .eq("id", id)
      .single();
    if (!data) return;
    lead = leadFromMessage(data);
  } else {
    const { data } = await sb
      .from("applications")
      .select("name, email, phone, vacancy_title, motivation")
      .eq("id", id)
      .single();
    if (!data) return;
    lead = leadFromApplication(data);
  }

  const { error } = await sb.from("leads").insert({ ...lead, source_id: id, status: "te_bellen" });
  // 23505 = staat er al; dat is geen fout. Al het andere wil je wél zien.
  if (error && error.code !== "23505") console.error("[bellijst] toevoegen mislukt:", error.message);

  revalidatePath("/admin/postvak-in");
  revalidatePath("/admin/bellijst");
}

function slugify(raw: string) {
  return raw.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function savePost(formData: FormData) {
  const { sb } = await requirePerm("blog");
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
  const { sb } = await requirePerm("blog");
  await sb.from("posts").delete().eq("id", id);
  revalidateSite();
  revalidatePath("/admin/blog");
}

export async function setApplicationStatus(id: string, formData: FormData) {
  const { sb } = await requirePerm("postvak");
  const status = String(formData.get("status") || "nieuw");
  await sb.from("applications").update({ status }).eq("id", id);
  revalidatePath("/admin/sollicitaties");
  revalidatePath("/admin/postvak-in");
}

export async function toggleMessageRead(id: string, read: boolean) {
  const { sb } = await requirePerm("postvak");
  await sb.from("contact_messages").update({ read }).eq("id", id);
  revalidatePath("/admin/berichten");
  revalidatePath("/admin/postvak-in");
}

export async function addBlock(pageSlug: string, formData: FormData) {
  const { sb } = await requirePerm("paginas");
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
  const { sb } = await requirePerm("paginas");
  await sb.from("blocks").delete().eq("id", blockId);
  revalidateSite();
  revalidatePath(`/admin/paginas/${pageSlug}`);
}

export async function createPage(formData: FormData) {
  const { sb } = await requirePerm("paginas");
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
  const { sb } = await requirePerm("paginas");
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
  const { sb } = await requirePerm("instellingen");
  const value = collectRows(formData, ["label", "href"]).filter((r) => r.label && r.href);
  await sb.from("site_settings").upsert({ key: "documents", value });
  revalidateSite();
  redirect("/admin/instellingen?opgeslagen=1");
}

export async function saveSeoSettings(formData: FormData) {
  const { sb } = await requirePerm("seo");
  const value = {
    description: String(formData.get("description") || "").trim(),
    share_image: String(formData.get("share_image") || "").trim(),
  };
  await sb.from("site_settings").upsert({ key: "seo", value });
  revalidateSite();
  redirect("/admin/seo?opgeslagen=1");
}

export async function saveCertificatesSettings(formData: FormData) {
  const { sb } = await requirePerm("instellingen");
  // Zonder afbeelding valt er niets te tonen; alt en href mogen leeg blijven.
  const value = collectRows(formData, ["image", "alt", "href"]).filter((r) => r.image);
  await sb.from("site_settings").upsert({ key: "certificates", value });
  revalidateSite();
  redirect("/admin/instellingen?opgeslagen=1");
}

export async function saveContactSettings(formData: FormData) {
  const { sb } = await requirePerm("instellingen");
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

/* ---------- gebruikers en rollen ---------- */

/**
 * Nodigt een collega uit.
 *
 * Supabase maakt het account aan en verstuurt zelf de mail, inclusief
 * vervaltermijn. De genodigde landt op /admin/uitnodiging en kiest daar een
 * wachtwoord. Daarna volgt de rij in `admins` — pas dán heeft hij toegang;
 * een auth-account op zichzelf geeft niets.
 */
export async function inviteUser(formData: FormData) {
  const { admin } = await requirePerm("gebruikers");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const roleId = String(formData.get("role_id") || "");
  if (!email || !roleId) redirect("/admin/gebruikers?fout=onvolledig");

  const { supabaseAdmin, canInvite } = await import("@/lib/supabase/admin");
  if (!canInvite()) redirect("/admin/gebruikers?fout=geen-sleutel");

  const site =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "https://react2u.nl";

  const sa = supabaseAdmin();
  const { data, error } = await sa.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${site.replace(/\/$/, "")}/admin/uitnodiging`,
  });

  if (error || !data?.user) {
    // Bestaat het account al, dan alleen de adminrij toevoegen — dat is precies
    // het geval "collega had al een account maar geen toegang".
    const already = /already|registered|exists/i.test(error?.message || "");
    if (!already) redirect(`/admin/gebruikers?fout=uitnodigen`);
    const { data: found } = await sa.auth.admin.listUsers();
    const existing = found?.users.find((u) => u.email?.toLowerCase() === email);
    if (!existing) redirect("/admin/gebruikers?fout=uitnodigen");
    await addAdminRow(existing.id, email, roleId, admin.userId);
    redirect("/admin/gebruikers?opgeslagen=1");
  }

  await addAdminRow(data.user.id, email, roleId, admin.userId);
  redirect("/admin/gebruikers?opgeslagen=1");
}

async function addAdminRow(userId: string, email: string, roleId: string, invitedBy: string) {
  const { sb } = await requirePerm("gebruikers");
  await sb.from("admins").upsert(
    { user_id: userId, email, role_id: roleId, invited_at: new Date().toISOString(), invited_by: invitedBy },
    { onConflict: "user_id" }
  );
  revalidatePath("/admin/gebruikers");
}

export async function setUserRole(userId: string, formData: FormData) {
  const { sb } = await requirePerm("gebruikers");
  const roleId = String(formData.get("role_id") || "");
  if (!roleId) return;
  const { error } = await sb.from("admins").update({ role_id: roleId }).eq("user_id", userId);
  // De databasetrigger weigert het degraderen van de laatste beheerder. Die
  // fout is geen bug maar de bedoeling — toon hem in plaats van hem te slikken.
  if (error) redirect("/admin/gebruikers?fout=laatste-beheerder");
  revalidatePath("/admin/gebruikers");
}

/**
 * Haalt iemands toegang weg.
 *
 * Alleen de rij in `admins`; het auth-account blijft bestaan. Zo raakt niemand
 * per ongeluk een account kwijt dat elders nog gebruikt wordt, en is toegang
 * teruggeven een kwestie van opnieuw uitnodigen.
 */
export async function removeUser(userId: string) {
  const { sb, admin } = await requirePerm("gebruikers");
  if (userId === admin.userId) redirect("/admin/gebruikers?fout=jezelf");
  const { error } = await sb.from("admins").delete().eq("user_id", userId);
  if (error) redirect("/admin/gebruikers?fout=laatste-beheerder");
  revalidatePath("/admin/gebruikers");
}

export async function saveRole(formData: FormData) {
  const { sb } = await requirePerm("gebruikers");
  const { normalizePermissions, ALL_PERMISSIONS, OWNER_ROLE_KEY } = await import("@/lib/permissions");

  const id = String(formData.get("id") || "");
  const label = String(formData.get("label") || "").trim();
  if (!label) redirect("/admin/gebruikers?fout=naam");

  const chosen = normalizePermissions(ALL_PERMISSIONS.filter((p) => formData.get(`perm.${p}`) === "on"));

  if (id) {
    const { data: existing } = await sb.from("roles").select("key, is_system").eq("id", id).maybeSingle();
    // De systeemrol houdt altijd alles. Zonder die regel kun je met twee
    // klikken de rol uitkleden waar je eigen toegang aan hangt.
    const permissions =
      (existing as { key?: string })?.key === OWNER_ROLE_KEY ? ALL_PERMISSIONS : chosen;
    const { error } = await sb.from("roles").update({ label, permissions }).eq("id", id);
    if (error) redirect("/admin/gebruikers?fout=laatste-beheerder");
  } else {
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (!key) redirect("/admin/gebruikers?fout=naam");
    const { error } = await sb.from("roles").insert({ key, label, permissions: chosen });
    if (error) redirect("/admin/gebruikers?fout=rol-bestaat-al");
  }
  revalidatePath("/admin/gebruikers");
  redirect("/admin/gebruikers?opgeslagen=1");
}

export async function deleteRole(id: string) {
  const { sb } = await requirePerm("gebruikers");
  const { data: role } = await sb.from("roles").select("is_system").eq("id", id).maybeSingle();
  if ((role as { is_system?: boolean })?.is_system) redirect("/admin/gebruikers?fout=systeemrol");
  // Rollen met gebruikers eraan laten we staan: die gebruikers zouden anders
  // in het niets belanden. Verplaats ze eerst.
  const { count } = await sb.from("admins").select("user_id", { count: "exact", head: true }).eq("role_id", id);
  if ((count ?? 0) > 0) redirect("/admin/gebruikers?fout=rol-in-gebruik");
  const { error } = await sb.from("roles").delete().eq("id", id);
  if (error) redirect("/admin/gebruikers?fout=laatste-beheerder");
  revalidatePath("/admin/gebruikers");
}

/* ---------- verwijderen van inzendingen ---------- */

/**
 * Verwijdert een sollicitatie inclusief het cv.
 *
 * Volgorde is niet vrijblijvend: eerst het pad ophalen, dan het bestand, dan
 * de rij. Andersom houd je een wees over in de opslag waar niets meer naar
 * verwijst — en die is via de applicatie niet meer te vinden.
 *
 * Zonder deze actie bestond er geen enkele manier om een cv te verwijderen,
 * ook niet voor de superadmin. Voor een organisatie die zich aan een
 * bewaartermijn moet houden is dat geen detail.
 */
export async function deleteApplication(id: string) {
  const { sb } = await requirePerm("postvak");
  const { data } = await sb.from("applications").select("cv_path").eq("id", id).maybeSingle();
  const cvPath = (data as { cv_path?: string | null })?.cv_path;
  if (cvPath) {
    const { error } = await sb.storage.from("cvs").remove([cvPath]);
    // Bestand weg maar rij nog niet: dat is een halve verwijdering en juist
    // gevaarlijk, want het cv lijkt dan nog te bestaan in het overzicht.
    if (error) redirect("/admin/postvak-in?fout=cv-verwijderen");
  }
  await sb.from("applications").delete().eq("id", id);
  revalidatePath("/admin/postvak-in");
  revalidatePath("/admin/sollicitaties");
  redirect("/admin/postvak-in?opgeslagen=1");
}

export async function deleteMessage(id: string) {
  const { sb } = await requirePerm("postvak");
  await sb.from("contact_messages").delete().eq("id", id);
  revalidatePath("/admin/postvak-in");
  revalidatePath("/admin/berichten");
  redirect("/admin/postvak-in?opgeslagen=1");
}
