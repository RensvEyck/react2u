import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export default async function AdminDashboard() {
  const { sb } = await requireAdmin();
  const [pages, vacancies, apps, msgs] = await Promise.all([
    sb.from("pages").select("id", { count: "exact", head: true }),
    sb.from("vacancies").select("id", { count: "exact", head: true }).eq("status", "published"),
    sb.from("applications").select("id", { count: "exact", head: true }).eq("status", "nieuw"),
    sb.from("contact_messages").select("id", { count: "exact", head: true }).eq("read", false),
  ]);
  const cards = [
    { label: "Pagina's", value: pages.count ?? 0, href: "/admin/paginas" },
    { label: "Actieve vacatures", value: vacancies.count ?? 0, href: "/admin/vacatures" },
    { label: "Nieuwe sollicitaties", value: apps.count ?? 0, href: "/admin/sollicitaties" },
    { label: "Ongelezen berichten", value: msgs.count ?? 0, href: "/admin/berichten" },
  ];
  return (
    <div>
      <h1 className="text-3xl font-bold text-[#312e82] mb-8">Dashboard</h1>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition">
            <p className="text-4xl font-bold text-[#312e82]">{c.value}</p>
            <p className="text-black/60 mt-1">{c.label}</p>
          </Link>
        ))}
      </div>
      <div className="mt-10 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#312e82] mb-3">Snel aan de slag</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-black/70">
          <li><Link className="text-[#e75387] hover:underline" href="/admin/vacatures/nieuw">Nieuwe vacature plaatsen</Link></li>
          <li><Link className="text-[#e75387] hover:underline" href="/admin/paginas">Teksten op de website aanpassen</Link></li>
          <li><Link className="text-[#e75387] hover:underline" href="/admin/instellingen">Contactgegevens wijzigen</Link></li>
        </ul>
        <p className="mt-4 text-sm text-black/50">
          Wijzigingen zijn direct live na opslaan (de site ververst automatisch).
        </p>
      </div>
    </div>
  );
}
