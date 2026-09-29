import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { ilikeTerm, type RecordHit } from "@/lib/search";
import { companyKey } from "@/lib/companies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = 6;

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Zoekt in inzendingen, leads en gebruikers voor het commandopalet.
 *
 * Per zoekopdracht en met een limiet: deze tabellen groeien en bevatten
 * persoonsgegevens, dus ze gaan nooit als geheel naar de browser. Een route in
 * plaats van een server action, omdat server actions per client na elkaar
 * draaien — bij snel typen zou elke toetsaanslag op de vorige wachten. Een
 * fetch kan de browser afbreken zodra er een nieuwere is.
 */
export async function GET(req: NextRequest) {
  const { sb, admin } = await requireAdmin();
  const q = ilikeTerm(req.nextUrl.searchParams.get("q") || "");
  if (q.length < 2) return NextResponse.json([]);

  const can = (p: string) => admin.permissions.includes(p as never);
  const like = `%${q}%`;
  // Tussen aanhalingstekens, zodat een punt of spatie in de zoekterm (een
  // e-mailadres, een volledige naam) niet als filtersyntax wordt gelezen.
  const quoted = `"${like}"`;
  const none = Promise.resolve({ data: [] as never[] });

  const [msgs, apps, leads, users, visits] = await Promise.all([
    can("postvak")
      ? sb.from("contact_messages")
          .select("id, name, email, subject, created_at")
          .or(`name.ilike.${quoted},email.ilike.${quoted},subject.ilike.${quoted},phone.ilike.${quoted}`)
          .order("created_at", { ascending: false })
          .limit(LIMIT)
      : none,
    can("postvak")
      ? sb.from("applications")
          .select("id, name, email, vacancy_title, created_at")
          .or(`name.ilike.${quoted},email.ilike.${quoted},vacancy_title.ilike.${quoted},phone.ilike.${quoted}`)
          .order("created_at", { ascending: false })
          .limit(LIMIT)
      : none,
    can("bellijst")
      ? sb.from("leads")
          .select("id, name, company, phone, status")
          .or(`name.ilike.${quoted},company.ilike.${quoted},email.ilike.${quoted},phone.ilike.${quoted}`)
          .order("updated_at", { ascending: false })
          .limit(LIMIT)
      : none,
    can("gebruikers")
      ? sb.from("admins").select("user_id, email").ilike("email", like).limit(LIMIT)
      : none,
    // Herkende bedrijven: de nieuwste bezoeken die op de naam lijken. Ruim
    // opgehaald en daarna per bedrijf samengevoegd — één bedrijf heeft vaak
    // tientallen weergaven.
    can("bezoek")
      ? sb.from("page_views").select("*").eq("is_company", true).ilike("company", like)
          .order("created_at", { ascending: false }).limit(200)
      : none,
  ]);

  type Msg = { id: string; name: string; email: string; subject: string | null; created_at: string };
  type App = { id: string; name: string; email: string; vacancy_title: string | null; created_at: string };
  type LeadRow = { id: string; name: string; company: string | null; phone: string | null; status: string };
  type UserRow = { user_id: string; email: string };

  const seen = new Set<string>();
  const companyHits: RecordHit[] = [];
  for (const v of (visits.data as { company: string | null; company_domain?: string | null; created_at: string }[]) || []) {
    if (!v.company) continue;
    const key = companyKey(v.company, v.company_domain ?? null);
    if (seen.has(key)) continue;
    seen.add(key);
    companyHits.push({
      kind: "bedrijf",
      id: key,
      title: v.company,
      subtitle: `Websitebezoek · laatst ${fmtDate(v.created_at)}`,
      href: `/admin/bezoek/bedrijven/${encodeURIComponent(key)}`,
    });
    if (companyHits.length >= LIMIT) break;
  }

  const hits: RecordHit[] = [
    ...((msgs.data as Msg[]) || []).map((m) => ({
      kind: "bericht" as const,
      id: m.id,
      title: m.name,
      subtitle: `${m.subject || "Bericht"} · ${fmtDate(m.created_at)}`,
      href: `/admin/postvak-in?filter=berichten#bericht-${m.id}`,
    })),
    ...((apps.data as App[]) || []).map((a) => ({
      kind: "sollicitatie" as const,
      id: a.id,
      title: a.name,
      subtitle: `${a.vacancy_title || "Open sollicitatie"} · ${fmtDate(a.created_at)}`,
      href: `/admin/postvak-in?filter=sollicitaties#sollicitatie-${a.id}`,
    })),
    ...((leads.data as LeadRow[]) || []).map((l) => ({
      kind: "lead" as const,
      id: l.id,
      title: l.name,
      subtitle: [l.company, l.phone].filter(Boolean).join(" · ") || "Lead",
      href: `/admin/bellijst?filter=alles#lead-${l.id}`,
    })),
    ...((users.data as UserRow[]) || []).map((u) => ({
      kind: "gebruiker" as const,
      id: u.user_id,
      title: u.email,
      subtitle: "Gebruiker",
      href: "/admin/gebruikers",
    })),
    ...companyHits,
  ];

  return NextResponse.json(hits, { headers: { "Cache-Control": "private, no-store" } });
}
