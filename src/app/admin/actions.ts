"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requirePerm } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { leadFromApplication, leadFromMessage, type NewLead } from "@/lib/leads";
import { geldigeUrl, normalizeKoppelingen } from "@/lib/koppelingen";

type Sb = Awaited<ReturnType<typeof requirePerm>>["sb"];

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
  const published = formData.get("published") === "on";
  const { error } = await sb
    .from("pages")
    .update({
      title: String(formData.get("title") || ""),
      seo_title: String(formData.get("seo_title") || "") || null,
      seo_description: String(formData.get("seo_description") || "") || null,
      og_image: String(formData.get("og_image") || "") || null,
      published,
    })
    .eq("slug", slug);
  if (error) redirect(`/admin/paginas/${slug}?fout=opslaan`);
  if (published) await clearRedirect(sb, slug === "home" ? "/" : `/${slug}`);
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
  const { error } = await sb.from("blocks").update({ data }).eq("id", blockId);
  if (error) redirect(`/admin/paginas/${pageSlug}/blok/${blockId}?fout=opslaan`);
  revalidateSite();
  // In de editor blijven: met ⌘S sla je tussendoor op en werk je verder.
  redirect(`/admin/paginas/${pageSlug}/blok/${blockId}?opgeslagen=1`);
}

/**
 * Slaat de volgorde van de blokken op, zoals de gebruiker ze sleepte.
 *
 * Alleen ids die echt bij deze pagina horen tellen mee; wat de browser verder
 * meestuurt wordt genegeerd. De versiegeschiedenis slaat pure
 * volgordewijzigingen over (zie migratie 0008) — slepen is geen inhoud.
 */
export async function reorderBlocks(pageSlug: string, ids: string[]) {
  const { sb } = await requirePerm("paginas");
  const { data: page } = await sb.from("pages").select("id").eq("slug", pageSlug).single();
  if (!page) throw new Error("Pagina niet gevonden");
  const { data: blocks } = await sb.from("blocks").select("id").eq("page_id", page.id);
  const own = new Set(((blocks as { id: string }[]) || []).map((b) => b.id));
  const order = ids.filter((id) => own.has(id));
  const results = await Promise.all(order.map((id, i) => sb.from("blocks").update({ sort: i }).eq("id", id)));
  if (results.some((r) => r.error)) throw new Error("Volgorde opslaan mislukt");
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
    const { data: existing } = await sb.from("vacancies").select("status, slug, published_at").eq("id", id).single();
    const published_at =
      status === "published" && !existing?.published_at ? new Date().toISOString() : existing?.published_at || null;
    const { error } = await sb.from("vacancies").update({ ...payload, published_at }).eq("id", id);
    // Mislukt de opslag (bijvoorbeeld omdat de slug al bestaat), dan géén
    // doorverwijzing: die zou de nog live vacature naar een andere sturen.
    if (error) redirect(`/admin/vacatures/${id}?fout=${error.code === "23505" ? "slug-bestaat-al" : "opslaan"}`);
    if (existing?.status === "published" && existing.slug !== payload.slug) {
      await autoRedirect(sb, `/vacatures/${existing.slug}`, `/vacatures/${payload.slug}`);
    }
  } else {
    const { error } = await sb.from("vacancies").insert({
      ...payload,
      published_at: status === "published" ? new Date().toISOString() : null,
    });
    if (error) redirect(`/admin/vacatures/nieuw?fout=${error.code === "23505" ? "slug-bestaat-al" : "opslaan"}`);
  }
  if (status === "published") await clearRedirect(sb, `/vacatures/${payload.slug}`);
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
    const { data: existing } = await sb.from("posts").select("status, slug, published_at").eq("id", id).single();
    const published_at =
      status === "published" && !existing?.published_at ? new Date().toISOString() : existing?.published_at || null;
    const { error } = await sb.from("posts").update({ ...payload, published_at }).eq("id", id);
    if (error) redirect(`/admin/blog/${id}?fout=opslaan`);
    if (existing?.status === "published" && existing.slug !== payload.slug) {
      await autoRedirect(sb, `/blog/${existing.slug}`, `/blog/${payload.slug}`);
    }
  } else {
    const { error } = await sb.from("posts").insert({
      ...payload,
      published_at: status === "published" ? new Date().toISOString() : null,
    });
    if (error) redirect("/admin/blog?fout=slug-bestaat-al");
  }
  if (status === "published") await clearRedirect(sb, `/blog/${payload.slug}`);
  revalidateSite();
  redirect("/admin/blog?opgeslagen=1");
}

export async function deletePost(id: string) {
  const { sb, admin } = await requirePerm("blog");
  const { data: post } = await sb.from("posts").select("slug, status").eq("id", id).maybeSingle();
  await sb.from("posts").delete().eq("id", id);
  revalidateSite();
  revalidatePath("/admin/blog");
  if (post?.status === "published") offerRedirect(admin.permissions, `/blog/${post.slug}`, "artikel");
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

/**
 * "Ongedaan maken" direct na het verwijderen van een blok: haalt de laatste
 * stand terug uit de versiegeschiedenis. Server actions van één browser lopen
 * na elkaar, dus de verwijdering (en de revisie die de trigger daarvan maakt)
 * is altijd klaar als deze begint.
 */
export async function undoDeleteBlock(blockId: string, pageSlug: string): Promise<boolean> {
  const { sb } = await requirePerm("paginas");
  const { data: rev } = await sb
    .from("revisions")
    .select("data")
    .eq("table_name", "blocks")
    .eq("row_id", blockId)
    .eq("action", "delete")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!rev) return false;
  const { restorableFields } = await import("@/lib/revisions");
  const { error } = await sb.from("blocks").upsert(restorableFields("blocks", rev.data, false), { onConflict: "id" });
  if (error) return false;
  revalidateSite();
  revalidatePath(`/admin/paginas/${pageSlug}`);
  return true;
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
  const { sb, admin } = await requirePerm("paginas");
  const { data: page } = await sb.from("pages").select("published").eq("slug", slug).maybeSingle();
  await sb.from("pages").delete().eq("slug", slug);
  revalidateSite();
  if (page?.published) offerRedirect(admin.permissions, `/${slug}`, "pagina");
  const { hasVersions } = await import("@/lib/revisionsDb");
  redirect(`/admin/paginas?opgeslagen=${(await hasVersions(sb)) ? "verwijderd" : "definitief-weg"}`);
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

/**
 * Koppelingen: de agendalink voor "Plan direct een kennismaking", de
 * reactietermijn voor sollicitanten en het klantportaal achter "Ziek melden"
 * (lib/koppelingen.ts). Een ingevulde link moet een volledig https-adres
 * zijn; anders zou er een dode knop op de site komen. De bedankmelding leest
 * de instelling bij elke inzending; de header staat in de statische pagina's,
 * vandaar revalidateSite().
 */
export async function saveKoppelingenSettings(formData: FormData) {
  const { sb } = await requirePerm("instellingen");
  const kennismaking = String(formData.get("kennismaking_url") || "").trim();
  if (kennismaking && !geldigeUrl(kennismaking)) redirect("/admin/instellingen?fout=koppeling-url#koppelingen");
  const ziekmelden = String(formData.get("ziekmelden_url") || "").trim();
  if (ziekmelden && !geldigeUrl(ziekmelden)) redirect("/admin/instellingen?fout=koppeling-url#koppelingen");
  const value = normalizeKoppelingen({
    kennismaking_url: kennismaking,
    sollicitatie_werkdagen: formData.get("sollicitatie_werkdagen"),
    ziekmelden_url: ziekmelden,
  });
  const { error } = await sb.from("site_settings").upsert({ key: "koppelingen", value });
  if (error) redirect("/admin/instellingen?fout=opslaan");
  revalidateSite();
  redirect("/admin/instellingen?opgeslagen=1");
}

// Geen revalidateSite(): de pagina's zelf veranderen niet, de middleware houdt
// bezoekers tegen. Wél de fout controleren — wie denkt dat de site dicht is
// terwijl hij openstaat (of andersom), hoort dat te weten.
export async function saveMaintenanceSettings(formData: FormData) {
  const { sb } = await requirePerm("instellingen");
  const value = {
    enabled: formData.get("enabled") === "on",
    message: String(formData.get("message") || "").trim(),
  };
  const { error } = await sb.from("site_settings").upsert({ key: "maintenance", value });
  if (error) redirect("/admin/instellingen?fout=opslaan");
  revalidatePath("/admin", "layout");
  redirect("/admin/instellingen?opgeslagen=1");
}

/* ---------- gebruikers en rollen ---------- */

export type InviteState =
  | { status: "idle" }
  | { status: "error"; message: string }
  // `existing`: het adres had al een account. Dan is de link een herstellink.
  | { status: "ok"; email: string; roleLabel: string; existing: boolean; link: string; mail: "verstuurd" | "uit" | "mislukt" };

/**
 * Nodigt een collega uit, of stuurt iemand een nieuwe link.
 *
 * Supabase maakt het account aan; de link maken we zelf en mailen we via
 * Resend als dat is ingesteld — zie `src/lib/invite.ts` waarom niet via de mail
 * van Supabase. De link komt altijd terug naar het scherm, zodat wie uitnodigt
 * hem ook zelf kan doorsturen als de mail niet aankomt.
 *
 * Toegang volgt uit de rij in `admins`, niet uit het account: een auth-account
 * op zichzelf geeft niets.
 */
export async function inviteUser(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const { sb, admin } = await requirePerm("gebruikers");
  const { inviteErrorText, inviteLink, isEmail, isExistingAccount, siteUrl } = await import("@/lib/invite");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const roleId = String(formData.get("role_id") || "");
  if (!isEmail(email)) return { status: "error", message: "Vul een geldig e-mailadres in." };

  const { data: role } = await sb.from("roles").select("label").eq("id", roleId).maybeSingle();
  if (!role) return { status: "error", message: "Kies een rol." };
  const roleLabel = (role as { label: string }).label;

  const { supabaseAdmin, canInvite } = await import("@/lib/supabase/admin");
  if (!canInvite()) {
    return { status: "error", message: "Uitnodigen staat uit: SUPABASE_SERVICE_ROLE_KEY ontbreekt in Vercel." };
  }
  const sa = supabaseAdmin();

  // Maakt het account aan als het er nog niet is. Voor wie al is uitgenodigd
  // maar de link nooit gebruikte, komt er een nieuwe; de oude vervalt.
  let existing = false;
  let result = await sa.auth.admin.generateLink({ type: "invite", email });

  // Bestond het account al (bevestigd), dan een herstellink. Kent de collega
  // zijn wachtwoord, dan logt hij gewoon in; anders kiest hij er hiermee een.
  // Zonder deze link zat wie nooit inlogde vast: "wachtwoord vergeten" is er niet.
  if (result.error && isExistingAccount(result.error)) {
    existing = true;
    result = await sa.auth.admin.generateLink({ type: "recovery", email });
  }
  if (result.error) {
    const e = result.error;
    console.error("[uitnodigen] generateLink voor %s: %s %s %s", email, e.status, e.code, e.message);
    return { status: "error", message: inviteErrorText(e) };
  }
  const { user, properties } = result.data;

  const rowError = await addAdminRow(sb, user.id, email, roleId, admin.userId);
  if (rowError) return { status: "error", message: rowError };

  const link = inviteLink(siteUrl(), properties.hashed_token, existing ? "recovery" : "invite");
  const { mailReady, sendInvite } = await import("@/lib/mail");
  if (!mailReady()) return { status: "ok", email, roleLabel, existing, link, mail: "uit" };
  const sent = await sendInvite({ to: email, link, invitedBy: admin.email, roleLabel });
  return { status: "ok", email, roleLabel, existing, link, mail: sent ? "verstuurd" : "mislukt" };
}

async function addAdminRow(sb: Sb, userId: string, email: string, roleId: string, invitedBy: string) {
  const { error } = await sb.from("admins").upsert(
    { user_id: userId, email, role_id: roleId, invited_at: new Date().toISOString(), invited_by: invitedBy },
    { onConflict: "user_id" }
  );
  revalidatePath("/admin/gebruikers");
  if (!error) return null;
  console.error("[uitnodigen] admins-rij voor %s: %s", email, error.message);
  // Dezelfde databasetrigger als bij setUserRole: de laatste beheerder mag
  // zijn recht `gebruikers` niet kwijtraken, ook niet via een nieuwe uitnodiging.
  return /rollen mag beheren/i.test(error.message)
    ? "Geweigerd: er moet minstens één gebruiker overblijven die rollen mag beheren."
    : "Het account staat klaar, maar toegang geven mislukte. Probeer het opnieuw.";
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
 * Verwijdert cv's en zegt of ze daarna écht weg zijn.
 *
 * Zonder verwijderrecht op de bucket meldt Storage géén fout maar een lege
 * lijst — het bestand staat er dan nog (zie migratie 0009). Vertrouwen op
 * "geen fout" liet cv's dus stil achter. Wat niet in de lijst van verwijderde
 * bestanden staat, zoeken we op: bestaat het niet meer (al eerder weg), dan is
 * dat goed; staat het er nog, dan is het mislukt en blijft de rij staan.
 */
async function removeCvs(sb: Sb, paths: string[]): Promise<boolean> {
  if (!paths.length) return true;
  const { data: removed, error } = await sb.storage.from("cvs").remove(paths);
  if (error) return false;
  const gone = new Set(((removed as { name: string }[] | null) || []).map((o) => o.name));
  for (const path of paths.filter((p) => !gone.has(p))) {
    const slash = path.lastIndexOf("/");
    const folder = slash > -1 ? path.slice(0, slash) : "";
    const name = path.slice(slash + 1);
    const { data } = await sb.storage.from("cvs").list(folder, { search: name, limit: 10 });
    if ((data || []).some((f) => f.name === name)) return false;
  }
  return true;
}

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
  if (cvPath && !(await removeCvs(sb, [cvPath]))) redirect("/admin/postvak-in?fout=cv-verwijderen");
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

/* ---------- doorverwijzingen ---------- */

/**
 * Stuurt een oud adres door na een slugwijziging, zoals WordPress dat ook deed.
 *
 * Twee dingen voorkomen dat het na een paar keer hernoemen misgaat:
 * - regels die naar het oude adres wezen, wijzen voortaan direct naar het
 *   nieuwe — geen ketens van doorverwijzingen, die kosten Google waarde;
 * - een regel mét het nieuwe adres als bron (terug-hernoemd) verdwijnt, anders
 *   zou de pagina naar zichzelf doorsturen.
 *
 * Fouten worden genegeerd: zonder recht op SEO, of vóór migratie 0007, blijft
 * alleen de doorverwijzing uit. Het opslaan zelf is dan al gelukt.
 */
async function autoRedirect(sb: Sb, from: string, to: string) {
  await sb.from("redirects").update({ destination: to }).eq("destination", from);
  await sb.from("redirects").delete().eq("source", to);
  await sb.from("redirects").upsert(
    { source: from, destination: to, permanent: true, note: "Automatisch: adres gewijzigd" },
    { onConflict: "source" }
  );
}

/**
 * Staat er (weer) echte inhoud op een adres, dan hoort daar geen
 * doorverwijzing meer op: de middleware komt vóór de pagina, dus die zou
 * onbereikbaar blijven. Gebeurt na publiceren, terugzetten en een slug die
 * terugkeert. Fouten negeren — zonder recht op SEO of vóór migratie 0007 is er
 * niets op te ruimen, of kan het niet.
 */
async function clearRedirect(sb: Sb, path: string) {
  const { coveringSources } = await import("@/lib/redirects");
  await sb.from("redirects").delete().in("source", coveringSources(path));
}

/**
 * Na het verwijderen van iets dat live stond: door naar Doorverwijzingen met
 * het oude adres al ingevuld. Die URL staat misschien in Google of in een
 * mailtje; beslissen waar hij heen moet kost nu tien seconden, later een 404.
 */
function offerRedirect(permissions: string[], path: string, wat: string) {
  if (!permissions.includes("seo")) return;
  redirect(`/admin/seo/doorverwijzingen?bron=${encodeURIComponent(path)}&verwijderd=${wat}#nieuw`);
}

/** Paden die de site zelf serveert; daar hoort geen doorverwijzing op. */
async function livePaths(sb: Sb): Promise<Set<string>> {
  const [pages, posts, vacancies] = await Promise.all([
    sb.from("pages").select("slug"),
    sb.from("posts").select("slug"),
    sb.from("vacancies").select("slug"),
  ]);
  return new Set([
    "/", "/blog", "/vacatures", "/vacatures/open-sollicitatie",
    ...((pages.data as { slug: string }[]) || []).map((p) => (p.slug === "home" ? "/" : `/${p.slug}`)),
    ...((posts.data as { slug: string }[]) || []).map((p) => `/blog/${p.slug}`),
    ...((vacancies.data as { slug: string }[]) || []).map((v) => `/vacatures/${v.slug}`),
  ]);
}

export async function saveRedirect(formData: FormData) {
  const { sb } = await requirePerm("seo");
  const {
    checkSource, checkDestination, coveredByWordpress, createsLoop, normalizePath,
  } = await import("@/lib/redirects");
  const back = (fout: string) =>
    redirect(`/admin/seo/doorverwijzingen?fout=${fout}&bron=${encodeURIComponent(String(formData.get("source") || ""))}` +
      `&doel=${encodeURIComponent(String(formData.get("destination") || ""))}#nieuw`);

  const src = checkSource(String(formData.get("source") || ""));
  if (!src.ok) back(`bron-${src.reason}`);
  const dst = checkDestination(String(formData.get("destination") || ""));
  if (!dst.ok) back(`doel-${dst.reason}`);
  const source = (src as { source: string }).source;
  const destination = (dst as { destination: string }).destination;

  if (!/^https?:\/\//i.test(destination) && normalizePath(destination) === source) back("zelfde");
  if (coveredByWordpress(source)) back("bron-vast");
  // Staat hier een echte pagina, dan zou de doorverwijzing hem onbereikbaar
  // maken — de middleware komt vóór de pagina aan de beurt.
  const live = await livePaths(sb);
  if (live.has(source)) back("bron-bestaat");
  if (source.endsWith("/*")) {
    // Een wildcard vangt ook het pad zelf en alles eronder: daar mag geen
    // bestaande pagina tussen zitten.
    const prefix = source.slice(0, -2);
    if ([...live].some((p) => p === prefix || p.startsWith(`${prefix}/`))) back("bron-bestaat");
  }

  const { data: rules, error: readError } = await sb.from("redirects").select("source, destination, permanent");
  if (readError) back("migratie");
  if (createsLoop(source, destination, rules || [])) back("lus");

  const { error } = await sb.from("redirects").insert({
    source,
    destination,
    permanent: formData.get("permanent") !== "tijdelijk",
    note: String(formData.get("note") || "").trim() || null,
  });
  if (error) back(error.code === "23505" ? "bron-dubbel" : "opslaan");

  // Opgelost: de 404 hoeft niet meer in de lijst. Bij een regel met /* alles
  // eronder, want dat vangt de regel nu ook af.
  if (source.endsWith("/*")) await sb.from("missing_paths").delete().like("path", `${source.slice(0, -1)}%`);
  else await sb.from("missing_paths").delete().eq("path", source);

  revalidatePath("/admin/seo/doorverwijzingen");
  redirect("/admin/seo/doorverwijzingen?opgeslagen=doorverwijzing");
}

export async function deleteRedirect(id: string) {
  const { sb } = await requirePerm("seo");
  await sb.from("redirects").delete().eq("id", id);
  revalidatePath("/admin/seo/doorverwijzingen");
}

export async function setMissingIgnored(path: string, ignored: boolean) {
  const { sb } = await requirePerm("seo");
  await sb.from("missing_paths").update({ ignored }).eq("path", path);
  revalidatePath("/admin/seo/doorverwijzingen");
}

/* ---------- versies en prullenbak ---------- */

/**
 * Zet een versie terug, of haalt iets uit de prullenbak.
 *
 * Het terugschrijven is een gewone upsert met de rechten van de gebruiker, dus
 * RLS geldt gewoon en de trigger maakt er weer een versie van: terugzetten is
 * zelf ook ongedaan te maken.
 *
 * Een pagina komt terug met de blokken die met haar verdwenen. Die herkennen we
 * aan hetzelfde moment: de database verwijdert ze in dezelfde transactie, en
 * now() is binnen een transactie overal gelijk.
 */
export async function restoreRevision(id: number, back: string) {
  const { sb, admin } = await requireAdmin();
  const { mayRestore, primaryKey, restorableFields } = await import("@/lib/revisions");
  // Alleen terug naar een adminscherm; een open doorverwijzing is een phishingkans.
  const target = back.startsWith("/admin") ? back.split("#")[0] : "/admin";
  const withParam = (k: string, v: string) => `${target}${target.includes("?") ? "&" : "?"}${k}=${v}`;

  const { data: rev } = await sb.from("revisions").select("*").eq("id", id).maybeSingle();
  if (!rev) redirect(withParam("fout", "versie-weg"));
  const table = rev.table_name as import("@/lib/revisions").RevisionTable;
  if (!mayRestore(table, admin.permissions)) redirect(withParam("fout", "geen-rechten"));

  // Bestaat de rij nog, dan blijft een blok op zijn huidige plek staan.
  const pk = primaryKey(table);
  const { data: existing } = await sb.from(table).select(pk).eq(pk, rev.row_id).maybeSingle();
  const fields = restorableFields(table, rev.data, Boolean(existing));

  const { error } = await sb.from(table).upsert(fields, { onConflict: pk });
  if (error) {
    // 23505: het adres (slug) is intussen door iets anders in gebruik.
    // 23503: een blok waarvan de pagina ook weg is.
    const fout = error.code === "23505" ? "slug-bestaat-al" : error.code === "23503" ? "pagina-eerst" : "terugzetten";
    redirect(withParam("fout", fout));
  }

  if (table === "pages" && rev.action === "delete") {
    const { data: blocks } = await sb
      .from("revisions")
      .select("data")
      .eq("table_name", "blocks")
      .eq("action", "delete")
      .eq("created_at", rev.created_at)
      .filter("data->>page_id", "eq", rev.row_id);
    const rows = ((blocks as { data: Record<string, unknown> }[]) || []).map((b) => restorableFields("blocks", b.data, false));
    if (rows.length) await sb.from("blocks").upsert(rows, { onConflict: "id" });
  }

  // Staat het teruggezette weer live, dan mag een oude doorverwijzing op zijn
  // adres (bijvoorbeeld aangemaakt na het verwijderen) het niet wegsturen.
  const d = rev.data as { slug?: string; published?: boolean; status?: string };
  const live = table === "pages" ? d.published : d.status === "published";
  if (live && d.slug) {
    const path = table === "pages" ? (d.slug === "home" ? "/" : `/${d.slug}`)
      : table === "posts" ? `/blog/${d.slug}`
      : table === "vacancies" ? `/vacatures/${d.slug}`
      : null;
    if (path) await clearRedirect(sb, path);
  }

  revalidateSite();
  revalidatePath("/admin", "layout");
  redirect(withParam("opgeslagen", "teruggezet"));
}

/* ---------- postvak: meerdere tegelijk ---------- */

/**
 * Bulkactie vanuit het Postvak IN. De selectie komt binnen als `sel`-velden
 * met "bericht:<id>" of "sollicitatie:<id>".
 *
 * "Gelezen" betekent per soort iets anders, net als "onbehandeld": een bericht
 * krijgt read = true, een nieuwe sollicitatie gaat naar "In behandeling".
 *
 * Verwijderen volgt dezelfde volgorde als deleteApplication: eerst de cv's uit
 * de opslag, dan pas de rijen. Mislukt het eerste, dan blijft alles staan —
 * een rij zonder cv is erger dan niets doen, want dan lijkt het gewist.
 */
export async function bulkInbox(formData: FormData) {
  const { sb } = await requirePerm("postvak");
  const intent = String(formData.get("intent") || "");
  const terug = String(formData.get("terug") || "/admin/postvak-in");
  const back = terug.startsWith("/admin/postvak-in") ? terug : "/admin/postvak-in";
  const withParam = (k: string, v: string) => `${back}${back.includes("?") ? "&" : "?"}${k}=${v}`;

  const sel = formData.getAll("sel").map(String);
  const msgIds = sel.filter((s) => s.startsWith("bericht:")).map((s) => s.slice("bericht:".length));
  const appIds = sel.filter((s) => s.startsWith("sollicitatie:")).map((s) => s.slice("sollicitatie:".length));
  if (!msgIds.length && !appIds.length) redirect(back);

  if (intent === "gelezen") {
    if (msgIds.length) await sb.from("contact_messages").update({ read: true }).in("id", msgIds);
    if (appIds.length) await sb.from("applications").update({ status: "in_behandeling" }).in("id", appIds).eq("status", "nieuw");
  } else if (intent === "verwijderen") {
    if (appIds.length) {
      const { data: apps } = await sb.from("applications").select("id, cv_path").in("id", appIds);
      const paths = ((apps as { cv_path: string | null }[]) || []).map((a) => a.cv_path).filter(Boolean) as string[];
      if (!(await removeCvs(sb, paths))) redirect(withParam("fout", "cv-verwijderen"));
      await sb.from("applications").delete().in("id", appIds);
    }
    if (msgIds.length) await sb.from("contact_messages").delete().in("id", msgIds);
  } else {
    redirect(back);
  }

  revalidatePath("/admin", "layout");
  redirect(withParam("opgeslagen", intent === "verwijderen" ? "definitief" : "gelezen"));
}

/* ---------- bedrijfsbezoek ---------- */

/** Terug naar een scherm onder /admin/bezoek, met een melding erbij. */
function bezoekBack(back: string) {
  const target = back.startsWith("/admin/bezoek") ? back.split("#")[0] : "/admin/bezoek/bedrijven";
  return (k: string, v: string) => `${target}${target.includes("?") ? "&" : "?"}${k}=${v}`;
}

/**
 * Zet een herkend bedrijf op de bellijst, met in de notitie wat het bekeek —
 * zodat wie belt weet waar het gesprek over kan gaan.
 *
 * Staat het bedrijf er al (gekoppeld, zelfde e-maildomein of zelfde naam),
 * dan geen tweede lead maar alleen de koppeling. Vraagt twee rechten: `bezoek`
 * om het bedrijf te zien, `bellijst` om de lead te maken.
 */
export async function addLeadFromCompany(key: string, back: string) {
  const { sb, admin } = await requireAdmin();
  const withParam = bezoekBack(back);
  if (!admin.permissions.includes("bezoek") || !admin.permissions.includes("bellijst")) redirect(withParam("fout", "geen-rechten"));

  const { loadCompanies } = await import("@/lib/companiesDb");
  const { leadNotes } = await import("@/lib/companies");
  const { when } = await import("@/lib/dashboard");
  const { companies } = await loadCompanies(sb, 90, admin.permissions);
  const c = companies.find((x) => x.key === key);
  if (!c) redirect(withParam("fout", "bedrijf-weg"));

  let leadId = c.lead?.id ?? null;
  if (!leadId) {
    const { data, error } = await sb
      .from("leads")
      .insert({
        name: c.name,
        company: c.domain && c.domain !== c.name ? c.domain : null,
        source: "websitebezoek",
        notes: leadNotes(c, when),
        status: "te_bellen",
      })
      .select("id")
      .single();
    if (error || !data) redirect(withParam("fout", "opslaan"));
    leadId = (data as { id: string }).id;
  }
  // Zonder migratie 0010 lukt de koppeling niet; de lead staat er dan wel.
  await sb.from("company_profiles").upsert({ key, name: c.name, domain: c.domain, lead_id: leadId }, { onConflict: "key" });

  revalidatePath("/admin", "layout");
  redirect(withParam("opgeslagen", "op-bellijst"));
}

/**
 * Niet meer volgen, of weer wel. Niet volgen verbergt het bedrijf én zorgt
 * dat de tracker bij volgende bezoeken geen bedrijfsnaam meer opslaat — voor
 * het eigen kantoor, een leverancier, of een eenmanszaak die dat liever niet
 * heeft.
 */
export async function setCompanyIgnored(key: string, name: string, domain: string | null, ignored: boolean, back: string) {
  const { sb } = await requirePerm("bezoek");
  const withParam = bezoekBack(back);
  const { error } = await sb.from("company_profiles").upsert({ key, name, domain, ignored }, { onConflict: "key" });
  if (error) redirect(withParam("fout", "migratie-0010"));
  revalidatePath("/admin", "layout");
  redirect(withParam("opgeslagen", ignored ? "niet-volgen" : "weer-volgen"));
}

/**
 * Vergeten: haalt de bedrijfsnaam uit alle eerdere bezoeken en zet het
 * bedrijf op niet volgen. De bezoeken zelf blijven meetellen, alleen zonder
 * bedrijf. Bedoeld voor een verzoek om verwijdering — bij een eenmanszaak is
 * de bedrijfsnaam een persoonsgegeven.
 */
export async function forgetCompany(key: string, name: string, domain: string | null) {
  const { sb } = await requirePerm("bezoek");
  const withParam = bezoekBack("/admin/bezoek/bedrijven");
  const cleared = { company: null, company_domain: null, company_source: null, is_company: false };

  const { error: profileError } = await sb
    .from("company_profiles")
    .upsert({ key, name, domain, ignored: true }, { onConflict: "key" });
  if (profileError) redirect(withParam("fout", "migratie-0010"));

  if (domain) {
    const { error } = await sb.from("page_views").update(cleared).eq("company_domain", domain);
    if (error) redirect(withParam("fout", "opslaan"));
  }
  // Oudere bezoeken hebben geen domein, alleen een naam. Alle namen die bij
  // deze sleutel horen, over de hele bewaartermijn.
  const { fetchPageViews } = await import("@/lib/analyticsDb");
  const { companyKey } = await import("@/lib/companies");
  const since = new Date(Date.now() - 400 * 86_400_000).toISOString();
  const rows = await fetchPageViews(sb, since, "id, company, company_domain", { onlyCompanies: true });
  const names = [...new Set(rows.filter((r) => r.company && companyKey(r.company, r.company_domain ?? null) === key).map((r) => r.company!))];
  if (names.length) {
    const { error } = await sb.from("page_views").update(cleared).in("company", names);
    if (error) redirect(withParam("fout", "opslaan"));
  }

  revalidatePath("/admin", "layout");
  redirect(withParam("opgeslagen", "vergeten"));
}
