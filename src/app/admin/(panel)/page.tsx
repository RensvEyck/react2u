import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import type { Application, ContactMessage } from "@/lib/types";
import {
  LuFileText, LuBriefcase, LuUsers, LuInbox, LuPlus, LuPencil, LuSettings, LuArrowRight,
} from "react-icons/lu";

export default async function AdminDashboard() {
  const { sb } = await requireAdmin();
  const [pages, vacancies, apps, msgs, recentApps, recentMsgs] = await Promise.all([
    sb.from("pages").select("id", { count: "exact", head: true }),
    sb.from("vacancies").select("id", { count: "exact", head: true }).eq("status", "published"),
    sb.from("applications").select("id", { count: "exact", head: true }).eq("status", "nieuw"),
    sb.from("contact_messages").select("id", { count: "exact", head: true }).eq("read", false),
    sb.from("applications").select("*").order("created_at", { ascending: false }).limit(5),
    sb.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(5),
  ]);

  const stats = [
    { label: "Pagina's", value: pages.count ?? 0, href: "/admin/paginas", icon: LuFileText, tint: "bg-[#eef0ff] text-[#312e82]" },
    { label: "Actieve vacatures", value: vacancies.count ?? 0, href: "/admin/vacatures", icon: LuBriefcase, tint: "bg-[#e6f7f4] text-[#0e9f8a]" },
    { label: "Nieuwe sollicitaties", value: apps.count ?? 0, href: "/admin/sollicitaties", icon: LuUsers, tint: "bg-[#fdeef4] text-[#e0356b]" },
    { label: "Ongelezen berichten", value: msgs.count ?? 0, href: "/admin/berichten", icon: LuInbox, tint: "bg-[#fff4e5] text-[#c77700]" },
  ];

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Dashboard</h1>
          <p className="text-[14.5px] text-black/50">Alles wat je opslaat staat direct live op de website.</p>
        </div>
        <div className="flex gap-2.5">
          <Link href="/admin/vacatures/nieuw" className="abtn"><LuPlus /> Nieuwe vacature</Link>
          <Link href="/admin/paginas" className="abtn-ghost"><LuPencil className="text-[14px]" /> Teksten aanpassen</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="acard group flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-[20px] ${s.tint}`}>
              <s.icon />
            </div>
            <div>
              <p className="font-heading text-[26px] font-bold leading-none text-[#1c1a4e]">{s.value}</p>
              <p className="mt-1 text-[13px] font-medium text-black/50">{s.label}</p>
            </div>
            <LuArrowRight className="ml-auto text-black/20 transition group-hover:translate-x-1 group-hover:text-[#e75387]" />
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="acard">
          <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4">
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Recente sollicitaties</h2>
            <Link href="/admin/sollicitaties" className="text-[13px] font-semibold text-[#e75387] hover:underline">Alles bekijken</Link>
          </div>
          <div className="divide-y divide-black/[0.05]">
            {((recentApps.data as Application[]) || []).map((a) => (
              <Link key={a.id} href="/admin/sollicitaties" className="flex items-center gap-3.5 px-6 py-3.5 hover:bg-[#fafafd]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[13px] font-bold text-[#312e82]">
                  {(a.name[0] || "?").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold text-[#1c1a4e]">{a.name}</p>
                  <p className="truncate text-[12.5px] text-black/45">{a.vacancy_title || "Sollicitatie"}</p>
                </div>
                <span className="text-[12px] text-black/35">{fmtDate(a.created_at)}</span>
                {a.status === "nieuw" && <span className="apill bg-[#fdeef4] text-[#e0356b]">nieuw</span>}
              </Link>
            ))}
            {(recentApps.data || []).length === 0 && (
              <p className="px-6 py-8 text-center text-[13.5px] text-black/40">Nog geen sollicitaties ontvangen.</p>
            )}
          </div>
        </div>

        <div className="acard">
          <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4">
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Recente berichten</h2>
            <Link href="/admin/berichten" className="text-[13px] font-semibold text-[#e75387] hover:underline">Alles bekijken</Link>
          </div>
          <div className="divide-y divide-black/[0.05]">
            {((recentMsgs.data as ContactMessage[]) || []).map((m) => (
              <Link key={m.id} href="/admin/berichten" className="flex items-center gap-3.5 px-6 py-3.5 hover:bg-[#fafafd]">
                {!m.read && <span className="h-2 w-2 shrink-0 rounded-full bg-[#e75387]" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold text-[#1c1a4e]">{m.subject || "(geen onderwerp)"}</p>
                  <p className="truncate text-[12.5px] text-black/45">{m.name} · {m.email}</p>
                </div>
                <span className="text-[12px] text-black/35">{fmtDate(m.created_at)}</span>
              </Link>
            ))}
            {(recentMsgs.data || []).length === 0 && (
              <p className="px-6 py-8 text-center text-[13.5px] text-black/40">Nog geen berichten ontvangen.</p>
            )}
          </div>
        </div>
      </div>

      <div className="acard flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-5 text-[13.5px] text-black/55">
        <span className="font-semibold text-[#312e82]">Snel naar:</span>
        <Link href="/admin/instellingen" className="flex items-center gap-1.5 hover:text-[#e75387]"><LuSettings className="text-[14px]" /> Contactgegevens &amp; documenten</Link>
        <Link href="/admin/media" className="hover:text-[#e75387]">Media uploaden</Link>
        <Link href="/admin/account" className="hover:text-[#e75387]">Wachtwoord wijzigen</Link>
      </div>
    </div>
  );
}
